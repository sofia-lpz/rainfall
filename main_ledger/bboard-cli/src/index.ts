import express from 'express';
import cors from 'cors';
import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
// import { webcrypto } from 'crypto';
import {
  type BBoardProviders,
  BBoardAPI,
  utils,
  type BBoardDerivedState,
  type DeployedBBoardContract,
  type PrivateStateId,
  bboardPrivateStateKey,
} from '../../api/src/index';
import { ledger, type Ledger} from '../../contract/src/managed/bboard/contract/index.cjs';
import {
  type BalancedTransaction,
  createBalancedTx,
  type MidnightProvider,
  type UnbalancedTransaction,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import * as Rx from 'rxjs';
import { type CoinInfo, nativeToken, Transaction, type TransactionId } from '@midnight-ntwrk/ledger';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig } from './config.js';
import type { StartedDockerComposeEnvironment, DockerComposeEnvironment } from 'testcontainers';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { toHex, assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

/* **********************************************************************
 * getBBoardLedgerState: a helper that queries the current state of
 * the data on the ledger, for a specific main index contract.
 */

export const getBBoardLedgerState = async (
  providers: BBoardProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data) : null;
};

/* **********************************************************************
 * deployOrJoin: returns a contract, by prompting the user about
 * whether to deploy a new one or join an existing one and then
 * calling the appropriate helper.
 */

//////////// server /////////////////////////


/* **********************************************************************
 * startAPIServer: starts an Express server for the main index
 */
