import { describe, it, expect } from 'vitest';
import { RiskFactor, TrustSignal } from '../src/types';
import { calculateRisk } from '../src/scanner/risk-scorer';

describe('Risk Scoring', () => {
  it('returns 0 for empty inputs', () => {
    const result = calculateRisk([], []);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('low');
  });

  it('keeps low-risk findings low', () => {
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

  it('does not add category bonus from id prefixes', () => {
    const factors: RiskFactor[] = [
      {
        id: 'network-access',
        title: '',
        description: '',
        severity: 'low',
        points: 6,
      },
      {
        id: 'env-access',
        title: '',
        description: '',
        severity: 'low',
        points: 5,
      },
      {
        id: 'filesystem-access',
        title: '',
        description: '',
        severity: 'low',
        points: 4,
      },
      {
        id: 'file-mod',
        title: '',
        description: '',
        severity: 'medium',
        points: 8,
      },
    ];

    const result = calculateRisk(factors, []);
    expect(result.riskScore).toBe(26);
    expect(result.riskLevel).toBe('moderate');
  });

  it('applies category bonus only across explicit risk categories', () => {
    const factors: RiskFactor[] = [
      {
        id: 'network-access',
        title: '',
        description: '',
        severity: 'low',
        points: 6,
      },
      {
        id: 'env-access',
        title: '',
        description: '',
        severity: 'low',
        points: 5,
      },
      {
        id: 'many-deps',
        title: '',
        description: '',
        severity: 'medium',
        points: 8,
      },
      {
        id: 'no-repo',
        title: '',
        description: '',
        severity: 'low',
        points: 10,
      },
    ];

    const result = calculateRisk(factors, []);
    expect(result.riskScore).toBe(32);
    expect(result.riskLevel).toBe('moderate');
  });

  it('applies high-severity bonus once', () => {
    const factors: RiskFactor[] = [
      {
        id: 'child-process',
        title: '',
        description: '',
        severity: 'high',
        points: 20,
      },
      {
        id: 'dynamic-exec',
        title: '',
        description: '',
        severity: 'high',
        points: 25,
      },
      {
        id: 'packed-js',
        title: '',
        description: '',
        severity: 'high',
        points: 25,
      },
      {
        id: 'suspicious-domains',
        title: '',
        description: '',
        severity: 'critical',
        points: 30,
      },
    ];

    const result = calculateRisk(factors, []);
    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe('critical');
  });

  it('trust signals reduce score without lowering severity floor', () => {
    const factors: RiskFactor[] = [
      {
        id: 'child-process',
        title: '',
        description: '',
        severity: 'high',
        points: 20,
      },
      {
        id: 'dynamic-exec',
        title: '',
        description: '',
        severity: 'high',
        points: 25,
      },
    ];
    const signals: TrustSignal[] = [
      { id: 'known-publisher', title: '', description: '', points: -10 },
      { id: 'has-repo', title: '', description: '', points: -10 },
    ];

    const result = calculateRisk(factors, signals);
    expect(result.riskScore).toBe(51);
    expect(result.riskLevel).toBe('high');
  });

  it('caps total trust discount instead of each signal separately', () => {
    const factors: RiskFactor[] = [
      {
        id: 'child-process',
        title: '',
        description: '',
        severity: 'high',
        points: 60,
      },
    ];
    const signals: TrustSignal[] = Array.from({ length: 5 }, (_, i) => ({
      id: `signal-${i}`,
      title: '',
      description: '',
      points: -10,
    }));

    const result = calculateRisk(factors, signals);
    expect(result.riskScore).toBe(51);
    expect(result.riskLevel).toBe('high');
  });

  it('keeps single critical finding critical', () => {
    const factors: RiskFactor[] = [
      {
        id: 'suspicious-domains',
        title: '',
        description: '',
        severity: 'critical',
        points: 30,
      },
    ];

    const result = calculateRisk(factors, []);
    expect(result.riskScore).toBe(76);
    expect(result.riskLevel).toBe('critical');
  });

  it('caps medium-only metadata stacks below high risk', () => {
    const factors: RiskFactor[] = [
      {
        id: 'no-repo',
        title: '',
        description: '',
        severity: 'low',
        points: 10,
      },
      {
        id: 'no-license',
        title: '',
        description: '',
        severity: 'low',
        points: 5,
      },
      {
        id: 'unknown-publisher',
        title: '',
        description: '',
        severity: 'medium',
        points: 10,
      },
      {
        id: 'many-capabilities',
        title: '',
        description: '',
        severity: 'medium',
        points: 12,
      },
      {
        id: 'many-deps',
        title: '',
        description: '',
        severity: 'medium',
        points: 8,
      },
      {
        id: 'broad-activation',
        title: '',
        description: '',
        severity: 'medium',
        points: 10,
      },
    ];

    const result = calculateRisk(factors, []);
    expect(result.riskScore).toBe(50);
    expect(result.riskLevel).toBe('moderate');
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
