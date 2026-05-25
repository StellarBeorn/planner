// ============================================================
// TRAVEL VIEW
// ============================================================
import { state, saveState, currentView } from '../state.js';
import { uid, fmtDate, parseDate, addDays } from '../utils.js';

// ---- Constants ----
export const TRANSPORT_ICONS = {
  plane: 'Plane', train: 'Train', bus: 'Bus', car: 'Car', ferry: 'Ferry', other: 'Other',
};

export const TZ_LIST = [
  { label: 'GMT-12:00',                    value: 'Etc/GMT+12' },
  { label: 'GMT-11:00',                    value: 'Etc/GMT+11' },
  { label: 'GMT-10:00 — Hawaii',           value: 'Pacific/Honolulu' },
  { label: 'GMT-09:00 — Alaska',           value: 'America/Anchorage' },
  { label: 'GMT-08:00 — Los Angeles',      value: 'America/Los_Angeles' },
  { label: 'GMT-07:00 — Denver',           value: 'America/Denver' },
  { label: 'GMT-06:00 — Chicago',          value: 'America/Chicago' },
  { label: 'GMT-05:00 — New York',         value: 'America/New_York' },
  { label: 'GMT-04:00 — Halifax',          value: 'America/Halifax' },
  { label: 'GMT-03:00 — Sao Paulo',        value: 'America/Sao_Paulo' },
  { label: 'GMT-02:00',                    value: 'Etc/GMT+2' },
  { label: 'GMT-01:00 — Azores',           value: 'Atlantic/Azores' },
  { label: 'GMT+00:00 — London / Lisbon',  value: 'Europe/London' },
  { label: 'GMT+01:00 — Vienna / Paris',   value: 'Europe/Vienna' },
  { label: 'GMT+02:00 — Cairo / Athens',   value: 'Africa/Cairo' },
  { label: 'GMT+03:00 — Istanbul / Moscow',value: 'Europe/Istanbul' },
  { label: 'GMT+04:00 — Dubai',            value: 'Asia/Dubai' },
  { label: 'GMT+05:00 — Karachi',          value: 'Asia/Karachi' },
  { label: 'GMT+05:30 — Mumbai / Delhi',   value: 'Asia/Kolkata' },
  { label: 'GMT+06:00 — Dhaka',            value: 'Asia/Dhaka' },
  { label: 'GMT+07:00 — Bangkok',          value: 'Asia/Bangkok' },
  { label: 'GMT+08:00 — Singapore / Beijing', value: 'Asia/Singapore' },
  { label: 'GMT+09:00 — Tokyo / Seoul',    value: 'Asia/Tokyo' },
  { label: 'GMT+10:00 — Sydney',           value: 'Australia/Sydney' },
  { label: 'GMT+11:00 — Noumea',           value: 'Pacific/Noumea' },
  { label: 'GMT+12:00 — Auckland',         value: 'Pacific/Auckland' },
];

// ---- Helpers ----
export function tripStatus(trip) {
  const now = fmtDate(new Date());
  if (trip.end < now)    return 'past';
  if (trip.start <= now) return 'ongoing';
  return 'upcoming';
}

