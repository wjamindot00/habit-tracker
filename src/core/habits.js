// 습관 추가·수정·삭제·체크 (PRD F1~F4).
// 모든 함수는 원본 state를 바꾸지 않고 새 state를 반환한다.

import { isDateString, today } from './date.js';

export const NAME_MAX_LENGTH = 30;

/** UI에서 code로 구분해 메시지를 보여줄 수 있는 에러 */
export class HabitError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HabitError';
    this.code = code;
  }
}

export function createState() {
  return { version: 1, habits: [] };
}

// 이름을 다듬고 검증한다. excludeId는 이름 변경 시 자기 자신을 중복 검사에서 빼기 위함.
function validateName(habits, name, excludeId) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new HabitError('EMPTY_NAME', '습관 이름을 입력하세요.');
  }
  const trimmed = name.trim();
  // 이모지 등이 2글자로 세지지 않도록 코드 포인트 단위로 센다.
  if ([...trimmed].length > NAME_MAX_LENGTH) {
    throw new HabitError('NAME_TOO_LONG', `습관 이름은 ${NAME_MAX_LENGTH}자 이하여야 합니다.`);
  }
  if (habits.some((h) => h.id !== excludeId && h.name === trimmed)) {
    throw new HabitError('DUPLICATE_NAME', `이미 있는 습관입니다: ${trimmed}`);
  }
  return trimmed;
}

function findIndex(habits, id) {
  const index = habits.findIndex((h) => h.id === id);
  if (index === -1) throw new HabitError('NOT_FOUND', `습관을 찾을 수 없습니다: ${id}`);
  return index;
}

function replaceAt(habits, index, habit) {
  return habits.map((h, i) => (i === index ? habit : h));
}

/** 습관을 목록 끝에 추가한다. now는 ID·생성일 계산용(테스트에서 고정). */
export function addHabit(state, name, now = new Date()) {
  const trimmed = validateName(state.habits, name);
  // 같은 밀리초에 여러 개를 만들어도 ID가 겹치지 않게 한다.
  let time = now.getTime();
  while (state.habits.some((h) => h.id === `h_${time}`)) time += 1;
  const habit = { id: `h_${time}`, name: trimmed, createdAt: today(now), checks: [] };
  return { ...state, habits: [...state.habits, habit] };
}

export function renameHabit(state, id, name) {
  const index = findIndex(state.habits, id);
  const trimmed = validateName(state.habits, name, id);
  const habit = { ...state.habits[index], name: trimmed };
  return { ...state, habits: replaceAt(state.habits, index, habit) };
}

export function deleteHabit(state, id) {
  findIndex(state.habits, id);
  return { ...state, habits: state.habits.filter((h) => h.id !== id) };
}

/** date(기본: 오늘)의 완료 여부를 뒤집는다. checks는 오름차순·중복 없음을 유지한다. */
export function toggleCheck(state, id, date = today()) {
  if (!isDateString(date)) throw new HabitError('INVALID_DATE', `잘못된 날짜 형식: ${date}`);
  const index = findIndex(state.habits, id);
  const { checks } = state.habits[index];
  const nextChecks = checks.includes(date)
    ? checks.filter((d) => d !== date)
    : [...checks, date].sort(); // YYYY-MM-DD는 문자열 정렬 = 날짜 정렬
  const habit = { ...state.habits[index], checks: nextChecks };
  return { ...state, habits: replaceAt(state.habits, index, habit) };
}
