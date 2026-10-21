import * as vscode from 'vscode';
import { info } from '../utils/logger';
import { RiskFactor } from '../types';
import { throwIfCancelled } from '../utils/cancellation';
import { postJson } from '../utils/http-client';

interface OsvVulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity?: Array<{ type: string; score: string }>;
}

interface OsvBatchResponse {
  results?: Array<{ vulns?: OsvVulnerability[] }>;
}

interface OsvQueryResponse {
  results?: OsvVulnerability[];
}

const OSV_API_URL = 'https://api.osv.dev/v1';
const MAX_BATCH_SIZE = 100;

const cache = new Map<string, RiskFactor[]>();

export async function queryOsvVulnerabilities(
  deps: Array<{ name: string; version: string }>,
  token?: vscode.CancellationToken,
): Promise<RiskFactor[]> {
  const allFactors: RiskFactor[] = [];
  if (!deps || deps.length === 0) return allFactors;

  const pending: Array<{
    name: string;
    version: string;
    resolved: string;
  }> = [];
  for (const dep of deps) {
    throwIfCancelled(token);
    const cacheKey = `${dep.name}@${dep.version}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      allFactors.push(...cached);
      continue;
    }
    const resolved = normalizeVersion(dep.version);
    if (!resolved) continue;
    pending.push({ name: dep.name, version: dep.version, resolved });
  }

  if (pending.length === 0) {
    return allFactors;
  }

  for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
    throwIfCancelled(token);
    const batch = pending.slice(i, i + MAX_BATCH_SIZE);
    const batchFactors = await queryBatch(batch, token);
    if (batchFactors) {
      for (const { dep, factors } of batchFactors) {
        cache.set(`${dep.name}@${dep.version}`, factors);
        allFactors.push(...factors);
      }
      continue;
    }

    // Batch endpoint unavailable: fall back to one request per dependency.
    const results = await Promise.all(
      batch.map(async (dep) => ({
        dep,
        factors: await querySingleDep(dep, token),
      })),
    );
    for (const { dep, factors } of results) {
      cache.set(`${dep.name}@${dep.version}`, factors);
      allFactors.push(...factors);
    }
  }

  if (allFactors.length > 0) {
    info(`OSV: Found ${allFactors.length} known vulnerabilities`);
  }

  return allFactors;
}

/**
 * Normalizes a declared dependency range into the concrete version used for
 * lookups. Package manifests usually declare ranges (`^4.17.21`), which would
 * otherwise be skipped by the version check.
 */
export function normalizeVersion(version: string): string | null {
  if (!version) return null;
  const cleaned = version.trim().replace(/^[\^~>=<\s]+/, '').trim();
  if (!cleaned) return null;
  if (!/^\d+(\.\d+)*([-+.][\w.-]+)?$/.test(cleaned)) return null;
  return cleaned;
}

async function queryBatch(
  deps: Array<{ name: string; version: string; resolved: string }>,
  token?: vscode.CancellationToken,
): Promise<
  Array<{
    dep: { name: string; version: string };
    factors: RiskFactor[];
  }> | null
> {
  throwIfCancelled(token);

  const queries = deps.map((dep) => ({
    package: { name: dep.name, ecosystem: 'npm' },
    version: dep.resolved,
  }));

  const resp = await postJson<OsvBatchResponse>(
    `${OSV_API_URL}/querybatch`,
    { queries },
    { timeout: 5000, token },
  );

  if (!resp || !Array.isArray(resp.results)) return null;

  return deps.map((dep, index) => {
    const vulns = resp.results?.[index]?.vulns ?? [];
    return {
      dep: { name: dep.name, version: dep.version },
      factors: vulns.map((vuln) => toRiskFactor(vuln, dep)),
    };
  });
}

async function querySingleDep(
  dep: { name: string; version: string; resolved: string },
  token?: vscode.CancellationToken,
): Promise<RiskFactor[]> {
  try {
    throwIfCancelled(token);
    const resp = await postJson<OsvQueryResponse>(
      `${OSV_API_URL}/query`,
      {
        package: { name: dep.name, ecosystem: 'npm' },
        version: dep.resolved,
      },
      { timeout: 3000, token },
    );
    const vulns = resp?.results || [];
    return vulns.map((vuln) => toRiskFactor(vuln, dep));
  } catch {
    return [];
  }
}

function toRiskFactor(
  vuln: OsvVulnerability,
  dep: { name: string; version: string },
): RiskFactor {
  const sev = getSeverity(vuln);
  const points =
    sev === 'critical' ? 25 : sev === 'high' ? 15 : sev === 'medium' ? 8 : 3;
  return {
    id: `osv-${vuln.id}`,
    title: `Known vulnerability: ${vuln.id}`,
    description: (vuln.summary || vuln.details || 'No description').slice(0, 200),
    severity: sev as 'low' | 'medium' | 'high' | 'critical',
    points,
    evidence: [`${dep.name}@${dep.version}`, `OSV: ${vuln.id}`],
  };
}

function getSeverity(vuln: OsvVulnerability): string {
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
