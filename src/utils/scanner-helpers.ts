import * as fs from 'fs';
import * as path from 'path';
import { fileExists, readFileContent } from './file-utils';

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

export function hasLicenseMetadataOrFile(
  pkg: any,
  installPath?: string,
): boolean {
  if (hasDeclaredLicense(pkg)) return true;
  if (!installPath) return false;
  try {
    return fs.readdirSync(installPath).some((f) => {
      const u = f.toUpperCase();
      return (
        u.startsWith('LICENSE') ||
        u.startsWith('LICENCE') ||
        u.startsWith('COPYING') ||
        u === 'UNLICENSE'
      );
    });
  } catch {
    return false;
  }
}

export function isVersionVulnerable(version: string, range: string): boolean {
  const cleaned = version.replace(/^[\^~>=<]+/, '');
  const rangeCleaned = range.replace(/^[\^~>=<]+/, '');
  const vParts = cleaned.split('.').map(Number);
  const rParts = rangeCleaned.split('.').map(Number);

  for (let i = 0; i < Math.max(vParts.length, rParts.length); i++) {
    const v = vParts[i] || 0;
    const r = rParts[i] || 0;
    if (v < r) return true;
    if (v > r) return false;
  }
  return false;
}

export function getLockfileSignal(extDir: string): string | null {
  for (const name of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']) {
    if (fileExists(path.join(extDir, name))) return name;
  }
  return null;
}

export function parseYarnLock(lockPath: string): number {
  try {
    const content = readFileContent(lockPath);
    if (!content) return 0;
    const matches = content.match(/^"(.+?)@[^"]+",?\s*$/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

export function parsePnpmLock(lockPath: string): number {
  try {
    const content = readFileContent(lockPath);
    if (!content) return 0;
    const matches = content.match(/^\s{2,4}\S.*?:\n\s+resolution:\s+\{.+\}/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

export function checkForNativeModules(extDir: string): boolean {
  try {
    return walkForExtension(extDir, '.node', 0);
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

function walkForExtension(
  dir: string,
  targetExt: string,
  depth: number,
): boolean {
  if (depth > 5) return false;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (walkForExtension(fullPath, targetExt, depth + 1)) return true;
      } else if (entry.isFile() && entry.name.endsWith(targetExt)) {
        return true;
      }
    }
  } catch {
    void 0;
  }
  return false;
}
