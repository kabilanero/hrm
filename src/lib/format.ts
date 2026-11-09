const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2031-01-14T00:00:00.000Z" | "2031-01-14" -> "14 Jan 2031" (DATE columns carry no timezone) */
export function fmtDate(v?: string | null): string {
  if (!v) return '—';
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return v;
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}
export const dateOnly = (v?: string | null) => (v ? v.slice(0, 10) : '');

/** Instant -> local time "09:05" */
export function fmtTime(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
export function fmtDateTime(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : `${fmtDate(d.toISOString().slice(0, 10))} ${fmtTime(v)}`;
}
export function fmtMinutes(min?: number | null): string {
  if (!min) return '0h 00m';
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}
export function fmtMoney(v?: string | number | null): string {
  if (v === null || v === undefined || v === '') return '—';
  return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
export function fmtDays(v: string | number): string {
  return String(Number(v));
}
export function localIsoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const titleCase = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
