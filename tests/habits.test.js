import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createState,
  addHabit,
  renameHabit,
  deleteHabit,
  toggleCheck,
  HabitError,
  canCheck,
} from '../src/core/habits.js';

const NOW = new Date(2026, 9, 5, 9, 0, 0);

// 함수가 원본을 바꾸려 하면 strict mode에서 에러가 나도록 얼린다.
function deepFreeze(obj) {
  Object.values(obj).forEach((v) => v && typeof v === 'object' && deepFreeze(v));
  return Object.freeze(obj);
}

function withHabits(...names) {
  let state = createState();
  names.forEach((name, i) => {
    state = addHabit(state, name, new Date(NOW.getTime() + i));
  });
  return deepFreeze(state);
}

const errorCode = (code) => (err) => err instanceof HabitError && err.code === code;

describe('createState', () => {
  test('빈 상태를 만든다', () => {
    assert.deepEqual(createState(), { version: 1, habits: [] });
  });
});

describe('addHabit', () => {
  test('습관을 추가한다', () => {
    const state = addHabit(deepFreeze(createState()), '물 2L 마시기', NOW);
    assert.deepEqual(state.habits, [
      { id: `h_${NOW.getTime()}`, name: '물 2L 마시기', createdAt: '2026-10-05', checks: [] },
    ]);
    assert.equal(state.version, 1);
  });

  test('생성 순서대로 쌓인다', () => {
    const state = withHabits('A', 'B', 'C');
    assert.deepEqual(state.habits.map((h) => h.name), ['A', 'B', 'C']);
  });

  test('앞뒤 공백을 제거한다', () => {
    const state = addHabit(createState(), '  독서  ', NOW);
    assert.equal(state.habits[0].name, '독서');
  });

  test('같은 시각에 추가해도 ID가 겹치지 않는다', () => {
    let state = createState();
    state = addHabit(state, 'A', NOW);
    state = addHabit(state, 'B', NOW);
    state = addHabit(state, 'C', NOW);
    assert.equal(new Set(state.habits.map((h) => h.id)).size, 3);
  });

  test('원본을 바꾸지 않는다', () => {
    const original = withHabits('A');
    const next = addHabit(original, 'B', NOW);
    assert.equal(original.habits.length, 1);
    assert.notEqual(next, original);
  });

  test('30자는 허용, 31자는 에러', () => {
    assert.doesNotThrow(() => addHabit(createState(), 'a'.repeat(30), NOW));
    assert.throws(() => addHabit(createState(), 'a'.repeat(31), NOW), errorCode('NAME_TOO_LONG'));
  });

  test('이모지는 한 글자로 센다', () => {
    assert.doesNotThrow(() => addHabit(createState(), '💧'.repeat(30), NOW));
  });

  test('빈 이름은 에러', () => {
    for (const name of ['', '   ', undefined, null, 123]) {
      assert.throws(() => addHabit(createState(), name, NOW), errorCode('EMPTY_NAME'));
    }
  });

  test('중복 이름은 에러 (공백 제거 후 비교)', () => {
    const state = withHabits('독서');
    assert.throws(() => addHabit(state, '독서', NOW), errorCode('DUPLICATE_NAME'));
    assert.throws(() => addHabit(state, ' 독서 ', NOW), errorCode('DUPLICATE_NAME'));
  });
});

describe('renameHabit', () => {
  test('이름을 바꾼다', () => {
    const state = withHabits('A', 'B');
    const id = state.habits[0].id;
    const next = renameHabit(state, id, '  새 이름 ');
    assert.equal(next.habits[0].name, '새 이름');
    assert.equal(next.habits[1].name, 'B');
    assert.equal(state.habits[0].name, 'A');
  });

  test('이름 외 필드(체크 기록 등)는 유지된다', () => {
    let state = withHabits('A');
    const id = state.habits[0].id;
    state = toggleCheck(state, id, '2026-10-05');
    const next = renameHabit(state, id, 'B');
    assert.deepEqual(next.habits[0], { ...state.habits[0], name: 'B' });
  });

  test('자기 자신과 같은 이름으로 바꾸는 것은 허용', () => {
    const state = withHabits('A');
    assert.doesNotThrow(() => renameHabit(state, state.habits[0].id, 'A'));
  });

  test('다른 습관과 같은 이름은 에러', () => {
    const state = withHabits('A', 'B');
    assert.throws(() => renameHabit(state, state.habits[0].id, 'B'), errorCode('DUPLICATE_NAME'));
  });

  test('빈 이름·30자 초과는 에러', () => {
    const state = withHabits('A');
    const id = state.habits[0].id;
    assert.throws(() => renameHabit(state, id, ' '), errorCode('EMPTY_NAME'));
    assert.throws(() => renameHabit(state, id, 'a'.repeat(31)), errorCode('NAME_TOO_LONG'));
  });

  test('없는 ID는 에러', () => {
    assert.throws(() => renameHabit(withHabits('A'), 'h_없음', 'B'), errorCode('NOT_FOUND'));
  });
});

