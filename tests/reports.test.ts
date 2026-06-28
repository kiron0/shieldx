import { describe, expect, it } from 'vitest';
import {
  generateCsvReport,
  generateHtmlReport,
  generateJsonReport,
  generateMarkdownReport,
  generateSarifReport,
} from '../src/reports/markdown-report';
import {
  buildPdfBrowserArgs,
  getPdfBrowserCandidates,
  isPdfExportAvailable,
  resolvePdfBrowser,
} from '../src/reports/pdf-report';

const mockSummary = {
  totalExtensions: 3,
  lowRisk: 1,
  moderateRisk: 1,
  highRisk: 1,
  criticalRisk: 0,
  scannedAt: '2025-01-15T12:00:00Z',
  vscodeVersion: '1.85.0',
  reports: [
    {
      name: 'safe-ext',
      publisher: 'trusted',
      version: '1.0.0',
      marketplaceId: 'trusted.safe-ext',
      category: 'linter',
      iconDataUrl: 'data:image/png;base64,AAA',
      riskScore: 10,
      riskLevel: 'low',
      riskFactors: [],
      trustSignals: [
        {
          id: 'has-repo',
          title: 'Public repository',
          description: 'Has repo',
          points: -10,
        },
      ],
      extensionDependencies: [{ name: 'lodash', version: '4.17.21' }],
      recommendation: 'This extension appears safe.',
    },
    {
      name: 'moderate-ext',
      publisher: 'unknown',
      version: '2.0.0',
      marketplaceId: 'unknown.moderate-ext',
      category: 'other',
      riskScore: 35,
      riskLevel: 'moderate',
      riskFactors: [
        {
          id: 'network',
          title: 'Network requests',
          description: 'Makes external requests',
          severity: 'medium',
          points: 15,
        },
      ],
      trustSignals: [],
      extensionDependencies: [],
      recommendation: 'Review before using.',
    },
    {
      name: 'risky-ext',
      publisher: 'sketchy',
      version: '0.1.0',
      marketplaceId: 'sketchy.risky-ext',
      category: 'other',
      iconDataUrl: 'data:image/png;base64,BBB',
      riskScore: 65,
      riskLevel: 'high',
      riskFactors: [
        {
          id: 'child-process',
          title: 'Shell execution',
          description: 'Uses child_process',
          severity: 'high',
          points: 20,
        },
        {
          id: 'install-script',
          title: 'Has install script',
          description: 'Runs postinstall',
          severity: 'high',
          points: 25,
        },
        {
          id: 'no-repo',
          title: 'No repository link',
          description: 'No repo',
          severity: 'low',
          points: 10,
        },
      ],
      trustSignals: [],
      extensionDependencies: [{ name: 'axios', version: '0.18.0' }],
      recommendation: 'Disable this extension.',
    },
  ],
};

describe('Markdown Report', () => {
  it('generates valid markdown with header', () => {
    const md = generateMarkdownReport(mockSummary);
    expect(md).toContain('# ShieldX Security Report');
    expect(md).toContain('VS Code Version');
    expect(md).toContain('1.85.0');
  });

  it('includes summary table', () => {
    const md = generateMarkdownReport(mockSummary);
    expect(md).toContain('Total Extensions Scanned | 3');
    expect(md).toContain('Low Risk | 1');
    expect(md).toContain('High Risk | 1');
  });

  it('includes high risk extensions section', () => {
    const md = generateMarkdownReport(mockSummary);
    expect(md).toContain('## High & Critical Risk Extensions');
    expect(md).toContain(
      '### [risky-ext](https://marketplace.visualstudio.com/items?itemName=sketchy.risky-ext)',
    );
    expect(md).toContain('Disable this extension.');
  });

  it('includes all extensions table', () => {
    const md = generateMarkdownReport(mockSummary);
    expect(md).toContain(
      '| [safe-ext](https://marketplace.visualstudio.com/items?itemName=trusted.safe-ext) | trusted | 1.0.0 | 10 | low |',
    );
    expect(md).toContain(
      '| [risky-ext](https://marketplace.visualstudio.com/items?itemName=sketchy.risky-ext) | sketchy | 0.1.0 | 65 | high |',
    );
  });
});

describe('JSON Report', () => {
  it('serializes full summary with marketplace urls', () => {
    const json = JSON.parse(generateJsonReport(mockSummary as any));
    expect(json.totalExtensions).toBe(3);
    expect(json.reports).toHaveLength(3);
    expect(json.reports[0].marketplaceUrl).toBe(
      'https://marketplace.visualstudio.com/items?itemName=trusted.safe-ext',
    );
  });
});

