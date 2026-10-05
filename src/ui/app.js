// 화면 그리기 + 이벤트 처리. 로직은 모두 core에 맡기고 여기서는 연결만 한다.

import { today } from '../core/date.js';
import { addHabit, renameHabit, deleteHabit, toggleCheck, HabitError } from '../core/habits.js';
import { currentStreak } from '../core/streak.js';
import { load, save } from '../core/storage.js';

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export function mountApp(root) {
  let state = load();
  let editingId = null; // 이름 수정 중인 습관
  let deletingId = null; // 삭제 확인창이 열린 습관

  const input = el('input', { name: 'name', placeholder: '예: 물 2L 마시기', autocomplete: 'off' });
  input.setAttribute('aria-label', '습관 이름');
  const form = el('form', {}, [input, el('button', { type: 'submit', textContent: '추가' })]);
  const message = el('p', { role: 'alert' });
  const list = el('ul');

  // 브라우저 기본 confirm()은 인앱 브라우저 등에서 막힐 수 있어 <dialog>로 직접 띄운다.
  const dialogText = el('p');
  const dialog = el('dialog', {}, [
    dialogText,
    el('form', { method: 'dialog' }, [
      el('button', { value: 'cancel', textContent: '취소' }),
      ' ',
      el('button', { value: 'delete', textContent: '삭제' }),
    ]),
  ]);
  root.replaceChildren(form, message, list, dialog);

  // core 함수로 새 상태를 만들고, 성공하면 저장 후 다시 그린다.
  // 검증 실패(HabitError)는 메시지로 보여주고 false를 반환한다.
  function update(change) {
    try {
      state = change(state);
    } catch (err) {
      if (!(err instanceof HabitError)) throw err;
      message.textContent = err.message;
      return false;
    }
    message.textContent = save(state) ? '' : '저장하지 못했습니다. 저장 공간을 확인하세요.';
    render();
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

  function renderHabit(habit, date) {
    if (habit.id === editingId) return renderEditing(habit);

    const checkbox = el('input', { type: 'checkbox', checked: habit.checks.includes(date) });
    checkbox.addEventListener('change', () => update((s) => toggleCheck(s, habit.id, date)));

    const renameButton = el('button', { type: 'button', textContent: '수정' });
    renameButton.addEventListener('click', () => startEdit(habit.id));

    const deleteButton = el('button', { type: 'button', textContent: '삭제' });
    deleteButton.addEventListener('click', () => {
      deletingId = habit.id;
      dialogText.textContent = `'${habit.name}' 습관을 삭제할까요? 기록도 함께 사라집니다.`;
      dialog.returnValue = '';
      dialog.showModal();
    });

    const streak = currentStreak(habit.checks, date);
    return el('li', {}, [
      el('label', {}, [checkbox, ` ${habit.name}`]),
      ` 🔥 ${streak}일 `,
      renameButton,
      ' ',
      deleteButton,
    ]);
  }

  function render() {
    const date = today();
    list.replaceChildren(...state.habits.map((h) => renderHabit(h, date)));
    if (state.habits.length === 0) list.append(el('li', { textContent: '아직 습관이 없어요. 위에서 추가해 보세요.' }));
  }

  // 취소 버튼·Esc는 returnValue가 'delete'가 아니므로 아무것도 하지 않는다.
  dialog.addEventListener('close', () => {
    const id = deletingId;
    deletingId = null;
    if (dialog.returnValue === 'delete') update((s) => deleteHabit(s, id));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (update((s) => addHabit(s, input.value))) input.value = '';
    input.focus();
  });

  // 자정을 넘겨 탭으로 돌아왔을 때 '오늘' 기준을 새로 잡는다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') render();
  });

  render();
}