export function tripCountdown(trip) {
  const now           = new Date();
  const departureStr  = trip.start + (trip.departTime ? 'T' + trip.departTime : 'T00:00:00');
  const departure     = new Date(departureStr);
  const returnDate    = new Date(trip.end + 'T23:59:59');
  const status        = tripStatus(trip);

  if (status === 'past') return { label: 'Trip ended', detail: '', cls: 'past' };

  if (status === 'ongoing') {
    const ms = returnDate - now;
    const d  = Math.floor(ms / 86400000);
    const h  = Math.floor((ms % 86400000) / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    const s  = Math.floor((ms % 60000) / 1000);
    return {
      label:  'Ongoing — returns in',
      detail: `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`,
      cls:    'ongoing',
    };
  }

  const ms = departure - now;
  const d  = Math.floor(ms / 86400000);
  const h  = Math.floor((ms % 86400000) / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  return {
    label:  'Departs in',
    detail: `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`,
    cls:    'upcoming',
  };
}

function tzOptions(selected) {
  return '<option value="">— Select timezone —</option>' +
    TZ_LIST.map(tz =>
      '<option value="' + tz.value + '"' + (selected === tz.value ? ' selected' : '') + '>' +
      tz.label + '</option>'
    ).join('');
}

function timeSelects(cls, val) {
  const h     = val ? val.split(':')[0] : '';
  const m     = val ? val.split(':')[1] : '';
  const hours = Array.from({ length: 24 }, (_, i) => i)
    .map(i => '<option value="' + String(i).padStart(2,'0') + '"' +
      (h === String(i).padStart(2,'0') ? ' selected' : '') + '>' +
      String(i).padStart(2,'0') + '</option>').join('');
  const mins  = ['00','05','10','15','20','25','30','35','40','45','50','55']
    .map(mm => '<option value="' + mm + '"' + (m === mm ? ' selected' : '') + '>' + mm + '</option>').join('');
  return '<div style="display:flex;gap:4px;align-items:center;">' +
    '<select class="' + cls + '-h" style="flex:1;font-family:var(--font);font-size:13px;padding:7px 6px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);outline:none;">' +
      hours + '</select>' +
    '<span style="font-weight:600;color:var(--text3);">:</span>' +
    '<select class="' + cls + '-m" style="flex:1;font-family:var(--font);font-size:13px;padding:7px 6px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);outline:none;">' +
      mins + '</select>' +
  '</div>';
}

// ---- Drag-and-drop leg reordering ----
function initLegDrag(div) {
  div.setAttribute('draggable', 'true');
  div.addEventListener('dragstart', e => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', div.id);
    setTimeout(() => div.classList.add('dragging'), 0);
  });
  div.addEventListener('dragend', () => {
    div.classList.remove('dragging');
    document.querySelectorAll('.trip-leg.drag-over').forEach(el => el.classList.remove('drag-over'));
  });
  div.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.trip-leg.drag-over').forEach(el => el.classList.remove('drag-over'));
    div.classList.add('drag-over');
  });
  div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
  div.addEventListener('drop', e => {
    e.preventDefault();
    div.classList.remove('drag-over');
    const draggedId  = e.dataTransfer.getData('text/plain');
    const dragged    = document.getElementById(draggedId);
    if (!dragged || dragged === div) return;
    const container  = document.getElementById('trip-legs-container');
    const allLegs    = [...container.querySelectorAll('.trip-leg')];
    const fromIdx    = allLegs.indexOf(dragged);
    const toIdx      = allLegs.indexOf(div);
    container.insertBefore(dragged, fromIdx < toIdx ? div.nextSibling : div);
  });
}

// ---- Leg count (module-level, reset on each modal open) ----
let tripLegCount = 0;

// ---- Add transport leg ----
export function addTripLeg(leg) {
  tripLegCount++;
  const idx = tripLegCount;
  const c   = document.getElementById('trip-legs-container');
  if (!c) return;
  const l   = leg || {};
  const div = document.createElement('div');
  div.className = 'trip-leg';
  div.id = 'leg-' + idx;
  div.innerHTML =
    '<div class="trip-leg-header">' +
      '<span class="drag-handle" title="Drag to reorder">⠿</span>' +
      '<span class="trip-leg-num">Leg ' + idx + '</span>' +
      '<button class="del-btn" style="opacity:1;" onclick="removeTripLeg(\'leg-' + idx + '\')" type="button">×</button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
      '<div class="trip-leg-row"><label>Mode of transport</label>' +
        '<select class="leg-transport">' +
          '<option value="plane"'  + (l.transport==='plane'  ? ' selected' : '') + '>Plane</option>' +
          '<option value="train"'  + (l.transport==='train'  ? ' selected' : '') + '>Train</option>' +
          '<option value="bus"'    + (l.transport==='bus'    ? ' selected' : '') + '>Bus</option>' +
          '<option value="car"'    + (l.transport==='car'    ? ' selected' : '') + '>Car</option>' +
          '<option value="ferry"'  + (l.transport==='ferry'  ? ' selected' : '') + '>Ferry</option>' +
          '<option value="other"'  + (l.transport==='other'  ? ' selected' : '') + '>Other</option>' +
        '</select></div>' +
      '<div class="trip-leg-row"><label>Operator</label>' +
        '<input type="text" class="leg-operator" placeholder="e.g. Austrian Airlines, Railjet…" value="' + (l.operator||'') + '" /></div>' +
      '<div class="trip-leg-row" style="grid-column:1/-1;"><label>Transport number</label>' +
        '<input type="text" class="leg-number" placeholder="e.g. OS 123, EC 86, TK 1751…" value="' + (l.number||'') + '" /></div>' +
    '</div>' +
    '<div class="trip-leg-divider">Departure</div>' +
    '<div class="trip-leg-grid">' +
      '<div class="trip-leg-row"><label>Location / Station / Airport</label>' +
        '<input type="text" class="leg-dep-loc" placeholder="e.g. Vienna Airport, Wien Hbf…" value="' + (l.depLoc||'') + '" /></div>' +
      '<div class="trip-leg-row"><label>City</label>' +
        '<input type="text" class="leg-dep-city" placeholder="e.g. Vienna" value="' + (l.depCity||'') + '" /></div>' +
      '<div class="trip-leg-row"><label>Date</label>' +
        '<input type="date" class="leg-dep-date" value="' + (l.depDate||'') + '" oninput="autoFillArrDate(this,\'leg-' + idx + '\')" /></div>' +
      '<div class="trip-leg-row"><label>Time (24h)</label>' + timeSelects('leg-dep-time', l.depTime||'') + '</div>' +
      '<div class="trip-leg-row" style="grid-column:1/-1;"><label>Timezone</label>' +
        '<select class="leg-dep-tz" style="font-size:12px;font-family:var(--font);padding:7px 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);outline:none;width:100%;">' +
          tzOptions(l.depTz||'') + '</select></div>' +
    '</div>' +
    '<div class="trip-leg-divider">Arrival</div>' +
    '<div class="trip-leg-grid">' +
      '<div class="trip-leg-row"><label>Location / Station / Airport</label>' +
        '<input type="text" class="leg-arr-loc" placeholder="e.g. Rome Fiumicino, Roma Termini…" value="' + (l.arrLoc||'') + '" /></div>' +
      '<div class="trip-leg-row"><label>City</label>' +
        '<input type="text" class="leg-arr-city" placeholder="e.g. Rome" value="' + (l.arrCity||'') + '" /></div>' +
      '<div class="trip-leg-row"><label>Date</label>' +
        '<input type="date" class="leg-arr-date" id="leg-' + idx + '-arr-date" value="' + (l.arrDate||'') + '" /></div>' +
      '<div class="trip-leg-row"><label>Time (24h)</label>' + timeSelects('leg-arr-time', l.arrTime||'') + '</div>' +
      '<div class="trip-leg-row" style="grid-column:1/-1;"><label>Timezone</label>' +
        '<select class="leg-arr-tz" style="font-size:12px;font-family:var(--font);padding:7px 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);outline:none;width:100%;">' +
          tzOptions(l.arrTz||'') + '</select></div>' +
    '</div>';
  c.appendChild(div);
  initLegDrag(div);
}

