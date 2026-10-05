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

  const input = el('input', { name: 'name', placeholder: '예: 물 2L 마시기', autocomplete: 'off' });
  input.setAttribute('aria-label', '습관 이름');
  const form = el('form', {}, [input, el('button', { type: 'submit', textContent: '추가' })]);
  const message = el('p', { role: 'alert' });
  const list = el('ul');
  root.replaceChildren(form, message, list);

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

  function renderHabit(habit, date) {
    const checkbox = el('input', { type: 'checkbox', checked: habit.checks.includes(date) });
    checkbox.addEventListener('change', () => update((s) => toggleCheck(s, habit.id, date)));

    const renameButton = el('button', { type: 'button', textContent: '수정' });
    renameButton.addEventListener('click', () => {
      const name = prompt('새 이름', habit.name);
      if (name !== null) update((s) => renameHabit(s, habit.id, name));
    });

    const deleteButton = el('button', { type: 'button', textContent: '삭제' });
    deleteButton.addEventListener('click', () => {
      if (confirm(`'${habit.name}' 습관을 삭제할까요? 기록도 함께 사라집니다.`)) {
        update((s) => deleteHabit(s, habit.id));
      }
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