describe('HTML Report', () => {
  it('renders extension icons when iconDataUrl exists', () => {
    const html = generateHtmlReport(mockSummary as any);
    expect(html).toContain('class="ext-icon"');
    expect(html).toContain('src="data:image/png;base64,AAA"');
    expect(html).toContain('src="data:image/png;base64,BBB"');
  });

  it('renders fallback icon when iconDataUrl missing', () => {
    const html = generateHtmlReport(mockSummary as any);
    expect(html).toContain('class="ext-icon-fallback"');
  });

  it('uses Space Grotesk in report styles', () => {
    const html = generateHtmlReport(mockSummary as any);
    expect(html).toContain('@font-face');
    expect(html).toContain('data:font/ttf;base64,');
    expect(html).toContain('font-family: "Space Grotesk"');
  });
});

describe('PDF Report', () => {
  it('builds browser print args for exact html rendering', () => {
    const args = buildPdfBrowserArgs('/tmp/report.html', '/tmp/report.pdf');
    expect(args).toContain('--headless=new');
    expect(args).toContain('--no-pdf-header-footer');
    expect(args).toContain('--print-to-pdf=/tmp/report.pdf');
    expect(args[args.length - 1]).toBe('file:///tmp/report.html');
  });

  it('has browser candidates for current platform', () => {
    const candidates = getPdfBrowserCandidates('darwin');
    expect(candidates[0] || candidates[1]).toBeDefined();
    expect(
      candidates.some((candidate) => candidate.includes('Google Chrome')),
    ).toBe(true);
  });

  it('prefers configured browser path', () => {
    const candidates = getPdfBrowserCandidates('darwin', '/custom/chrome');
    expect(candidates[0]).toBe('/custom/chrome');
  });

  it('reports unavailable when candidate paths do not exist', () => {
    expect(
      isPdfExportAvailable('/definitely/missing/browser', 'linux', () => false),
    ).toBe(false);
    expect(
      resolvePdfBrowser('/definitely/missing/browser', 'linux', () => false)
        .browserPath,
    ).toBeUndefined();
  });
});

describe('CSV Report', () => {
  it('generates valid CSV with header', () => {
    const csv = generateCsvReport(mockSummary as any);
    const lines = csv.split('\n').filter(Boolean);
    expect(lines[0]).toBe(
      'Extension,Publisher,Version,MarketplaceID,MarketplaceUrl,Category,RiskScore,RiskLevel,RiskFactors,Recommendation',
    );
    expect(lines.length).toBe(4); // header + 3 data rows
  });

  it('escapes CSV values with commas', () => {
    const summary = {
      reports: [
        {
          name: 'ext,with,commas',
          publisher: 'test',
          version: '1.0.0',
          riskScore: 10,
          riskLevel: 'low',
          riskFactors: [],
          recommendation: 'Safe',
        },
      ],
    };
    const csv = generateCsvReport(summary);
    expect(csv).toContain('"ext,with,commas"');
  });
});

describe('SARIF Report', () => {
  it('generates valid SARIF structure', () => {
    const sarif = generateSarifReport(mockSummary as any);
    expect(sarif.$schema).toContain('sarif-schema');
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs.length).toBe(1);
  });

  it('has correct tool info', () => {
    const sarif = generateSarifReport(mockSummary as any);
    expect(sarif.runs[0].tool.driver.name).toBe('ShieldX');
    expect(sarif.runs[0].tool.driver.version).toBe('0.1.0');
  });

  it('maps risk factors to results', () => {
    const sarif = generateSarifReport(mockSummary as any);
    const results = sarif.runs[0].results;
    // moderate-ext: 1 factor (network), risky-ext: 3 factors (child-process, install-script, no-repo)
    expect(results.length).toBe(4);
  });

  it('includes extension metadata in properties', () => {
    const sarif = generateSarifReport(mockSummary as any);
    const result = sarif.runs[0].results[0];
    expect(result.properties).toHaveProperty('extensionId');
    expect(result.properties).toHaveProperty('marketplaceUrl');
    expect(result.properties).toHaveProperty('riskScore');
    expect(result.properties).toHaveProperty('riskLevel');
  });

  it('maps severity levels correctly', () => {
    const sarif = generateSarifReport(mockSummary as any);
    const levels = sarif.runs[0].results.map((r: any) => r.level);
    expect(levels).toContain('error'); // high severity
    expect(levels).toContain('warning'); // medium severity
  });
});