// Auto-fill arrival date from departure date if empty
window.autoFillArrDate = function (depDateInput, legId) {
  const arrDate = document.getElementById(legId + '-arr-date');
  if (arrDate && !arrDate.value) arrDate.value = depDateInput.value;
};

// ---- Lodging helpers ----
window.toggleLodgeResidency = function (legId) {
  const div   = document.getElementById(legId);
  if (!div) return;
  const idx   = legId.replace('leg-', '');
  const isRes = div.querySelector('.lodge-residency').checked;
  const inWrap  = document.getElementById('lodge-in-time-wrap-'  + idx);
  const outWrap = document.getElementById('lodge-out-time-wrap-' + idx);
  if (inWrap)  inWrap.style.display  = isRes ? 'none' : '';
  if (outWrap) outWrap.style.display = isRes ? 'none' : '';
};

window.toggleNightResidency = function (legId, hasIn, hasOut) {
  const div   = document.getElementById(legId);
  if (!div) return;
  const idx   = legId.replace('leg-', '');
  const isRes = div.querySelector('.lodge-residency').checked;
  if (hasIn)  { const el = document.getElementById('night-in-time-wrap-'  + idx); if (el) el.style.display = isRes ? 'none' : ''; }
  if (hasOut) { const el = document.getElementById('night-out-time-wrap-' + idx); if (el) el.style.display = isRes ? 'none' : ''; }
};

window.splitLodgingIntoNights = function (legId) {
  const div     = document.getElementById(legId);
  if (!div) return;
  const name    = div.querySelector('.lodge-name').value.trim();
  const addr    = div.querySelector('.lodge-addr').value.trim();
  const inDate  = div.querySelector('.lodge-in-date').value;
  const outDate = div.querySelector('.lodge-out-date').value;
  const ref     = div.querySelector('.lodge-ref').value.trim();
  const notes   = div.querySelector('.lodge-notes').value.trim();
  const residency = div.querySelector('.lodge-residency') ? div.querySelector('.lodge-residency').checked : false;

  if (!inDate || !outDate || outDate <= inDate) {
    alert('Please set a valid check-in and check-out date (check-out must be after check-in).');
    return;
  }
  const nights = Math.round((parseDate(outDate) - parseDate(inDate)) / 86400000);
  div.remove();
  for (let i = 0; i < nights; i++) {
    renderSingleNight({
      name, addr, ref, residency,
      _nightOf:     fmtDate(addDays(parseDate(inDate), i)),
      _nightNum:    i + 1,
      _totalNights: nights,
      inDate:       fmtDate(addDays(parseDate(inDate), i)),
      outDate:      fmtDate(addDays(parseDate(inDate), i + 1)),
      isFirst:      i === 0,
      isLast:       i === nights - 1,
      notes:        i === 0 ? notes : '',
    });
  }
};

