import * as vscode from 'vscode';
import { SecuritySummary } from '../types';
import { InstalledExtension } from '../utils/extension-utils';
import { EXT_CONFIG } from '../config';
import {
  DEFAULT_SCAN_CONCURRENCY,
  scanExtensionCore,
  scanExtensionsCore,
  type ScanCoreOptions,
} from './scan-core';

export type { ScanCoreOptions };

export interface ScanOptions {
  osvEnabled?: boolean;
  includeNodeModules?: boolean;
}

/**
 * Editor aware entry point. Reads the editor configuration once and delegates
 * to the editor agnostic scan core.
 */
export async function scanExtension(
  ext: InstalledExtension,
  token?: vscode.CancellationToken,
  options: ScanOptions = {},
): Promise<import('../types').ExtensionSecurityReport> {
  const config = vscode.workspace.getConfiguration(
    EXT_CONFIG.name.toLowerCase(),
  );

  return scanExtensionCore(ext, {
    token,
    osvEnabled:
      options.osvEnabled ?? config.get<boolean>('enableOsvScan', true),
    includeNodeModules:
      options.includeNodeModules ??
      config.get<boolean>('scanNodeModules', false),
    vscodeVersion: vscode.version,
  });
}

export async function scanAllExtensions(
  extensions: InstalledExtension[],
  onProgress?: (current: number, total: number, name: string) => void,
  token?: vscode.CancellationToken,
  options: ScanOptions = {},
): Promise<SecuritySummary> {
  const config = vscode.workspace.getConfiguration(
    EXT_CONFIG.name.toLowerCase(),
  );

  return scanExtensionsCore(extensions, {
    onProgress,
    token,
    concurrency: DEFAULT_SCAN_CONCURRENCY,
    osvEnabled:
      options.osvEnabled ?? config.get<boolean>('enableOsvScan', true),
    includeNodeModules:
      options.includeNodeModules ??
      config.get<boolean>('scanNodeModules', false),
    vscodeVersion: vscode.version,
  });
}
