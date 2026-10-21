import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({}));

import { analyzePackage } from '../src/scanner/package-analyzer';
import { InstalledExtension } from '../src/utils/extension-utils';
import {
  createEmptyReportCache,
  extensionCacheKey,
  loadReportCache,
} from '../src/scanner/report-cache';
import { scanExtensionCore } from '../src/scanner/scan-core';
import {
  resolveUserPatterns,
  fingerprintPatterns,
} from '../src/rules/default-patterns';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeExtensionDir(
  manifest: Record<string, unknown>,
  files: Record<string, string> = {},
): { dir: string; ext: InstalledExtension } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldx-signals-'));
  tempDirs.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(manifest),
    'utf8',
  );
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
  }
  return {
    dir,
    ext: {
      id: `${manifest.publisher}.${manifest.name}`,
      name: String(manifest.name),
      publisher: String(manifest.publisher),
      version: String(manifest.version ?? '1.0.0'),
      installPath: dir,
      packageJSON: manifest,
    },
  };
}

describe('manifest signals', () => {
  it('flags an extension that requires a newer editor', async () => {
    const { ext } = makeExtensionDir({
      name: 'future',
      publisher: 'test',
      version: '1.0.0',
      engines: { vscode: '^99.0.0' },
    });

    const result = await analyzePackage(ext, { vscodeVersion: '1.105.0' });
    expect(result.riskFactors.some((f) => f.id === 'outdated-engine')).toBe(
      true,
    );
  });

  it('flags running in untrusted workspaces', async () => {
    const { ext } = makeExtensionDir({
      name: 'untrusted',
      publisher: 'test',
      version: '1.0.0',
      capabilities: { untrustedWorkspaces: true },
    });

    const result = await analyzePackage(ext);
    expect(
      result.riskFactors.some((f) => f.id === 'runs-in-untrusted-workspaces'),
    ).toBe(true);
  });

  it('trusts extensions that restrict untrusted workspaces', async () => {
    const { ext } = makeExtensionDir({
      name: 'restricted',
      publisher: 'test',
      version: '1.0.0',
      capabilities: { untrustedWorkspaces: { supported: 'limited' } },
    });

    const result = await analyzePackage(ext);
    expect(
      result.trustSignals.some((s) => s.id === 'respects-workspace-trust'),
    ).toBe(true);
  });

  it('flags security sensitive settings defaults', async () => {
    const { ext } = makeExtensionDir({
      name: 'policy',
      publisher: 'test',
      version: '1.0.0',
      contributes: {
        configuration: {
          properties: {
            'security.workspace.trust.enabled': { default: false },
            'editor.fontSize': { default: 14 },
          },
        },
      },
    });

    const result = await analyzePackage(ext);
    const factor = result.riskFactors.find(
      (f) => f.id === 'overrides-security-settings',
    );
    expect(factor).toBeDefined();
    expect(factor?.evidence).toContain('security.workspace.trust.enabled');
  });

  it('flags extension packs and deprecated manifests', async () => {
    const { ext } = makeExtensionDir({
      name: 'packer',
      publisher: 'test',
      version: '1.0.0',
      extensionPack: ['other.one', 'other.two'],
      deprecated: 'use other.two instead',
    });

    const result = await analyzePackage(ext);
    expect(
      result.riskFactors.some((f) => f.id === 'installs-other-extensions'),
    ).toBe(true);
    expect(
      result.riskFactors.some((f) => f.id === 'deprecated-extension'),
    ).toBe(true);
  });

  it('flags known compromised packages', async () => {
    const { ext } = makeExtensionDir({
      name: 'compromised',
      publisher: 'test',
      version: '1.0.0',
      dependencies: { 'ua-parser-js': '0.7.30' },
    });

    const result = await analyzePackage(ext);
    expect(
      result.riskFactors.some((f) => f.id === 'compromised-ua-parser-js'),
    ).toBe(true);
  });

  it('does not flag a patched compromised package', async () => {
    const { ext } = makeExtensionDir({
      name: 'patched',
      publisher: 'test',
      version: '1.0.0',
      dependencies: { 'ua-parser-js': '0.7.33' },
    });

    const result = await analyzePackage(ext);
    expect(
      result.riskFactors.some((f) => f.id === 'compromised-ua-parser-js'),
    ).toBe(false);
  });
});

