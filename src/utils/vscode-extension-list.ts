import * as vscode from 'vscode';

import {
  buildInstalledExtension,
  InstalledExtension,
} from '../utils/extension-utils';

/**
 * Lists the extensions the running editor knows about. Editor specific, so it
 * lives outside the vscode-free scan core.
 */
export function getInstalledExtensions(): InstalledExtension[] {
  return vscode.extensions.all
    .filter((ext) => !ext.id.startsWith('vscode.'))
    .map((ext) =>
      buildInstalledExtension(ext.id, ext.extensionPath, ext.packageJSON || {}),
    );
}
