import { describe, it, expect } from 'vitest';
import { ScanDiff } from '../scanner/history-comparison';
import { SecuritySummary, ExtensionSecurityReport } from '../types';

function compareScans(
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
  for (const r of previous.reports) prevMap.set(r.id, r);

  const currMap = new Map<string, ExtensionSecurityReport>();
  for (const r of current.reports) currMap.set(r.id, r);

  const newExtensions: string[] = [];
  const removedExtensions: string[] = [];
  const scoreChanges: ScanDiff['scoreChanges'] = [];
  const riskLevelChanges: ScanDiff['riskLevelChanges'] = [];

  for (const [id, curr] of currMap) {
    const prev = prevMap.get(id);
    if (!prev) {
      newExtensions.push(id);
      continue;
    }
    const delta = curr.riskScore - prev.riskScore;
    if (delta !== 0)
      scoreChanges.push({
        extensionId: id,
        oldScore: prev.riskScore,
        newScore: curr.riskScore,
        delta,
      });
    if (prev.riskLevel !== curr.riskLevel)
      riskLevelChanges.push({
        extensionId: id,
        oldLevel: prev.riskLevel,
        newLevel: curr.riskLevel,
      });
  }

  for (const [id] of prevMap) {
    if (!currMap.has(id)) removedExtensions.push(id);
  }

  const parts: string[] = [];
  if (newExtensions.length > 0)
    parts.push(`${newExtensions.length} new extension(s)`);
  if (removedExtensions.length > 0)
    parts.push(`${removedExtensions.length} removed extension(s)`);
  if (scoreChanges.length > 0) {
    const improved = scoreChanges.filter((c) => c.delta < 0).length;
    const worsened = scoreChanges.filter((c) => c.delta > 0).length;
    if (improved > 0) parts.push(`${improved} improved`);
    if (worsened > 0) parts.push(`${worsened} worsened`);
  }
  if (riskLevelChanges.length > 0)
    parts.push(`${riskLevelChanges.length} risk level change(s)`);

  const summary =
    parts.length > 0
      ? `Scan diff: ${parts.join(', ')}.`
      : 'No changes detected since last scan.';

  return {
    newExtensions,
    removedExtensions,
    scoreChanges,
    riskLevelChanges,
    summary,
  };
}

function makeReport(
  id: string,
  score: number,
  level: string,
): ExtensionSecurityReport {
  return {
    id,
    name: id,
    publisher: 'test',
    version: '1.0.0',
    installPath: '/tmp/' + id,
    riskScore: score,
    riskLevel: level as any,
    riskFactors: [],
    trustSignals: [],
    detectedCapabilities: {
      usesChildProcess: false,
      usesNetworkRequests: false,
      readsEnvironmentVariables: false,
      accessesWorkspaceFiles: false,
      hasInstallScripts: false,
      hasObfuscatedCode: false,
      declaresBroadActivationEvents: false,
      usesDynamicExecution: false,
      downloadsRemoteExecutables: false,
      usesSuspiciousDomains: false,
    },
    extensionDependencies: [],
    recommendation: '',
    scannedAt: new Date().toISOString(),
  };
}

function makeSummary(reports: ExtensionSecurityReport[]): SecuritySummary {
  return {
    totalExtensions: reports.length,
    lowRisk: reports.filter((r) => r.riskLevel === 'low').length,
    moderateRisk: reports.filter((r) => r.riskLevel === 'moderate').length,
    highRisk: reports.filter((r) => r.riskLevel === 'high').length,
    criticalRisk: reports.filter((r) => r.riskLevel === 'critical').length,
    reports,
    scannedAt: new Date().toISOString(),
    vscodeVersion: '1.85.0',
  };
}

describe('Historical Scan Comparison', () => {
  it('first scan returns all as new', () => {
    const curr = makeSummary([
      makeReport('ext1', 10, 'low'),
      makeReport('ext2', 50, 'moderate'),
    ]);
    const diff = compareScans(null, curr);
    expect(diff.newExtensions).toEqual(['ext1', 'ext2']);
    expect(diff.removedExtensions).toEqual([]);
    expect(diff.summary).toContain('First scan');
  });

  it('detects new extensions', () => {
    const prev = makeSummary([makeReport('ext1', 10, 'low')]);
    const curr = makeSummary([
      makeReport('ext1', 10, 'low'),
      makeReport('ext2', 60, 'high'),
    ]);
    const diff = compareScans(prev, curr);
    expect(diff.newExtensions).toEqual(['ext2']);
  });

  it('detects removed extensions', () => {
    const prev = makeSummary([
      makeReport('ext1', 10, 'low'),
      makeReport('ext2', 20, 'low'),
    ]);
    const curr = makeSummary([makeReport('ext1', 10, 'low')]);
    const diff = compareScans(prev, curr);
    expect(diff.removedExtensions).toEqual(['ext2']);
  });

  it('detects score changes', () => {
    const prev = makeSummary([makeReport('ext1', 10, 'low')]);
    const curr = makeSummary([makeReport('ext1', 55, 'high')]);
    const diff = compareScans(prev, curr);
    expect(diff.scoreChanges.length).toBe(1);
    expect(diff.scoreChanges[0].delta).toBe(45);
  });

  it('detects risk level changes', () => {
    const prev = makeSummary([makeReport('ext1', 10, 'low')]);
    const curr = makeSummary([makeReport('ext1', 70, 'high')]);
    const diff = compareScans(prev, curr);
    expect(diff.riskLevelChanges.length).toBe(1);
    expect(diff.riskLevelChanges[0].oldLevel).toBe('low');
    expect(diff.riskLevelChanges[0].newLevel).toBe('high');
  });

  it('no changes detected', () => {
    const prev = makeSummary([makeReport('ext1', 10, 'low')]);
    const curr = makeSummary([makeReport('ext1', 10, 'low')]);
    const diff = compareScans(prev, curr);
    expect(diff.newExtensions).toEqual([]);
    expect(diff.removedExtensions).toEqual([]);
    expect(diff.scoreChanges).toEqual([]);
    expect(diff.riskLevelChanges).toEqual([]);
    expect(diff.summary).toContain('No changes detected');
  });
});
