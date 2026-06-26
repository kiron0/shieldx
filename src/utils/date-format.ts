type DateInput = string | number | Date;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateTime(input: DateInput): string {
  const dt = toDate(input);
  let hours = dt.getHours();
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()} ${hours}:${pad2(dt.getMinutes())} ${meridiem}`;
}

export function formatDateOnly(input: DateInput): string {
  const dt = toDate(input);
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

export function formatDateStamp(input: DateInput): string {
  const dt = toDate(input);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

export function formatRelativeTime(
  input: DateInput,
  nowMs: number = Date.now(),
): string {
  const thenMs = toDate(input).getTime();
  const diff = Math.floor((nowMs - thenMs) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return formatDateTime(input);
}

export const WEBVIEW_DATE_FORMATTERS_SCRIPT = String.raw`
      function formatDateTime(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var h = d.getHours();
        var ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        var m = String(d.getMinutes()).padStart(2, '0');
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' ' + h + ':' + m + ' ' + ap;
      }

      function formatRelativeTime(iso) {
        if (!iso) return '';
        var now = Date.now();
        var then = new Date(iso).getTime();
        var diff = Math.floor((now - then) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
        if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago';
        return formatDateTime(iso);
      }
`;
