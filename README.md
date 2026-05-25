# Planner

A personal planning app with daily, weekly, and monthly views, habits, goals, deadlines, recurring tasks, holidays, travel, and events — built as a Vite project deployable on GitHub Pages.

---

## Local development

```bash
npm install
npm run dev
```

Then open [http://localhost:5173/planner/](http://localhost:5173/planner/) in your browser.

> The `base` path in `vite.config.js` is set to `/planner/`. If you rename your GitHub repo, update this value to match.

---

## Build

```bash
npm run build
```

The production build is written to `dist/`.

---

## Deploy to GitHub Pages

Push to the `main` branch — the included GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys automatically.

Your app will be live at:

```
https://yourusername.github.io/planner/
```

**One-time setup:**

1. Go to your repository on GitHub
2. Navigate to **Settings → Pages**
3. Under **Source**, select **GitHub Actions**
4. Push a commit to `main` — the workflow will run and deploy

---

## Data

All data is stored in your browser's `localStorage` under the key `planner_v3`. Nothing is sent to a server unless you use the optional **GitHub Gist sync** feature.

### Export / Import

Use the **Export data** button in the sidebar to download a JSON backup. Use **Import data** to restore from a backup file.

### GitHub Gist sync

1. Go to [github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Generate a new token with only the `gist` scope
3. Paste the token into **GitHub sync** in the sidebar
4. Click **Push** to save your data to a private Gist, or **Pull** to restore from one

---

## Project structure

```
planner/
├── index.html                  ← App shell + all modal HTML
├── vite.config.js
├── package.json
├── public/
│   └── sw.js                   ← Service worker (font caching)
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Pages deployment
└── src/
    ├── main.js                 ← Entry point: imports, boot sequence
    ├── state.js                ← App state + localStorage persistence
    ├── utils.js                ← Date helpers, uid
    ├── router.js               ← View switching, renderAll dispatch
    ├── theme.js                ← Light / dark mode
    ├── sync.js                 ← Export, import, GitHub Gist sync
    ├── categories.js           ← Categories + tags CRUD
    ├── tasks.js                ← Task data helpers + modal
    ├── events-modal.js         ← Scheduled event (time-grid) modal
    ├── backup-reminder.js      ← Periodic export nudge banner
    ├── styles/
    │   ├── base.css            ← Reset, CSS variables, dark theme
    │   ├── layout.css          ← Shell, sidebar, main, nav
    │   ├── components.css      ← Cards, buttons, modals, forms
    │   └── views.css           ← View-specific styles
    └── views/
        ├── daily.js            ← Daily planner, time grid, banner, world clock, settings
        ├── weekly.js           ← Weekly overview
        ├── monthly.js          ← Monthly calendar
        ├── habits.js           ← Habit tracker
        ├── water.js            ← Water intake widget
        ├── gym.js              ← Gym progress widget
        ├── cheatday.js         ← Cheat day tracker
        ├── goals.js            ← Goals + progress
        ├── deadlines.js        ← Deadlines + countdown
        ├── recurring.js        ← Recurring tasks
        ├── holidays.js         ← Public holidays (AT / TR / US)
        ├── travel.js           ← Trip planner
        └── special-events.js   ← Birthdays, anniversaries, historical events
```

---

## Customisation

- **Location for sunrise/sunset** — set your city in **Settings** in the sidebar
- **Gym schedule** — edit `GYM_SCHEDULE` in `src/views/gym.js`
- **World clock cities** — edit `WORLD_CITIES` in `src/views/daily.js`
- **Cheat day limit** — edit `CHEAT_LIMIT` in `src/views/cheatday.js`
- **Vite base path** — update `base` in `vite.config.js` to match your repo name
