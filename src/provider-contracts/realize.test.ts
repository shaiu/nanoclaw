import path from 'path';
import { describe, expect, it } from 'vitest';

import './index.js';
import { protectedProviderDocumentSourcePaths } from './realize.js';
import { PROVIDER_HOST_CONTRACT_SEAM_VERSION, getProviderHostContract, type ProviderHostContract } from './registry.js';

const ROOT = '/srv/nanoclaw';
const CANON = path.resolve(ROOT, 'container', 'CLAUDE.md');

function fakeContract(sourceProtection?: 'install-surface'): ProviderHostContract {
  return {
    seamVersion: PROVIDER_HOST_CONTRACT_SEAM_VERSION,
    projectDocument: {
      fileName: 'AGENTS.md',
      containerPath: '/workspace/agent/AGENTS.md',
      mountClass: 'group-state',
      ...(sourceProtection ? { sourceProtection } : {}),
    },
    stateVolumes: [],
    skillBackings: [],
    skillViews: [],
    files: [],
  };
}

describe('protectedProviderDocumentSourcePaths', () => {
  it('protects the canonical template for the installed Claude contract', () => {
    expect(protectedProviderDocumentSourcePaths(ROOT)).toEqual([CANON]);
  });

  it('resolves each protecting contract on its own, not from any other contract', () => {
    const claude = getProviderHostContract('claude')!;

    expect(protectedProviderDocumentSourcePaths(ROOT, [fakeContract()])).toEqual([]);
    expect(protectedProviderDocumentSourcePaths(ROOT, [fakeContract('install-surface')])).toEqual([CANON]);
    // A second protecting contract renders from the same core-owned canon, so
    // the protected set is still that one path.
    expect(protectedProviderDocumentSourcePaths(ROOT, [claude, fakeContract('install-surface')])).toEqual([CANON]);
    expect(protectedProviderDocumentSourcePaths(ROOT, [claude, fakeContract()])).toEqual([CANON]);
  });
});
