import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  getInstallableProviderDescriptor,
  listInstallableProviderDescriptors,
  listProviderDescriptors,
  providerImagePolicy,
} from './skill-descriptor.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('provider skill descriptors', () => {
  it('derives the Codex setup offer and image policy from add-codex frontmatter', () => {
    expect(getInstallableProviderDescriptor('CODEX')).toEqual({
      value: 'codex',
      label: 'Codex',
      hint: 'OpenAI — ChatGPT subscription or API key',
      installSkill: 'add-codex',
      image: 'local-required',
      offered: true,
      skillDir: path.join('.claude', 'skills', 'add-codex'),
    });
    expect(listInstallableProviderDescriptors().map((entry) => entry.value)).toEqual(['codex']);
    expect(providerImagePolicy('CODEX')).toBe('local-required');
    expect(providerImagePolicy('claude')).toBe('hardened-compatible');
    expect(providerImagePolicy('unknown-provider')).toBe('local-required');
  });

  it('offers exactly Codex on trunk and keeps OpenCode out of the setup picker', () => {
    // The picker (setup/auto.ts askAgentProviderChoice) lists installed setup
    // providers plus listInstallableProviderDescriptors(). OpenCode is a
    // skill-only provider: hidden from the offer AND never registered with
    // setup, so neither source can surface it.
    expect(listInstallableProviderDescriptors().map((entry) => entry.value)).toEqual(['codex']);
    const opencode = listProviderDescriptors().find((entry) => entry.value === 'opencode');
    expect(opencode?.offered).toBe(false);
    expect(getInstallableProviderDescriptor('opencode')).toBeUndefined();

    const addOpencode = fs.readFileSync(path.join('.claude', 'skills', 'add-opencode', 'SKILL.md'), 'utf-8');
    expect(addOpencode).not.toMatch(/^```nc:append to:setup\/providers\/index\.ts/m);
    expect(addOpencode).not.toMatch(/^setup\/providers\/opencode\.ts$/m);
  });

  it('never surfaces a descriptor with offered false in the installable list', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-descriptor-'));
    roots.push(root);
    const dir = path.join(root, '.claude', 'skills', 'add-hidden');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'SKILL.md'),
      [
        '---',
        'name: add-hidden',
        'description: hidden',
        'metadata:',
        '  nanoclaw-provider: hidden',
        '  nanoclaw-provider-label: Hidden',
        '  nanoclaw-provider-hint: skill-only',
        "  nanoclaw-provider-offered: 'false'",
        '  nanoclaw-provider-install-skill: add-hidden',
        '  nanoclaw-provider-image: local-required',
        '---',
        '',
      ].join('\n'),
    );
    expect(listProviderDescriptors(root).map((entry) => [entry.value, entry.offered])).toEqual([['hidden', false]]);
    expect(listInstallableProviderDescriptors(root)).toEqual([]);
    expect(getInstallableProviderDescriptor('hidden', root)).toBeUndefined();
    // Hidden is not unknown: the image policy still comes from the descriptor.
    expect(providerImagePolicy('hidden', root)).toBe('local-required');
  });

  it('rejects incomplete provider metadata instead of offering a partial install', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-descriptor-'));
    roots.push(root);
    const dir = path.join(root, '.claude', 'skills', 'add-broken');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'SKILL.md'),
      '---\nname: add-broken\ndescription: broken\nmetadata:\n  nanoclaw-provider: broken\n---\n',
    );
    expect(() => listInstallableProviderDescriptors(root)).toThrow(/missing nanoclaw-provider-label/);
  });

  it('ignores malformed frontmatter that does not claim to describe a provider', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-descriptor-'));
    roots.push(root);
    const dir = path.join(root, '.claude', 'skills', 'unrelated');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: unrelated\ndescription: [broken\n');

    expect(listInstallableProviderDescriptors(root)).toEqual([]);
  });

  it('still rejects malformed frontmatter that claims to describe a provider', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-descriptor-'));
    roots.push(root);
    const dir = path.join(root, '.claude', 'skills', 'add-broken');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\nmetadata:\n  nanoclaw-provider: broken\n');

    expect(() => listInstallableProviderDescriptors(root)).toThrow(/frontmatter is missing the closing/);
  });
});
