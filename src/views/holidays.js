// ============================================================
// HOLIDAYS VIEW
// ============================================================
import { state, saveState, currentView } from '../state.js';
import { uid, fmtDate, parseDate } from '../utils.js';
import { renderAll } from '../router.js';

// ---- Constants ----
export const COUNTRY_LABELS = { at: 'Austria', tr: 'Turkey', us: 'United States' };
export const NTH_LABELS  = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th', '-1': 'Last' };
export const DAY_NAMES   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December'];

export const HOL_TYPE_LABELS = {
  international: 'International holiday',
  national:      'National holiday',
  religious:     'Religious holiday',
};

export const HOL_TYPE_COLORS = {
  international: '#e0ffff',
  national:      '#ffe8e8',
  religious:     '#ccffcc',
};

let editingHolidayId = null;

// ---- Data helpers ----
export function getHolidaysByCountry(country) {
  return (state.holidays || []).filter(h => (h.country || 'at') === country);
}

export function resolveHolidayDate(h, year) {
  if (!year) year = new Date().getFullYear();

  if (h.dateType === 'weekday') {
    const nth     = parseInt(h.nth);
    const weekday = parseInt(h.weekday); // 0=Sun
    const month   = parseInt(h.holMonth);
    if (nth === -1) {
      const lastDay = new Date(year, month + 1, 0);
      const diff    = (lastDay.getDay() - weekday + 7) % 7;
      return fmtDate(new Date(year, month, lastDay.getDate() - diff));
    } else {
      const first  = new Date(year, month, 1);
      const diff   = (weekday - first.getDay() + 7) % 7;
      const result = new Date(year, month, 1 + diff + (nth - 1) * 7);
      if (result.getMonth() !== month) return null;
      return fmtDate(result);
    }
  }

  if (h.dateType === 'offset') {
    const base = (state.holidays || []).find(b => b.id === h.offsetBaseId);
    if (!base) return null;
    const baseDs = resolveHolidayDate(base, year);
    if (!baseDs) return null;
    const d = parseDate(baseDs);
    d.setDate(d.getDate() + parseInt(h.offsetDays));
    return fmtDate(d);
  }

  // fixed
  if (h.recur === 'yearly' && h.date) {
    const [, mm, dd] = h.date.split('-');
    return year + '-' + mm + '-' + dd;
  }
  return h.date || null;
}

export function holidayForDate(ds) {
  const year = parseInt(ds.split('-')[0]);
  for (const h of (state.holidays || []).filter(h => (h.country || 'at') === 'at')) {
    const resolved = resolveHolidayDate(h, year);
    if (!resolved) continue;
    if (h.multiDay && h.dateEnd && h.dateType === 'fixed') {
      let start = resolved;
      let end   = h.dateEnd;
      if (h.recur === 'yearly') {
        const [, sm, sd] = h.date.split('-');
        const [, em, ed] = h.dateEnd.split('-');
        start = year + '-' + sm + '-' + sd;
        end   = year + '-' + em + '-' + ed;
        if (end < start) end = (year + 1) + '-' + em + '-' + ed;
      }
      if (ds >= start && ds <= end) return h;
    } else {
      if (resolved === ds) return h;
    }
  }
  return null;
}

// ---- Modal helpers ----
export function toggleHolMultiday() {
  const checked = document.getElementById('hol-multiday').checked;
  document.getElementById('hol-enddate-wrap').classList.toggle('hidden', !checked);
  const label = document.getElementById('hol-date-label');
  if (label) label.textContent = checked ? 'Start date' : 'Date';
}

export function updateHolDateType() {
  const type = document.getElementById('hol-date-type').value;
  document.getElementById('hol-fixed-wrap').classList.toggle('hidden', type !== 'fixed');
  document.getElementById('hol-weekday-wrap').classList.toggle('hidden', type !== 'weekday');
  document.getElementById('hol-offset-wrap').classList.toggle('hidden', type !== 'offset');
}

