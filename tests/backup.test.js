import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { exportState, importState, backupFileName, ImportError } from '../src/core/backup.js';
import { createState, addHabit, toggleCheck } from '../src/core/habits.js';

function sampleState() {
  let state = createState();
  state = addHabit(state, '물 2L 마시기', new Date(2026, 9, 1));
  state = addHabit(state, '독서 📚', new Date(2026, 9, 2));
  for (const d of ['2026-10-01', '2026-10-02', '2026-10-05']) state = toggleCheck(state, state.habits[0].id, d);
  return state;
}

const habitJson = (h) => JSON.stringify({ version: 1, habits: h });
const base = { id: 'h_1', name: 'A', createdAt: '2026-10-01', checks: [] };

describe('내보내기 → 가져오기', () => {
  test('내보낸 파일을 다시 가져오면 데이터가 동일하다', () => {
    const state = sampleState();
    assert.deepEqual(importState(exportState(state)), state);
  });

  test('빈 상태도 왕복된다', () => {
    assert.deepEqual(importState(exportState(createState())), createState());
  });

  test('내보내기는 읽기 쉬운 JSON', () => {
    const text = exportState(sampleState());
    assert.match(text, /\n {2}"version": 1,/);
  });

  test('파일 이름에 날짜가 들어간다', () => {
    assert.equal(backupFileName('2026-10-05'), 'habit-tracker-backup-2026-10-05.json');
  });
});

describe('importState: 정리', () => {
  test('checks를 정렬하고 중복을 없앤다', () => {
    const state = importState(habitJson([{ ...base, checks: ['2026-10-03', '2026-10-01', '2026-10-03'] }]));
    assert.deepEqual(state.habits[0].checks, ['2026-10-01', '2026-10-03']);
  });

  test('알 수 없는 필드는 버린다', () => {
    const state = importState(JSON.stringify({ version: 1, extra: 1, habits: [{ ...base, color: 'red' }] }));
    assert.deepEqual(state, { version: 1, habits: [base] });
  });
});

describe('importState: 형식 검증', () => {
  const invalid = {
    'JSON 아님': 'hello',
    '깨진 JSON': '{"version":1,',
    '다른 버전': '{"version":2,"habits":[]}',
    'habits 없음': '{"version":1}',
    '필드 누락': habitJson([{ id: 'h_1', name: 'A' }]),
    '잘못된 날짜': habitJson([{ ...base, checks: ['2026-13-01'] }]),
    '빈 이름': habitJson([{ ...base, name: '  ' }]),
    '30자 초과': habitJson([{ ...base, name: 'a'.repeat(31) }]),
    '앞뒤 공백 이름': habitJson([{ ...base, name: ' A ' }]),
    '중복 ID': habitJson([base, { ...base, name: 'B' }]),
    '중복 이름': habitJson([base, { ...base, id: 'h_2' }]),
  };
  for (const [label, text] of Object.entries(invalid)) {
    test(`${label} → ImportError`, () => {
      assert.throws(() => importState(text), ImportError);
    });
  }
});
