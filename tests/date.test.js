import { test } from 'node:test';
import assert from 'node:assert/strict';
import { today, addDays, isDateString, recentDays } from '../src/core/date.js';

test('today: 로컬 시간 기준 YYYY-MM-DD를 반환한다', () => {
  assert.equal(today(new Date(2026, 9, 5, 0, 0, 0)), '2026-10-05');
  assert.equal(today(new Date(2026, 9, 5, 23, 59, 59)), '2026-10-05');
  assert.equal(today(new Date(2026, 0, 9)), '2026-01-09');
});

test('today: 인자 없이 호출하면 현재 날짜 형식을 반환한다', () => {
  assert.ok(isDateString(today()));
});

test('addDays: 같은 달 안에서 더하고 뺀다', () => {
  assert.equal(addDays('2026-10-05', 1), '2026-10-06');
  assert.equal(addDays('2026-10-05', -1), '2026-10-04');
  assert.equal(addDays('2026-10-05', 0), '2026-10-05');
});

test('addDays: 월말·연말 경계를 넘는다', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('addDays: 윤년 2월을 처리한다', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
});

test('addDays: 큰 일수도 정확하다', () => {
  assert.equal(addDays('2026-01-01', 365), '2027-01-01');
  assert.equal(addDays('2026-10-05', -7), '2026-09-28');
});

test('addDays: 잘못된 입력이면 에러', () => {
  assert.throws(() => addDays('2026/10/05', 1), TypeError);
  assert.throws(() => addDays('2026-02-30', 1), TypeError);
  assert.throws(() => addDays(new Date(), 1), TypeError);
  assert.throws(() => addDays('2026-10-05', 1.5), TypeError);
  assert.throws(() => addDays('2026-10-05', '1'), TypeError);
});

test('isDateString: 형식과 실제 존재 여부를 확인한다', () => {
  assert.equal(isDateString('2026-10-05'), true);
  assert.equal(isDateString('2028-02-29'), true);
  assert.equal(isDateString('2026-02-29'), false);
  assert.equal(isDateString('2026-13-01'), false);
  assert.equal(isDateString('2026-1-5'), false);
  assert.equal(isDateString(''), false);
  assert.equal(isDateString(null), false);
});

test('recentDays: 오늘 포함 최근 n일을 오래된 순으로', () => {
  assert.deepEqual(recentDays('2026-10-05', 3), ['2026-10-03', '2026-10-04', '2026-10-05']);
  assert.deepEqual(recentDays('2027-01-02', 7), [
    '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02',
  ]);
  assert.deepEqual(recentDays('2026-10-05', 1), ['2026-10-05']);
});