function renderSingleNight(l) {
  tripLegCount++;
  const idx        = tripLegCount;
  const c          = document.getElementById('trip-legs-container');
  if (!c) return;
  const hasNums    = l._nightNum && l._totalNights;
  const nightLabel = hasNums ? 'Night ' + l._nightNum + ' of ' + l._totalNights : 'Night';
  const dateLabel  = l.inDate ? parseDate(l.inDate).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }) : '';
  const showIn     = l.isFirst  === true || (hasNums && l._nightNum === 1);
  const showOut    = l.isLast   === true || (hasNums && l._nightNum === l._totalNights);

  const div = document.createElement('div');
  div.className = 'trip-leg';
  div.id = 'leg-' + idx;
  div.style.borderLeft = '3px solid var(--purple)';
  div.innerHTML =
    '<div class="trip-leg-header">' +
      '<span class="drag-handle" title="Drag to reorder">⠿</span>' +
      '<span class="trip-leg-num" style="color:var(--purple);">' + nightLabel + (dateLabel ? ' · ' + dateLabel : '') + '</span>' +
      '<button class="del-btn" style="opacity:1;" onclick="removeTripLeg(\'leg-' + idx + '\')" type="button">×</button>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
      '<input type="checkbox" class="lodge-residency" id="night-res-' + idx + '"' + (l.residency ? ' checked' : '') +
        ' onchange="toggleNightResidency(\'leg-' + idx + '\', ' + showIn + ', ' + showOut + ')"' +
        ' style="width:15px;height:15px;cursor:pointer;accent-color:var(--purple);" />' +
      '<label for="night-res-' + idx + '" style="font-size:13px;font-weight:500;color:var(--text);cursor:pointer;margin:0;">Residency (own home / long-term stay)</label>' +
    '</div>' +
    '<div class="trip-leg-grid">' +
      '<div class="trip-leg-row"><label>Hotel / Property</label>' +
        '<input type="text" class="lodge-name" value="' + (l.name||'') + '" /></div>' +
      '<div class="trip-leg-row"><label>City / Address</label>' +
        '<input type="text" class="lodge-addr" value="' + (l.addr||'') + '" /></div>' +
      '<div class="trip-leg-row"><label>Date</label>' +
        '<input type="date" class="lodge-in-date" value="' + (l.inDate||'') + '" /></div>' +
      (showIn  ? '<div class="trip-leg-row lodge-time-wrap" id="night-in-time-wrap-'  + idx + '"' + (l.residency ? ' style="display:none;"' : '') + '><label>Check-in time</label>'  + timeSelects('lodge-in-time-'  + idx, l.inTime||'')  + '</div>' : '') +
      (showOut ? '<div class="trip-leg-row lodge-time-wrap" id="night-out-time-wrap-' + idx + '"' + (l.residency ? ' style="display:none;"' : '') + '><label>Check-out time</label>' + timeSelects('lodge-out-time-' + idx, l.outTime||'') + '</div>' : '') +
      '<div class="trip-leg-row" style="grid-column:1/-1;"><label>Notes for this night</label>' +
        '<input type="text" class="lodge-notes" placeholder="e.g. Day trip to Florence, dinner at…" value="' + (l.notes||'') + '" /></div>' +
    '</div>' +
    '<input type="hidden" class="lodge-out-date"     value="' + (l.outDate      || '') + '" />' +
    '<input type="hidden" class="lodge-ref"          value="' + (l.ref          || '') + '" />' +
    '<input type="hidden" class="lodge-night-num"    value="' + (l._nightNum    || '') + '" />' +
    '<input type="hidden" class="lodge-total-nights" value="' + (l._totalNights || '') + '" />' +
    '<input type="hidden" class="lodge-is-first"     value="' + (showIn  ? '1' : '0') + '" />' +
    '<input type="hidden" class="lodge-is-last"      value="' + (showOut ? '1' : '0') + '" />';
  c.appendChild(div);
  initLegDrag(div);
}

