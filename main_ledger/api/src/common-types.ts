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
 * Main index common types and abstractions.
 *
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { BBoardPrivateState, Contract, Witnesses } from '../../contract/src/index';

export const bboardPrivateStateKey = 'bboardPrivateState';

export type PrivateStateId = typeof bboardPrivateStateKey;

/**
 * The private states consumed throughout the application.
 *
 * @remarks
 * {@link PrivateStates} can be thought of as a type that describes a schema for all
 * private states for all contracts used in the application. Each key represents
 * the type of private state consumed by a particular type of contract.
 * The key is used by the deployed contract when interacting with a private state provider,
 * and the type (i.e., `typeof PrivateStates[K]`) represents the type of private state
 * expected to be returned.
 *
 * Since there is only one contract type for the main index example, we only define a
 * single key/type in the schema.
 *
 * @public
 */
export type PrivateStates = {
  /**
   * Key used to provide the private state for {@link BBoardContract} deployments.
   */
  readonly bboardPrivateState: BBoardPrivateState;
};

/**
 * Represents a main index contract and its private state.
 *
 * @public
 */
export type BBoardContract = Contract<BBoardPrivateState, Witnesses<BBoardPrivateState>>;

/**
 * The keys of the circuits exported from {@link BBoardContract}.
 *
 * @public
 */
export type BBoardCircuitKeys = Exclude<keyof BBoardContract['impureCircuits'], number | symbol>;

/**
 * The providers required by {@link BBoardContract}.
 *
 * @public
 */
export type BBoardProviders = MidnightProviders<BBoardCircuitKeys, PrivateStateId, BBoardPrivateState>;

/**
 * A {@link BBoardContract} that has been deployed to the network.
 *
 * @public
 */
export type DeployedBBoardContract = FoundContract<BBoardContract>;

/**
 * A type that represents the derived combination of public (or ledger), and private state.
 */
export type BBoardDerivedState = {
  readonly sequence: bigint;
  readonly addresses: string[]; // Array of "address,title" strings
  readonly addressCount: bigint;
  /**
   * A readonly flag that determines if the current user is the owner of this main index.
   *
   * @remarks
   * The `owner` property of the public (or ledger) state is the public key of the contract owner, while
   * the `secretKey` property of {@link BBoardPrivateState} is the secret key of the current user. If
   * `owner` corresponds to the public key derived from `secretKey`, then `isOwner` is `true`.
   */
  readonly isOwner: boolean;
};