export const SERVICE_WINDOWS = [
  { start: '2026-08-03', end: '2026-08-21', type: 'break' },
  { start: '2026-08-24', end: '2026-12-31', type: 'term' },
  { start: '2027-01-04', end: '2027-01-15', type: 'break' },
  { start: '2027-01-18', end: '2027-05-28', type: 'term' },
  { start: '2027-05-31', end: '2027-07-30', type: 'break' },
];

export const STOPS = {
  WK: '西九龍校園',
  POLYU: '理大本部',
  HHB: '紅磡灣校園',
};

const HONG_KONG_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function time(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function addMinutes(clock, minutes) {
  const [hour, minute] = clock.split(':').map(Number);
  const total = hour * 60 + minute + minutes;
  return time(Math.floor(total / 60), total % 60);
}

function everyThirtyMinutes(startHour, startMinute, endHour, endMinute) {
  const result = [];
  for (let total = startHour * 60 + startMinute; total <= endHour * 60 + endMinute; total += 30) {
    result.push(time(Math.floor(total / 60), total % 60));
  }
  return result;
}

const HHB_REGULAR = everyThirtyMinutes(8, 45, 19, 15);
const WK_REGULAR = everyThirtyMinutes(9, 15, 19, 45);
const EXPRESS = [...everyThirtyMinutes(12, 30, 17, 30), '17:50', '18:10', '18:30'];

export function hongKongNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const field = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    date: `${field.year}-${field.month}-${field.day}`,
    time: `${field.hour}:${field.minute}`,
  };
}

export function serviceType(dateKey, holidays = new Set()) {
  const window = SERVICE_WINDOWS.find(item => dateKey >= item.start && dateKey <= item.end);
  if (!window) return null;
  const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6 || holidays.has(dateKey)) return null;
  return window.type;
}

export function tripsForDate(dateKey, holidays = new Set()) {
  const type = serviceType(dateKey, holidays);
  if (!type) return [];
  const trips = [];
  const add = (from, to, departure, kind, terminal) => {
    trips.push({ date: dateKey, from, to, departure, kind, terminal });
  };

  // The timetable gives departure times for HHB/WK and estimated departure at PolyU.
  for (const departure of HHB_REGULAR) {
    add('HHB', 'WK', departure, 'regular', 'WK');
    add('HHB', 'POLYU', departure, 'regular', 'WK');
    add('POLYU', 'WK', addMinutes(departure, 5), 'regular', 'WK');
  }
  for (const departure of WK_REGULAR) {
    add('WK', 'HHB', departure, 'regular', 'HHB');
    add('WK', 'POLYU', departure, 'regular', 'HHB');
    add('POLYU', 'HHB', addMinutes(departure, 10), 'regular', 'HHB');
  }
  // The first two HHB-bound buses start from the PolyU Main Campus.
  for (const departure of ['08:30', '09:00']) {
    add('POLYU', 'HHB', departure, 'regular', 'HHB');
  }
  if (type === 'term') {
    for (const departure of EXPRESS) {
      add('HHB', 'WK', departure, 'express', 'WK');
      add('WK', 'HHB', departure, 'express', 'HHB');
    }
  }
  return trips.sort((a, b) => a.departure.localeCompare(b.departure));
}

export function tripInstant(trip) {
  const [year, month, day] = trip.date.split('-').map(Number);
  const [hour, minute] = trip.departure.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - HONG_KONG_OFFSET_MS);
}

export function nextTrips(now, from, to, holidays = new Set(), limit = 3) {
  const dateKey = hongKongNow(now).date;
  const start = new Date(`${dateKey}T00:00:00+08:00`).getTime();
  const end = new Date(`${SERVICE_WINDOWS.at(-1).end}T00:00:00+08:00`).getTime();
  const found = [];
  for (let day = start; day <= end && found.length < limit; day += DAY_MS) {
    const key = hongKongNow(new Date(day)).date;
    for (const trip of tripsForDate(key, holidays)) {
      if (trip.from === from && trip.to === to && tripInstant(trip).getTime() >= now.getTime()) {
        found.push(trip);
        if (found.length === limit) break;
      }
    }
  }
  return found;
}