export function addLodgingLeg(lodging) {
  const c = document.getElementById('trip-legs-container');
  if (!c) return;
  const l = lodging || {};

  // Pre-saved single-night entry — render directly
  if (l._nightOf) { renderSingleNight(l); return; }

  tripLegCount++;
  const idx = tripLegCount;
  const div = document.createElement('div');
  div.className = 'trip-leg';
  div.id = 'leg-' + idx;
  div.style.borderLeft = '3px solid var(--purple)';
  div.innerHTML =
    '<div class="trip-leg-header">' +
      '<span class="drag-handle" title="Drag to reorder">⠿</span>' +
      '<span class="trip-leg-num" style="color:var(--purple);">Lodging</span>' +
      '<button class="del-btn" style="opacity:1;" onclick="removeTripLeg(\'leg-' + idx + '\')" type="button">×</button>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
      '<input type="checkbox" class="lodge-residency" id="lodge-res-' + idx + '"' + (l.residency ? ' checked' : '') +
        ' onchange="toggleLodgeResidency(\'leg-' + idx + '\')"' +
        ' style="width:15px;height:15px;cursor:pointer;accent-color:var(--purple);" />' +
      '<label for="lodge-res-' + idx + '" style="font-size:13px;font-weight:500;color:var(--text);cursor:pointer;margin:0;">Residency (own home / long-term stay)</label>' +
    '</div>' +
    '<div class="trip-leg-grid" style="margin-bottom:8px;">' +
      '<div class="trip-leg-row"><label>Hotel / Property name</label>' +
        '<input type="text" class="lodge-name" placeholder="e.g. Hotel Vienna Grand…" value="' + (l.name||'') + '" /></div>' +
      '<div class="trip-leg-row"><label>Address / City</label>' +
        '<input type="text" class="lodge-addr" placeholder="e.g. Vienna, Austria" value="' + (l.addr||'') + '" /></div>' +
      '<div class="trip-leg-row"><label>Check-in date</label>' +
        '<input type="date" class="lodge-in-date" id="lodge-in-' + idx + '" value="' + (l.inDate||'') + '" /></div>' +
      '<div class="trip-leg-row lodge-time-wrap" id="lodge-in-time-wrap-' + idx + '"' + (l.residency ? ' style="display:none;"' : '') + '><label>Check-in time</label>' +
        timeSelects('lodge-in-time-' + idx, l.inTime||'') + '</div>' +
      '<div class="trip-leg-row"><label>Check-out date</label>' +
        '<input type="date" class="lodge-out-date" id="lodge-out-' + idx + '" value="' + (l.outDate||'') + '" /></div>' +
      '<div class="trip-leg-row lodge-time-wrap" id="lodge-out-time-wrap-' + idx + '"' + (l.residency ? ' style="display:none;"' : '') + '><label>Check-out time</label>' +
        timeSelects('lodge-out-time-' + idx, l.outTime||'') + '</div>' +
    '</div>' +
    '<div class="trip-leg-grid">' +
      '<div class="trip-leg-row"><label>Booking reference (optional)</label>' +
        '<input type="text" class="lodge-ref" placeholder="e.g. ABC123" value="' + (l.ref||'') + '" /></div>' +
      '<div class="trip-leg-row"><label>Notes (optional)</label>' +
        '<input type="text" class="lodge-notes" placeholder="Breakfast included, late check-in…" value="' + (l.notes||'') + '" /></div>' +
    '</div>' +
    '<div style="margin-top:8px;">' +
      '<button class="btn btn-sm btn-primary" type="button" onclick="splitLodgingIntoNights(\'leg-' + idx + '\')">Split into nights</button>' +
      '<span style="font-size:11px;color:var(--text3);margin-left:8px;">Splits into one entry per night once dates are set</span>' +
    '</div>';
  c.appendChild(div);

  const inEl  = document.getElementById('lodge-in-'  + idx);
  const outEl = document.getElementById('lodge-out-' + idx);
  if (inEl && outEl) {
    inEl.addEventListener('change', () => { if (!outEl.value) outEl.value = inEl.value; });
  }
  initLegDrag(div);
}