const startAPIServer = async (config: Config, logger: Logger): Promise<void> => {
  const app = express();
  const PORT = process.env.PORT || 3001;
  
  // Middleware
  app.use(cors({
    origin: '*',
    methods: '*',
    allowedHeaders: '*'
  }));
  app.use(express.json());
  
  // Set network ID
  config.setNetworkId();
  
  let serverWallet: (Wallet & Resource) | null = null;
  let serverProviders: BBoardProviders | null = null;
  let mainIndexAPI: BBoardAPI | null = null;
  
  // Main index contract address
  const MAIN_INDEX_CONTRACT_ADDRESS = '';
  
  // Initialize wallet and providers for the server
  const initializeServerComponents = async (): Promise<void> => {
    try {
      logger.info('Initializing server wallet and providers...');
      
      // Use the specified testnet wallet seed
      const TESTNET_WALLET_SEED = '';
      
      // Build wallet using the existing function
      serverWallet = await buildWalletAndWaitForFunds(config, logger, TESTNET_WALLET_SEED);
      
      // Create wallet and midnight provider
      const walletAndMidnightProvider = await createWalletAndMidnightProvider(serverWallet);
      
      // Initialize providers for main index operations
      serverProviders = {
        privateStateProvider: levelPrivateStateProvider<PrivateStateId>({
          privateStateStoreName: config.privateStateStoreName,
        }),
        publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
        zkConfigProvider: new NodeZkConfigProvider<'initialize' | 'addAddress' | 'removeFirstAddress' | 'removeAllAddresses' | 'clear'>(config.zkConfigPath),
        proofProvider: httpClientProofProvider(config.proofServer),
        walletProvider: walletAndMidnightProvider,
        midnightProvider: walletAndMidnightProvider,
      };
      
      // Join the main index contract automatically
      logger.info(`Joining main index contract at address: ${MAIN_INDEX_CONTRACT_ADDRESS}`);
      mainIndexAPI = await BBoardAPI.join(serverProviders, MAIN_INDEX_CONTRACT_ADDRESS, logger);
      logger.info('Successfully joined main index contract');
      
      logger.info('Server wallet and providers initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize server components: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };
  
  // API Routes

  /**
   * POST /AddAddress
   * Adds a new address with title to the main index ledger
   */
  app.post('/AddAddress', async (req, res) => {
    try {
      if (!mainIndexAPI) {
        return res.status(500).json({ 
          error: 'Main index API not initialized.' 
        });
      }

      const { title, address } = req.body;
      
      // Validate required fields
      if (!title || typeof title !== 'string') {
        return res.status(400).json({
          error: 'Title is required and must be a string'
        });
      }
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({
          error: 'Address is required and must be a string'
        });
      }

      logger.info(`API: Adding address to main index - Title: "${title}", Address: ${address}`);
      
      // Clean and validate the contract address format
      const cleanAddress = address.trim();
      if (!cleanAddress.match(/^(0x)?[0-9a-fA-F]+$/)) {
        return res.status(400).json({
          error: 'Invalid contract address format'
        });
      }
      
      // Ensure the address has proper formatting
      const formattedAddress = cleanAddress.startsWith('0x') ? cleanAddress : `${cleanAddress}`;
      
      // Create the address entry in the format "address,title"
      const addressWithTitle = `${formattedAddress},${title}`;
      
      // Add the address to the main index using the addAddress method
      await mainIndexAPI.addAddress(addressWithTitle);
      
      logger.info(`API: Successfully added to main index - ${title}: ${formattedAddress}`);
      
      // Return success response
      res.json({
        success: true,
        message: 'Address added to main index successfully',
        data: {
          address: formattedAddress,
          title: title,
          entry: addressWithTitle
        }
      });
      
    } catch (error) {
      logger.error(`API: Error adding address to main index: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({
        success: false,
        error: 'Failed to add address to main index',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  
  /**
   * POST /returnAllAddresses
   * Returns all addresses stored in the main index ledger
   */
  app.post('/returnAllAddresses', async (req, res) => {
    try {
      if (!serverProviders) {
        return res.status(500).json({ 
          error: 'Server not initialized. Providers are not available.' 
        });
      }

      logger.info('API: Getting all addresses from main index...');
      
      // Get the ledger state for the main index contract
      const ledgerState = await getBBoardLedgerState(serverProviders, MAIN_INDEX_CONTRACT_ADDRESS as ContractAddress);
      
      if (ledgerState === null) {
        return res.status(500).json({
          error: 'Could not access main index contract'
        });
      }
      
      // Extract addresses from the ledger
      const addresses = [];
      if (ledgerState.addresses.length() > 0n) {
        for (const addressEntry of ledgerState.addresses) {
          const [address, title] = addressEntry.split(',');
          addresses.push({
            address: address,
            title: title || 'Untitled'
          });
        }
      }
      
      logger.info(`API: Successfully retrieved ${addresses.length} addresses from main index`);
      
      // Return the addresses, converting BigInt values to strings
      res.json({
        success: true,
        addressCount: ledgerState.addressCount.toString(), // Convert BigInt to string
        addresses: addresses,
        contractInfo: {
          address: MAIN_INDEX_CONTRACT_ADDRESS,
          sequence: ledgerState.sequence.toString(), // Convert BigInt to string
          owner: toHex(ledgerState.owner)
        }
      });
      
    } catch (error) {
      logger.error(`API: Error getting addresses from main index: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get addresses from main index',
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
      walletInitialized: serverWallet !== null,
      providersInitialized: serverProviders !== null,
      mainIndexConnected: mainIndexAPI !== null,
      mainIndexAddress: MAIN_INDEX_CONTRACT_ADDRESS
    });
  });
  
  // Initialize components before starting server
  await initializeServerComponents();
  
  // Start the server
  app.listen(PORT, () => {
    logger.info(`Main Index API Server running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`Get addresses: POST http://localhost:${PORT}/returnAllAddresses`);
    logger.info(`Connected to main index: ${MAIN_INDEX_CONTRACT_ADDRESS}`);
  });
  
  // Graceful shutdown handling
  const gracefulShutdown = async () => {
    logger.info('API Server: Shutting down gracefully...');
    if (serverWallet) {
      await serverWallet.close();
    }
  };
  
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};








/////////////////// server /////////////////////////////777



const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new main index contract
  2. Join an existing main index contract
  3. Exit
  4. Delete all keys
  5. Add private state with key
Which would you like to do? `;

const deployOrJoin = async (providers: BBoardProviders, rli: Interface, logger: Logger): Promise<BBoardAPI | null> => {
  let api: BBoardAPI | null = null;

  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        api = await BBoardAPI.deploy(providers, logger);
        logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);
        // Initialize the contract after deployment
        await api.initialize();
        logger.info('Contract initialized with owner');
        return api;
      case '2':
        api = await BBoardAPI.join(providers, await rli.question('What is the contract address (in hex)? '), logger);
        logger.info(`Joined contract at address: ${api.deployedContractAddress}`);
        return api;
      case '3':
        logger.info('Exiting...');
        return null;
      case '4':
        await providers.privateStateProvider.clear();
        await providers.privateStateProvider.clearSigningKeys();
        logger.info("Deleting private state");
        break;
      case '5':
        await addPrivateStateWithKey(providers, rli, logger);
        break;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

/**
 * addPrivateStateWithKey: Helper function to add private state with a secret key
 */
const addPrivateStateWithKey = async (providers: BBoardProviders, rli: Interface, logger: Logger): Promise<void> => {
  try {
    const secretKeyInput = await rli.question('Enter the secret key (32 bytes in hex format): ');
    
    // Validate the secret key format
    if (!secretKeyInput.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
      logger.error('Invalid secret key format. Please provide a 32-byte hex string (64 hex characters).');
      return;
    }

    // Remove '0x' prefix if present and convert to Uint8Array
    const cleanHex = secretKeyInput.replace(/^0x/, '');
    const secretKeyBytes = new Uint8Array(
      cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    // Create the private state object
    const privateState = {
      secretKey: secretKeyBytes
    };

    // Store the private state
    await providers.privateStateProvider.set(bboardPrivateStateKey, privateState);
    
    logger.info('Private state successfully added.');
    
  } catch (error) {
    logger.error(`Failed to add private state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/* **********************************************************************
 * displayLedgerState: shows the values of each of the fields declared
 * by the contract to be in the ledger state of the main index.
 */
const displayLedgerState = async (
  providers: BBoardProviders,
  deployedBBoardContract: DeployedBBoardContract,
  logger: Logger,
): Promise<void> => {
  const contractAddress = deployedBBoardContract.deployTxData.public.contractAddress;
  const ledgerState = await getBBoardLedgerState(providers, contractAddress);
  if (ledgerState === null) {
    logger.info(`There is no main index contract deployed at ${contractAddress}`);
  } else {
    logger.info(`=== Main Index Contract State ===`);
    logger.info(`Title: "main index" (fixed)`);
    logger.info(`Contract sequence: ${ledgerState.sequence}`);
    logger.info(`Address count: ${ledgerState.addressCount}`);
    logger.info(`Contract owner: ${toHex(ledgerState.owner)}`);
    
    // Display the addresses list
    if (ledgerState.addresses.length() === 0n) {
      logger.info(`Addresses: (empty)`);
    } else {
      logger.info(`Addresses:`);
      let index = 0;
      for (const addressEntry of ledgerState.addresses) {
        const [address, title] = addressEntry.split(',');
        logger.info(`  ${index + 1}. ${title || 'Untitled'}: ${address}`);
        index++;
      }
    }
  }
};

/* **********************************************************************
 * displayPrivateState: shows the hex-formatted value of the secret key.
 */
const displayPrivateState = async (providers: BBoardProviders, logger: Logger): Promise<void> => {
  const privateState = await providers.privateStateProvider.get(bboardPrivateStateKey);
  if (privateState === null) {
    logger.info(`There is no existing main index private state`);
  } else {
    logger.info(`Current secret key: ${toHex(privateState.secretKey)}`);
  }
};

/* **********************************************************************
 * displayDerivedState: shows the values of derived state which is made
 * by combining the ledger state with private state.
 */
const displayDerivedState = (ledgerState: BBoardDerivedState | undefined, logger: Logger) => {
  if (ledgerState === undefined) {
    logger.info(`No main index state currently available`);
  } else {
    logger.info(`=== Main Index Derived State ===`);
    logger.info(`Title: "main index" (fixed)`);
    logger.info(`Sequence: ${ledgerState.sequence}`);
    logger.info(`Address count: ${ledgerState.addressCount}`);
    logger.info(`You are the owner: ${ledgerState.isOwner ? 'YES' : 'NO'}`);
    
    // Display addresses
    if (ledgerState.addresses.length === 0) {
      logger.info(`Addresses: (empty)`);
    } else {
      logger.info(`Addresses:`);
      ledgerState.addresses.forEach((addressEntry, index) => {
        const [address, title] = addressEntry.split(',');
        logger.info(`  ${index + 1}. ${title || 'Untitled'}: ${address}`);
      });
    }
  }
};

/* **********************************************************************
 * mainLoop: the main interactive menu of the main index CLI.
 * Before starting the loop, the user is prompted to deploy a new
 * contract or join an existing one.
 */

const MAIN_LOOP_QUESTION = `
=== Main Index Management (Fixed Title: "main index") ===
You can do one of the following:
  1. Add contract address
  2. Remove first address
  3. Remove all addresses
  4. Clear all data (reset)
  5. Display the current ledger state (known by everyone)
  6. Display the current private state (known only to this DApp instance)
  7. Display the current derived state (known only to this DApp instance)
  8. Exit
Which would you like to do? `;

const mainLoop = async (providers: BBoardProviders, rli: Interface, logger: Logger): Promise<void> => {
  const bboardApi = await deployOrJoin(providers, rli, logger);
  if (bboardApi === null) {
    return;
  }

  let currentState: BBoardDerivedState | undefined;
  const stateObserver = {
    next: (state: BBoardDerivedState) => (currentState = state),
  };
  const subscription = bboardApi.state$.subscribe(stateObserver);

  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      switch (choice) {
        case '1': {
          const address = await rli.question(`Enter contract address (hex): `);
          const title = await rli.question(`Enter title for this contract: `);
          const addressWithTitle = `${address},${title}`;
          await bboardApi.addAddress(addressWithTitle);
          logger.info(`Added: ${title} -> ${address}`);
          break;
        }
        case '2':
          try {
            await bboardApi.removeFirstAddress();
            logger.info('Removed the most recently added address');
          } catch (error) {
            logger.error('Failed to remove address - list might be empty or you might not be the owner');
          }
          break;
        case '3':
          await bboardApi.removeAllAddresses();
          logger.info('Removed all addresses');
          break;
        case '4':
          await bboardApi.clear();
          logger.info('Cleared all data and reset the contract');
          break;
        case '5':
          await displayLedgerState(providers, bboardApi.deployedContract, logger);
          break;
        case '6':
          await displayPrivateState(providers, logger);
          break;
        case '7':
          displayDerivedState(currentState, logger);
          break;
        case '8':
          logger.info('Exiting...');
          return;
        default:
          logger.error(`Invalid choice: ${choice}`);
      }
    }
  } finally {
    // While we allow errors to bubble up to the 'run' function, we will always need to dispose of the state
    // subscription when we exit.
    subscription.unsubscribe();
  }
};

/* **********************************************************************
 * createWalletAndMidnightProvider: returns an object that
 * satifies both the WalletProvider and MidnightProvider
 * interfaces, both implemented in terms of the given wallet.
 */

const createWalletAndMidnightProvider = async (wallet: Wallet): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(wallet.state());
  return {
    coinPublicKey: state.coinPublicKey,
    encryptionPublicKey: state.encryptionPublicKey,
    balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
      return wallet
        .balanceTransaction(
          ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
          newCoins,
        )
        .then((tx) => wallet.proveTransaction(tx))
        .then((zswapTx) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
        .then(createBalancedTx);
    },
    submitTx(tx: BalancedTransaction): Promise<TransactionId> {
      return wallet.submitTransaction(tx);
    },
  };
};