function populateOffsetBaseSelect(excludeId) {
  const sel = document.getElementById('hol-offset-base');
  if (!sel) return;
  const options = (state.holidays || [])
    .filter(h => h.id !== excludeId && h.dateType !== 'offset')
    .map(h => '<option value="' + h.id + '">' + h.name + '</option>')
    .join('');
  sel.innerHTML = options || '<option value="">No other holidays yet</option>';
}

function holDateRuleDescription(h) {
  if (h.dateType === 'weekday') {
    const nth = NTH_LABELS[String(h.nth)] || h.nth;
    const day = DAY_NAMES[parseInt(h.weekday)] || '';
    const mon = MONTH_NAMES[parseInt(h.holMonth)] || '';
    return nth + ' ' + day + ' of ' + mon;
  }
  if (h.dateType === 'offset') {
    const base = (state.holidays || []).find(b => b.id === h.offsetBaseId);
    return (h.offsetDays || '?') + ' day' + (h.offsetDays == 1 ? '' : 's') + ' after ' + (base ? base.name : '?');
  }
  return null;
}

// ---- Modal open / close / save / delete ----
export function openHolidayModal(id, country) {
  editingHolidayId = id || null;
  const isEdit        = !!id;
  const activeCountry = isEdit
    ? ((state.holidays || []).find(h => h.id === id) || {}).country || 'at'
    : (country || 'at');
  document.getElementById('hol-country').value = activeCountry;
  document.getElementById('holiday-modal-title').textContent =
    (isEdit ? 'Edit holiday — ' : 'Add holiday — ') + (COUNTRY_LABELS[activeCountry] || '');
  document.getElementById('hol-save-btn').textContent = isEdit ? 'Save changes' : 'Add holiday';

  populateOffsetBaseSelect(id);

  // Wire type → auto-color (no manual color pickers anymore)
  const typeEl = document.getElementById('hol-type');

  // Reset date label
  const dateLabel = document.getElementById('hol-date-label');
  if (dateLabel) dateLabel.textContent = 'Date';

  if (isEdit) {
    const h = (state.holidays || []).find(h => h.id === id);
    if (!h) return;
    const dtype = h.dateType || 'fixed';
    document.getElementById('hol-name').value        = h.name;
    document.getElementById('hol-native-name').value = h.nativeName || '';
    document.getElementById('hol-date-type').value   = dtype;
    document.getElementById('hol-notes').value       = h.notes || '';
    document.getElementById('hol-recur').value       = h.recur || 'none';
    if (typeEl) typeEl.value = h.holType || '';
    if (dtype === 'fixed') {
      const isMulti = !!(h.dateEnd);
      document.getElementById('hol-date').value         = h.date || '';
      document.getElementById('hol-multiday').checked   = isMulti;
      document.getElementById('hol-date-end').value     = h.dateEnd || '';
      document.getElementById('hol-enddate-wrap').classList.toggle('hidden', !isMulti);
      if (isMulti && dateLabel) dateLabel.textContent = 'Start date';
    } else if (dtype === 'weekday') {
      document.getElementById('hol-nth').value      = h.nth || '1';
      document.getElementById('hol-weekday').value  = h.weekday || '1';
      document.getElementById('hol-month').value    = h.holMonth || '0';
    } else if (dtype === 'offset') {
      document.getElementById('hol-offset-days').value = h.offsetDays || '1';
      document.getElementById('hol-offset-base').value = h.offsetBaseId || '';
      document.getElementById('hol-offset-base').value = h.offsetBaseId || '';
    }
  } else {
    document.getElementById('hol-name').value         = '';
    document.getElementById('hol-native-name').value  = '';
    document.getElementById('hol-date-type').value    = 'fixed';
    document.getElementById('hol-date').value         = fmtDate(new Date());
    document.getElementById('hol-date-end').value     = '';
    document.getElementById('hol-multiday').checked   = false;
    document.getElementById('hol-enddate-wrap').classList.add('hidden');
    document.getElementById('hol-nth').value          = '1';
    document.getElementById('hol-weekday').value      = '1';
    document.getElementById('hol-month').value        = '0';
    document.getElementById('hol-offset-days').value  = '1';
    document.getElementById('hol-notes').value        = '';
    document.getElementById('hol-recur').value        = 'none';
    if (typeEl) typeEl.value = '';
  }
  updateHolDateType();
  document.getElementById('holiday-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('hol-name').focus(), 50);
}

export function closeHolidayModal() {
  document.getElementById('holiday-modal').classList.add('hidden');
  editingHolidayId = null;
}

export function saveHoliday() {
  const name = document.getElementById('hol-name').value.trim();
  if (!name) return;
  if (!state.holidays) state.holidays = [];

  const recur      = document.getElementById('hol-recur').value;
  const country    = document.getElementById('hol-country').value || 'at';
  const dtype      = document.getElementById('hol-date-type').value;
  const notes      = document.getElementById('hol-notes').value.trim();
  const nativeName = document.getElementById('hol-native-name').value.trim();
  const holType    = document.getElementById('hol-type')?.value || '';
  const color      = HOL_TYPE_COLORS[holType] || '#6b7c93';

  let entry = { id: editingHolidayId || uid(), name, nativeName, recur, country, notes, holType, color, dateType: dtype };

  if (dtype === 'fixed') {
    const date = document.getElementById('hol-date').value;
    if (!date) return;
    entry.date  = date;
    const isMulti = document.getElementById('hol-multiday').checked;
    entry.dateEnd  = isMulti ? (document.getElementById('hol-date-end').value || date) : null;
    entry.multiDay = isMulti;
  } else if (dtype === 'weekday') {
    entry.nth      = document.getElementById('hol-nth').value;
    entry.weekday  = document.getElementById('hol-weekday').value;
    entry.holMonth = document.getElementById('hol-month').value;
    entry.date     = resolveHolidayDate(entry, new Date().getFullYear()) || '';
  } else if (dtype === 'offset') {
    entry.offsetDays   = document.getElementById('hol-offset-days').value;
    entry.offsetBaseId = document.getElementById('hol-offset-base').value;
    entry.date         = resolveHolidayDate(entry, new Date().getFullYear()) || '';
  }

  if (editingHolidayId) {
    const idx = state.holidays.findIndex(h => h.id === editingHolidayId);
    if (idx >= 0) state.holidays[idx] = entry;
  } else {
    state.holidays.push(entry);
  }

  saveState();
  closeHolidayModal();
  renderHolidaysForCountry(country);
  if (currentView === 'monthly') window.renderMonthly?.();
  if (currentView === 'weekly')  window.renderWeekly?.();
  if (currentView === 'daily')   window.renderDaily?.();
}

export function deleteHoliday(id) {
  const h       = (state.holidays || []).find(h => h.id === id);
  const country = h ? (h.country || 'at') : 'at';
  state.holidays = (state.holidays || []).filter(h => h.id !== id);
  saveState();
  renderHolidaysForCountry(country);
  if (currentView === 'monthly') window.renderMonthly?.();
  if (currentView === 'weekly')  window.renderWeekly?.();
}

// ---- Render ----
export function renderHolidaysForCountry(country) {
  const statsEl = document.getElementById('holidays-stats-' + country);
  const listEl  = document.getElementById('holidays-list-'  + country);
  if (!statsEl || !listEl) return;

  const year = new Date().getFullYear();
  const list = [...getHolidaysByCountry(country)].sort((a, b) => {
    const da = resolveHolidayDate(a, year) || a.date || '';
    const db = resolveHolidayDate(b, year) || b.date || '';
    return da.localeCompare(db);
  });

  const now      = fmtDate(new Date());
  const upcoming = list.filter(h => (resolveHolidayDate(h, year) || '') >= now);
  const past     = list.filter(h => (resolveHolidayDate(h, year) || '') <  now);

  statsEl.innerHTML =
    '<div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">'    + list.length     + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Upcoming</div><div class="stat-value">' + upcoming.length + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Past</div><div class="stat-value">'     + past.length     + '</div></div>';

  if (!list.length) {
    listEl.innerHTML = '<div class="card"><div class="empty-state">No holidays yet for ' + COUNTRY_LABELS[country] + '.</div></div>';
    return;
  }

  const renderGroup = (items, label) => {
    if (!items.length) return '';
    return '<div class="card"><div class="card-title">' + label + '</div>' +
      items.map(h => {
        const resolvedDs = resolveHolidayDate(h, year);
        const d          = resolvedDs ? parseDate(resolvedDs) : null;
        let dateStr;
        if (h.multiDay && h.dateEnd && h.dateType === 'fixed' && d) {
          const dEnd = parseDate(h.dateEnd);
          const fmt  = { day: 'numeric', month: 'long', year: 'numeric' };
          dateStr = d.toLocaleDateString('en-GB', fmt) + ' – ' + dEnd.toLocaleDateString('en-GB', fmt);
        } else {
          dateStr = d
            ? d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : '—';
        }

        const ruleDesc   = holDateRuleDescription(h);
        const recurBadge = h.recur === 'yearly'
          ? '<span class="recur-badge" style="margin-left:6px;">↻ Every year</span>' : '';
        const ruleBadge  = ruleDesc
          ? '<span class="recur-badge" style="margin-left:6px;background:var(--accent-light);color:var(--accent-text);">' + ruleDesc + '</span>'
          : '';
        const typeBadge  = h.holType && HOL_TYPE_LABELS[h.holType]
          ? '<span class="recur-badge" style="margin-left:6px;background:' + HOL_TYPE_COLORS[h.holType] + ';color:#333;">' + HOL_TYPE_LABELS[h.holType] + '</span>'
          : '';

        // Countdown
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let countdownHtml = '';
        if (d) {
          const start = new Date(d); start.setHours(0, 0, 0, 0);
          const dEnd  = (h.multiDay && h.dateEnd) ? new Date(parseDate(h.dateEnd)) : new Date(start);
          dEnd.setHours(0, 0, 0, 0);
          if (today >= start && today <= dEnd) {
            const daysLeft = Math.round((dEnd - today) / 86400000);
            countdownHtml = '<div class="hol-countdown" style="background:var(--green-light);color:var(--green);">' +
              (daysLeft === 0 ? 'Last day 🎉' : 'Ongoing · ' + daysLeft + 'd left') + '</div>';
          } else {
            const diffDays = Math.round((start - today) / 86400000);
            if (diffDays > 0) {
              const urgency = diffDays <= 7
                ? 'background:var(--red-light);color:var(--red);'
                : diffDays <= 30
                  ? 'background:var(--accent-light);color:var(--accent-text);'
                  : 'background:var(--blue-light);color:var(--blue);';
              countdownHtml = '<div class="hol-countdown" style="' + urgency + '">' + diffDays + ' days away</div>';
            } else {
              countdownHtml = '<div class="hol-countdown" style="background:var(--surface2);color:var(--text3);">' + Math.abs(diffDays) + ' days ago</div>';
            }
          }
        }

        return '<div class="hol-item">' +
          '<div class="hol-swatch" style="background:' + h.color + ';"></div>' +
          '<div class="hol-body">' +
            '<div class="hol-title">' + h.name +
            (h.nativeName ? ' <span style="font-size:12px;font-weight:400;color:var(--text3);">· ' + h.nativeName + '</span>' : '') +
            recurBadge + ruleBadge + typeBadge + '</div>' +
            '<div class="hol-meta">' + dateStr + (h.notes ? ' · ' + h.notes : '') + '</div>' +
          '</div>' +
          countdownHtml +
          '<button class="btn btn-sm" onclick="openHolidayModal(\'' + h.id + '\')">Edit</button>' +
          '<button class="del-btn" style="opacity:1;" onclick="deleteHoliday(\'' + h.id + '\')">×</button>' +
        '</div>';
      }).join('') + '</div>';
  };

  listEl.innerHTML = renderGroup(upcoming, '📅 Upcoming') + renderGroup(past, 'Past');
}

export function renderHolidays() {
  renderHolidaysForCountry('at');
  renderHolidaysForCountry('tr');
  renderHolidaysForCountry('us');
}

// ---- formatSEDate (shared with special-events modal) ----
export function formatSEDate(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 8);
  if (v.length >= 3)  v = v.slice(0, 2) + '/' + v.slice(2);
  if (v.length >= 6)  v = v.slice(0, 5) + '/' + v.slice(5);
  input.value = v;
}
