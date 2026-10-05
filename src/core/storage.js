// localStorage 읽기/쓰기 (PRD F6).
// 테스트에서 가짜 저장소를 넘길 수 있도록 storage를 인자로 받는다.

import { isDateString } from './date.js';
import { createState } from './habits.js';

export const STORAGE_KEY = 'habit-tracker:v1';
// 깨진 데이터를 빈 상태로 덮어쓰기 전에 원본을 보관해 두는 곳
export const CORRUPT_KEY = `${STORAGE_KEY}:corrupt`;

function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined; // 브라우저 설정에 따라 접근 자체가 막힐 수 있다
  }
}

function isValidHabit(h) {
  return (
    h !== null &&
    typeof h === 'object' &&
    typeof h.id === 'string' &&
    typeof h.name === 'string' &&
    isDateString(h.createdAt) &&
    Array.isArray(h.checks) &&
    h.checks.every(isDateString)
  );
}

export function isValidState(state) {
  return (
    state !== null &&
    typeof state === 'object' &&
    state.version === 1 &&
    Array.isArray(state.habits) &&
    state.habits.every(isValidHabit)
  );
}

/** 저장된 상태를 읽는다. 데이터가 없거나 깨졌으면 빈 상태를 반환한다. */
export function load(storage = defaultStorage()) {
  let raw;
  try {
    raw = storage?.getItem(STORAGE_KEY);
  } catch {
    return createState();
  }
  if (raw == null) return createState();

  try {
    const state = JSON.parse(raw);
    if (isValidState(state)) return state;
  } catch {
    // 아래에서 깨진 데이터로 처리
  }
  try {
    storage.setItem(CORRUPT_KEY, raw);
  } catch {
    // 보관 실패해도 앱은 계속 동작해야 한다
  }
  return createState();
}

/** 상태를 저장한다. 저장 공간 부족 등으로 실패하면 false. */
export function save(state, storage = defaultStorage()) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
