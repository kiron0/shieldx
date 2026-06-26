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

const KNOWN_VULNERABLE_DEPS: KnownVulnerability[] = [
  {
    name: 'lodash',
    versionRange: '<4.17.21',
    severity: 'high',
    description:
      'Prototype pollution vulnerability in lodash versions before 4.17.21.',
  },
  {
    name: 'minimist',
    versionRange: '<1.2.6',
    severity: 'high',
    description: 'Prototype pollution in minimist versions before 1.2.6.',
  },
  {
    name: 'node-fetch',
    versionRange: '<2.6.7',
    severity: 'high',
    description: 'SSRF vulnerability in node-fetch versions before 2.6.7.',
  },
  {
    name: 'axios',
    versionRange: '<0.21.2',
    severity: 'high',
    description: 'SSRF vulnerability in axios versions before 0.21.2.',
  },
  {
    name: 'glob-parent',
    versionRange: '<5.1.2',
    severity: 'high',
    description: 'Regular expression denial of service in glob-parent.',
  },
  {
    name: 'semver',
    versionRange: '<7.5.2',
    severity: 'medium',
    description: 'Regular expression denial of service in semver.',
  },
  {
    name: 'tar',
    versionRange: '<6.1.9',
    severity: 'high',
    description: 'Arbitrary file creation/overwrite in tar.',
  },
  {
    name: 'json5',
    versionRange: '<2.2.2',
    severity: 'high',
    description: 'Prototype pollution in JSON5 before 2.2.2.',
  },
  {
    name: 'tough-cookie',
    versionRange: '<4.1.3',
    severity: 'high',
    description: 'Prototype pollution in tough-cookie before 4.1.3.',
  },
  {
    name: 'word-wrap',
    versionRange: '<1.2.4',
    severity: 'medium',
    description: 'ReDoS vulnerability in word-wrap before 1.2.4.',
  },
];

export function analyzeDependencies(
  extDir: string,
  deps: ExtensionDependency[],
): { riskFactors: RiskFactor[]; trustSignals: TrustSignal[] } {
  const riskFactors: RiskFactor[] = [];
  const trustSignals: TrustSignal[] = [];

  // Check for vulnerable dependencies
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

  // Check for lock file presence
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

  // Parse yarn.lock for transitive dependencies
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

  // Parse pnpm-lock.yaml for transitive dependencies
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

  // Check for native modules (node-gyp, .node files)
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

/**
 * Parse yarn.lock v1 format to count resolved packages.
 */
function parseYarnLock(lockPath: string): number {
  try {
    const content = readFileContent(lockPath);
    if (!content) return 0;

    // Yarn v1 entries end with a newline and contain version: "x.y.z"
    const matches = content.match(/^"(.+?)@[^"]+",?\s*$/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Parse pnpm-lock.yaml to count resolved packages.
 * Looks for "specifier:" patterns in the importers section.
 */
function parsePnpmLock(lockPath: string): number {
  try {
    const content = readFileContent(lockPath);
    if (!content) return 0;

    // pnpm-lock has "resolution:" entries for each resolved package
    const matches = content.match(/^\s{2,4}\S.*?:\n\s+resolution:\s+\{.+\}/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Check for native .node binaries in the extension directory.
 */
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
    // skip
  }
  return false;
}
