// ============================================================
// HABITS VIEW
// ============================================================
import { state, saveState, currentView, selectedDate, habitWeekStart } from '../state.js';
import { uid, fmtDate, fmtShort, addDays, parseDate } from '../utils.js';
import { gymLabelForDate } from './gym.js';

// ---- Core habit data helpers ----
export function habitDone(habitId, ds) {
  return !!(state.habitLog[ds] && state.habitLog[ds][habitId]);
}

export function habitStreak(habitId) {
  let streak = 0;
  let d = addDays(new Date(), -1); // start from yesterday
  while (true) {
    const ds = fmtDate(d);
    if (habitDone(habitId, ds)) { streak++; d = addDays(d, -1); }
    else break;
  }
  if (habitDone(habitId, fmtDate(new Date()))) streak++;
  return streak;
}

export function habitMonthStats(habitId, year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const today   = new Date();
  let done = 0, total = 0;
  for (let d = 1; d <= lastDay; d++) {
    const cellDate = new Date(year, month, d);
    if (cellDate > today) break;
    total++;
    const ds = fmtDate(cellDate);
    if (habitId === 'water') {
      const checks = state.water[ds] || [false, false, false];
      if (checks.every(Boolean)) done++;
    } else {
      if (habitDone(habitId, ds)) done++;
    }
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function getHabitAchievement(pct) {
  if (pct >= 100) return { label: '🏆 Perfect month!', cls: '' };
  if (pct >= 75)  return { label: '🥇 75% achieved!',   cls: '' };
  if (pct >= 50)  return { label: '🥈 Half-way there',  cls: 'silver' };
  return null;
}

// ---- Toggle / modal ----
export function toggleHabit(habitId, ds) {
  if (!state.habitLog[ds]) state.habitLog[ds] = {};
  state.habitLog[ds][habitId] = !state.habitLog[ds][habitId];
  saveState();
  renderDailyHabits(ds);
  if (currentView === 'habits') renderHabitsView();
}

export function openHabitModal() {
  document.getElementById('habit-name').value  = '';
  document.getElementById('habit-icon').value  = '';
  document.getElementById('habit-color').value = '#3a7c5a';
  document.getElementById('habit-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('habit-name').focus(), 50);
}

export function closeHabitModal() {
  document.getElementById('habit-modal').classList.add('hidden');
}

export function saveHabit() {
  const name  = document.getElementById('habit-name').value.trim();
  if (!name) return;
  const icon  = document.getElementById('habit-icon').value.trim() || '✅';
  const color = document.getElementById('habit-color').value;
  state.habits.push({ id: uid(), name, icon, color });
  saveState();
  closeHabitModal();
  renderDailyHabits(fmtDate(selectedDate));
  if (currentView === 'habits') renderHabitsView();
}

export function deleteHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id);
  saveState();
  renderDailyHabits(fmtDate(selectedDate));
  if (currentView === 'habits') renderHabitsView();
}

// ---- Daily habit strip (used inside daily view card) ----
export function renderDailyHabits(ds) {
  const el = document.getElementById('habits-daily-list');
  if (!el) return;
  if (!state.habits.length) {
    el.innerHTML = '<div class="empty-state">No habits yet. <button class="btn btn-sm" onclick="openHabitModal()" style="margin-left:6px;">+ Add one</button></div>';
    return;
  }
  el.innerHTML = state.habits.map(h => {
    const done   = habitDone(h.id, ds);
    const streak = habitStreak(h.id);
    return `
      <div class="habit-daily-row">
        <button class="habit-check-btn ${done ? 'done' : ''}"
          style="${done ? `background:${h.color}; border-color:${h.color};` : `border-color:${h.color}55;`}"
          onclick="toggleHabit('${h.id}','${ds}')" title="${done ? 'Mark undone' : 'Mark done'}">
          ${done ? '✓' : h.icon}
        </button>
        <div class="habit-daily-info">
          <div class="habit-daily-name">${h.icon} ${h.name}</div>
          <div class="habit-daily-streak">${streak > 0 ? `🔥 ${streak} day streak` : 'No streak yet'}</div>
        </div>
        <button class="habit-del-btn" onclick="deleteHabit('${h.id}')" title="Remove habit">×</button>
      </div>
    `;
  }).join('');
}

// ---- Full habits view ----
export function renderHabitsView() {
  const el = document.getElementById('habits-overview');
  if (!el) return;
  if (!state.habits.length) {
    el.innerHTML = '<div class="habit-overview-card"><div class="empty-state">No habits yet. Click "+ New habit" to get started.</div></div>';
    return;
  }

  const now     = new Date();
  const todayDs = fmtDate(now);

  // Nav label
  const hws      = habitWeekStart;
  const hwe      = addDays(hws, 6);
  const navLabel = document.getElementById('habits-nav-label');
  if (navLabel) navLabel.textContent = `${fmtShort(hws)} – ${fmtShort(hwe)}`;

  function weekDates() {
    return Array.from({ length: 7 }, (_, i) => fmtDate(addDays(habitWeekStart, i)));
  }

  // Last 6 months for heatmaps
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  function isHabitDoneForDate(h, ds) {
    if (h.id === 'water') {
      const checks = state.water[ds] || [false, false, false];
      return checks.every(Boolean);
    }
    return habitDone(h.id, ds);
  }

  // Stats header
  const totalHabits  = state.habits.length;
  const doneToday    = state.habits.filter(h => isHabitDoneForDate(h, todayDs)).length;
  const wkDays       = weekDates();
  const weekDoneAll  = wkDays.reduce((sum, ds) =>
    sum + state.habits.filter(h => isHabitDoneForDate(h, ds)).length, 0);
  const weekPossible = 7 * totalHabits || 1;
  const weekPct      = Math.round((weekDoneAll / weekPossible) * 100);

  const statsHtml = `
    <div class="stats-row" style="margin-bottom:20px;">
      <div class="stat-card">
        <div class="stat-label">Habits tracked</div>
        <div class="stat-value">${totalHabits}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Done today</div>
        <div class="stat-value">${doneToday} <span>/ ${totalHabits}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This week</div>
        <div class="stat-value">${weekPct}<span>%</span></div>
      </div>
    </div>
  `;

  function darkenHex(hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.round(r * (1 - amount)), dg = Math.round(g * (1 - amount)), db = Math.round(b * (1 - amount));
    return '#' + [dr, dg, db].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  const cardsHtml = state.habits.map(h => {
    const streak      = habitStreak(h.id);
    const thisMonthSt = habitMonthStats(h.id, now.getFullYear(), now.getMonth());
    const ach         = getHabitAchievement(thisMonthSt.pct);
    const todayDone   = isHabitDoneForDate(h, todayDs);

    // Weekly 7-segment bar
    const wkDays2  = weekDates();
    const wkDone   = wkDays2.filter(ds => isHabitDoneForDate(h, ds)).length;
    const wkTotal  = 7;
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const wkSegs = Array.from({ length: 7 }, (_, i) => {
      const ds       = fmtDate(addDays(habitWeekStart, i));
      const isFut    = parseDate(ds) > now;
      const isTodayD = ds === fmtDate(now);
      const glow     = isTodayD ? 'box-shadow:0 0 0 2px ' + h.color + '55;' : '';

      if (h.id === 'water') {
        const checks   = (!isFut && state.water[ds]) ? state.water[ds] : [false, false, false];
        const filled   = isFut ? 0 : checks.filter(Boolean).length;
        const allDone  = filled === 3;
        const subColor = allDone ? darkenHex(h.color, 0.25) : h.color;
        const borderC  = allDone ? h.color : isFut ? 'var(--border)' : 'var(--border2)';
        const labelColor = filled > 0 ? h.color : 'var(--text3)';
        const labelWt  = isTodayD ? '600' : '400';
        const microSegs = [0, 1, 2].map(j => {
          const segBg = j < filled ? subColor : 'var(--surface2)';
          return `<div style="flex:1;border-radius:3px;background:${segBg};transition:background 0.3s;"></div>`;
        }).join('');
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">` +
          `<div style="width:100%;height:28px;border-radius:6px;border:2px solid ${borderC};${glow}` +
          `display:flex;flex-direction:row;gap:2px;padding:3px;box-sizing:border-box;transition:border-color 0.3s;">` +
          microSegs + `</div>` +
          `<span style="font-size:10px;color:${labelColor};font-weight:${labelWt};">${dayLabels[i]}</span>` +
          `</div>`;
      } else {
        const isDone     = isHabitDoneForDate(h, ds);
        const bg         = isDone ? h.color : isFut ? 'var(--border)' : 'var(--surface2)';
        const border     = isDone ? h.color : isFut ? 'var(--border)' : 'var(--border2)';
        const labelColor = isDone ? h.color : 'var(--text3)';
        const labelWt    = isTodayD ? '600' : '400';
        const check      = isDone ? '✓' : '';
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">` +
          `<div style="width:100%;height:28px;border-radius:6px;background:${bg};border:2px solid ${border};${glow}` +
          `transition:background 0.3s,border-color 0.3s;display:flex;align-items:center;justify-content:center;font-size:13px;">${check}</div>` +
          `<span style="font-size:10px;color:${labelColor};font-weight:${labelWt};">${dayLabels[i]}</span>` +
          `</div>`;
      }
    }).join('');

    const wkFillPct   = Math.round((wkDone / wkTotal) * 100);
    const wkFillColor = wkDone === 7 ? 'var(--green)' : h.color;
    const moPct       = thisMonthSt.pct;
    const moColor     = moPct >= 75 ? 'var(--green)' : moPct >= 40 ? 'var(--accent)' : 'var(--blue)';

    // 6-month heatmap
    const heatmapHtml = months.map(({ year, month }) => {
      const stats     = habitMonthStats(h.id, year, month);
      const monthLabel = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      const lastDay   = new Date(year, month + 1, 0).getDate();
      const firstDow  = new Date(year, month, 1).getDay();
      const offset    = firstDow === 0 ? 6 : firstDow - 1;
      let cells = Array(offset).fill(`<div class="habit-hm-cell" style="opacity:0;"></div>`);
      for (let d = 1; d <= lastDay; d++) {
        const cellDate = new Date(year, month, d);
        const ds       = fmtDate(cellDate);
        const isFuture = cellDate > now;
        const done     = isHabitDoneForDate(h, ds);
        const bg  = done ? h.color : 'var(--surface2)';
        const op  = isFuture ? '0.2' : done ? '1' : '0.45';
        cells.push(`<div class="habit-hm-cell" style="background:${bg};opacity:${op};" title="${ds}"></div>`);
      }
      const monthAch = getHabitAchievement(stats.pct);
      return `
        <div class="habit-heatmap-month">
          <div class="habit-heatmap-month-label">${monthLabel} — ${stats.pct}%${monthAch ? ' ' + monthAch.label : ''}</div>
          <div class="habit-heatmap-row">${cells.join('')}</div>
        </div>`;
    }).join('');

    const waterNote = h.id === 'water'
      ? `<div style="font-size:11px;color:var(--text3);margin-top:6px;">Controlled via the daily water checkboxes</div>`
      : '';

    return `
      <div class="habit-overview-card">
        <div class="habit-ov-header">
          <div class="habit-ov-icon" style="background:${h.color}18;">${h.icon}</div>
          <div style="flex:1;min-width:0;">
            <div class="habit-ov-name">${h.name}
              ${todayDone ? `<span style="font-size:11px;background:${h.color}18;color:${h.color};padding:2px 8px;border-radius:99px;margin-left:6px;font-weight:500;">Done today ✓</span>` : ''}
            </div>
            <div class="habit-ov-sub">
              🔥 ${streak > 0 ? streak + ' day streak' : 'No streak yet'}
              &nbsp;·&nbsp; This month: ${thisMonthSt.done}/${thisMonthSt.total} days
            </div>
            ${ach ? `<span class="achievement-badge ${ach.cls}" style="margin-top:4px;">${ach.label}</span>` : ''}
          </div>
          <button class="habit-del-btn" style="margin-left:8px;" onclick="deleteHabit('${h.id}')">×</button>
        </div>

        <div style="margin-bottom:18px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:var(--text3);">This week</span>
            <span style="font-size:12px;font-weight:600;color:${wkFillColor};">${wkDone} / ${wkTotal} days</span>
          </div>
          <div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:8px;">${wkSegs}</div>
          <div class="progress-bar" style="height:5px;">
            <div class="progress-fill" style="width:${wkFillPct}%;background:${wkFillColor};transition:width 0.5s ease;"></div>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:var(--text3);">This month</span>
            <span style="font-size:12px;font-weight:600;color:${moColor};">${moPct}%</span>
          </div>
          <div class="progress-bar" style="height:8px;">
            <div class="progress-fill" style="width:${moPct}%;background:${moColor};"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;">
            <span style="font-size:11px;color:var(--text3);">${thisMonthSt.done} days completed</span>
            <span style="font-size:11px;color:var(--text3);">${thisMonthSt.total - thisMonthSt.done} remaining</span>
          </div>
        </div>

        ${waterNote}

        <button class="goal-history-toggle" onclick="toggleGoalHistory('hm-${h.id}')">Show 6-month heatmap</button>
        <div class="goal-history" id="hm-${h.id}" style="padding:10px 0 0;">
          ${heatmapHtml}
        </div>
      </div>
    `;
  }).join('');

  // ---- Gym summary card ----
  const gymWorkoutDays = { 'Push day': null, 'Pull day': null, 'Legs day': null };
  weekDates().forEach(ds => {
    const label = gymLabelForDate(ds);
    if (Object.prototype.hasOwnProperty.call(gymWorkoutDays, label)) {
      gymWorkoutDays[label] = ds;
    }
  });

  const gymTypes = [
    { label: 'Push day', icon: '🏋️' },
    { label: 'Pull day', icon: '💪' },
    { label: 'Legs day', icon: '🦵' },
  ];

  const gymDone  = gymTypes.filter(t => {
    const ds = gymWorkoutDays[t.label];
    return ds && state.gym && state.gym[ds];
  }).length;

  const gymPct   = Math.round((gymDone / 3) * 100);
  const gymColor = gymDone === 3 ? 'var(--green)' : gymDone >= 1 ? 'var(--accent)' : 'var(--blue)';

  const gymSegs = gymTypes.map(t => {
    const ds      = gymWorkoutDays[t.label];
    const checked = ds && state.gym && state.gym[ds];
    const isFut   = ds ? parseDate(ds) > now : true;
    const isToday_ = ds === todayDs;
    const bg      = checked ? gymColor : isFut ? 'var(--border)' : 'var(--surface2)';
    const border_ = checked ? gymColor : isFut ? 'var(--border)' : 'var(--border2)';
    const glow    = isToday_ ? 'box-shadow:0 0 0 2px var(--accent)44;' : '';
    const dateStr = ds ? parseDate(ds).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">' +
      '<div style="width:100%;height:28px;border-radius:6px;background:' + bg + ';border:2px solid ' + border_ + ';' + glow +
      'transition:background 0.3s,border-color 0.3s;display:flex;align-items:center;justify-content:center;font-size:14px;">' +
      (checked ? '✓' : (ds && !isFut ? t.icon : '')) + '</div>' +
      '<span style="font-size:10px;color:var(--text3);font-weight:500;text-align:center;">' + t.label.replace(' day', '') + '</span>' +
      '<span style="font-size:9px;color:var(--text3);">' + dateStr + '</span>' +
      '</div>';
  }).join('');

  const gymCardHtml =
    '<div class="habit-overview-card">' +
      '<div class="habit-ov-header">' +
        '<div class="habit-ov-icon" style="background:#c97b3a18;font-size:20px;">🏋️</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div class="habit-ov-name">Gym progress' +
            (gymDone === 3 ? ' <span style="font-size:11px;background:var(--green-light);color:var(--green);padding:2px 8px;border-radius:99px;margin-left:6px;font-weight:500;">Full week ✓</span>' : '') +
          '</div>' +
          '<div class="habit-ov-sub">Push · Pull · Legs — ' + gymDone + '/3 workouts this week</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:8px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
          '<span style="font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:var(--text3);">This week</span>' +
          '<span style="font-size:12px;font-weight:600;color:' + gymColor + ';">' + gymDone + ' / 3 workouts</span>' +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:8px;">' + gymSegs + '</div>' +
        '<div class="progress-bar" style="height:5px;">' +
          '<div class="progress-fill" style="width:' + gymPct + '%;background:' + gymColor + ';transition:width 0.5s ease;"></div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:4px;">Controlled via the daily Gym progress checkbox</div>' +
    '</div>';

  el.innerHTML = statsHtml + gymCardHtml + cardsHtml;
}
