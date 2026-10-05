import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { currentStreak } from '../src/core/streak.js';

const TODAY = '2026-10-05';

describe('currentStreak: PRD §5.1 표', () => {
  test('10/03, 10/04, 10/05 → 3', () => {
    assert.equal(currentStreak(['2026-10-03', '2026-10-04', '2026-10-05'], TODAY), 3);
  });

  test('10/03, 10/04 → 2 (오늘 아직 안 함)', () => {
    assert.equal(currentStreak(['2026-10-03', '2026-10-04'], TODAY), 2);
  });

  test('10/01, 10/02 → 0', () => {
    assert.equal(currentStreak(['2026-10-01', '2026-10-02'], TODAY), 0);
  });

  test('(없음) → 0', () => {
    assert.equal(currentStreak([], TODAY), 0);
  });
});

describe('currentStreak: 경계', () => {
  test('연말 → 연초 (12/31 → 1/1)', () => {
    assert.equal(currentStreak(['2026-12-30', '2026-12-31', '2027-01-01'], '2027-01-01'), 3);
  });

  test('연초에 아직 안 했으면 작년 12/31부터 센다', () => {
    assert.equal(currentStreak(['2026-12-30', '2026-12-31'], '2027-01-01'), 2);
  });

  test('월말 → 월초 (9/30 → 10/1)', () => {
    assert.equal(currentStreak(['2026-09-29', '2026-09-30', '2026-10-01'], '2026-10-01'), 3);
  });

  test('2월 말 → 3월 (평년·윤년)', () => {
    assert.equal(currentStreak(['2026-02-27', '2026-02-28', '2026-03-01'], '2026-03-01'), 3);
    assert.equal(currentStreak(['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01'), 3);
    // 윤년에 2/29를 빠뜨리면 끊긴다
    assert.equal(currentStreak(['2028-02-28', '2028-03-01'], '2028-03-01'), 1);
  });
});

describe('currentStreak: 기타', () => {
  test('중간에 빠진 날이 있으면 그 뒤부터만 센다', () => {
    assert.equal(currentStreak(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05'], TODAY), 2);
  });

  test('오늘만 했으면 1, 어제만 했으면 1', () => {
    assert.equal(currentStreak(['2026-10-05'], TODAY), 1);
    assert.equal(currentStreak(['2026-10-04'], TODAY), 1);
  });

  test('미래 날짜 체크는 무시된다', () => {
    assert.equal(currentStreak(['2026-10-04', '2026-10-06'], TODAY), 1);
  });

  test('정렬 안 됨·중복이 있어도 같은 결과', () => {
    assert.equal(currentStreak(['2026-10-05', '2026-10-03', '2026-10-04', '2026-10-04'], TODAY), 3);
  });

  test('긴 스트릭', () => {
    const checks = Array.from({ length: 400 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 9, 5 - i));
      return d.toISOString().slice(0, 10);
    });
    assert.equal(currentStreak(checks, TODAY), 400);
  });

  test('잘못된 today는 에러', () => {
    assert.throws(() => currentStreak([], '2026/10/05'), TypeError);
  });
});
