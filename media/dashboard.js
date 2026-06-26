/* Shieldex Dashboard JavaScript */
const vscode = acquireVsCodeApi();
let scanData = null;

window.addEventListener('message', function (event) {
  const msg = event.data;
  if (msg.type === 'scanResult') {
    scanData = msg.data;
    renderAll();
  }
});

function scanExtensions() {
  vscode.postMessage({ type: 'scan' });
}
function refreshDashboard() {
  vscode.postMessage({ type: 'refresh' });
}
function exportReport(format) {
  vscode.postMessage({ type: 'export', format });
}

function getRiskLevel(score) {
  if (score <= 25) return 'low';
  if (score <= 50) return 'moderate';
  if (score <= 75) return 'high';
  return 'critical';
}

function renderAll() {
  if (!scanData || !scanData.reports) {
    document.getElementById('empty-state').style.display = 'block';
    return;
  }
  document.getElementById('empty-state').style.display = 'none';
  if (scanData.scannedAt) {
    document.getElementById('scan-time').textContent =
      'Last scan: ' + new Date(scanData.scannedAt).toLocaleTimeString();
  }
  renderSummaryCards();
  renderRecommendedActions();
  renderTable();
}

function renderSummaryCards() {
  var container = document.getElementById('summary-cards');
  var d = scanData;
  container.innerHTML = [
    { label: 'Total', count: d.totalExtensions, cls: '' },
    { label: 'Low', count: d.lowRisk, cls: 'low' },
    { label: 'Moderate', count: d.moderateRisk, cls: 'moderate' },
    { label: 'High', count: d.highRisk, cls: 'high' },
    { label: 'Critical', count: d.criticalRisk, cls: 'critical' },
  ]
    .map(function (c) {
      return (
        '<div class="card ' +
        c.cls +
        '"><div class="count">' +
        c.count +
        '</div><div class="label">' +
        c.label +
        '</div></div>'
      );
    })
    .join('');
}

