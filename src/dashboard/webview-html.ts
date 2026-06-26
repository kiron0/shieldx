import { WEBVIEW_DATE_FORMATTERS_SCRIPT } from '../utils/date-format';

export function generateDashboardHtml(cspSource: string): string {
  const nonce = getNonce();
  const aboutTitle = 'Shieldex';
  const aboutAuthor = 'Toufiq Hasan Kiron';
  const aboutDescription =
    'Scan installed VS Code extensions for security risks, suspicious behavior, and excessive permissions.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Shieldex</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #d4d4d4);
      --border: var(--vscode-panel-border, #3c3c3c);
      --card-bg: var(--vscode-editorWidget-background, #252526);
      --accent: var(--vscode-button-background, #007acc);
      --accent-fg: var(--vscode-button-foreground, #ffffff);
      --sec-bg: var(--vscode-button-secondaryBackground, #3c3c3c);
      --sec-fg: var(--vscode-button-secondaryForeground, #cccccc);
      --input-bg: var(--vscode-input-background, #3c3c3c);
      --input-fg: var(--vscode-input-foreground, #cccccc);
      --input-border: var(--vscode-input-border, #3c3c3c);
      --input-ph: var(--vscode-input-placeholderForeground, #888);
      --low: #4caf50;
      --moderate: #ff9800;
      --high: #f44336;
      --critical: #9c27b0;
      --radius: 6px;
      --pad: 10px;
    }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: 13px; background: var(--bg); color: var(--fg);
      line-height: 1.5; overflow: hidden; height: 100vh;
    }
    .app-shell { height: 100%; display: flex; flex-direction: column; padding: var(--pad); gap: 10px; }
    .app-top, .app-bottom { flex: 0 0 auto; }
    .app-main { flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; }

    /* Header */
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .header h1 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; flex: 1; }
    .badge-count { background: var(--accent); color: var(--accent-fg); font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }

    /* Progress */
    #progress-section { display: none; margin-bottom: 10px; }
    #progress-section.visible { display: block; }
    .progress-row { display: flex; align-items: center; gap: 8px; }
    .progress-track { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .progress-fill { height: 100%; width: 0%; background: var(--accent); border-radius: 2px; transition: width 0.3s ease; }
    .progress-info { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.6; margin-top: 4px; }
    .progress-cancel { display: none; background: var(--sec-bg); color: var(--sec-fg); border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; }
    #progress-section.visible .progress-cancel { display: inline-flex; }

    /* Quick Actions */
    .quick-actions { display: flex; gap: 6px; margin-bottom: 10px; }
    .quick-actions button { background: var(--accent); color: var(--accent-fg); border: none; padding: 7px 10px; border-radius: var(--radius); font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: opacity 0.15s; }
    .quick-actions button:hover { opacity: 0.85; }
    .quick-actions .btn-primary { flex: 1; }
    .quick-actions button.secondary { flex: 0 0 auto; background: var(--sec-bg); color: var(--sec-fg); }
    .quick-actions button.secondary svg { width: 14px; height: 14px; fill: currentColor; }
    .quick-actions button:disabled { opacity: 0.35; cursor: not-allowed; }

    /* Nav Tabs */
    .nav-tabs { display: flex; gap: 2px; background: var(--card-bg); border-radius: var(--radius); padding: 2px; margin-bottom: 10px; }
    .nav-tab { flex: 1; text-align: center; padding: 5px 4px; font-size: 11px; font-weight: 600; border: none; background: transparent; color: var(--fg); opacity: 0.5; cursor: pointer; border-radius: 4px; transition: all 0.15s; }
    .nav-tab:hover { opacity: 0.7; background: rgba(255,255,255,0.04); }
    .nav-tab.active { opacity: 1; background: var(--bg); }

    /* Panels */
    .panel { display: none; height: 100%; overflow-y: auto; padding-right: 2px; min-width: 0; }
    .panel.visible { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; }

    /* Summary Cards */
    .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 6px; text-align: center; }
    .card .count { font-size: 18px; font-weight: 700; line-height: 1.2; }
    .card .label { font-size: 9px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.3px; }
    .card.low .count { color: var(--low); }
    .card.moderate .count { color: var(--moderate); }
    .card.high .count { color: var(--high); }
    .card.critical .count { color: var(--critical); }

    /* Distribution Bar */
    .dist-bar { display: flex; height: 6px; border-radius: 3px; overflow: hidden; background: var(--border); margin-bottom: 10px; }
    .dist-seg { height: 100%; transition: width 0.3s ease; }
    .dist-seg.low { background: var(--low); }
    .dist-seg.moderate { background: var(--moderate); }
    .dist-seg.high { background: var(--high); }
    .dist-seg.critical { background: var(--critical); }

    /* Recommended Actions */
    .rec-actions { margin-bottom: 10px; }
    .rec-actions.hidden { display: none; }
    .rec-actions summary { font-size: 11px; font-weight: 600; cursor: pointer; padding: 4px 0; opacity: 0.7; }
    .rec-actions ul { list-style: none; margin-top: 4px; }
    .rec-actions li { padding: 3px 0; font-size: 11px; display: flex; align-items: center; gap: 6px; }
    .rec-actions li::before { content: '\\2192'; opacity: 0.4; }
    .score-explainer { margin-bottom: 10px; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card-bg); }
    .score-explainer-title { font-size: 11px; font-weight: 700; margin-bottom: 4px; }
    .score-explainer-copy { font-size: 11px; opacity: 0.72; }
    .score-explainer-scale { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
    .score-band { font-size: 10px; padding: 2px 6px; border-radius: 999px; background: rgba(255,255,255,0.05); }
    .score-band.low { color: var(--low); }
    .score-band.moderate { color: var(--moderate); }
    .score-band.high { color: var(--high); }
    .score-band.critical { color: var(--critical); }

    /* Search + Filter */
    .search-bar { margin-bottom: 6px; position: relative; }
    .search-bar input { width: 100%; background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); border-radius: var(--radius); padding: 5px 42px 5px 8px; font-size: 12px; font-family: inherit; outline: none; transition: border-color 0.15s; }
    .search-bar input:focus { border-color: var(--accent); }
    .search-bar input::placeholder { color: var(--input-ph); }
    .filter-bar { display: flex; gap: 6px; align-items: center; justify-content: flex-end; margin-bottom: 8px; }
    .ext-count { position: absolute; top: 50%; right: 10px; transform: translateY(-50%); font-size: 10px; opacity: 0.5; pointer-events: none; }
    .ext-toolbar { position: sticky; top: 0; z-index: 3; background: var(--bg); padding-bottom: 6px; margin-bottom: 2px; }

    /* Extension List */
    .ext-list { display: flex; flex-direction: column; gap: 3px; width: 100%; padding-left: 1px; padding-right: 1px; }
    .ext-item { background: var(--card-bg); border: 1px solid var(--border); border-left: 3px solid var(--border); border-radius: var(--radius); padding: 8px; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; width: 100%; }
    .ext-item:hover { border-color: var(--accent); }
    .ext-item[data-level="low"] { border-left-color: var(--low); }
    .ext-item[data-level="moderate"] { border-left-color: var(--moderate); }
    .ext-item[data-level="high"] { border-left-color: var(--high); }
    .ext-item[data-level="critical"] { border-left-color: var(--critical); }
    .ext-item-header { display: flex; align-items: center; gap: 10px; }
    .ext-icon-wrap { width: 24px; height: 24px; flex: 0 0 24px; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; }
    .ext-icon { width: 100%; height: 100%; object-fit: cover; display: block; }
    .ext-icon-fallback { font-size: 10px; font-weight: 700; opacity: 0.65; text-transform: uppercase; }
    .ext-item-info { flex: 1; min-width: 0; }
    .ext-name { font-weight: 600; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
    .ext-pub { font-size: 10px; opacity: 0.45; display: block; }
    .ext-version { font-size: 11px; font-weight: 600; white-space: nowrap; opacity: 0.7; margin-left: auto; }
    .ext-score { font-size: 12px; font-weight: 700; white-space: nowrap; }
    .ext-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-left: auto; }
    .item-toggle { background: none; border: none; color: var(--fg); opacity: 0.55; cursor: pointer; font-size: 12px; padding: 0; line-height: 1; }
    .item-toggle:hover { opacity: 0.85; }

    /* Status Chip */
    .status-chip { font-size: 9px; padding: 1px 6px; border-radius: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
    .status-chip.low { background: #4caf5020; color: var(--low); }
    .status-chip.moderate { background: #ff980020; color: var(--moderate); }
    .status-chip.high { background: #f4433620; color: var(--high); }
    .status-chip.critical { background: #9c27b020; color: var(--critical); }

    /* Extension Detail */
    .ext-detail { display: none; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 11px; }
    .ext-detail.open { display: block; }
    .detail-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .detail-label { opacity: 0.5; }

    /* Score Bar */
    .score-wrap { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
    .score-bar { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
    .score-num { font-size: 11px; font-weight: 700; white-space: nowrap; min-width: 40px; text-align: right; }

    /* Risk Factors */
    .section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; opacity: 0.5; margin: 6px 0 4px; letter-spacing: 0.3px; }
    .factor { padding: 2px 0; font-size: 10px; color: var(--high); }
    .factor::before { content: '\\2022 '; opacity: 0.5; }
    .show-more-btn { background: none; border: none; color: var(--accent); font-size: 10px; cursor: pointer; padding: 2px 0; }
    .show-more-btn:hover { text-decoration: underline; }

    /* Trust Signals */
    .signal { padding: 2px 0; font-size: 10px; color: var(--low); }
    .signal::before { content: '+ '; opacity: 0.5; font-weight: 700; }

    /* Recommendation */
    .rec-box { margin-top: 6px; padding: 6px 8px; border-radius: 4px; font-size: 11px; background: #f4433612; border-left: 2px solid var(--high); }
    .rec-box.safe { background: #4caf5012; border-left-color: var(--low); }

    /* Detail Actions */
    .detail-actions { margin-top: 8px; display: flex; gap: 6px; }
    .detail-actions button { background: var(--sec-bg); color: var(--sec-fg); border: none; padding: 4px 10px; border-radius: var(--radius); font-size: 11px; cursor: pointer; transition: opacity 0.15s; }
    .detail-actions button:hover { opacity: 0.8; }

    /* History */
    .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .history-header button { background: none; border: none; color: var(--fg); font-size: 10px; cursor: pointer; opacity: 0.4; }
    .history-header button:hover { opacity: 0.7; }
    .history-header .history-back { display: none; opacity: 0.7; }
    .history-header .history-clear { display: none; margin-left: auto; }
    .history-header.has-history .history-clear { display: inline-flex; }
    .history-header.detail .history-back { display: inline-flex; }
    #panel-history { overflow: hidden; }
    .history-list { display: flex; flex-direction: column; gap: 4px; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-right: 2px; }
    .history-list.history-list-expanded { overflow: hidden; }
    .history-item { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px; font-size: 11px; }
    .history-item.history-item-expanded { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
    .history-inline-detail { margin-top: 10px; display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; border-top: 1px solid var(--border); padding-top: 8px; }
    .history-detail { display: none; }
    .history-detail.visible { display: block; }
    .history-tools { display: flex; gap: 6px; align-items: center; margin: 8px 0; }
    .history-tools input, .history-tools select { background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); border-radius: var(--radius); padding: 5px 8px; font-size: 12px; font-family: inherit; outline: none; transition: border-color 0.15s; }
    .history-tools input:focus, .history-tools select:focus { border-color: var(--accent); }
    .history-tools input::placeholder { color: var(--input-ph); }
    .history-tools input { flex: 1; }
    .history-inline-detail .history-tools { position: sticky; top: 0; z-index: 2; margin-top: 0; padding-bottom: 8px; background: var(--card-bg); }
    .history-inline-results { overflow-y: auto; min-height: 0; padding-right: 2px; }
    .history-item-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .history-item-main { flex: 1; min-width: 0; }
    .history-item-header-toggle { cursor: pointer; }
    .history-item-actions { display: flex; gap: 6px; }
    .history-item-actions button { background: none; border: none; color: var(--fg); font-size: 10px; cursor: pointer; opacity: 0.55; }
    .history-item-actions .clear-history-entry { padding: 0; }
    .history-item-actions .history-arrow { padding: 0; font-size: 12px; }
    .h-time { font-size: 10px; opacity: 0.45; }
    .h-stats { display: flex; gap: 8px; margin-top: 3px; width: fit-content; }
    .h-stats span { font-size: 10px; }
    .h-stats .h-high { color: var(--high); font-weight: 600; }
    .h-stats .h-crit { color: var(--critical); font-weight: 600; }

    /* Empty State */
    .empty-state { text-align: center; padding: 28px 16px; opacity: 0.35; }
    #history-empty { flex: 1 1 auto; display: flex; align-items: center; justify-content: center; }
    .empty-state svg { width: 36px; height: 36px; margin-bottom: 8px; }
    .empty-state p { font-size: 12px; }

    /* Last Scan */
    .last-scan { font-size: 10px; opacity: 0.35; text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }

    /* About */
    .about-box { border-top: 1px solid var(--border); padding-top: 10px; }
    .about-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
    .about-author { font-size: 10px; opacity: 0.6; margin-top: 2px; }
    .about-desc { font-size: 10px; opacity: 0.7; margin-top: 6px; }

    /* Extensions Panel */
    #ext-list .ext-item { border-left-width: 1px; }
    #ext-list .ext-item[data-level="low"],
    #ext-list .ext-item[data-level="moderate"],
    #ext-list .ext-item[data-level="high"],
    #ext-list .ext-item[data-level="critical"] { border-left-color: var(--border); }
    #ext-list .ext-item:hover { box-shadow: 0 0 0 1px var(--accent); }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  </style>
</head>
<body>
  <div class="app-shell">
    <div class="app-top">
      <div class="header">
        <h1>Shieldex</h1>
        <span id="header-badge" class="badge-count">0</span>
      </div>

      <div id="progress-section">
        <div class="progress-row">
          <div class="progress-track"><div id="progress-fill" class="progress-fill"></div></div>
          <button class="progress-cancel" data-action="cancel-scan">Cancel</button>
        </div>
        <div class="progress-info"><span id="progress-text">Scanning...</span><span id="progress-pct">0%</span></div>
      </div>

      <div class="quick-actions">
        <button class="btn-primary" id="btn-scan" data-action="scan">Scan</button>
        <button class="secondary" data-action="export" title="Export Report">Export</button>
      </div>

      <div class="nav-tabs">
        <button class="nav-tab active" data-tab="overview" data-action="tab">Overview</button>
        <button class="nav-tab" data-tab="extensions" data-action="tab">Extensions</button>
        <button class="nav-tab" data-tab="history" data-action="tab">History</button>
      </div>
    </div>

    <div class="app-main">
      <div id="panel-overview" class="panel visible">
        <div id="summary-cards" class="summary-cards"></div>
        <div id="dist-bar" class="dist-bar"></div>
        <div class="score-explainer">
          <div class="score-explainer-title">How scores work</div>
          <div class="score-explainer-copy">Lower score = safer. Higher score = more risky signals found. Treat high and critical first.</div>
          <div class="score-explainer-scale">
            <span class="score-band low">0-25 Low</span>
            <span class="score-band moderate">26-50 Moderate</span>
            <span class="score-band high">51-75 High</span>
            <span class="score-band critical">76-100 Critical</span>
          </div>
        </div>
        <div id="rec-actions" class="rec-actions hidden">
          <details><summary>Recommended Actions</summary><ul id="rec-list"></ul></details>
        </div>
        <div id="empty-state" class="empty-state">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
          <p>No scan yet.<br>Click <strong>Scan</strong> to begin.</p>
        </div>
        <div id="last-scan" class="last-scan"></div>
      </div>

      <div id="panel-extensions" class="panel">
        <div class="ext-toolbar">
          <div class="search-bar"><input type="text" id="ext-search" placeholder="Search extensions..." /><span id="ext-count" class="ext-count">0</span></div>
          <div class="filter-bar">
          </div>
        </div>
        <div id="ext-list" class="ext-list"></div>
        <div id="ext-empty" class="empty-state"><p>No extensions found.</p></div>
      </div>

      <div id="panel-history" class="panel">
        <div id="history-header" class="history-header"><button class="history-back" data-action="history-back">Back</button><button class="history-clear" data-action="clear-history">Clear</button></div>
        <div id="history-list" class="history-list"></div>
        <div id="history-detail" class="history-detail"></div>
        <div id="history-empty" class="empty-state"><p>No scan history yet.</p></div>
      </div>
    </div>

    <div class="app-bottom">
      <div class="about-box">
        <div class="about-title">${aboutTitle}</div>
        <div class="about-author">${aboutAuthor}</div>
        <div class="about-desc">${aboutDescription}</div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    (function() {
      var vscode = acquireVsCodeApi();
      var scanData = null;
      var scanHistory = [];
      var expandedHistoryEntryId = null;
      var shouldAutoOpenLatestHistory = false;
      var inlineHistorySearch = {};
      var inlineHistoryFilter = {};

      // ── Event Delegation ──
      document.addEventListener('click', function(e) {
        var el = e.target.closest('[data-action]');
        if (!el) return;
        var action = el.getAttribute('data-action');

        if (action === 'scan') {
          document.getElementById('btn-scan').disabled = true;
          vscode.postMessage({ type: 'scan' });
        } else if (action === 'cancel-scan') {
          vscode.postMessage({ type: 'cancelScan' });
        } else if (action === 'export') {
          vscode.postMessage({ type: 'export' });
        } else if (action === 'show-history') {
          switchTab('history');
        } else if (action === 'tab') {
          switchTab(el.getAttribute('data-tab'));
        } else if (action === 'select-history') {
          e.stopPropagation();
          toggleHistoryEntry(el.getAttribute('data-id'));
        } else if (action === 'clear-history-entry') {
          e.stopPropagation();
          clearHistoryEntry(el.getAttribute('data-id'));
        } else if (action === 'open-extension') {
          e.stopPropagation();
          var openExtId = el.getAttribute('data-id');
          if (openExtId) vscode.postMessage({ type: 'navigate', extensionId: openExtId });
        } else if (action === 'toggle-extension-detail') {
          e.stopPropagation();
          toggleDetail(el.getAttribute('data-id'));
        } else if (action === 'toggle-history-detail') {
          e.stopPropagation();
          toggleHistoryDetail(el.getAttribute('data-id'));
        } else if (action === 'show-more') {
          e.stopPropagation();
          var tid = el.getAttribute('data-target');
          var c = document.getElementById(tid);
          if (c) {
            var extras = c.querySelectorAll('.factor-extra, .signal-extra');
            var expanded = el.getAttribute('data-expanded') === 'true';
            for (var i = 0; i < extras.length; i++) {
              extras[i].style.display = expanded ? 'none' : '';
            }
            el.setAttribute('data-expanded', expanded ? 'false' : 'true');
            el.textContent = expanded ? '+' + extras.length + ' more' : 'Show less';
          }
        } else if (action === 'navigate') {
          e.stopPropagation();
          var extId = el.getAttribute('data-id');
          if (extId) vscode.postMessage({ type: 'navigate', extensionId: extId });
        } else if (action === 'clear-history') {
          vscode.postMessage({ type: 'requestClearHistory' });
        }
      });

      document.getElementById('ext-search').addEventListener('input', function() { renderExtensions(); });

      // ── Messaging ──
      window.addEventListener('message', function(event) {
        var msg = event.data;
        if (msg.type === 'scanResult') { scanData = msg.data; renderAll(); }
        else if (msg.type === 'scanProgress') { updateProgress(msg.percent, msg.text); }
        else if (msg.type === 'scanStart') { shouldAutoOpenLatestHistory = true; showProgress(true); }
        else if (msg.type === 'scanEnd') { showProgress(false); if (shouldAutoOpenLatestHistory) openLatestHistoryEntry(); shouldAutoOpenLatestHistory = false; }
        else if (msg.type === 'history') { scanHistory = msg.history || []; expandedHistoryEntryId = null; renderHistory(); }
        else if (msg.type === 'scanCleared') { scanData = null; expandedHistoryEntryId = null; renderAll(); renderHistory(); }
        else if (msg.type === 'historyEntryCleared') {
          var clearedId = msg.id;
          if (expandedHistoryEntryId === clearedId) {
            expandedHistoryEntryId = null;
          }
          renderHistory();
        }
      });

      // ── Tabs ──
      function switchTab(tab) {
        var currentTab = document.querySelector('.nav-tab.active');
        var currentTabName = currentTab ? currentTab.getAttribute('data-tab') : null;
        if (currentTabName === 'history' && tab !== 'history' && expandedHistoryEntryId) {
          expandedHistoryEntryId = null;
          renderHistory();
        }
        var panels = document.querySelectorAll('.panel');
        for (var i = 0; i < panels.length; i++) panels[i].classList.remove('visible');
        var tabs = document.querySelectorAll('.nav-tab');
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
        var panel = document.getElementById('panel-' + tab);
        if (panel) panel.classList.add('visible');
        var tabEl = document.querySelector('.nav-tab[data-tab="' + tab + '"]');
        if (tabEl) tabEl.classList.add('active');
        if (tab === 'extensions') renderExtensions();
        if (tab === 'history') renderHistory();
      }

      // ── Progress ──
      function showProgress(vis) {
        var el = document.getElementById('progress-section');
        if (vis) el.classList.add('visible');
        else { el.classList.remove('visible'); document.getElementById('btn-scan').disabled = false; document.getElementById('progress-fill').style.width = '0%'; }
      }
      function updateProgress(pct, text) {
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('progress-text').textContent = text || 'Scanning...';
        document.getElementById('progress-pct').textContent = pct + '%';
      }

      // ── History ──
      function renderHistory() {
        var c = document.getElementById('history-list');
        var empty = document.getElementById('history-empty');
        var header = document.getElementById('history-header');
        if (!scanHistory || scanHistory.length === 0) {
          c.innerHTML = '';
          c.classList.remove('history-list-expanded');
          expandedHistoryEntryId = null;
          resetHistoryDetail();
          if (header) header.classList.remove('has-history');
          empty.style.display = 'block';
          return;
        }
        empty.style.display = 'none';
        if (header) header.classList.add('has-history');
        resetHistoryDetail();
        if (expandedHistoryEntryId) c.classList.add('history-list-expanded');
        else c.classList.remove('history-list-expanded');
        var h = '';
        for (var i = 0; i < scanHistory.length; i++) {
          var s = scanHistory[i];
          var historyId = s.id || s.time;
          var expanded = expandedHistoryEntryId === historyId;
          if (expandedHistoryEntryId && !expanded) continue;
          h += '<div class="history-item' + (expanded ? ' history-item-expanded' : '') + '"><div class="history-item-top"><div class="history-item-main history-item-header-toggle" data-action="select-history" data-id="' + escAttr(historyId) + '"><div class="h-time">' + formatDateTime(s.time) + '</div><div class="h-stats"><span>' + s.total + ' total</span><span class="h-high">' + s.high + ' high</span><span class="h-crit">' + s.critical + ' crit</span></div></div><div class="history-item-actions"><button class="item-toggle history-arrow" data-action="select-history" data-id="' + escAttr(historyId) + '" aria-label="' + (expanded ? 'Collapse history item' : 'Expand history item') + '">' + (expanded ? '&#9662;' : '&#9656;') + '</button><button class="clear-history-entry" data-action="clear-history-entry" data-id="' + escAttr(historyId) + '">Clear</button></div></div>';
          if (expanded && s.summary) {
            h += renderHistoryInlineDetail(s.summary, historyId);
          }
          h += '</div>';
        }
        c.innerHTML = h;
      }

      function toggleHistoryEntry(id) {
        if (!id) return;
        expandedHistoryEntryId = expandedHistoryEntryId === id ? null : id;
        renderHistory();
        if (expandedHistoryEntryId) {
          scrollHistoryItemIntoView(expandedHistoryEntryId);
        }
      }

      function clearHistoryEntry(id) {
        if (!id) return;
        vscode.postMessage({ type: 'requestClearHistoryEntry', id: id });
      }

      // ── Render ──
      function renderAll() {
        if (!scanData || !scanData.reports) {
          document.getElementById('empty-state').style.display = 'block';
          document.getElementById('summary-cards').innerHTML = '';
          document.getElementById('dist-bar').innerHTML = '';
          document.getElementById('rec-actions').classList.add('hidden');
          document.getElementById('header-badge').textContent = '0';
          document.getElementById('last-scan').textContent = '';
          return;
        }
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('header-badge').textContent = scanData.totalExtensions || 0;
        if (scanData.scannedAt) {
          document.getElementById('last-scan').textContent = 'Last scan: ' + formatRelativeTime(scanData.scannedAt);
        }
        renderSummary();
        renderDistribution();
        renderRecActions();
      }

      function renderSummary() {
        var d = scanData;
        var cards = [
          { l: 'Total', c: d.totalExtensions, k: '' },
          { l: 'Low', c: d.lowRisk, k: 'low' },
          { l: 'Mod', c: d.moderateRisk, k: 'moderate' },
          { l: 'High', c: d.highRisk, k: 'high' },
          { l: 'Crit', c: d.criticalRisk, k: 'critical' }
        ];
        var h = '';
        for (var i = 0; i < cards.length; i++) {
          var c = cards[i];
          h += '<div class="card ' + c.k + '"><div class="count">' + c.c + '</div><div class="label">' + c.l + '</div></div>';
        }
        document.getElementById('summary-cards').innerHTML = h;
      }

      function renderDistribution() {
        var d = scanData;
        var t = d.totalExtensions || 1;
        var segs = [
          { k: 'low', pct: Math.round(d.lowRisk / t * 100) },
          { k: 'moderate', pct: Math.round(d.moderateRisk / t * 100) },
          { k: 'high', pct: Math.round(d.highRisk / t * 100) },
          { k: 'critical', pct: Math.round(d.criticalRisk / t * 100) }
        ];
        var h = '';
        for (var i = 0; i < segs.length; i++) {
          if (segs[i].pct > 0) h += '<div class="dist-seg ' + segs[i].k + '" style="width:' + segs[i].pct + '%"></div>';
        }
        document.getElementById('dist-bar').innerHTML = h;
      }

      function renderRecActions() {
        var c = document.getElementById('rec-actions');
        var list = document.getElementById('rec-list');
        var reports = scanData.reports || [];
        var risky = 0, scripts = 0, noRepo = 0;
        for (var i = 0; i < reports.length; i++) {
          var r = reports[i];
          if (r.riskLevel === 'high' || r.riskLevel === 'critical') risky++;
          if (r.riskFactors) {
            for (var j = 0; j < r.riskFactors.length; j++) {
              if (r.riskFactors[j].id === 'install-script') scripts++;
              if (r.riskFactors[j].id === 'no-repo') noRepo++;
            }
          }
        }
        var actions = [];
        if (risky > 0) actions.push('Review ' + risky + ' high/critical risk extension' + (risky > 1 ? 's' : ''));
        if (scripts > 0) actions.push(scripts + ' extension' + (scripts > 1 ? 's' : '') + ' run install scripts');
        if (noRepo > 0) actions.push(noRepo + ' extension' + (noRepo > 1 ? 's' : '') + ' lack repo url');
        if (actions.length === 0) { c.classList.add('hidden'); return; }
        c.classList.remove('hidden');
        var h = '';
        for (var i = 0; i < actions.length; i++) h += '<li>' + actions[i] + '</li>';
        list.innerHTML = h;
      }

      function renderExtensions() {
        var search = document.getElementById('ext-search').value.toLowerCase();
        var container = document.getElementById('ext-list');
        var empty = document.getElementById('ext-empty');
        var reports = (scanData && scanData.reports) || [];
        if (search) {
          var s = [];
          for (var i = 0; i < reports.length; i++) {
            var r = reports[i];
            if ((r.displayName || r.name).toLowerCase().indexOf(search) !== -1 || r.publisher.toLowerCase().indexOf(search) !== -1) s.push(r);
          }
          reports = s;
        }
        document.getElementById('ext-count').textContent = reports.length;
        if (reports.length === 0) { container.innerHTML = ''; empty.style.display = 'block'; return; }
        empty.style.display = 'none';

        var h = '';
        for (var i = 0; i < reports.length; i++) {
          var r = reports[i];
          var cls = r.riskLevel;

          h += '<div class="ext-item" data-action="open-extension" data-id="' + r.id + '" data-level="' + cls + '">';
          h += '<div class="ext-item-header">';
          h += renderExtensionIcon(r);
          h += '<div class="ext-item-info"><span class="ext-name">' + esc(r.displayName || r.name) + '</span><span class="ext-pub">' + esc(r.publisher) + '</span></div>';
          h += '<span class="ext-version">' + esc(r.version) + '</span>';
          h += '</div></div>';
        }
        container.innerHTML = h;
      }

      function toggleDetail(id) {
        if (!id) return;
        var el = document.getElementById('detail-' + id.replace(/[^a-zA-Z0-9]/g, '_'));
        if (el) el.classList.toggle('open');
      }

      function toggleHistoryDetail(id) {
        if (!id) return;
        var el = document.getElementById('detail-' + id);
        if (el) el.classList.toggle('open');
      }

      function scrollHistoryItemIntoView(id) {
        var triggers = document.querySelectorAll('[data-action="select-history"]');
        var item = null;
        for (var i = 0; i < triggers.length; i++) {
          if (triggers[i].getAttribute('data-id') === id) {
            item = triggers[i].closest('.history-item');
            break;
          }
        }
        if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
      }

      function renderExtensionIcon(report) {
        var label = (report.displayName || report.name || '?').trim();
        var fallback = esc(label.slice(0, 2).toUpperCase());
        if (report.iconDataUrl) {
          return '<div class="ext-icon-wrap"><img class="ext-icon" src="' + escAttr(report.iconDataUrl) + '" alt="" /></div>';
        }
        return '<div class="ext-icon-wrap"><span class="ext-icon-fallback">' + fallback + '</span></div>';
      }

      function resetHistoryDetail() {
        var detail = document.getElementById('history-detail');
        var header = document.getElementById('history-header');
        if (detail) {
          detail.innerHTML = '';
          detail.classList.remove('visible');
        }
        if (header) header.classList.remove('detail');
      }

      function openLatestHistoryEntry() {
        if (!scanHistory || scanHistory.length === 0) return;
        var first = scanHistory[0];
        if (!first) return;
        expandedHistoryEntryId = first.id || first.time;
        switchTab('history');
      }

      function getHistoryEntry(historyId) {
        if (!scanHistory) return null;
        for (var i = 0; i < scanHistory.length; i++) {
          var entry = scanHistory[i];
          var entryId = entry.id || entry.time;
          if (entryId === historyId) return entry;
        }
        return null;
      }

      function renderHistoryInlineDetail(summary, historyId) {
        var safeHistoryId = sanitizeId(historyId);
        var searchId = 'inline-history-search-' + safeHistoryId;
        var filterId = 'inline-history-filter-' + safeHistoryId;
        var filterValue = inlineHistoryFilter[historyId] || 'all';
        var searchValue = inlineHistorySearch[historyId] || '';
        var h = '<div class="history-inline-detail">';
        h += '<div class="history-tools"><input id="' + searchId + '" data-history-search-id="' + escAttr(historyId) + '" type="text" placeholder="Search this scan..." value="' + escAttr(searchValue) + '"/><select id="' + filterId + '" data-history-filter-id="' + escAttr(historyId) + '"><option value="all"' + (filterValue === 'all' ? ' selected' : '') + '>All levels</option><option value="low"' + (filterValue === 'low' ? ' selected' : '') + '>Low</option><option value="moderate"' + (filterValue === 'moderate' ? ' selected' : '') + '>Moderate</option><option value="high"' + (filterValue === 'high' ? ' selected' : '') + '>High</option><option value="critical"' + (filterValue === 'critical' ? ' selected' : '') + '>Critical</option></select></div>';
        h += '<div class="history-inline-results">' + renderHistoryDetailResults(summary, filterValue, searchValue) + '</div>';
        h += '</div>';
        return h;
      }

      function renderHistoryDetail(summary) {
        var filterValue = document.getElementById('history-risk-filter') ? document.getElementById('history-risk-filter').value : 'all';
        var searchValue = document.getElementById('history-search') ? document.getElementById('history-search').value.toLowerCase() : '';
        var h = '<div class="history-item"><div class="h-time">' + formatDateTime(summary.scannedAt) + '</div><div class="h-stats"><span>' + summary.totalExtensions + ' total</span><span class="h-high">' + summary.highRisk + ' high</span><span class="h-crit">' + summary.criticalRisk + ' crit</span></div></div>';
        h += '<div class="history-tools"><input id="history-search" type="text" placeholder="Search history extensions..." value="' + escAttr(searchValue) + '"/><select id="history-risk-filter"><option value="all"' + (filterValue === 'all' ? ' selected' : '') + '>All levels</option><option value="low"' + (filterValue === 'low' ? ' selected' : '') + '>Low</option><option value="moderate"' + (filterValue === 'moderate' ? ' selected' : '') + '>Moderate</option><option value="high"' + (filterValue === 'high' ? ' selected' : '') + '>High</option><option value="critical"' + (filterValue === 'critical' ? ' selected' : '') + '>Critical</option></select></div>';
        h += '<div id="history-results">' + renderHistoryDetailResults(summary, filterValue, searchValue) + '</div>';
        return h;
      }

      function renderHistoryDetailResults(summary, filterValue, searchValue) {
        var reports = (summary && summary.reports) || [];
        var normalizedSearch = (searchValue || '').toLowerCase();
        var h = '<div class="ext-list">';
        for (var i = 0; i < reports.length; i++) {
          var r = reports[i];
          if (filterValue !== 'all' && r.riskLevel !== filterValue) continue;
          if (normalizedSearch && (r.displayName || r.name).toLowerCase().indexOf(normalizedSearch) === -1 && r.publisher.toLowerCase().indexOf(normalizedSearch) === -1) continue;
          var cls = r.riskLevel;
          var safeId = 'history_' + r.id.replace(/[^a-zA-Z0-9]/g, '_');
          h += '<div class="ext-item" data-level="' + cls + '">';
          h += '<div class="ext-item-header history-item-header-toggle" data-action="toggle-history-detail" data-id="' + safeId + '">';
          h += renderExtensionIcon(r);
          h += '<div class="ext-item-info"><span class="ext-name">' + esc(r.displayName || r.name) + '</span><span class="ext-pub">' + esc(r.publisher) + '</span></div>';
          h += '<div class="ext-meta"><span class="ext-score" style="color:var(--' + cls + ')">' + r.riskScore + '</span><span class="status-chip ' + cls + '">' + cls.toUpperCase() + '</span></div>';
          h += '</div>';
          h += '<div id="detail-' + safeId + '" class="ext-detail">';
          h += '<div class="detail-row"><span class="detail-label">Version</span><span>' + esc(r.version) + '</span></div>';
          if (r.marketplaceId) h += '<div class="detail-row"><span class="detail-label">ID</span><span>' + esc(r.marketplaceId) + '</span></div>';
          if (r.category) h += '<div class="detail-row"><span class="detail-label">Category</span><span>' + esc(r.category) + '</span></div>';
          h += '<div class="score-wrap"><div class="score-bar"><div class="score-fill" style="width:' + r.riskScore + '%;background:var(--' + cls + ')"></div></div><span class="score-num" style="color:var(--' + cls + ')">' + r.riskScore + '/100</span></div>';
          if (r.riskFactors && r.riskFactors.length) {
            h += renderExpandableList('history-rf-' + safeId, 'Risk Factors', 'factor', r.riskFactors, 5);
          }
          if (r.trustSignals && r.trustSignals.length) {
            h += renderExpandableList('history-ts-' + safeId, 'Trust Signals', 'signal', r.trustSignals, 5);
          }
          var recCls = (cls === 'low' || cls === 'moderate') ? ' safe' : '';
          h += '<div class="rec-box' + recCls + '">' + esc(r.recommendation) + '</div>';
          h += '<div class="detail-actions"><button data-action="navigate" data-id="' + r.id + '">Open in Extensions</button></div>';
          h += '</div></div>';
        }
        h += '</div>';
        return h;
      }

      function renderExpandableList(id, label, className, items, max) {
        var h = '<div id="' + id + '">';
        h += '<div class="section-label">' + label + ' (' + items.length + ')</div>';
        for (var i = 0; i < items.length; i++) {
          var extra = i >= max ? ' ' + className + '-extra" style="display:none"' : '"';
          h += '<div class="' + className + extra + '>' + esc(items[i].title) + '</div>';
        }
        if (items.length > max) {
          h += '<button class="show-more-btn" data-action="show-more" data-target="' + id + '">+' + (items.length - max) + ' more</button>';
        }
        h += '</div>';
        return h;
      }

      // ── Utilities ──
      function esc(s) { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
      function escAttr(s) { return esc(String(s)).replace(/'/g, '&#39;'); }
      function sanitizeId(s) { return String(s).replace(/[^a-zA-Z0-9]/g, '_'); }

      function updateInlineHistoryResults(historyId) {
        var entry = getHistoryEntry(historyId);
        if (!entry || !entry.summary) return;
        var searchValue = inlineHistorySearch[historyId] || '';
        var filterValue = inlineHistoryFilter[historyId] || 'all';
        var input = document.getElementById('inline-history-search-' + sanitizeId(historyId));
        var wrapper = input ? input.closest('.history-inline-detail') : null;
        var results = wrapper ? wrapper.querySelector('.history-inline-results') : null;
        if (results) {
          results.innerHTML = renderHistoryDetailResults(entry.summary, filterValue, searchValue);
        }
      }

${WEBVIEW_DATE_FORMATTERS_SCRIPT}

      document.addEventListener('input', function(e) {
        if (e.target && e.target.hasAttribute('data-history-search-id')) {
          var historyId = e.target.getAttribute('data-history-search-id');
          inlineHistorySearch[historyId] = e.target.value || '';
          updateInlineHistoryResults(historyId);
          return;
        }
        if (e.target && e.target.id === 'history-search' && false) return;
      });

      document.addEventListener('change', function(e) {
        if (e.target && e.target.hasAttribute('data-history-filter-id')) {
          var historyId = e.target.getAttribute('data-history-filter-id');
          inlineHistoryFilter[historyId] = e.target.value || 'all';
          updateInlineHistoryResults(historyId);
          return;
        }
        if (e.target && e.target.id === 'history-risk-filter' && false) return;
      });

      // ── Init ──
      vscode.postMessage({ type: 'ready' });
      renderAll();
      renderHistory();
    })();
  </script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
