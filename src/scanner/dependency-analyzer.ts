import * as path from 'path';
import { ExtensionDependency, RiskFactor, TrustSignal } from '../types';
import {
  checkForNativeModulesAsync,
  isVersionVulnerable,
  KNOWN_VULNERABLE_DEPS,
  parsePnpmLockAsync,
  parseYarnLockAsync,
} from '../utils/scanner-helpers';
import { fileExistsAsync } from '../utils/file-utils';

const KNOWN_VULN_BY_NAME = new Map(
  KNOWN_VULNERABLE_DEPS.map((vuln) => [vuln.name, vuln]),
);

export async function analyzeDependencies(
  extDir: string,
  deps: ExtensionDependency[],
): Promise<{ riskFactors: RiskFactor[]; trustSignals: TrustSignal[] }> {
  const riskFactors: RiskFactor[] = [];
  const trustSignals: TrustSignal[] = [];

  // devDependencies are not shipped with the extension, so a vulnerable dev
  // dependency is not a runtime risk for the user.
  for (const dep of deps) {
    if (dep.isDev) continue;
    const vuln = KNOWN_VULN_BY_NAME.get(dep.name);
    if (!vuln) continue;
    if (!isVersionVulnerable(dep.version, vuln.versionRange)) continue;

    riskFactors.push({
      id: `vuln-${dep.name}`,
      title: `Vulnerable dependency: ${dep.name}`,
      description: `${vuln.description} (installed: ${dep.version}, fixed: ${vuln.versionRange})`,
      severity: vuln.severity,
      points:
        vuln.severity === 'critical' ? 25 : vuln.severity === 'high' ? 15 : 8,
      evidence: [`${dep.name}@${dep.version}`],
    });
  }

  const [hasPackageLock, hasYarnLock, hasPnpmLock] = await Promise.all([
    fileExistsAsync(path.join(extDir, 'package-lock.json')),
    fileExistsAsync(path.join(extDir, 'yarn.lock')),
    fileExistsAsync(path.join(extDir, 'pnpm-lock.yaml')),
  ]);

  const lockFiles = [
    hasPackageLock ? 'package-lock.json' : undefined,
    hasYarnLock ? 'yarn.lock' : undefined,
    hasPnpmLock ? 'pnpm-lock.yaml' : undefined,
  ].filter((value): value is string => !!value);

  if (lockFiles.length > 0) {
    trustSignals.push({
      id: 'has-lock-file',
      title: 'Has lock file',
      description: `Extension has a ${lockFiles.join(', ')} for reproducible builds.`,
      points: -3,
    });
  }

  if (hasYarnLock) {
    const yarnDeps = await parseYarnLockAsync(path.join(extDir, 'yarn.lock'));
    if (yarnDeps > 0) {
      trustSignals.push({
        id: 'yarn-lock-parsed',
        title: 'Yarn lock file parsed',
        description: `Parsed ${yarnDeps} resolved packages from yarn.lock.`,
        points: -2,
      });
    }
  }

  if (hasPnpmLock) {
    const pnpmDeps = await parsePnpmLockAsync(
      path.join(extDir, 'pnpm-lock.yaml'),
    );
    if (pnpmDeps > 0) {
      trustSignals.push({
        id: 'pnpm-lock-parsed',
        title: 'pnpm lock file parsed',
        description: `Parsed ${pnpmDeps} resolved packages from pnpm-lock.yaml.`,
        points: -2,
      });
    }
  }

  const hasNativeModules = await checkForNativeModulesAsync(extDir);
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
