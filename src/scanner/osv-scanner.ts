/**
 * Optional OSV (Open Source Vulnerabilities) API integration.
 * Queries the OSV.dev API for known vulnerabilities in dependencies.
 */
import * as https from 'https';
import * as vscode from 'vscode';
import { info, warn } from '../utils/logger';
import { RiskFactor } from '../types';

interface OsvQueryRequest {
  package: { name: string; ecosystem: string };
  version: string;
}

interface OsvQueryResponse {
  results?: Array<{
    id: string;
    summary?: string;
    details?: string;
    severity?: Array<{ type: string; score: string }>;
    affected?: Array<{
      ranges: Array<{
        type: string;
        events: Array<{ introduced?: string; fixed?: string }>;
      }>;
    }>;
    references?: Array<{ url: string }>;
  }>;
}

const cache = new Map<string, RiskFactor[]>();

export async function queryOsvVulnerabilities(
  deps: Array<{ name: string; version: string }>,
  token?: vscode.CancellationToken,
): Promise<RiskFactor[]> {
  const allFactors: RiskFactor[] = [];

  if (!deps || deps.length === 0) return allFactors;

  // Process in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < deps.length; i += batchSize) {
    throwIfCancelled(token);
    const batch = deps.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((dep) => querySingleDep(dep, token)),
    );
    for (const factors of results) {
      allFactors.push(...factors);
    }
  }

  if (allFactors.length > 0) {
    info(`OSV: Found ${allFactors.length} known vulnerabilities`);
  }

  return allFactors;
}

async function querySingleDep(dep: {
  name: string;
  version: string;
}, token?: vscode.CancellationToken): Promise<RiskFactor[]> {
  const cacheKey = `${dep.name}@${dep.version}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  // Skip non-semver versions
  if (!/^\d+\.\d+/.test(dep.version)) return [];

  try {
    throwIfCancelled(token);
    const vulnerabilities = (await callOsvApi(dep.name, dep.version, token)) || [];
    const factors = vulnerabilities.map((vuln) => {
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

function callOsvApi(
  name: string,
  version: string,
  token?: vscode.CancellationToken,
): Promise<OsvQueryResponse['results']> {
  return new Promise((resolve) => {
    if (token?.isCancellationRequested) {
      resolve([]);
      return;
    }

    let settled = false;
    const finish = (value: OsvQueryResponse['results']) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cancelDisposable?.dispose();
      resolve(value);
    };
    const timeout = setTimeout(() => {
      warn(`OSV API timeout for ${name}@${version}`);
      finish([]);
    }, 3000);

    const body = JSON.stringify({
      package: { name, ecosystem: 'npm' },
      version,
    } as OsvQueryRequest);

    const req = https.request(
      'https://api.osv.dev/v1/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as OsvQueryResponse;
            finish(parsed.results || []);
          } catch {
            finish([]);
          }
        });
      },
    );

    req.on('error', () => {
      finish([]);
    });

    const cancelDisposable = token?.onCancellationRequested(() => {
      req.destroy();
      finish([]);
    });

    req.write(body);
    req.end();
  });
}

function throwIfCancelled(token?: vscode.CancellationToken): void {
  if (token?.isCancellationRequested) {
    throw new vscode.CancellationError();
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
