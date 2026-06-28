import * as path from 'path';
import { ExtensionDependency, RiskFactor, TrustSignal } from '../types';
import { fileExists } from '../utils/file-utils';
import {
  checkForNativeModules,
  getLockfileSignal,
  isVersionVulnerable,
  KNOWN_VULNERABLE_DEPS,
  parsePnpmLock,
  parseYarnLock,
} from '../utils/scanner-helpers';

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

  const lockFileType = getLockfileSignal(extDir);
  if (lockFileType) {
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
