// 이번 달 달력과 연간 기록(잔디) 계산 (PRD F11, F12).
// 주는 일요일부터 시작하고, 날짜는 'YYYY-MM-DD' 문자열로 다룬다.

import { addDays, isDateString } from './date.js';

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 잔디 색 단계 수. 0(없음) ~ LEVELS-1(가장 많음) */
export const LEVELS = 5;

const pad = (n) => String(n).padStart(2, '0');

function assertDate(date) {
  if (!isDateString(date)) throw new TypeError(`잘못된 날짜 형식: ${date}`);
}

/** 요일 번호. 0 = 일요일 */
export function weekday(date) {
  assertDate(date);
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

// 앞을 첫날 요일만큼 null로 채우고, 끝을 7의 배수가 되게 null로 채워 7칸씩 자른다.
function toWeeks(days) {
  const cells = [...Array(weekday(days[0])).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

function daysBetween(first, last) {
  const days = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  return days;
}

/** date가 속한 달의 달력. weeks는 일~토 7칸씩, 그 달이 아닌 칸은 null */
export function monthCalendar(date) {
  assertDate(date);
  const [year, month] = date.split('-').map(Number);
  const first = `${year}-${pad(month)}-01`;
  const last = addDays(month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`, -1);
  return { year, month, weeks: toWeeks(daysBetween(first, last)) };
}

/** year의 1/1~12/31을 주 단위로 (잔디의 한 열 = 한 주). 그 해가 아닌 칸은 null */
export function yearWeeks(year) {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) throw new TypeError(`잘못된 연도: ${year}`);
  return toWeeks(daysBetween(`${year}-01-01`, `${year}-12-31`));
}

/** 날짜별로 완료한 습관 수 */
export function dailyCounts(habits) {
  const counts = new Map();
  for (const { checks } of habits) {
    for (const day of new Set(checks)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

/** 완료 수를 색 단계로. max(보통 습관 수)를 다 채우면 가장 진한 단계 */
export function activityLevel(count, max) {
  if (!(count > 0) || !(max > 0)) return 0;
  return Math.min(LEVELS - 1, Math.ceil((count / max) * (LEVELS - 1)));
}
