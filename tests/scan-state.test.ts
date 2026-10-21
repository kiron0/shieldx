import { describe, expect, it } from 'vitest';
import { getShortScanId } from '../src/utils/scan-id';
import { stripIcons } from '../src/utils/summary-utils';
import { SecuritySummary } from '../src/types';

describe('getShortScanId', () => {
  it('always returns a prefixed six-character id', () => {
    const id = getShortScanId('2026-01-01T00:00:00.000Z');
    expect(id).toMatch(/^ShieldX-[0-9A-F]{6}$/);
  });

  it('is stable for the same input', () => {
    expect(getShortScanId('abc')).toBe(getShortScanId('abc'));
  });

  it('produces different ids for different inputs', () => {
    expect(getShortScanId('abc')).not.toBe(getShortScanId('abd'));
  });

  it('handles missing input', () => {
    expect(getShortScanId(undefined)).toMatch(/^ShieldX-[0-9A-F]{6}$/);
    expect(getShortScanId('')).toMatch(/^ShieldX-[0-9A-F]{6}$/);
  });
});

describe('stripIcons', () => {
  const summary: SecuritySummary = {
    totalExtensions: 1,
    lowRisk: 1,
    moderateRisk: 0,
    highRisk: 0,
    criticalRisk: 0,
    scannedAt: '2026-01-01T00:00:00.000Z',
    vscodeVersion: '1.105.0',
    reports: [
      {
        id: 'pub.ext',
        name: 'ext',
        publisher: 'pub',
        version: '1.0.0',
        installPath: '/tmp/ext',
        iconDataUrl: 'data:image/png;base64,AAAABBBB',
        riskScore: 0,
        riskLevel: 'low',
        riskFactors: [],
        trustSignals: [],
        detectedCapabilities: {
          usesChildProcess: false,
          usesNetworkRequests: false,
          readsEnvironmentVariables: false,
          accessesWorkspaceFiles: false,
          hasInstallScripts: false,
          hasObfuscatedCode: false,
          declaresBroadActivationEvents: false,
          usesDynamicExecution: false,
          downloadsRemoteExecutables: false,
          usesSuspiciousDomains: false,
        },
        extensionDependencies: [],
        recommendation: 'ok',
        scannedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };

  it('removes icon payloads without touching other data', () => {
    const stripped = stripIcons(summary);
    expect(stripped.reports[0].iconDataUrl).toBeUndefined();
    expect(stripped.reports[0].id).toBe('pub.ext');
    expect(stripped.totalExtensions).toBe(1);
  });

  it('does not mutate the source summary', () => {
    stripIcons(summary);
    expect(summary.reports[0].iconDataUrl).toBe(
      'data:image/png;base64,AAAABBBB',
    );
  });

  it('drops the icon payload when serialized', () => {
    const json = JSON.stringify(stripIcons(summary));
    expect(json).not.toContain('iconDataUrl');
  });
});
