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
  const authorUrl = EXT_CONFIG.authorUrl;
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
          <button id="score-explainer-trigger" class="icon-btn score-explainer-trigger" data-action="show-score-explainer" title="How scores work">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
          <a class="icon-btn" href="https://shieldx.js.org" target="_blank" rel="noopener noreferrer" title="Detailed docs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </a>
          <button class="icon-btn settings-btn" data-action="tab" data-tab="settings" title="Settings">
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
        <!-- Overview Skeleton -->
        <div id="overview-skeleton" class="skeleton-view">
          <div class="summary-cards">
            <div class="card skeleton-card">
              <div class="card-icon"><div class="skeleton skeleton-inline" style="width:14px;height:14px;border-radius:50%"></div></div>
              <div class="count"><div class="skeleton skeleton-inline" style="width:28px;height:18px;margin-top:2px"></div></div>
              <div class="label"><div class="skeleton skeleton-inline" style="width:32px;height:7px;margin-top:4px"></div></div>
            </div>
            <div class="card skeleton-card">
              <div class="card-icon"><div class="skeleton skeleton-inline" style="width:14px;height:14px;border-radius:50%"></div></div>
              <div class="count"><div class="skeleton skeleton-inline" style="width:28px;height:18px;margin-top:2px"></div></div>
              <div class="label"><div class="skeleton skeleton-inline" style="width:32px;height:7px;margin-top:4px"></div></div>
            </div>
            <div class="card skeleton-card">
              <div class="card-icon"><div class="skeleton skeleton-inline" style="width:14px;height:14px;border-radius:50%"></div></div>
              <div class="count"><div class="skeleton skeleton-inline" style="width:28px;height:18px;margin-top:2px"></div></div>
              <div class="label"><div class="skeleton skeleton-inline" style="width:32px;height:7px;margin-top:4px"></div></div>
            </div>
            <div class="card skeleton-card">
              <div class="card-icon"><div class="skeleton skeleton-inline" style="width:14px;height:14px;border-radius:50%"></div></div>
              <div class="count"><div class="skeleton skeleton-inline" style="width:28px;height:18px;margin-top:2px"></div></div>
              <div class="label"><div class="skeleton skeleton-inline" style="width:32px;height:7px;margin-top:4px"></div></div>
            </div>
            <div class="card skeleton-card">
              <div class="card-icon"><div class="skeleton skeleton-inline" style="width:14px;height:14px;border-radius:50%"></div></div>
              <div class="count"><div class="skeleton skeleton-inline" style="width:28px;height:18px;margin-top:2px"></div></div>
              <div class="label"><div class="skeleton skeleton-inline" style="width:32px;height:7px;margin-top:4px"></div></div>
            </div>
          </div>
          <div class="dist-section">
            <div class="dist-header"><span class="dist-title">Risk Distribution</span></div>
            <div class="dist-bar"><div class="skeleton" style="width:100%;height:100%;border-radius:2px"></div></div>
            <div class="dist-legend" style="display:flex;gap:12px;margin-top:8px">
              <span class="dist-legend-item"><span class="dist-legend-dot skeleton" style="border-radius:50%;width:8px;height:8px"></span><div class="skeleton skeleton-inline" style="width:40px;height:10px"></div></span>
              <span class="dist-legend-item"><span class="dist-legend-dot skeleton" style="border-radius:50%;width:8px;height:8px"></span><div class="skeleton skeleton-inline" style="width:40px;height:10px"></div></span>
              <span class="dist-legend-item"><span class="dist-legend-dot skeleton" style="border-radius:50%;width:8px;height:8px"></span><div class="skeleton skeleton-inline" style="width:40px;height:10px"></div></span>
              <span class="dist-legend-item"><span class="dist-legend-dot skeleton" style="border-radius:50%;width:8px;height:8px"></span><div class="skeleton skeleton-inline" style="width:40px;height:10px"></div></span>
            </div>
          </div>
          <div class="rec-actions" style="margin-top:12px">
            <div class="section-card-header">
              <div class="skeleton skeleton-inline" style="width:14px;height:14px;border-radius:3px;margin-right:6px"></div>
              <div class="skeleton skeleton-inline" style="width:120px;height:11px"></div>
            </div>
            <ul class="rec-list" style="list-style:none;padding:0">
              <li style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span class="rec-dot skeleton" style="border-radius:50%;width:6px;height:6px"></span>
                <div class="skeleton skeleton-inline" style="width:180px;height:10px"></div>
              </li>
              <li style="display:flex;align-items:center;gap:8px">
                <span class="rec-dot skeleton" style="border-radius:50%;width:6px;height:6px"></span>
                <div class="skeleton skeleton-inline" style="width:140px;height:10px"></div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Overview Content -->
        <div id="overview-content" style="display: none; flex-direction: column; gap: 10px; width: 100%;">
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
          <div id="empty-state" class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.25 9 11.5 5.25-1.25 9-6.25 9-11.5V7l-9-5z"/><polyline points="9 12 11 14 15 10"/></svg>
            </div>
            <p class="empty-state-title">Ready to Scan</p>
            <p class="empty-state-sub">Click <strong>Scan Now</strong> to analyze your extensions for security risks.</p>
          </div>
          <div id="last-scan" class="last-scan"></div>
        </div>
      </div>

      <div id="panel-extensions" class="panel">
        <!-- Extensions Skeleton -->
        <div id="extensions-skeleton" class="skeleton-view">
          <div class="ext-toolbar">
            <div class="search-bar">
              <div class="skeleton" style="width:100%;height:28px;border-radius:var(--radius)"></div>
            </div>
          </div>
          <div class="ext-list">
            <div class="ext-item" style="border-left: 3px solid var(--border)">
              <div class="ext-item-header" style="display:flex;align-items:center;gap:10px;width:100%">
                <div class="skeleton" style="width:28px;height:28px;border-radius:6px;flex-shrink:0"></div>
                <div class="ext-item-info" style="flex:1">
                  <div class="skeleton" style="width:120px;height:12px;margin-bottom:6px"></div>
                  <div class="skeleton" style="width:80px;height:8px"></div>
                </div>
                <div class="skeleton" style="width:30px;height:12px;border-radius:4px"></div>
              </div>
            </div>
            <div class="ext-item" style="border-left: 3px solid var(--border)">
              <div class="ext-item-header" style="display:flex;align-items:center;gap:10px;width:100%">
                <div class="skeleton" style="width:28px;height:28px;border-radius:6px;flex-shrink:0"></div>
                <div class="ext-item-info" style="flex:1">
                  <div class="skeleton" style="width:140px;height:12px;margin-bottom:6px"></div>
                  <div class="skeleton" style="width:90px;height:8px"></div>
                </div>
                <div class="skeleton" style="width:30px;height:12px;border-radius:4px"></div>
              </div>
            </div>
            <div class="ext-item" style="border-left: 3px solid var(--border)">
              <div class="ext-item-header" style="display:flex;align-items:center;gap:10px;width:100%">
                <div class="skeleton" style="width:28px;height:28px;border-radius:6px;flex-shrink:0"></div>
                <div class="ext-item-info" style="flex:1">
                  <div class="skeleton" style="width:100px;height:12px;margin-bottom:6px"></div>
                  <div class="skeleton" style="width:70px;height:8px"></div>
                </div>
                <div class="skeleton" style="width:30px;height:12px;border-radius:4px"></div>
              </div>
            </div>
            <div class="ext-item" style="border-left: 3px solid var(--border)">
              <div class="ext-item-header" style="display:flex;align-items:center;gap:10px;width:100%">
                <div class="skeleton" style="width:28px;height:28px;border-radius:6px;flex-shrink:0"></div>
                <div class="ext-item-info" style="flex:1">
                  <div class="skeleton" style="width:130px;height:12px;margin-bottom:6px"></div>
                  <div class="skeleton" style="width:85px;height:8px"></div>
                </div>
                <div class="skeleton" style="width:30px;height:12px;border-radius:4px"></div>
              </div>
            </div>
            <div class="ext-item" style="border-left: 3px solid var(--border)">
              <div class="ext-item-header" style="display:flex;align-items:center;gap:10px;width:100%">
                <div class="skeleton" style="width:28px;height:28px;border-radius:6px;flex-shrink:0"></div>
                <div class="ext-item-info" style="flex:1">
                  <div class="skeleton" style="width:110px;height:12px;margin-bottom:6px"></div>
                  <div class="skeleton" style="width:75px;height:8px"></div>
                </div>
                <div class="skeleton" style="width:30px;height:12px;border-radius:4px"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Extensions Content -->
        <div id="extensions-content" style="display: none; flex-direction: column; gap: 10px; width: 100%;">
          <div id="ext-toolbar" class="ext-toolbar">
            <div class="search-bar">
              <input type="text" id="ext-search" placeholder="Search extensions..." />
              <span id="ext-count" class="ext-count">0</span>
            </div>
            <div class="filter-dropdown-container">
              <button class="icon-btn" id="ext-filter-btn" title="Sort & Filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
              </button>
              <div class="filter-dropdown-panel" id="ext-filter-panel">
                <div class="filter-section">
                  <div class="filter-title">Order</div>
                  <div class="filter-options">
                    <label><input type="radio" name="ext-order" value="asc" checked /> Ascending</label>
                    <label><input type="radio" name="ext-order" value="desc" /> Descending</label>
                  </div>
                </div>
                <div class="filter-section">
                  <div class="filter-title">Filter by Capability</div>
                  <div class="filter-options">
                    <label><input type="checkbox" id="ext-filter-cap-network" value="network" /> Network Access</label>
                    <label><input type="checkbox" id="ext-filter-cap-child" value="childProcess" /> Child Process</label>
                    <label><input type="checkbox" id="ext-filter-cap-fs" value="fs" /> Workspace Files</label>
                  </div>
                </div>
              </div>
            </div>
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
      </div>

      <div id="panel-history" class="panel">
        <!-- History Skeleton -->
        <div id="history-skeleton" class="skeleton-view">
          <div class="history-toolbar">
            <div class="search-bar">
              <div class="skeleton" style="width:100%;height:28px;border-radius:var(--radius)"></div>
            </div>
          </div>
          <div class="history-list">
            <div class="history-item" style="border-left: 3px solid var(--border); padding: 12px; margin-bottom: 8px">
              <div class="history-item-top" style="display:flex;align-items:flex-start;justify-content:space-between;width:100%;gap:10px">
                <div style="flex:1;display:flex;flex-direction:column;gap:6px">
                  <div style="display:flex;justify-content:space-between;gap:8px">
                    <div style="display:flex;flex-direction:column;gap:5px;flex:1">
                      <div class="skeleton" style="width:120px;height:12px"></div>
                      <div class="skeleton" style="width:70px;height:9px"></div>
                    </div>
                    <div class="skeleton" style="width:54px;height:18px;border-radius:999px"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <div class="skeleton" style="width:64px;height:20px;border-radius:999px"></div>
                      <div class="skeleton" style="width:56px;height:20px;border-radius:999px"></div>
                    </div>
                    <div style="display:flex;gap:4px">
                      <div class="skeleton" style="width:36px;height:18px;border-radius:999px"></div>
                      <div class="skeleton" style="width:36px;height:18px;border-radius:999px"></div>
                    </div>
                  </div>
                  <div class="skeleton" style="width:100%;height:8px;border-radius:999px"></div>
                </div>
                <div class="skeleton" style="width:28px;height:28px;border-radius:7px"></div>
              </div>
            </div>
            <div class="history-item" style="border-left: 3px solid var(--border); padding: 12px; margin-bottom: 8px">
              <div class="history-item-top" style="display:flex;align-items:flex-start;justify-content:space-between;width:100%;gap:10px">
                <div style="flex:1;display:flex;flex-direction:column;gap:6px">
                  <div style="display:flex;justify-content:space-between;gap:8px">
                    <div style="display:flex;flex-direction:column;gap:5px;flex:1">
                      <div class="skeleton" style="width:110px;height:12px"></div>
                      <div class="skeleton" style="width:62px;height:9px"></div>
                    </div>
                    <div class="skeleton" style="width:54px;height:18px;border-radius:999px"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <div class="skeleton" style="width:64px;height:20px;border-radius:999px"></div>
                      <div class="skeleton" style="width:56px;height:20px;border-radius:999px"></div>
                    </div>
                    <div style="display:flex;gap:4px">
                      <div class="skeleton" style="width:36px;height:18px;border-radius:999px"></div>
                      <div class="skeleton" style="width:36px;height:18px;border-radius:999px"></div>
                    </div>
                  </div>
                  <div class="skeleton" style="width:100%;height:8px;border-radius:999px"></div>
                </div>
                <div class="skeleton" style="width:28px;height:28px;border-radius:7px"></div>
              </div>
            </div>
            <div class="history-item" style="border-left: 3px solid var(--border); padding: 12px; margin-bottom: 8px">
              <div class="history-item-top" style="display:flex;align-items:flex-start;justify-content:space-between;width:100%;gap:10px">
                <div style="flex:1;display:flex;flex-direction:column;gap:6px">
                  <div style="display:flex;justify-content:space-between;gap:8px">
                    <div style="display:flex;flex-direction:column;gap:5px;flex:1">
                      <div class="skeleton" style="width:130px;height:12px"></div>
                      <div class="skeleton" style="width:76px;height:9px"></div>
                    </div>
                    <div class="skeleton" style="width:54px;height:18px;border-radius:999px"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <div class="skeleton" style="width:64px;height:20px;border-radius:999px"></div>
                      <div class="skeleton" style="width:56px;height:20px;border-radius:999px"></div>
                    </div>
                    <div style="display:flex;gap:4px">
                      <div class="skeleton" style="width:36px;height:18px;border-radius:999px"></div>
                      <div class="skeleton" style="width:36px;height:18px;border-radius:999px"></div>
                    </div>
                  </div>
                  <div class="skeleton" style="width:100%;height:8px;border-radius:999px"></div>
                </div>
                <div class="skeleton" style="width:28px;height:28px;border-radius:7px"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- History Content -->
        <div id="history-content" style="display: none; flex-direction: column; gap: 10px; width: 100%;">
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
      </div>

      <div id="panel-settings" class="panel">
        <!-- Settings Skeleton -->
        <div id="settings-skeleton" class="skeleton-view">
          <div class="settings-panel">
            <div class="settings-section" style="margin-bottom:12px">
              <div class="settings-section-title" style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
                <div class="skeleton skeleton-inline" style="width:14px;height:14px;border-radius:3px"></div>
                <div class="skeleton skeleton-inline" style="width:120px;height:12px"></div>
              </div>
              <div class="setting-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
                <div class="setting-info" style="flex:1">
                  <div class="skeleton" style="width:150px;height:12px;margin-bottom:6px"></div>
                  <div class="skeleton" style="width:220px;height:8px"></div>
                </div>
                <div class="skeleton" style="width:34px;height:18px;border-radius:9px"></div>
              </div>
              <div class="setting-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
                <div class="setting-info" style="flex:1">
                  <div class="skeleton" style="width:120px;height:12px;margin-bottom:6px"></div>
                  <div class="skeleton" style="width:180px;height:8px"></div>
                </div>
                <div class="skeleton" style="width:34px;height:18px;border-radius:9px"></div>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title" style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
                <div class="skeleton skeleton-inline" style="width:14px;height:14px;border-radius:3px"></div>
                <div class="skeleton skeleton-inline" style="width:100px;height:12px"></div>
              </div>
              <div class="setting-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
                <div class="setting-info" style="flex:1">
                  <div class="skeleton" style="width:130px;height:12px;margin-bottom:6px"></div>
                  <div class="skeleton" style="width:190px;height:8px"></div>
                </div>
                <div class="skeleton" style="width:34px;height:18px;border-radius:9px"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Content -->
        <div id="settings-content" style="display: none; flex-direction: column; gap: 10px; width: 100%;">
          <div class="settings-panel">
            <div class="settings-section">
              <div class="settings-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.25 9 11.5 5.25-1.25 9-6.25 9-11.5V7l-9-5z"/></svg>
                <span>Scan &amp; Analysis</span>
              </div>
              <label class="setting-row" for="setting-autoScan">
                <div class="setting-info"><span class="setting-label">Auto-scan on startup</span><span class="setting-desc">Automatically scan extensions when the editor starts</span></div>
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
    </div>

    <div class="app-bottom">
      <div class="about-box">
        <div class="about-header">
          <div class="about-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.25 9 11.5 5.25-1.25 9-6.25 9-11.5V7l-9-5z"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <div>
            <div class="about-title">${title} <sub style="font-size:8px;opacity:.45;font-weight:500">v${version}</sub></div>
            <div class="about-author">by <a href="${authorUrl}" target="_blank" rel="noopener noreferrer">${author}</a></div>
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
