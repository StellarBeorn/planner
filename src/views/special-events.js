// ============================================================
// SPECIAL EVENTS — Birthdays, Anniversaries, Historical
// ============================================================
import { state, saveState } from '../state.js';
import { uid, fmtDate, parseDate } from '../utils.js';

// ---- Config ----
const SE_CONFIG = {
  birthday:    { title: 'Add birthday',         nameLabel: "Person's name",    descLabel: 'Nickname / relation (optional)',  color: '#e8357a' },
  anniversary: { title: 'Add anniversary',      nameLabel: 'Anniversary name', descLabel: 'Description (optional)',          color: '#c97b3a' },
  historical:  { title: 'Add historical event', nameLabel: 'Event name',       descLabel: 'Description (optional)',          color: '#3a5c7c' },
};

// ---- Module-scoped editing ids ----
let editingSeId = null;
let editingHeId = null;

// ---- Date parsing helpers ----
export function parseSEDate(str) {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length < 2) return null;
  const d = parseInt(parts[0]), m = parseInt(parts[1]), y = parts[2] ? parseInt(parts[2]) : null;
  if (!d || !m || d < 1 || d > 31 || m < 1 || m > 12) return null;
  return { d, m, y };
}

function getEvDM(ev) {
  if (ev.d && ev.m) return { d: ev.d, m: ev.m };
  if (ev.date) { const p = ev.date.split('-'); return { d: parseInt(p[2]), m: parseInt(p[1]) }; }
  return { d: 1, m: 1 };
}

function seCountdown(ev) {
  const now      = new Date();
  const todayStr = fmtDate(now);

  let d = ev.d, m = ev.m, year = ev.y;
  if ((!d || !m) && ev.date) {
    const parts = ev.date.split('-');
    m = parseInt(parts[1]); d = parseInt(parts[2]);
    if (!year && ev.year) year = ev.year;
  }
  if (!d || !m) return { label: '—', style: 'background:var(--surface2);color:var(--text3);', ageStr: '' };

  const thisYearDate = fmtDate(new Date(now.getFullYear(),     m - 1, d));
  const nextYearDate = fmtDate(new Date(now.getFullYear() + 1, m - 1, d));
  const targetStr    = thisYearDate >= todayStr ? thisYearDate : nextYearDate;
  const target       = parseDate(targetStr);
  const diffDays     = Math.round((target - now) / 86400000);

  const isToday_  = diffDays === 0;
  const daysLabel = isToday_  ? 'Today!'
    : diffDays === 1           ? 'Tomorrow'
    : diffDays + ' days away';
  const cdCls =
    isToday_          ? 'background:var(--green-light);color:var(--green);'
    : diffDays <= 7   ? 'background:var(--red-light);color:var(--red);'
    : diffDays <= 30  ? 'background:var(--accent-light);color:var(--accent-text);'
    :                   'background:var(--blue-light);color:var(--blue);';

  let ageStr = '';
  if (year) {
    const turnsAge = now.getFullYear() + (thisYearDate < todayStr ? 1 : 0) - year;
    ageStr = ' · Turns ' + turnsAge;
  }
  return { label: daysLabel, style: cdCls, ageStr };
}

// ---- Historical modal ----
export function toggleHEMultiday() {
  const checked = document.getElementById('he-multiday').checked;
  document.getElementById('he-date2-wrap').classList.toggle('hidden', !checked);
  document.getElementById('he-date1-label').textContent =
    checked ? 'Start date (DD/MM/YYYY)' : 'Date (DD/MM/YYYY)';
}

