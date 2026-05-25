// ============================================================
// GOALS VIEW
// ============================================================
import { state, saveState, currentView, selectedDate, editingGoalId, setEditingGoalId } from '../state.js';
import { uid, fmtDate, parseDate } from '../utils.js';
import { getCat, catStyle, populateCategorySelect } from '../categories.js';

// ---- Goals mini widget (shown on daily view sidebar) ----
export function renderGoalsMini() {
  const el = document.getElementById('daily-goals-mini');
  if (!el) return;
  if (!state.goals.length) {
    el.innerHTML = '<div class="empty-state">No goals yet. <a href="#" onclick="switchView(\'goals\')" style="color:var(--accent);">Create one →</a></div>';
    return;
  }
  const ds = fmtDate(selectedDate);

  el.innerHTML = state.goals.map(g => {
    const pct      = Math.min(100, Math.round((g.current / g.target) * 100));
    const cat      = getCat(g.category);
    const barColor = cat.color;
    const done     = g.current >= g.target;
    const log      = g.log || [];
    const todayEntries = log.filter(e => e.date === ds);
    const todayDelta   = todayEntries.reduce((s, e) => s + e.delta, 0);

    const todayNote = todayDelta !== 0
      ? `<span style="font-size:11px;color:var(--green);margin-left:4px;">+${todayDelta} today</span>`
      : '';

    return `
      <div class="goal-mini-item">
        <div class="goal-mini-top">
          <div class="goal-mini-info">
            <div class="goal-mini-name">${g.name} ${done ? '✓' : ''}</div>
            <div class="goal-mini-sub">${g.current} / ${g.target} ${g.unit}${todayNote}</div>
          </div>
          <div class="goal-counter">
            <button class="goal-counter-btn minus" onclick="nudgeGoal('${g.id}', -1)" title="Remove 1">−</button>
            <div class="goal-counter-val">${g.current}</div>
            <button class="goal-counter-btn plus" onclick="nudgeGoal('${g.id}', +1)" title="Add 1">+</button>
          </div>
        </div>
        <div class="goal-mini-bar-row">
          <div class="goal-mini-bar-wrap">
            <div class="goal-mini-bar-fill" style="width:${pct}%; background:${barColor};"></div>
          </div>
          <div class="goal-mini-pct">${pct}%</div>
        </div>
      </div>
    `;
  }).join('');
}

