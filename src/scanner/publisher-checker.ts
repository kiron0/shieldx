import * as vscode from 'vscode';
import { RiskFactor, TrustSignal } from '../types';
import { InstalledExtension } from '../utils/extension-utils';
import { formatDateStamp } from '../utils/date-format';
import { info } from '../utils/logger';
import { throwIfCancelled } from '../utils/cancellation';
import { fetchJson } from '../utils/http-client';
import { EXT_CONFIG } from '../config';

interface NpmRegistryResponse {
  name: string;
  maintainers?: Array<{ name: string; email?: string }>;
  time?: Record<string, string>;
  versions?: Record<string, { version: string }>;
  description?: string;
  repository?: { url?: string; type?: string };
  bugs?: { url?: string };
  homepage?: string;
}

interface NpmDownloadsResponse {
  downloads: number;
  package?: string;
}

interface GithubRepoInfo {
  stargazers_count?: number;
  open_issues_count?: number;
  forks_count?: number;
  updated_at?: string;
  pushed_at?: string;
  owner?: { login?: string };
}

const registryCache = new Map<string, NpmRegistryResponse | null>();
const downloadCache = new Map<string, NpmDownloadsResponse | null>();
const githubCache = new Map<string, GithubRepoInfo | null>();

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_MONTH = MS_PER_DAY * 30;

function monthsAgo(date: Date): number {
  return (Date.now() - date.getTime()) / MS_PER_MONTH;
}

function daysAgo(date: Date): number {
  return (Date.now() - date.getTime()) / MS_PER_DAY;
}

