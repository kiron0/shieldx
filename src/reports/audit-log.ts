/**
 * Admin audit log for Shieldex policy enforcement.
 * Logs policy violations, allowlist/blocklist changes, and scan events.
 */
import { info, warn } from '../utils/logger';

export interface AuditEntry {
  timestamp: string;
  action:
    | 'scan'
    | 'policy_violation'
    | 'allowlist_add'
    | 'blocklist_add'
    | 'policy_remove'
    | 'export';
  detail: string;
  severity: 'info' | 'warning' | 'error';
}

export class AuditLog {
  private entries: AuditEntry[] = [];
  private maxEntries = 1000;

  log(
    action: AuditEntry['action'],
    detail: string,
    severity: AuditEntry['severity'] = 'info',
  ): void {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      detail,
      severity,
    };
    this.entries.push(entry);

    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    const logFn = severity === 'error' ? warn : info;
    logFn(`[AUDIT:${action}] ${detail}`);
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  getRecent(count: number = 50): AuditEntry[] {
    return this.entries.slice(-count);
  }

  getViolations(): AuditEntry[] {
    return this.entries.filter((e) => e.action === 'policy_violation');
  }

  clear(): void {
    this.entries = [];
    info('Audit log cleared');
  }

  exportLog(): string {
    const header = 'Timestamp,Action,Severity,Detail\n';
    const rows = this.entries.map(
      (e) =>
        `${e.timestamp},${e.action},${e.severity},"${e.detail.replace(/"/g, '""')}"`,
    );
    return header + rows.join('\n');
  }
}

// Singleton instance
let _instance: AuditLog | null = null;

export function getAuditLog(): AuditLog {
  if (!_instance) {
    _instance = new AuditLog();
  }
  return _instance;
}
