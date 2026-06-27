import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EXT_CONFIG } from '../src/config';
import { DashboardProvider } from '../src/dashboard/dashboard-provider';

const { showWarningMessage } = vi.hoisted(() => ({
  showWarningMessage: vi.fn(),
}));

vi.mock('vscode', () => ({
  window: {
    showWarningMessage,
  },
}));

describe('DashboardProvider', () => {
  beforeEach(() => {
    showWarningMessage.mockReset();
  });

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
    showWarningMessage.mockResolvedValue('Clear');
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

    await (harness.provider as any).confirmClearHistory();

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
    showWarningMessage.mockResolvedValue('Clear');
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

    await (harness.provider as any).confirmClearHistoryEntry('scan-1');

    expect(harness.state.history).toEqual([]);
    expect(harness.state.cache).toBeUndefined();
    expect(harness.postMessage).toHaveBeenCalledWith({ type: 'scanCleared' });
    expect(harness.postMessage).toHaveBeenCalledWith({
      type: 'historyEntryCleared',
      id: 'scan-1',
    });
  });

  it('falls back overview state to next history entry after removal', async () => {
    showWarningMessage.mockResolvedValue('Clear');
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

    await (harness.provider as any).confirmClearHistoryEntry('scan-2');

    expect(harness.state.history).toEqual([older]);
    expect(harness.state.cache).toEqual(older.summary);
    expect(harness.postMessage).toHaveBeenCalledWith({
      type: 'scanResult',
      data: older.summary,
    });
  });
});