describe('deleteHabit', () => {
  test('습관을 삭제한다', () => {
    const state = withHabits('A', 'B', 'C');
    const next = deleteHabit(state, state.habits[1].id);
    assert.deepEqual(next.habits.map((h) => h.name), ['A', 'C']);
    assert.equal(state.habits.length, 3);
  });

  test('삭제한 이름은 다시 추가할 수 있다', () => {
    const state = withHabits('A');
    const next = deleteHabit(state, state.habits[0].id);
    assert.doesNotThrow(() => addHabit(next, 'A', NOW));
  });

  test('없는 ID는 에러', () => {
    assert.throws(() => deleteHabit(withHabits('A'), 'h_없음'), errorCode('NOT_FOUND'));
  });
});

describe('toggleCheck', () => {
  test('체크하면 날짜가 추가된다', () => {
    const state = withHabits('A');
    const next = toggleCheck(state, state.habits[0].id, '2026-10-05');
    assert.deepEqual(next.habits[0].checks, ['2026-10-05']);
    assert.deepEqual(state.habits[0].checks, []);
  });

  test('두 번 토글하면 원래 상태로 돌아온다', () => {
    let state = withHabits('A', 'B');
    const id = state.habits[0].id;
    state = toggleCheck(state, id, '2026-10-03');
    deepFreeze(state);
    const twice = toggleCheck(toggleCheck(state, id, '2026-10-05'), id, '2026-10-05');
    assert.deepEqual(twice, state);
  });

  test('날짜는 오름차순·중복 없이 유지된다', () => {
    let state = withHabits('A');
    const id = state.habits[0].id;
    for (const d of ['2026-10-05', '2026-09-30', '2026-10-01', '2025-12-31']) {
      state = toggleCheck(state, id, d);
    }
    assert.deepEqual(state.habits[0].checks, ['2025-12-31', '2026-09-30', '2026-10-01', '2026-10-05']);
  });

  test('다른 습관에는 영향을 주지 않는다', () => {
    const state = withHabits('A', 'B');
    const next = toggleCheck(state, state.habits[0].id, '2026-10-05');
    assert.equal(next.habits[1], state.habits[1]);
  });

  test('날짜를 생략하면 오늘로 체크한다', () => {
    const state = withHabits('A');
    const [date] = toggleCheck(state, state.habits[0].id).habits[0].checks;
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('잘못된 날짜는 에러', () => {
    const state = withHabits('A');
    const id = state.habits[0].id;
    assert.throws(() => toggleCheck(state, id, '2026-10-32'), errorCode('INVALID_DATE'));
    assert.throws(() => toggleCheck(state, id, '10/05/2026'), errorCode('INVALID_DATE'));
  });

  test('없는 ID는 에러', () => {
    assert.throws(() => toggleCheck(withHabits('A'), 'h_없음', '2026-10-05'), errorCode('NOT_FOUND'));
  });
});

describe('canCheck', () => {
  const today = '2026-10-05';

  test('오늘부터 6일 전까지(7일)는 가능', () => {
    for (const d of ['2026-10-05', '2026-10-04', '2026-09-29']) assert.equal(canCheck(d, today), true, d);
  });

  test('7일 전, 미래, 잘못된 날짜는 불가', () => {
    for (const d of ['2026-09-28', '2026-10-06', '2026-10-32', '']) assert.equal(canCheck(d, today), false, d);
  });

  test('연초에는 작년 말까지 허용', () => {
    assert.equal(canCheck('2026-12-27', '2027-01-02'), true);
    assert.equal(canCheck('2026-12-26', '2027-01-02'), false);
  });
});
