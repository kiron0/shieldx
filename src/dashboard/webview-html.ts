import { WEBVIEW_DATE_FORMATTERS_SCRIPT } from '../utils/date-format';
import { EXT_CONFIG } from '../config';

export function generateDashboardHtml(cspSource: string): string {
  const nonce = getNonce();
  const aboutTitle = EXT_CONFIG.name;
  const aboutVersion = EXT_CONFIG.version;
  const aboutAuthor = EXT_CONFIG.author;
  const aboutDescription = EXT_CONFIG.description;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>${aboutTitle}</title>
  <style>${getStyles()}</style>
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
            <h1>${aboutTitle} <sub style="font-size:9px;opacity:.45;font-weight:500">v${aboutVersion}</sub></h1>
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
            <div class="about-title">${aboutTitle} <sub style="font-size:8px;opacity:.45;font-weight:500">v${aboutVersion}</sub></div>
            <div class="about-author">${aboutAuthor}</div>
          </div>
        </div>
        <div class="about-desc">${aboutDescription}</div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">${getScript()}</script>
</body>
</html>`;
}

function getStyles(): string {
  return `
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:var(--vscode-editor-background,#1e1e1e);--fg:var(--vscode-editor-foreground,#d4d4d4);--border:var(--vscode-panel-border,#3c3c3c);--card-bg:var(--vscode-editorWidget-background,#252526);--accent:var(--vscode-button-background,#007acc);--accent-fg:var(--vscode-button-foreground,#fff);--sec-bg:var(--vscode-button-secondaryBackground,#3c3c3c);--sec-fg:var(--vscode-button-secondaryForeground,#ccc);--input-bg:var(--vscode-input-background,#3c3c3c);--input-fg:var(--vscode-input-foreground,#ccc);--input-border:var(--vscode-input-border,#3c3c3c);--input-ph:var(--vscode-input-placeholderForeground,#888);--low:#4caf50;--moderate:#ff9800;--high:#f44336;--critical:#9c27b0;--radius:8px;--pad:12px;--accent-glow:rgba(0,122,204,.25)}
    .low{--c:var(--low);--bgc:#4caf5018}
    .moderate{--c:var(--moderate);--bgc:#ff980018}
    .high{--c:var(--high);--bgc:#f4433618}
    .critical{--c:var(--critical);--bgc:#9c27b018}
    [data-level="low"]{--c:var(--low);--bgc:#4caf5018}
    [data-level="moderate"]{--c:var(--moderate);--bgc:#ff980018}
    [data-level="high"]{--c:var(--high);--bgc:#f4433618}
    [data-level="critical"]{--c:var(--critical);--bgc:#9c27b018}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes pulse-ring{0%{box-shadow:0 0 0 0 var(--accent-glow)}70%{box-shadow:0 0 0 6px transparent}100%{box-shadow:0 0 0 0 transparent}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    body{font-family:var(--vscode-font-family,-apple-system,BlinkMacSystemFont,sans-serif);font-size:13px;background:var(--bg);color:var(--fg);line-height:1.5;overflow:hidden;height:100vh}
    .app-shell{height:100%;display:flex;flex-direction:column;padding:var(--pad);gap:10px}
    .app-top,.app-bottom{flex:0 0 auto}
    .app-main{flex:1 1 auto;min-height:0;overflow:hidden;display:flex}

    /* ── Header ── */
    .header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border);position:relative}
    .header::after{content:'';position:absolute;bottom:-1px;left:0;width:60px;height:2px;background:linear-gradient(90deg,var(--accent),transparent);border-radius:1px}
    .header-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
    .header-icon{width:28px;height:28px;flex:0 0 28px;border-radius:8px;background:linear-gradient(135deg,var(--accent),#005a9e);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px var(--accent-glow)}
    .header-icon svg{width:16px;height:16px;color:var(--accent-fg)}
    .header-text{min-width:0}
    .header h1{font-size:14px;font-weight:700;letter-spacing:.3px;line-height:1.2}
    .header-slogan{font-size:10px;opacity:.45;letter-spacing:.5px;text-transform:uppercase;display:block}
    .badge-count{display:flex;align-items:center;gap:4px;background:var(--card-bg);border:1px solid var(--border);padding:3px 8px;border-radius:12px;font-size:10px;opacity:.8}
    .badge-num{font-weight:700;color:var(--accent);font-size:12px}
    .badge-label{opacity:.55;font-weight:500}

    /* ── Progress ── */
    #progress-section{display:none;margin-bottom:10px}
    #progress-section.visible{display:block}
    .progress-row{display:flex;align-items:center;gap:8px}
    .progress-track{flex:1;height:4px;background:var(--border);border-radius:2px;overflow:hidden}
    .progress-fill{height:100%;width:0%;background:linear-gradient(90deg,var(--accent),#00a6ff);border-radius:2px;transition:width .3s}
    .progress-info{display:flex;justify-content:space-between;font-size:10px;opacity:.6;margin-top:4px}
    .progress-cancel{display:none;background:var(--sec-bg);color:var(--sec-fg);border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer}
    #progress-section.visible .progress-cancel{display:inline-flex}

    /* ── Quick Actions (Scan + Export) ── */
    .quick-actions{display:flex;gap:8px;margin-bottom:12px}
    .btn-scan{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;border:none;border-radius:var(--radius);font-size:12px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,var(--accent) 0%,#005a9e 100%);color:var(--accent-fg);letter-spacing:.3px;transition:all .2s;position:relative;overflow:hidden}
    .btn-scan::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);background-size:200% 100%;animation:shimmer 3s ease infinite}
    .btn-scan:hover{transform:translateY(-1px);box-shadow:0 4px 14px var(--accent-glow)}
    .btn-scan:active{transform:translateY(0)}
    .btn-scan svg{width:15px;height:15px;flex:0 0 15px}
    .btn-scan:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
    .btn-scan:disabled::before{animation:none}
    .btn-export{flex:0 0 auto;display:flex;align-items:center;gap:5px;padding:9px 14px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:var(--fg);transition:all .2s}
    .btn-export svg{width:14px;height:14px;flex:0 0 14px;opacity:.7}
    .btn-export:hover{border-color:var(--accent);color:var(--accent);background:rgba(0,122,204,.06)}
    .btn-export:hover svg{opacity:1}
    .btn-export:disabled{opacity:.35;cursor:not-allowed}

    /* ── Nav Tabs ── */
    .nav-tabs{display:flex;gap:2px;background:var(--card-bg);border-radius:var(--radius);padding:3px;margin-bottom:10px;position:relative}
    .nav-tab{flex:1;text-align:center;padding:6px 4px;font-size:11px;font-weight:600;border:none;background:transparent;color:var(--fg);opacity:.45;cursor:pointer;border-radius:6px;transition:all .2s;position:relative;z-index:1}
    .nav-tab:hover{opacity:.65}
    .nav-tab.active{opacity:1;background:var(--bg);box-shadow:0 1px 3px rgba(0,0,0,.2)}
    .panel{display:none;height:100%;overflow-y:auto;min-width:0}
    .panel.visible{display:flex;flex:1 1 auto;flex-direction:column;min-height:0}

    /* ── Summary Cards ── */
    .summary-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
    .card{background:var(--card-bg);border:1px solid var(--border);border-left:3px solid var(--c,var(--accent));border-radius:var(--radius);padding:10px 8px;text-align:center;transition:border-color .2s,transform .15s;cursor:pointer}
    .card:hover{transform:translateY(-1px);border-color:var(--accent)}
    .card .card-icon{display:flex;justify-content:center;margin-bottom:4px}
    .card .card-icon svg{width:14px;height:14px;color:var(--c,var(--fg));opacity:.65}
    .card .count{font-size:20px;font-weight:800;line-height:1.2;color:var(--c);letter-spacing:-.3px}
    .card .label{font-size:9px;opacity:.5;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
    .card.total-card{border-left-color:var(--accent)}
    .card.total-card .count{color:var(--fg)}

    /* ── Distribution Bar ── */
    .dist-section{margin-bottom:12px;padding:10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--card-bg)}
    .dist-section.hidden{display:none}
    .dist-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .dist-title{font-size:11px;font-weight:700;opacity:.7}
    .dist-bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--border)}
    .dist-seg{height:100%;transition:width .4s ease;background:var(--c);position:relative}
    .dist-seg:first-child{border-radius:4px 0 0 4px}
    .dist-seg:last-child{border-radius:0 4px 4px 0}
    .dist-seg:only-child{border-radius:4px}
    .dist-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
    .dist-legend-item{display:flex;align-items:center;gap:4px;font-size:10px;opacity:.65}
    .dist-legend-dot{width:6px;height:6px;border-radius:50%;background:var(--c)}

    /* ── Section Card (shared pattern) ── */
    .section-card-header{display:flex;align-items:center;gap:6px;margin-bottom:8px}
    .section-card-icon{width:14px;height:14px;opacity:.6;color:var(--accent)}
    .section-card-title{font-size:11px;font-weight:700;opacity:.85}

    /* ── Rec Actions ── */
    .rec-actions{margin-bottom:10px;padding:10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--card-bg)}.rec-actions.hidden{display:none}
    .rec-list{list-style:none;display:flex;flex-direction:column;gap:4px}
    .rec-list li{padding:6px 8px;font-size:11px;display:flex;align-items:center;gap:8px;border-radius:6px;background:rgba(255,255,255,.02);border:1px solid var(--border);transition:border-color .15s}
    .rec-list li:hover{border-color:var(--accent)}
    .rec-list li .rec-dot{width:6px;height:6px;border-radius:50%}
    .rec-list li .rec-text{flex:1;min-width:0}

    /* ── Score Explainer ── */
    .score-explainer-trigger{display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:var(--fg);opacity:.6;font-size:11px;cursor:pointer;padding:8px 0;margin-bottom:10px;transition:opacity .15s}
    .score-explainer-trigger:hover{opacity:.95}
    .score-explainer-trigger svg{width:14px;height:14px;color:var(--accent)}
    .score-explainer-scale{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    .score-band{font-size:10px;padding:3px 8px;border-radius:999px;background:var(--bgc);color:var(--c);font-weight:600;display:flex;align-items:center;gap:4px;transition:transform .15s}
    .score-band:hover{transform:scale(1.05)}
    .score-band-dot{width:5px;height:5px;border-radius:50%;background:var(--c)}

    /* ── Empty State ── */
    .empty-state{text-align:center;padding:32px 16px;opacity:1}
    .empty-state-icon{width:56px;height:56px;margin:0 auto 14px;border-radius:16px;background:linear-gradient(135deg,rgba(0,122,204,.12),rgba(0,122,204,.04));display:flex;align-items:center;justify-content:center;animation:float 4s ease-in-out infinite}
    .empty-state-icon svg{width:28px;height:28px;color:var(--accent);opacity:.7}
    .empty-state-title{font-size:14px;font-weight:700;margin-bottom:4px;opacity:.75}
    .empty-state-sub{font-size:11px;opacity:.4;line-height:1.5}
    #history-empty{flex:1 1 auto;display:flex;align-items:center;justify-content:center}
    .empty-state svg{width:36px;height:36px;margin-bottom:8px}
    .empty-state p{font-size:12px}

    /* ── Last Scan ── */
    .last-scan{font-size:10px;opacity:.4;text-align:center;margin-top:8px;padding:6px 10px;border-radius:var(--radius);background:var(--card-bg);border:1px solid var(--border)}
    .last-scan:empty{display:none}

    /* ── Search & Extensions Tab ── */
    .search-bar{margin-bottom:6px;position:relative}
    .search-bar input{width:100%;background:var(--input-bg);color:var(--input-fg);border:1px solid var(--input-border);border-radius:var(--radius);padding:6px 42px 6px 10px;font-size:12px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
    .search-bar input:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}
    .search-bar input::placeholder{color:var(--input-ph)}
    .filter-bar{display:flex;gap:6px;align-items:center;justify-content:flex-end;margin-bottom:8px}
    .ext-count{position:absolute;top:50%;right:10px;transform:translateY(-50%);font-size:10px;opacity:.5;pointer-events:none}
    .ext-toolbar{position:sticky;top:0;z-index:3;background:var(--bg);padding-bottom:6px;margin-bottom:2px}
    .ext-list{display:flex;flex-direction:column;gap:4px;width:100%;padding:0}
    .ext-item{background:var(--card-bg);border:1px solid var(--border);border-left:3px solid var(--c,var(--border));border-radius:var(--radius);padding:10px;cursor:pointer;transition:all .2s;width:100%}
    .ext-item:hover{border-color:var(--accent);transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,.15)}
    .ext-item-header{display:flex;align-items:center;gap:10px}
    .ext-icon-wrap{width:26px;height:26px;flex:0 0 26px;border-radius:6px;overflow:hidden;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center}
    .ext-icon{width:100%;height:100%;object-fit:cover;display:block}
    .ext-icon-fallback{font-size:10px;font-weight:700;opacity:.65;text-transform:uppercase}
    .ext-item-info{flex:1;min-width:0}
    .ext-name{font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
    .ext-pub{font-size:10px;opacity:.45;display:block;margin-top:1px}
    .ext-version{font-size:11px;font-weight:600;white-space:nowrap;opacity:.7;margin-left:auto}
    .ext-score{font-size:12px;font-weight:700;white-space:nowrap}
    .ext-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-left:auto}
    .item-toggle{background:none;border:none;color:var(--fg);opacity:.55;cursor:pointer;font-size:12px;padding:0;line-height:1}
    .item-toggle:hover{opacity:.85}
    .status-chip{font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap;background:var(--bgc);color:var(--c)}

    /* ── Extension Detail ── */
    .ext-detail{display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:11px}
    .ext-detail.open{display:block}
    .detail-row{display:flex;justify-content:space-between;padding:3px 0}
    .detail-label{opacity:.5}
    .score-wrap{display:flex;align-items:center;gap:8px;margin:8px 0}
    .score-bar{flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden}
    .score-fill{height:100%;border-radius:3px;transition:width .4s ease}
    .score-num{font-size:11px;font-weight:700;white-space:nowrap;min-width:40px;text-align:right}
    .section-label{font-size:10px;font-weight:600;text-transform:uppercase;opacity:.5;margin:8px 0 4px;letter-spacing:.4px}
    .factor{padding:3px 0;font-size:10px;color:var(--high)}.factor::before{content:'\\2022 ';opacity:.5}
    .show-more-btn{background:none;border:none;color:var(--accent);font-size:10px;cursor:pointer;padding:2px 0;transition:opacity .15s}
    .show-more-btn:hover{text-decoration:underline;opacity:.8}
    .signal{padding:3px 0;font-size:10px;color:var(--low)}.signal::before{content:'+ ';opacity:.5;font-weight:700}
    .rec-box{margin-top:8px;padding:8px 10px;border-radius:6px;font-size:11px;background:#f4433610;border-left:3px solid var(--high);line-height:1.5}
    .rec-box.safe{background:#4caf5010;border-left-color:var(--low)}
    .detail-actions{margin-top:10px;display:flex;gap:6px}
    .detail-actions button{background:transparent;color:var(--fg);border:1px solid var(--border);padding:5px 12px;border-radius:var(--radius);font-size:11px;cursor:pointer;transition:all .2s;font-weight:600}
    .detail-actions button:hover{border-color:var(--accent);color:var(--accent);background:rgba(0,122,204,.06)}

    /* ── History Tab ── */
    .history-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .history-header button{background:transparent;border:1px solid var(--border);color:var(--fg);font-size:10px;cursor:pointer;opacity:.6;padding:3px 8px;border-radius:6px;transition:all .2s}
    .history-header button:hover{opacity:1;border-color:var(--accent);color:var(--accent)}
    .history-header .history-back{display:none;opacity:.7}
    .history-header .history-clear{display:none;margin-left:auto}
    .history-header.has-history .history-clear{display:inline-flex}
    .history-header.detail .history-back{display:inline-flex}
    #panel-history{overflow:hidden}
    .history-list{display:flex;flex-direction:column;gap:4px;flex:1 1 auto;min-height:0;overflow-y:auto;padding-right:2px}
    .history-list.history-list-expanded{overflow:hidden}
    .history-item{background:var(--card-bg);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:var(--radius);padding:10px;font-size:11px;transition:all .2s}
    .history-item:hover{transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,.15)}
    .history-item.history-item-expanded{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
    .history-inline-detail{margin-top:10px;display:flex;flex-direction:column;flex:1 1 auto;min-height:0;border-top:1px solid var(--border);padding-top:10px}
    .history-detail{display:none}.history-detail.visible{display:block}
    .history-tools{display:flex;gap:6px;align-items:center;margin:8px 0;margin-bottom:10px}
    .history-tools input,.history-tools select{background:var(--input-bg);color:var(--input-fg);border:1px solid var(--input-border);border-radius:var(--radius);padding:6px 10px;font-size:12px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
    .history-tools input:focus,.history-tools select:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}
    .history-tools input::placeholder{color:var(--input-ph)}
    .history-tools input{flex:1}
    .history-inline-detail .history-tools{position:sticky;top:0;z-index:2;margin-top:0;padding-bottom:8px;background:var(--card-bg)}
    .history-inline-results{overflow-y:auto;min-height:0;padding-right:2px}
    .history-item-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
    .history-item-main{flex:1;min-width:0}
    .history-item-header-toggle{cursor:pointer}
    .history-item-actions{display:flex;gap:6px}
    .history-item-actions button{background:none;border:none;color:var(--fg);font-size:10px;cursor:pointer;opacity:.55;transition:opacity .15s}
    .history-item-actions button:hover{opacity:.85}
    .history-item-actions .clear-history-entry{padding:0}
    .history-item-actions .history-arrow{padding:0;font-size:12px}
    .h-time{font-size:10px;opacity:.45}
    .h-stats{display:flex;gap:8px;margin-top:4px;width:fit-content}
    .h-stats span{font-size:10px}
    .h-stats .h-high{color:var(--high);font-weight:600}.h-stats .h-crit{color:var(--critical);font-weight:600}

    /* ── About Box ── */
    .about-box{border-top:1px solid var(--border);padding:10px;margin-top:2px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)}
    .about-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .about-icon{width:28px;height:28px;flex:0 0 28px;border-radius:7px;background:linear-gradient(135deg,var(--accent),#005a9e);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px var(--accent-glow)}
    .about-icon svg{width:15px;height:15px;color:var(--accent-fg)}
    .about-title{font-size:11px;font-weight:700;letter-spacing:.2px}
    .about-author{font-size:10px;opacity:.5}
    .about-desc{font-size:10px;opacity:.6;line-height:1.5}

    /* ── Extensions List Overrides ── */
    #ext-list .ext-item{border-left-width:1px;border-left-color:var(--border)}
    #ext-list .ext-item:hover{border-left-color:var(--accent);box-shadow:0 2px 8px rgba(0,0,0,.15)}

    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}

    /* ── Scan Confirm Overlay ── */
    .confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;transition:opacity .2s;backdrop-filter:blur(2px)}
    .confirm-overlay.visible{opacity:1}
    .confirm-box{background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);padding:18px;max-width:320px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.35);transform:scale(.95);transition:transform .2s}
    .confirm-overlay.visible .confirm-box{transform:scale(1)}
    .confirm-title{font-size:13px;font-weight:700;margin-bottom:8px}
    .confirm-body{font-size:11px;opacity:.6;line-height:1.5;margin-bottom:14px}
    .confirm-actions{display:flex;gap:8px;justify-content:flex-end}
    .confirm-cancel{background:var(--sec-bg);color:var(--sec-fg);border:none;padding:6px 14px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:600;transition:all .15s}
    .confirm-cancel:hover{opacity:.85}
    .confirm-ok{background:linear-gradient(135deg,var(--accent),#005a9e);color:var(--accent-fg);border:none;padding:6px 14px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;transition:all .15s}
    .confirm-ok:hover{box-shadow:0 2px 8px var(--accent-glow)}
  `;
}

function getScript(): string {
  return `
    (function() {
      var vscode = acquireVsCodeApi();
      var scanData = null;
      var scanHistory = [];
      var expandedHistoryEntryId = null;
      var shouldAutoOpenLatestHistory = false;
      var inlineHistorySearch = {};
      var inlineHistoryFilter = {};

      function $(id) { return document.getElementById(id); }
      function $$(sel) { return document.querySelectorAll(sel); }
      function q(sel) { return document.querySelector(sel); }

      document.addEventListener('click', function(e) {
        var el = e.target.closest('[data-action]');
        if (!el) return;
        var act = el.getAttribute('data-action');
        if (act === 'scan') {
          showScanConfirm();
        } else if (act === 'cancel-scan') {
          vscode.postMessage({ type: 'cancelScan' });
        } else if (act === 'export') {
          showExportModal();
        } else if (act === 'show-history') {
          switchTab('history');
        } else if (act === 'tab') {
          switchTab(el.getAttribute('data-tab'));
        } else if (act === 'select-history') {
          e.stopPropagation();
          toggleHistoryEntry(el.getAttribute('data-id'));
        } else if (act === 'clear-history-entry') {
          e.stopPropagation();
          clearHistoryEntry(el.getAttribute('data-id'));
        } else if (act === 'open-extension') {
          e.stopPropagation();
          var openExtId = el.getAttribute('data-id');
          if (openExtId) vscode.postMessage({ type: 'navigate', extensionId: openExtId });
        } else if (act === 'toggle-extension-detail') {
          e.stopPropagation();
          toggleDetail(el.getAttribute('data-id'));
        } else if (act === 'toggle-history-detail') {
          e.stopPropagation();
          toggleHistoryDetail(el.getAttribute('data-id'));
        } else if (act === 'show-more') {
          e.stopPropagation();
          var tid = el.getAttribute('data-target');
          var c = $(tid);
          if (c) {
            var extras = c.querySelectorAll('.factor-extra, .signal-extra');
            var expanded = el.getAttribute('data-expanded') === 'true';
            for (var i = 0; i < extras.length; i++) extras[i].style.display = expanded ? 'none' : '';
            el.setAttribute('data-expanded', expanded ? 'false' : 'true');
            el.textContent = expanded ? '+' + extras.length + ' more' : 'Show less';
          }
        } else if (act === 'navigate') {
          e.stopPropagation();
          var extId = el.getAttribute('data-id');
          if (extId) vscode.postMessage({ type: 'navigate', extensionId: extId });
        } else if (act === 'clear-history') {
          showConfirm('Clear All History?', 'This will permanently remove all scan history entries. This action cannot be undone.', 'Clear', function() { vscode.postMessage({ type: 'forceClearHistory' }); });
        } else if (act === 'card-filter') {
          var filterLevel = el.getAttribute('data-filter');
          navigateToHistoryWithFilter(filterLevel);
        } else if (act === 'show-score-explainer') {
          showScoreExplainerModal();
        }
      });

      $('ext-search').addEventListener('input', function() { renderExtensions(); });

      window.addEventListener('message', function(event) {
        var msg = event.data;
        if (msg.type === 'scanResult') { scanData = msg.data; renderAll(); }
        else if (msg.type === 'scanProgress') { updateProgress(msg.percent, msg.text); }
        else if (msg.type === 'scanStart') { shouldAutoOpenLatestHistory = true; showProgress(true); }
        else if (msg.type === 'scanEnd') { showProgress(false); if (shouldAutoOpenLatestHistory) openLatestHistoryEntry(); shouldAutoOpenLatestHistory = false; }
        else if (msg.type === 'history') { scanHistory = msg.history || []; expandedHistoryEntryId = null; renderHistory(); }
        else if (msg.type === 'scanCleared') { scanData = null; expandedHistoryEntryId = null; renderAll(); renderHistory(); }
        else if (msg.type === 'historyEntryCleared') {
          if (expandedHistoryEntryId === msg.id) expandedHistoryEntryId = null;
          renderHistory();
        }
      });

      function switchTab(tab) {
        var cur = q('.nav-tab.active');
        if (cur && cur.getAttribute('data-tab') === 'history' && tab !== 'history' && expandedHistoryEntryId) {
          expandedHistoryEntryId = null;
          renderHistory();
        }
        $$('.panel').forEach(function(p){ p.classList.remove('visible'); });
        $$('.nav-tab').forEach(function(t){ t.classList.remove('active'); });
        var panel = $('panel-' + tab); if (panel) panel.classList.add('visible');
        var tabEl = q('.nav-tab[data-tab="' + tab + '"]'); if (tabEl) tabEl.classList.add('active');
        if (tab === 'extensions') renderExtensions();
        if (tab === 'history') renderHistory();
      }

      function showProgress(vis) {
        var el = $('progress-section');
        if (vis) el.classList.add('visible');
        else { el.classList.remove('visible'); $('btn-scan').disabled = false; $('progress-fill').style.width = '0%'; }
      }

      function updateProgress(pct, text) {
        $('progress-fill').style.width = pct + '%';
        $('progress-text').textContent = text || 'Scanning...';
        $('progress-pct').textContent = pct + '%';
      }

      function titleCase(value) {
        return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';
      }

      function buildExtItemHtml(r, opts) {
        var cls = r.riskLevel;
        var h = '<div class="ext-item" ' + (opts.clickAction ? 'data-action="' + opts.clickAction + '" ' : '') + (opts.dataId ? 'data-id="' + opts.dataId + '" ' : '') + 'data-level="' + cls + '">';
        h += '<div class="ext-item-header' + (opts.toggleAction ? ' history-item-header-toggle" data-action="' + opts.toggleAction + '" data-id="' + opts.toggleId + '"' : '"') + '>';
        h += renderExtensionIcon(r);
        h += '<div class="ext-item-info"><span class="ext-name">' + esc(r.displayName || r.name) + '</span><span class="ext-pub">' + esc(r.publisher) + '</span></div>';
        if (opts.showScore) {
          h += '<div class="ext-meta"><span class="ext-score" style="color:var(--' + cls + ')">' + r.riskScore + '</span><span class="status-chip ' + cls + '">' + titleCase(cls) + '</span></div>';
        } else {
          h += '<span class="ext-version">' + esc(r.version) + '</span>';
        }
        h += '</div>';
        return h;
      }

      function renderHistory() {
        var c = $('history-list'), empty = $('history-empty'), header = $('history-header');
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
          if (expanded && s.summary) h += renderHistoryInlineDetail(s.summary, historyId);
          h += '</div>';
        }
        c.innerHTML = h;
      }

      function toggleHistoryEntry(id) {
        if (!id) return;
        expandedHistoryEntryId = expandedHistoryEntryId === id ? null : id;
        renderHistory();
        if (expandedHistoryEntryId) scrollHistoryItemIntoView(expandedHistoryEntryId);
      }

      function clearHistoryEntry(id) {
        if (!id) return;
        var entry = getHistoryEntry(id);
        var label = entry ? formatDateTime(entry.time) : 'this scan history';
        showConfirm('Clear History Entry?', 'This will permanently remove the history entry for ' + label + '. This action cannot be undone.', 'Clear', function() {
          vscode.postMessage({ type: 'forceClearHistoryEntry', id: id });
        });
      }

      function showExportModal() {
        var overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        
        var optionsHtml = '<option value="latest">Latest Scan Results</option>';
        if (scanHistory) {
          for (var i = 0; i < scanHistory.length; i++) {
            var entry = scanHistory[i];
            var entryId = entry.id || entry.time;
            var label = formatDateTime(entry.time) + ' (' + entry.total + ' total, ' + entry.high + ' high, ' + entry.critical + ' crit)';
            optionsHtml += '<option value="' + escAttr(entryId) + '">' + esc(label) + '</option>';
          }
        }

        overlay.innerHTML = '<div class="confirm-box">' +
          '<div class="confirm-title">Export Security Report</div>' +
          '<div class="confirm-body" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;opacity:1">' +
            '<div style="display:flex;flex-direction:column;gap:4px">' +
              '<span style="font-size:10px;opacity:.65;font-weight:600">Select Scan</span>' +
              '<select id="export-scan-select" style="width:100%;background:var(--input-bg);color:var(--input-fg);border:1px solid var(--input-border);border-radius:var(--radius);padding:6px;font-size:11px;outline:none">' + optionsHtml + '</select>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:4px">' +
              '<span style="font-size:10px;opacity:.65;font-weight:600">Format</span>' +
              '<select id="export-format-select" style="width:100%;background:var(--input-bg);color:var(--input-fg);border:1px solid var(--input-border);border-radius:var(--radius);padding:6px;font-size:11px;outline:none">' +
                '<option value="markdown">Markdown (.md)</option>' +
                '<option value="json">JSON (.json)</option>' +
                '<option value="html">HTML (.html)</option>' +
                '<option value="pdf">PDF (.pdf)</option>' +
                '<option value="csv">CSV (.csv)</option>' +
                '<option value="sarif">SARIF (.sarif.json)</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="confirm-actions">' +
            '<button class="confirm-cancel">Cancel</button>' +
            '<button class="confirm-ok">Export</button>' +
          '</div>' +
        '</div>';

        document.body.appendChild(overlay);
        requestAnimationFrame(function() { overlay.classList.add('visible'); });
        function dismiss() { overlay.classList.remove('visible'); setTimeout(function() { overlay.remove(); }, 200); }
        overlay.querySelector('.confirm-cancel').addEventListener('click', dismiss);
        overlay.querySelector('.confirm-ok').addEventListener('click', function() {
          var scanId = overlay.querySelector('#export-scan-select').value;
          var format = overlay.querySelector('#export-format-select').value;
          dismiss();
          vscode.postMessage({ type: 'directExport', historyId: scanId, format: format });
        });
        overlay.addEventListener('click', function(ev) { if (ev.target === overlay) dismiss(); });
      }

      function renderAll() {
        var distSection = $('dist-section');
        if (!scanData || !scanData.reports) {
          $('empty-state').style.display = 'block';
          $('summary-cards').innerHTML = '';
          $('dist-bar').innerHTML = '';
          if (distSection) distSection.classList.add('hidden');
          $('rec-actions').classList.add('hidden');
          var badgeNum0 = q('.badge-num'); if (badgeNum0) badgeNum0.textContent = '0';
          $('last-scan').textContent = '';
          return;
        }
        $('empty-state').style.display = 'none';
        if (distSection) distSection.classList.remove('hidden');
        var badgeNum = q('.badge-num'); if (badgeNum) badgeNum.textContent = scanData.totalExtensions || 0;
        if (scanData.scannedAt) $('last-scan').textContent = 'Last scan: ' + formatRelativeTime(scanData.scannedAt);
        renderSummary();
        renderDistribution();
        renderRecActions();
      }

      function renderSummary() {
        var d = scanData;
        var icons = {
          total: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
          low: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
          moderate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
          high: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
          critical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
        };
        var cards = [
          { l: 'Total', c: d.totalExtensions, k: 'total', cls: 'total-card' },
          { l: 'Low', c: d.lowRisk, k: 'low', cls: 'low' },
          { l: 'Moderate', c: d.moderateRisk, k: 'moderate', cls: 'moderate' },
          { l: 'High', c: d.highRisk, k: 'high', cls: 'high' },
          { l: 'Critical', c: d.criticalRisk, k: 'critical', cls: 'critical' }
        ];
        var h = '';
        for (var i = 0; i < cards.length; i++) {
          var c = cards[i];
          var filterVal = c.k === 'total' ? 'all' : c.k;
          h += '<div class="card ' + c.cls + '" data-action="card-filter" data-filter="' + filterVal + '"><div class="card-icon">' + icons[c.k] + '</div><div class="count">' + c.c + '</div><div class="label">' + c.l + '</div></div>';
        }
        $('summary-cards').innerHTML = h;
      }

      function renderDistribution() {
        var d = scanData, t = d.totalExtensions || 1;
        var segs = [
          { k: 'low', label: 'Low', count: d.lowRisk, pct: Math.round(d.lowRisk / t * 100) },
          { k: 'moderate', label: 'Moderate', count: d.moderateRisk, pct: Math.round(d.moderateRisk / t * 100) },
          { k: 'high', label: 'High', count: d.highRisk, pct: Math.round(d.highRisk / t * 100) },
          { k: 'critical', label: 'Critical', count: d.criticalRisk, pct: Math.round(d.criticalRisk / t * 100) }
        ];
        var barH = '';
        var legH = '';
        for (var i = 0; i < segs.length; i++) {
          if (segs[i].pct > 0) barH += '<div class="dist-seg ' + segs[i].k + '" style="width:' + segs[i].pct + '%" title="' + segs[i].label + ': ' + segs[i].count + ' (' + segs[i].pct + '%)"></div>';
          legH += '<span class="dist-legend-item ' + segs[i].k + '"><span class="dist-legend-dot"></span>' + segs[i].label + ' ' + segs[i].pct + '%</span>';
        }
        $('dist-bar').innerHTML = barH;
        var legend = $('dist-legend');
        if (legend) legend.innerHTML = legH;
      }

      function renderRecActions() {
        var c = $('rec-actions'), list = $('rec-list');
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
        if (risky > 0) actions.push({ text: 'Review ' + risky + ' high/critical risk extension' + (risky > 1 ? 's' : ''), color: 'var(--high)' });
        if (scripts > 0) actions.push({ text: scripts + ' extension' + (scripts > 1 ? 's' : '') + ' run install scripts', color: 'var(--moderate)' });
        if (noRepo > 0) actions.push({ text: noRepo + ' extension' + (noRepo > 1 ? 's' : '') + ' lack repo url', color: 'var(--moderate)' });
        if (actions.length === 0) { c.classList.add('hidden'); return; }
        c.classList.remove('hidden');
        var h = '';
        for (var i = 0; i < actions.length; i++) h += '<li><span class="rec-dot" style="background:' + actions[i].color + '"></span><span class="rec-text">' + actions[i].text + '</span></li>';
        list.innerHTML = h;
      }

      function renderExtensions() {
        var search = $('ext-search').value.toLowerCase();
        var container = $('ext-list'), empty = $('ext-empty');
        var reports = (scanData && scanData.reports) || [];
        if (search) {
          var s = [];
          for (var i = 0; i < reports.length; i++) {
            var r = reports[i];
            if ((r.displayName || r.name).toLowerCase().indexOf(search) !== -1 || r.publisher.toLowerCase().indexOf(search) !== -1) s.push(r);
          }
          reports = s;
        }
        $('ext-count').textContent = reports.length;
        if (reports.length === 0) { container.innerHTML = ''; empty.style.display = 'block'; return; }
        empty.style.display = 'none';
        var h = '';
        for (var i = 0; i < reports.length; i++) {
          h += buildExtItemHtml(reports[i], { clickAction: 'open-extension', dataId: reports[i].id, showScore: false }) + '</div>';
        }
        container.innerHTML = h;
      }

      function toggleDetail(id) {
        if (!id) return;
        var el = $('detail-' + id.replace(/[^a-zA-Z0-9]/g, '_'));
        if (el) el.classList.toggle('open');
      }

      function toggleHistoryDetail(id) {
        if (!id) return;
        var el = $('detail-' + id);
        if (el) el.classList.toggle('open');
      }

      function scrollHistoryItemIntoView(id) {
        var triggers = $$('[data-action="select-history"]');
        for (var i = 0; i < triggers.length; i++) {
          if (triggers[i].getAttribute('data-id') === id) {
            var item = triggers[i].closest('.history-item');
            if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
            break;
          }
        }
      }

      function renderExtensionIcon(report) {
        var label = (report.displayName || report.name || '?').trim();
        var fallback = esc(label.slice(0, 2).toUpperCase());
        if (report.iconDataUrl) return '<div class="ext-icon-wrap"><img class="ext-icon" src="' + escAttr(report.iconDataUrl) + '" alt="" /></div>';
        return '<div class="ext-icon-wrap"><span class="ext-icon-fallback">' + fallback + '</span></div>';
      }

      function resetHistoryDetail() {
        var detail = $('history-detail'), header = $('history-header');
        if (detail) { detail.innerHTML = ''; detail.classList.remove('visible'); }
        if (header) header.classList.remove('detail');
      }

      function openLatestHistoryEntry() {
        if (!scanHistory || scanHistory.length === 0) return;
        var first = scanHistory[0];
        if (!first) return;
        expandedHistoryEntryId = first.id || first.time;
        switchTab('history');
      }

      function navigateToHistoryWithFilter(filterLevel) {
        if (!scanHistory || scanHistory.length === 0) return;
        var first = scanHistory[0];
        if (!first) return;
        var historyId = first.id || first.time;
        expandedHistoryEntryId = historyId;
        if (filterLevel && filterLevel !== 'all') {
          inlineHistoryFilter[historyId] = filterLevel;
        } else {
          inlineHistoryFilter[historyId] = 'all';
        }
        switchTab('history');
      }

      function showConfirm(title, body, okLabel, onOk) {
        var overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = '<div class="confirm-box"><div class="confirm-title">' + esc(title) + '</div><div class="confirm-body">' + esc(body) + '</div><div class="confirm-actions"><button class="confirm-cancel">Cancel</button><button class="confirm-ok">' + esc(okLabel) + '</button></div></div>';
        document.body.appendChild(overlay);
        requestAnimationFrame(function() { overlay.classList.add('visible'); });
        function dismiss() { overlay.classList.remove('visible'); setTimeout(function() { overlay.remove(); }, 200); }
        overlay.querySelector('.confirm-cancel').addEventListener('click', dismiss);
        overlay.querySelector('.confirm-ok').addEventListener('click', function() { dismiss(); onOk(); });
        overlay.addEventListener('click', function(ev) { if (ev.target === overlay) dismiss(); });
      }

      function showScanConfirm() {
        showConfirm('Start Security Scan?', 'This will analyze all installed extensions for security risks, suspicious behavior, and excessive permissions.', 'Scan Now', function() {
          $('btn-scan').disabled = true;
          vscode.postMessage({ type: 'scan' });
        });
      }

      function showScoreExplainerModal() {
        var overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = '<div class="confirm-box">' +
          '<div class="confirm-title" style="display:flex;align-items:center;gap:6px">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:var(--accent)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
            '<span>How scores work</span>' +
          '</div>' +
          '<div class="confirm-body" style="font-size:11px;opacity:.7;line-height:1.5;margin-bottom:14px">' +
            'Lower score = safer. Higher score = more risky signals found. Treat high and critical first.' +
            '<div class="score-explainer-scale">' +
              '<span class="score-band low"><span class="score-band-dot"></span>0-25 Low</span>' +
              '<span class="score-band moderate"><span class="score-band-dot"></span>26-50 Moderate</span>' +
              '<span class="score-band high"><span class="score-band-dot"></span>51-75 High</span>' +
              '<span class="score-band critical"><span class="score-band-dot"></span>76-100 Critical</span>' +
            '</div>' +
          '</div>' +
          '<div class="confirm-actions">' +
            '<button class="confirm-cancel" style="width:100%">Close</button>' +
          '</div>' +
        '</div>';
        document.body.appendChild(overlay);
        requestAnimationFrame(function() { overlay.classList.add('visible'); });
        function dismiss() { overlay.classList.remove('visible'); setTimeout(function() { overlay.remove(); }, 200); }
        overlay.querySelector('.confirm-cancel').addEventListener('click', dismiss);
        overlay.addEventListener('click', function(ev) { if (ev.target === overlay) dismiss(); });
      }

      function getHistoryEntry(historyId) {
        if (!scanHistory) return null;
        for (var i = 0; i < scanHistory.length; i++) {
          var entryId = scanHistory[i].id || scanHistory[i].time;
          if (entryId === historyId) return scanHistory[i];
        }
        return null;
      }

      function renderHistoryInlineDetail(summary, historyId) {
        var safeHistoryId = sanitizeId(historyId);
        var searchId = 'inline-history-search-' + safeHistoryId, filterId = 'inline-history-filter-' + safeHistoryId;
        var filterValue = inlineHistoryFilter[historyId] || 'all', searchValue = inlineHistorySearch[historyId] || '';
        var h = '<div class="history-inline-detail">';
        h += '<div class="history-tools"><input id="' + searchId + '" data-history-search-id="' + escAttr(historyId) + '" type="text" placeholder="Search this scan..." value="' + escAttr(searchValue) + '"/><select id="' + filterId + '" data-history-filter-id="' + escAttr(historyId) + '"><option value="all"' + (filterValue === 'all' ? ' selected' : '') + '>All levels</option><option value="low"' + (filterValue === 'low' ? ' selected' : '') + '>Low</option><option value="moderate"' + (filterValue === 'moderate' ? ' selected' : '') + '>Moderate</option><option value="high"' + (filterValue === 'high' ? ' selected' : '') + '>High</option><option value="critical"' + (filterValue === 'critical' ? ' selected' : '') + '>Critical</option></select></div>';
        h += '<div class="history-inline-results">' + renderHistoryDetailResults(summary, filterValue, searchValue) + '</div>';
        h += '</div>';
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
          h += buildExtItemHtml(r, { toggleAction: 'toggle-history-detail', toggleId: safeId, showScore: true });
          h += '<div id="detail-' + safeId + '" class="ext-detail">';
          h += '<div class="detail-row"><span class="detail-label">Version</span><span>' + esc(r.version) + '</span></div>';
          if (r.marketplaceId) h += '<div class="detail-row"><span class="detail-label">ID</span><span>' + esc(r.marketplaceId) + '</span></div>';
          if (r.category) h += '<div class="detail-row"><span class="detail-label">Category</span><span>' + esc(r.category) + '</span></div>';
          h += '<div class="score-wrap"><div class="score-bar"><div class="score-fill" style="width:' + r.riskScore + '%;background:var(--' + cls + ')"></div></div><span class="score-num" style="color:var(--' + cls + ')">' + r.riskScore + '/100</span></div>';
          if (r.riskFactors && r.riskFactors.length) h += renderExpandableList('history-rf-' + safeId, 'Risk Factors', 'factor', r.riskFactors, 5);
          if (r.trustSignals && r.trustSignals.length) h += renderExpandableList('history-ts-' + safeId, 'Trust Signals', 'signal', r.trustSignals, 5);
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
        if (items.length > max) h += '<button class="show-more-btn" data-action="show-more" data-target="' + id + '">+' + (items.length - max) + ' more</button>';
        h += '</div>';
        return h;
      }

      function esc(s) { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
      function escAttr(s) { return esc(String(s)).replace(/'/g, '&#39;'); }
      function sanitizeId(s) { return String(s).replace(/[^a-zA-Z0-9]/g, '_'); }

      function updateInlineHistoryResults(historyId) {
        var entry = getHistoryEntry(historyId);
        if (!entry || !entry.summary) return;
        var searchValue = inlineHistorySearch[historyId] || '';
        var filterValue = inlineHistoryFilter[historyId] || 'all';
        var input = $('inline-history-search-' + sanitizeId(historyId));
        var wrapper = input ? input.closest('.history-inline-detail') : null;
        var results = wrapper ? wrapper.querySelector('.history-inline-results') : null;
        if (results) results.innerHTML = renderHistoryDetailResults(entry.summary, filterValue, searchValue);
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

      vscode.postMessage({ type: 'ready' });
      renderAll();
      renderHistory();
    })();
  `;
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
