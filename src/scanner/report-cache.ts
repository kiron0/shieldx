import * as fs from 'fs';
import * as path from 'path';

import { ExtensionSecurityReport } from '../types';
import { InstalledExtension } from '../utils/extension-utils';

const CACHE_VERSION = 4;

type CacheFile = {
  version: number;
  entries: Record<string, ExtensionSecurityReport>;
};

export type ReportCache = {
  /** Returns a cached report when the extension did not change. */
  get(
    fingerprint: string,
    ext: InstalledExtension,
  ): ExtensionSecurityReport | undefined;
  set(
    fingerprint: string,
    ext: InstalledExtension,
    report: ExtensionSecurityReport,
  ): void;
  readonly size: number;
  save(): void;
};

/**
 * Identity of an installed extension: id, version and the modification time of
 * the manifest, so a reinstalled or repackaged extension is rescanned.
 */
export function extensionCacheKey(ext: InstalledExtension): string {
  let manifestMtime = 0;
  try {
    manifestMtime = Math.floor(
      fs.statSync(path.join(ext.installPath, 'package.json')).mtimeMs,
    );
  } catch {
    manifestMtime = 0;
  }
  return `${ext.id}@${ext.version}:${manifestMtime}`;
}

export function createEmptyReportCache(): ReportCache {
  return createReportCache(new Map<string, ExtensionSecurityReport>());
}

export function createReportCache(
  entries: Map<string, ExtensionSecurityReport>,
): ReportCache {
  let dirty = false;

  return {
    get(fingerprint, ext) {
      if (!fingerprint) return undefined;
      return entries.get(`${fingerprint}|${extensionCacheKey(ext)}`);
    },
    set(fingerprint, ext, report) {
      if (!fingerprint) return;
      // The icon is a base64 blob; it would dominate the cache file size and
      // is re-read from disk on demand anyway.
      const { iconDataUrl: _icon, ...rest } = report;
      entries.set(`${fingerprint}|${extensionCacheKey(ext)}`, {
        ...rest,
        iconDataUrl: undefined,
      } as ExtensionSecurityReport);
      dirty = true;
    },
    get size() {
      return entries.size;
    },
    save() {
      if (!dirty) return;
      dirty = false;
    },
  };
}

/**
 * Loads a report cache from disk. A missing or unreadable cache is not an
 * error: the scan simply runs without cache entries.
 */
export function loadReportCache(cachePath?: string): {
  cache: ReportCache;
  save: () => void;
} {
  const entries = new Map<string, ExtensionSecurityReport>();

  if (cachePath) {
    try {
      const raw = fs.readFileSync(cachePath, 'utf8');
      const parsed = JSON.parse(raw) as CacheFile;
      if (parsed?.version === CACHE_VERSION && parsed.entries) {
        for (const [key, report] of Object.entries(parsed.entries)) {
          entries.set(key, report);
        }
      }
    } catch {
      // No usable cache file.
    }
  }

  const cache = createReportCache(entries);

  return {
    cache,
    save: () => {
      if (!cachePath) return;
      try {
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        const payload: CacheFile = {
          version: CACHE_VERSION,
          entries: Object.fromEntries(entries),
        };
        fs.writeFileSync(cachePath, JSON.stringify(payload), 'utf8');
      } catch {
        // Cache writes are best effort.
      }
    },
  };
}
