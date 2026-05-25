// ============================================================
// TASKS
// ============================================================
import { state, saveState, selectedDate, selectedMonthDay, pendingTaskContext, setPendingTaskContext, currentView } from './state.js';
import { uid, fmtDate } from './utils.js';
import { renderAll } from './router.js';
import { getCat, catStyle, PRIORITY_CLASS, populateCategorySelect } from './categories.js';

// ---- Data helpers ----
export function tasksForDate(dateStr) {
  const regular = state.tasks.filter(t => t.date === dateStr);
  const recurring = (state.recurringTasks || [])
    .filter(r => isRecurringActiveOn(r, dateStr))
    .map(r => ({
      id:        r.id,
      text:      r.text,
      date:      dateStr,
      priority:  r.priority,
      category:  r.category,
      notes:     r.notes,
      done:      (r.doneOn || []).includes(dateStr),
      isRecurring: true,
      recurDesc: recurDescription(r),
    }));
  return [...regular, ...recurring];
}

export function eventsForDate(dateStr) {
  const regular = state.events.filter(e => e.date === dateStr);

  // Inject transport legs from trips as virtual read-only events
  const tripEvents = [];
  (state.trips || []).forEach(trip => {
    (trip.legs || []).forEach(leg => {
      if (leg.type === 'lodging' || !leg.depDate) return;
      if (leg.depDate !== dateStr) return;
      const start = leg.depTime || '00:00';
      const end   = (leg.arrDate === dateStr && leg.arrTime) ? leg.arrTime : '';
      const label = leg.transport.charAt(0).toUpperCase() + leg.transport.slice(1) +
        (leg.number   ? ' ' + leg.number   : '') +
        (leg.operator ? ' · ' + leg.operator : '') +
        ' — ' + (leg.depCity || leg.depLoc || '') +
        (leg.arrCity || leg.arrLoc ? ' → ' + (leg.arrCity || leg.arrLoc) : '');
      tripEvents.push({
        id:        'trip-leg-' + trip.id + '-' + leg.depDate + '-' + start,
        date:      dateStr,
        title:     label,
        start,
        end,
        category:  'trip',
        tripId:    trip.id,
        tripColor: trip.color || '#6b4a8a',
        readOnly:  true,
      });
    });
  });

  return [...regular, ...tripEvents];
}

export function completionRate(tasks) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(t => t.done).length / tasks.length) * 100);
}

// ---- Render helpers ----
export function renderTaskProgressBar(tasks) {
  if (!tasks.length) return '';
  const done  = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct   = Math.round((done / total) * 100);
  const segs  = tasks.map(t => `<div class="task-seg ${t.done ? 'done' : 'pending'}"></div>`).join('');
  const color = pct === 100 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--blue)';
  return `
    <div class="task-progress-wrap">
      <div class="task-progress-header">
        <span class="task-progress-label">${pct === 100 ? 'All done!' : 'Progress'}</span>
        <span class="task-progress-count" style="color:${color};">${done} / ${total}</span>
      </div>
      <div class="task-progress-track">
        <div class="task-progress-fill" style="width:${pct}%; background:${color};"></div>
      </div>
      ${total <= 20 ? `<div class="task-progress-segments">${segs}</div>` : ''}
    </div>
  `;
}

export function renderTasksList(containerId, tasks, showDate) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!tasks.length) {
    el.innerHTML = '<div class="empty-state">No tasks yet</div>';
    return;
  }

  const pOrder = { high: 0, med: 1, low: 2 };
  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
  });

  el.innerHTML = renderTaskProgressBar(tasks) + sorted.map(t => `
    <div class="task-item">
      <div class="task-check ${t.done ? 'done' : ''}" onclick="toggleTask('${t.id}', '${t.date}')">
        ${t.done ? '✓' : ''}
      </div>
      <div class="task-content">
        <div class="task-text ${t.done ? 'done' : ''}">${t.text}</div>
        <div class="task-meta">
          <div class="priority-dot ${PRIORITY_CLASS[t.priority]}"></div>
          <span class="tag" style="${catStyle(t.category)}">${getCat(t.category).name}</span>
          ${t.isRecurring ? `<span class="recur-badge">↻ ${t.recurDesc}</span>` : ''}
          ${showDate ? '' : `<span style="font-size:11px;color:var(--text3);">${t.date}</span>`}
          ${t.notes ? `<span style="font-size:11px;color:var(--text3);">${t.notes.slice(0, 30)}${t.notes.length > 30 ? '…' : ''}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        ${t.isRecurring
          ? `<button class="del-btn" title="Manage in Recurring tab" onclick="switchView('recurring')" style="font-size:11px;padding:3px 6px;">↻</button>`
          : `<button class="del-btn" onclick="deleteTask('${t.id}')">×</button>`}
      </div>
    </div>
  `).join('');
}

// ---- Toggle / delete ----
export function toggleTask(id, ds) {
  const r = (state.recurringTasks || []).find(r => r.id === id);
  if (r) { toggleRecurTask(id, ds || fmtDate(selectedDate)); return; }
  const t = state.tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; saveState(); renderAll(); }
}

export function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  renderAll();
}

// ---- Modal ----
export function openTaskModal(context) {
  setPendingTaskContext(context);
  let defaultDate = fmtDate(selectedDate);
  if (context === 'monthly' && selectedMonthDay) defaultDate = selectedMonthDay;
  document.getElementById('task-date').value     = defaultDate;
  document.getElementById('task-name').value     = '';
  document.getElementById('task-notes').value    = '';
  document.getElementById('task-priority').value = 'med';
  document.getElementById('task-recur').value    = 'none';
  document.getElementById('task-recur-end').value = '';
  document.getElementById('recur-end-wrap').classList.add('hidden');
  populateCategorySelect('task-category', state.categories[0]?.id || 'work');
  document.getElementById('task-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('task-name').focus(), 50);
}

export function toggleRecurOptions() {
  const val = document.getElementById('task-recur').value;
  document.getElementById('recur-end-wrap').classList.toggle('hidden', val === 'none');
}

export function closeTaskModal() {
  document.getElementById('task-modal').classList.add('hidden');
}

export function saveTask() {
  const name = document.getElementById('task-name').value.trim();
  if (!name) return;
  const recur    = document.getElementById('task-recur').value;
  const recurEnd = document.getElementById('task-recur-end').value || null;
  const taskDate = document.getElementById('task-date').value;

  if (recur !== 'none') {
    if (!state.recurringTasks) state.recurringTasks = [];
    state.recurringTasks.push({
      id:        uid(),
      text:      name,
      startDate: taskDate,
      recurEnd,
      recur,
      priority:  document.getElementById('task-priority').value,
      category:  document.getElementById('task-category').value,
      notes:     document.getElementById('task-notes').value.trim(),
      doneOn:    [],
      created:   Date.now(),
    });
  } else {
    state.tasks.push({
      id:       uid(),
      text:     name,
      date:     taskDate,
      priority: document.getElementById('task-priority').value,
      category: document.getElementById('task-category').value,
      notes:    document.getElementById('task-notes').value.trim(),
      done:     false,
      created:  Date.now(),
    });
  }
  saveState();
  closeTaskModal();
  renderAll();
}
