const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export interface CalendarCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
  return date;
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = fromDateKey(value);
  return toDateKey(date) === value;
}

export function isTimeValue(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

export function shortDateLabel(key: string): string {
  const date = fromDateKey(key);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function weekdayLabels(): string[] {
  return WEEKDAYS;
}

export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1, 12);
  const offset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  const today = todayKey();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < total; index += 1) {
    const dayNumber = index - offset + 1;
    const date = new Date(year, month, dayNumber, 12);
    const key = toDateKey(date);
    cells.push({
      key,
      day: date.getDate(),
      inMonth: dayNumber >= 1 && dayNumber <= daysInMonth,
      isToday: key === today,
    });
  }
  return cells;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month + delta, 1, 12);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function formatClock(timestamp: number): string {
  const date = new Date(timestamp);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()} · ${formatClock(timestamp)}`;
}

export function timeRange(start: string, end: string): string {
  if (!start) return "Tanpa waktu";
  return end ? `${start} – ${end}` : start;
}
export function addDays(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Inclusive date keys for a range; caps at one year to keep the UI safe. */
export function dateKeysBetween(startKey: string, endKey: string): string[] {
  if (!isDateKey(startKey)) return [];
  const end = isDateKey(endKey) && endKey >= startKey ? endKey : startKey;
  const keys: string[] = [];
  let current = startKey;
  let guard = 0;
  while (current <= end && guard < 366) {
    keys.push(current);
    current = addDays(current, 1);
    guard += 1;
  }
  return keys;
}

export function scheduleEndKey(schedule: { date: string; end_date?: string }): string {
  const end = schedule.end_date ?? "";
  return isDateKey(end) && end >= schedule.date ? end : schedule.date;
}

export function scheduleCoversDate(schedule: { date: string; end_date?: string }, key: string): boolean {
  const end = scheduleEndKey(schedule);
  return key >= schedule.date && key <= end;
}

export function scheduleOverlapsMonth(
  schedule: { date: string; end_date?: string },
  year: number,
  month: number,
): boolean {
  const monthStart = year + "-" + pad2(month + 1) + "-01";
  const monthEnd = toDateKey(new Date(year, month + 1, 0, 12));
  return scheduleEndKey(schedule) >= monthStart && schedule.date <= monthEnd;
}

export function dateRangeLabel(startKey: string, endKey?: string): string {
  if (!endKey || endKey === startKey) return shortDateLabel(startKey);
  return shortDateLabel(startKey) + " – " + shortDateLabel(endKey);
}
