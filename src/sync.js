// ============================================================
// EXPORT / IMPORT
// ============================================================
import { state, setState, saveState } from './state.js';
import { fmtDate } from './utils.js';
import { renderAll } from './router.js';

export function exportData() {
  const json    = JSON.stringify(state, null, 2);
  const b64     = btoa(unescape(encodeURIComponent(json)));
  const dataUri = 'data:application/json;base64,' + b64;
  const a       = document.createElement('a');
  a.href        = dataUri;
  a.download    = 'planner-data-' + fmtDate(new Date()) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Invalid format');
      setState({
        tasks:          imported.tasks          || [],
        events:         imported.events         || [],
        goals:          imported.goals          || [],
        water:          imported.water          || {},
        gym:            imported.gym            || {},
        cheatDays:      imported.cheatDays      || [],
        trips:          imported.trips          || [],
        specialEvents:  imported.specialEvents  || [],
        deadlines:      imported.deadlines      || [],
        recurringTasks: imported.recurringTasks || [],
        holidays:       imported.holidays       || [],
        habits:         (imported.habits && imported.habits.length)
                          ? imported.habits
                          : [{ id: 'water', name: 'Drink 3L water', icon: '💧', color: '#3a5c7c' }],
        habitLog:       imported.habitLog       || {},
        categories:     (imported.categories && imported.categories.length) ? imported.categories : state.categories,
        tags:           (imported.tags      && imported.tags.length)        ? imported.tags        : state.tags,
      });
      saveState();
      renderAll();
      // Brief confirmation in the sidebar
      const btn = document.querySelector('[onclick="document.getElementById(\'import-file\').click()"]');
      if (btn) {
        const orig = btn.querySelector('span').textContent;
        btn.querySelector('span').textContent = '✓ Imported!';
        setTimeout(() => { btn.querySelector('span').textContent = orig; }, 2500);
      }
    } catch (err) {
      alert('Import failed — the file doesn\'t appear to be valid planner data.\n\n' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ============================================================
// GITHUB GIST SYNC
// ============================================================
export const GH_TOKEN_KEY  = 'planner_gh_token';
export const GH_GIST_KEY   = 'planner_gh_gist_id';
export const GH_SYNC_KEY   = 'planner_gh_last_sync';
export const GIST_FILENAME = 'planner-data.json';

export function openGitHubSync() {
  document.getElementById('gh-token').value   = localStorage.getItem(GH_TOKEN_KEY) || '';
  document.getElementById('gh-gist-id').value = localStorage.getItem(GH_GIST_KEY)  || '';
  document.getElementById('gh-status').textContent = '';
  const lastSync = localStorage.getItem(GH_SYNC_KEY);
  if (lastSync) {
    const d = new Date(parseInt(lastSync));
    document.getElementById('gh-status').textContent =
      'Last synced: ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  document.getElementById('github-modal').classList.remove('hidden');
}

export function closeGitHubSync() {
  document.getElementById('github-modal').classList.add('hidden');
}

export function toggleGhTokenVisibility() {
  const input = document.getElementById('gh-token');
  const btn   = document.getElementById('gh-token-eye');
  if (input.type === 'password') { input.type = 'text';     btn.textContent = 'Hide'; }
  else                           { input.type = 'password'; btn.textContent = 'Show'; }
}

export function saveGhSettings() {
  const token  = document.getElementById('gh-token').value.trim();
  const gistId = document.getElementById('gh-gist-id').value.trim();
  if (token)  localStorage.setItem(GH_TOKEN_KEY, token);
  if (gistId) localStorage.setItem(GH_GIST_KEY, gistId);
  ghStatus('Settings saved.', 'var(--green)');
}

function ghStatus(msg, color) {
  const el = document.getElementById('gh-status');
  if (el) { el.textContent = msg; el.style.color = color || 'var(--text3)'; }
}

function ghSetLoading(loading) {
  const push = document.getElementById('gh-push-btn');
  const pull = document.getElementById('gh-pull-btn');
  if (push) push.disabled = loading;
  if (pull) pull.disabled = loading;
}

export async function githubPush() {
  const token = localStorage.getItem(GH_TOKEN_KEY) || document.getElementById('gh-token').value.trim();
  if (!token) { ghStatus('Please enter your GitHub token first.', 'var(--red)'); return; }

  const inputToken  = document.getElementById('gh-token').value.trim();
  const inputGistId = document.getElementById('gh-gist-id').value.trim();
  if (inputToken)  localStorage.setItem(GH_TOKEN_KEY, inputToken);
  if (inputGistId) localStorage.setItem(GH_GIST_KEY, inputGistId);

  ghSetLoading(true);
  ghStatus('Pushing to GitHub…', 'var(--text3)');

  const json    = JSON.stringify(state, null, 2);
  const payload = {
    description: 'Planner data — synced ' + new Date().toISOString(),
    public: false,
    files: { [GIST_FILENAME]: { content: json } }
  };

  const gistId = localStorage.getItem(GH_GIST_KEY);
  const url    = gistId
    ? 'https://api.github.com/gists/' + gistId
    : 'https://api.github.com/gists';
  const method = gistId ? 'PATCH' : 'POST';

  try {
    const res  = await fetch(url, {
      method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + (await res.text()).slice(0, 120));
    const data = await res.json();
    localStorage.setItem(GH_GIST_KEY, data.id);
    localStorage.setItem(GH_SYNC_KEY, String(Date.now()));
    document.getElementById('gh-gist-id').value = data.id;
    ghStatus(
      'Pushed successfully at ' +
      new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) +
      ' · Gist: ' + data.id,
      'var(--green)'
    );
  } catch (e) {
    ghStatus('Push failed: ' + e.message, 'var(--red)');
  } finally {
    ghSetLoading(false);
  }
}

export async function githubPull() {
  const token  = localStorage.getItem(GH_TOKEN_KEY) || document.getElementById('gh-token').value.trim();
  const gistId = localStorage.getItem(GH_GIST_KEY)  || document.getElementById('gh-gist-id').value.trim();
  if (!token)  { ghStatus('Please enter your GitHub token first.', 'var(--red)'); return; }
  if (!gistId) { ghStatus('No Gist ID found — push first, or enter an existing Gist ID.', 'var(--red)'); return; }

  ghSetLoading(true);
  ghStatus('Pulling from GitHub…', 'var(--text3)');

  try {
    const res  = await fetch('https://api.github.com/gists/' + gistId, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data    = await res.json();
    const file    = data.files[GIST_FILENAME];
    if (!file) throw new Error('Planner data file not found in this Gist.');
    const imported = JSON.parse(file.content);
    if (typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Invalid data format.');
    setState({
      tasks:          imported.tasks          || [],
      events:         imported.events         || [],
      goals:          imported.goals          || [],
      water:          imported.water          || {},
      gym:            imported.gym            || {},
      cheatDays:      imported.cheatDays      || [],
      trips:          imported.trips          || [],
      specialEvents:  imported.specialEvents  || [],
      deadlines:      imported.deadlines      || [],
      recurringTasks: imported.recurringTasks || [],
      holidays:       imported.holidays       || [],
      habits:         (imported.habits && imported.habits.length) ? imported.habits : state.habits,
      habitLog:       imported.habitLog       || {},
      categories:     (imported.categories && imported.categories.length) ? imported.categories : state.categories,
      tags:           (imported.tags && imported.tags.length)             ? imported.tags        : state.tags,
    });
    saveState();
    renderAll();
    localStorage.setItem(GH_SYNC_KEY, String(Date.now()));
    ghStatus('Pulled successfully — data updated.', 'var(--green)');
  } catch (e) {
    ghStatus('Pull failed: ' + e.message, 'var(--red)');
  } finally {
    ghSetLoading(false);
  }
}
