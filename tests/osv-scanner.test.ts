import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: () => ({
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      show: () => undefined,
      dispose: () => undefined,
    }),
  },
}));

import { normalizeVersion } from '../src/scanner/osv-scanner';

describe('OSV version normalization', () => {
  it('strips range prefixes', () => {
    expect(normalizeVersion('^4.17.21')).toBe('4.17.21');
    expect(normalizeVersion('~1.2.3')).toBe('1.2.3');
    expect(normalizeVersion('>=2.0.0')).toBe('2.0.0');
  });

  it('keeps exact versions', () => {
    expect(normalizeVersion('4.17.21')).toBe('4.17.21');
    expect(normalizeVersion('2.0.0-rc.1')).toBe('2.0.0-rc.1');
  });

  it('rejects ranges that do not describe a single version', () => {
    expect(normalizeVersion('1.x')).toBeNull();
    expect(normalizeVersion('*')).toBeNull();
    expect(normalizeVersion('1.0.0 || 2.0.0')).toBeNull();
    expect(normalizeVersion('')).toBeNull();
  });
});
