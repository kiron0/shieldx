import { RiskFactor, TrustSignal, RiskLevel } from '../types';

const MAX_SCORE = 100;
const CATEGORY_BONUS_BY_SIZE: Array<[number, number]> = [
  [4, 3],
  [6, 4],
];
const HIGH_CRIT_BONUS_BY_COUNT: Array<[number, number]> = [
  [4, 3],
  [6, 4],
];

export function calculateRisk(
  riskFactors: RiskFactor[],
  trustSignals: TrustSignal[],
): { riskScore: number; riskLevel: RiskLevel } {
  let score = 0;

  for (const factor of riskFactors) {
    score += factor.points;
  }

  const categories = new Set(riskFactors.map((f) => f.id.split('-')[0]));
  score += highestApplicableBonus(categories.size, CATEGORY_BONUS_BY_SIZE);

  const highCritCount = riskFactors.filter(
    (f) => f.severity === 'high' || f.severity === 'critical',
  ).length;
  score += highestApplicableBonus(highCritCount, HIGH_CRIT_BONUS_BY_COUNT);

  const sortedSignals = [...trustSignals].sort(
    (a, b) => Math.abs(b.points) - Math.abs(a.points),
  );
  for (let i = 0; i < sortedSignals.length; i++) {
    const decay = Math.pow(0.8, i);
    score += sortedSignals[i].points * decay;
  }

  score = Math.max(0, Math.min(MAX_SCORE, score));
  score = Math.round(score);

  let riskLevel: RiskLevel;
  if (score <= 25) riskLevel = 'low';
  else if (score <= 50) riskLevel = 'moderate';
  else if (score <= 75) riskLevel = 'high';
  else riskLevel = 'critical';

  return { riskScore: score, riskLevel };
}

function highestApplicableBonus(
  count: number,
  thresholds: Array<[number, number]>,
): number {
  let bonus = 0;
  for (const [threshold, value] of thresholds) {
    if (count >= threshold) {
      bonus = value;
    }
  }
  return bonus;
}

export function generateRecommendation(
  riskLevel: RiskLevel,
  riskFactors: RiskFactor[],
): string {
  switch (riskLevel) {
    case 'low':
      return 'This extension appears safe. No major suspicious behavior detected.';

    case 'moderate':
      return 'This extension uses some sensitive APIs. Review the findings and verify the publisher is trusted.';

    case 'high': {
      const reasons = riskFactors
        .filter((f) => f.severity === 'high' || f.severity === 'critical')
        .map((f) => f.title.toLowerCase())
        .join(', ');
      return `This extension shows high-risk behavior (${reasons}). Review carefully before using in sensitive workspaces. Disable if not essential.`;
    }

    case 'critical':
      return 'This extension contains multiple critical risk indicators. Disable this extension and review manually before any use.';
  }
}

export function generateExplanation(
  riskLevel: RiskLevel,
  factors: RiskFactor[],
  signals: TrustSignal[],
): string {
  const factorLines = factors.map((f) => `- ${f.title}: ${f.description}`);

  let explanation = `Risk Level: ${riskLevel.toUpperCase()}\n\n`;

  if (factors.length > 0) {
    explanation += `Risk Factors Found:\n${factorLines.join('\n')}\n\n`;
  }

  if (signals.length > 0) {
    const signalLines = signals.map((s) => `+ ${s.title}: ${s.description}`);
    explanation += `Trust Signals:\n${signalLines.join('\n')}\n\n`;
  }

  return explanation;
}
