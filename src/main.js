// ============================================================
// ENTRY POINT
// ============================================================
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/views.css';

// ---- Core ----
import { setSelectedWeekStart, setHabitWeekStart } from './state.js';
import { getWeekStart } from './utils.js';
import {
  switchView, shiftDay, shiftWeek, shiftMonth, shiftHabitWeek,
  goToday, jumpToDay, renderAll, registerRenderer,
} from './router.js';
import { initTheme, toggleTheme }   from './theme.js';
import { initBackupReminder, dismissBackupBanner } from './backup-reminder.js';

// ---- Feature modules ----
import {
  exportData, importData,
  openGitHubSync, closeGitHubSync, toggleGhTokenVisibility,
  saveGhSettings, githubPush, githubPull,
} from './sync.js';

import {
  openCategoryModal, closeCategoryModal,
  addCategory, updateCategoryName, updateCategoryColor, deleteCategory,
  addTag, updateTagName, updateTagColor, deleteTag, toggleEventTag,
} from './categories.js';

import {
  tasksForDate, eventsForDate, completionRate,
  renderTasksList, renderTaskProgressBar,
  toggleTask, deleteTask,
  openTaskModal, closeTaskModal, saveTask, toggleRecurOptions,
} from './tasks.js';

import {
  openTimeModal, closeTimeModal, saveTimeEvent, deleteEvent,
  quickTimeSlot, buildTimeOptions, populateTimeSelects,
} from './events-modal.js';

// ---- Views ----
import {
  renderRecurring, recurDescription, isRecurringActiveOn,
  toggleRecurTask, deleteRecurringTask,
} from './views/recurring.js';

import {
  renderDaily, renderTimeBanner, renderWorldClock,
  getSunTimes, initSunLocation, renderSettings,
  lookupCity, saveLocationSettings,
} from './views/daily.js';

import { renderWater, toggleWater }                           from './views/water.js';
import { renderGym, toggleGym, gymLabelForDate, isRestDay }   from './views/gym.js';
import { renderCheatDay, toggleCheatDay, cheatDaysThisMonth } from './views/cheatday.js';
import { renderWeekly }                                       from './views/weekly.js';
import {
  renderMonthly, selectMonthDay, renderMonthDayDetail, countActiveDays,
} from './views/monthly.js';

import {
  renderHabitsView, renderDailyHabits,
  habitDone, habitStreak, habitMonthStats, getHabitAchievement,
  toggleHabit, openHabitModal, closeHabitModal, saveHabit, deleteHabit,
} from './views/habits.js';

import {
  renderGoals, renderGoalsMini, nudgeGoal, toggleGoalHistory,
  openGoalModal, closeGoalModal, saveGoal, deleteGoal,
  addGoalItem, deleteGoalItem,
  openGoalUpdateModal, closeGoalUpdateModal, saveGoalProgress,
} from './views/goals.js';

import {
  renderDeadlines, renderDeadlinesMini,
  openDeadlineModal, closeDeadlineModal, saveDeadline,
  toggleDeadlineDone, deleteDeadline,
  formatCountdown, deadlineTimestamp,
} from './views/deadlines.js';

import {
  renderHolidays, renderHolidaysForCountry, holidayForDate,
  resolveHolidayDate, getHolidaysByCountry,
  openHolidayModal, closeHolidayModal, saveHoliday, deleteHoliday,
  updateHolDateType, toggleHolMultiday, formatSEDate,
} from './views/holidays.js';

import {
  renderTravel, tripStatus, tripCountdown,
  openTripModal, closeTripModal, saveTrip, deleteTrip,
  addTripLeg, addLodgingLeg, removeTripLeg,
} from './views/travel.js';

import {
  renderSpecialEvents, parseSEDate,
  openSpecialEventModal, closeSpecialEventModal, saveSpecialEvent, deleteSpecialEvent,
  openHistoricalModal, closeHistoricalModal, saveHistoricalEvent,
  toggleHEMultiday,
} from './views/special-events.js';

// ============================================================
// BOOT SEQUENCE
// ============================================================

// 1. Initialize date/week state (requires utils to be loaded first)
setSelectedWeekStart(getWeekStart(new Date()));
setHabitWeekStart(getWeekStart(new Date()));

// 2. Register every view renderer
registerRenderer('daily',                renderDaily);
registerRenderer('settings',             renderSettings);
registerRenderer('recurring',            renderRecurring);
registerRenderer('weekly',               renderWeekly);
registerRenderer('monthly',              renderMonthly);
registerRenderer('habits',               renderHabitsView);
registerRenderer('goals',                renderGoals);
registerRenderer('deadlines',            renderDeadlines);
registerRenderer('travel',               renderTravel);
registerRenderer('holidays-at',     () => renderHolidaysForCountry('at'));
registerRenderer('holidays-tr',     () => renderHolidaysForCountry('tr'));
registerRenderer('holidays-us',     () => renderHolidaysForCountry('us'));
registerRenderer('events-birthdays',     () => renderSpecialEvents('birthday'));
registerRenderer('events-anniversaries', () => renderSpecialEvents('anniversary'));
registerRenderer('events-historical',    () => renderSpecialEvents('historical'));

// 3. Register service worker (font caching, offline shell)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ============================================================
// KEYBOARD & MODAL INTERACTION
// ============================================================