export function openHistoricalModal(id) {
  editingHeId = id || null;
  const isEdit = !!id;
  document.getElementById('he-modal-title').textContent = isEdit ? 'Edit historical event' : 'Add historical event';
  document.getElementById('he-save-btn').textContent    = isEdit ? 'Save changes' : 'Add event';

  if (isEdit) {
    const ev = (state.specialEvents || []).find(e => e.id === id);
    if (!ev) return;
    document.getElementById('he-name').value      = ev.name;
    document.getElementById('he-date1').value     = ev.dateStr  || '';
    document.getElementById('he-date2').value     = ev.dateStr2 || '';
    document.getElementById('he-color').value     = ev.color    || '#3a5c7c';
    document.getElementById('he-part-of').value   = ev.partOf   || '';
    document.getElementById('he-countries').value = ev.countries || '';
    document.getElementById('he-notes').value     = ev.notes    || '';
    const multi = !!(ev.dateStr2);
    document.getElementById('he-multiday').checked = multi;
    document.getElementById('he-date2-wrap').classList.toggle('hidden', !multi);
    document.getElementById('he-date1-label').textContent = multi ? 'Start date (DD/MM/YYYY)' : 'Date (DD/MM/YYYY)';
  } else {
    ['he-name', 'he-date1', 'he-date2', 'he-part-of', 'he-countries', 'he-notes'].forEach(fieldId => {
      document.getElementById(fieldId).value = '';
    });
    document.getElementById('he-color').value = '#3a5c7c';
    document.getElementById('he-multiday').checked = false;
    document.getElementById('he-date2-wrap').classList.add('hidden');
    document.getElementById('he-date1-label').textContent = 'Date (DD/MM/YYYY)';
  }
  document.getElementById('historical-event-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('he-name').focus(), 50);
}

export function closeHistoricalModal() {
  document.getElementById('historical-event-modal').classList.add('hidden');
  editingHeId = null;
}

export function saveHistoricalEvent() {
  const name  = document.getElementById('he-name').value.trim();
  const date1 = document.getElementById('he-date1').value.trim();
  if (!name || !date1) return;
  const p1 = parseSEDate(date1);
  if (!p1) { alert('Please enter a valid start date in DD/MM/YYYY format.'); return; }

  const date2 = document.getElementById('he-date2').value.trim();
  const p2    = date2 ? parseSEDate(date2) : null;

  if (!state.specialEvents) state.specialEvents = [];
  const entry = {
    id:        editingHeId || uid(),
    type:      'historical',
    name,
    dateStr:   date1,
    dateStr2:  date2 || null,
    d: p1.d, m: p1.m, y: p1.y,
    d2: p2 ? p2.d : null, m2: p2 ? p2.m : null, y2: p2 ? p2.y : null,
    multiDay:  !!(date2 && p2),
    color:     document.getElementById('he-color').value,
    partOf:    document.getElementById('he-part-of').value.trim(),
    countries: document.getElementById('he-countries').value.trim(),
    notes:     document.getElementById('he-notes').value.trim(),
  };

  if (editingHeId) {
    const idx = state.specialEvents.findIndex(e => e.id === editingHeId);
    if (idx >= 0) state.specialEvents[idx] = entry;
  } else {
    state.specialEvents.push(entry);
  }
  saveState();
  closeHistoricalModal();
  renderSpecialEvents('historical');
}

// ---- Birthday / Anniversary modal ----
export function openSpecialEventModal(type, id) {
  editingSeId = id || null;
  const isEdit = !!id;
  const cfg    = SE_CONFIG[type] || SE_CONFIG.birthday;

  document.getElementById('se-type').value             = type;
  document.getElementById('se-modal-title').textContent = isEdit ? 'Edit ' + type : cfg.title;
  document.getElementById('se-name-label').textContent  = cfg.nameLabel;
  document.getElementById('se-desc-label').textContent  = cfg.descLabel;
  document.getElementById('se-date-label').textContent  = 'Date (DD/MM/YYYY)';
  document.getElementById('se-save-btn').textContent    = isEdit ? 'Save changes' : 'Add';
  document.getElementById('se-color').value             = cfg.color;

  if (isEdit) {
    const ev = (state.specialEvents || []).find(e => e.id === id);
    if (!ev) return;
    document.getElementById('se-name').value  = ev.name;
    document.getElementById('se-desc').value  = ev.desc  || '';
    document.getElementById('se-date').value  = ev.dateStr || '';
    document.getElementById('se-color').value = ev.color || cfg.color;
    document.getElementById('se-notes').value = ev.notes || '';
  } else {
    document.getElementById('se-name').value  = '';
    document.getElementById('se-desc').value  = '';
    document.getElementById('se-date').value  = '';
    document.getElementById('se-notes').value = '';
  }
  document.getElementById('special-event-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('se-name').focus(), 50);
}

export function closeSpecialEventModal() {
  document.getElementById('special-event-modal').classList.add('hidden');
  editingSeId = null;
}

export function saveSpecialEvent() {
  const name    = document.getElementById('se-name').value.trim();
  const dateStr = document.getElementById('se-date').value.trim();
  if (!name || !dateStr) return;
  const parsed = parseSEDate(dateStr);
  if (!parsed) { alert('Please enter a valid date in DD/MM/YYYY format.'); return; }
  const type = document.getElementById('se-type').value;
  if (!state.specialEvents) state.specialEvents = [];

  const entry = {
    id:      editingSeId || uid(),
    type,
    name,
    desc:    document.getElementById('se-desc').value.trim(),
    dateStr,
    d: parsed.d, m: parsed.m, y: parsed.y,
    color:   document.getElementById('se-color').value,
    notes:   document.getElementById('se-notes').value.trim(),
  };

  if (editingSeId) {
    const idx = state.specialEvents.findIndex(e => e.id === editingSeId);
    if (idx >= 0) state.specialEvents[idx] = entry;
  } else {
    state.specialEvents.push(entry);
  }
  saveState();
  closeSpecialEventModal();
  renderSpecialEvents(type);
}

export function deleteSpecialEvent(id) {
  const ev   = (state.specialEvents || []).find(e => e.id === id);
  const type = ev ? ev.type : 'birthday';
  state.specialEvents = (state.specialEvents || []).filter(e => e.id !== id);
  saveState();
  renderSpecialEvents(type);
}

// ---- Shared render ----
export function renderSpecialEvents(type) {
  const statsEl = document.getElementById(type + '-stats');
  const listEl  = document.getElementById(type + '-list');
  if (!statsEl || !listEl) return;

  const now      = new Date();
  const todayStr = fmtDate(now);
  const all      = (state.specialEvents || []).filter(e => e.type === type);

  // Sort by next occurrence
  const sorted = [...all].sort((a, b) => {
    const { d: ad, m: am } = getEvDM(a);
    const { d: bd, m: bm } = getEvDM(b);
    const aThis = fmtDate(new Date(now.getFullYear(), am - 1, ad));
    const bThis = fmtDate(new Date(now.getFullYear(), bm - 1, bd));
    const aNext = aThis >= todayStr ? aThis : fmtDate(new Date(now.getFullYear() + 1, am - 1, ad));
    const bNext = bThis >= todayStr ? bThis : fmtDate(new Date(now.getFullYear() + 1, bm - 1, bd));
    return aNext.localeCompare(bNext);
  });

  const todayCount = sorted.filter(ev => {
    const { d, m } = getEvDM(ev);
    return fmtDate(new Date(now.getFullYear(), m - 1, d)) === todayStr;
  }).length;

  statsEl.innerHTML =
    '<div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">'                                    + all.length   + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Today</div><div class="stat-value" style="color:var(--green);">' + todayCount + '</div></div>';

  if (!sorted.length) {
    const typeLabel = type === 'birthday' ? 'birthdays' : type === 'anniversary' ? 'anniversaries' : 'historical events';
    listEl.innerHTML = '<div class="card"><div class="empty-state">No ' + typeLabel + ' yet. Click "+ Add" to get started.</div></div>';
    return;
  }

  listEl.innerHTML = '<div class="card">' + sorted.map(ev => {
    const cd              = seCountdown(ev);
    const { d: evD, m: evM } = getEvDM(ev);
    const evY             = ev.y || ev.year || null;

    let displayDate = new Date(now.getFullYear(), evM - 1, evD)
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) +
      (evY ? ', ' + evY : '');

    if (ev.multiDay && ev.d2 && ev.m2) {
      const endDate = new Date(now.getFullYear(), ev.m2 - 1, ev.d2)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) +
        (ev.y2 ? ', ' + ev.y2 : (evY ? ', ' + evY : ''));
      displayDate += ' – ' + endDate;
    }

    const extraLines = ev.type === 'historical'
      ? (ev.partOf    ? '<div class="se-desc">Part of: '   + ev.partOf    + '</div>' : '') +
        (ev.countries ? '<div class="se-desc">Countries: ' + ev.countries + '</div>' : '')
      : '';

    const editOnclick = ev.type === 'historical'
      ? 'openHistoricalModal(\'' + ev.id + '\')'
      : 'openSpecialEventModal(\'' + type + '\',\'' + ev.id + '\')';

    return '<div class="se-card">' +
      '<div class="se-swatch" style="background:' + ev.color + ';"></div>' +
      '<div class="se-body">' +
        '<div class="se-name">' + ev.name + '</div>' +
        (ev.desc  ? '<div class="se-desc">' + ev.desc  + '</div>' : '') +
        (ev.notes ? '<div class="se-desc">' + ev.notes + '</div>' : '') +
        extraLines +
        '<div class="se-date-row">' +
          '<span>' + displayDate + '</span>' +
          '<span class="se-countdown" style="' + cd.style + '">' + cd.label + '</span>' +
          (cd.ageStr ? '<span class="se-age">' + cd.ageStr + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<button class="btn btn-sm" onclick="' + editOnclick + '">Edit</button>' +
      '<button class="del-btn" style="opacity:1;margin-left:4px;" onclick="deleteSpecialEvent(\'' + ev.id + '\')">×</button>' +
    '</div>';
  }).join('') + '</div>';
}
