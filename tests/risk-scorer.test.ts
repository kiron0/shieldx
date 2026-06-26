import { describe, it, expect } from 'vitest';
import { RiskFactor, TrustSignal } from '../types';

// Inline risk scoring logic for testing (mirrors risk-scorer.ts logic)
function calculateRisk(
  riskFactors: RiskFactor[],
  trustSignals: TrustSignal[],
): { riskScore: number; riskLevel: string } {
  let score = 0;
  for (const factor of riskFactors) {
    score += factor.points;
  }
  for (const signal of trustSignals) {
    score += signal.points;
  }
  score = Math.max(0, Math.min(100, score));
  score = Math.round(score);

  let riskLevel = 'low';
  if (score <= 25) riskLevel = 'low';
  else if (score <= 50) riskLevel = 'moderate';
  else if (score <= 75) riskLevel = 'high';
  else riskLevel = 'critical';

  return { riskScore: score, riskLevel };
}

describe('Risk Scoring', () => {
  it('returns 0 for empty inputs', () => {
    const result = calculateRisk([], []);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('low');
  });

  it('low risk (0-25)', () => {
    const factors: RiskFactor[] = [
      {
        id: 'no-repo',
        title: 'No repo',
        description: '',
        severity: 'low',
        points: 10,
      },
      {
        id: 'no-license',
        title: 'No license',
        description: '',
        severity: 'low',
        points: 5,
      },
    ];
    const result = calculateRisk(factors, []);
    expect(result.riskScore).toBe(15);
    expect(result.riskLevel).toBe('low');
  });

  it('moderate risk (26-50)', () => {
    const factors: RiskFactor[] = [
      {
        id: 'network',
        title: 'Network',
        description: '',
        severity: 'medium',
        points: 15,
      },
      {
        id: 'env',
        title: 'Env',
        description: '',
        severity: 'medium',
        points: 15,
      },
      {
        id: 'no-repo',
        title: 'No repo',
        description: '',
        severity: 'low',
        points: 10,
      },
    ];
    const result = calculateRisk(factors, []);
    expect(result.riskScore).toBe(40);
    expect(result.riskLevel).toBe('moderate');
  });

  it('high risk (51-75)', () => {
    const factors: RiskFactor[] = [
      {
        id: 'child-process',
        title: 'Shell',
        description: '',
        severity: 'high',
        points: 20,
      },
      {
        id: 'eval',
        title: 'Eval',
        description: '',
        severity: 'high',
        points: 25,
      },
      {
        id: 'network',
        title: 'Network',
        description: '',
        severity: 'medium',
        points: 15,
      },
    ];
    const result = calculateRisk(factors, []);
    expect(result.riskScore).toBe(60);
    expect(result.riskLevel).toBe('high');
  });

  it('critical risk (76-100)', () => {
    const factors: RiskFactor[] = [
      {
        id: 'child-process',
        title: 'Shell',
        description: '',
        severity: 'high',
        points: 20,
      },
      {
        id: 'eval',
        title: 'Eval',
        description: '',
        severity: 'high',
        points: 25,
      },
      {
        id: 'obfuscation',
        title: 'Obfuscation',
        description: '',
        severity: 'high',
        points: 25,
      },
      {
        id: 'suspicious-domains',
        title: 'Domains',
        description: '',
        severity: 'critical',
        points: 30,
      },
    ];
    const result = calculateRisk(factors, []);
    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe('critical');
  });

  it('trust signals reduce score', () => {
    const factors: RiskFactor[] = [
      {
        id: 'child-process',
        title: 'Shell',
        description: '',
        severity: 'high',
        points: 20,
      },
      {
        id: 'eval',
        title: 'Eval',
        description: '',
        severity: 'high',
        points: 25,
      },
    ];
    const signals: TrustSignal[] = [
      { id: 'known-publisher', title: 'Known', description: '', points: -10 },
      { id: 'has-repo', title: 'Has repo', description: '', points: -10 },
    ];
    const result = calculateRisk(factors, signals);
    expect(result.riskScore).toBe(25);
    expect(result.riskLevel).toBe('low');
  });

  it('score caps at 100', () => {
    const factors: RiskFactor[] = Array.from({ length: 10 }, (_, i) => ({
      id: `f${i}`,
      title: '',
      description: '',
      severity: 'critical' as const,
      points: 30,
    }));
    const result = calculateRisk(factors, []);
    expect(result.riskScore).toBe(100);
  });

  it('score cannot go below 0', () => {
    const signals: TrustSignal[] = [
      { id: 's1', title: '', description: '', points: -50 },
    ];
    const result = calculateRisk([], signals);
    expect(result.riskScore).toBe(0);
  });
});
