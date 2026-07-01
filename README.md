<p align="center">
  <img src="./assets/icon.png" alt="ShieldX icon" width="96" height="96">
</p>

<h1 align="center">ShieldX - Extension Auditor</h1>

<p align="center">
  <strong>Scan extensions. Surface risk. Keep your IDE safer.</strong>
</p>

<p align="center">
   <img src="https://img.shields.io/badge/VS%20Code-1.105.0%2B-0ea5e9?style=for-the-badge&logo=visualstudiocode&logoColor=white" />
    <img src="https://img.shields.io/badge/License-MIT-16a34a?style=for-the-badge" />
  </p>

---

**ShieldX** is an extension auditor for VS Code and compatible IDEs (like Cursor, Antigravity, etc.). It scans installed extensions to detect supply chain risks, security vulnerabilities, excessive permissions, publisher trust signals, and suspicious AST patterns.

---

## Key Features

- **Interactive Security Dashboard:** A sidebar-first panel inside the Activity Bar for one-click scans and history management.
- **Static AST Pattern Scan:** Searches Javascript/Typescript source files for obfuscated code, telemetry evasion, hardcoded credentials, and arbitrary executions.
- **Dependency Vulnerability audits:** Integrates with the [OSV.dev API](https://osv.dev) to check nested dependencies against open-source vulnerability databases.
- **Capability & Manifest Scans:** Audits extension permissions, activation events, install scripts, and network capability signatures.
- **Publisher Trust Engine:** Performs reputational analysis based on account age, ratings, total downloads, and verified publisher attributes.
- **Multi-format Report Exports:** Export security summaries in Markdown, JSON, HTML, PDF, CSV, and SARIF formats.
- **Audit History Tracking:** Track, compare, and clear past scan logs to understand changes in workspace risk level.

---

## Getting Started

### Installation

Install **ShieldX - Extension Auditor** (`thk.shieldx`) from the Marketplace or Extension Panel inside the IDE.

### How to Use

1.  Open the **ShieldX Dashboard** from the Activity Bar icon.
2.  Click **Scan Extensions** to query all local extension directories.
3.  Review flagged warnings, capability scores, and deep dependencies.
4.  Export reports using the dashboard action toolbar or via the Command Palette.

---

## Configuration Options

Customize ShieldX behaviour by updating editor settings:

| Setting                       | Type      | Default      | Description                                                                                |
| :---------------------------- | :-------- | :----------- | :----------------------------------------------------------------------------------------- |
| `shieldx.autoScanOnStartup`   | `boolean` | `false`      | Triggers a security scan automatically on editor startup.                                  |
| `shieldx.warnOnHighRisk`      | `boolean` | `true`       | Shows warning notifications when high/critical risk extensions are discovered.             |
| `shieldx.minimumWarningLevel` | `string`  | `"high"`     | The minimum warning level needed to alert the user (`"moderate"`, `"high"`, `"critical"`). |
| `shieldx.scanNodeModules`     | `boolean` | `false`      | Deep-scans nested `node_modules` inside extensions (slower).                               |
| `shieldx.reportFormat`        | `string`  | `"markdown"` | Default output file type for exported reports.                                             |
| `shieldx.enableOsvScan`       | `boolean` | `true`       | Performs online dependency checking via the OSV API.                                       |
| `shieldx.pdfBrowserPath`      | `string`  | `""`         | Chrome/Edge binary path used for rendering exact PDF reports.                              |

---

## Commands Contributed

- `ShieldX: Scan Installed Extensions` — Run audit on workspace extensions.
- `ShieldX: Open Security Dashboard` — Display the sidebar dashboard.
- `ShieldX: Export Security Report` — Save current scan logs to disk.
- `ShieldX: Add Extension to Allowlist` — Set a trusted extension bypass.
- `ShieldX: Block Extension` — Explicitly mark an extension as untrusted.
- `ShieldX: Show Current Policy` — View and edit active allowlists/blocklists.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.

---

## Author

Created and maintained by [Toufiq Hasan Kiron](https://github.com/kiron0).