export async function checkPublisherReputation(
  ext: InstalledExtension,
  token?: vscode.CancellationToken,
): Promise<{ trustSignals: TrustSignal[]; riskFactors: RiskFactor[] }> {
  const trustSignals: TrustSignal[] = [];
  const riskFactors: RiskFactor[] = [];

  const pkgName = ext.packageJSON?.name;
  if (!pkgName) return { trustSignals, riskFactors };

  try {
    throwIfCancelled(token);
    const npmData = await fetchJson<NpmRegistryResponse>(
      `https://registry.npmjs.org/${encodeURIComponent(pkgName)}`,
      registryCache,
      pkgName,
      { token },
    );

    if (npmData) {
      if ((npmData.maintainers || []).length > 0) {
        trustSignals.push({
          id: 'npm-publisher-verified',
          title: 'Publisher verified on npm',
          description: `Publisher "${ext.publisher}" has a verified npm account.`,
          points: -5,
        });
      }

      if (npmData.time?.[pkgName]) {
        const lastUpdated = new Date(npmData.time[pkgName]);
        const months = monthsAgo(lastUpdated);

        if (months > 24) {
          riskFactors.push({
            id: 'not-updated-for-years',
            title: 'Extension not updated for years',
            description: `Last npm update was ${Math.floor(months)} months ago. Abandoned extension is a security risk.`,
            severity: 'low',
            points: 5,
            evidence: [`Last updated: ${formatDateStamp(lastUpdated)}`],
          });
        } else if (months < 1) {
          trustSignals.push({
            id: 'recently-updated',
            title: 'Recently updated',
            description: `Updated within the last ${Math.max(1, Math.floor(months * 30))} days.`,
            points: -5,
          });
        }
      }

      const versionList = npmData.versions
        ? Object.keys(npmData.versions).sort(semverSort)
        : [];
      const versionCount = versionList.length;
      if (versionCount > 50) {
        trustSignals.push({
          id: 'long-maintenance',
          title: 'Long-term maintenance history',
          description: `${versionCount} versions published on npm, indicating sustained development.`,
          points: -5,
        });
      }

      if (npmData.time?.created) {
        const created = new Date(npmData.time.created);
        const days = daysAgo(created);

        if (days < 30) {
          riskFactors.push({
            id: 'recently-published',
            title: 'Recently published',
            description: `Published only ${Math.floor(days)} days ago. Less established.`,
            severity: 'low',
            points: 5,
            evidence: [`Created: ${formatDateStamp(created)}`],
          });
        }
      }

      throwIfCancelled(token);
      const dlData = await fetchJson<NpmDownloadsResponse>(
        `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkgName)}`,
        downloadCache,
        pkgName,
        { timeout: 3000, token },
      );
      const downloads = dlData?.downloads ?? null;
      if (downloads !== null) {
        if (downloads > 1000000) {
          trustSignals.push({
            id: 'high-install-count',
            title: 'High install count',
            description: `Over ${(downloads / 1000000).toFixed(1)}M downloads. Widely used.`,
            points: -5,
          });
        } else if (downloads < 1000) {
          riskFactors.push({
            id: 'low-install-count',
            title: 'Low install count',
            description: `Only ${downloads} npm downloads. Rarely used extension may have less community scrutiny.`,
            severity: 'low',
            points: 5,
            evidence: [`${downloads} downloads`],
          });
        }
      }

      const repoUrl = extractGithubRepo(npmData);
      if (repoUrl) {
        throwIfCancelled(token);
        const gh = await fetchJson<GithubRepoInfo>(
          `https://api.github.com/repos/${repoUrl}`,
          githubCache,
          repoUrl,
          {
            timeout: 3000,
            token,
            headers: {
              'User-Agent': `${EXT_CONFIG.name}-VSCode-Extension`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        );
        if (gh) {
          if (gh.open_issues_count !== undefined) {
            if (gh.open_issues_count > 100) {
              riskFactors.push({
                id: 'many-open-issues',
                title: 'Many open issues',
                description: `${gh.open_issues_count} open issues on GitHub. Could indicate maintenance issues.`,
                severity: 'low',
                points: 3,
                evidence: [`${gh.open_issues_count} open issues`],
              });
            } else if (gh.open_issues_count < 10) {
              trustSignals.push({
                id: 'few-open-issues',
                title: 'Low open issue count',
                description: `Only ${gh.open_issues_count} open issues on GitHub. Good maintenance indicator.`,
                points: -3,
              });
            }
          }

          if (gh.pushed_at) {
            const lastPush = new Date(gh.pushed_at);
            const months = monthsAgo(lastPush);
            if (months < 3) {
              trustSignals.push({
                id: 'active-repo',
                title: 'Active repository',
                description: `GitHub repo pushed to within the last ${Math.floor(months * 30)} days.`,
                points: -5,
              });
            } else if (months > 18) {
              riskFactors.push({
                id: 'inactive-repo',
                title: 'Inactive repository',
                description: `GitHub repo not pushed to for ${Math.floor(months)} months.`,
                severity: 'low',
                points: 5,
                evidence: [`Last push: ${formatDateStamp(lastPush)}`],
              });
            }
          }

          if (gh.stargazers_count !== undefined && gh.stargazers_count > 500) {
            trustSignals.push({
              id: 'popular-repo',
              title: 'Popular repository',
              description: `${gh.stargazers_count} GitHub stars. Strong community interest.`,
              points: -5,
            });
          }
        }
      }

      if (npmData.versions) {
        const sorted = Object.keys(npmData.versions).sort(semverSort);
        for (const jump of detectVersionJumps(sorted)) {
          riskFactors.push({
            id: 'suspicious-version-jump',
            title: 'Suspicious version jump',
            description: jump,
            severity: 'medium',
            points: 12,
            evidence: [jump],
          });
        }
      }

      if (npmData.time) {
        const change = detectPublisherChanges(npmData.time);
        if (change) {
          riskFactors.push({
            id: 'publisher-change',
            title: 'Suspicious publisher change pattern',
            description: change,
            severity: 'high',
            points: 20,
            evidence: ['Version timing anomaly detected'],
          });
        }
      }

      if (versionCount > 0) {
        const latestVersion = versionList[versionList.length - 1] ?? '';
        if (npmData.time?.[latestVersion]) {
          const days = daysAgo(new Date(npmData.time[latestVersion]));
          if (days < 7 && versionCount < 5) {
            riskFactors.push({
              id: 'very-new-package',
              title: 'Very new package with few versions',
              description: `Published ~${Math.floor(days)} days ago with only ${versionCount} versions. Limited track record.`,
              severity: 'medium',
              points: 10,
              evidence: [
                `Latest version: ${latestVersion}, Total versions: ${versionCount}`,
              ],
            });
          }
        }
      }
    }
  } catch (err) {
    info(`Could not check npm registry for ${pkgName}: ${err}`);
  }

  return { trustSignals, riskFactors };
}

function extractGithubRepo(npmData: NpmRegistryResponse): string | null {
  const sources = [
    npmData.repository?.url?.match(
      /github\.com[/:]([\\w-]+\/[\\w.-]+?)(?:\.git)?$/,
    ),
    npmData.bugs?.url?.match(/github\.com\/([\\w-]+\/[\\w.-]+?)\//),
    npmData.homepage?.match(/github\.com\/([\\w-]+\/[\\w.-]+?)(?:\/|$)/),
  ];
  for (const m of sources) {
    if (m) return m[1];
  }
  return null;
}

function detectVersionJumps(versions: string[]): string[] {
  const jumps: string[] = [];
  if (versions.length < 2) return jumps;

  for (let i = 1; i < versions.length; i++) {
    const prev = versions[i - 1];
    const curr = versions[i];
    if (prev && curr) {
      const p = prev.split('.').map(Number);
      const c = curr.split('.').map(Number);
      if (p.length >= 2 && c.length >= 2) {
        if (c[0] - p[0] >= 5) jumps.push(`Major jump: ${prev} → ${curr}`);
        if (c[0] < p[0]) jumps.push(`Version rollback: ${prev} → ${curr}`);
      }
    }
  }
  return jumps;
}

function detectPublisherChanges(time: Record<string, string>): string | null {
  const versions = Object.keys(time)
    .filter((k) => k !== 'created' && k !== 'modified')
    .sort((a, b) => new Date(time[a]).getTime() - new Date(time[b]).getTime());

  if (versions.length < 3) return null;

  let maxGapMonths = 0;
  let gapIndex = 0;

  for (let i = 1; i < versions.length; i++) {
    const gap =
      (new Date(time[versions[i]]).getTime() -
        new Date(time[versions[i - 1]]).getTime()) /
      MS_PER_MONTH;
    if (gap > maxGapMonths) {
      maxGapMonths = gap;
      gapIndex = i;
    }
  }

  if (maxGapMonths > 24 && gapIndex === versions.length - 1) {
    return `Version ${versions[gapIndex]} published after ${Math.floor(maxGapMonths)} month gap. Possible account takeover.`;
  }

  return null;
}

function semverSort(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
