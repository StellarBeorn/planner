// ============================================================
// STATE
// ============================================================
export const STORAGE_KEY = 'planner_v3';

export function loadState() {
  const defaultHabits = [
    { id: 'water', name: 'Drink 3L water', icon: '💧', color: '#3a5c7c' },
  ];
  const defaultCats = [
    { id: 'work',     name: 'Work',     color: '#3a5c7c' },
    { id: 'personal', name: 'Personal', color: '#6b4a8a' },
    { id: 'health',   name: 'Health',   color: '#3a7c5a' },
    { id: 'other',    name: 'Other',    color: '#9e9892' },
  ];
  const defaultTags = [
    { id: 'urgent', name: 'Urgent', color: '#c94a3a' },
    { id: 'focus',  name: 'Focus',  color: '#c97b3a' },
    { id: 'errand', name: 'Errand', color: '#6b4a8a' },
    { id: 'call',   name: 'Call',   color: '#3a5c7c' },
  ];

  // Try migrating from old key
  let raw = localStorage.getItem('planner_v3') || localStorage.getItem('planner_v2');
  try {
    const p = raw ? JSON.parse(raw) : {};
    let habits = (p.habits && p.habits.length) ? p.habits : defaultHabits;
    // Always ensure water habit exists, then deduplicate by id
    if (!habits.find(h => h.id === 'water')) {
      habits = [defaultHabits[0], ...habits];
    }
    // Remove any duplicates (same id) — keep first occurrence
    habits = habits.filter((h, idx) => habits.findIndex(x => x.id === h.id) === idx);
    return {
      tasks:          p.tasks          || [],
      events:         p.events         || [],
      goals:          p.goals          || [],
      water:          p.water          || {},
      gym:            p.gym            || {},
      cheatDays:      p.cheatDays      || [],
      trips:          p.trips          || [],
      specialEvents:  p.specialEvents  || [],
      deadlines:      p.deadlines      || [],
      recurringTasks: p.recurringTasks || [],
      holidays:       p.holidays       || [],
      categories: (p.categories && p.categories.length) ? p.categories : defaultCats,
      tags:       (p.tags       && p.tags.length)       ? p.tags       : defaultTags,
      habits,
      habitLog:   p.habitLog || {},
    };
  } catch {
    return {
      tasks: [], events: [], goals: [], water: {}, gym: {}, cheatDays: [],
      trips: [], specialEvents: [], deadlines: [], recurringTasks: [], holidays: [],
      categories: defaultCats, tags: defaultTags,
      habits: defaultHabits, habitLog: {}
    };
  }
}

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export let state = loadState();

// ---- Mutable view state ----
export let currentView        = 'daily';
export let selectedDate       = new Date();
export let selectedWeekStart  = null; // set after utils are loaded
export let selectedMonth      = new Date();
export let selectedMonthDay   = null;
export let habitWeekStart     = null; // set after utils are loaded
export let pendingTaskContext = 'daily';
export let editingGoalId      = null;

// Setters (modules mutate these via setters so ES module bindings stay live)
export function setCurrentView(v)        { currentView        = v; }
export function setSelectedDate(d)       { selectedDate       = d; }
export function setSelectedWeekStart(d)  { selectedWeekStart  = d; }
export function setSelectedMonth(d)      { selectedMonth      = d; }
export function setSelectedMonthDay(d)   { selectedMonthDay   = d; }
export function setHabitWeekStart(d)     { habitWeekStart     = d; }
export function setPendingTaskContext(v) { pendingTaskContext  = v; }
export function setEditingGoalId(id)     { editingGoalId      = id; }
export function setState(s)              { state              = s; }