export function removeTripLeg(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ---- Collect legs from the modal DOM ----
function collectLegs() {
  const legs = [];
  document.querySelectorAll('#trip-legs-container .trip-leg').forEach(div => {
    if (div.querySelector('.lodge-name')) {
      const idx  = div.id.replace('leg-', '');
      const inH  = div.querySelector('.lodge-in-time-'  + idx + '-h');
      const inM  = div.querySelector('.lodge-in-time-'  + idx + '-m');
      const outH = div.querySelector('.lodge-out-time-' + idx + '-h');
      const outM = div.querySelector('.lodge-out-time-' + idx + '-m');
      const nightNum    = div.querySelector('.lodge-night-num');
      const totalNights = div.querySelector('.lodge-total-nights');
      const resEl       = div.querySelector('.lodge-residency');
      legs.push({
        type:         'lodging',
        residency:    resEl ? resEl.checked : false,
        name:         div.querySelector('.lodge-name').value.trim(),
        addr:         div.querySelector('.lodge-addr').value.trim(),
        inDate:       div.querySelector('.lodge-in-date').value,
        inTime:       inH && inM  ? inH.value + ':' + inM.value   : '',
        outDate:      div.querySelector('.lodge-out-date').value,
        outTime:      outH && outM ? outH.value + ':' + outM.value : '',
        ref:          div.querySelector('.lodge-ref')    ? div.querySelector('.lodge-ref').value.trim()   : '',
        notes:        div.querySelector('.lodge-notes').value.trim(),
        _nightNum:    nightNum    && nightNum.value    ? Number(nightNum.value)    : null,
        _totalNights: totalNights && totalNights.value ? Number(totalNights.value) : null,
        _nightOf:     div.querySelector('.lodge-in-date').value,
        isFirst:      div.querySelector('.lodge-is-first') ? div.querySelector('.lodge-is-first').value  === '1' : true,
        isLast:       div.querySelector('.lodge-is-last')  ? div.querySelector('.lodge-is-last').value   === '1' : true,
      });
    } else {
      const depH = div.querySelector('.leg-dep-time-h');
      const depM = div.querySelector('.leg-dep-time-m');
      const arrH = div.querySelector('.leg-arr-time-h');
      const arrM = div.querySelector('.leg-arr-time-m');
      legs.push({
        type:      'transport',
        transport: div.querySelector('.leg-transport').value,
        operator:  div.querySelector('.leg-operator').value.trim(),
        number:    div.querySelector('.leg-number').value.trim(),
        depLoc:    div.querySelector('.leg-dep-loc').value.trim(),
        depCity:   div.querySelector('.leg-dep-city').value.trim(),
        depDate:   div.querySelector('.leg-dep-date').value,
        depTime:   depH && depM ? depH.value + ':' + depM.value : '',
        depTz:     div.querySelector('.leg-dep-tz').value,
        arrLoc:    div.querySelector('.leg-arr-loc').value.trim(),
        arrCity:   div.querySelector('.leg-arr-city').value.trim(),
        arrDate:   div.querySelector('.leg-arr-date').value,
        arrTime:   arrH && arrM ? arrH.value + ':' + arrM.value : '',
        arrTz:     div.querySelector('.leg-arr-tz').value,
      });
    }
  });
  return legs;
}

// ---- Modal ----
let editingTripId = null;

export function openTripModal(id) {
  try {
    editingTripId = id || null;
    const isEdit  = !!id;
    document.getElementById('trip-modal-title').textContent = isEdit ? 'Edit trip' : 'Add trip';
    document.getElementById('trip-save-btn').textContent    = isEdit ? 'Save changes' : 'Add trip';
    tripLegCount = 0;
    document.getElementById('trip-legs-container').innerHTML = '';

    if (isEdit) {
      const t = (state.trips || []).find(t => t.id === id);
      if (!t) return;
      document.getElementById('trip-name').value  = t.name;
      document.getElementById('trip-dest').value  = t.destination;
      document.getElementById('trip-start').value = t.start;
      document.getElementById('trip-end').value   = t.end;
      document.getElementById('trip-color').value = t.color || '#6b4a8a';
      (t.legs || []).forEach(leg => {
        if (leg.type === 'lodging') addLodgingLeg(leg);
        else addTripLeg(leg);
      });
    } else {
      document.getElementById('trip-name').value  = '';
      document.getElementById('trip-dest').value  = '';
      document.getElementById('trip-start').value = fmtDate(new Date());
      document.getElementById('trip-end').value   = '';
      document.getElementById('trip-color').value = '#6b4a8a';
      addTripLeg(); // start with one empty leg
    }

    document.getElementById('trip-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('trip-name').focus(), 50);
  } catch (e) {
    console.error('openTripModal error:', e);
    alert('Error opening modal: ' + e.message);
  }
}

export function closeTripModal() {
  document.getElementById('trip-modal').classList.add('hidden');
  editingTripId = null;
}

export function saveTrip() {
  const name  = document.getElementById('trip-name').value.trim();
  const start = document.getElementById('trip-start').value;
  const end   = document.getElementById('trip-end').value;
  if (!name || !start || !end) return;
  if (!state.trips) state.trips = [];

  const legs       = collectLegs();
  const firstLeg   = legs[0];
  const departTime = firstLeg ? firstLeg.depTime : '';

  const entry = {
    id:          editingTripId || uid(),
    name,
    destination: document.getElementById('trip-dest').value.trim(),
    start,
    end,
    departTime,
    color:       document.getElementById('trip-color').value,
    legs,
  };

  if (editingTripId) {
    const idx = state.trips.findIndex(t => t.id === editingTripId);
    if (idx >= 0) state.trips[idx] = entry;
  } else {
    state.trips.push(entry);
  }
  saveState();
  closeTripModal();
  renderTravel();
}

export function deleteTrip(id) {
  state.trips = (state.trips || []).filter(t => t.id !== id);
  saveState();
  renderTravel();
}

// ---- Render ----
export function renderTravel() {
  const statsEl = document.getElementById('travel-stats');
  const listEl  = document.getElementById('travel-list');
  if (!statsEl || !listEl) return;

  const trips    = [...(state.trips || [])].sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = trips.filter(t => tripStatus(t) === 'upcoming');
  const ongoing  = trips.filter(t => tripStatus(t) === 'ongoing');
  const past     = trips.filter(t => tripStatus(t) === 'past');

  statsEl.innerHTML =
    '<div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">'                                               + trips.length    + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Upcoming</div><div class="stat-value">'                                            + upcoming.length + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Ongoing</div><div class="stat-value" style="color:var(--green);">'                 + ongoing.length  + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Past</div><div class="stat-value">'                                                + past.length     + '</div></div>';

  if (!trips.length) {
    listEl.innerHTML = '<div class="card"><div class="empty-state">No trips yet. Click "+ Add trip" to plan your first adventure.</div></div>';
    return;
  }

  function renderGroup(items, groupLabel) {
    if (!items.length) return '';
    return '<div style="margin-bottom:8px;"><div class="card-title" style="padding:0 0 8px;">' + groupLabel + '</div>' +
      items.map(t => {
        const status      = tripStatus(t);
        const cd          = tripCountdown(t);
        const nights      = Math.max(0, Math.round((parseDate(t.end) - parseDate(t.start)) / 86400000));
        const startFmt    = parseDate(t.start).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
        const endFmt      = parseDate(t.end  ).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
        const cdBg        = status === 'ongoing' ? 'var(--green-light)' : status === 'upcoming' ? 'var(--blue-light)' : 'var(--surface2)';
        const cdColor     = status === 'ongoing' ? 'var(--green)' : status === 'upcoming' ? 'var(--blue)' : 'var(--text3)';
        const statusBadge = status === 'ongoing'
          ? '<span class="trip-status-badge trip-status-ongoing">✈️ Ongoing</span>'
          : status === 'upcoming'
            ? '<span class="trip-status-badge trip-status-upcoming">🗓 Upcoming</span>'
            : '<span class="trip-status-badge trip-status-past">Past</span>';

        const legsHtml = (t.legs || []).map(leg => {
          if (leg.type === 'lodging') {
            const inFmt  = leg.inDate  ? parseDate(leg.inDate ).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }) + (leg.inTime  && leg.isFirst ? ' · Check-in '  + leg.inTime  : '') : '';
            const outFmt = leg.outDate && leg.isLast ? parseDate(leg.outDate).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }) + (leg.outTime ? ' · Check-out ' + leg.outTime : '') : '';
            const nightLabel = leg._nightNum && leg._totalNights ? 'Night ' + leg._nightNum + ' of ' + leg._totalNights : 'Lodging';
            return '<div class="trip-leg-display">' +
              '<div class="trip-leg-connector" style="color:var(--purple);">' +
                '<div class="trip-leg-dot" style="border-color:var(--purple);"></div>' +
                '<div class="trip-leg-line"></div>' +
                '<div class="trip-leg-dot" style="border-color:var(--purple);background:var(--purple);"></div>' +
              '</div>' +
              '<div class="trip-leg-content">' +
                '<span class="trip-leg-transport" style="background:var(--purple-light);color:var(--purple);">' + (leg.residency ? 'Residency' : nightLabel) + (leg.ref ? ' · ' + leg.ref : '') + '</span>' +
                '<div class="trip-leg-place" style="margin-top:4px;">' + (leg.name || '—') + '</div>' +
                '<div class="trip-leg-city">' + (leg.addr || '') + (inFmt ? ' · ' + inFmt : '') + '</div>' +
                (outFmt ? '<div class="trip-leg-city">' + outFmt + '</div>' : '') +
                (leg.notes ? '<div class="trip-leg-time" style="margin-top:3px;">' + leg.notes + '</div>' : '') +
              '</div>' +
            '</div>';
          }
          const depFmt = leg.depDate ? parseDate(leg.depDate).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) + (leg.depTime ? ' ' + leg.depTime : '') : '';
          const arrFmt = leg.arrDate ? parseDate(leg.arrDate).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) + (leg.arrTime ? ' ' + leg.arrTime : '') : '';
          const depTzLabel = leg.depTz ? (TZ_LIST.find(tz => tz.value === leg.depTz) || { label: leg.depTz }).label.split(' ')[0] : '';
          const arrTzLabel = leg.arrTz ? (TZ_LIST.find(tz => tz.value === leg.arrTz) || { label: leg.arrTz }).label.split(' ')[0] : '';
          return '<div class="trip-leg-display">' +
            '<div class="trip-leg-connector" style="color:' + t.color + ';">' +
              '<div class="trip-leg-dot" style="border-color:' + t.color + ';"></div>' +
              '<div class="trip-leg-line"></div>' +
              '<div class="trip-leg-dot" style="border-color:' + t.color + ';background:' + t.color + ';"></div>' +
            '</div>' +
            '<div class="trip-leg-content">' +
              '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
                '<span class="trip-leg-transport">' + leg.transport.charAt(0).toUpperCase() + leg.transport.slice(1) +
                  (leg.number   ? ' · ' + leg.number   : '') +
                  (leg.operator ? ' · ' + leg.operator : '') +
                '</span>' +
              '</div>' +
              '<div class="trip-leg-place">' + (leg.depLoc || '—') + '</div>' +
              '<div class="trip-leg-city">' + (leg.depCity || '') + (depFmt ? ' · ' + depFmt : '') + (depTzLabel ? ' <span style="font-size:10px;opacity:0.7;">' + depTzLabel + '</span>' : '') + '</div>' +
              '<div style="margin:8px 0 4px;">' +
                '<div class="trip-leg-place">' + (leg.arrLoc || '—') + '</div>' +
                '<div class="trip-leg-city">' + (leg.arrCity || '') + (arrFmt ? ' · ' + arrFmt : '') + (arrTzLabel ? ' <span style="font-size:10px;opacity:0.7;">' + arrTzLabel + '</span>' : '') + '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');

        return '<div class="trip-card ' + status + '" style="border-left-color:' + t.color + ';">' +
          '<div class="trip-header">' +
            '<div class="trip-icon" style="background:' + t.color + '22;color:' + t.color + ';font-size:15px;font-weight:600;">' + t.name.charAt(0).toUpperCase() + '</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div class="trip-title">' + t.name + '</div>' +
              '<div class="trip-dest">'  + (t.destination || '—') + '</div>' +
              '<div class="trip-dates">' + startFmt + ' → ' + endFmt + ' &nbsp;·&nbsp; ' + nights + ' night' + (nights !== 1 ? 's' : '') + '</div>' +
            '</div>' +
            statusBadge +
          '</div>' +
          (status !== 'past'
            ? '<div class="trip-countdown" style="background:' + cdBg + ';">' +
                '<div>' +
                  '<div class="trip-countdown-label">' + cd.label + '</div>' +
                  '<div class="trip-countdown-value" style="color:' + cdColor + ';" id="tcd-' + t.id + '">' + cd.detail + '</div>' +
                '</div>' +
              '</div>'
            : '') +
          (t.notes ? '<div class="trip-notes-text">' + t.notes + '</div>' : '') +
          ((t.legs || []).length ? '<div class="trip-timeline">' + legsHtml + '</div>' : '') +
          '<div class="trip-actions">' +
            '<button class="btn btn-sm" onclick="openTripModal(\'' + t.id + '\')">Edit</button>' +
            '<button class="del-btn" style="opacity:1;" onclick="deleteTrip(\'' + t.id + '\')">×</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
  }

  listEl.innerHTML =
    renderGroup(ongoing,  'Ongoing')  +
    renderGroup(upcoming, 'Upcoming') +
    renderGroup(past,     'Past');
}

// ---- Live countdown ticker (updates every second, shared with deadlines) ----
setInterval(() => {
  if (currentView === 'travel') renderTravel();
  // Update in-view countdown values without full re-render
  (state.trips || []).forEach(t => {
    const el = document.getElementById('tcd-' + t.id);
    if (el) el.textContent = tripCountdown(t).detail;
  });
}, 1000);
