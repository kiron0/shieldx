import { describe, expect, it, vi } from 'vitest';
import { EXT_CONFIG } from '../src/config';
import { DashboardProvider } from '../src/dashboard/dashboard-provider';

const mockConfigValues: Record<string, unknown> = {
  autoScanOnStartup: false,
  warnOnHighRisk: true,
  minimumWarningLevel: 'high',
  scanNodeModules: false,
  reportFormat: 'markdown',
  enableOsvScan: true,
};
const mockConfigUpdate = vi.fn();

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: (key: string, fallback?: unknown) =>
        key in mockConfigValues ? mockConfigValues[key] : fallback,
      update: mockConfigUpdate,
    }),
  },
}));

describe('DashboardProvider', () => {
  function createHarness(historyEntries: any[] = []) {
    const state = {
      history: historyEntries,
      cache: { totalExtensions: 1 },
    };
    const postMessage = vi.fn();
    const update = vi.fn(async (key: string, value: unknown) => {
      if (key === `${EXT_CONFIG.name.toLowerCase()}.scanHistory`) {
        state.history = (value as any[]) || [];
      }
      if (key === `${EXT_CONFIG.name.toLowerCase()}.lastScan`) {
        state.cache = value as any;
      }
    });
    const get = vi.fn((key: string, fallback?: unknown) => {
      if (key === `${EXT_CONFIG.name.toLowerCase()}.scanHistory`)
        return state.history;
      if (key === `${EXT_CONFIG.name.toLowerCase()}.lastScan`)
        return state.cache;
      return fallback;
    });
    const provider = new DashboardProvider(
      {
        globalState: {
          get,
          update,
        },
      } as any,
      vi.fn(async () => {
        state.cache = undefined as any;
      }),
    );

    (provider as any)._view = {
      webview: {
        postMessage,
      },
    };

    return {
      state,
      postMessage,
      provider,
      update,
      clearPersistedScanState: (provider as any)._clearPersistedScanState,
    };
  }

  it('clears cached scan state when clearing all history', async () => {
    const entry = {
      id: 'scan-1',
      time: '2026-06-26T05:03:46.058Z',
      total: 1,
      high: 0,
      critical: 0,
      moderate: 0,
      low: 1,
      summary: { totalExtensions: 1, reports: [] },
    };
    const harness = createHarness([entry]);

    await (harness.provider as any).executeClearHistory();

    expect(harness.state.history).toEqual([]);
    expect(harness.state.cache).toBeUndefined();
    expect(harness.update).toHaveBeenCalledWith(
      `${EXT_CONFIG.name.toLowerCase()}.lastScan`,
      undefined,
    );
    expect(harness.postMessage).toHaveBeenCalledWith({ type: 'scanCleared' });
    expect(harness.postMessage).toHaveBeenCalledWith({
      type: 'history',
      history: [],
    });
  });

  it('clears current scan state when last history entry is removed', async () => {
    const entry = {
      id: 'scan-1',
      time: '2026-06-26T05:03:46.058Z',
      total: 1,
      high: 0,
      critical: 0,
      moderate: 0,
      low: 1,
      summary: { totalExtensions: 1, reports: [] },
    };
    const harness = createHarness([entry]);

    (harness.provider as any).executeClearHistoryEntry('scan-1');

    expect(harness.state.history).toEqual([]);
    expect(harness.state.cache).toBeUndefined();
    expect(harness.postMessage).toHaveBeenCalledWith({ type: 'scanCleared' });
    expect(harness.postMessage).toHaveBeenCalledWith({
      type: 'historyEntryCleared',
      id: 'scan-1',
    });
  });

  it('falls back overview state to next history entry after removal', async () => {
    const newer = {
      id: 'scan-2',
      time: '2026-06-27T05:03:46.058Z',
      total: 2,
      high: 1,
      critical: 0,
      moderate: 1,
      low: 0,
      summary: { totalExtensions: 2, reports: [{ id: 'b' }] },
    };
    const older = {
      id: 'scan-1',
      time: '2026-06-26T05:03:46.058Z',
      total: 1,
      high: 0,
      critical: 0,
      moderate: 0,
      low: 1,
      summary: { totalExtensions: 1, reports: [{ id: 'a' }] },
    };
    const harness = createHarness([newer, older]);

    (harness.provider as any).executeClearHistoryEntry('scan-2');

    expect(harness.state.history).toEqual([older]);
    expect(harness.state.cache).toEqual(older.summary);
    expect(harness.postMessage).toHaveBeenCalledWith({
      type: 'scanResult',
      data: older.summary,
    });
  });

  it('sendSettings posts all config keys to webview', () => {
    const harness = createHarness();

    (harness.provider as any).sendSettings();

    expect(harness.postMessage).toHaveBeenCalledWith({
      type: 'settingsData',
      settings: {
        autoScanOnStartup: false,
        warnOnHighRisk: true,
        minimumWarningLevel: 'high',
        scanNodeModules: false,
        reportFormat: 'markdown',
        enableOsvScan: true,
      },
    });
  });

  it('sendSettings includes all six config keys', () => {
    const harness = createHarness();

    (harness.provider as any).sendSettings();

    const call = harness.postMessage.mock.calls.find(
      (c: any[]) => c[0]?.type === 'settingsData',
    );
    expect(call).toBeTruthy();
    const settings = call![0].settings;
    expect(settings).toHaveProperty('autoScanOnStartup');
    expect(settings).toHaveProperty('warnOnHighRisk');
    expect(settings).toHaveProperty('minimumWarningLevel');
    expect(settings).toHaveProperty('scanNodeModules');
    expect(settings).toHaveProperty('reportFormat');
    expect(settings).toHaveProperty('enableOsvScan');
  });

  it('sendSettings does nothing when view is not available', () => {
    const harness = createHarness();
    (harness.provider as any)._view = undefined;

    (harness.provider as any).sendSettings();

    expect(harness.postMessage).not.toHaveBeenCalled();
  });

  it('sendSettings reflects config values correctly', () => {
    const harness = createHarness();

    mockConfigValues.autoScanOnStartup = true;
    mockConfigValues.reportFormat = 'json';
    mockConfigValues.minimumWarningLevel = 'critical';

    (harness.provider as any).sendSettings();

    const call = harness.postMessage.mock.calls.find(
      (c: any[]) => c[0]?.type === 'settingsData',
    );
    const settings = call![0].settings;
    expect(settings.autoScanOnStartup).toBe(true);
    expect(settings.reportFormat).toBe('json');
    expect(settings.minimumWarningLevel).toBe('critical');

    mockConfigValues.autoScanOnStartup = false;
    mockConfigValues.reportFormat = 'markdown';
    mockConfigValues.minimumWarningLevel = 'high';
  });
});
