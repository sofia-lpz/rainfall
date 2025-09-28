// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Provides types and utilities for working with main index contracts.
 *
 * @packageDocumentation
 */

import contractModule from '../../contract/src/managed/bboard/contract/index.cjs';
const { Contract, ledger, pureCircuits } = contractModule;
import { type ContractAddress, convert_bigint_to_Uint8Array } from '@midnight-ntwrk/compact-runtime';
import { type Logger } from 'pino';
import {
  type BBoardDerivedState,
  type BBoardContract,
  type BBoardProviders,
  type DeployedBBoardContract,
  bboardPrivateStateKey,
} from './common-types.js';
import { type BBoardPrivateState, createBBoardPrivateState, witnesses } from '../../contract/src/index';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

/** @internal */
const bboardContractInstance: BBoardContract = new Contract(witnesses);

/**
 * An API for a deployed main index.
 */
export interface DeployedBBoardAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<BBoardDerivedState>;

  initialize: () => Promise<void>;
  addAddress: (addressWithTitle: string) => Promise<void>;
  removeFirstAddress: () => Promise<void>;
  removeAllAddresses: () => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * A namespace that represents the exports from the `'utils'` sub-package.
 *
 * @public
 */
export * as utils from './utils/index.js';
export * from './common-types.js';

/**
 * Provides an implementation of {@link DeployedBBoardAPI} by adapting a deployed main index
 * contract.
 *
 * @remarks
 * The `BBoardPrivateState` is managed at the DApp level by a private state provider. As such, this
 * private state is shared between all instances of {@link BBoardAPI}, and their underlying deployed
 * contracts. The private state defines a `'secretKey'` property that effectively identifies the current
 * user, and is used to determine if the current user is the owner of the main index as the observable
 * contract state changes.
 *
 * In the future, Midnight.js will provide a private state provider that supports private state storage
 * keyed by contract address. This will remove the current workaround of sharing private state across
 * the deployed contracts, and allows for a unique secret key to be generated for each contract
 * that the user interacts with.
 */
