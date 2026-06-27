import * as vscode from 'vscode';
import { info } from '../utils/logger';
import { RiskFactor } from '../types';
import { throwIfCancelled } from '../utils/cancellation';
import { postJson } from '../utils/http-client';

interface OsvQueryResponse {
  results?: Array<{
    id: string;
    summary?: string;
    details?: string;
    severity?: Array<{ type: string; score: string }>;
  }>;
}

const cache = new Map<string, RiskFactor[]>();

export async function queryOsvVulnerabilities(
  deps: Array<{ name: string; version: string }>,
  token?: vscode.CancellationToken,
): Promise<RiskFactor[]> {
  const allFactors: RiskFactor[] = [];
  if (!deps || deps.length === 0) return allFactors;

  const batchSize = 5;
  for (let i = 0; i < deps.length; i += batchSize) {
    throwIfCancelled(token);
    const batch = deps.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((dep) => querySingleDep(dep, token)),
    );
    for (const factors of results) allFactors.push(...factors);
  }

  if (allFactors.length > 0) {
    info(`OSV: Found ${allFactors.length} known vulnerabilities`);
  }

  return allFactors;
}

async function querySingleDep(
  dep: { name: string; version: string },
  token?: vscode.CancellationToken,
): Promise<RiskFactor[]> {
  const cacheKey = `${dep.name}@${dep.version}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;
  if (!/^\d+\.\d+/.test(dep.version)) return [];

  try {
    throwIfCancelled(token);
    const resp = await postJson<OsvQueryResponse>(
      'https://api.osv.dev/v1/query',
      { package: { name: dep.name, ecosystem: 'npm' }, version: dep.version },
      { timeout: 3000, token },
    );
    const vulns = resp?.results || [];
    const factors = vulns.map((vuln) => {
      const sev = getSeverity(vuln);
      const points =
        sev === 'critical'
          ? 25
          : sev === 'high'
            ? 15
            : sev === 'medium'
              ? 8
              : 3;
      return {
        id: `osv-${vuln.id}`,
        title: `Known vulnerability: ${vuln.id}`,
        description: (vuln.summary || vuln.details || 'No description').slice(
          0,
          200,
        ),
        severity: sev as 'low' | 'medium' | 'high' | 'critical',
        points,
        evidence: [`${dep.name}@${dep.version}`, `OSV: ${vuln.id}`],
      } as RiskFactor;
    });
    cache.set(cacheKey, factors);
    return factors;
  } catch {
    return [];
  }
}

function getSeverity(vuln: {
  severity?: Array<{ type: string; score: string }>;
}): string {
  if (vuln.severity && vuln.severity.length > 0) {
    for (const s of vuln.severity) {
      if (s.type === 'CVSS_V3' || s.type === 'CVSS') {
        const score = parseFloat(s.score);
        if (score >= 9) return 'critical';
        if (score >= 7) return 'high';
        if (score >= 4) return 'medium';
        return 'low';
      }
    }
  }
  return 'medium';
}