// Escape closes any open modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeTaskModal();        closeTimeModal();
    closeGoalModal();        closeGoalUpdateModal();
    closeCategoryModal();    closeHabitModal();
    closeDeadlineModal();    closeHolidayModal();
    closeTripModal();        closeSpecialEventModal();
    closeHistoricalModal();  closeGitHubSync();
  }
  // Enter confirms the frontmost open modal
  if (e.key === 'Enter' && !e.shiftKey) {
    if      (!document.getElementById('task-modal').classList.contains('hidden'))             saveTask();
    else if (!document.getElementById('time-modal').classList.contains('hidden'))             saveTimeEvent();
    else if (!document.getElementById('goal-modal').classList.contains('hidden'))             saveGoal();
    else if (!document.getElementById('goal-update-modal').classList.contains('hidden'))      saveGoalProgress();
    else if (!document.getElementById('deadline-modal').classList.contains('hidden'))         saveDeadline();
  }
});

// Click on the backdrop closes the modal
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target !== overlay) return;
    closeTaskModal();        closeTimeModal();
    closeGoalModal();        closeGoalUpdateModal();
    closeCategoryModal();    closeHabitModal();
    closeDeadlineModal();    closeHolidayModal();
    closeTripModal();        closeSpecialEventModal();
    closeHistoricalModal();  closeGitHubSync();
  });
});

// Enter in category/tag add inputs
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cat-name-input')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') addCategory(); });
  document.getElementById('tag-name-input')
    ?.addEventListener('keydown',  e => { if (e.key === 'Enter') addTag(); });
});

// ============================================================
// GLOBAL FUNCTION REGISTRY
// All functions referenced by inline onclick="" handlers in
// index.html must be on window. ES module scope is not global.
// ============================================================
Object.assign(window, {
  // Router
  switchView, shiftDay, shiftWeek, shiftMonth, shiftHabitWeek,
  goToday, jumpToDay, renderAll,

  // Theme
  toggleTheme,

  // Backup reminder
  dismissBackupBanner,

  // Sync
  exportData, importData,
  openGitHubSync, closeGitHubSync, toggleGhTokenVisibility,
  saveGhSettings, githubPush, githubPull,

  // Categories & tags
  openCategoryModal, closeCategoryModal,
  addCategory, updateCategoryName, updateCategoryColor, deleteCategory,
  addTag, updateTagName, updateTagColor, deleteTag, toggleEventTag,

  // Tasks
  tasksForDate, eventsForDate, completionRate,
  renderTasksList, renderTaskProgressBar,
  toggleTask, deleteTask,
  openTaskModal, closeTaskModal, saveTask, toggleRecurOptions,

  // Scheduled events (time grid)
  openTimeModal, closeTimeModal, saveTimeEvent, deleteEvent,
  quickTimeSlot, buildTimeOptions, populateTimeSelects,

  // Recurring tasks
  renderRecurring, recurDescription, isRecurringActiveOn,
  toggleRecurTask, deleteRecurringTask,

  // Daily view + widgets
  renderDaily, renderTimeBanner, renderWorldClock,
  getSunTimes, initSunLocation, renderSettings,
  lookupCity, saveLocationSettings,
  renderWater, toggleWater,
  renderGym, toggleGym, gymLabelForDate, isRestDay,
  renderCheatDay, toggleCheatDay, cheatDaysThisMonth,

  // Weekly / Monthly
  renderWeekly,
  renderMonthly, selectMonthDay, renderMonthDayDetail, countActiveDays,

  // Habits
  renderHabitsView, renderDailyHabits,
  habitDone, habitStreak, habitMonthStats, getHabitAchievement,
  toggleHabit, openHabitModal, closeHabitModal, saveHabit, deleteHabit,

  // Goals
  renderGoals, renderGoalsMini, nudgeGoal, toggleGoalHistory,
  openGoalModal, closeGoalModal, saveGoal, deleteGoal,
  addGoalItem, deleteGoalItem,
  openGoalUpdateModal, closeGoalUpdateModal, saveGoalProgress,

  // Deadlines
  renderDeadlines, renderDeadlinesMini,
  openDeadlineModal, closeDeadlineModal, saveDeadline,
  toggleDeadlineDone, deleteDeadline, formatCountdown, deadlineTimestamp,

  // Holidays
  renderHolidays, renderHolidaysForCountry, holidayForDate,
  resolveHolidayDate, getHolidaysByCountry,
  openHolidayModal, closeHolidayModal, saveHoliday, deleteHoliday,
  updateHolDateType, toggleHolMultiday, formatSEDate,

  // Travel
  renderTravel, tripStatus, tripCountdown,
  openTripModal, closeTripModal, saveTrip, deleteTrip,
  addTripLeg, addLodgingLeg, removeTripLeg,

  // Special events (birthdays, anniversaries, historical)
  renderSpecialEvents, parseSEDate,
  openSpecialEventModal, closeSpecialEventModal, saveSpecialEvent, deleteSpecialEvent,
  openHistoricalModal, closeHistoricalModal, saveHistoricalEvent,
  toggleHEMultiday,
});

// ============================================================
// START
// ============================================================
initTheme();         // apply saved or system colour scheme
initSunLocation();   // load saved lat/lon for sunrise/sunset
initBackupReminder(); // schedule the export nudge (30 s delay)
renderAll();         // paint the initial view
