// ============================================================
// MONTHLY VIEW
// ============================================================
import { state, selectedMonth, selectedMonthDay, setSelectedMonthDay } from '../state.js';
import { fmtDate, fmtDisplay, isToday, parseDate } from '../utils.js';
import { tasksForDate, completionRate, renderTasksList } from '../tasks.js';

export function countActiveDays(y, m) {
  const last = new Date(y, m + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    if (tasksForDate(fmtDate(new Date(y, m, d))).length > 0) count++;
  }
  return count;
}

export function selectMonthDay(ds) {
  setSelectedMonthDay(ds);
  renderMonthDayDetail(ds);
}

export function renderMonthDayDetail(ds) {
  const detail = document.getElementById('monthly-day-detail');
  detail.style.display = 'block';
  const d = parseDate(ds);
  document.getElementById('monthly-detail-title').textContent = fmtDisplay(d);
  renderTasksList('monthly-day-tasks', tasksForDate(ds), true);
}

export function renderMonthly() {
  const y = selectedMonth.getFullYear();
  const m = selectedMonth.getMonth();

  document.getElementById('monthly-nav-label').textContent =
    selectedMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  document.getElementById('monthly-subtitle').textContent =
    `Overview for ${selectedMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;

  // Stats
  const lastDay = new Date(y, m + 1, 0);
  let monthTasks = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    monthTasks = monthTasks.concat(tasksForDate(fmtDate(new Date(y, m, d))));
  }
  const done = monthTasks.filter(t => t.done).length;

  // Per-habit achievement badges — delegate to habits module via window
  const habitMonthStats    = window.habitMonthStats    || (() => ({ done: 0, total: 0, pct: 0 }));
  const getHabitAchievement = window.getHabitAchievement || (() => null);

  const habitAchHtml = state.habits.map(h => {
    const stats = habitMonthStats(h.id, y, m);
    const ach   = getHabitAchievement(stats.pct);
    return `<div class="stat-card" style="${ach && stats.pct >= 75 ? 'border-color:var(--green);' : ''}">
      <div class="stat-label">${h.icon} ${h.name}</div>
      <div class="stat-value">${stats.done}<span>/${stats.total} days</span></div>
      ${ach
        ? `<span class="achievement-badge ${ach.cls}" style="margin-top:4px;">${ach.label}</span>`
        : `<div style="font-size:11px;color:var(--text3);margin-top:2px;">${stats.pct}% — need 75% for badge</div>`}
    </div>`;
  }).join('');

  document.getElementById('monthly-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">This month</div>
      <div class="stat-value">${monthTasks.length} <span>tasks</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Completed</div>
      <div class="stat-value">${done} <span>done</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Rate</div>
      <div class="stat-value">${completionRate(monthTasks)}<span>%</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active days</div>
      <div class="stat-value">${countActiveDays(y, m)}</div>
    </div>
    ${habitAchHtml}
  `;

  // Calendar grid
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let html = dayNames.map(d => `<div class="month-header-cell">${d}</div>`).join('');

  const firstDay = new Date(y, m, 1);
  let startDow   = firstDay.getDay();
  startDow       = startDow === 0 ? 6 : startDow - 1; // convert to Mon=0

  // Previous-month filler cells
  for (let i = 0; i < startDow; i++) {
    const prevDate = new Date(y, m, 1 - startDow + i);
    html += `<div class="month-cell other-month"><div class="month-cell-num">${prevDate.getDate()}</div></div>`;
  }

  // Current-month cells
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const cellDate   = new Date(y, m, d);
    const ds         = fmtDate(cellDate);
    const tasks      = tasksForDate(ds);
    const todayClass   = isToday(cellDate) ? 'today' : '';
    const dow          = cellDate.getDay();
    const weekendClass = (dow === 0 || dow === 6) ? 'weekend' : '';
    const hol          = window.holidayForDate ? window.holidayForDate(ds) : null;
    const holidayClass = hol ? 'holiday' : '';
    const isCheatDay   = (state.cheatDays || []).includes(ds);
    const cheatClass   = isCheatDay ? 'cheat-day' : '';

    const taskDots = tasks.slice(0, 3).map(t =>
      `<div class="month-dot ${t.done ? 'done' : ''}"></div>`
    ).join('');
    const cheatDot = isCheatDay
      ? `<div class="cheat-day-dot" title="Cheat day 🍕"></div>`
      : '';

    html += `
      <div class="month-cell ${todayClass} ${weekendClass} ${holidayClass} ${cheatClass}"
           onclick="selectMonthDay('${ds}', ${d})">
        <div class="month-cell-num">${d}</div>
        ${hol ? `<div class="holiday-name-badge" style="background:${hol.color}33;color:${hol.color};">🎉 ${hol.name}</div>` : ''}
        <div class="month-dot-row">${cheatDot}${taskDots}</div>
      </div>
    `;
  }

  // Trailing filler cells
  const totalCells = startDow + lastDay.getDate();
  const trailing   = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    html += `<div class="month-cell other-month"><div class="month-cell-num">${i}</div></div>`;
  }

  document.getElementById('month-grid').innerHTML = html;

  // Re-render selected day detail if one is active
  if (selectedMonthDay) {
    renderMonthDayDetail(selectedMonthDay);
  }
}
