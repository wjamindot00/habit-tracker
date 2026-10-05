// 스트릭 계산 (PRD F5, §5.1).

import { addDays, isDateString } from './date.js';

/**
 * 오늘(또는 어제)까지 연속으로 완료한 일수.
 * - 오늘 체크했으면 오늘부터, 아직 안 했으면 어제부터 거꾸로 센다.
 * - 어제도 안 했으면 0.
 */
export function currentStreak(checks, today) {
  if (!isDateString(today)) throw new TypeError(`잘못된 날짜 형식: ${today}`);
  const done = new Set(checks);
  let day = done.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

/** 지금까지 가장 길게 이어진 연속 일수 (PRD F9) */
export function longestStreak(checks) {
  const days = [...new Set(checks)].sort();
  let longest = 0;
  let run = 0;
  days.forEach((day, i) => {
    run = i > 0 && addDays(days[i - 1], 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  return longest;
}

/**
 * 이번 달 달성률 (PRD F9). 이번 달 1일(또는 습관을 만든 날)부터 오늘까지 중 완료한 비율.
 * 반환: { done, total, rate } — rate는 0~1
 */
export function monthlyRate(checks, today, createdAt = today) {
  if (!isDateString(today)) throw new TypeError(`잘못된 날짜 형식: ${today}`);
  const monthStart = `${today.slice(0, 7)}-01`;
  const start = createdAt > monthStart ? createdAt : monthStart;
  if (start > today) return { done: 0, total: 0, rate: 0 };

  const done = new Set(checks.filter((d) => d >= start && d <= today)).size;
  let total = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) total += 1;
  return { done, total, rate: done / total };
}
