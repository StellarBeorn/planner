// ============================================================
// ROUTER
// ============================================================
import {
  state,
  currentView, setCurrentView,
  selectedDate, setSelectedDate,
  selectedWeekStart, setSelectedWeekStart,
  selectedMonth, setSelectedMonth,
  habitWeekStart, setHabitWeekStart,
} from './state.js';
import { fmtDate, fmtShort, isToday, getWeekStart, addDays } from './utils.js';

// ---- Sidebar ----
export function renderSidebar() {
  const now = new Date();
  document.getElementById('sidebar-date-label').textContent = fmtDate(now);
  document.getElementById('footer-day').textContent  = now.toLocaleDateString('en-GB', { weekday: 'long' });
  document.getElementById('footer-date').textContent = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---- View switching ----
export function switchView(v) {
  setCurrentView(v);
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  const btn = document.querySelector('[data-view="' + v + '"]');
  if (btn) btn.classList.add('active');
  renderAll();
}

// ---- Navigation shifts ----
export function shiftDay(n) {
  setSelectedDate(addDays(selectedDate, n));
  setHabitWeekStart(getWeekStart(selectedDate));
  // renderDaily is imported lazily to avoid circular deps — renderAll dispatches
  renderAll();
}

export function shiftWeek(n) {
  setSelectedWeekStart(addDays(selectedWeekStart, n * 7));
  renderAll();
}

export function shiftHabitWeek(n) {
  setHabitWeekStart(addDays(habitWeekStart, n * 7));
  renderAll();
}

export function shiftMonth(n) {
  setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + n, 1));
  renderAll();
}

export function goToday() {
  setSelectedDate(new Date());
  setSelectedWeekStart(getWeekStart(new Date()));
  setSelectedMonth(new Date());
  setHabitWeekStart(getWeekStart(new Date()));
  renderAll();
}

// Jump to a specific date (used in weekly view click-through)
export function jumpToDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  setSelectedDate(d);
  switchView('daily');
}

// ---- renderAll stub — real render functions injected by main.js ----
// Each view module registers its render function here at startup.
const _renderers = {};

export function registerRenderer(view, fn) {
  _renderers[view] = fn;
}

export function renderAll() {
  renderSidebar();
  const v = currentView;
  if (_renderers[v]) {
    _renderers[v]();
  }
}
