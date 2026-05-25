// ============================================================
// CATEGORIES & TAGS
// ============================================================
import { state, saveState } from './state.js';
import { renderAll } from './router.js';

export const PRIORITY_CLASS = { high: 'p-high', med: 'p-med', low: 'p-low' };

// ---- Dynamic category helpers ----
export function getCat(id) {
  return state.categories.find(c => c.id === id) || { id, name: id, color: '#9e9892' };
}

export function catStyle(id) {
  const c = getCat(id);
  return `background:${c.color}22; color:${c.color}; border:1px solid ${c.color}44;`;
}

export function catEvStyle(id) {
  const c = getCat(id);
  return `background:${c.color}18; border-left-color:${c.color}; color:${c.color};`;
}

// ---- Category select population ----
export function populateCategorySelect(selectId, selectedVal) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = state.categories.map(c =>
    `<option value="${c.id}"${c.id === selectedVal ? ' selected' : ''}>${c.name}</option>`
  ).join('');
}

// ---- Event tags ----
export let selectedEventTags = [];

export function renderEventTagChips() {
  const wrap = document.getElementById('ev-tags-wrap');
  if (!wrap) return;
  wrap.innerHTML = state.tags.map(t => {
    const on = selectedEventTags.includes(t.id);
    return `<span class="ev-tag-chip${on ? ' selected' : ''}"
      style="background:${t.color}18; color:${t.color}; border-color:${on ? t.color : 'transparent'};"
      onclick="toggleEventTag('${t.id}')">${t.name}</span>`;
  }).join('');
}

export function toggleEventTag(id) {
  if (selectedEventTags.includes(id)) {
    selectedEventTags = selectedEventTags.filter(x => x !== id);
  } else {
    selectedEventTags.push(id);
  }
  renderEventTagChips();
}

// ---- Category manager modal ----
export function openCategoryModal() {
  renderCategoryList();
  renderTagList();
  document.getElementById('cat-modal').classList.remove('hidden');
}

export function closeCategoryModal() {
  document.getElementById('cat-modal').classList.add('hidden');
  renderAll();
}

export function renderCategoryList() {
  const list = document.getElementById('cat-list');
  if (!list) return;
  list.innerHTML = state.categories.map(c => `
    <div class="cat-row">
      <input type="color" value="${c.color}"
        onchange="updateCategoryColor('${c.id}', this.value)"
        style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);padding:1px;cursor:pointer;flex-shrink:0;" />
      <span class="cat-name" contenteditable="true" spellcheck="false"
        onblur="updateCategoryName('${c.id}', this.textContent.trim())"
        style="outline:none;flex:1;border-bottom:1px dashed transparent;cursor:text;"
        onmouseenter="this.style.borderBottomColor='var(--border2)'"
        onmouseleave="this.style.borderBottomColor='transparent'">${c.name}</span>
      <button class="del-btn" style="opacity:1;" onclick="deleteCategory('${c.id}')">×</button>
    </div>
  `).join('');
}

export function addCategory() {
  const name = document.getElementById('cat-name-input').value.trim();
  if (!name) return;
  const color = document.getElementById('cat-color').value;
  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  state.categories.push({ id, name, color });
  saveState();
  document.getElementById('cat-name-input').value = '';
  renderCategoryList();
}

export function updateCategoryName(id, name) {
  if (!name) return;
  const c = state.categories.find(c => c.id === id);
  if (c) { c.name = name; saveState(); }
}

export function updateCategoryColor(id, color) {
  const c = state.categories.find(c => c.id === id);
  if (c) { c.color = color; saveState(); renderCategoryList(); }
}

export function deleteCategory(id) {
  state.categories = state.categories.filter(c => c.id !== id);
  saveState();
  renderCategoryList();
}

// ---- Tag manager ----
export function renderTagList() {
  const list = document.getElementById('tag-list');
  if (!list) return;
  list.innerHTML = state.tags.map(t => `
    <div class="cat-row">
      <input type="color" value="${t.color}"
        onchange="updateTagColor('${t.id}', this.value)"
        style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);padding:1px;cursor:pointer;flex-shrink:0;" />
      <span class="cat-name" contenteditable="true" spellcheck="false"
        onblur="updateTagName('${t.id}', this.textContent.trim())"
        style="outline:none;flex:1;border-bottom:1px dashed transparent;cursor:text;"
        onmouseenter="this.style.borderBottomColor='var(--border2)'"
        onmouseleave="this.style.borderBottomColor='transparent'">${t.name}</span>
      <button class="del-btn" style="opacity:1;" onclick="deleteTag('${t.id}')">×</button>
    </div>
  `).join('');
}

export function addTag() {
  const name = document.getElementById('tag-name-input').value.trim();
  if (!name) return;
  const color = document.getElementById('tag-color').value;
  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  state.tags.push({ id, name, color });
  saveState();
  document.getElementById('tag-name-input').value = '';
  renderTagList();
}

export function updateTagName(id, name) {
  if (!name) return;
  const t = state.tags.find(t => t.id === id);
  if (t) { t.name = name; saveState(); }
}

export function updateTagColor(id, color) {
  const t = state.tags.find(t => t.id === id);
  if (t) { t.color = color; saveState(); renderTagList(); }
}

export function deleteTag(id) {
  state.tags = state.tags.filter(t => t.id !== id);
  // Remove deleted tag from any events that used it
  state.events.forEach(ev => {
    if (ev.tags) ev.tags = ev.tags.filter(tid => tid !== id);
  });
  saveState();
  renderTagList();
}
