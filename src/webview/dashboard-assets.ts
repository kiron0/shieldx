export function getDashboardStyles(): string {
  return `
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:var(--vscode-editor-background,#1e1e1e);--fg:var(--vscode-editor-foreground,#d4d4d4);--border:var(--vscode-panel-border,#3c3c3c);--card-bg:var(--vscode-editorWidget-background,#252526);--accent:var(--vscode-button-background,#007acc);--accent-fg:var(--vscode-button-foreground,#fff);--sec-bg:var(--vscode-button-secondaryBackground,#3c3c3c);--sec-fg:var(--vscode-button-secondaryForeground,#ccc);--input-bg:var(--vscode-input-background,#3c3c3c);--input-fg:var(--vscode-input-foreground,#ccc);--input-border:var(--vscode-input-border,#3c3c3c);--input-ph:var(--vscode-input-placeholderForeground,#888);--low:#4caf50;--moderate:#ff9800;--high:#f44336;--critical:#9c27b0;--radius:8px;--pad:12px;--accent-glow:rgba(0,122,204,.25)}
    .low{--c:var(--low);--bgc:#4caf5018;--glow:rgba(76,175,80,0.12)}
    .moderate{--c:var(--moderate);--bgc:#ff980018;--glow:rgba(255,152,0,0.12)}
    .high{--c:var(--high);--bgc:#f4433618;--glow:rgba(244,67,54,0.12)}
    .critical{--c:var(--critical);--bgc:#9c27b018;--glow:rgba(156,39,176,0.12)}
    [data-level="low"]{--c:var(--low);--bgc:#4caf5018;--glow:rgba(76,175,80,0.12)}
    [data-level="moderate"]{--c:var(--moderate);--bgc:#ff980018;--glow:rgba(255,152,0,0.12)}
    [data-level="high"]{--c:var(--high);--bgc:#f4433618;--glow:rgba(244,67,54,0.12)}
    [data-level="critical"]{--c:var(--critical);--bgc:#9c27b018;--glow:rgba(156,39,176,0.12)}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes pulse-ring{0%{box-shadow:0 0 0 0 var(--accent-glow)}70%{box-shadow:0 0 0 6px transparent}100%{box-shadow:0 0 0 0 transparent}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    .skeleton{background:linear-gradient(90deg,var(--card-bg) 25%,var(--border) 50%,var(--card-bg) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite linear;border-radius:var(--radius)}
    .skeleton-inline{display:inline-block;vertical-align:middle}
    .skeleton-card{background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);padding:10px 8px;text-align:center;height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
    .skeleton-view{width:100%;display:flex;flex-direction:column;gap:10px}
    body{font-family:var(--vscode-font-family,-apple-system,BlinkMacSystemFont,sans-serif);font-size:13px;background:var(--bg);color:var(--fg);line-height:1.5;overflow:hidden;height:100vh}
    .app-shell{height:100%;display:flex;flex-direction:column;padding:var(--pad);gap:10px}
    .app-top,.app-bottom{flex:0 0 auto}
    .app-main{flex:1 1 auto;min-height:0;overflow:hidden;display:flex}
    .header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border);position:relative}
    .header::after{content:'';position:absolute;bottom:-1px;left:0;width:60px;height:2px;background:linear-gradient(90deg,var(--accent),transparent);border-radius:1px}
    .header-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
    .header-icon{width:32px;height:32px;flex:0 0 32px;border-radius:9px;background:linear-gradient(135deg,var(--accent),#005a9e);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px var(--accent-glow)}
    .header-icon svg{width:18px;height:18px;color:var(--accent-fg)}
    .header-text{min-width:0}
    .header h1{font-size:14px;font-weight:700;letter-spacing:.3px;line-height:1.2}
    .header-slogan{font-size:10px;opacity:.45;letter-spacing:.5px;text-transform:uppercase;display:block}
    .header-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
    .icon-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;flex:0 0 28px;background:var(--card-bg);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--fg);opacity:.5;transition:all .2s;padding:0;text-decoration:none}
    .icon-btn svg{width:14px;height:14px}
    .icon-btn:hover{opacity:1;border-color:var(--accent);color:var(--accent);background:rgba(0,122,204,.08);transform:rotate(30deg)}
    .settings-btn.active{opacity:1;border-color:var(--accent);color:var(--accent);background:rgba(0,122,204,.08)}
    #progress-section{display:none;margin-bottom:10px}
    #progress-section.visible{display:block}
    .progress-row{display:flex;align-items:center;gap:8px}
    .progress-track{flex:1;height:4px;background:var(--border);border-radius:2px;overflow:hidden}
    .progress-fill{height:100%;width:0%;background:linear-gradient(90deg,var(--accent),#00a6ff);border-radius:2px;transition:width .3s}
    .progress-info{display:flex;justify-content:space-between;font-size:10px;opacity:.6;margin-top:4px}
    .progress-cancel{display:none;background:var(--sec-bg);color:var(--sec-fg);border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer}
    #progress-section.visible .progress-cancel{display:inline-flex}
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
    .nav-tabs{display:flex;gap:2px;background:var(--card-bg);border-radius:var(--radius);padding:3px;margin-bottom:16px;position:relative}
    .nav-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 4px 6px;font-size:10px;font-weight:600;border:none;background:transparent;color:var(--fg);opacity:.4;cursor:pointer;border-radius:6px;transition:all .2s;position:relative;z-index:1}
    .nav-tab svg{width:14px;height:14px;flex:0 0 14px;transition:color .2s}
    .nav-tab span{line-height:1}
    .nav-tab:hover{opacity:.65;background:rgba(255,255,255,.03)}
    .nav-tab.active{opacity:1;background:var(--bg);box-shadow:0 1px 3px rgba(0,0,0,.2)}
    .nav-tab.active svg{color:var(--accent)}
    .nav-tab.active::after{content:'';position:absolute;bottom:2px;left:25%;width:50%;height:2px;background:var(--accent);border-radius:1px}
    .panel{display:none;height:100%;overflow-y:auto;min-width:0}
    .panel.visible{display:flex;flex:1 1 auto;flex-direction:column;min-height:0}
    .summary-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;padding-top:2px}
    .card{background:var(--card-bg);border:1px solid var(--border);border-left:3px solid var(--c,var(--accent));border-radius:var(--radius);padding:10px 8px;text-align:center;transition:border-color .2s,transform .15s;cursor:pointer}
    .card:hover{transform:translateY(-1px);border-color:var(--c,var(--accent))}
    .card .card-icon{display:flex;justify-content:center;margin-bottom:4px}
    .card .card-icon svg{width:14px;height:14px;color:var(--c,var(--fg));opacity:.65}
    .card .count{font-size:20px;font-weight:800;line-height:1.2;color:var(--c);letter-spacing:-.3px}
    .card .label{font-size:9px;opacity:.5;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
    .card.total-card{border-left-color:var(--accent)}
    .card.total-card .count{color:var(--fg)}
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
    .section-card-header{display:flex;align-items:center;gap:6px;margin-bottom:8px}
    .section-card-icon{width:14px;height:14px;opacity:.6;color:var(--accent)}
    .section-card-title{font-size:11px;font-weight:700;opacity:.85}
    .rec-actions{margin-bottom:10px;padding:10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--card-bg)}.rec-actions.hidden{display:none}
    .rec-list{list-style:none;display:flex;flex-direction:column;gap:4px}
    .rec-list li{padding:6px 8px;font-size:11px;display:flex;align-items:center;gap:8px;border-radius:6px;background:rgba(255,255,255,.02);border:1px solid var(--border);transition:border-color .15s}
    .rec-list li:hover{border-color:var(--accent)}
    .rec-list li .rec-dot{width:6px;height:6px;border-radius:50%}
    .rec-list li .rec-text{flex:1;min-width:0}
    .score-explainer-trigger{display:inline-flex;font-size:0;opacity:.5}
    .score-explainer-scale{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    .score-band{font-size:10px;padding:3px 8px;border-radius:999px;background:var(--bgc);color:var(--c);font-weight:600;display:flex;align-items:center;gap:4px;transition:transform .15s}
    .score-band:hover{transform:scale(1.05)}
    .score-band-dot{width:5px;height:5px;border-radius:50%;background:var(--c)}
    .empty-state{text-align:center;padding:32px 16px;opacity:1}
    .empty-state-icon{width:56px;height:56px;margin:0 auto 14px;border-radius:16px;background:linear-gradient(135deg,rgba(0,122,204,.12),rgba(0,122,204,.04));display:flex;align-items:center;justify-content:center;animation:float 4s ease-in-out infinite}
    .empty-state-icon svg{width:28px;height:28px;color:var(--accent);opacity:.7}
    .empty-state-title{font-size:14px;font-weight:700;margin-bottom:4px;opacity:.75}
    .empty-state-sub{font-size:11px;opacity:.4;line-height:1.5}
    #empty-state,#ext-empty,#history-empty{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0}
    .empty-state svg{width:36px;height:36px;margin-bottom:8px}
    .empty-state p{font-size:12px}
    .last-scan{font-size:10px;opacity:.4;text-align:center;margin-top:8px;padding:0}
    .last-scan:empty{display:none}
    .search-bar{margin-bottom:6px;position:relative}
    .search-bar input{width:100%;background:var(--input-bg);color:var(--input-fg);border:1px solid var(--input-border);border-radius:var(--radius);padding:6px 42px 6px 10px;font-size:12px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
    .search-bar input:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}
    .search-bar input::placeholder{color:var(--input-ph)}
    .filter-bar{display:flex;gap:6px;align-items:center;justify-content:flex-end;margin-bottom:8px}
    .ext-count{position:absolute;top:50%;right:10px;transform:translateY(-50%);font-size:10px;opacity:.5;pointer-events:none}
    .ext-toolbar{position:sticky;top:0;z-index:3;background:var(--bg);padding-bottom:6px;margin-bottom:2px;display:flex;align-items:center;gap:8px}
    .ext-toolbar .search-bar{flex:1;margin-bottom:0}
    .ext-toolbar-actions{display:flex;align-items:center;gap:6px;flex:0 0 auto}
    .ext-list{display:flex;flex-direction:column;gap:4px;width:100%;padding:2px 0}
    .ext-item{background:linear-gradient(145deg, var(--card-bg), rgba(255,255,255,.01));border:1px solid var(--border);border-radius:var(--radius);padding:12px;cursor:pointer;transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);width:100%}
    .ext-item.risk-accent{border-left:4px solid var(--c,var(--border))}
    .ext-item:hover{border-color:var(--c,var(--accent));transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.15), 0 2px 8px var(--glow, var(--accent-glow));background:linear-gradient(145deg, var(--card-bg), rgba(255,255,255,.03))}
    .ext-item-header{display:flex;align-items:center;gap:12px}
    .ext-icon-wrap{width:30px;height:30px;flex:0 0 30px;border-radius:6px;overflow:hidden;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.06);transition:transform .2s}
    .ext-item:hover .ext-icon-wrap{transform:scale(1.05)}
    .ext-icon{width:100%;height:100%;object-fit:cover;display:block}
    .ext-icon-fallback{font-size:11px;font-weight:700;opacity:.65;text-transform:uppercase}
    .ext-item-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
    .ext-name{font-weight:600;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;color:var(--fg)}
    .ext-pub{font-size:10px;opacity:.5;display:block}
    .ext-version{font-size:10px;font-weight:600;white-space:nowrap;opacity:.6;background:rgba(255,255,255,.05);padding:2px 6px;border-radius:4px;border:1px solid rgba(255,255,255,.03)}
    .ext-score{font-size:12px;font-weight:700;white-space:nowrap}
    .ext-meta{display:flex;align-items:center;gap:8px;margin-left:auto}
    .item-toggle{background:none;border:none;color:var(--fg);opacity:.55;cursor:pointer;font-size:12px;padding:0;line-height:1}
    .item-toggle:hover{opacity:.85}
    .status-chip{font-size:9.5px;padding:3px 8px;border-radius:6px;font-weight:600;text-transform:capitalize;letter-spacing:.2px;white-space:nowrap;background:var(--bgc);color:var(--c);border:1px solid var(--c)}
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
    .history-toolbar{position:sticky;top:0;z-index:3;background:var(--bg);padding-bottom:6px;margin-bottom:2px}
    .history-toolbar .search-bar{display:flex;gap:6px;align-items:center;width:100%}
    .history-toolbar .search-bar input{flex:1;background:var(--input-bg);color:var(--input-fg);border:1px solid var(--input-border);border-radius:var(--radius);padding:6px 10px;font-size:12px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
    .history-toolbar .search-bar input:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}
    .history-clear-btn{display:none;align-items:center;justify-content:center;width:28px;height:28px;background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;color:var(--fg);opacity:.6;transition:all .2s;padding:0;flex:0 0 28px}
    .history-toolbar.has-history .history-clear-btn{display:inline-flex}
    .history-clear-btn:hover{opacity:1;border-color:var(--high);color:var(--high);background:rgba(244,67,54,.08)}
    .history-clear-btn svg{width:14px;height:14px}
    #panel-history{overflow:hidden}
    #history-content{flex:1 1 auto;min-height:0}
    .history-list{display:flex;flex-direction:column;gap:4px;flex:1 1 auto;min-height:0;overflow-y:auto;padding:2px 2px 2px 0}
    .history-list.history-list-expanded{overflow:hidden}
    .history-item{background:linear-gradient(145deg, var(--card-bg), rgba(255,255,255,.01));border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:var(--radius);padding:12px;font-size:11px;transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);display:flex;flex-direction:column;gap:8px;margin-bottom:6px}
    .history-item[data-history-level="low"]{border-left-color:var(--low)}
    .history-item[data-history-level="moderate"]{border-left-color:var(--moderate)}
    .history-item[data-history-level="high"]{border-left-color:var(--high)}
    .history-item[data-history-level="critical"]{border-left-color:var(--critical)}
    .history-item:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.15), 0 2px 8px var(--accent-glow)}
    .history-item.history-item-expanded{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden}
    .history-inline-detail{margin-top:10px;display:flex;flex-direction:column;flex:1 1 auto;min-height:0;width:100%;overflow:hidden;border-top:1px solid var(--border);padding-top:12px}
    .history-detail{display:none}.history-detail.visible{display:block}
    .history-tools{display:flex;gap:6px;align-items:center;margin:8px 0;margin-bottom:12px}
    .history-tools input,.history-tools select{background:var(--input-bg);color:var(--input-fg);border:1px solid var(--input-border);border-radius:var(--radius);padding:6px 10px;font-size:12px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
    .history-tools input:focus,.history-tools select:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}
    .history-tools input::placeholder{color:var(--input-ph)}
    .history-tools input{flex:1}
    .history-inline-detail .history-tools{position:sticky;top:0;z-index:2;margin-top:0;padding-bottom:8px;margin-bottom:12px;background:var(--card-bg)}
    .history-inline-results{overflow-y:auto;flex:1 1 auto;min-height:0;width:100%;padding-right:2px}
    .history-item-top{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%}
    .history-item-main{flex:1;min-width:0;cursor:pointer}
    .history-item-header-toggle{cursor:pointer}
    .history-item-actions{display:flex;gap:6px;align-items:center}
    .history-action-btn{background:transparent;border:1px solid var(--border);color:var(--fg);opacity:.6;width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;padding:0}
    .history-action-btn:hover{opacity:1;border-color:var(--accent);color:var(--accent);background:rgba(0,122,204,.08)}
    .history-action-btn.delete-btn:hover{border-color:var(--high);color:var(--high);background:rgba(244,67,54,.08)}
    .history-action-btn svg{width:13px;height:13px;transition:transform .2s}
    .history-action-btn.expanded svg.chevron-icon{transform:rotate(180deg)}
    .h-time{font-size:11px;font-weight:600;color:var(--fg);opacity:.85;margin-bottom:4px}
    .h-stats{display:flex;gap:6px;align-items:center;margin-top:4px}
    .h-stat-pill{font-size:9.5px;padding:2px 8px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);color:var(--fg);opacity:.8}
    .h-stat-pill.high{background:rgba(244,67,54,.1);border-color:rgba(244,67,54,.2);color:var(--high);opacity:1;font-weight:600}
    .h-stat-pill.crit{background:rgba(156,39,176,.1);border-color:rgba(156,39,176,.2);color:var(--critical);opacity:1;font-weight:600}
    .h-mini-dist{display:flex;height:3px;border-radius:1.5px;overflow:hidden;background:var(--border);margin-top:8px;width:100%}
    .h-mini-seg{height:100%;background:var(--c)}
    .about-box{border-top:1px solid var(--border);padding:10px;margin-top:2px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)}
    .about-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .about-icon{width:28px;height:28px;flex:0 0 28px;border-radius:7px;background:linear-gradient(135deg,var(--accent),#005a9e);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px var(--accent-glow)}
    .about-icon svg{width:15px;height:15px;color:var(--accent-fg)}
    .about-title{font-size:11px;font-weight:700;letter-spacing:.2px}
    .about-author{font-size:10px;opacity:.5}
    .about-desc{font-size:10px;opacity:.6;line-height:1.5}
    #ext-list .ext-item:hover{border-color:var(--accent);box-shadow:0 2px 8px rgba(0,0,0,.15)}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
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
    .settings-panel{display:flex;flex-direction:column;gap:12px;padding:2px 0}
    .settings-section{background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
    .settings-section-title{display:flex;align-items:center;gap:6px;padding:10px 12px;font-size:11px;font-weight:700;letter-spacing:.3px;border-bottom:1px solid var(--border);background:rgba(255,255,255,.02)}
    .settings-section-title svg{width:13px;height:13px;opacity:.5;color:var(--accent)}
    .setting-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
    .setting-row:last-child{border-bottom:none}
    .setting-row:hover{background:rgba(255,255,255,.02)}
    .setting-info{flex:1;min-width:0}
    .setting-label{display:block;font-size:11px;font-weight:600}
    .setting-desc{display:block;font-size:9px;opacity:.4;margin-top:1px;line-height:1.3}
    .toggle-switch{position:relative;width:32px;height:18px;flex:0 0 32px}
    .toggle-switch input{opacity:0;width:0;height:0;position:absolute}
    .toggle-slider{position:absolute;cursor:pointer;inset:0;background:var(--border);border-radius:9px;transition:all .2s}
    .toggle-slider::before{content:'';position:absolute;left:2px;bottom:2px;width:14px;height:14px;background:var(--fg);border-radius:50%;transition:all .2s}
    .toggle-switch input:checked + .toggle-slider{background:var(--accent)}
    .toggle-switch input:checked + .toggle-slider::before{transform:translateX(14px);background:var(--accent-fg)}
    .setting-select{background:var(--input-bg);color:var(--input-fg);border:1px solid var(--input-border);border-radius:6px;padding:4px 8px;font-size:11px;font-family:inherit;outline:none;cursor:pointer;transition:border-color .2s;min-width:90px}
    .setting-select:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}
  `;
}

