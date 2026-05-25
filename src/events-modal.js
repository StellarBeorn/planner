// ============================================================
// TIME EVENTS MODAL
// ============================================================
import { state, saveState, selectedDate } from './state.js';
import { uid, fmtDate } from './utils.js';
import { populateCategorySelect, selectedEventTags, renderEventTagChips } from './categories.js';

// ---- Time dropdown helpers ----
export function buildTimeOptions(selectedVal) {
  let html = '';
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const val   = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const ampm  = h < 12 ? 'AM' : 'PM';
      const h12   = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
      html += `<option value="${val}"${val === selectedVal ? ' selected' : ''}>${label}</option>`;
    }
  }
  return html;
}

export function populateTimeSelects(startVal = '09:00', endVal = '10:00') {
  document.getElementById('ev-start').innerHTML = buildTimeOptions(startVal);
  document.getElementById('ev-end').innerHTML   = buildTimeOptions(endVal);
}

// ---- Modal open / close / save / delete ----
export function openTimeModal() {
  document.getElementById('ev-title').value = '';
  populateTimeSelects('09:00', '10:00');
  populateCategorySelect('ev-category', state.categories[0]?.id || 'work');
  // Reset selected tags — write directly to the imported binding
  selectedEventTags.length = 0;
  renderEventTagChips();
  document.getElementById('time-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('ev-title').focus(), 50);
}

export function quickTimeSlot(h) {
  const startVal = `${String(h).padStart(2, '0')}:00`;
  const endVal   = `${String(h + 1 < 24 ? h + 1 : 23).padStart(2, '0')}:00`;
  document.getElementById('ev-title').value = '';
  populateTimeSelects(startVal, endVal);
  populateCategorySelect('ev-category', state.categories[0]?.id || 'work');
  selectedEventTags.length = 0;
  renderEventTagChips();
  document.getElementById('time-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('ev-title').focus(), 50);
}

export function closeTimeModal() {
  document.getElementById('time-modal').classList.add('hidden');
}

export function saveTimeEvent() {
  const title = document.getElementById('ev-title').value.trim();
  if (!title) return;
  state.events.push({
    id:       uid(),
    date:     fmtDate(selectedDate),
    title,
    start:    document.getElementById('ev-start').value,
    end:      document.getElementById('ev-end').value,
    category: document.getElementById('ev-category').value,
    tags:     [...selectedEventTags],
  });
  saveState();
  closeTimeModal();
  // renderDaily is not imported here to avoid a circular dep chain —
  // call renderAll via window so the daily view refreshes.
  window.renderAll?.();
}

export function deleteEvent(id) {
  state.events = state.events.filter(e => e.id !== id);
  saveState();
  window.renderAll?.();
}
