// JSON 백업 내보내기/가져오기 (PRD F10).

import { NAME_MAX_LENGTH } from './habits.js';
import { isValidState } from './storage.js';

/** 사람이 읽을 수 있게 들여쓴 JSON 문자열 */
export function exportState(state) {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export function backupFileName(today) {
  return `habit-tracker-backup-${today}.json`;
}

export class ImportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImportError';
  }
}

/**
 * 백업 파일 내용을 검증해 state로 바꾼다. 문제가 있으면 ImportError.
 * 앱에서 만들 수 없는 상태(중복 ID·이름, 잘못된 이름 길이)도 거부한다.
 */
export function importState(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('JSON 파일이 아니거나 내용이 깨졌습니다.');
  }
  if (!isValidState(data)) throw new ImportError('습관 트래커 백업 파일 형식이 아닙니다.');

  const ids = new Set();
  const names = new Set();
  for (const h of data.habits) {
    const name = h.name.trim();
    if (name === '' || [...name].length > NAME_MAX_LENGTH || name !== h.name) {
      throw new ImportError(`잘못된 습관 이름이 있습니다: ${h.name}`);
    }
    if (ids.has(h.id) || names.has(name)) throw new ImportError(`중복된 습관이 있습니다: ${name}`);
    ids.add(h.id);
    names.add(name);
  }

  // 알 수 없는 필드는 버리고, checks는 오름차순·중복 없음으로 정리한다.
  return {
    version: 1,
    habits: data.habits.map(({ id, name, createdAt, checks }) => ({
      id,
      name,
      createdAt,
      checks: [...new Set(checks)].sort(),
    })),
  };
}
