// ============================================================
// DAILY VIEW
// ============================================================
import { state, saveState, selectedDate, currentView } from '../state.js';
import { fmtDate, fmtShort, isToday, parseDate } from '../utils.js';
import { renderAll } from '../router.js';
import { catEvStyle } from '../categories.js';
import { tasksForDate, eventsForDate, completionRate, renderTasksList } from '../tasks.js';

// ---- Location / sun constants ----
export const LOCATION_LAT_KEY  = 'planner_lat';
export const LOCATION_LON_KEY  = 'planner_lon';
export const LOCATION_CITY_KEY = 'planner_city';

export let _userLat = null;
export let _userLon = null;

export function initSunLocation() {
  const savedLat = parseFloat(localStorage.getItem(LOCATION_LAT_KEY));
  const savedLon = parseFloat(localStorage.getItem(LOCATION_LON_KEY));
  if (!isNaN(savedLat) && !isNaN(savedLon)) {
    _userLat = savedLat;
    _userLon = savedLon;
  } else {
    // Default to Vienna
    _userLat = 48.2082;
    _userLon = 16.3738;
  }
  renderTimeBanner();
}

// ---- Sunrise / sunset (Meeus algorithm, no external API) ----
export function getSunTimes(date) {
  const lat = _userLat, lon = _userLon;
  if (lat === null) return null;

  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const dayOfYear = Math.ceil((date - new Date(date.getFullYear(), 0, 1)) / 86400000);
  const n         = dayOfYear;
  const lngHour   = lon / 15;

  function calc(isRise) {
    const t = n + ((isRise ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L   = M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634;
    L = ((L % 360) + 360) % 360;
    let RA  = deg * Math.atan(0.91764 * Math.tan(L * rad));
    RA = ((RA % 360) + 360) % 360;
    const Lquad  = Math.floor(L  / 90) * 90;
    const RAquad = Math.floor(RA / 90) * 90;
    RA = (RA + Lquad - RAquad) / 15;
    const sinDec = 0.39782 * Math.sin(L * rad);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH   = (Math.cos(96 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
    if (cosH > 1 || cosH < -1) return null; // polar day/night
    let H = isRise ? 360 - deg * Math.acos(cosH) : deg * Math.acos(cosH);
    H /= 15;
    const T   = H + RA - 0.06571 * t - 6.622;
    const UT  = ((T - lngHour) % 24 + 24) % 24;
    const offsetHrs = -date.getTimezoneOffset() / 60;
    const local = (UT + offsetHrs + 24) % 24;
    const hh = Math.floor(local);
    const mm = Math.round((local - hh) * 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '00');
  }

  return { rise: calc(true) || '--:--', set: calc(false) || '--:--' };
}

// ---- Settings view ----
export function renderSettings() {
  const lat  = localStorage.getItem(LOCATION_LAT_KEY);
  const lon  = localStorage.getItem(LOCATION_LON_KEY);
  const city = localStorage.getItem(LOCATION_CITY_KEY);
  if (lat)  document.getElementById('settings-lat').value  = lat;
  if (lon)  document.getElementById('settings-lon').value  = lon;
  if (city) document.getElementById('settings-city').value = city;
  const statusEl = document.getElementById('settings-location-status');
  if (statusEl && lat && lon) {
    statusEl.textContent = 'Current location: ' + (city || lat + ', ' + lon);
    statusEl.style.color = 'var(--green)';
  }
}

export async function lookupCity() {
  const city = document.getElementById('settings-city').value.trim();
  if (!city) return;
  const statusEl = document.getElementById('settings-location-status');
  statusEl.textContent = 'Looking up…';
  statusEl.style.color = 'var(--text3)';
  try {
    const res  = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(city));
    const data = await res.json();
    if (!data.length) { statusEl.textContent = 'City not found. Try a different spelling.'; statusEl.style.color = 'var(--red)'; return; }
    const lat = parseFloat(data[0].lat).toFixed(4);
    const lon = parseFloat(data[0].lon).toFixed(4);
    document.getElementById('settings-lat').value = lat;
    document.getElementById('settings-lon').value = lon;
    statusEl.textContent = 'Found: ' + data[0].display_name.split(',').slice(0, 2).join(',') + ' (' + lat + ', ' + lon + ')';
    statusEl.style.color = 'var(--green)';
  } catch (e) {
    statusEl.textContent = 'Lookup failed — check your connection and try again.';
    statusEl.style.color = 'var(--red)';
  }
}

export function saveLocationSettings() {
  const lat  = parseFloat(document.getElementById('settings-lat').value);
  const lon  = parseFloat(document.getElementById('settings-lon').value);
  const city = document.getElementById('settings-city').value.trim();
  if (isNaN(lat) || isNaN(lon)) {
    const s = document.getElementById('settings-location-status');
    s.textContent = 'Please enter valid coordinates.';
    s.style.color = 'var(--red)';
    return;
  }
  localStorage.setItem(LOCATION_LAT_KEY, lat);
  localStorage.setItem(LOCATION_LON_KEY, lon);
  if (city) localStorage.setItem(LOCATION_CITY_KEY, city);
  _userLat = lat;
  _userLon = lon;
  const s = document.getElementById('settings-location-status');
  s.textContent = 'Location saved! Sunrise/sunset updated.';
  s.style.color = 'var(--green)';
  renderTimeBanner();
}

// ---- Time progress banner ----
export function renderTimeBanner() {
  const el = document.getElementById('time-banner');
  if (!el) return;

  const now     = new Date();
  const hh      = String(now.getHours()).padStart(2, '0');
  const mm      = String(now.getMinutes()).padStart(2, '0');
  const timeStr = hh + ':' + mm;

  const daySec  = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const dayPct  = +(daySec / 86400 * 100).toFixed(2);

  const dow     = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekSec = dow * 86400 + daySec;

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfNext = new Date(now.getFullYear() + 1, 0, 1);
  const yearPct     = +((now - startOfYear) / (startOfNext - startOfYear) * 100).toFixed(2);

  const dayOfYear  = Math.ceil((now - startOfYear) / 86400000);
  const daysInYear = Math.ceil((startOfNext - startOfYear) / 86400000);

  const y = now.getFullYear();

  const winterStart1 = new Date(y, 0,  1);
  const winterEnd1   = new Date(y, 2,  20, 23, 59, 59);
  const springStart  = new Date(y, 2,  21);
  const springEnd    = new Date(y, 5,  20, 23, 59, 59);
  const summerStart  = new Date(y, 5,  21);
  const summerEnd    = new Date(y, 8,  20, 23, 59, 59);
  const autumnStart  = new Date(y, 8,  21);
  const autumnEnd    = new Date(y, 11, 20, 23, 59, 59);
  const winterStart2 = new Date(y, 11, 21);
  const winterEnd2   = new Date(y, 11, 31, 23, 59, 59);

  const msPerDay = 86400000;
  const w1Days = Math.round((winterEnd1   - winterStart1) / msPerDay) + 1;
  const spDays = Math.round((springEnd    - springStart)  / msPerDay) + 1;
  const suDays = Math.round((summerEnd    - summerStart)  / msPerDay) + 1;
  const auDays = Math.round((autumnEnd    - autumnStart)  / msPerDay) + 1;
  const w2Days = Math.round((winterEnd2   - winterStart2) / msPerDay) + 1;
  const wDays  = w1Days + w2Days;

  function segPct(start, end) {
    if (now < start) return 0;
    if (now > end)   return 100;
    return +((now - start) / (end - start) * 100).toFixed(1);
  }

  const w1Pct     = segPct(winterStart1, winterEnd1);
  const w2Pct     = segPct(winterStart2, winterEnd2);
  const winterPct = +((w1Pct / 100 * w1Days + w2Pct / 100 * w2Days) / wDays * 100).toFixed(1);
  const springPct = segPct(springStart, springEnd);
  const summerPct = segPct(summerStart, summerEnd);
  const autumnPct = segPct(autumnStart, autumnEnd);

  const currentSeasonName =
    now >= winterStart2                    ? 'Winter' :
    now >= autumnStart && now <= autumnEnd ? 'Autumn' :
    now >= summerStart && now <= summerEnd ? 'Summer' :
    now >= springStart && now <= springEnd ? 'Spring' : 'Winter';

  const displaySeasons = [
    { name: 'Winter', color: '#5e81f4', pct: w1Pct,    range: 'Jan 1–Mar 20',  days: w1Days },
    { name: 'Spring', color: '#5aaa6e', pct: springPct, range: 'Mar 21–Jun 20', days: spDays },
    { name: 'Summer', color: '#e8a020', pct: summerPct, range: 'Jun 21–Sep 20', days: suDays },
    { name: 'Autumn', color: '#c97b3a', pct: autumnPct, range: 'Sep 21–Dec 20', days: auDays },
    { name: 'Winter', color: '#5e81f4', pct: w2Pct,    range: 'Dec 21–Dec 31', days: w2Days },
  ];

  const totalDays = w1Days + spDays + suDays + auDays + w2Days;

  const unifiedSegments = displaySeasons.map((s, i) => {
    const filled  = Math.min(100, s.pct);
    const isFirst = i === 0;
    const isLast  = i === displaySeasons.length - 1;
    const rL = isFirst ? '99px' : '0';
    const rR = isLast  ? '99px' : '0';
    return `<div style="flex:${s.days};position:relative;height:8px;background:var(--surface2);border-radius:${rL} ${rR} ${rR} ${rL};overflow:hidden;">` +
      `<div style="position:absolute;inset:0;width:${filled}%;background:${s.color};transition:width 0.4s ease;"></div>` +
    `</div>`;
  }).join('');

  const labelRow = displaySeasons.map(s => {
    const isCur = s.name === currentSeasonName &&
      ((s.range.startsWith('Jan') && now <= winterEnd1) ||
       (s.range.startsWith('Dec') && now >= winterStart2) ||
       (!s.range.startsWith('Jan') && !s.range.startsWith('Dec') && s.name === currentSeasonName));
    return `<div style="flex:${s.days};display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0;overflow:hidden;">` +
      `<span style="font-size:8px;font-weight:${isCur ? '700' : '500'};color:${isCur ? s.color : 'var(--text3)'};white-space:nowrap;">${s.name}</span>` +
      `<span style="font-size:7px;color:var(--text3);opacity:0.65;white-space:nowrap;">${s.range}</span>` +
    `</div>`;
  }).join('');

  const yearRowHtml =
    '<div class="tbanner-row">' +
      '<span class="tbanner-label">Year</span>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;gap:1px;border-radius:99px;overflow:hidden;height:8px;">' + unifiedSegments + '</div>' +
        '<div style="display:flex;gap:0;margin-top:5px;">' + labelRow + '</div>' +
        '<div style="text-align:center;font-size:10px;font-weight:500;color:var(--text3);margin-top:4px;">Day ' + dayOfYear + ' of ' + daysInYear + '</div>' +
      '</div>' +
    '</div>';

  // 24-hour day bar
  const currentHour = now.getHours();
  const currentMin  = now.getMinutes();

  const hourSegs = Array.from({ length: 24 }, (_, h) => {
    const isFirst = h === 0, isLast = h === 23;
    const rL = isFirst ? '99px' : '0', rR = isLast ? '99px' : '0';
    let bg;
    if (h < currentHour) {
      bg = '#5e81f4';
    } else if (h === currentHour) {
      const minPct = Math.round(currentMin / 60 * 100);
      return '<div style="flex:1;height:8px;position:relative;background:var(--surface2);border-radius:' + rL + ' ' + rR + ' ' + rR + ' ' + rL + ';overflow:hidden;">' +
        '<div style="position:absolute;inset:0;width:' + minPct + '%;background:#5e81f4;"></div>' +
        '</div>';
    } else {
      bg = 'var(--surface2)';
    }
    return '<div style="flex:1;height:8px;background:' + bg + ';border-radius:' + rL + ' ' + rR + ' ' + rR + ' ' + rL + ';"></div>';
  }).join('<div style="width:1px;background:var(--bg);flex-shrink:0;"></div>');

  const hourLabels = Array.from({ length: 24 }, (_, h) =>
    '<div style="flex:1;text-align:' + (h === 0 ? 'left' : h === 23 ? 'right' : 'center') + ';font-size:8px;color:var(--text3);">' +
    ([0, 6, 12, 18, 23].includes(h) ? (h === 0 ? '12am' : h < 12 ? h + 'am' : h === 12 ? '12pm' : (h - 12) + 'pm') : '') +
    '</div>'
  ).join('');

  const dayRowHtml =
    '<div class="tbanner-row">' +
      '<span class="tbanner-label">Day</span>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;gap:1px;height:8px;border-radius:99px;overflow:hidden;">' + hourSegs + '</div>' +
        '<div style="display:flex;margin-top:3px;">' + hourLabels + '</div>' +
      '</div>' +
    '</div>';

  // 7-day week bar
  const todayDow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weekSegs = Array.from({ length: 7 }, (_, d) => {
    const isFirst = d === 0, isLast = d === 6;
    const rL = isFirst ? '99px' : '0', rR = isLast ? '99px' : '0';
    let bg;
    if (d < todayDow) {
      bg = '#5e81f4';
    } else if (d === todayDow) {
      const dayFrac = Math.round(dayPct);
      return '<div style="flex:1;height:8px;position:relative;background:var(--surface2);border-radius:' + rL + ' ' + rR + ' ' + rR + ' ' + rL + ';overflow:hidden;">' +
        '<div style="position:absolute;inset:0;width:' + dayFrac + '%;background:#5e81f4;"></div>' +
        '</div>';
    } else {
      bg = 'var(--surface2)';
    }
    return '<div style="flex:1;height:8px;background:' + bg + ';border-radius:' + rL + ' ' + rR + ' ' + rR + ' ' + rL + ';"></div>';
  }).join('<div style="width:1px;background:var(--bg);flex-shrink:0;"></div>');

  const weekDayLabels = dayNames.map((name, d) => {
    const isToday_ = d === todayDow;
    return '<div style="flex:1;text-align:center;font-size:8px;font-weight:' + (isToday_ ? '700' : '400') + ';color:' +
      (isToday_ ? '#5e81f4' : 'var(--text3)') + ';">' + name + '</div>';
  }).join('');

  const weekRowHtml =
    '<div class="tbanner-row">' +
      '<span class="tbanner-label">Week</span>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;gap:1px;height:8px;border-radius:99px;overflow:hidden;">' + weekSegs + '</div>' +
        '<div style="display:flex;margin-top:3px;">' + weekDayLabels + '</div>' +
      '</div>' +
    '</div>';

  const barsHtml  = dayRowHtml + weekRowHtml + yearRowHtml;
  const dateStr   = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const sunTimes  = getSunTimes(now);
  const sunHtml   = sunTimes
    ? '<div style="font-size:11px;color:var(--text3);margin-top:5px;display:flex;gap:10px;">' +
        '<span title="Sunrise">&#9728; ' + sunTimes.rise + '</span>' +
        '<span title="Sunset">&#9790; ' + sunTimes.set  + '</span>' +
      '</div>'
    : '<div style="font-size:10px;color:var(--text3);margin-top:5px;">Allow location for sunrise/sunset</div>';

  el.innerHTML =
    '<div class="tbanner-bar-group">' + barsHtml + '</div>' +
    '<div class="tbanner-meta">' +
      '<div class="tbanner-time">' + timeStr + '</div>' +
      '<div class="tbanner-date-str">' + dateStr + '</div>' +
      sunHtml +
    '</div>';
}

// Tick every minute
setInterval(() => { renderTimeBanner(); renderWorldClock(); }, 60000);

// ---- World clock ----
export const WORLD_CITIES = [
  { label: 'San Francisco', tz: 'America/Los_Angeles' },
  { label: 'New York',      tz: 'America/New_York'    },
  { label: 'London',        tz: 'Europe/London'        },
  { label: 'Izmir',         tz: 'Europe/Istanbul'      },
  { label: 'Tokyo',         tz: 'Asia/Tokyo'           },
];

export function renderWorldClock() {
  const el = document.getElementById('world-clock');
  if (!el) return;
  const now = new Date();

  function cityDateParts(tz) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now);
    const get = t => parts.find(p => p.type === t).value;
    return { y: +get('year'), m: +get('month'), d: +get('day') };
  }

  const local = cityDateParts(Intl.DateTimeFormat().resolvedOptions().timeZone);

  el.innerHTML = WORLD_CITIES.map(c => {
    const timeStr = now.toLocaleTimeString('en-GB', {
      timeZone: c.tz, hour: '2-digit', minute: '2-digit', hour12: false
    });

    const city        = cityDateParts(c.tz);
    const localDayNum = new Date(local.y, local.m - 1, local.d).getTime();
    const cityDayNum  = new Date(city.y,  city.m  - 1, city.d).getTime();
    const diffDays    = Math.round((cityDayNum - localDayNum) / 86400000);

    const dayTag = diffDays === 0 ? '' :
      `<span style="font-size:9px;font-weight:700;margin-left:3px;padding:1px 4px;border-radius:4px;` +
      (diffDays > 0
        ? `background:var(--accent-light);color:var(--accent-text);">+${diffDays}</span>`
        : `background:var(--surface2);color:var(--text3);">${diffDays}</span>`);

    return `<div style="display:flex;flex-direction:column;gap:1px;">
      <span style="font-size:10px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:var(--text3);">${c.label}</span>
      <span style="font-size:14px;font-weight:500;color:var(--text);font-variant-numeric:tabular-nums;">${timeStr}${dayTag}</span>
    </div>`;
  }).join('<div style="width:1px;background:var(--border);align-self:stretch;margin:2px 0;"></div>');
}

// ---- Time grid ----
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const GRID_START = 0;
const GRID_END   = 24;
const SLOT_H     = 56;

function renderTimeGrid(ds) {
  const grid  = document.getElementById('time-grid');
  const hours = [];
  for (let h = GRID_START; h < GRID_END; h++) hours.push(h);

  const events = eventsForDate(ds).sort((a, b) => a.start.localeCompare(b.start));
  const totalH = (GRID_END - GRID_START) * SLOT_H;

  const labelsHtml = hours.map(h => {
    const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    return `<div class="time-label">${label}</div>`;
  }).join('');

  const rowsHtml = hours.map(h =>
    `<div class="time-row" onclick="quickTimeSlot(${h})"></div>`
  ).join('');

  const eventsHtml = events.map(ev => {
    const startMin    = timeToMinutes(ev.start);
    const endMin      = timeToMinutes(ev.end || ev.start.replace(/:\d+$/, ':00').replace(/^(\d+)/, m => String(+m + 1).padStart(2, '0')));
    const clampedStart = Math.max(startMin, GRID_START * 60);
    const clampedEnd   = Math.min(endMin,   GRID_END   * 60);
    if (clampedEnd <= clampedStart) return '';

    const top       = ((clampedStart - GRID_START * 60) / 60) * SLOT_H;
    const height    = Math.max(24, ((clampedEnd - clampedStart) / 60) * SLOT_H - 2);
    const isTrip    = ev.category === 'trip';
    const evStyle   = isTrip
      ? `border-left:3px solid ${ev.tripColor};background:${ev.tripColor}18;color:${ev.tripColor};`
      : catEvStyle(ev.category);
    const showTime  = height >= 36;
    const showTitle = height >= 20;
    const showTags  = height >= 48 && ev.tags && ev.tags.length;
    const tagsHtml  = showTags
      ? (ev.tags || []).map(tid => {
          const tg = state.tags.find(t => t.id === tid);
          if (!tg) return '';
          return `<span class="event-tag-pill" style="background:${tg.color}22;color:${tg.color};">${tg.name}</span>`;
        }).join('')
      : '';

    return `
      <div class="time-event"
           style="top:${top}px; height:${height}px; ${evStyle}"
           title="${ev.title} (${ev.start}${ev.end ? '–' + ev.end : ''})">
        ${showTitle ? `<div class="time-event-title">${ev.title}</div>` : ''}
        ${showTime  ? `<div class="time-event-time">${ev.start}${ev.end ? ' – ' + ev.end : ''}</div>` : ''}
        ${tagsHtml  ? `<div style="margin-top:3px;">${tagsHtml}</div>` : ''}
        ${isTrip ? '' : `<button class="ev-del" onclick="deleteEvent('${ev.id}')">×</button>`}
      </div>
    `;
  }).join('');

  grid.innerHTML = `
    <div class="time-grid-outer">
      <div class="time-labels-col">${labelsHtml}</div>
      <div class="time-canvas" style="height:${totalH}px;">
        ${rowsHtml}
        ${eventsHtml}
      </div>
    </div>
  `;
}

// ---- Main daily render ----
export function renderDaily() {
  const ds = fmtDate(selectedDate);

  document.getElementById('daily-dow').textContent =
    selectedDate.toLocaleDateString('en-GB', { weekday: 'long' });
  document.getElementById('daily-subtitle').textContent =
    selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('daily-nav-label').textContent =
    isToday(selectedDate) ? 'Today' : fmtShort(selectedDate);

  // Day-type badge
  const dayTypEl  = document.getElementById('daily-day-type');
  const hol       = window.holidayForDate ? window.holidayForDate(ds) : null;
  const dow       = selectedDate.getDay();
  const isWeekend = dow === 0 || dow === 6;
  if (hol) {
    dayTypEl.textContent = hol.nativeName
      ? '🎉 Holiday — ' + hol.name + ' (' + hol.nativeName + ')'
      : '🎉 Holiday — ' + hol.name;
    dayTypEl.style.background = hol.color + '22';
    dayTypEl.style.color      = hol.color;
  } else if (isWeekend) {
    dayTypEl.textContent      = 'Weekend';
    dayTypEl.style.background = 'var(--surface2)';
    dayTypEl.style.color      = 'var(--text3)';
  } else {
    dayTypEl.textContent      = 'Weekday';
    dayTypEl.style.background = 'var(--blue-light)';
    dayTypEl.style.color      = 'var(--blue)';
  }

  const tasks = tasksForDate(ds);
  const done  = tasks.filter(t => t.done).length;

  renderTimeBanner();
  renderWorldClock();

  document.getElementById('daily-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Tasks</div>
      <div class="stat-value">${tasks.length} <span>total</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Completed</div>
      <div class="stat-value">${done} <span>done</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Progress</div>
      <div class="stat-value">${completionRate(tasks)}<span>%</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Events</div>
      <div class="stat-value">${eventsForDate(ds).filter(e => !e.readOnly).length} <span>scheduled</span></div>
    </div>
  `;

  renderTimeGrid(ds);
  renderTasksList('daily-tasks-list', tasks, true);

  // Delegate to widget modules registered on window
  window.renderWater?.(ds);
  window.renderGym?.(ds);
  window.renderCheatDay?.(ds);
  window.renderDeadlinesMini?.();
  renderDailyBirthdays(ds);
  renderDailyHolidays(ds);
  renderDailyHistorical(ds);

  requestAnimationFrame(() => {
    const rightCol = document.querySelector('#view-daily .grid-right-col');
    const grid     = document.getElementById('time-grid');
    if (rightCol && grid) {
      const rightH   = rightCol.getBoundingClientRect().height;
      const cardPad  = 48;
      grid.style.maxHeight = Math.max(400, rightH - cardPad) + 'px';
    }
  });

  window.renderGoalsMini?.();
}

// ---- Daily birthdays widget ----
function renderDailyBirthdays(ds) {
  const el = document.getElementById('daily-birthdays-list');
  if (!el) return;
  const [, mStr, dStr] = ds.split('-');
  const m = parseInt(mStr), d = parseInt(dStr);
  const thisYear = new Date().getFullYear();

  const hits = (state.specialEvents || []).filter(ev => {
    if (ev.type !== 'birthday') return false;
    const evM = ev.m;
    const evD = ev.d;
    return evM === m && evD === d;
  });

  const card = document.getElementById('daily-birthdays-card');
  if (card) card.style.display = hits.length ? '' : 'none';
  if (!hits.length) { el.innerHTML = ''; return; }

  el.innerHTML = hits.map(ev => {
    const age = ev.y ? (thisYear - ev.y) : null;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:22px;">🎂</span>
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--text);">${ev.name}</div>
        ${age ? `<div style="font-size:12px;color:var(--text3);">Turns ${age} today</div>` : ''}
        ${ev.notes ? `<div style="font-size:12px;color:var(--text3);">${ev.notes}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ---- Daily holidays widget ----
function renderDailyHolidays(ds) {
  const el = document.getElementById('daily-holidays-list');
  if (!el) return;

  // Collect holidays from all countries for today
  const year = parseInt(ds.split('-')[0]);
  const hits = [];
  (state.holidays || []).forEach(h => {
    const resolved = window.resolveHolidayDate ? window.resolveHolidayDate(h, year) : null;
    if (!resolved) return;
    let matches = false;
    if (h.multiDay && h.dateEnd && h.dateType === 'fixed') {
      let start = resolved, end = h.dateEnd;
      if (h.recur === 'yearly') {
        const [, sm, sd] = h.date.split('-');
        const [, em, ed] = h.dateEnd.split('-');
        start = year + '-' + sm + '-' + sd;
        end   = year + '-' + em + '-' + ed;
      }
      matches = ds >= start && ds <= end;
    } else {
      matches = resolved === ds;
    }
    if (matches) hits.push(h);
  });

  const card = document.getElementById('daily-holidays-card');
  if (card) card.style.display = hits.length ? '' : 'none';
  if (!hits.length) { el.innerHTML = ''; return; }

  const { HOL_TYPE_LABELS, HOL_TYPE_COLORS } = window;

  el.innerHTML = hits.map(h => {
    const typeLabel = HOL_TYPE_LABELS && h.holType ? HOL_TYPE_LABELS[h.holType] : null;
    const typeColor = HOL_TYPE_COLORS && h.holType ? HOL_TYPE_COLORS[h.holType] : h.color;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
      <div style="width:10px;height:10px;border-radius:50%;background:${h.color};flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:600;color:var(--text);">${h.name}
          ${h.nativeName ? `<span style="font-size:12px;font-weight:400;color:var(--text3);">· ${h.nativeName}</span>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:3px;">
          ${typeLabel ? `<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:99px;background:${typeColor};color:#333;">${typeLabel}</span>` : ''}
          <span style="font-size:11px;color:var(--text3);">${h.country ? h.country.toUpperCase() : ''}</span>
        </div>
        ${h.notes ? `<div style="font-size:12px;color:var(--text3);margin-top:2px;">${h.notes}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ---- Daily historical events widget ----
function renderDailyHistorical(ds) {
  const el = document.getElementById('daily-historical-list');
  if (!el) return;
  const [yStr, mStr, dStr] = ds.split('-');
  const m = parseInt(mStr), d = parseInt(dStr);
  const thisYear = parseInt(yStr);

  const hits = (state.specialEvents || []).filter(ev => {
    if (ev.type !== 'historical') return false;
    if (!ev.multiDay || !ev.m2 || !ev.d2) {
      // Single day — match by month and day only (any year)
      return ev.m === m && ev.d === d;
    }
    // Multi-day — build date strings using the event's original year for comparison
    const evYear   = ev.y || thisYear;
    const startDs  = evYear + '-' + String(ev.m).padStart(2,'0') + '-' + String(ev.d).padStart(2,'0');
    // End date may be a different year (e.g. event spanning Dec→Jan)
    const endYear  = ev.y2 || (ev.m2 < ev.m ? evYear + 1 : evYear);
    const endDs    = endYear + '-' + String(ev.m2).padStart(2,'0') + '-' + String(ev.d2).padStart(2,'0');
    // Compare day-of-year using month/day only (ignore year)
    const todayMD  = mStr + '-' + dStr;
    const startMD  = String(ev.m).padStart(2,'0') + '-' + String(ev.d).padStart(2,'0');
    const endMD    = String(ev.m2).padStart(2,'0') + '-' + String(ev.d2).padStart(2,'0');
    if (startMD <= endMD) {
      return todayMD >= startMD && todayMD <= endMD;
    } else {
      // Spans year boundary (e.g. Dec–Jan)
      return todayMD >= startMD || todayMD <= endMD;
    }
  });

  const card = document.getElementById('daily-historical-card');
  if (card) card.style.display = hits.length ? '' : 'none';
  if (!hits.length) { el.innerHTML = ''; return; }

  el.innerHTML = hits.map(ev => {
    const yearStr  = ev.y ? String(ev.y) : '';
    const yearsAgo = ev.y ? (thisYear - ev.y) : null;
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
      <div style="width:3px;border-radius:99px;align-self:stretch;min-height:36px;background:${ev.color || 'var(--blue)'};flex-shrink:0;"></div>
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--text);">${ev.name}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px;">
          ${yearStr ? yearStr + (yearsAgo ? ` · ${yearsAgo} years ago` : '') : ''}
          ${ev.partOf ? ` · ${ev.partOf}` : ''}
        </div>
        ${ev.notes ? `<div style="font-size:12px;color:var(--text3);">${ev.notes}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}
