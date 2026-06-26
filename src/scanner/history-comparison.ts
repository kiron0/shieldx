import { SecuritySummary, ExtensionSecurityReport } from '../types';
import { info } from '../utils/logger';

export interface ScanDiff {
  newExtensions: string[];
  removedExtensions: string[];
  scoreChanges: Array<{
    extensionId: string;
    oldScore: number;
    newScore: number;
    delta: number;
  }>;
  riskLevelChanges: Array<{
    extensionId: string;
    oldLevel: string;
    newLevel: string;
  }>;
  summary: string;
}

/**
 * Compare two scan summaries and produce a diff.
 */
export function compareScans(
  previous: SecuritySummary | null,
  current: SecuritySummary,
): ScanDiff {
  if (!previous) {
    return {
      newExtensions: current.reports.map((r) => r.id),
      removedExtensions: [],
      scoreChanges: [],
      riskLevelChanges: [],
      summary: `First scan: ${current.totalExtensions} extensions scanned.`,
    };
  }

  const prevMap = new Map<string, ExtensionSecurityReport>();
  for (const r of previous.reports) {
    prevMap.set(r.id, r);
  }

  const currMap = new Map<string, ExtensionSecurityReport>();
  for (const r of current.reports) {
    currMap.set(r.id, r);
  }

  const newExtensions: string[] = [];
  const removedExtensions: string[] = [];
  const scoreChanges: ScanDiff['scoreChanges'] = [];
  const riskLevelChanges: ScanDiff['riskLevelChanges'] = [];

  // Find new and changed extensions
  for (const [id, curr] of currMap) {
    const prev = prevMap.get(id);
    if (!prev) {
      newExtensions.push(id);
      continue;
    }

    const delta = curr.riskScore - prev.riskScore;
    if (delta !== 0) {
      scoreChanges.push({
        extensionId: id,
        oldScore: prev.riskScore,
        newScore: curr.riskScore,
        delta,
      });
    }

    if (prev.riskLevel !== curr.riskLevel) {
      riskLevelChanges.push({
        extensionId: id,
        oldLevel: prev.riskLevel,
        newLevel: curr.riskLevel,
      });
    }
  }

  // Find removed extensions
  for (const [id] of prevMap) {
    if (!currMap.has(id)) {
      removedExtensions.push(id);
    }
  }

  // Build summary
  const parts: string[] = [];
  if (newExtensions.length > 0) {
    parts.push(`${newExtensions.length} new extension(s)`);
  }
  if (removedExtensions.length > 0) {
    parts.push(`${removedExtensions.length} removed extension(s)`);
  }
  if (scoreChanges.length > 0) {
    const improved = scoreChanges.filter((c) => c.delta < 0).length;
    const worsened = scoreChanges.filter((c) => c.delta > 0).length;
    if (improved > 0) parts.push(`${improved} improved`);
    if (worsened > 0) parts.push(`${worsened} worsened`);
  }
  if (riskLevelChanges.length > 0) {
    parts.push(`${riskLevelChanges.length} risk level change(s)`);
  }

  const summary =
    parts.length > 0
      ? `Scan diff: ${parts.join(', ')}.`
      : 'No changes detected since last scan.';

  info(summary);

  return {
    newExtensions,
    removedExtensions,
    scoreChanges,
    riskLevelChanges,
    summary,
  };
}
