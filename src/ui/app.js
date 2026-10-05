// 화면 그리기 + 이벤트 처리. 로직은 모두 core에 맡기고 여기서는 연결만 한다.

import { today, recentDays } from '../core/date.js';
import {
  addHabit,
  renameHabit,
  deleteHabit,
  toggleCheck,
  canCheck,
  CHECK_WINDOW_DAYS,
  HabitError,
} from '../core/habits.js';
import { currentStreak, longestStreak, monthlyRate } from '../core/streak.js';
import { load, save } from '../core/storage.js';
import { exportState, importState, backupFileName, ImportError } from '../core/backup.js';

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// '2026-10-05' → '10/5'
const shortDate = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;

export function mountApp(root) {
  let state = load();
  let editingId = null; // 이름 수정 중인 습관

  const input = el('input', { name: 'name', placeholder: '예: 물 2L 마시기', autocomplete: 'off' });
  input.setAttribute('aria-label', '습관 이름');
  const form = el('form', {}, [input, el('button', { type: 'submit', textContent: '추가' })]);
  const message = el('p', { role: 'alert' });
  const list = el('ul');

  const exportButton = el('button', { type: 'button', textContent: '내보내기' });
  const importButton = el('button', { type: 'button', textContent: '가져오기' });
  const fileInput = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  const backup = el('p', {}, ['백업: ', exportButton, ' ', importButton, fileInput]);

  // 브라우저 기본 confirm()은 인앱 브라우저 등에서 막힐 수 있어 <dialog>로 직접 띄운다.
  const dialogText = el('p');
  const dialogOk = el('button', { value: 'ok' });
  const dialog = el('dialog', {}, [
    dialogText,
    el('form', { method: 'dialog' }, [el('button', { value: 'cancel', textContent: '취소' }), ' ', dialogOk]),
  ]);
  let onDialogOk = null;
  // 취소 버튼·Esc는 returnValue가 'ok'가 아니므로 아무것도 하지 않는다.
  dialog.addEventListener('close', () => {
    const action = onDialogOk;
    onDialogOk = null;
    if (dialog.returnValue === 'ok') action?.();
  });

  function askConfirm(text, okLabel, action) {
    dialogText.textContent = text;
    dialogOk.textContent = okLabel;
    onDialogOk = action;
    dialog.returnValue = '';
    dialog.showModal();
  }

  root.replaceChildren(form, message, list, backup, dialog);

  function commit(next) {
    state = next;
    message.textContent = save(state) ? '' : '저장하지 못했습니다. 저장 공간을 확인하세요.';
    render();
  }

  // core 함수로 새 상태를 만들고, 성공하면 저장 후 다시 그린다.
  // 검증 실패(HabitError)는 메시지로 보여주고 false를 반환한다.
  function update(change) {
    let next;
    try {
      next = change(state);
    } catch (err) {
      if (!(err instanceof HabitError)) throw err;
      message.textContent = err.message;
      return false;
    }
    commit(next);
    return true;
  }

  function startEdit(id) {
    editingId = id;
    message.textContent = '';
    render();
  }

  function renderEditing(habit) {
    const nameInput = el('input', { value: habit.name, autocomplete: 'off' });
    nameInput.setAttribute('aria-label', '새 이름');
    const cancelButton = el('button', { type: 'button', textContent: '취소' });
    const editForm = el('form', {}, [nameInput, ' ', el('button', { type: 'submit', textContent: '저장' }), ' ', cancelButton]);

    const cancel = () => startEdit(null);
    cancelButton.addEventListener('click', cancel);
    nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') cancel();
    });
    editForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const id = editingId;
      editingId = null;
      if (!update((s) => renameHabit(s, id, nameInput.value))) editingId = id; // 실패하면 수정 상태 유지
    });

    queueMicrotask(() => nameInput.focus());
    return el('li', {}, [editForm]);
  }

  // 최근 7일 ●○. 누르면 그날 기록을 토글한다 (지난 날짜 소급 체크).
  function renderWeek(habit, date) {
    const days = recentDays(date, CHECK_WINDOW_DAYS);
    const buttons = days.map((day) => {
      const done = habit.checks.includes(day);
      const button = el('button', { type: 'button', textContent: done ? '●' : '○', title: day });
      button.setAttribute('aria-label', `${shortDate(day)} ${done ? '완료' : '미완료'}`);
      button.setAttribute('aria-pressed', String(done));
      button.addEventListener('click', () => {
        if (canCheck(day, today())) update((s) => toggleCheck(s, habit.id, day));
      });
      return button;
    });
    return el('div', {}, [`${shortDate(days[0])}~${shortDate(date)} `, ...buttons]);
  }

  function renderHabit(habit, date) {
    if (habit.id === editingId) return renderEditing(habit);

    const checkbox = el('input', { type: 'checkbox', checked: habit.checks.includes(date) });
    checkbox.addEventListener('change', () => update((s) => toggleCheck(s, habit.id, date)));

    const renameButton = el('button', { type: 'button', textContent: '수정' });
    renameButton.addEventListener('click', () => startEdit(habit.id));

    const deleteButton = el('button', { type: 'button', textContent: '삭제' });
    deleteButton.addEventListener('click', () => {
      askConfirm(`'${habit.name}' 습관을 삭제할까요? 기록도 함께 사라집니다.`, '삭제', () =>
        update((s) => deleteHabit(s, habit.id)),
      );
    });

    const month = monthlyRate(habit.checks, date, habit.createdAt);
    const stats =
      `🔥 ${currentStreak(habit.checks, date)}일 · 최장 ${longestStreak(habit.checks)}일 · ` +
      `이번 달 ${Math.round(month.rate * 100)}% (${month.done}/${month.total})`;

    return el('li', {}, [
      el('div', {}, [el('label', {}, [checkbox, ` ${habit.name}`]), ' ', renameButton, ' ', deleteButton]),
      el('div', { textContent: stats }),
      renderWeek(habit, date),
    ]);
  }

  function render() {
    const date = today();
    list.replaceChildren(...state.habits.map((h) => renderHabit(h, date)));
    if (state.habits.length === 0) list.append(el('li', { textContent: '아직 습관이 없어요. 위에서 추가해 보세요.' }));
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (update((s) => addHabit(s, input.value))) input.value = '';
    input.focus();
  });

  exportButton.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([exportState(state)], { type: 'application/json' }));
    el('a', { href: url, download: backupFileName(today()) }).click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });

  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const [file] = fileInput.files;
    fileInput.value = ''; // 같은 파일을 다시 골라도 change가 발생하도록
    if (!file) return;
    let imported;
    try {
      imported = importState(await file.text());
    } catch (err) {
      if (!(err instanceof ImportError)) throw err;
      message.textContent = `가져오기 실패: ${err.message}`;
      return;
    }
    askConfirm(`습관 ${imported.habits.length}개를 가져옵니다. 지금 기록은 모두 바뀝니다. 계속할까요?`, '가져오기', () => {
      editingId = null;
      commit(imported);
    });
  });

  // 자정을 넘겨 탭으로 돌아왔을 때 '오늘' 기준을 새로 잡는다. 이름 수정 중에는 입력이 날아가지 않게 건너뛴다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && editingId === null) render();
  });

  render();
}
