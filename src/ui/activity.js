// 이번 달 달력과 연간 기록(잔디). 보기 전용 — 계산은 core/calendar.js에 맡긴다.

import { WEEKDAYS, LEVELS, monthCalendar, yearWeeks, dailyCounts, activityLevel } from '../core/calendar.js';
import { el } from './dom.js';

// 잔디 왼쪽에는 GitHub처럼 월·수·금만 적는다.
const YEAR_WEEKDAY_LABELS = ['', '월', '', '수', '', '금', ''];

function dayInfo(day, date, counts, max) {
  const count = counts.get(day) ?? 0;
  const future = day > date;
  return {
    count,
    className: `lv-${future ? 0 : activityLevel(count, max)}${day === date ? ' today' : ''}${future ? ' future' : ''}`,
    label: `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 ${count}개 완료`,
  };
}

/** 오늘이 속한 달의 달력 (제목 · 요일 · 1일~말일) */
export function renderMonth(habits, date) {
  const { year, month, weeks } = monthCalendar(date);
  const counts = dailyCounts(habits);

  const head = WEEKDAYS.map((name, i) => el('div', { className: `cal-weekday${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`, textContent: name }));
  const cells = weeks.flat().map((day) => {
    if (!day) return el('div', { className: 'cal-day blank' });
    const { className, label } = dayInfo(day, date, counts, habits.length);
    const cell = el('div', { className: `cal-day ${className}`, title: label }, [el('span', { textContent: Number(day.slice(8)) })]);
    cell.setAttribute('aria-label', label);
    return cell;
  });

  const grid = el('div', { className: 'cal-grid' }, [...head, ...cells]);
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', `${year}년 ${month}월 달력`);

  return [
    el('h2', { className: 'panel-title' }, [
      el('span', { className: 'cal-year', textContent: `${year}년 ` }),
      `${month}월`,
    ]),
    grid,
  ];
}

/** 올해 1/1~12/31 참여량을 한 칸 = 하루로 보여주는 잔디 */
export function renderYear(habits, date) {
  const year = Number(date.slice(0, 4));
  const weeks = yearWeeks(year);
  const counts = dailyCounts(habits);

  let activeDays = 0;
  let totalChecks = 0;
  for (const [day, count] of counts) {
    if (day.startsWith(`${year}-`) && day <= date) {
      activeDays += 1;
      totalChecks += count;
    }
  }

  // 월 이름은 그달 1일이 들어 있는 주(열) 위에 붙인다. 첫 열은 요일 이름 자리.
  const months = el('div', { className: 'year-months' });
  weeks.forEach((week, i) => {
    const first = week.find((day) => day?.endsWith('-01'));
    if (first) {
      const label = el('span', { textContent: `${Number(first.slice(5, 7))}월` });
      label.style.gridColumn = `${i + 2} / span 4`;
      months.append(label);
    }
  });

  // 위에서 아래로 일~토, 왼쪽에서 오른쪽으로 주가 흐른다 (grid-auto-flow: column).
  const cells = weeks.flat().map((day) => {
    if (!day) return el('div', { className: 'year-day blank' });
    const { className, label } = dayInfo(day, date, counts, habits.length);
    return el('div', { className: `year-day ${className}`, title: label });
  });
  const days = el('div', { className: 'year-days' }, [
    ...YEAR_WEEKDAY_LABELS.map((name) => el('span', { className: 'year-weekday', textContent: name })),
    ...cells,
  ]);

  const graph = el('div', { className: 'year-graph' }, [months, days]);
  graph.setAttribute('role', 'img');
  graph.setAttribute('aria-label', `${year}년 참여 기록: ${activeDays}일, 체크 ${totalChecks}회`);

  const legend = el('div', { className: 'year-legend' }, [
    '적음',
    ...Array.from({ length: LEVELS }, (_, lv) => el('span', { className: `year-day lv-${lv}` })),
    '많음',
  ]);

  return [
    el('h2', { className: 'panel-title', textContent: `${year}년 기록` }),
    el('p', { className: 'panel-sub', textContent: `${activeDays}일 참여 · 체크 ${totalChecks}회` }),
    el('div', { className: 'year-scroll' }, [graph]),
    legend,
  ];
}

/** 화면이 좁아 잔디가 가로로 스크롤될 때 오늘이 보이게 맞춘다. 화면에 붙인 뒤 호출 */
export function scrollYearToToday(section) {
  const scroller = section.querySelector('.year-scroll');
  const todayCell = scroller?.querySelector('.today');
  if (!todayCell || scroller.scrollWidth <= scroller.clientWidth) return;
  scroller.scrollLeft = todayCell.offsetLeft - scroller.clientWidth / 2; // .year-scroll이 position: relative
}
