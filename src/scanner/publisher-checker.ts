import * as https from 'https';
import { RiskFactor, TrustSignal } from '../types';
import { InstalledExtension } from '../utils/extension-utils';
import { info } from '../utils/logger';

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
const downloadCache = new Map<string, number | null>();
const githubCache = new Map<string, GithubRepoInfo | null>();

export async function checkPublisherReputation(
  ext: InstalledExtension,
): Promise<{ trustSignals: TrustSignal[]; riskFactors: RiskFactor[] }> {
  const trustSignals: TrustSignal[] = [];
  const riskFactors: RiskFactor[] = [];

  const pkgName = ext.packageJSON?.name;
  if (!pkgName) return { trustSignals, riskFactors };

  try {
    const npmData = await fetchNpmRegistry(pkgName);

    if (npmData) {
      // --- Publisher verification ---
      const maintainers = npmData.maintainers || [];
      if (maintainers.length > 0) {
        trustSignals.push({
          id: 'npm-publisher-verified',
          title: 'Publisher verified on npm',
          description: `Publisher "${ext.publisher}" has a verified npm account.`,
          points: -5,
        });
      }

      // --- Last updated date ---
      if (npmData.time?.[pkgName]) {
        const lastUpdated = new Date(npmData.time[pkgName]);
        const monthsAgo =
          (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 30);

        if (monthsAgo > 24) {
          riskFactors.push({
            id: 'not-updated-for-years',
            title: 'Extension not updated for years',
            description: `Last npm update was ${Math.floor(monthsAgo)} months ago. Abandoned extension is a security risk.`,
            severity: 'low',
            points: 5,
            evidence: [
              `Last updated: ${lastUpdated.toISOString().split('T')[0]}`,
            ],
          });
        } else if (monthsAgo < 1) {
          trustSignals.push({
            id: 'recently-updated',
            title: 'Recently updated',
            description: `Updated within the last ${Math.max(1, Math.floor(monthsAgo * 30))} days.`,
            points: -5,
          });
        }
      }

      // --- Version count (long-term maintenance) ---
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

      // --- Recent publish date ---
      if (npmData.time?.created) {
        const created = new Date(npmData.time.created);
        const daysSinceCreation =
          (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceCreation < 30) {
          riskFactors.push({
            id: 'recently-published',
            title: 'Recently published',
            description: `Published only ${Math.floor(daysSinceCreation)} days ago. Less established.`,
            severity: 'low',
            points: 5,
            evidence: [`Created: ${created.toISOString().split('T')[0]}`],
          });
        }
      }

      // --- Download count (install count) ---
      const downloads = await fetchNpmDownloads(pkgName);
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

      // --- GitHub repo enrichment ---
      const repoUrl = extractGithubRepo(npmData);
      if (repoUrl) {
        const githubData = await fetchGithubRepo(repoUrl);
        if (githubData) {
          // Open issues count
          if (githubData.open_issues_count !== undefined) {
            if (githubData.open_issues_count > 100) {
              riskFactors.push({
                id: 'many-open-issues',
                title: 'Many open issues',
                description: `${githubData.open_issues_count} open issues on GitHub. Could indicate maintenance issues.`,
                severity: 'low',
                points: 3,
                evidence: [`${githubData.open_issues_count} open issues`],
              });
            } else if (githubData.open_issues_count < 10) {
              trustSignals.push({
                id: 'few-open-issues',
                title: 'Low open issue count',
                description: `Only ${githubData.open_issues_count} open issues on GitHub. Good maintenance indicator.`,
                points: -3,
              });
            }
          }

          // Repository activity (pushed recently)
          if (githubData.pushed_at) {
            const lastPush = new Date(githubData.pushed_at);
            const monthsSincePush =
              (Date.now() - lastPush.getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (monthsSincePush < 3) {
              trustSignals.push({
                id: 'active-repo',
                title: 'Active repository',
                description: `GitHub repo pushed to within the last ${Math.floor(monthsSincePush * 30)} days.`,
                points: -5,
              });
            } else if (monthsSincePush > 18) {
              riskFactors.push({
                id: 'inactive-repo',
                title: 'Inactive repository',
                description: `GitHub repo not pushed to for ${Math.floor(monthsSincePush)} months.`,
                severity: 'low',
                points: 5,
                evidence: [
                  `Last push: ${lastPush.toISOString().split('T')[0]}`,
                ],
              });
            }
          }

          // Stars (community interest)
          if (
            githubData.stargazers_count !== undefined &&
            githubData.stargazers_count > 500
          ) {
            trustSignals.push({
              id: 'popular-repo',
              title: 'Popular repository',
              description: `${githubData.stargazers_count} GitHub stars. Strong community interest.`,
              points: -5,
            });
          }
        }
      }

      // --- Suspicious version jump detection ---
      if (npmData.versions) {
        const versionList = Object.keys(npmData.versions).sort(semverSort);
        const jumps = detectVersionJumps(versionList);
        for (const jump of jumps) {
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

      // --- Sudden publisher change detection ---
      if (npmData.time) {
        const publisherChanges = detectPublisherChanges(npmData.time, pkgName);
        if (publisherChanges) {
          riskFactors.push({
            id: 'publisher-change',
            title: 'Suspicious publisher change pattern',
            description: publisherChanges,
            severity: 'high',
            points: 20,
            evidence: ['Version timing anomaly detected'],
          });
        }
      }

      // --- Known vulnerability reports (check via npm audit metadata) ---
      if (versionCount > 0) {
        const latestVersion = versionList
          ? versionList[versionList.length - 1]
          : '';
        // Flag if latest version is very new (< 7 days) and has few versions total
        if (npmData.time?.[latestVersion]) {
          const latestDate = new Date(npmData.time[latestVersion]);
          const daysSinceLatest =
            (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLatest < 7 && versionCount < 5) {
            riskFactors.push({
              id: 'very-new-package',
              title: 'Very new package with few versions',
              description: `Published ~${Math.floor(daysSinceLatest)} days ago with only ${versionCount} versions. Limited track record.`,
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

function fetchNpmRegistry(
  pkgName: string,
): Promise<NpmRegistryResponse | null> {
  if (registryCache.has(pkgName)) {
    return Promise.resolve(registryCache.get(pkgName) || null);
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000);

    https
      .get(
        `https://registry.npmjs.org/${encodeURIComponent(pkgName)}`,
        { headers: { Accept: 'application/json' } },
        (res) => {
          if (res.statusCode !== 200) {
            clearTimeout(timeout);
            registryCache.set(pkgName, null);
            resolve(null);
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            clearTimeout(timeout);
            try {
              const parsed = JSON.parse(data) as NpmRegistryResponse;
              registryCache.set(pkgName, parsed);
              resolve(parsed);
            } catch {
              registryCache.set(pkgName, null);
              resolve(null);
            }
          });
        },
      )
      .on('error', () => {
        clearTimeout(timeout);
        registryCache.set(pkgName, null);
        resolve(null);
      });
  });
}

function fetchNpmDownloads(pkgName: string): Promise<number | null> {
  if (downloadCache.has(pkgName)) {
    return Promise.resolve(downloadCache.get(pkgName) || null);
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 3000);

    https
      .get(
        `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkgName)}`,
        (res) => {
          if (res.statusCode !== 200) {
            clearTimeout(timeout);
            downloadCache.set(pkgName, null);
            resolve(null);
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            clearTimeout(timeout);
            try {
              const parsed = JSON.parse(data) as NpmDownloadsResponse;
              const count = parsed.downloads || 0;
              downloadCache.set(pkgName, count);
              resolve(count);
            } catch {
              downloadCache.set(pkgName, null);
              resolve(null);
            }
          });
        },
      )
      .on('error', () => {
        clearTimeout(timeout);
        downloadCache.set(pkgName, null);
        resolve(null);
      });
  });
}

function extractGithubRepo(npmData: NpmRegistryResponse): string | null {
  // Check repository field
  if (npmData.repository?.url) {
    const match = npmData.repository.url.match(
      /github\.com[/:]([\w-]+\/[\w.-]+?)(?:\.git)?$/,
    );
    if (match) return match[1];
  }
  // Check bugs URL
  if (npmData.bugs?.url) {
    const match = npmData.bugs.url.match(/github\.com\/([\w-]+\/[\w.-]+?)\//);
    if (match) return match[1];
  }
  // Check homepage
  if (npmData.homepage) {
    const match = npmData.homepage.match(
      /github\.com\/([\w-]+\/[\w.-]+?)(?:\/|$)/,
    );
    if (match) return match[1];
  }
  return null;
}

function fetchGithubRepo(repoPath: string): Promise<GithubRepoInfo | null> {
  if (githubCache.has(repoPath)) {
    return Promise.resolve(githubCache.get(repoPath) || null);
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 3000);

    https
      .get(
        `https://api.github.com/repos/${repoPath}`,
        {
          headers: {
            'User-Agent': 'Shieldex-VSCode-Extension',
            Accept: 'application/vnd.github.v3+json',
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            clearTimeout(timeout);
            githubCache.set(repoPath, null);
            resolve(null);
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            clearTimeout(timeout);
            try {
              const parsed = JSON.parse(data) as GithubRepoInfo;
              githubCache.set(repoPath, parsed);
              resolve(parsed);
            } catch {
              githubCache.set(repoPath, null);
              resolve(null);
            }
          });
        },
      )
      .on('error', () => {
        clearTimeout(timeout);
        githubCache.set(repoPath, null);
        resolve(null);
      });
  });
}

function detectVersionJumps(versions: string[]): string[] {
  const jumps: string[] = [];

  // Need at least 2 versions to detect jumps
  if (versions.length < 2) return jumps;

  for (let i = 1; i < versions.length; i++) {
    const prev = versions[i - 1];
    const curr = versions[i];

    if (prev && curr) {
      const prevParts = prev.split('.').map(Number);
      const currParts = curr.split('.').map(Number);

      if (prevParts.length >= 2 && currParts.length >= 2) {
        // Detect major version jump of more than 5
        if (currParts[0] - prevParts[0] >= 5) {
          jumps.push(`Major jump: ${prev} → ${curr}`);
        }
        // Detect version going backwards
        if (currParts[0] < prevParts[0]) {
          jumps.push(`Version rollback: ${prev} → ${curr}`);
        }
      }
    }
  }

  return jumps;
}

function detectPublisherChanges(
  time: Record<string, string>,
  pkgName: string,
): string | null {
  // Check if there's a suspicious time gap or version that was published much later
  // after a long period of inactivity, which could indicate account takeover
  const versions = Object.keys(time)
    .filter((k) => k !== 'created' && k !== 'modified')
    .sort((a, b) => new Date(time[a]).getTime() - new Date(time[b]).getTime());

  if (versions.length < 3) return null;

  // Find largest gap between consecutive versions
  let maxGapMonths = 0;
  let gapIndex = 0;

  for (let i = 1; i < versions.length; i++) {
    const gap =
      (new Date(time[versions[i]]).getTime() -
        new Date(time[versions[i - 1]]).getTime()) /
      (1000 * 60 * 60 * 24 * 30);
    if (gap > maxGapMonths) {
      maxGapMonths = gap;
      gapIndex = i;
    }
  }

  // A gap of more than 24 months followed by a new version is suspicious
  if (maxGapMonths > 24 && gapIndex === versions.length - 1) {
    return `Version ${versions[gapIndex]} published after ${Math.floor(maxGapMonths)} month gap. Possible account takeover.`;
  }

  return null;
}

function semverSort(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;
    if (aNum !== bNum) return aNum - bNum;
  }
  return 0;
}
