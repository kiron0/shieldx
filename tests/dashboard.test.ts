import { describe, it, expect } from 'vitest';
import { generateDashboardHtml } from '../src/dashboard/webview-html';

describe('Dashboard HTML', () => {
  it('generates valid HTML structure', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  it('has required elements', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('id="summary-cards"');
    expect(html).toContain('id="ext-list"');
    expect(html).toContain('id="panel-extensions"');
    expect(html).toContain('id="panel-history"');
    expect(html).toContain('id="empty-state"');
    expect(html).toContain('id="rec-actions"');
    expect(html).toContain('id="ext-search"');
    expect(html).toContain('id="ext-count"');
    expect(html).toContain('class="history-clear"');
    expect(html).toContain('.history-header.has-history .history-clear');
    expect(html).toContain('id="history-detail"');
    expect(html).toContain('history-tools');
    expect(html).not.toContain('.ext-icon');
  });

  it('has scan and export buttons', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('id="btn-scan"');
    expect(html).toContain('>Scan<');
    expect(html).toContain('>Cancel<');
    expect(html).toContain('data-action="export"');
    expect(html).toContain('title="Export Report"');
    expect(html).not.toContain('data-action="show-history"');
  });

  it('has VS Code theme CSS variables', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('--vscode-editor-background');
    expect(html).toContain('--vscode-button-background');
    expect(html).toContain('--vscode-panel-border');
    expect(html).toContain('img-src data:');
  });

  it('has JavaScript message handler', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('acquireVsCodeApi()');
    expect(html).toContain("msg.type === 'scanResult'");
    expect(html).not.toContain('addToHistory(msg.data)');
    expect(html).toContain('data-action="select-history"');
    expect(html).toContain('data-action="history-back"');
    expect(html).toContain("type: 'cancelScan'");
    expect(html).toContain("type: 'export'");
    expect(html).toContain('history-results');
    expect(html).toContain(
      'renderHistoryDetailResults(selectedHistoryEntry.summary',
    );
    expect(html).toContain('openLatestHistoryEntry()');
    expect(html).toContain("type: 'requestClearHistory'");
    expect(html).toContain("type: 'requestClearHistoryEntry'");
    expect(html).toContain("msg.type === 'historyEntryCleared'");
    expect(html).toContain('id="history-risk-filter"');
    expect(html).toContain('id="history-search"');
    expect(html).toContain('class="ext-detail"');
    expect(html).toContain('class="ext-meta"');
    expect(html).toContain('renderHistoryDetail(selectedHistoryEntry.summary)');
    expect(html).toContain('data-action="toggle-extension-detail"');
    expect(html).toContain('data-action="toggle-history-detail"');
    expect(html).toContain('toggleHistoryDetail(');
    expect(html).toContain(
      "renderExpandableList('rf-' + safeId, 'Risk Factors', 'factor', r.riskFactors, 5)",
    );
    expect(html).toContain(
      "renderExpandableList('ts-' + safeId, 'Trust Signals', 'signal', r.trustSignals, 5)",
    );
    expect(html).toContain(
      "renderExpandableList('history-rf-' + safeId, 'Risk Factors', 'factor', r.riskFactors, 5)",
    );
    expect(html).toContain(
      "renderExpandableList('history-ts-' + safeId, 'Trust Signals', 'signal', r.trustSignals, 5)",
    );
    expect(html).toContain("querySelectorAll('.factor-extra, .signal-extra')");
    expect(html).not.toContain('renderExtensionIcon(');
  });

  it('only saves history from explicit actions', () => {
    const html = generateDashboardHtml();
    expect(html).toContain(
      "vscode.postMessage({ type: 'requestClearHistory' });",
    );
    expect(html).toContain(
      "vscode.postMessage({ type: 'requestClearHistoryEntry', id: id });",
    );
    expect(html).not.toContain(
      "vscode.postMessage({ type: 'saveHistory', history: [] });",
    );
  });

  it('has risk filter options', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('value="all"');
    expect(html).toContain('value="low"');
    expect(html).toContain('value="moderate"');
    expect(html).toContain('value="high"');
    expect(html).toContain('value="critical"');
  });
});