function renderRecommendedActions() {
  var container = document.getElementById('recommended-actions');
  var list = document.getElementById('rec-actions-list');
  var reports = scanData.reports || [];
  var actions = [];

  var riskyCount = reports.filter(function (r) {
    return r.riskLevel === 'high' || r.riskLevel === 'critical';
  }).length;
  var suspiciousCount = reports.filter(function (r) {
    return r.riskLevel === 'moderate';
  }).length;
  var withInstallScripts = reports.filter(function (r) {
    return (
      r.riskFactors &&
      r.riskFactors.some(function (f) {
        return f.id === 'install-script';
      })
    );
  }).length;
  var noRepo = reports.filter(function (r) {
    return (
      r.riskFactors &&
      r.riskFactors.some(function (f) {
        return f.id === 'no-repo';
      })
    );
  }).length;
  var noLicense = reports.filter(function (r) {
    return (
      r.riskFactors &&
      r.riskFactors.some(function (f) {
        return f.id === 'no-license';
      })
    );
  }).length;

  if (riskyCount > 0) {
    actions.push({
      icon: 'warn',
      text:
        'Review ' +
        riskyCount +
        ' high/critical risk extension' +
        (riskyCount > 1 ? 's' : '') +
        ' — consider disabling',
    });
  }
  if (suspiciousCount > 0) {
    actions.push({
      icon: 'info',
      text:
        'Investigate ' +
        suspiciousCount +
        ' moderate risk extension' +
        (suspiciousCount > 1 ? 's' : ''),
    });
  }
  if (withInstallScripts > 0) {
    actions.push({
      icon: 'warn',
      text:
        withInstallScripts +
        ' extension' +
        (withInstallScripts > 1 ? 's' : '') +
        ' run' +
        (withInstallScripts > 1 ? '' : 's') +
        ' install scripts — verify publisher',
    });
  }
  if (noRepo > 0) {
    actions.push({
      icon: 'info',
      text:
        noRepo +
        ' extension' +
        (noRepo > 1 ? 's' : '') +
        ' lack' +
        (noRepo > 1 ? '' : 's') +
        ' a source repository',
    });
  }
  if (noLicense > 0) {
    actions.push({
      icon: 'info',
      text:
        noLicense +
        ' extension' +
        (noLicense > 1 ? 's' : '') +
        ' lack' +
        (noLicense > 1 ? '' : 's') +
        ' a license',
    });
  }
  actions.push({ icon: 'ok', text: 'Export a security report for your team' });

  if (actions.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  list.innerHTML = actions
    .map(function (a) {
      return (
        '<li><span class="rec-icon ' +
        a.icon +
        '">' +
        (a.icon === 'warn' ? '!' : a.icon === 'info' ? 'i' : '\u2713') +
        '</span>' +
        a.text +
        '</li>'
      );
    })
    .join('');
}

function renderTable() {
  var filter = document.getElementById('risk-filter').value;
  var tbody = document.getElementById('ext-table-body');
  var reports = scanData.reports || [];
  if (filter !== 'all') {
    reports = reports.filter(function (r) {
      return r.riskLevel === filter;
    });
  }
  tbody.innerHTML = reports
    .map(function (r) {
      return (
        '<tr>' +
        '<td>' +
        (r.displayName || r.name) +
        '</td>' +
        '<td>' +
        r.publisher +
        '</td>' +
        '<td><span class="badge ' +
        r.riskLevel +
        '">' +
        r.riskLevel.toUpperCase() +
        '</span></td>' +
        '<td>' +
        r.riskScore +
        '</td>' +
        '<td><button onclick="showDetail(\'' +
        r.id +
        '\')">Details</button></td>' +
        '</tr>'
      );
    })
    .join('');
}

function showDetail(id) {
  var ext = (scanData.reports || []).find(function (r) {
    return r.id === id;
  });
  if (!ext) return;

  var panel = document.getElementById('detail-panel');
  var recClass =
    ext.riskLevel === 'low' || ext.riskLevel === 'moderate' ? ' safe' : '';

  var html =
    '<h3>' +
    (ext.displayName || ext.name) +
    '</h3>' +
    '<p><strong>Publisher:</strong> ' +
    ext.publisher +
    '</p>' +
    '<p><strong>Version:</strong> ' +
    ext.version +
    '</p>';
  if (ext.marketplaceId)
    html += '<p><strong>Marketplace ID:</strong> ' + ext.marketplaceId + '</p>';
  if (ext.category)
    html += '<p><strong>Category:</strong> ' + ext.category + '</p>';
  html +=
    '<p><strong>Risk Score:</strong> ' +
    ext.riskScore +
    '/100 <span class="badge ' +
    ext.riskLevel +
    '">' +
    ext.riskLevel.toUpperCase() +
    '</span></p>' +
    '<h2>Risk Factors</h2>' +
    (ext.riskFactors || [])
      .map(function (f) {
        return (
          '<div class="risk-factor"><strong>' +
          f.title +
          '</strong>: ' +
          f.description +
          '</div>'
        );
      })
      .join('') +
    '<h2>Trust Signals</h2>' +
    (ext.trustSignals || [])
      .map(function (s) {
        return (
          '<div class="risk-factor" style="color:#4caf50"><strong>+ ' +
          s.title +
          '</strong>: ' +
          s.description +
          '</div>'
        );
      })
      .join('');
  if (ext.extensionDependencies && ext.extensionDependencies.length > 0) {
    html +=
      '<h2>Dependencies (' +
      ext.extensionDependencies.length +
      ')</h2>' +
      '<div class="risk-factor">' +
      ext.extensionDependencies
        .slice(0, 20)
        .map(function (d) {
          return d.name + '@' + d.version;
        })
        .join(', ') +
      (ext.extensionDependencies.length > 20 ? '...' : '') +
      '</div>';
  }
  html +=
    '<div class="recommendation' +
    recClass +
    '"><strong>Recommendation:</strong> ' +
    ext.recommendation +
    '</div>';

  panel.innerHTML = html;
  panel.classList.add('visible');
}