// TODO: Update BBoardAPI to use contract level private state storage.
export class BBoardAPI implements DeployedBBoardAPI {
  /** @internal */
  private constructor(
    public readonly deployedContract: DeployedBBoardContract,
    providers: BBoardProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = combineLatest(
      [
        // Combine public (ledger) state with...
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  ...ledgerState,
                  owner: toHex(ledgerState.owner),
                  addressCount: Number(ledgerState.addressCount),
                },
              },
            }),
          ),
        ),
        // ...private state...
        //    since the private state of the main index application never changes, we can query the
        //    private state once and always use the same value with `combineLatest`. In applications
        //    where the private state is expected to change, we would need to make this an `Observable`.
        from(providers.privateStateProvider.get(bboardPrivateStateKey) as Promise<BBoardPrivateState>),
      ],
      // ...and combine them to produce the required derived state.
      (ledgerState, privateState) => {
        const hashedSecretKey = pureCircuits.publicKey(
          privateState.secretKey,
          convert_bigint_to_Uint8Array(32, ledgerState.sequence),
        );

        return {
          sequence: ledgerState.sequence,
          addresses: Array.from(ledgerState.addresses), // Convert List to Array
          addressCount: ledgerState.addressCount,
          isOwner: toHex(ledgerState.owner) === toHex(hashedSecretKey),
        };
      },
    );
  }

  /**
   * Gets the address of the current deployed contract.
   */
  readonly deployedContractAddress: ContractAddress;

  /**
   * Gets an observable stream of state changes based on the current public (ledger),
   * and private state data.
   */
  readonly state$: Observable<BBoardDerivedState>;

  /**
   * Initializes the contract by setting the owner.
   *
   * @remarks
   * This method should be called once after deployment to establish ownership.
   */
  async initialize(): Promise<void> {
    this.logger?.info('Initializing contract');

    const txData = await this.deployedContract.callTx.initialize();

    this.logger?.trace({
      transactionAdded: {
        circuit: 'initialize',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Adds a new contract address with title to the main index.
   *
   * @param addressWithTitle The address and title in format "address,title"
   *
   * @remarks
   * This method can fail if the current user is not the owner of the contract.
   */
  async addAddress(addressWithTitle: string): Promise<void> {
    this.logger?.info(`Adding address: ${addressWithTitle}`);

    const txData = await this.deployedContract.callTx.addAddress(addressWithTitle);

    this.logger?.trace({
      transactionAdded: {
        circuit: 'addAddress',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Removes the first (most recently added) address from the list.
   *
   * @remarks
   * This method can fail if the current user is not the owner or if the list is empty.
   */
  async removeFirstAddress(): Promise<void> {
    this.logger?.info('Removing first address');

    const txData = await this.deployedContract.callTx.removeFirstAddress();

    this.logger?.trace({
      transactionAdded: {
        circuit: 'removeFirstAddress',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Removes all addresses from the list but keeps the owner.
   *
   * @remarks
   * This method can fail if the current user is not the owner.
   */
  async removeAllAddresses(): Promise<void> {
    this.logger?.info('Removing all addresses');

    const txData = await this.deployedContract.callTx.removeAllAddresses();

    this.logger?.trace({
      transactionAdded: {
        circuit: 'removeAllAddresses',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Clears all addresses and increments the sequence (full reset).
   *
   * @remarks
   * This method can fail if the current user is not the owner.
   */
  async clear(): Promise<void> {
    this.logger?.info('Clearing all data');

    const txData = await this.deployedContract.callTx.clear();

    this.logger?.trace({
      transactionAdded: {
        circuit: 'clear',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Deploys a new main index contract to the network.
   *
   * @param providers The main index providers.
   * @param logger An optional 'pino' logger to use for logging.
   * @returns A `Promise` that resolves with a {@link BBoardAPI} instance that manages the newly deployed
   * {@link DeployedBBoardContract}; or rejects with a deployment error.
   */
  static async deploy(providers: BBoardProviders, logger?: Logger): Promise<BBoardAPI> {
    logger?.info('deployContract');

    const deployedBBoardContract = await deployContract<typeof bboardContractInstance>(providers, {
      privateStateId: bboardPrivateStateKey,
      contract: bboardContractInstance,
      initialPrivateState: await BBoardAPI.getPrivateState(providers),
    });

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedBBoardContract.deployTxData.public,
      },
    });

    return new BBoardAPI(deployedBBoardContract, providers, logger);
  }

  /**
   * Finds an already deployed main index contract on the network, and joins it.
   *
   * @param providers The main index providers.
   * @param contractAddress The contract address of the deployed main index contract to search for and join.
   * @param logger An optional 'pino' logger to use for logging.
   * @returns A `Promise` that resolves with a {@link BBoardAPI} instance that manages the joined
   * {@link DeployedBBoardContract}; or rejects with an error.
   */
  static async join(providers: BBoardProviders, contractAddress: ContractAddress, logger?: Logger): Promise<BBoardAPI> {
    logger?.info({
      joinContract: {
        contractAddress,
      },
    });

    const deployedBBoardContract = await findDeployedContract<BBoardContract>(providers, {
      contractAddress,
      contract: bboardContractInstance,
      privateStateId: bboardPrivateStateKey,
      initialPrivateState: await BBoardAPI.getPrivateState(providers),
    });

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedBBoardContract.deployTxData.public,
      },
    });

    return new BBoardAPI(deployedBBoardContract, providers, logger);
  }

  private static async getPrivateState(providers: BBoardProviders): Promise<BBoardPrivateState> {
    const existingPrivateState = await providers.privateStateProvider.get(bboardPrivateStateKey);
    return existingPrivateState ?? createBBoardPrivateState(utils.randomBytes(32));
  }
}