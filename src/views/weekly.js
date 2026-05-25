// ============================================================
// WEEKLY VIEW — unified calendar grid
// ============================================================
import { state, selectedWeekStart } from '../state.js';
import { fmtDate, fmtShort, fmtDisplay, isToday, addDays } from '../utils.js';
import { catStyle, catEvStyle } from '../categories.js';
import { tasksForDate, eventsForDate, completionRate, renderTasksList } from '../tasks.js';

const CAL_START = 0;   // 12am
const CAL_END   = 24;  // midnight
const SLOT_H    = 48;  // px per hour

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function renderWeekly() {
  const ws = selectedWeekStart;
  const we = addDays(ws, 6);
  document.getElementById('weekly-nav-label').textContent = `${fmtShort(ws)} – ${fmtShort(we)}`;
  document.getElementById('weekly-subtitle').textContent  = `${fmtDisplay(ws)} — ${fmtDisplay(we)}`;

  // Stats
  const allTasks = [];
  for (let i = 0; i < 7; i++) {
    tasksForDate(fmtDate(addDays(ws, i))).forEach(t => allTasks.push(t));
  }
  const done = allTasks.filter(t => t.done).length;
  document.getElementById('weekly-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">This week</div><div class="stat-value">${allTasks.length} <span>tasks</span></div></div>
    <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value">${done} <span>done</span></div></div>
    <div class="stat-card"><div class="stat-label">Completion</div><div class="stat-value">${completionRate(allTasks)}<span>%</span></div></div>
    <div class="stat-card"><div class="stat-label">Remaining</div><div class="stat-value">${allTasks.length - done} <span>pending</span></div></div>
  `;

  // Build day data
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = dayNames.map((name, i) => {
    const d   = addDays(ws, i);
    const ds  = fmtDate(d);
    const hol = window.holidayForDate ? window.holidayForDate(ds) : null;
    return { name, d, ds, hol, tasks: tasksForDate(ds), events: eventsForDate(ds) };
  });

  const totalH = (CAL_END - CAL_START) * SLOT_H;
  const hours  = Array.from({ length: CAL_END - CAL_START }, (_, i) => CAL_START + i);

  // ---- Day header row ----
  const headerHtml = `
    <div class="wcal-header">
      <div class="wcal-time-gutter"></div>
      ${days.map(({ name, d, ds, hol, tasks }) => {
        const isToday_  = isToday(d);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const doneCnt   = tasks.filter(t => t.done).length;
        const taskBadge = tasks.length
          ? `<span class="wcal-task-badge">${doneCnt}/${tasks.length}</span>`
          : '';
        return `
          <div class="wcal-day-header ${isToday_ ? 'today' : ''} ${isWeekend ? 'weekend' : ''}"
               onclick="jumpToDay('${ds}')">
            <span class="wcal-day-name">${name}</span>
            <span class="wcal-day-num ${isToday_ ? 'today' : ''}">${d.getDate()}</span>
            ${taskBadge}
            ${hol ? `<span class="wcal-hol-badge" style="background:${hol.color}22;color:${hol.color};">🎉 ${hol.name}</span>` : ''}
          </div>`;
      }).join('')}
    </div>`;

  // ---- All-day task pills row ----
  const allDayHtml = `
    <div class="wcal-allday-row">
      <div class="wcal-time-gutter wcal-allday-label">Tasks</div>
      ${days.map(({ ds, tasks, d }) => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const pills = tasks.slice(0, 3).map(t =>
          `<div class="wcal-task-pill" style="${catStyle(t.category)}${t.done ? 'opacity:0.5;text-decoration:line-through;' : ''}">
            ${t.text.length > 18 ? t.text.slice(0, 18) + '…' : t.text}
          </div>`
        ).join('');
        const more = tasks.length > 3
          ? `<div style="font-size:10px;color:var(--text3);">+${tasks.length - 3} more</div>`
          : '';
        return `<div class="wcal-allday-cell ${isWeekend ? 'weekend' : ''}">${pills}${more}</div>`;
      }).join('')}
    </div>`;

  // ---- Time grid ----
  const hourLabelsHtml = hours.map(h => {
    const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    return `<div class="wcal-hour-label" style="height:${SLOT_H}px;">${label}</div>`;
  }).join('');

  // One line per hour + a final bottom border line
  const hourLinesHtml = hours.map(h =>
    `<div class="wcal-hour-line" style="top:${(h - CAL_START) * SLOT_H}px;"></div>`
  ).join('') +
  `<div class="wcal-hour-line" style="top:${totalH}px;"></div>`;

  const dayColumnsHtml = days.map(({ ds, events, d }) => {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const evHtml = events.map(ev => {
      const startMin   = timeToMinutes(ev.start);
      const endMin     = timeToMinutes(ev.end || ev.start);
      const clampStart = Math.max(startMin, CAL_START * 60);
      const clampEnd   = Math.min(endMin > startMin ? endMin : startMin + 30, CAL_END * 60);
      if (clampEnd <= clampStart) return '';

      const top    = ((clampStart - CAL_START * 60) / 60) * SLOT_H;
      const height = Math.max(20, ((clampEnd - clampStart) / 60) * SLOT_H - 2);
      const isTrip = ev.category === 'trip';
      const evStyle = isTrip
        ? `border-left:3px solid ${ev.tripColor};background:${ev.tripColor}18;color:${ev.tripColor};`
        : catEvStyle(ev.category);

      return `
        <div class="wcal-event" style="top:${top}px;height:${height}px;${evStyle}"
             title="${ev.title} (${ev.start}${ev.end ? '–' + ev.end : ''})">
          <div class="wcal-event-title">${ev.title}</div>
          ${height >= 32 ? `<div class="wcal-event-time">${ev.start}${ev.end ? '–' + ev.end : ''}</div>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="wcal-day-col ${isWeekend ? 'weekend' : ''}" onclick="jumpToDay('${ds}')">
        ${evHtml}
      </div>`;
  }).join('');

  // Grid height is exact — scrollable wrapper sits outside
  const gridHtml = `
    <div class="wcal-grid-scroll">
      <div class="wcal-grid" style="height:${totalH + 1}px;">
        <div class="wcal-hour-labels">${hourLabelsHtml}</div>
        <div class="wcal-grid-inner">
          ${hourLinesHtml}
          <div class="wcal-day-cols">${dayColumnsHtml}</div>
        </div>
      </div>
    </div>`;

  document.getElementById('week-grid').innerHTML =
    `<div class="wcal">${headerHtml}${allDayHtml}${gridHtml}</div>`;

  renderTasksList('weekly-tasks-list', allTasks, false);
}
