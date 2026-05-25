// ============================================================
// BACKUP REMINDER
// Shows a dismissible banner after 30 s if the user hasn't
// been reminded to export their data in the last 14 days.
// ============================================================

const REMINDER_KEY  = 'planner_last_backup_prompt';
const INTERVAL_DAYS = 14;

function shouldRemind() {
  const last = localStorage.getItem(REMINDER_KEY);
  if (!last) return true;
  return (Date.now() - parseInt(last)) / 86400000 >= INTERVAL_DAYS;
}

function injectKeyframes() {
  if (document.getElementById('banner-style')) return;
  const s = document.createElement('style');
  s.id = 'banner-style';
  s.textContent = '@keyframes slideInBanner{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(s);
}

function showBackupBanner() {
  if (document.getElementById('backup-banner')) return;
  injectKeyframes();

  const banner = document.createElement('div');
  banner.id = 'backup-banner';
  banner.style.cssText = [
    'position:fixed', 'bottom:20px', 'right:20px', 'z-index:9999',
    'background:var(--surface)', 'border:1px solid var(--accent)',
    'border-radius:12px', 'padding:14px 18px', 'max-width:320px',
    'box-shadow:0 4px 24px rgba(0,0,0,0.25)', 'font-family:var(--font)',
    'animation:slideInBanner 0.3s ease',
  ].join(';');

  banner.innerHTML =
    '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px;">Time to back up your data</div>' +
    '<div style="font-size:12px;color:var(--text2);margin-bottom:12px;">' +
      'It\'s been a while since your last export. Download a backup so your data is safe.' +
    '</div>' +
    '<div style="display:flex;gap:8px;">' +
      '<button onclick="exportData();dismissBackupBanner(true)"' +
        ' style="flex:1;padding:7px;border-radius:8px;background:var(--accent);color:#000;' +
        'font-size:12px;font-weight:600;border:none;cursor:pointer;">Export now</button>' +
      '<button onclick="dismissBackupBanner(false)"' +
        ' style="padding:7px 12px;border-radius:8px;background:var(--surface2);color:var(--text2);' +
        'font-size:12px;border:1px solid var(--border);cursor:pointer;">Later</button>' +
      '<button onclick="dismissBackupBanner(true)"' +
        ' style="padding:7px 12px;border-radius:8px;background:var(--surface2);color:var(--text2);' +
        'font-size:12px;border:1px solid var(--border);cursor:pointer;">Don\'t remind</button>' +
    '</div>';

  document.body.appendChild(banner);
}

export function dismissBackupBanner(permanent) {
  const banner = document.getElementById('backup-banner');
  if (banner) banner.remove();
  if (permanent) localStorage.setItem(REMINDER_KEY, String(Date.now()));
}

export function initBackupReminder() {
  if (shouldRemind()) {
    setTimeout(showBackupBanner, 30000);
  }
}
