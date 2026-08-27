/**
 * Reusable runtime-contract conformance suite.
 *
 * A payload branch covers its own provider by calling this from any of its
 * test files:
 *
 *   import '../providers/index.js';
 *   import '../provider-contracts/index.js';
 *   import { defineProviderConformance } from '../provider-contracts/testing/conformance.js';
 *   defineProviderConformance('codex', codexRuntimeContract);
 *
 * The in-tree conformance.test.ts calls it for every registered contract.
 * Mirrors the host's `src/db/testing/driver-conformance.ts` pattern.
 */
import { describe, expect, it } from 'bun:test';

import { createProvider } from '../../providers/factory.js';
import { getProviderRuntimeContract } from '../../providers/provider-registry.js';
import type { ProviderRuntimeContract } from '../registry.js';
import { assertProviderRuntimeContractShape, probeProviderRuntimeConfiguration } from '../verifier.js';

export function defineProviderConformance(name: string, contract: ProviderRuntimeContract): void {
  describe(`runtime provider contract: ${name}`, () => {
    it('is the contract registered for its provider', () => {
      expect(getProviderRuntimeContract(name)).toBe(contract);
    });

    it('matches its provider implementation', () => {
      expect(() => createProvider(name)).not.toThrow();
    });

    it('satisfies the contract shape', () => {
      expect(() => assertProviderRuntimeContractShape(name, contract)).not.toThrow();
    });

    it('has live configuration capabilities', () => {
      expect(() => probeProviderRuntimeConfiguration(name, contract)).not.toThrow();
    });
  });
}
