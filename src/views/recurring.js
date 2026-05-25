// ============================================================
// RECURRING TASKS VIEW
// ============================================================
import { state, saveState } from '../state.js';
import { parseDate, fmtDate } from '../utils.js';
import { renderAll } from '../router.js';
import { getCat, catStyle } from '../categories.js';

// ---- Helpers (also used by tasks.js via import) ----
export function recurDescription(r) {
  switch (r.recur) {
    case 'daily': return 'Every day';
    case 'weekly': {
      const d = parseDate(r.startDate);
      return 'Every ' + d.toLocaleDateString('en-GB', { weekday: 'long' });
    }
    case 'monthly-date': {
      const d   = parseDate(r.startDate);
      const day = d.getDate();
      const suf = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
      return 'Monthly on the ' + day + suf;
    }
    case 'monthly-day': {
      const d       = parseDate(r.startDate);
      const weekNum = Math.ceil(d.getDate() / 7);
      const wn      = weekNum === 1 ? '1st' : weekNum === 2 ? '2nd' : weekNum === 3 ? '3rd' : '4th';
      return 'Monthly on the ' + wn + ' ' + d.toLocaleDateString('en-GB', { weekday: 'long' });
    }
    case 'yearly': {
      const d = parseDate(r.startDate);
      return 'Yearly on ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    }
    default: return r.recur;
  }
}

export function isRecurringActiveOn(r, ds) {
  if (ds < r.startDate) return false;
  if (r.recurEnd && ds > r.recurEnd) return false;

  const d   = parseDate(ds);
  const ref = parseDate(r.startDate);

  switch (r.recur) {
    case 'daily': return true;
    case 'weekly':
      return d.getDay() === ref.getDay();
    case 'monthly-date':
      return d.getDate() === ref.getDate();
    case 'monthly-day': {
      const sameWeekday = d.getDay() === ref.getDay();
      const sameWeekNum = Math.ceil(d.getDate() / 7) === Math.ceil(ref.getDate() / 7);
      return sameWeekday && sameWeekNum;
    }
    case 'yearly':
      return d.getDate() === ref.getDate() && d.getMonth() === ref.getMonth();
    default: return false;
  }
}

export function toggleRecurTask(recurId, ds) {
  const r = (state.recurringTasks || []).find(r => r.id === recurId);
  if (!r) return;
  if (!r.doneOn) r.doneOn = [];
  if (r.doneOn.includes(ds)) {
    r.doneOn = r.doneOn.filter(d => d !== ds);
  } else {
    r.doneOn.push(ds);
  }
  saveState();
  renderAll();
}

export function deleteRecurringTask(id) {
  state.recurringTasks = (state.recurringTasks || []).filter(r => r.id !== id);
  saveState();
  renderAll();
}

// ---- View render ----
export function renderRecurring() {
  const el = document.getElementById('recurring-list');
  if (!el) return;
  const list = state.recurringTasks || [];
  if (!list.length) {
    el.innerHTML = '<div class="card"><div class="empty-state">No recurring tasks yet. Add a task and set a repeat schedule.</div></div>';
    return;
  }
  el.innerHTML = '<div class="card">' + list.map(r => {
    const cat = getCat(r.category);
    return `<div class="recur-item">
      <div class="recur-body">
        <div class="recur-title">${r.text}</div>
        <div class="recur-meta">
          <span class="recur-badge">↻ ${recurDescription(r)}</span>
          <span class="tag" style="${catStyle(r.category)}">${cat.name}</span>
          ${r.recurEnd
            ? '<span>Ends ' + parseDate(r.recurEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</span>'
            : '<span>No end date</span>'}
          <span>Since ${parseDate(r.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span>${(r.doneOn || []).length} completion${(r.doneOn || []).length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <button class="del-btn" style="opacity:1;" onclick="deleteRecurringTask('${r.id}')">×</button>
    </div>`;
  }).join('') + '</div>';
}
