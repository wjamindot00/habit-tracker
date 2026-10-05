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
import { currentStreak, longestStreak /* , monthlyRate */ } from '../core/streak.js';
import { load, save } from '../core/storage.js';
import { el } from './dom.js';
import { renderMonth, renderYear, scrollYearToToday } from './activity.js';
// [비활성화] 백업 기능 — 다시 쓰려면 이 import와 아래 '[비활성화] 백업' 블록들의 주석을 푼다.
// import { exportState, importState, backupFileName, ImportError } from '../core/backup.js';

// '2026-10-05' → '10/5'
const shortDate = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;

export function mountApp(root) {
  let state = load();
  let editingId = null; // 이름 수정 중인 습관
  let pop = null; // 방금 완료로 바꾼 버튼의 data-focus 키 — 다음 render에서 한 번 튀어 오른다

  const input = el('input', { name: 'name', placeholder: '예: 물 2L 마시기', autocomplete: 'off' });
  input.setAttribute('aria-label', '습관 이름');
  const form = el('form', { className: 'add-form' }, [
    input,
    el('button', { type: 'submit', className: 'btn btn-primary', textContent: '추가' }),
  ]);
  const message = el('p', { role: 'alert', className: 'message' });
  const list = el('ul', { className: 'habit-list' });
  // 이번 달 달력 · 연간 기록 — 보기 전용 (누르는 동작은 디자인 후 추가)
  const monthSection = el('section', { className: 'panel' });
  const yearSection = el('section', { className: 'panel' });

  // [비활성화] 백업
  // const exportButton = el('button', { type: 'button', textContent: '내보내기' });
  // const importButton = el('button', { type: 'button', textContent: '가져오기' });
  // const fileInput = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  // const backup = el('p', {}, ['백업: ', exportButton, ' ', importButton, fileInput]);

  // 브라우저 기본 confirm()은 인앱 브라우저 등에서 막힐 수 있어 <dialog>로 직접 띄운다.
  const dialogText = el('p');
  const dialogOk = el('button', { value: 'ok', className: 'btn btn-danger' });
  const dialog = el('dialog', {}, [
    dialogText,
    el('form', { method: 'dialog', className: 'dialog-actions' }, [
      el('button', { value: 'cancel', className: 'btn', textContent: '취소' }),
      dialogOk,
    ]),
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

  root.replaceChildren(monthSection, form, message, list, yearSection, /* backup, */ dialog);

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

  // 체크 토글. 완료로 바뀌는 경우에만 튀어 오르는 피드백을 준다.
  function toggle(habit, day, focusKey) {
    pop = habit.checks.includes(day) ? null : focusKey;
    update((s) => toggleCheck(s, habit.id, day));
    pop = null;
  }

  // 다시 그린 뒤에도 키보드 포커스가 같은 버튼에 남도록 data-focus 키를 붙인다.
  function focusable(node, key) {
    node.dataset.focus = key;
    if (key === pop) node.classList.add('pop');
    return node;
  }

  function startEdit(id) {
    editingId = id;
    message.textContent = '';
    render();
  }

  function renderEditing(habit) {
    const nameInput = el('input', { value: habit.name, autocomplete: 'off' });
    nameInput.setAttribute('aria-label', '새 이름');
    const cancelButton = el('button', { type: 'button', className: 'btn', textContent: '취소' });
    const editForm = el('form', { className: 'edit-form' }, [
      nameInput,
      el('button', { type: 'submit', className: 'btn btn-primary', textContent: '저장' }),
      cancelButton,
    ]);

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
    return el('li', { className: 'habit' }, [editForm]);
  }

  // 최근 7일 ●○ — 채운 동그라미가 완료한 날. 누르면 그날 기록을 토글한다 (지난 날짜 소급 체크).
  function renderWeek(habit, date) {
    const days = recentDays(date, CHECK_WINDOW_DAYS);
    const buttons = days.map((day) => {
      const done = habit.checks.includes(day);
      const button = el('button', {
        type: 'button',
        className: `day${done ? ' checked' : ''}${day === date ? ' today' : ''}`,
        textContent: Number(day.slice(8)),
        title: day,
      });
      button.setAttribute('aria-label', `${shortDate(day)} ${done ? '완료' : '미완료'}`);
      button.setAttribute('aria-pressed', String(done));
      button.addEventListener('click', () => {
        if (canCheck(day, today())) toggle(habit, day, button.dataset.focus);
      });
      return focusable(button, `day:${habit.id}:${day}`);
    });
    const week = el('div', { className: 'week' }, buttons);
    week.setAttribute('role', 'group');
    week.setAttribute('aria-label', `최근 7일 (${shortDate(days[0])}~${shortDate(date)})`);
    return week;
  }

  function renderHabit(habit, date) {
    if (habit.id === editingId) return renderEditing(habit);

    const doneToday = habit.checks.includes(date);
    const checkbox = el('input', { type: 'checkbox', checked: doneToday });
    checkbox.addEventListener('change', () => toggle(habit, date, checkbox.dataset.focus));
    focusable(checkbox, `check:${habit.id}`);

    const renameButton = el('button', { type: 'button', className: 'btn btn-small', textContent: '수정' });
    renameButton.addEventListener('click', () => startEdit(habit.id));
    focusable(renameButton, `rename:${habit.id}`);

    const deleteButton = el('button', { type: 'button', className: 'btn btn-small', textContent: '삭제' });
    deleteButton.addEventListener('click', () => {
      askConfirm(`'${habit.name}' 습관을 삭제할까요? 기록도 함께 사라집니다.`, '삭제', () =>
        update((s) => deleteHabit(s, habit.id)),
      );
    });

    const stats = `🔥 ${currentStreak(habit.checks, date)}일 · 최장 ${longestStreak(habit.checks)}일`;
    // [비활성화] 이번 달 달성률 — 알려진 문제: 만든 날 이전 소급 체크가 빠지고, 아직 안 한 오늘이 분모에 들어감.
    // const month = monthlyRate(habit.checks, date, habit.createdAt);
    // stats += ` · 이번 달 ${Math.round(month.rate * 100)}% (${month.done}/${month.total})`; // stats를 let으로

    return el('li', { className: `habit${doneToday ? ' done' : ''}` }, [
      el('div', { className: 'habit-top' }, [
        el('label', { className: 'habit-check' }, [checkbox, el('span', { className: 'habit-name', textContent: habit.name })]),
        renameButton,
        deleteButton,
      ]),
      el('div', { className: 'habit-stats', textContent: stats }),
      renderWeek(habit, date),
    ]);
  }

  function render() {
    const date = today();
    const focusKey = document.activeElement?.dataset?.focus;
    list.replaceChildren(...state.habits.map((h) => renderHabit(h, date)));
    if (state.habits.length === 0) {
      list.append(
        el('li', { className: 'empty' }, [
          el('strong', { textContent: '아직 습관이 없어요' }),
          '매일 지키고 싶은 일을 위에 적고 Enter를 눌러 보세요.',
        ]),
      );
    }
    monthSection.replaceChildren(...renderMonth(state.habits, date));
    yearSection.replaceChildren(...renderYear(state.habits, date));
    scrollYearToToday(yearSection);
    if (focusKey) [...list.querySelectorAll('[data-focus]')].find((n) => n.dataset.focus === focusKey)?.focus();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (update((s) => addHabit(s, input.value))) input.value = '';
    input.focus();
  });

  // [비활성화] 백업
  // exportButton.addEventListener('click', () => {
  //   const url = URL.createObjectURL(new Blob([exportState(state)], { type: 'application/json' }));
  //   el('a', { href: url, download: backupFileName(today()) }).click();
  //   setTimeout(() => URL.revokeObjectURL(url), 0);
  // });
  //
  // importButton.addEventListener('click', () => fileInput.click());
  // fileInput.addEventListener('change', async () => {
  //   const [file] = fileInput.files;
  //   fileInput.value = ''; // 같은 파일을 다시 골라도 change가 발생하도록
  //   if (!file) return;
  //   let imported;
  //   try {
  //     imported = importState(await file.text());
  //   } catch (err) {
  //     if (!(err instanceof ImportError)) throw err;
  //     message.textContent = `가져오기 실패: ${err.message}`;
  //     return;
  //   }
  //   askConfirm(`습관 ${imported.habits.length}개를 가져옵니다. 지금 기록은 모두 바뀝니다. 계속할까요?`, '가져오기', () => {
  //     editingId = null;
  //     commit(imported);
  //   });
  // });

  // 자정을 넘겨 탭으로 돌아왔을 때 '오늘' 기준을 새로 잡는다. 이름 수정 중에는 입력이 날아가지 않게 건너뛴다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && editingId === null) render();
  });

  render();
}