export function getDashboardScript(dateFormattersScript: string): string {
  return `
    (function() {
      var vscode = acquireVsCodeApi();
      var scanData = null;
      var scanHistory = [];
      var expandedHistoryEntryId = null;
      var shouldAutoOpenLatestHistory = false;
      var inlineHistorySearch = {};
      var inlineHistoryFilter = {};
      var currentSettings = {};
      var loadedScan = false;
      var loadedHistory = false;
      var loadedSettings = false;

      function updateScanLoadedState(loaded) {
        loadedScan = loaded;
        var overviewSkel = $('overview-skeleton');
        var overviewCont = $('overview-content');
        var extSkel = $('extensions-skeleton');
        var extCont = $('extensions-content');
        if (loadedScan) {
          if (overviewSkel) overviewSkel.style.display = 'none';
          if (overviewCont) overviewCont.style.display = 'flex';
          if (extSkel) extSkel.style.display = 'none';
          if (extCont) extCont.style.display = 'flex';
        } else {
          if (overviewSkel) overviewSkel.style.display = 'flex';
          if (overviewCont) overviewCont.style.display = 'none';
          if (extSkel) extSkel.style.display = 'flex';
          if (extCont) extCont.style.display = 'none';
        }
      }

      function updateHistoryLoadedState(loaded) {
        loadedHistory = loaded;
        var histSkel = $('history-skeleton');
        var histCont = $('history-content');
        if (loadedHistory) {
          if (histSkel) histSkel.style.display = 'none';
          if (histCont) histCont.style.display = 'flex';
        } else {
          if (histSkel) histSkel.style.display = 'flex';
          if (histCont) histCont.style.display = 'none';
        }
      }

      function updateSettingsLoadedState(loaded) {
        loadedSettings = loaded;
        var setSkel = $('settings-skeleton');
        var setCont = $('settings-content');
        if (loadedSettings) {
          if (setSkel) setSkel.style.display = 'none';
          if (setCont) setCont.style.display = 'flex';
        } else {
          if (setSkel) setSkel.style.display = 'flex';
          if (setCont) setCont.style.display = 'none';
        }
      }

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
          showConfirm('Cancel Security Scan?', 'This will stop current extension scan before completion.', 'Stop Scan', function() {
            vscode.postMessage({ type: 'cancelScan' });
          });
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
      $('history-main-search').addEventListener('input', function() { renderHistory(); });

      window.addEventListener('message', function(event) {
        var msg = event.data;
        if (msg.type === 'scanResult') { scanData = msg.data; updateScanLoadedState(true); renderAll(); }
        else if (msg.type === 'scanProgress') { updateProgress(msg.percent, msg.text); }
        else if (msg.type === 'scanStart') { shouldAutoOpenLatestHistory = true; showProgress(true); }
        else if (msg.type === 'scanCancelled') { shouldAutoOpenLatestHistory = false; }
        else if (msg.type === 'scanEnd') { showProgress(false); if (shouldAutoOpenLatestHistory) openLatestHistoryEntry(); shouldAutoOpenLatestHistory = false; }
        else if (msg.type === 'history') { scanHistory = msg.history || []; expandedHistoryEntryId = null; updateHistoryLoadedState(true); renderHistory(); }
        else if (msg.type === 'scanCleared') { scanData = null; expandedHistoryEntryId = null; updateScanLoadedState(true); renderAll(); renderHistory(); }
        else if (msg.type === 'historyEntryCleared') {
          if (expandedHistoryEntryId === msg.id) expandedHistoryEntryId = null;
          renderHistory();
        }
        else if (msg.type === 'settingsData') { currentSettings = msg.settings || {}; updateSettingsLoadedState(true); applySettings(msg.settings); }
      });

      function switchTab(tab) {
        var cur = q('.nav-tab.active');
        if (cur && cur.getAttribute('data-tab') === 'history' && tab !== 'history' && expandedHistoryEntryId) {
          expandedHistoryEntryId = null;
          renderHistory();
        }
        $$('.panel').forEach(function(p){ p.classList.remove('visible'); });
        $$('.nav-tab').forEach(function(t){ t.classList.remove('active'); });
        var settingsBtn = q('.settings-btn');
        if (settingsBtn) settingsBtn.classList.remove('active');
        var panel = $('panel-' + tab); if (panel) panel.classList.add('visible');
        if (tab === 'settings') {
          if (settingsBtn) settingsBtn.classList.add('active');
          vscode.postMessage({ type: 'requestSettings' });
        } else {
          var tabEl = q('.nav-tab[data-tab="' + tab + '"]'); if (tabEl) tabEl.classList.add('active');
        }
        if (tab === 'extensions') renderExtensions();
        if (tab === 'history') renderHistory();
      }

      function showProgress(vis) {
        var el = $('progress-section');
        if (vis) el.classList.add('visible');
        else { el.classList.remove('visible'); $('btn-scan').disabled = false; $('progress-fill').style.width = '0%'; }
      }

      function updateHistoryDependentUi() {
        var hasHistory = !!(scanHistory && scanHistory.length > 0);
        var extToolbar = $('ext-toolbar');
        var extSearch = extToolbar ? extToolbar.querySelector('.search-bar') : null;
        var scoreExplainer = $('score-explainer-trigger');
        if (extToolbar) extToolbar.style.display = '';
        if (extSearch) extSearch.style.display = hasHistory ? '' : 'none';
        if (scoreExplainer) scoreExplainer.style.display = 'inline-flex';
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
        var itemClass = 'ext-item' + (opts.riskAccent ? ' risk-accent' : '');
        var h = '<div class="' + itemClass + '" ' + (opts.clickAction ? 'data-action="' + opts.clickAction + '" ' : '') + (opts.dataId ? 'data-id="' + opts.dataId + '" ' : '') + 'data-level="' + cls + '">';
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
        var c = $('history-list'), empty = $('history-empty'), header = $('history-header'), detail = $('history-detail');
        updateHistoryDependentUi();
        if (!scanHistory || scanHistory.length === 0) {
          c.innerHTML = '';
          c.classList.remove('history-list-expanded');
          expandedHistoryEntryId = null;
          resetHistoryDetail();
          c.style.display = 'none';
          if (detail) detail.style.display = 'none';
          if (header) header.classList.remove('has-history');
          if (header) header.style.display = 'none';
          empty.style.display = 'flex';
          return;
        }
        c.style.display = '';
        if (detail) detail.style.display = '';
        if (header) header.style.display = '';
        empty.style.display = 'none';
        if (header) header.classList.add('has-history');
        resetHistoryDetail();
        if (expandedHistoryEntryId) c.classList.add('history-list-expanded');
        else c.classList.remove('history-list-expanded');
        var h = '';
        var renderedCount = 0;
        var mainSearch = $('history-main-search') ? $('history-main-search').value.toLowerCase() : '';
        for (var i = 0; i < scanHistory.length; i++) {
          var s = scanHistory[i];
          var historyId = s.id || s.time;
          var expanded = expandedHistoryEntryId === historyId;
          if (expandedHistoryEntryId && !expanded) continue;

          if (mainSearch) {
            var dateStr = formatDateTime(s.time).toLowerCase();
            var matchesDate = dateStr.indexOf(mainSearch) !== -1;
            var matchesExt = false;
            if (s.summary && s.summary.reports) {
              for (var k = 0; k < s.summary.reports.length; k++) {
                var r = s.summary.reports[k];
                if ((r.displayName || r.name).toLowerCase().indexOf(mainSearch) !== -1 || r.publisher.toLowerCase().indexOf(mainSearch) !== -1) {
                  matchesExt = true;
                  break;
                }
              }
            }
            if (!matchesDate && !matchesExt) continue;
          }
          renderedCount++;

          var historyCounts = getHistoryRiskCounts(s);
          var historyLevel = getHistoryRiskLevel(historyCounts);

          var totalVal = historyCounts.total || 1;
          var lowPct = Math.round(historyCounts.low / totalVal * 100);
          var modPct = Math.round(historyCounts.moderate / totalVal * 100);
          var highPct = Math.round(historyCounts.high / totalVal * 100);
          var critPct = Math.round(historyCounts.critical / totalVal * 100);

          var miniBar = '<div class="h-mini-dist">';
          if (lowPct > 0) miniBar += '<div class="h-mini-seg low" style="width:' + lowPct + '%" title="Low: ' + historyCounts.low + '"></div>';
          if (modPct > 0) miniBar += '<div class="h-mini-seg moderate" style="width:' + modPct + '%" title="Moderate: ' + historyCounts.moderate + '"></div>';
          if (highPct > 0) miniBar += '<div class="h-mini-seg high" style="width:' + highPct + '%" title="High: ' + historyCounts.high + '"></div>';
          if (critPct > 0) miniBar += '<div class="h-mini-seg critical" style="width:' + critPct + '%" title="Critical: ' + historyCounts.critical + '"></div>';
          miniBar += '</div>';

          var statsPills = '<span class="h-stat-pill">' + historyCounts.total + ' total</span>';
          if (historyCounts.high > 0) statsPills += '<span class="h-stat-pill high">' + historyCounts.high + ' high</span>';
          if (historyCounts.critical > 0) statsPills += '<span class="h-stat-pill crit">' + historyCounts.critical + ' crit</span>';

          h += '<div class="history-item' + (expanded ? ' history-item-expanded' : '') + '"' + (historyLevel ? ' data-history-level="' + historyLevel + '"' : '') + '>';
          h += '<div class="history-item-top">';
          h += '<div class="history-item-main history-item-header-toggle" data-action="select-history" data-id="' + escAttr(historyId) + '">';
          h += '<div class="h-time">' + formatDateTime(s.time) + '</div>';
          h += '<div class="h-stats">' + statsPills + '</div>';
          h += miniBar;
          h += '</div>';
          h += '<div class="history-item-actions">';
          h += '<button class="history-action-btn' + (expanded ? ' expanded' : '') + '" data-action="select-history" data-id="' + escAttr(historyId) + '" aria-label="' + (expanded ? 'Collapse history item' : 'Expand history item') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><polyline points="6 9 12 15 18 9"/></svg></button>';
          h += '<button class="history-action-btn delete-btn" data-action="clear-history-entry" data-id="' + escAttr(historyId) + '" title="Clear Scan Entry"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="trash-icon"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>';
          h += '</div>';
          h += '</div>';

          if (expanded && s.summary) h += renderHistoryInlineDetail(s.summary, historyId);
          h += '</div>';
        }
        if (mainSearch && renderedCount === 0) {
          c.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.5">No matching scans found</div>';
        } else {
          c.innerHTML = h;
        }
      }

      function toggleHistoryEntry(id) {
        if (!id) return;
        expandedHistoryEntryId = expandedHistoryEntryId === id ? null : id;
        renderHistory();
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
                buildExportFormatOptions() +
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
        updateHistoryDependentUi();
        if (!scanData || !scanData.reports) {
          $('empty-state').style.display = 'flex';
          $('summary-cards').innerHTML = '';
          $('dist-bar').innerHTML = '';
          if (distSection) distSection.classList.add('hidden');
          $('rec-actions').classList.add('hidden');
          $('last-scan').textContent = '';
          return;
        }
        $('empty-state').style.display = 'none';
        if (distSection) distSection.classList.remove('hidden');
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
        updateHistoryDependentUi();
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
        if (reports.length === 0) { container.innerHTML = ''; empty.style.display = 'flex'; return; }
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
            '<div style="margin-bottom:10px">ShieldX combines trust signals, risky behavior, package reputation, permissions, scripts, and known vulnerabilities into one score from 0 to 100.</div>' +
            '<div style="margin-bottom:10px">Lower score = fewer warning signs. Higher score = stronger or more numerous risk signals. Score is guide for review priority, not proof that extension is safe or malicious.</div>' +
            '<div class="score-explainer-scale">' +
              '<span class="score-band low"><span class="score-band-dot"></span>0-25 Low</span>' +
              '<span class="score-band moderate"><span class="score-band-dot"></span>26-50 Moderate</span>' +
              '<span class="score-band high"><span class="score-band-dot"></span>51-75 High</span>' +
              '<span class="score-band critical"><span class="score-band-dot"></span>76-100 Critical</span>' +
            '</div>' +
            '<div style="margin-top:12px;display:grid;gap:8px">' +
              '<div><strong style="color:var(--low)">Low</strong> <span style="opacity:.9">Minor or few concerns. Usually OK to keep, but still read details if extension has broad permissions or install scripts.</span></div>' +
              '<div><strong style="color:var(--moderate)">Moderate</strong> <span style="opacity:.9">Some notable signals. Review risk factors, publisher trust, and capabilities before relying on it in sensitive work.</span></div>' +
              '<div><strong style="color:var(--high)">High</strong> <span style="opacity:.9">Strong warning signs or multiple combined risks. Audit soon. Limit trust until you understand why it scored high.</span></div>' +
              '<div><strong style="color:var(--critical)">Critical</strong> <span style="opacity:.9">Severe indicators, stacked risky behavior, or serious vulnerability evidence. Treat as highest priority. Consider disabling until reviewed.</span></div>' +
            '</div>' +
            '<div style="margin-top:12px">Best workflow: open highest score first, read Risk Factors, check recommendation, then inspect permissions, scripts, dependencies, and publisher details.</div>' +
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

      function getHistoryRiskCounts(entry) {
        var counts = {
          low: Number(entry && entry.low) || 0,
          moderate: Number(entry && entry.moderate) || 0,
          high: Number(entry && entry.high) || 0,
          critical: Number(entry && entry.critical) || 0,
          total: Number(entry && entry.total) || 0
        };
        var reports = entry && entry.summary && entry.summary.reports;
        if (!reports || !reports.length) return counts;

        counts.low = 0;
        counts.moderate = 0;
        counts.high = 0;
        counts.critical = 0;
        for (var i = 0; i < reports.length; i++) {
          var level = reports[i] && reports[i].riskLevel;
          if (level === 'critical') counts.critical++;
          else if (level === 'high') counts.high++;
          else if (level === 'moderate') counts.moderate++;
          else if (level === 'low') counts.low++;
        }
        counts.total = reports.length;
        return counts;
      }

      function getHistoryRiskLevel(counts) {
        if (counts.critical > 0) return 'critical';
        if (counts.high > 0) return 'high';
        if (counts.moderate > 0) return 'moderate';
        if (counts.low > 0) return 'low';
        return '';
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
          h += buildExtItemHtml(r, { toggleAction: 'toggle-history-detail', toggleId: safeId, showScore: true, riskAccent: true });
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

${dateFormattersScript}

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
        if (e.target && e.target.hasAttribute('data-setting')) {
          var key = e.target.getAttribute('data-setting');
          var val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
          vscode.postMessage({ type: 'updateSetting', key: key, value: val });
          return;
        }
        if (e.target && e.target.id === 'history-risk-filter' && false) return;
      });

      function buildExportFormatOptions() {
        var formats = [
          { value: 'markdown', label: 'Markdown (.md)' },
          { value: 'json', label: 'JSON (.json)' },
          { value: 'html', label: 'HTML (.html)' },
          { value: 'pdf', label: 'PDF (.pdf)' },
          { value: 'csv', label: 'CSV (.csv)' },
          { value: 'sarif', label: 'SARIF (.sarif.json)' }
        ];
        var selected = (currentSettings && currentSettings.reportFormat) || 'markdown';
        var h = '';
        for (var i = 0; i < formats.length; i++) {
          h += '<option value="' + formats[i].value + '"' + (formats[i].value === selected ? ' selected' : '') + '>' + formats[i].label + '</option>';
        }
        return h;
      }

      function applySettings(settings) {
        if (!settings) return;
        var keys = Object.keys(settings);
        for (var i = 0; i < keys.length; i++) {
          var el = q('[data-setting="' + keys[i] + '"]');
          if (!el) continue;
          if (el.type === 'checkbox') el.checked = !!settings[keys[i]];
          else el.value = settings[keys[i]];
        }
      }

      vscode.postMessage({ type: 'ready' });
      renderAll();
      renderHistory();
    })();
  `;
}

export function getDashboardNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