/* **********************************************************************
 * waitForFunds: wait for tokens to appear in a wallet.
 */

const waitForFunds = (wallet: Wallet, logger: Logger) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap((state) => {
        const scanned = state.syncProgress?.synced ?? 0n;
        const behind = state.syncProgress?.lag.applyGap.toString() ?? 'unknown number';
        logger.info(`Wallet processed ${scanned} indices, remaining ${behind}`);
      }),
      Rx.filter((state) => {
        // Let's allow progress only if wallet is close enough
        const synced = typeof state.syncProgress?.synced === 'bigint' ? state.syncProgress.synced : 0n;
        const total = typeof state.syncProgress?.lag?.applyGap === 'bigint' ? state.syncProgress.lag.applyGap : 1_000n;
        return total - synced < 100n;
      }),
      Rx.map((s) => s.balances[nativeToken()] ?? 0n),
      Rx.filter((balance) => balance > 0n),
    ),
  );

/* **********************************************************************
 * buildWalletAndWaitForFunds: the main function that creates a wallet
 * and waits for tokens to appear in it.  The various "buildWallet"
 * functions all arrive here after collecting information for the
 * arguments.
 */

const buildWalletAndWaitForFunds = async (
  { indexer, indexerWS, node, proofServer }: Config,
  logger: Logger,
  seed: string,
): Promise<Wallet & Resource> => {
  const wallet = await WalletBuilder.buildFromSeed(
    indexer,
    indexerWS,
    proofServer,
    node,
    seed,
    getZswapNetworkId(),
    'warn',
  );
  wallet.start();
  const state = await Rx.firstValueFrom(wallet.state());
  logger.info(`Your wallet seed is: ${seed}`);
  logger.info(`Your wallet address is: ${state.address}`);
  let balance = state.balances[nativeToken()];
  if (balance === undefined || balance === 0n) {
    logger.info(`Your wallet balance is: 0`);
    logger.info(`Waiting to receive tokens...`);
    balance = await waitForFunds(wallet, logger);
  }
  logger.info(`Your wallet balance is: ${balance}`);
  return wallet;
};

