import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.fn();
const fileExistsAsyncMock = vi.fn();
const warnMock = vi.fn();

vi.mock('child_process', () => ({
  execFile: execFileMock,
}));

vi.mock('util', () => ({
  promisify: (fn: unknown) => fn,
}));

vi.mock('../src/utils/file-utils', () => ({
  fileExistsAsync: fileExistsAsyncMock,
}));

vi.mock('../src/utils/logger', () => ({
  warn: warnMock,
}));

let runNpmAudit: typeof import('../src/scanner/npm-audit-scanner').runNpmAudit;

beforeEach(async () => {
  vi.clearAllMocks();
  fileExistsAsyncMock.mockResolvedValue(true);
  ({ runNpmAudit } = await import('../src/scanner/npm-audit-scanner'));
});

describe('npm-audit-scanner', () => {
  it('returns empty when package-lock.json missing', async () => {
    fileExistsAsyncMock.mockResolvedValue(false);

    await expect(runNpmAudit('/tmp/ext')).resolves.toEqual([]);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('parses successful npm audit JSON', async () => {
    execFileMock.mockResolvedValue({
      stdout: JSON.stringify({
        vulnerabilities: {
          lodash: {
            name: 'lodash',
            severity: 'high',
            via: ['Prototype Pollution'],
            range: '<4.17.21',
            title: 'Prototype Pollution',
          },
        },
        metadata: { vulnerabilities: { high: 1 } },
      }),
    });

    const result = await runNpmAudit('/tmp/ext');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'npm-audit-lodash',
      severity: 'high',
      points: 15,
    });
  });

  it('parses JSON from rejected stdout', async () => {
    execFileMock.mockRejectedValue({
      stdout: JSON.stringify({
        vulnerabilities: {
          minimist: {
            name: 'minimist',
            severity: 'critical',
            via: ['Prototype Pollution'],
            range: '<1.2.6',
            title: 'Prototype Pollution',
          },
        },
        metadata: { vulnerabilities: { critical: 1 } },
      }),
      stderr: '',
      message: 'audit failed',
    });

    const result = await runNpmAudit('/tmp/ext');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'npm-audit-minimist',
      severity: 'critical',
      points: 25,
    });
  });

  it('returns empty on no lockfile stderr', async () => {
    execFileMock.mockRejectedValue({
      stderr: 'No lockfile found',
      message: 'no lockfile',
    });

    await expect(runNpmAudit('/tmp/ext')).resolves.toEqual([]);
    expect(warnMock).not.toHaveBeenCalled();
  });
});
