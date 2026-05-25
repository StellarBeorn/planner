// ============================================================
// GYM PROGRESS
// ============================================================
import { state, saveState, currentView } from '../state.js';
import { parseDate } from '../utils.js';

// Index: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
export const GYM_SCHEDULE = ['Push day', 'Rest day', 'Pull day', 'Rest day', 'Legs day', 'Rest day', 'Rest day'];

export function gymLabelForDate(ds) {
  const d   = parseDate(ds);
  const dow = d.getDay();           // 0=Sun … 6=Sat
  const idx = dow === 0 ? 6 : dow - 1; // convert to Mon=0
  return GYM_SCHEDULE[idx];
}

export function isRestDay(label) {
  return label === 'Rest day';
}

export function renderGym(ds) {
  const card = document.getElementById('gym-card');
  const el   = document.getElementById('gym-widget');
  if (!card || !el) return;

  const label   = gymLabelForDate(ds);
  const rest    = isRestDay(label);
  const checked = !rest && !!(state.gym && state.gym[ds]);

  card.classList.toggle('gym-card-done', checked || rest);

  if (rest) {
    el.innerHTML = '<div class="gym-rest-note">Rest day — recover well 💤</div>';
    return;
  }

  el.innerHTML =
    '<div class="gym-check-row ' + (checked ? 'checked' : '') + '" onclick="toggleGym(\'' + ds + '\')">' +
      '<div class="gym-check-box">' + (checked ? '✓' : '') + '</div>' +
      '<span class="gym-check-label">' + label + '</span>' +
      '<span style="font-size:14px;">' + (checked ? '💪' : '') + '</span>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text3);margin-top:8px;">' +
      (checked ? 'Nice work! Marked as complete.' : 'Mark as done when finished.') +
    '</div>';
}

export function toggleGym(ds) {
  if (!state.gym) state.gym = {};
  state.gym[ds] = !state.gym[ds];
  saveState();
  renderGym(ds);
  if (currentView === 'habits') window.renderHabitsView?.();
}
