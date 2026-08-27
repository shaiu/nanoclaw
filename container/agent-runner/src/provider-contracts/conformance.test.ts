import { describe, expect, it } from 'bun:test';

import '../providers/index.js';
import './index.js';
// The test-double provider and its contract: the same two-step pair a skill
// appends to the two barrels, registered here because mock is test-only.
import '../providers/mock.js';
import './mock.js';
import {
  getProviderRuntimeContract,
  hasDeclaredProviderRuntimeContract,
  listProviderNames,
} from '../providers/provider-registry.js';
import { defineProviderConformance } from './testing/conformance.js';

/**
 * Registration is a map write, so this suite is where a declared-but-dead
 * capability is caught. It runs on every container test run and inside the
 * install-time verifier — the two moments a payload actually enters a tree —
 * instead of at container startup, where a throw would kill a `--rm`
 * container and take its logs with it.
 *
 * The checks themselves live in testing/conformance.ts so a payload branch
 * can run the same suite against its own contract.
 */
const declared = listProviderNames().filter(hasDeclaredProviderRuntimeContract);

describe('installed runtime provider contracts', () => {
  it('cover the in-tree providers', () => {
    expect(declared).toContain('claude');
    expect(declared).toContain('mock');
  });
});

for (const provider of declared) {
  defineProviderConformance(provider, getProviderRuntimeContract(provider)!);
}
