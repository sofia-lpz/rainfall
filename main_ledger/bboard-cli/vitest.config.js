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

import { defineConfig } from 'vitest/config';

export default defineConfig({
  mode: 'node',
  test: {
    setupFiles: ['./vitest.setup.js'],
    testTimeout: 1000 * 60 * 45,
    deps: {
      interopDefault: true,
    },
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules'],
    root: '.',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        branches: 50,
        functions: 73,
        lines: 72,
        statements: -269,
      },
    },
    reporters: ['default', ['junit', { outputFile: 'reports/report.xml' }]],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    conditions: ['import', 'node', 'default'],
  },
});
