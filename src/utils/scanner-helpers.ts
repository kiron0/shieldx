import * as fs from 'fs';
import * as path from 'path';
import { readFileContentAsync } from './file-utils';

export interface KnownVulnerability {
  name: string;
  versionRange: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

type VulnTuple = [
  string,
  string,
  'low' | 'medium' | 'high' | 'critical',
  string,
];

const VULN_DATA: VulnTuple[] = [
  [
    'lodash',
    '<4.17.21',
    'high',
    'Prototype pollution vulnerability in lodash versions before 4.17.21.',
  ],
  [
    'minimist',
    '<1.2.6',
    'high',
    'Prototype pollution in minimist versions before 1.2.6.',
  ],
  [
    'node-fetch',
    '<2.6.7',
    'high',
    'SSRF vulnerability in node-fetch versions before 2.6.7.',
  ],
  [
    'axios',
    '<0.21.2',
    'high',
    'SSRF vulnerability in axios versions before 0.21.2.',
  ],
  [
    'glob-parent',
    '<5.1.2',
    'high',
    'Regular expression denial of service in glob-parent.',
  ],
  [
    'semver',
    '<7.5.2',
    'medium',
    'Regular expression denial of service in semver.',
  ],
  ['tar', '<6.1.9', 'high', 'Arbitrary file creation/overwrite in tar.'],
  ['json5', '<2.2.2', 'high', 'Prototype pollution in JSON5 before 2.2.2.'],
  [
    'tough-cookie',
    '<4.1.3',
    'high',
    'Prototype pollution in tough-cookie before 4.1.3.',
  ],
  [
    'word-wrap',
    '<1.2.4',
    'medium',
    'ReDoS vulnerability in word-wrap before 1.2.4.',
  ],
];

export const KNOWN_VULNERABLE_DEPS: KnownVulnerability[] = VULN_DATA.map(
  ([name, versionRange, severity, description]) => ({
    name,
    versionRange,
    severity,
    description,
  }),
);

const MAX_LOCKFILE_BYTES = 8 * 1024 * 1024;

export async function hasLicenseMetadataOrFileAsync(
  pkg: any,
  installPath?: string,
): Promise<boolean> {
  if (hasDeclaredLicense(pkg)) return true;
  if (!installPath) return false;
  try {
    const entries = await fs.promises.readdir(installPath);
    return entries.some(isLicenseFile);
  } catch {
    return false;
  }
}

function isLicenseFile(fileName: string): boolean {
  const u = fileName.toUpperCase();
  return (
    u.startsWith('LICENSE') ||
    u.startsWith('LICENCE') ||
    u.startsWith('COPYING') ||
    u === 'UNLICENSE'
  );
}

export async function parseYarnLockAsync(lockPath: string): Promise<number> {
  try {
    const content = await readLockfileContent(lockPath);
    if (!content) return 0;
    const matches = content.match(/^"(.+?)@[^"]+",?\s*$/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

export async function parsePnpmLockAsync(lockPath: string): Promise<number> {
  try {
    const content = await readLockfileContent(lockPath);
    if (!content) return 0;
    const matches = content.match(/^\s{2,4}\S.*?:\n\s+resolution:\s+\{.+\}/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

async function readLockfileContent(lockPath: string): Promise<string | null> {
  const stat = await fs.promises.stat(lockPath).catch(() => null);
  if (!stat || !stat.isFile()) return null;
  if (stat.size > MAX_LOCKFILE_BYTES) return null;
  return readFileContentAsync(lockPath);
}

export async function checkForNativeModulesAsync(
  extDir: string,
): Promise<boolean> {
  try {
    return await walkForExtensionAsync(extDir, '.node', 0);
  } catch {
    return false;
  }
}

function hasDeclaredLicense(pkg: any): boolean {
  const lic = pkg?.license || pkg?.licenses;
  if (!lic) return false;
  const check = (l: any) =>
    typeof l === 'string'
      ? !!l.trim()
      : typeof l?.type === 'string' && !!l.type.trim();
  return Array.isArray(lic) ? lic.some(check) : check(lic);
}

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

export function parseVersion(version: string): ParsedVersion | null {
  const cleaned = String(version || '')
    .trim()
    .replace(/^[\^~>=<\s]+/, '')
    .trim();
  if (!cleaned) return null;

  const match = cleaned.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(.*)$/);
  if (!match) return null;

  const prereleaseRaw = match[4] || '';
  // Wildcard ranges ("1.x", "*") do not describe a concrete version.
  if (/[xX*]/.test(prereleaseRaw)) return null;

  const prerelease = prereleaseRaw
    .replace(/^[-+]/, '')
    .split('.')
    .filter(Boolean);

  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
    prerelease,
  };
}

export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // A prerelease is older than the matching release (1.0.0-rc.1 < 1.0.0).
  if (a.prerelease.length === 0 && b.prerelease.length > 0) return 1;
  if (a.prerelease.length > 0 && b.prerelease.length === 0) return -1;

  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i++) {
    const left = a.prerelease[i];
    const right = b.prerelease[i];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const leftNum = /^\d+$/.test(left) ? Number(left) : null;
    const rightNum = /^\d+$/.test(right) ? Number(right) : null;
    if (leftNum !== null && rightNum !== null) {
      if (leftNum !== rightNum) return leftNum - rightNum;
      continue;
    }
    if (left !== right) return left < right ? -1 : 1;
  }

  return 0;
}

/**
 * Compares an installed version against a "<fixedVersion" range.
 * Returns true when the installed version is older than the fixed version.
 */
export function isVersionVulnerable(version: string, range: string): boolean {
  const installed = parseVersion(version);
  const threshold = parseVersion(range);
  if (!installed || !threshold) return false;
  return compareVersions(installed, threshold) < 0;
}

async function walkForExtensionAsync(
  dir: string,
  targetExt: string,
  depth: number,
): Promise<boolean> {
  if (depth > 5) return false;
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (await walkForExtensionAsync(fullPath, targetExt, depth + 1)) {
          return true;
        }
      } else if (entry.isFile() && entry.name.endsWith(targetExt)) {
        return true;
      }
    }
  } catch {
    void 0;
  }
  return false;
}
