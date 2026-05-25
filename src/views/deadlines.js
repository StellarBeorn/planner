// ============================================================
// DEADLINES VIEW
// ============================================================
import { state, saveState, currentView } from '../state.js';
import { uid, fmtDate } from '../utils.js';
import { renderAll } from '../router.js';

export const DL_PRIORITY_COLOR = {
  high: 'var(--red)',
  med:  'var(--accent)',
  low:  'var(--green)',
};

export function deadlineTimestamp(dl) {
  return new Date(dl.date + 'T' + (dl.time || '23:59')).getTime();
}

export function formatCountdown(ms) {
  if (ms < 0) return { label: 'Overdue', cls: 'past' };
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs  = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const label =
    String(days).padStart(2, '0') + 'd ' +
    String(hrs).padStart(2, '0')  + 'h ' +
    String(mins).padStart(2, '0') + 'm ' +
    String(secs).padStart(2, '0') + 's';
  const cls = days === 0 && hrs < 6 ? 'urgent' : days <= 2 ? 'soon' : 'ok';
  return { label, cls };
}

// ---- Full deadlines view ----
export function renderDeadlines() {
  if (!document.getElementById('deadlines-list')) return;
  const now = Date.now();
  const dls = [...(state.deadlines || [])].sort((a, b) => deadlineTimestamp(a) - deadlineTimestamp(b));

  const total    = dls.length;
  const overdue  = dls.filter(d => !d.done && deadlineTimestamp(d) < now).length;
  const upcoming = dls.filter(d => !d.done && deadlineTimestamp(d) >= now).length;
  const done     = dls.filter(d => d.done).length;

  document.getElementById('deadlines-stats').innerHTML =
    '<div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">'                                               + total    + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Upcoming</div><div class="stat-value">'                                            + upcoming + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Overdue</div><div class="stat-value" style="color:var(--red);">'                   + overdue  + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value">'                                           + done     + '</div></div>';

  if (!dls.length) {
    document.getElementById('deadlines-list').innerHTML =
      '<div class="card"><div class="empty-state">No deadlines yet. Click "+ Add deadline" to get started.</div></div>';
    return;
  }

  const groups = [
    { label: '🔴 Overdue',   items: dls.filter(d => !d.done && deadlineTimestamp(d) < now) },
    { label: '⏳ Upcoming',  items: dls.filter(d => !d.done && deadlineTimestamp(d) >= now) },
    { label: '✓ Completed',  items: dls.filter(d => d.done) },
  ].filter(g => g.items.length);

  document.getElementById('deadlines-list').innerHTML = groups.map(g => {
    const rows = g.items.map(dl => {
      const ts  = deadlineTimestamp(dl);
      const ms  = ts - now;
      const cd  = formatCountdown(ms);
      const due = new Date(ts).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      }) + ' at ' + (dl.time || '23:59');
      const pColor = DL_PRIORITY_COLOR[dl.priority] || 'var(--text3)';
      return '<div class="deadline-item ' + (dl.done ? 'completed' : '') + '">' +
        '<div class="deadline-urgency" style="background:' + pColor + ';"></div>' +
        '<div class="deadline-body">' +
          '<div class="deadline-title">' + dl.title + '</div>' +
          (dl.desc ? '<div class="deadline-desc">' + dl.desc + '</div>' : '') +
          '<div class="deadline-due">Due: ' + due + '</div>' +
        '</div>' +
        (dl.done ? '' : '<div class="deadline-timer ' + cd.cls + '">' + cd.label + '</div>') +
        '<button class="btn btn-sm" onclick="openDeadlineModal(\'' + dl.id + '\')" style="flex-shrink:0;">Edit</button>' +
        '<button class="deadline-done-btn ' + (dl.done ? 'done' : '') + '" onclick="toggleDeadlineDone(\'' + dl.id + '\')" title="' + (dl.done ? 'Reopen' : 'Mark done') + '">' + (dl.done ? '✓' : '') + '</button>' +
        '<button class="del-btn" onclick="deleteDeadline(\'' + dl.id + '\')" style="margin-top:1px;">×</button>' +
      '</div>';
    }).join('');
    return '<div class="card"><div class="card-title">' + g.label + '</div>' + rows + '</div>';
  }).join('');
}

