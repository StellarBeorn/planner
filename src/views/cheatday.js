// ============================================================
// CHEAT DAY
// ============================================================
import { state, saveState, currentView } from '../state.js';

export const CHEAT_LIMIT = 4;
export const CHEAT_COLOR = '#e8357a';

export function cheatDaysThisMonth(ds) {
  const [y, m] = ds.split('-');
  return (state.cheatDays || []).filter(d => d.startsWith(y + '-' + m));
}

export function renderCheatDay(ds) {
  const card = document.getElementById('cheat-card');
  const el   = document.getElementById('cheat-widget');
  if (!card || !el) return;

  const cheatDays  = state.cheatDays || [];
  const isChecked  = cheatDays.includes(ds);
  const monthCheat = cheatDaysThisMonth(ds);
  const used       = monthCheat.length;
  const remaining  = CHEAT_LIMIT - used;
  const limitHit   = used >= CHEAT_LIMIT && !isChecked;

  card.classList.toggle('cheat-card-active', isChecked);

  const dots = Array.from({ length: CHEAT_LIMIT }, (_, i) =>
    `<div class="cheat-dot ${i < used ? '' : 'empty'}"></div>`
  ).join('');

  const statusText = isChecked
    ? `🎉 Cheat day marked! ${remaining} remaining this month.`
    : limitHit
      ? `⛔ Limit reached — ${CHEAT_LIMIT} cheat days used this month.`
      : `${remaining} cheat day${remaining !== 1 ? 's' : ''} remaining this month`;

  el.innerHTML =
    `<div class="cheat-check-row ${isChecked ? 'checked' : ''} ${limitHit ? 'disabled' : ''}"
       onclick="${limitHit ? '' : "toggleCheatDay('" + ds + "')"}">` +
      `<div class="cheat-check-box">${isChecked ? '✓' : ''}</div>` +
      `<span class="cheat-check-label">Mark as cheat day</span>` +
      `<span style="font-size:16px;">${isChecked ? '🍕' : ''}</span>` +
    `</div>` +
    `<div class="cheat-dots" style="margin-top:10px;">${dots}` +
      `<span style="font-size:11px;color:var(--text3);margin-left:4px;">${used}/${CHEAT_LIMIT} this month</span>` +
    `</div>` +
    `<div class="cheat-status">${statusText}</div>`;
}

export function toggleCheatDay(ds) {
  if (!state.cheatDays) state.cheatDays = [];
  const idx = state.cheatDays.indexOf(ds);
  if (idx >= 0) {
    state.cheatDays.splice(idx, 1);
  } else {
    const monthUsed = cheatDaysThisMonth(ds).length;
    if (monthUsed >= CHEAT_LIMIT) return;
    state.cheatDays.push(ds);
  }
  saveState();
  renderCheatDay(ds);
  if (currentView === 'monthly') window.renderMonthly?.();
}