export function toggleGoalHistory(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

export function nudgeGoal(goalId, delta) {
  const g = state.goals.find(g => g.id === goalId);
  if (!g) return;
  const newVal = Math.max(0, g.current + delta);
  if (newVal === g.current) return;
  const ds = fmtDate(selectedDate);
  if (!g.log) g.log = [];
  g.log.push({ date: ds, delta: newVal - g.current, after: newVal, ts: Date.now() });
  g.current = newVal;
  saveState();
  renderGoalsMini();
  if (currentView === 'goals') renderGoals();
}

// ---- Full goals view ----
export function renderGoals() {
  const stats = document.getElementById('goals-stats');
  const total     = state.goals.length;
  const completed = state.goals.filter(g => g.current >= g.target).length;
  const avgPct    = total
    ? Math.round(state.goals.reduce((s, g) => s + Math.min(100, (g.current / g.target) * 100), 0) / total)
    : 0;

  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Goals</div>
      <div class="stat-value">${total}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Completed</div>
      <div class="stat-value">${completed}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg progress</div>
      <div class="stat-value">${avgPct}<span>%</span></div>
    </div>
  `;

  const list = document.getElementById('goals-list');
  if (!state.goals.length) {
    list.innerHTML = '<div class="card"><div class="empty-state">No goals yet. Create your first goal to get started.</div></div>';
    return;
  }

  list.innerHTML = state.goals.map(g => {
    const itemCount = (g.items || []).length;
    const current   = itemCount > 0 ? itemCount : g.current;
    const pct       = Math.min(100, Math.round((current / g.target) * 100));
    const catColor  = getCat(g.category).color;
    const done      = current >= g.target;
    const log       = g.log || [];
    const recentLog = [...log].reverse().slice(0, 8);

    const histHtml = recentLog.map(entry => {
      const d          = parseDate(entry.date);
      const dateLabel  = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const deltaClass = entry.delta >= 0 ? 'pos' : 'neg';
      return `
        <div class="goal-history-entry">
          <span class="goal-history-date">${dateLabel}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="goal-history-delta ${deltaClass}">${entry.delta >= 0 ? '+' : ''}${entry.delta} ${g.unit}</span>
            <span class="goal-history-val">${entry.after} / ${g.target}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card">
        <div class="goal-header">
          <div>
            <div class="goal-name">${g.name} ${done ? '<span style="font-size:12px;color:var(--green);">✓ Achieved!</span>' : ''}</div>
            <div class="goal-sub">${g.description || ''}</div>
          </div>
          <div class="goal-actions">
            <span class="tag" style="${catStyle(g.category)};margin-right:6px;">${getCat(g.category).name}</span>
            <button class="btn btn-sm" onclick="openGoalUpdateModal('${g.id}')">Update</button>
            <button class="del-btn" style="opacity:1;" onclick="deleteGoal('${g.id}')">×</button>
          </div>
        </div>
        <div class="flex-between" style="margin-bottom:5px;">
          <span style="font-size:13px;color:var(--text2);">${current} / ${g.target} ${g.unit}</span>
          <span class="goal-pct">${pct}%</span>
        </div>
        <div class="progress-bar" style="height:10px;">
          <div class="progress-fill" style="width:${pct}%; background:${catColor};"></div>
        </div>
        ${log.length ? `
          <div style="margin-top:12px;">
            <button class="goal-history-toggle" onclick="toggleGoalHistory('ghist-${g.id}')">
              ${log.length} update${log.length !== 1 ? 's' : ''} — show history
            </button>
            <div class="goal-history" id="ghist-${g.id}">${histHtml}</div>
          </div>
        ` : ''}
        <div class="goal-items-wrap">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">
            Items <span style="font-weight:400;color:var(--text3);font-size:11px;">(optional milestones / entries)</span>
          </div>
          ${(g.items || []).length
            ? (g.items || []).map((item, idx) => `
              <div class="goal-item-row">
                <span class="goal-item-text">${item.text}</span>
                <span class="goal-item-date">${item.date ? parseDate(item.date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : ''}</span>
                <button class="del-btn" onclick="deleteGoalItem('${g.id}', ${idx})">×</button>
              </div>
            `).join('')
            : '<div style="font-size:12px;color:var(--text3);padding:4px 0 8px;">No items yet.</div>'}
          <div class="goal-item-add-row">
            <input type="text" id="gi-text-${g.id}" placeholder="Add an item…" onkeydown="if(event.key==='Enter')addGoalItem('${g.id}')" />
            <input type="date" id="gi-date-${g.id}" value="${fmtDate(new Date())}" />
            <button class="btn btn-sm btn-primary" onclick="addGoalItem('${g.id}')">Add</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Modal: add goal ----
export function openGoalModal() {
  document.getElementById('goal-name').value   = '';
  document.getElementById('goal-desc').value   = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-unit').value   = '';
  populateCategorySelect('goal-category', state.categories[0]?.id || 'work');
  document.getElementById('goal-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('goal-name').focus(), 50);
}

export function closeGoalModal() {
  document.getElementById('goal-modal').classList.add('hidden');
}

export function saveGoal() {
  const name   = document.getElementById('goal-name').value.trim();
  const target = parseInt(document.getElementById('goal-target').value);
  if (!name || !target) return;
  state.goals.push({
    id:          uid(),
    name,
    description: document.getElementById('goal-desc').value.trim(),
    target,
    current:     0,
    unit:        document.getElementById('goal-unit').value.trim() || 'units',
    category:    document.getElementById('goal-category').value,
    created:     Date.now(),
    log:         [],
  });
  saveState();
  closeGoalModal();
  renderGoals();
}

export function deleteGoal(id) {
  state.goals = state.goals.filter(g => g.id !== id);
  saveState();
  renderGoals();
}

// ---- Goal items ----
export function addGoalItem(goalId) {
  const textEl = document.getElementById('gi-text-' + goalId);
  const dateEl = document.getElementById('gi-date-' + goalId);
  if (!textEl) return;
  const text = textEl.value.trim();
  if (!text) return;
  const g = state.goals.find(g => g.id === goalId);
  if (!g) return;
  if (!g.items) g.items = [];
  g.items.push({ text, date: dateEl ? dateEl.value : fmtDate(new Date()) });
  g.current = g.items.length;
  saveState();
  renderGoals();
  renderGoalsMini();
}

export function deleteGoalItem(goalId, idx) {
  const g = state.goals.find(g => g.id === goalId);
  if (!g || !g.items) return;
  g.items.splice(idx, 1);
  g.current = g.items.length;
  saveState();
  renderGoals();
  renderGoalsMini();
}

// ---- Modal: update progress ----
export function openGoalUpdateModal(id) {
  setEditingGoalId(id);
  const g = state.goals.find(g => g.id === id);
  if (!g) return;
  document.getElementById('goal-update-title').textContent = `Update: ${g.name}`;
  document.getElementById('goal-update-label').textContent = `Current progress (out of ${g.target} ${g.unit})`;
  document.getElementById('goal-update-value').value       = g.current;
  document.getElementById('goal-update-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('goal-update-value').focus(), 50);
}

export function closeGoalUpdateModal() {
  document.getElementById('goal-update-modal').classList.add('hidden');
  setEditingGoalId(null);
}

export function saveGoalProgress() {
  const val = parseFloat(document.getElementById('goal-update-value').value);
  if (isNaN(val)) return;
  const g = state.goals.find(g => g.id === editingGoalId);
  if (g) {
    const newVal = Math.max(0, val);
    const delta  = newVal - g.current;
    if (!g.log) g.log = [];
    if (delta !== 0) {
      g.log.push({ date: fmtDate(selectedDate), delta, after: newVal, ts: Date.now() });
    }
    g.current = newVal;
    saveState();
  }
  closeGoalUpdateModal();
  renderGoals();
  if (currentView === 'daily') renderGoalsMini();
}