// Generate a random see and create the wallet with that.
const buildFreshWallet = async (config: Config, logger: Logger): Promise<Wallet & Resource> =>
  await buildWalletAndWaitForFunds(config, logger, toHex(utils.randomBytes(32)));

// Prompt for a seed and create the wallet with that.
const buildWalletFromSeed = async (config: Config, rli: Interface, logger: Logger): Promise<Wallet & Resource> => {
  const seed = await rli.question('Enter your wallet seed: ');
  return await buildWalletAndWaitForFunds(config, logger, seed);
};

/* ***********************************************************************
 * This seed gives access to tokens minted in the genesis block of a local development node - only
 * used in standalone networks to build a wallet with initial funds.
 */
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

/* **********************************************************************
 * buildWallet: unless running in a standalone (offline) mode,
 * prompt the user to tell us whether to create a new wallet
 * or recreate one from a prior seed.
 */

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<(Wallet & Resource) | null> => {
  if (config instanceof StandaloneConfig) {
    return await buildWalletAndWaitForFunds(config, logger, GENESIS_MINT_WALLET_SEED);
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return await buildFreshWallet(config, logger);
      case '2':
        return await buildWalletFromSeed(config, rli, logger);
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const mapContainerPort = (env: StartedDockerComposeEnvironment, url: string, containerName: string) => {
  const mappedUrl = new URL(url);
  const container = env.getContainer(containerName);

  mappedUrl.port = String(container.getFirstMappedPort());

  return mappedUrl.toString().replace(/\/+$/, '');
};

/* **********************************************************************
 * run: the main entry point that starts the whole main index CLI.
 *
 * If called with a Docker environment argument, the application
 * will wait for Docker to be ready before doing anything else.
 */

export const run = async (config: Config, logger: Logger, dockerEnv?: DockerComposeEnvironment): Promise<void> => {
    const args = process.argv.slice(2);
  const serverMode = args.includes('--server') || args.includes('-s');
  
  if (serverMode) {
    logger.info('Starting in API server mode...');
    await startAPIServer(config, logger);
    return; // Don't continue with CLI mode
  }
  
  const rli = createInterface({ input, output, terminal: true });
  let env;
  if (dockerEnv !== undefined) {
    env = await dockerEnv.up();

    if (config instanceof StandaloneConfig) {
      config.indexer = mapContainerPort(env, config.indexer, 'bboard-indexer');
      config.indexerWS = mapContainerPort(env, config.indexerWS, 'bboard-indexer');
      config.node = mapContainerPort(env, config.node, 'bboard-node');
      config.proofServer = mapContainerPort(env, config.proofServer, 'bboard-proof-server');
    }
  }
  const wallet = await buildWallet(config, rli, logger);
  try {
    if (wallet !== null) {
      const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
      const providers = {
        privateStateProvider: levelPrivateStateProvider<PrivateStateId>({
          privateStateStoreName: config.privateStateStoreName,
        }),
        publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
        zkConfigProvider: new NodeZkConfigProvider<'initialize' | 'addAddress' | 'removeFirstAddress' | 'removeAllAddresses' | 'clear'>(config.zkConfigPath),
        proofProvider: httpClientProofProvider(config.proofServer),
        walletProvider: walletAndMidnightProvider,
        midnightProvider: walletAndMidnightProvider,
      };
      await mainLoop(providers, rli, logger);
    }
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        if (wallet !== null) {
          await wallet.close();
        }
      } catch (e) {
        logError(logger, e);
      } finally {
        try {
          if (env !== undefined) {
            await env.down();
            logger.info('Goodbye');
            process.exit(0);
          }
        } catch (e) {
          logError(logger, e);
        }
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}