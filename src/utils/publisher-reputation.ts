const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_MONTH = MS_PER_DAY * 30;

export interface RegistryRepoSource {
  repository?: { url?: string };
  bugs?: { url?: string };
  homepage?: string;
}

export function monthsAgo(date: Date): number {
  return (Date.now() - date.getTime()) / MS_PER_MONTH;
}

export function daysAgo(date: Date): number {
  return (Date.now() - date.getTime()) / MS_PER_DAY;
}

export function extractGithubRepo(npmData: RegistryRepoSource): string | null {
  const sources = [
    npmData.repository?.url?.match(
      /github\.com[/:]([\\w-]+\/[\\w.-]+?)(?:\.git)?$/,
    ),
    npmData.bugs?.url?.match(/github\.com\/([\\w-]+\/[\\w.-]+?)\//),
    npmData.homepage?.match(/github\.com\/([\\w-]+\/[\\w.-]+?)(?:\/|$)/),
  ];
  for (const m of sources) if (m) return m[1];
  return null;
}

export function detectVersionJumps(versions: string[]): string[] {
  const jumps: string[] = [];
  if (versions.length < 2) return jumps;

  for (let i = 1; i < versions.length; i++) {
    const prev = versions[i - 1];
    const curr = versions[i];
    if (!prev || !curr) continue;
    const p = prev.split('.').map(Number);
    const c = curr.split('.').map(Number);
    if (p.length < 2 || c.length < 2) continue;
    if (c[0] - p[0] >= 5) jumps.push(`Major jump: ${prev} → ${curr}`);
    if (c[0] < p[0]) jumps.push(`Version rollback: ${prev} → ${curr}`);
  }
  return jumps;
}

export function detectPublisherChanges(
  time: Record<string, string>,
): string | null {
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

export function semverSort(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
