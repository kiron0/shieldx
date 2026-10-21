const DEFAULT_SCAN_ID = 'ShieldX-Scan';

export function getShortScanId(id: string | undefined | null): string {
  const str = String(id || DEFAULT_SCAN_ID);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  let hex = Math.abs(hash).toString(16).substring(0, 6).toUpperCase();
  while (hex.length < 6) {
    hex = '0' + hex;
  }
  return `ShieldX-${hex}`;
}
