import * as vscode from 'vscode';

import { SecuritySummary } from '../types';
import { EXT_CONFIG } from '../config';

export const CACHE_KEY = `${EXT_CONFIG.name.toLowerCase()}.lastScan`;

/**
 * Bumped whenever the stored shape or the scoring model changes. Stored
 * results of an older version are ignored instead of being shown with wrong
 * risk levels.
 */
export const CACHE_VERSION = 3;

export type StoredScanState = {
  version: number;
  summary: SecuritySummary;
};

export function readScanState(
  context: vscode.ExtensionContext,
): SecuritySummary | undefined {
  const stored = context.globalState.get<StoredScanState>(CACHE_KEY);
  if (!stored) return undefined;
  if (typeof stored !== 'object' || !('summary' in stored)) {
    // Legacy payload: a bare summary without version information.
    return undefined;
  }
  if (stored.version !== CACHE_VERSION) return undefined;
  return stored.summary;
}

export async function writeScanState(
  context: vscode.ExtensionContext,
  summary: SecuritySummary | undefined,
): Promise<void> {
  if (!summary) {
    await context.globalState.update(CACHE_KEY, undefined);
    return;
  }
  const state: StoredScanState = { version: CACHE_VERSION, summary };
  await context.globalState.update(CACHE_KEY, state);
}
