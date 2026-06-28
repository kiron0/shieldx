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
        <span id="header-badge" class="badge-count"><span class="badge-num">0</span><span class="badge-label">scanned</span></span>
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
        <button class="nav-tab active" data-tab="overview" data-action="tab">Overview</button>
        <button class="nav-tab" data-tab="extensions" data-action="tab">Extensions</button>
        <button class="nav-tab" data-tab="history" data-action="tab">History</button>
        <div class="nav-indicator"></div>
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
        <button class="score-explainer-trigger" data-action="show-score-explainer" style="align-self:flex-start">
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
        <div class="ext-toolbar">
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
        <div id="history-header" class="history-header"><button class="history-back" data-action="history-back">Back</button><button class="history-clear" data-action="clear-history">Clear</button></div>
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
