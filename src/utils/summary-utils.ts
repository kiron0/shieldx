import { SecuritySummary } from '../types';

/**
 * Icon payloads are base64 data URLs (tens of KB per extension). Keeping them in
 * persisted state (globalState + on-disk cache + scan history) multiplies the
 * stored size by the number of retained scans and makes every webview message
 * carry megabytes of image data.
 *
 * Live scan results keep their icons; anything that is written to disk or to
 * global state is stripped.
 */
export function stripIcons(summary: SecuritySummary): SecuritySummary {
  return {
    ...summary,
    reports: summary.reports.map((report) => ({
      ...report,
      iconDataUrl: undefined,
    })),
  };
}
