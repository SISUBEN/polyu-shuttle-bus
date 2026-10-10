import { STOPS, SERVICE_WINDOWS, hongKongNow, nextTrips, serviceType, tripInstant } from './schedule.js';

const fromEl = document.querySelector('#from');
const toEl = document.querySelector('#to');
const resultEl = document.querySelector('#result');
const upcomingEl = document.querySelector('#upcoming');
const clockEl = document.querySelector('#clock');
const serviceEl = document.querySelector('#service');
const refreshEl = document.querySelector('#refresh');
let holidays = new Set();

function formatDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('zh-HK', { timeZone: 'UTC', month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function formatTime(clock) {
  return clock;
}

function possibleDestinations(from) {
  return Object.keys(STOPS).filter(stop => stop !== from);
}

function updateDestinations() {
  const selected = toEl.value;
  const destinations = possibleDestinations(fromEl.value);
  toEl.replaceChildren(...destinations.map(stop => new Option(`${STOPS[stop]} · ${stop === 'POLYU' ? 'PolyU' : stop}`, stop)));
  toEl.value = destinations.includes(selected) ? selected : (fromEl.value === 'WK' ? 'HHB' : destinations[0]);
}

function minutesUntil(trip, now) {
  return Math.max(0, Math.ceil((tripInstant(trip).getTime() - now.getTime()) / 60000));
}

function render() {
  const now = new Date();
  const hk = hongKongNow(now);
  clockEl.textContent = `香港時間 ${hk.date} ${hk.time}`;
  const todayType = serviceType(hk.date, holidays);
  serviceEl.textContent = todayType === 'term' ? '學期班次' : todayType === 'break' ? '假期班次' : holidays.has(hk.date) ? '公眾假期 · 停駛' : '今天沒有服務';

  const trips = nextTrips(now, fromEl.value, toEl.value, holidays);
  if (!trips.length) {
    const expired = hk.date > SERVICE_WINDOWS.at(-1).end;
    resultEl.innerHTML = `<div class="empty"><p class="eyebrow">暫無班次</p><h2>${expired ? '時間表已過期' : '所選路線沒有後續班次'}</h2><p>${expired ? '請查看官方最新時間表。' : '此時間表只涵蓋指定的星期一至五服務期間。'}</p></div>`;
    upcomingEl.replaceChildren();
    return;
  }

  const first = trips[0];
  const minutes = minutesUntil(first, now);
  const today = first.date === hk.date;
  const countdown = today ? (minutes === 0 ? '即將開出' : `${minutes} 分鐘`) : `${formatDate(first.date)}開出`;
  const timeLabel = first.from === 'POLYU' ? '預計開出' : '時間表開出';
  resultEl.innerHTML = `
    <div class="result-top"><span class="eyebrow">下一班 · ${timeLabel}</span><span class="route-badge ${first.kind}">${first.kind === 'express' ? 'Express 直達' : '普通班次'}</span></div>
    <div class="time-row"><strong class="main-time">${formatTime(first.departure)}</strong><span class="countdown">${countdown}</span></div>
    <p class="journey">${STOPS[first.from]} <span aria-hidden="true">→</span> ${STOPS[first.to]}</p>
    <p class="date-note">${today ? '今日' : formatDate(first.date)} · ${first.kind === 'express' ? '不停理大本部' : first.to === 'POLYU' ? '往 ' + STOPS[first.terminal] + ' 方向' : '經理大本部'}${first.from === 'POLYU' ? ' · 本部站時間為估計' : ''}</p>`;

  upcomingEl.replaceChildren(...trips.slice(1).map(trip => {
    const item = document.createElement('li');
    item.innerHTML = `<span>${trip.date === hk.date ? '今日' : formatDate(trip.date)} · ${trip.kind === 'express' ? 'Express 直達' : '普通班次'}</span><strong>${formatTime(trip.departure)}</strong>`;
    return item;
  }));
}

async function init() {
  try {
    const response = await fetch('./holidays.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('holiday data unavailable');
    const data = await response.json();
    holidays = new Set(data.dates);
  } catch {
    serviceEl.textContent = '假期資料暫時無法載入';
  }
  updateDestinations();
  render();
  setInterval(render, 30000);
}

fromEl.addEventListener('change', () => { updateDestinations(); render(); });
toEl.addEventListener('change', render);
refreshEl.addEventListener('click', render);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
init();
