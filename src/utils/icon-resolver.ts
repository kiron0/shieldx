import * as fs from 'fs';
import * as path from 'path';

import { ExtensionSecurityReport } from '../types';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const cache = new Map<string, string | undefined>();
const manifestCache = new Map<string, string | undefined>();

/**
 * Reads the icon path from the extension manifest. Used as a fallback for
 * reports that were stored before the icon path was part of the report.
 */
function readIconPathFromManifest(installPath: string): string | undefined {
  if (manifestCache.has(installPath)) {
    return manifestCache.get(installPath);
  }
  let iconPath: string | undefined;
  try {
    const raw = fs.readFileSync(path.join(installPath, 'package.json'), 'utf8');
    const manifest = JSON.parse(raw) as { icon?: unknown };
    if (typeof manifest.icon === 'string' && manifest.icon.trim()) {
      iconPath = manifest.icon;
    }
  } catch {
    iconPath = undefined;
  }
  manifestCache.set(installPath, iconPath);
  return iconPath;
}

function readIconFile(
  installPath: string,
  iconPath: string,
): string | undefined {
  const cacheKey = `${installPath}::${iconPath}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const fullPath = path.resolve(installPath, iconPath);
    const mime = MIME_BY_EXTENSION[path.extname(fullPath).toLowerCase()];
    if (!mime) {
      cache.set(cacheKey, undefined);
      return undefined;
    }
    const data = fs.readFileSync(fullPath);
    const dataUrl = `data:${mime};base64,${data.toString('base64')}`;
    cache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch {
    cache.set(cacheKey, undefined);
    return undefined;
  }
}

/**
 * Resolves the icon of an extension report.
 *
 * Reports that were persisted (scan cache, scan history) no longer carry the
 * base64 payload, but they keep the icon path. The file is read from disk on
 * demand and cached, so icons are shown everywhere without bloating the
 * stored state. Reports stored by an older version have no icon path at all,
 * so the manifest is used as a fallback.
 */
export function resolveIconDataUrl(
  report: Pick<
    ExtensionSecurityReport,
    'id' | 'iconDataUrl' | 'iconPath' | 'installPath'
  >,
): string | undefined {
  if (report.iconDataUrl) return report.iconDataUrl;
  if (!report.installPath) return undefined;

  const iconPath =
    report.iconPath ?? readIconPathFromManifest(report.installPath);
  if (!iconPath) return undefined;

  return readIconFile(report.installPath, iconPath);
}

/**
 * Returns a copy of the report with the icon payload filled in. Used before
 * generating an export so HTML and JSON reports contain the icons.
 */
export function withResolvedIcons<T extends ExtensionSecurityReport>(
  report: T,
): T {
  if (report.iconDataUrl) return report;
  const iconDataUrl = resolveIconDataUrl(report);
  if (!iconDataUrl) return report;
  return { ...report, iconDataUrl };
}

export function clearIconCache(): void {
  cache.clear();
  manifestCache.clear();
}
