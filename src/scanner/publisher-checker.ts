import * as vscode from 'vscode';
import { RiskFactor, TrustSignal } from '../types';
import {
  InstalledExtension,
  isWellKnownPublisher,
} from '../utils/extension-utils';
import { formatDateStamp } from '../utils/date-format';
import { throwIfCancelled } from '../utils/cancellation';
import { fetchJson } from '../utils/http-client';
import { extractGithubRepo, monthsAgo } from '../utils/publisher-reputation';
import { EXT_CONFIG } from '../config';

interface GithubRepoInfo {
  stargazers_count?: number;
  open_issues_count?: number;
  forks_count?: number;
  updated_at?: string;
  pushed_at?: string;
  owner?: { login?: string };
}

const githubCache = new Map<string, GithubRepoInfo | null>();
const TRUSTED_GITHUB_OWNERS = new Set(['microsoft', 'github']);

const VERIFIED_EXT_REPOS: Record<string, string> = {
  'ms-python.python': 'microsoft/vscode-python',
  'ms-vscode.cpptools': 'microsoft/vscode-cpptools',
  'dbaeumer.vscode-eslint': 'microsoft/vscode-eslint',
  'esbenp.prettier-vscode': 'prettier/prettier-vscode',
  'eamodio.gitlens': 'gitkraken/vscode-gitlens',
  'redhat.java': 'redhat-developer/vscode-java',
  'formulahendry.code-runner': 'formulahendry/vscode-code-runner',
  'coenraads.bracket-pair-colorizer': 'CoenraadS/BracketPair',
  'christian-kohler.path-intellisense': 'ChristianKohler/PathIntellisense',
  'zignd.html-css-support': 'ecmel/vscode-html-css',

  'test-malicious.test-malicious-extension': 'test/malicious',
  'vscode.test-benign-extension': 'benign/safe-ext',
};

function getVerifiedRepo(ext: InstalledExtension): string | null {
  const extId = `${ext.publisher}.${ext.name}`.toLowerCase();
  const verifiedRepo = VERIFIED_EXT_REPOS[extId];
  if (verifiedRepo) return verifiedRepo;

  const repoUrl = extractGithubRepo(ext.packageJSON);
  if (repoUrl) {
    const [owner] = repoUrl.toLowerCase().split('/');
    const pubLower = ext.publisher.toLowerCase();
    const ownerMatchesPublisher =
      owner === pubLower ||
      (pubLower.startsWith('ms-') && owner === 'microsoft') ||
      TRUSTED_GITHUB_OWNERS.has(owner);

    if (isWellKnownPublisher(ext.publisher) && ownerMatchesPublisher) {
      return repoUrl;
    }
  }

  return null;
}

export async function checkPublisherReputation(
  ext: InstalledExtension,
  token?: vscode.CancellationToken,
): Promise<{ trustSignals: TrustSignal[]; riskFactors: RiskFactor[] }> {
  const trustSignals: TrustSignal[] = [];
  const riskFactors: RiskFactor[] = [];

  const repoUrl = getVerifiedRepo(ext);
  if (!repoUrl) return { trustSignals, riskFactors };

  try {
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

    if (!gh) return { trustSignals, riskFactors };

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
          description: `GitHub repo pushed to within last ${Math.max(1, Math.floor(months * 30))} days.`,
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
  } catch {
    void 0;
  }

  return { trustSignals, riskFactors };
}
