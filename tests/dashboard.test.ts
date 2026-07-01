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
    expect(html).toContain('id="ext-toolbar"');
    expect(html).toContain('id="ext-count"');
    expect(html).toContain('ext-toolbar-actions');
    expect(html).toContain('class="history-clear-btn"');
    expect(html).toContain('.history-toolbar.has-history .history-clear-btn');
    expect(html).toContain('id="history-detail"');
    expect(html).toContain('history-tools');
    expect(html).toContain('.ext-icon');
    expect(html).toContain('.ext-icon-fallback');
    expect(html).toContain('score-explainer');
    expect(html).toContain('ext-toolbar');
    expect(html).toContain('history-inline-results');
    expect(html).toContain(
      '#empty-state,#ext-empty,#history-empty{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0}',
    );
    expect(html).toContain('#panel-history{overflow:hidden}');
    expect(html).toContain('#history-content{flex:1 1 auto;min-height:0}');
    expect(html).toContain(
      '.history-list.history-list-expanded{overflow:hidden}',
    );
    expect(html).toContain(
      '.history-inline-results{overflow-y:auto;flex:1 1 auto;min-height:0;width:100%;padding-right:2px}',
    );
    expect(html).toContain('https://kiron.dev');
    expect(html).toContain(
      'class="about-author">by <a href="https://kiron.dev" target="_blank" rel="noopener noreferrer">',
    );
    expect(html).toContain(
      '.about-author a:hover{color:#0ea5e9;opacity:1;text-decoration:underline}',
    );
  });

  it('has scan and export buttons', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('id="btn-scan"');
    expect(html).toContain('>Scan Now<');
    expect(html).toContain('>Cancel<');
    expect(html).toContain('data-action="export"');
    expect(html).toContain('title="Export Report"');
    expect(html).not.toContain('data-action="show-history"');
  });

  it('has settings gear button in header', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('class="icon-btn settings-btn"');
    expect(html).toContain('data-tab="settings"');
    expect(html).toContain('title="Settings"');
    expect(html).not.toContain('badge-count');
    expect(html).not.toContain('badge-num');
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
    expect(html).not.toContain('data-action="history-back"');
    expect(html).toContain("type: 'cancelScan'");
    expect(html).toContain("type: 'directExport'");
    expect(html).toContain('history-inline-results');
    expect(html).toContain('renderHistoryInlineDetail(s.summary, historyId)');
    expect(html).toContain('expandedHistoryEntryId === historyId');
    expect(html).toContain('id="score-explainer-trigger"');
    expect(html).toContain('updateHistoryDependentUi()');
    expect(html).toContain(
      "extSearch.style.display = hasHistory ? '' : 'none'",
    );
    expect(html).toContain("scoreExplainer.style.display = 'inline-flex'");
    expect(html).toContain("header.style.display = 'none'");
    expect(html).toContain("empty.style.display = 'flex'");
    expect(html).toContain("c.style.display = 'none'");
    expect(html).toContain("if (detail) detail.style.display = 'none'");
    expect(html).toContain('openLatestHistoryEntry()');
    expect(html).toContain("type: 'forceClearHistory'");
    expect(html).toContain("type: 'forceClearHistoryEntry'");
    expect(html).toContain("msg.type === 'historyEntryCleared'");
    expect(html).toContain("msg.type === 'scanCleared'");
    expect(html).toContain("'history-risk-filter'");
    expect(html).toContain("'history-search'");
    expect(html).toContain('data-history-search-id');
    expect(html).toContain('data-history-filter-id');
    expect(html).toContain('class="ext-detail"');
    expect(html).toContain('class="ext-meta"');
    expect(html).toContain("clickAction: 'open-extension'");
    expect(html).toContain("toggleAction: 'toggle-history-detail'");
    expect(html).toContain('toggleHistoryDetail(');
    expect(html).toContain('scrollHistoryItemIntoView(');
    expect(html).toContain('renderExtensionIcon(r)');
    expect(html).toContain('renderHistoryInlineDetail(s.summary, historyId)');
    expect(html).toContain(
      "renderExpandableList('history-rf-' + safeId, 'Risk Factors', 'factor', r.riskFactors, 5)",
    );
    expect(html).toContain(
      "renderExpandableList('history-ts-' + safeId, 'Trust Signals', 'signal', r.trustSignals, 5)",
    );
    expect(html).toContain("querySelectorAll('.factor-extra, .signal-extra')");
    expect(html).toContain('data-action="select-history"');
    expect(html).toContain(
      'class="history-item-main history-item-header-toggle" data-action="select-history"',
    );
    expect(html).toContain('class="history-action-btn');
    expect(html).toContain('#ext-list .ext-item');
    expect(html).toContain('getHistoryRiskCounts(s)');
    expect(html).toContain('getHistoryRiskLevel(historyCounts)');
    expect(html).toContain('getHistoryAverageScore(s)');
    expect(html).toContain('data-history-level="');
    expect(html).toContain('class="h-card-head"');
    expect(html).toContain('class="h-level-chip"');
    expect(html).toContain('class="h-meta-row"');
    expect(html).toContain('class="h-stat-row"');
    expect(html).toContain('class="h-stat-pill');
    expect(html).toContain('avg</span>');
  });

  it('has nav tabs with icons', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('data-tab="overview"');
    expect(html).toContain('data-tab="extensions"');
    expect(html).toContain('data-tab="history"');

    const tabMatches = html.match(/class="nav-tab[^"]*"/g);
    expect(tabMatches).toBeTruthy();
    expect(tabMatches!.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('>Overview<');
    expect(html).toContain('>Extensions<');
    expect(html).toContain('>History<');
  });

  it('has settings panel with all setting controls', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('id="panel-settings"');
    expect(html).toContain('class="settings-panel"');
    expect(html).toContain('class="settings-section"');
    expect(html).toContain('class="settings-section-title"');
  });

  it('has auto-scan on startup toggle', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('id="setting-autoScan"');
    expect(html).toContain('data-setting="autoScanOnStartup"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('class="toggle-switch"');
    expect(html).toContain('class="toggle-slider"');
    expect(html).toContain('Auto-scan on startup');
  });

  it('has scan node_modules toggle', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('id="setting-scanNodeModules"');
    expect(html).toContain('data-setting="scanNodeModules"');
    expect(html).toContain('Scan node_modules');
  });

  it('has enable OSV scan toggle', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('id="setting-enableOsv"');
    expect(html).toContain('data-setting="enableOsvScan"');
    expect(html).toContain('Enable OSV vulnerability scan');
  });

  it('has warn on high risk toggle', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('id="setting-warnHighRisk"');
    expect(html).toContain('data-setting="warnOnHighRisk"');
    expect(html).toContain('Warn on high risk');
  });

  it('has minimum warning level select', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('id="setting-minWarningLevel"');
    expect(html).toContain('data-setting="minimumWarningLevel"');
    expect(html).toContain('class="setting-select"');
    expect(html).toContain('value="moderate"');
    expect(html).toContain('value="high"');
    expect(html).toContain('value="critical"');
    expect(html).toContain('Minimum warning level');
  });

  it('has report format select', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('id="setting-reportFormat"');
    expect(html).toContain('data-setting="reportFormat"');
    expect(html).toContain('>Markdown<');
    expect(html).toContain('>JSON<');
    expect(html).toContain('>HTML<');
    expect(html).toContain('>PDF<');
    expect(html).toContain('>CSV<');
    expect(html).toContain('>SARIF<');
  });

  it('has settings section titles with icons', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('Scan &amp; Analysis');
    expect(html).toContain('Notifications');
    expect(html).toContain('Export');
  });

  it('only saves history from explicit actions', () => {
    const html = generateDashboardHtml();
    expect(html).toContain(
      "vscode.postMessage({ type: 'forceClearHistory' });",
    );
    expect(html).toContain(
      "vscode.postMessage({ type: 'forceClearHistoryEntry', id: id });",
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

  it('has settings message handlers in script', () => {
    const html = generateDashboardHtml();
    expect(html).toContain("msg.type === 'settingsData'");
    expect(html).toContain('applySettings(msg.settings)');
    expect(html).toContain("type: 'updateSetting'");
    expect(html).toContain("type: 'requestSettings'");
    expect(html).toContain('currentSettings');
  });

  it('has export format builder reading currentSettings', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('buildExportFormatOptions()');
    expect(html).toContain('currentSettings.reportFormat');
  });

  it('has settings gear active state in switchTab', () => {
    const html = generateDashboardHtml();
    expect(html).toContain("tab === 'settings'");
    expect(html).toContain('.settings-btn');
  });

  it('has settings CSS styles', () => {
    const html = generateDashboardHtml();
    expect(html).toContain('.settings-panel');
    expect(html).toContain('.settings-section');
    expect(html).toContain('.settings-section-title');
    expect(html).toContain('.setting-row');
    expect(html).toContain('.setting-label');
    expect(html).toContain('.setting-desc');
    expect(html).toContain('.toggle-switch');
    expect(html).toContain('.toggle-slider');
    expect(html).toContain('.setting-select');
    expect(html).toContain('.icon-btn');
    expect(html).toContain('.settings-btn');
    expect(html).toContain('.settings-btn.active');
    expect(html).toContain('.icon-btn:hover');
    expect(html).toContain(
      '.score-explainer-trigger{display:inline-flex;font-size:0;opacity:.5}',
    );
  });
});
