import * as fs from 'fs';
import * as path from 'path';
import { ExtensionDependency, RiskFactor, TrustSignal } from '../types';
import { fileExists, readFileContent } from '../utils/file-utils';

interface KnownVulnerability {
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

const KNOWN_VULNERABLE_DEPS: KnownVulnerability[] = VULN_DATA.map(
  ([name, versionRange, severity, description]) => ({
    name,
    versionRange,
    severity,
    description,
  }),
);

export function analyzeDependencies(
  extDir: string,
  deps: ExtensionDependency[],
): { riskFactors: RiskFactor[]; trustSignals: TrustSignal[] } {
  const riskFactors: RiskFactor[] = [];
  const trustSignals: TrustSignal[] = [];

  for (const dep of deps) {
    for (const vuln of KNOWN_VULNERABLE_DEPS) {
      if (dep.name === vuln.name) {
        if (isVersionVulnerable(dep.version, vuln.versionRange)) {
          riskFactors.push({
            id: `vuln-${dep.name}`,
            title: `Vulnerable dependency: ${dep.name}`,
            description: `${vuln.description} (installed: ${dep.version}, fixed: ${vuln.versionRange})`,
            severity: vuln.severity,
            points:
              vuln.severity === 'critical'
                ? 25
                : vuln.severity === 'high'
                  ? 15
                  : 8,
            evidence: [`${dep.name}@${dep.version}`],
          });
          break;
        }
      }
    }
  }

  const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  let lockFileType: string | null = null;
  let hasLockFile = false;
  for (const lf of lockFiles) {
    if (fileExists(path.join(extDir, lf))) {
      hasLockFile = true;
      lockFileType = lf;
      break;
    }
  }

  if (hasLockFile) {
    trustSignals.push({
      id: 'has-lock-file',
      title: 'Has lock file',
      description: `Extension has a ${lockFileType} for reproducible builds.`,
      points: -3,
    });
  }

  const yarnLockPath = path.join(extDir, 'yarn.lock');
  if (fileExists(yarnLockPath)) {
    const yarnDeps = parseYarnLock(yarnLockPath);
    if (yarnDeps > 0) {
      trustSignals.push({
        id: 'yarn-lock-parsed',
        title: 'Yarn lock file parsed',
        description: `Parsed ${yarnDeps} resolved packages from yarn.lock.`,
        points: -2,
      });
    }
  }

  const pnpmLockPath = path.join(extDir, 'pnpm-lock.yaml');
  if (fileExists(pnpmLockPath)) {
    const pnpmDeps = parsePnpmLock(pnpmLockPath);
    if (pnpmDeps > 0) {
      trustSignals.push({
        id: 'pnpm-lock-parsed',
        title: 'pnpm lock file parsed',
        description: `Parsed ${pnpmDeps} resolved packages from pnpm-lock.yaml.`,
        points: -2,
      });
    }
  }

  const hasNativeModules = checkForNativeModules(extDir);
  if (hasNativeModules) {
    riskFactors.push({
      id: 'native-modules',
      title: 'Native modules detected',
      description:
        'Extension contains native Node.js modules (.node files or node-gyp build), which can execute arbitrary code.',
      severity: 'medium',
      points: 12,
      evidence: ['Native .node binaries found'],
    });
  }

  return { riskFactors, trustSignals };
}

function isVersionVulnerable(version: string, range: string): boolean {
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

function parseYarnLock(lockPath: string): number {
  try {
    const content = readFileContent(lockPath);
    if (!content) return 0;

    const matches = content.match(/^"(.+?)@[^"]+",?\s*$/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

function parsePnpmLock(lockPath: string): number {
  try {
    const content = readFileContent(lockPath);
    if (!content) return 0;

    const matches = content.match(/^\s{2,4}\S.*?:\n\s+resolution:\s+\{.+\}/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

function checkForNativeModules(extDir: string): boolean {
  try {
    return walkForExtension(extDir, '.node', 0);
  } catch {
    return false;
  }
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
      if (entry.name === 'node_modules') continue;
      if (entry.name.startsWith('.')) continue;
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
