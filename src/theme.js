// ============================================================
// THEME
// ============================================================

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('planner_theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-icon').textContent  = isDark ? '☾' : '☀️';
  document.getElementById('theme-label').textContent = isDark ? 'Dark mode' : 'Light mode';
}

export function initTheme() {
  const saved = localStorage.getItem('planner_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = saved ? saved === 'dark' : prefersDark;
  if (useDark) {
    document.documentElement.classList.add('dark');
    const icon  = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (icon)  icon.textContent  = '☾';
    if (label) label.textContent = 'Dark mode';
  }
}
