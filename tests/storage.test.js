import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { load, save, isValidState, STORAGE_KEY, CORRUPT_KEY } from '../src/core/storage.js';
import { createState, addHabit, toggleCheck } from '../src/core/habits.js';

// localStorage와 같은 getItem/setItem을 가진 가짜 저장소
function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
}

const throwingStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

function sampleState() {
  let state = addHabit(createState(), '물 2L 마시기', new Date(2026, 9, 5));
  state = toggleCheck(state, state.habits[0].id, '2026-10-04');
  return toggleCheck(state, state.habits[0].id, '2026-10-05');
}

describe('save / load', () => {
  test('저장한 상태를 그대로 불러온다', () => {
    const storage = fakeStorage();
    const state = sampleState();
    assert.equal(save(state, storage), true);
    assert.deepEqual(load(storage), state);
  });

  test('정해진 키에 JSON으로 저장한다', () => {
    const storage = fakeStorage();
    save(sampleState(), storage);
    assert.deepEqual(JSON.parse(storage.data.get(STORAGE_KEY)), sampleState());
  });

  test('저장 실패(용량 부족 등) 시 false, 에러는 던지지 않는다', () => {
    assert.equal(save(sampleState(), throwingStorage), false);
  });

  test('저장소가 없으면 save는 false', () => {
    assert.equal(save(sampleState(), undefined), false);
  });
});

describe('load: 데이터 없음 / 깨진 데이터', () => {
  test('데이터가 없으면 빈 상태', () => {
    assert.deepEqual(load(fakeStorage()), createState());
  });

  test('저장소가 없거나 접근이 막혀도 빈 상태', () => {
    assert.deepEqual(load(undefined), createState());
    assert.deepEqual(load(throwingStorage), createState());
  });

  const broken = {
    '깨진 JSON': '{"version":1,"habits":[',
    '빈 문자열': '',
    'null': 'null',
    '배열': '[]',
    '숫자': '42',
    'version 다름': '{"version":2,"habits":[]}',
    'habits가 배열 아님': '{"version":1,"habits":{}}',
    '습관 필드 누락': '{"version":1,"habits":[{"id":"h_1","name":"A"}]}',
    '잘못된 체크 날짜': '{"version":1,"habits":[{"id":"h_1","name":"A","createdAt":"2026-10-05","checks":["어제"]}]}',
  };
  for (const [label, raw] of Object.entries(broken)) {
    test(`${label} → 빈 상태, 원본은 따로 보관`, () => {
      const storage = fakeStorage({ [STORAGE_KEY]: raw });
      assert.deepEqual(load(storage), createState());
      assert.equal(storage.data.get(CORRUPT_KEY), raw);
    });
  }

  test('깨진 데이터 보관에 실패해도 빈 상태를 반환한다', () => {
    const storage = { getItem: () => '{broken', setItem: throwingStorage.setItem };
    assert.deepEqual(load(storage), createState());
  });
});

describe('isValidState', () => {
  test('정상 상태와 빈 상태는 유효', () => {
    assert.equal(isValidState(createState()), true);
    assert.equal(isValidState(sampleState()), true);
  });

  test('형식이 다르면 무효', () => {
    assert.equal(isValidState(null), false);
    assert.equal(isValidState({ habits: [] }), false);
    assert.equal(isValidState({ version: 1, habits: [null] }), false);
  });
});
