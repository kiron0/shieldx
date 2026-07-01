import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { RiskFactor } from '../types';
import { fileExistsAsync } from '../utils/file-utils';
import { warn } from '../utils/logger';

const execFileAsync = promisify(execFile);

interface NpmAuditResult {
  vulnerabilities: Record<
    string,
    {
      name: string;
      severity: 'low' | 'moderate' | 'high' | 'critical';
      via: Array<string | { name: string; title?: string }>;
      range: string;
      fixAvailable?: boolean | { name: string; version: string };
      title?: string;
    }
  >;
  metadata: {
    vulnerabilities: Record<string, number>;
  };
}

export async function runNpmAudit(extDir: string): Promise<RiskFactor[]> {
  const lockFile = path.join(extDir, 'package-lock.json');
  if (!(await fileExistsAsync(lockFile))) return [];

  try {
    const { stdout } = await execFileAsync('npm', ['audit', '--json'], {
      cwd: extDir,
      timeout: 15000,
      encoding: 'utf-8',
    });

    const audit: NpmAuditResult = JSON.parse(stdout);
    return parseAuditResult(audit);
  } catch (err: any) {
    if (err.stdout) {
      try {
        const audit: NpmAuditResult = JSON.parse(err.stdout);
        return parseAuditResult(audit);
      } catch {
        void 0;
      }
    }
    if (err.stderr && err.stderr.includes('No lockfile')) {
      return [];
    }
    warn(`npm audit failed for ${extDir}: ${err.message?.slice(0, 100)}`);
    return [];
  }
}

function parseAuditResult(audit: NpmAuditResult): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const vulns = audit.vulnerabilities || {};

  for (const [name, vuln] of Object.entries(vulns)) {
    if (!vuln.severity) continue;

    const severity: 'low' | 'medium' | 'high' | 'critical' =
      vuln.severity === 'moderate' ? 'medium' : vuln.severity;

    const points =
      severity === 'critical'
        ? 25
        : severity === 'high'
          ? 15
          : severity === 'medium'
            ? 8
            : 3;
    const viaText =
      vuln.via
        ?.map((v) => (typeof v === 'string' ? v : v.name))
        .filter(Boolean)
        .slice(0, 3)
        .join(', ') || '';

    factors.push({
      id: `npm-audit-${name.replace(/[^a-zA-Z0-9]/g, '-')}`,
      title: `npm audit: ${name}`,
      description: `${vuln.title || viaText} (severity: ${vuln.severity}, range: ${vuln.range})`,
      severity: severity,
      points,
      evidence: [`npm audit: ${name}@${vuln.range || '?'}`],
    });
  }

  return factors;
}