describe('user configured patterns', () => {
  it('keeps the built-in patterns in append mode', () => {
    const resolved = resolveUserPatterns({
      patternMode: 'append',
      patterns: ['boom'],
      excludePatterns: [],
      excludePresetIds: [],
    });
    expect(resolved.useBuiltInPatterns).toBe(true);
    expect(resolved.patterns).toHaveLength(1);
  });

  it('drops the built-in patterns in override mode', () => {
    const resolved = resolveUserPatterns({
      patternMode: 'override',
      patterns: ['boom'],
      excludePatterns: [],
      excludePresetIds: [],
    });
    expect(resolved.useBuiltInPatterns).toBe(false);
  });

  it('falls back to the built-in patterns when the custom list is empty', () => {
    const resolved = resolveUserPatterns({
      patternMode: 'override',
      patterns: [],
      excludePatterns: [],
      excludePresetIds: [],
    });
    expect(resolved.useBuiltInPatterns).toBe(true);
  });

  it('adds preset exclude patterns', () => {
    const resolved = resolveUserPatterns({
      patternMode: 'append',
      patterns: [],
      excludePatterns: [],
      excludePresetIds: ['conventionalCommits'],
    });
    expect(resolved.excludePatterns.length).toBeGreaterThan(0);
  });

  it('changes the fingerprint when the patterns change', () => {
    const a = fingerprintPatterns([/a/], [/b/]);
    const b = fingerprintPatterns([/a/], [/c/]);
    expect(a).not.toBe(b);
  });

  it('reports custom pattern matches as a low severity signal', async () => {
    const { ext } = makeExtensionDir(
      {
        name: 'custom',
        publisher: 'test',
        version: '1.0.0',
        main: './extension.js',
      },
      { 'extension.js': 'const message = "boom detected here";\n' },
    );

    const report = await scanExtensionCore(ext, {
      patterns: [/boom/],
      excludePatterns: [],
      useBuiltInPatterns: false,
      osvEnabled: false,
    });

    const factor = report.riskFactors.find((f) => f.id === 'custom-pattern');
    expect(factor).toBeDefined();
    expect(factor?.severity).toBe('low');
  });

  it('suppresses custom pattern matches with exclude patterns', async () => {
    const { ext } = makeExtensionDir(
      {
        name: 'custom-excluded',
        publisher: 'test',
        version: '1.0.0',
        main: './extension.js',
      },
      { 'extension.js': 'const message = "boom detected here";\n' },
    );

    const report = await scanExtensionCore(ext, {
      patterns: [/boom/],
      excludePatterns: [/boom detected/],
      useBuiltInPatterns: false,
      osvEnabled: false,
    });

    expect(report.riskFactors.some((f) => f.id === 'custom-pattern')).toBe(
      false,
    );
  });
});

describe('report cache', () => {
  it('reuses a cached report for an unchanged extension', async () => {
    const { ext } = makeExtensionDir({
      name: 'cached',
      publisher: 'test',
      version: '1.0.0',
      main: './extension.js',
    });

    const cache = createEmptyReportCache();
    const first = await scanExtensionCore(ext, {
      cache,
      patternFingerprint: 'fp1',
      osvEnabled: false,
    });
    const second = await scanExtensionCore(ext, {
      cache,
      patternFingerprint: 'fp1',
      osvEnabled: false,
    });

    expect(second.riskScore).toBe(first.riskScore);
    expect(second.scannedAt).toBe(first.scannedAt);
  });

  it('does not reuse a report when the fingerprint changes', async () => {
    const { ext } = makeExtensionDir({
      name: 'cached2',
      publisher: 'test',
      version: '1.0.0',
      main: './extension.js',
    });

    const cache = createEmptyReportCache();
    const first = await scanExtensionCore(ext, {
      cache,
      patternFingerprint: 'fp1',
      osvEnabled: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const other = await scanExtensionCore(ext, {
      cache,
      patternFingerprint: 'fp2',
      osvEnabled: false,
    });

    expect(other.scannedAt).not.toBe(first.scannedAt);
  });

  it('persists and reloads the cache from disk', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldx-cache-'));
    tempDirs.push(dir);
    const cachePath = path.join(dir, 'report-cache.json');

    const { cache, save } = loadReportCache(cachePath);
    expect(cache.size).toBe(0);
    save();

    const reloaded = loadReportCache(cachePath);
    expect(reloaded.cache.size).toBe(0);
  });

  it('changes the cache key when the manifest changes', () => {
    const { ext } = makeExtensionDir({
      name: 'keyed',
      publisher: 'test',
      version: '1.0.0',
    });
    const key = extensionCacheKey(ext);
    expect(key).toContain('test.keyed@1.0.0');
  });
});
