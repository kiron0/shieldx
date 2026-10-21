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
- **Static Pattern Scan:** Searches JavaScript/TypeScript sources for obfuscated code, shell execution, credential access, and dynamic execution patterns.
- **Dependency Vulnerability audits:** Integrates with the [OSV.dev API](https://osv.dev) to check declared runtime dependencies against open-source vulnerability databases.
- **Capability & Manifest Scans:** Audits extension permissions, activation events, install scripts, and network capability signatures.
- **Publisher Trust Engine:** Checks repository activity for verified or well-known publishers (stars, open issues, last push).
- **Multi-format Report Exports:** Export security summaries in Markdown, JSON, HTML, PDF, CSV, and SARIF formats.
- **Manifest signals:** outdated engine requirements, workspace trust handling, security setting defaults, extension packs and known compromised packages.
- **Fast rescans:** results are cached per extension version, so only changed extensions are analyzed again.
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
| `shieldx.scanNodeModules`     | `boolean` | `false`      | Lets the code analyzer recurse into `node_modules` inside extensions (much slower).        |
| `shieldx.reportFormat`        | `string`  | `"markdown"` | Default output file type for exported reports.                                             |
| `shieldx.enableOsvScan`       | `boolean` | `true`       | Performs online dependency checking via the OSV API.                                       |
| `shieldx.pdfBrowserPath`      | `string`  | `""`         | Chrome/Edge binary path used for rendering exact PDF reports.                              |
| `shieldx.maxHistoryItems`     | `integer` | `10`         | How many completed scans to keep in local history (5–100).                                 |

---

## Commands Contributed

- `ShieldX: Scan Installed Extensions` — Run audit on workspace extensions.
- `ShieldX: Open Security Dashboard` — Display the sidebar dashboard.
- `ShieldX: Export Security Report` — Save current scan logs to disk.
- `ShieldX: Scan for OSV Vulnerabilities` — Re-run the scan with dependency advisories.
- `ShieldX: Add Extension to Allowlist` — Set a trusted extension bypass.
- `ShieldX: Block Extension` — Explicitly mark an extension as untrusted.
- `ShieldX: Show Current Policy` — View and edit active allowlists/blocklists.

---

## Privacy

- No telemetry. Usage counters stay on your machine.
- Outbound requests only go to `api.osv.dev` (dependency advisories) and `api.github.com` (repository stats for verified publishers).
- Scan results and history live in the editor's local extension storage.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.

---

## Author

Created and maintained by [Toufiq Hasan Kiron](https://github.com/kiron0).
