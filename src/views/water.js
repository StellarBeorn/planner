// ============================================================
// WATER TRACKING
// ============================================================
import { state, saveState, currentView } from '../state.js';

export function renderWater(ds) {
  const checks  = state.water[ds] || [false, false, false];
  const filled  = checks.filter(Boolean).length;
  const allDone = filled === 3;
  const card    = document.getElementById('water-card');
  if (!card) return;

  card.classList.toggle('water-card-done', allDone);

  const segs = [0, 1, 2].map(i =>
    `<div class="water-bar-seg ${i < filled ? 'filled' : ''}"></div>`
  ).join('');

  const checkRows = [0, 1, 2].map(i => {
    const checked = checks[i];
    return `
      <div class="water-check-row ${checked ? 'checked' : ''}" onclick="toggleWater('${ds}', ${i})">
        <div class="water-check-box">${checked ? '✓' : ''}</div>
        <span class="water-check-label">1 liter</span>
        <span class="water-icon">${checked ? '💧' : ''}</span>
      </div>`;
  }).join('');

  const statusText = allDone
    ? 'Daily goal reached!'
    : filled === 0
      ? '3 liters to go'
      : `${filled} / 3 liters — ${3 - filled} more to go`;

  document.getElementById('water-widget').innerHTML = `
    <div class="water-bar-track">${segs}</div>
    <div class="water-checks">${checkRows}</div>
    <div class="water-status ${allDone ? 'done' : ''}">${statusText}</div>
  `;
}

export function toggleWater(ds, index) {
  if (!state.water[ds]) state.water[ds] = [false, false, false];
  state.water[ds][index] = !state.water[ds][index];
  saveState();
  renderWater(ds);
  if (currentView === 'habits') window.renderHabitsView?.();
}
