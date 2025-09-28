import express from 'express';
import { WebSocket } from 'ws';
import { webcrypto } from 'crypto';
import {
  type BBoardProviders,
  BBoardAPI,
  utils,
  type PrivateStateId,
} from '../src/index';
import {
  type MidnightProvider,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import * as Rx from 'rxjs';
import { nativeToken } from '@midnight-ntwrk/ledger';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createBalancedTx } from '@midnight-ntwrk/midnight-js-types';
import { Transaction } from '@midnight-ntwrk/ledger';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { getLedgerNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { TestnetRemoteConfig } from '../src/config.js';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Use the TestnetRemoteConfig from your config file
const config = new TestnetRemoteConfig();
config.setNetworkId(); // Set the network ID for testnet

// The testnet wallet seed you provided
const TESTNET_WALLET_SEED = 'address';

let wallet: (Wallet & Resource) | null = null;
let providers: BBoardProviders | null = null;

/**
 * Create wallet and midnight provider from the given wallet
 */
const createWalletAndMidnightProvider = async (wallet: Wallet): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(wallet.state());
  return {
    coinPublicKey: state.coinPublicKey,
    encryptionPublicKey: state.encryptionPublicKey,
    balanceTx(tx, newCoins) {
      return wallet
        .balanceTransaction(
          ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
          newCoins,
        )
        .then((tx) => wallet.proveTransaction(tx))
        .then((zswapTx) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
        .then(createBalancedTx);
    },
    submitTx(tx) {
      return wallet.submitTransaction(tx);
    },
  };
};

/**
 * Initialize the wallet and providers
 */
const initializeWallet = async (): Promise<void> => {
  try {
    console.log('Initializing wallet...');
    
    // Build wallet from the testnet seed using the config
    wallet = await WalletBuilder.buildFromSeed(
      config.indexer,
      config.indexerWS,
      config.proofServer,
      config.node,
      TESTNET_WALLET_SEED,
      getZswapNetworkId(),
      'warn',
    );
    
    wallet.start();
    
    const state = await Rx.firstValueFrom(wallet.state());
    console.log(`Wallet address: ${state.address}`);
    
    const balance = state.balances[nativeToken()] ?? 0n;
    console.log(`Wallet balance: ${balance}`);
    
    if (balance === 0n) {
      console.warn('Wallet has no balance! Contract deployment may fail.');
    }
    
    // Create wallet and midnight provider
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
    
    // Initialize providers using the config
    providers = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId>({
        privateStateStoreName: config.privateStateStoreName,
      }),
      publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
      zkConfigProvider: new NodeZkConfigProvider<'post' | 'takeDown' | 'updateTitle' | 'updateDescription' | 'setPrivateWeb'>(config.zkConfigPath),
      proofProvider: httpClientProofProvider(config.proofServer),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider,
    };
    
    console.log('Wallet and providers initialized successfully');
  } catch (error) {
    console.error('Failed to initialize wallet:', error);
    throw error;
  }
};

/**
 * POST /generateNewPageContract
 * Creates a new bulletin board contract and returns the contract address
 */
app.post('/generateNewPageContract', async (req, res) => {
  try {
    if (!providers) {
      return res.status(500).json({ 
        error: 'Server not initialized. Providers are not available.' 
      });
    }

    console.log('Creating new bulletin board contract...');
    
    // Create a simple logger for the API deployment
    const logger = {
      info: (msg: string) => console.log(`[INFO] ${msg}`),
      error: (msg: string) => console.error(`[ERROR] ${msg}`),
      debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
      warn: (msg: string) => console.warn(`[WARN] ${msg}`)
    };

    // Deploy new contract using the BBoardAPI
    const api = await BBoardAPI.deploy(providers, logger);
    
    const contractAddress = api.deployedContractAddress;
    console.log(`Successfully deployed contract at address: ${contractAddress}`);
    
    // Return the contract address
    res.json({
      success: true,
      contractAddress: contractAddress,
      message: 'New bulletin board contract created successfully'
    });
    
  } catch (error) {
    console.error('Error creating new contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create new contract',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    walletInitialized: wallet !== null,
    providersInitialized: providers !== null
  });
});

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Initialize wallet and providers before starting the server
    await initializeWallet();
    
    app.listen(PORT, () => {
      console.log(`BBBoard API Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Create contract: POST http://localhost:${PORT}/generateNewPageContract`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (wallet) {
    await wallet.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (wallet) {
    await wallet.close();
  }
  process.exit(0);
});

// Start the server
startServer().catch(console.error);