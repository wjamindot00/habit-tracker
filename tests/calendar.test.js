import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  weekday,
  monthCalendar,
  yearWeeks,
  dailyCounts,
  activityLevel,
  LEVELS,
} from '../src/core/calendar.js';

test('weekday: 0 = 일요일', () => {
  assert.equal(weekday('2026-10-04'), 0); // 일
  assert.equal(weekday('2026-10-05'), 1); // 월
  assert.equal(weekday('2026-10-10'), 6); // 토
  assert.throws(() => weekday('2026-13-01'), TypeError);
});

describe('monthCalendar', () => {
  test('2026년 10월: 목요일 시작, 31일까지', () => {
    const { year, month, weeks } = monthCalendar('2026-10-05');
    assert.equal(year, 2026);
    assert.equal(month, 10);
    assert.equal(weeks.length, 5);
    assert.deepEqual(weeks[0], [null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
    assert.deepEqual(weeks[4], ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']);
  });

  test('모든 주는 7칸이고 그 달의 날짜가 빠짐없이 들어 있다', () => {
    const days = monthCalendar('2026-10-31').weeks.flat().filter(Boolean);
    assert.equal(days.length, 31);
    assert.equal(days[0], '2026-10-01');
    assert.equal(days.at(-1), '2026-10-31');
  });

  test('윤년 2월은 29일, 평년 2월은 28일', () => {
    assert.equal(monthCalendar('2028-02-10').weeks.flat().filter(Boolean).length, 29);
    assert.equal(monthCalendar('2026-02-10').weeks.flat().filter(Boolean).length, 28);
  });

  test('12월도 31일에서 끝난다 (연말 경계)', () => {
    const days = monthCalendar('2026-12-01').weeks.flat().filter(Boolean);
    assert.equal(days.at(-1), '2026-12-31');
  });
});

describe('yearWeeks', () => {
  test('2026년: 1/1(목)부터 12/31(목)까지 53주', () => {
    const weeks = yearWeeks(2026);
    assert.equal(weeks.length, 53);
    assert.ok(weeks.every((w) => w.length === 7));
    assert.deepEqual(weeks[0].slice(3, 5), [null, '2026-01-01']);
    assert.equal(weeks.flat().filter(Boolean).length, 365);
    assert.equal(weeks.at(-1)[4], '2026-12-31');
    assert.equal(weeks.at(-1)[5], null);
  });

  test('윤년은 366일', () => {
    assert.equal(yearWeeks(2028).flat().filter(Boolean).length, 366);
  });

  test('잘못된 연도는 에러', () => {
    assert.throws(() => yearWeeks('2026'), TypeError);
    assert.throws(() => yearWeeks(26), TypeError);
  });
});

test('dailyCounts: 날짜별 완료한 습관 수 (한 습관의 중복 체크는 한 번만)', () => {
  const counts = dailyCounts([
    { checks: ['2026-10-04', '2026-10-05'] },
    { checks: ['2026-10-05', '2026-10-05'] },
    { checks: [] },
  ]);
  assert.equal(counts.get('2026-10-04'), 1);
  assert.equal(counts.get('2026-10-05'), 2);
  assert.equal(counts.get('2026-10-03'), undefined);
});

describe('activityLevel', () => {
  test('0개면 0단계, 전부 하면 가장 진한 단계', () => {
    assert.equal(activityLevel(0, 3), 0);
    assert.equal(activityLevel(3, 3), LEVELS - 1);
  });

  test('일부만 하면 비율에 따라 올림', () => {
    assert.equal(activityLevel(1, 4), 1);
    assert.equal(activityLevel(2, 4), 2);
    assert.equal(activityLevel(1, 3), 2);
  });

  test('습관이 없거나 max를 넘어도 안전하다', () => {
    assert.equal(activityLevel(1, 0), 0);
    assert.equal(activityLevel(5, 3), LEVELS - 1);
    assert.equal(activityLevel(undefined, 3), 0);
  });
});
