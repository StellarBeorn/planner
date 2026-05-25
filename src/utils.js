// ============================================================
// UTILS
// ============================================================

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function fmtDate(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

export function parseDate(s) {
  const [y, m, dd] = s.split('-').map(Number);
  return new Date(y, m - 1, dd);
}

export function fmtDisplay(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtShort(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function isToday(d) {
  const t = new Date();
  return fmtDate(d) === fmtDate(t);
}

export function getWeekStart(d) {
  const dd = new Date(d);
  const day = dd.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dd.setDate(dd.getDate() + diff);
  dd.setHours(0, 0, 0, 0);
  return dd;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function weekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => fmtDate(addDays(weekStart, i)));
}