// ---- Mini widget (daily view) ----
export function renderDeadlinesMini() {
  const el = document.getElementById('daily-deadlines-list');
  if (!el) return;
  const now = Date.now();
  const upcoming = (state.deadlines || [])
    .filter(d => !d.done && deadlineTimestamp(d) >= now)
    .sort((a, b) => deadlineTimestamp(a) - deadlineTimestamp(b))
    .slice(0, 5);

  if (!upcoming.length) {
    el.innerHTML = '<div class="empty-state" style="padding:12px 0;">No upcoming deadlines 🎉</div>';
    return;
  }

  el.innerHTML = upcoming.map(dl => {
    const ms         = deadlineTimestamp(dl) - now;
    const cd         = formatCountdown(ms);
    const pColor     = DL_PRIORITY_COLOR[dl.priority] || 'var(--text3)';
    const timerColor = cd.cls === 'urgent' ? 'var(--red)' : cd.cls === 'soon' ? 'var(--accent)' : 'var(--green)';
    return '<div class="dl-mini-row">' +
      '<div class="dl-mini-bar" style="background:' + pColor + ';"></div>' +
      '<span class="dl-mini-name">' + dl.title + '</span>' +
      '<span class="dl-mini-timer" style="color:' + timerColor + ';">' + cd.label + '</span>' +
    '</div>';
  }).join('');
}

// ---- Live ticker (refreshes every second) ----
setInterval(() => {
  if (currentView === 'deadlines') renderDeadlines();
  renderDeadlinesMini();
}, 1000);

// ---- Modal state ----
let editingDeadlineId = null;

export function openDeadlineModal(id) {
  editingDeadlineId = id || null;
  const isEdit = !!id;
  document.getElementById('dl-modal-title').textContent = isEdit ? 'Edit deadline' : 'Add deadline';
  document.getElementById('dl-save-btn').textContent    = isEdit ? 'Save changes'  : 'Add deadline';

  if (isEdit) {
    const dl = (state.deadlines || []).find(d => d.id === id);
    if (!dl) return;
    document.getElementById('dl-title').value    = dl.title;
    document.getElementById('dl-desc').value     = dl.desc || '';
    document.getElementById('dl-date').value     = dl.date;
    document.getElementById('dl-time').value     = dl.time || '23:59';
    document.getElementById('dl-priority').value = dl.priority || 'med';
  } else {
    document.getElementById('dl-title').value    = '';
    document.getElementById('dl-desc').value     = '';
    document.getElementById('dl-date').value     = fmtDate(new Date());
    document.getElementById('dl-time').value     = '23:59';
    document.getElementById('dl-priority').value = 'med';
  }
  document.getElementById('deadline-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('dl-title').focus(), 50);
}

export function closeDeadlineModal() {
  document.getElementById('deadline-modal').classList.add('hidden');
  editingDeadlineId = null;
}

export function saveDeadline() {
  const title = document.getElementById('dl-title').value.trim();
  if (!title) return;
  if (!state.deadlines) state.deadlines = [];

  if (editingDeadlineId) {
    const dl = state.deadlines.find(d => d.id === editingDeadlineId);
    if (dl) {
      dl.title    = title;
      dl.desc     = document.getElementById('dl-desc').value.trim();
      dl.date     = document.getElementById('dl-date').value;
      dl.time     = document.getElementById('dl-time').value;
      dl.priority = document.getElementById('dl-priority').value;
    }
  } else {
    state.deadlines.push({
      id:       uid(),
      title,
      desc:     document.getElementById('dl-desc').value.trim(),
      date:     document.getElementById('dl-date').value,
      time:     document.getElementById('dl-time').value,
      priority: document.getElementById('dl-priority').value,
      done:     false,
      created:  Date.now(),
    });
  }
  saveState();
  closeDeadlineModal();
  renderDeadlines();
  renderDeadlinesMini();
}

export function toggleDeadlineDone(id) {
  const dl = (state.deadlines || []).find(d => d.id === id);
  if (dl) { dl.done = !dl.done; saveState(); renderDeadlines(); renderDeadlinesMini(); }
}

export function deleteDeadline(id) {
  state.deadlines = (state.deadlines || []).filter(d => d.id !== id);
  saveState();
  renderDeadlines();
  renderDeadlinesMini();
}
