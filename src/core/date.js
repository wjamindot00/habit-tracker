// 날짜는 항상 로컬 기준 'YYYY-MM-DD' 문자열로 다룬다 (PRD §5.1).
// 내부 계산은 UTC로 해서 시간대·서머타임 영향을 받지 않게 한다.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' 형식이고 실제로 존재하는 날짜인지 */
export function isDateString(value) {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** 사용자 로컬 시간 기준 오늘 날짜. 테스트를 위해 기준 시각을 넘길 수 있다. */
export function today(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** date에서 n일 뒤(음수면 앞) 날짜. 월말·연말·윤년을 넘어가도 정확하다. */
export function addDays(date, n) {
  if (!isDateString(date)) throw new TypeError(`잘못된 날짜 형식: ${date}`);
  if (!Number.isInteger(n)) throw new TypeError(`일수는 정수여야 합니다: ${n}`);
  const [y, mo, d] = date.split('-').map(Number);
  const result = new Date(Date.UTC(y, mo - 1, d + n));
  return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}
