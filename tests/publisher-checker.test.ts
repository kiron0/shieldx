import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => ({}));

vi.mock('../src/utils/http-client', () => ({
  fetchJson: vi.fn(),
}));

import { checkPublisherReputation } from '../src/scanner/publisher-checker';
import { fetchJson } from '../src/utils/http-client';
import { InstalledExtension } from '../src/utils/extension-utils';

describe('Publisher Checker Verified Reputation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores repository metrics if the extension is not verified or well-known matching owner', async () => {
    const ext: InstalledExtension = {
      id: 'attacker.python-spoof',
      name: 'python-spoof',
      publisher: 'attacker',
      version: '1.0.0',
      installPath: '/fake/path',
      packageJSON: {
        name: 'python-spoof',
        publisher: 'attacker',
        repository: {
          type: 'git',
          url: 'https://github.com/microsoft/vscode-python',
        },
      },
    };

    const result = await checkPublisherReputation(ext);
    expect(fetchJson).not.toHaveBeenCalled();
    expect(result.trustSignals).toHaveLength(0);
    expect(result.riskFactors).toHaveLength(0);
  });

  it('runs repository metrics check if extension is in VERIFIED_EXT_REPOS', async () => {
    const ext: InstalledExtension = {
      id: 'ms-python.python',
      name: 'python',
      publisher: 'ms-python',
      version: '1.0.0',
      installPath: '/fake/path',
      packageJSON: {
        name: 'python',
        publisher: 'ms-python',
        repository: {
          type: 'git',
          url: 'https://github.com/microsoft/vscode-python',
        },
      },
    };

    vi.mocked(fetchJson).mockResolvedValue({
      stargazers_count: 1000,
      open_issues_count: 5,
      pushed_at: new Date().toISOString(),
    });

    const result = await checkPublisherReputation(ext);
    expect(fetchJson).toHaveBeenCalled();
    expect(result.trustSignals.some((s) => s.id === 'popular-repo')).toBe(true);
  });

  it('runs repository metrics check if extension publisher is well-known and owner matches publisher', async () => {
    const ext: InstalledExtension = {
      id: 'microsoft.csharp',
      name: 'csharp',
      publisher: 'microsoft',
      version: '1.0.0',
      installPath: '/fake/path',
      packageJSON: {
        name: 'csharp',
        publisher: 'microsoft',
        repository: { type: 'git', url: 'https://github.com/microsoft/csharp' },
      },
    };

    vi.mocked(fetchJson).mockResolvedValue({
      stargazers_count: 2000,
      open_issues_count: 2,
      pushed_at: new Date().toISOString(),
    });

    const result = await checkPublisherReputation(ext);
    expect(fetchJson).toHaveBeenCalled();
    expect(result.trustSignals.some((s) => s.id === 'popular-repo')).toBe(true);
  });
});
