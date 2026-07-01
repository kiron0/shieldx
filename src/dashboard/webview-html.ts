import { WEBVIEW_DATE_FORMATTERS_SCRIPT } from '../utils/date-format';
import { EXT_CONFIG } from '../config';
import {
  getDashboardNonce,
  getDashboardScript,
  getDashboardStyles,
} from '../webview/dashboard-assets';

export function generateDashboardHtml(cspSource: string): string {
  const nonce = getDashboardNonce();
  const title = EXT_CONFIG.name;
  const version = EXT_CONFIG.version;
  const author = EXT_CONFIG.author;
  const description = EXT_CONFIG.description;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>${title}</title>
  <style>${getDashboardStyles()}</style>
</head>
<body>
  <div class="app-shell">
    <div class="app-top">
      <div class="header">
        <div class="header-left">
          <div class="header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.25 9 11.5 5.25-1.25 9-6.25 9-11.5V7l-9-5z"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <div class="header-text">
            <h1>${title} <sub style="font-size:9px;opacity:.45;font-weight:500">v${version}</sub></h1>
            <span class="header-slogan">${EXT_CONFIG.slogan}</span>
          </div>
        </div>
        <div class="header-actions">
          <a class="header-link-btn" href="https://shieldx.js.org" target="_blank" rel="noopener noreferrer" title="Detailed docs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>
          </a>
          <button class="settings-btn" data-action="tab" data-tab="settings" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
        </div>
      </div>

      <div id="progress-section">
        <div class="progress-row">
          <div class="progress-track"><div id="progress-fill" class="progress-fill"></div></div>
          <button class="progress-cancel" data-action="cancel-scan">Cancel</button>
        </div>
        <div class="progress-info"><span id="progress-text">Scanning...</span><span id="progress-pct">0%</span></div>
      </div>

      <div class="quick-actions">
        <button class="btn-scan" id="btn-scan" data-action="scan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.25 9 11.5 5.25-1.25 9-6.25 9-11.5V7l-9-5z"/></svg>
          <span>Scan Now</span>
        </button>
        <button class="btn-export" data-action="export" title="Export Report">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Export</span>
        </button>
      </div>

      <div class="nav-tabs">
        <button class="nav-tab active" data-tab="overview" data-action="tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.25 9 11.5 5.25-1.25 9-6.25 9-11.5V7l-9-5z"/><polyline points="9 12 11 14 15 10"/></svg>
          <span>Overview</span>
        </button>
        <button class="nav-tab" data-tab="extensions" data-action="tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span>Extensions</span>
        </button>
        <button class="nav-tab" data-tab="history" data-action="tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>History</span>
        </button>
      </div>
    </div>

    <div class="app-main">
      <div id="panel-overview" class="panel visible">
        <div id="summary-cards" class="summary-cards"></div>
        <div class="dist-section hidden" id="dist-section">
          <div class="dist-header"><span class="dist-title">Risk Distribution</span></div>
          <div id="dist-bar" class="dist-bar"></div>
          <div id="dist-legend" class="dist-legend"></div>
        </div>
        <div id="rec-actions" class="rec-actions hidden">
          <div class="section-card-header">
            <svg class="section-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span class="section-card-title">Recommended Actions</span>
          </div>
          <ul id="rec-list" class="rec-list"></ul>
        </div>
        <button id="score-explainer-trigger" class="score-explainer-trigger" data-action="show-score-explainer" style="align-self:flex-start">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span style="text-decoration:underline">How scores work</span>
        </button>
        <div id="empty-state" class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.25 9 11.5 5.25-1.25 9-6.25 9-11.5V7l-9-5z"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <p class="empty-state-title">Ready to Scan</p>
          <p class="empty-state-sub">Click <strong>Scan Now</strong> to analyze your extensions for security risks.</p>
        </div>
        <div id="last-scan" class="last-scan"></div>
      </div>

      <div id="panel-extensions" class="panel">
        <div id="ext-toolbar" class="ext-toolbar">
          <div class="search-bar"><input type="text" id="ext-search" placeholder="Search extensions..." /><span id="ext-count" class="ext-count">0</span></div>
          <div class="filter-bar"></div>
        </div>
        <div id="ext-list" class="ext-list"></div>
        <div id="ext-empty" class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </div>
          <p class="empty-state-title">No Extensions Found</p>
          <p class="empty-state-sub">Try adjusting your search query.</p>
        </div>
      </div>

      <div id="panel-history" class="panel">
        <div id="history-header" class="history-toolbar">
          <div class="search-bar">
            <input type="text" id="history-main-search" placeholder="Search history..." />
            <button class="history-clear-btn" data-action="clear-history" title="Clear All History">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
        <div id="history-list" class="history-list"></div>
        <div id="history-detail" class="history-detail"></div>
        <div id="history-empty" class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <p class="empty-state-title">No History Yet</p>
          <p class="empty-state-sub">Scan results will appear here after your first scan.</p>
        </div>
      </div>

      <div id="panel-settings" class="panel">
        <div class="settings-panel">
          <div class="settings-section">
            <div class="settings-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.25 9 11.5 5.25-1.25 9-6.25 9-11.5V7l-9-5z"/></svg>
              <span>Scan &amp; Analysis</span>
            </div>
            <label class="setting-row" for="setting-autoScan">
              <div class="setting-info"><span class="setting-label">Auto-scan on startup</span><span class="setting-desc">Automatically scan extensions when VS Code starts</span></div>
              <div class="toggle-switch"><input type="checkbox" id="setting-autoScan" data-setting="autoScanOnStartup" /><span class="toggle-slider"></span></div>
            </label>
            <label class="setting-row" for="setting-scanNodeModules">
              <div class="setting-info"><span class="setting-label">Scan node_modules</span><span class="setting-desc">Deep scan node_modules inside extensions (slower)</span></div>
              <div class="toggle-switch"><input type="checkbox" id="setting-scanNodeModules" data-setting="scanNodeModules" /><span class="toggle-slider"></span></div>
            </label>
            <label class="setting-row" for="setting-enableOsv">
              <div class="setting-info"><span class="setting-label">Enable OSV vulnerability scan</span><span class="setting-desc">Runtime vulnerability scanning via OSV.dev API</span></div>
              <div class="toggle-switch"><input type="checkbox" id="setting-enableOsv" data-setting="enableOsvScan" /><span class="toggle-slider"></span></div>
            </label>
          </div>
          <div class="settings-section">
            <div class="settings-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              <span>Notifications</span>
            </div>
            <label class="setting-row" for="setting-warnHighRisk">
              <div class="setting-info"><span class="setting-label">Warn on high risk</span><span class="setting-desc">Show warning when high-risk extensions are detected</span></div>
              <div class="toggle-switch"><input type="checkbox" id="setting-warnHighRisk" data-setting="warnOnHighRisk" /><span class="toggle-slider"></span></div>
            </label>
            <label class="setting-row" for="setting-minWarningLevel">
              <div class="setting-info"><span class="setting-label">Minimum warning level</span><span class="setting-desc">Minimum risk level to trigger a notification</span></div>
              <select class="setting-select" id="setting-minWarningLevel" data-setting="minimumWarningLevel">
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>
          <div class="settings-section">
            <div class="settings-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Export</span>
            </div>
            <label class="setting-row" for="setting-reportFormat">
              <div class="setting-info"><span class="setting-label">Default report format</span><span class="setting-desc">Format used when exporting security reports</span></div>
              <select class="setting-select" id="setting-reportFormat" data-setting="reportFormat">
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
                <option value="html">HTML</option>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="sarif">SARIF</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="app-bottom">
      <div class="about-box">
        <div class="about-header">
          <div class="about-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.25 9 11.5 5.25-1.25 9-6.25 9-11.5V7l-9-5z"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <div>
            <div class="about-title">${title} <sub style="font-size:8px;opacity:.45;font-weight:500">v${version}</sub></div>
            <div class="about-author">${author}</div>
          </div>
        </div>
        <div class="about-desc">${description}</div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">${getDashboardScript(WEBVIEW_DATE_FORMATTERS_SCRIPT)}</script>
</body>
</html>`;
}
