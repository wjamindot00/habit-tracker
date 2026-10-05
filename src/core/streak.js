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
