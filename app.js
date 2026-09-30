'use strict';

/* =========================================================================
 * 학습 진도 계획표 — app.js
 *
 * 구성
 *   1. 날짜 유틸 (로컬 날짜 YYYY-MM-DD 문자열만 사용)
 *   2. 계획 계산 (균등 분배, 누적 목표)
 *   3. 책/강의 도메인 헬퍼 (챕터 범위, 단위 변환)
 *   4. 목표(Goal) 생성 · 검증 · 진도 기록
 *   5. 저장소 (localStorage — 나중에 DB로 교체할 경계)
 *   6. 자가 검증 (콘솔 출력)
 *   7. 화면 렌더링 (2단계부터)
 * ========================================================================= */

/* =========================================================================
 * 1. 날짜 유틸
 *    - 모든 날짜는 'YYYY-MM-DD' 문자열로 다룬다.
 *    - toISOString()처럼 UTC로 바꾸는 함수는 쓰지 않는다 (하루 밀림 방지).
 * ========================================================================= */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 화면 표시 순서: 월~일

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' → 로컬 자정 Date */
function parseDate(str) {
  const [, y, m, d] = str.match(DATE_RE).map(Number);
  return new Date(y, m - 1, d);
}

/** Date → 로컬 기준 'YYYY-MM-DD' */
function formatDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function todayStr() {
  return formatDate(new Date());
}

function isValidDateStr(str) {
  if (typeof str !== 'string' || !DATE_RE.test(str)) return false;
  return formatDate(parseDate(str)) === str; // 2026-02-30 같은 값 걸러냄
}

function addDays(str, n) {
  const d = parseDate(str);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

/** b - a (일 단위). 서머타임 영향을 받지 않도록 연·월·일만으로 계산 */
function diffDays(a, b) {
  const [, y1, m1, d1] = a.match(DATE_RE).map(Number);
  const [, y2, m2, d2] = b.match(DATE_RE).map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** 시작일과 마감일을 모두 포함한 일수 */
function countDaysInclusive(start, end) {
  return diffDays(start, end) + 1;
}

function weekdayKo(str) {
  return WEEKDAYS_KO[parseDate(str).getDay()];
}

/* =========================================================================
 * 2. 계획 계산
 *
 * Plan = {
 *   startDate: 'YYYY-MM-DD',  // 분배 시작일 (포함)
 *   endDate:   'YYYY-MM-DD',  // 분배 마감일 (포함)
 *   from:      number,        // 시작 시점에 이미 끝낸 단위 수 (최초 계획은 0)
 *   to:        number,        // 전체 단위 수 N
 *   restWeekdays: number[],   // 쉬는 요일 (0=일 ~ 6=토). 이 요일에는 분량을 배정하지 않는다
 *   createdAt: ISO 문자열
 * }
 * 날짜별 표는 저장하지 않고 이 값들로 매번 계산한다 (저장 데이터를 작게, 항상 일관되게).
 * D = 기간 중 공부하는 날 수, k번째 공부하는 날(1부터) 누적 = from + round((to - from) * k / D)
 * ========================================================================= */

function createPlan(startDate, endDate, from, to, restWeekdays = []) {
  return { startDate, endDate, from, to, restWeekdays: [...restWeekdays], createdAt: new Date().toISOString() };
}

function isRestWeekday(restWeekdays, date) {
  return (restWeekdays || []).includes(parseDate(date).getDay());
}

/** start~end(포함) 중 쉬는 요일을 뺀 공부하는 날 수 */
function countStudyDays(start, end, restWeekdays) {
  let count = 0;
  const days = countDaysInclusive(start, end);
  for (let i = 0; i < days; i++) {
    if (!isRestWeekday(restWeekdays, addDays(start, i))) count++;
  }
  return count;
}

/** k번째 공부하는 날(1..D)의 누적 목표 */
function cumulativeAt(plan, k, D) {
  return plan.from + Math.round(((plan.to - plan.from) * k) / D);
}

/**
 * 계획의 날짜별 행 목록
 * 쉬는 요일 행은 isRestDay: true, 분량 0.
 * (방어 코드) 공부하는 날이 하나도 없으면 마지막 날에 전부 배정한다.
 */
function buildSchedule(plan) {
  const days = countDaysInclusive(plan.startDate, plan.endDate);
  let D = countStudyDays(plan.startDate, plan.endDate, plan.restWeekdays);
  const noStudyDay = D === 0;
  if (noStudyDay) D = 1;

  const rows = [];
  let prev = plan.from;
  let k = 0;
  for (let i = 1; i <= days; i++) {
    const date = addDays(plan.startDate, i - 1);
    const isRestDay = noStudyDay ? i < days : isRestWeekday(plan.restWeekdays, date);
    if (!isRestDay) k++;
    const cumulative = cumulativeAt(plan, k, D);
    rows.push({
      index: i,
      date,
      isRestDay,              // 쉬는 요일
      prevCumulative: prev,   // 전날까지 누적
      cumulative,             // 오늘까지 누적 목표
      amount: cumulative - prev, // 오늘 분량 (0이면 휴식)
    });
    prev = cumulative;
  }
  return rows;
}

/** 특정 날짜의 누적 목표 (계획 시작 전이면 from, 마감 후면 to) */
function cumulativeOnDate(plan, date) {
  if (diffDays(plan.startDate, date) < 0) return plan.from;
  if (diffDays(plan.endDate, date) >= 0) return plan.to;
  return buildSchedule(plan).find((r) => r.date === date).cumulative;
}

/* =========================================================================
 * 3. 책 / 강의 도메인 헬퍼
 *
 * 책 진도의 기준값은 "마지막으로 읽은 페이지 번호"이고,
 * 계획은 "단위 수"로 계산하므로 둘 사이를 변환하는 함수를 둔다.
 *   페이지 단위 수 = 마지막으로 읽은 페이지 - (첫 챕터 시작 페이지 - 1)
 * ========================================================================= */

/** 챕터 목록에 끝 페이지를 붙여 반환: [{ index, name, startPage, endPage }] */
function getChapterRanges(book) {
  return book.chapters.map((ch, i) => ({
    index: i,
    name: ch.name,
    startPage: ch.startPage,
    endPage: i < book.chapters.length - 1 ? book.chapters[i + 1].startPage - 1 : book.lastPage,
  }));
}

function bookFirstPage(book) {
  return book.chapters[0].startPage;
}

function bookTotalPages(book) {
  return book.lastPage - bookFirstPage(book) + 1;
}

/** 페이지 번호 → 읽은 페이지 수 */
function pageToUnits(book, page) {
  return clamp(page - (bookFirstPage(book) - 1), 0, bookTotalPages(book));
}

/** 읽은 페이지 수 → 페이지 번호 */
function unitsToPage(book, units) {
  return bookFirstPage(book) - 1 + units;
}

/** 끝 페이지까지 다 읽은 챕터 수 */
function completedChapterCount(book, lastReadPage) {
  return getChapterRanges(book).filter((ch) => ch.endPage <= lastReadPage).length;
}

/** 완료 챕터 수 → 그 챕터의 끝 페이지 (0개면 첫 페이지 - 1) */
function chapterCountToPage(book, count) {
  if (count <= 0) return bookFirstPage(book) - 1;
  const ranges = getChapterRanges(book);
  return ranges[Math.min(count, ranges.length) - 1].endPage;
}

/** 페이지 범위에 걸치는 챕터들과, 각 챕터를 얼마나 덮는지 */
function chaptersInPageRange(book, startPage, endPage) {
  return getChapterRanges(book)
    .filter((ch) => ch.endPage >= startPage && ch.startPage <= endPage)
    .map((ch) => ({
      ...ch,
      coversChapterStart: startPage <= ch.startPage,
      coversChapterEnd: endPage >= ch.endPage,
    }));
}

/** 강의 제목 텍스트 → 배열 (빈 줄 무시) */
function parseLectureLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

/* =========================================================================
 * 4. 목표(Goal)
 *
 * Goal = {
 *   id, type: 'book' | 'lecture', title, startDate, dueDate, createdAt, updatedAt,
 *   restWeekdays: number[],                  // 쉬는 요일 (0=일 ~ 6=토)
 *   book?:    { chapters: [{ name, startPage }], lastPage, author? },
 *   lecture?: { titles: [string] },
 *   progress: {
 *     current: number,                       // 책: 마지막으로 읽은 페이지 / 강의: 완료한 강의 수
 *     history: [{ date: 'YYYY-MM-DD', value }] // 날짜당 마지막 값 하나
 *   },
 *   plans: {                                  // 기준(basis)별 계획
 *     [basis]: { original: Plan, current: Plan | null }  // current는 재분배 후에만 존재
 *   }
 * }
 * basis: 책 → 'page', 'chapter' / 강의 → 'lecture'
 * ========================================================================= */

const BASES_BY_TYPE = {
  book: ['page', 'chapter'],
  lecture: ['lecture'],
};

function generateId() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getBases(goal) {
  return BASES_BY_TYPE[goal.type];
}

/** 기준별 전체 단위 수 N */
function getTotalUnits(goal, basis) {
  if (basis === 'page') return bookTotalPages(goal.book);
  if (basis === 'chapter') return goal.book.chapters.length;
  return goal.lecture.titles.length;
}

/** 기준별 완료 단위 수 (진도 기준값 하나에서 계산) */
function getDoneUnits(goal, basis) {
  const cur = goal.progress.current;
  if (basis === 'page') return pageToUnits(goal.book, cur);
  if (basis === 'chapter') return completedChapterCount(goal.book, cur);
  return cur;
}

/** 기준별 단위 수 → 진도 기준값(페이지 번호 / 강의 수) */
function unitsToProgressValue(goal, basis, units) {
  if (basis === 'page') return unitsToPage(goal.book, units);
  if (basis === 'chapter') return chapterCountToPage(goal.book, units);
  return units;
}

/** 진도 기준값의 최소/최대 */
function getProgressBounds(goal) {
  if (goal.type === 'book') {
    return { min: bookFirstPage(goal.book) - 1, max: goal.book.lastPage };
  }
  return { min: 0, max: goal.lecture.titles.length };
}

/** 지금 적용 중인 계획 (재분배했으면 current, 아니면 original) */
function getActivePlan(goal, basis) {
  const p = goal.plans[basis];
  return p.current || p.original;
}

function buildInitialPlans(goal) {
  const plans = {};
  for (const basis of getBases(goal)) {
    plans[basis] = {
      original: createPlan(goal.startDate, goal.dueDate, 0, getTotalUnits(goal, basis), goal.restWeekdays),
      current: null,
    };
  }
  return plans;
}

function createBookGoal({ title, startDate, dueDate, restWeekdays = [], chapters, lastPage, author = '', requiredBookId = null }) {
  const now = new Date().toISOString();
  const goal = {
    id: generateId(),
    type: 'book',
    title: title.trim(),
    startDate,
    dueDate,
    restWeekdays: normalizeWeekdays(restWeekdays),
    createdAt: now,
    updatedAt: now,
    book: {
      chapters: chapters.map((c) => ({ name: c.name.trim(), startPage: Number(c.startPage) })),
      lastPage: Number(lastPage),
    },
    progress: { current: 0, history: [] },
    plans: null,
  };
  if (author && author.trim()) goal.book.author = author.trim();
  if (requiredBookId) goal.requiredBookId = requiredBookId; // 사역자 필독서로 만든 목표
  goal.progress.current = bookFirstPage(goal.book) - 1;
  goal.plans = buildInitialPlans(goal);
  return goal;
}

function createLectureGoal({ title, startDate, dueDate, restWeekdays = [], titles }) {
  const now = new Date().toISOString();
  const goal = {
    id: generateId(),
    type: 'lecture',
    title: title.trim(),
    startDate,
    dueDate,
    restWeekdays: normalizeWeekdays(restWeekdays),
    createdAt: now,
    updatedAt: now,
    lecture: { titles: [...titles] },
    progress: { current: 0, history: [] },
    plans: null,
  };
  goal.plans = buildInitialPlans(goal);
  return goal;
}

/** 쉬는 요일 배열 정리 (중복 제거, 정렬) */
function normalizeWeekdays(list) {
  return [...new Set((list || []).map(Number))].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
}

function getRestWeekdays(goal) {
  return goal.restWeekdays || [];
}

/* ----- 검증: 오류 메시지 배열을 반환 (빈 배열이면 통과) ----- */

function validateCommonInput({ title, startDate, dueDate, restWeekdays = [] }) {
  const errors = [];
  if (!title || !title.trim()) errors.push('이름을 입력하세요.');
  if (!isValidDateStr(startDate)) errors.push('시작일이 올바르지 않습니다.');
  if (!isValidDateStr(dueDate)) errors.push('마감일이 올바르지 않습니다.');
  if (normalizeWeekdays(restWeekdays).length === 7) {
    errors.push('쉬는 요일을 모두 선택할 수는 없습니다.');
  } else if (isValidDateStr(startDate) && isValidDateStr(dueDate)) {
    if (diffDays(startDate, dueDate) < 0) errors.push('마감일은 시작일과 같거나 뒤여야 합니다.');
    else if (countStudyDays(startDate, dueDate, restWeekdays) === 0) {
      errors.push('기간 안에 공부하는 날이 없습니다. 기간이나 쉬는 요일을 바꾸세요.');
    }
  }
  return errors;
}

function validateBookInput(input) {
  return [...validateCommonInput(input), ...validateBookStructure(input)];
}

/** 책 구성(챕터·마지막 페이지) 검증 — 목표 입력과 필독서 관리에서 공용 */
function validateBookStructure(input) {
  const errors = [];
  const { chapters, lastPage } = input;
  const last = Number(lastPage);

  if (!Number.isInteger(last) || last < 1) errors.push('마지막 페이지를 1 이상의 정수로 입력하세요.');
  if (!chapters || chapters.length === 0) {
    errors.push('챕터를 한 개 이상 입력하세요.');
    return errors;
  }

  chapters.forEach((ch, i) => {
    const label = `${i + 1}번째 챕터`;
    const start = Number(ch.startPage);
    if (!ch.name || !ch.name.trim()) errors.push(`${label}: 이름을 입력하세요.`);
    if (!Number.isInteger(start) || start < 1) {
      errors.push(`${label}: 시작 페이지를 1 이상의 정수로 입력하세요.`);
      return;
    }
    if (i > 0 && start <= Number(chapters[i - 1].startPage)) {
      errors.push(`${label}: 시작 페이지가 앞 챕터보다 커야 합니다 (오름차순).`);
    }
    if (Number.isInteger(last) && start > last) {
      errors.push(`${label}: 시작 페이지가 마지막 페이지(${last})보다 큽니다.`);
    }
  });
  return errors;
}

function validateLectureInput(input) {
  const errors = validateCommonInput(input);
  if (!input.titles || input.titles.length === 0) errors.push('강의 제목을 한 줄 이상 입력하세요.');
  return errors;
}

/* ----- 진도 기록 ----- */

/** 진도 기준값을 바꾸고 history에 기록 (같은 날은 마지막 값만 유지) */
function setProgress(goal, value, date = todayStr()) {
  const { min, max } = getProgressBounds(goal);
  const v = clamp(Math.round(value), min, max);
  goal.progress.current = v;

  const history = goal.progress.history;
  const existing = history.find((h) => h.date === date);
  if (existing) existing.value = v;
  else {
    history.push({ date, value: v });
    history.sort((a, b) => diffDays(b.date, a.date));
  }
  goal.updatedAt = new Date().toISOString();
  return goal;
}

/** 계획표 행의 체크 상태 (저장하지 않고 계산) */
function isRowChecked(goal, basis, row) {
  return getDoneUnits(goal, basis) >= row.cumulative;
}

/** 체크박스 조작: 체크 → 그날 누적 목표로, 해제 → 전날 누적 목표로 */
function applyRowCheck(goal, basis, row, checked, date = todayStr()) {
  const units = checked ? row.cumulative : row.prevCumulative;
  return setProgress(goal, unitsToProgressValue(goal, basis, units), date);
}

/* ----- 목표 수정 ----- */

/** 진도를 한 번이라도 기록했거나 시작일이 지났으면 "진행 중"으로 본다 */
function hasGoalStarted(goal, today = todayStr()) {
  return goal.progress.history.length > 0 || goal.plans[getBases(goal)[0]].current !== null
    || diffDays(goal.startDate, today) > 0;
}

/** 수정 입력 추가 검증: 진행 중인 목표는 오늘부터 재분배하므로 마감일이 오늘 이후여야 한다 */
function validateGoalEdit(goal, input, today = todayStr()) {
  const errors = goal.type === 'book' ? validateBookInput(input) : validateLectureInput(input);
  // 이름만 바꾸는 등 계획에 영향이 없는 수정은 날짜 제한을 두지 않는다 (마감 지난 목표도 이름 수정 가능)
  if (errors.length || !isPlanAffectingEdit(goal, input)) return errors;
  if (hasGoalStarted(goal, today) && isValidDateStr(input.dueDate) && diffDays(today, input.dueDate) < 0) {
    errors.push('진행 중인 목표는 마감일을 오늘 이후로 정해야 합니다.');
  } else if (hasGoalStarted(goal, today) && isValidDateStr(input.dueDate) && isValidDateStr(input.startDate)
    && normalizeWeekdays(input.restWeekdays).length < 7) {
    const from = diffDays(today, input.startDate) > 0 ? input.startDate : today;
    if (countStudyDays(from, input.dueDate, input.restWeekdays) === 0) {
      errors.push('오늘부터 마감일까지 공부하는 날이 없습니다. 마감일이나 쉬는 요일을 바꾸세요.');
    }
  }
  return errors;
}

/** 책 구성(챕터·마지막 페이지)을 같은 형식의 문자열로 (비교용) */
function bookSignature(chapters, lastPage) {
  return JSON.stringify({
    c: chapters.map((c) => [String(c.name).trim(), Number(c.startPage)]),
    l: Number(lastPage),
  });
}

function isBookStructureChanged(goal, input) {
  return bookSignature(goal.book.chapters, goal.book.lastPage) !== bookSignature(input.chapters, input.lastPage);
}

/** 계획에 영향을 주는 값(날짜·쉬는 요일·챕터·강의 목록)이 바뀌었는지 */
function isPlanAffectingEdit(goal, input) {
  if (goal.startDate !== input.startDate || goal.dueDate !== input.dueDate) return true;
  if (getRestWeekdays(goal).join() !== normalizeWeekdays(input.restWeekdays).join()) return true;
  if (goal.type === 'book') return isBookStructureChanged(goal, input);
  return JSON.stringify(goal.lecture.titles) !== JSON.stringify(input.titles);
}

/**
 * 목표 수정 적용
 *  - 시작 전(진도 기록 없음, 시작일이 오늘 이후)이면 원래 계획을 새로 만든다.
 *  - 진행 중이면 원래 계획은 보관하고, 오늘(또는 시작일)부터 마감일까지 남은 분량으로 재분배한다.
 *  - 이름만 바뀌었으면 계획은 그대로 둔다.
 */
function applyGoalEdit(goal, input, today = todayStr()) {
  const started = hasGoalStarted(goal, today);
  const planChanged = isPlanAffectingEdit(goal, input);

  goal.title = input.title.trim();
  goal.startDate = input.startDate;
  goal.dueDate = input.dueDate;
  goal.restWeekdays = normalizeWeekdays(input.restWeekdays);
  if (goal.type === 'book') {
    goal.book = {
      chapters: input.chapters.map((c) => ({ name: c.name.trim(), startPage: Number(c.startPage) })),
      lastPage: Number(input.lastPage),
    };
    if (input.author && input.author.trim()) goal.book.author = input.author.trim();
  } else {
    goal.lecture = { titles: [...input.titles] };
  }
  // 목록이 줄어 진도가 범위를 벗어나면 맞춰 주고, 기록에도 남긴다
  const { min, max } = getProgressBounds(goal);
  if (goal.progress.current !== clamp(goal.progress.current, min, max)) {
    setProgress(goal, goal.progress.current, today);
  }
  goal.updatedAt = new Date().toISOString();

  if (!planChanged) return goal;
  if (!started) {
    goal.plans = buildInitialPlans(goal);
    return goal;
  }
  return replanGoal(goal, today);
}

/**
 * 재분배: 오늘(시작 전이면 시작일)부터 마감일까지 남은 분량을 균등 분배한 새 "현재 계획"을 만든다.
 * 원래 계획(최초)은 그대로 두고, 현재 계획은 가장 최근 것 하나만 유지한다.
 */
function replanGoal(goal, today = todayStr()) {
  const planStart = diffDays(today, goal.startDate) > 0 ? goal.startDate : today;
  for (const basis of getBases(goal)) {
    const total = getTotalUnits(goal, basis);
    goal.plans[basis].current = createPlan(planStart, goal.dueDate, Math.min(getDoneUnits(goal, basis), total), total,
      getRestWeekdays(goal));
  }
  goal.updatedAt = new Date().toISOString();
  return goal;
}

/** 재분배 가능 여부 (불가능하면 이유 문자열) */
function getReplanBlocker(goal, today = todayStr()) {
  const s = getGoalSummary(goal, undefined, today);
  if (s.isComplete) return '이미 완료한 목표입니다.';
  if (s.isOverdue) return '마감일이 지났습니다. 마감일을 변경해 주세요.';
  if (!hasGoalStarted(goal, today)) return '아직 시작 전이라 재분배할 필요가 없습니다.';
  if (s.remainingStudyDays === 0) return '오늘부터 마감일까지 공부하는 날이 없습니다. 마감일을 변경해 주세요.';
  return null;
}

/** 목표 → 입력 폼 형식 (수정·마감일 변경에 공용) */
function goalToInput(goal) {
  return {
    type: goal.type,
    title: goal.title,
    startDate: goal.startDate,
    dueDate: goal.dueDate,
    restWeekdays: [...getRestWeekdays(goal)],
    chapters: goal.type === 'book' ? goal.book.chapters.map((c) => ({ ...c })) : [],
    lastPage: goal.type === 'book' ? goal.book.lastPage : NaN,
    author: goal.type === 'book' ? getBookAuthor(goal) : '',
    titles: goal.type === 'lecture' ? [...goal.lecture.titles] : [],
  };
}

function getBookAuthor(goal) {
  return (goal.book && goal.book.author) || '';
}

/** 마감일 변경 검증 / 적용 (수정과 같은 규칙: 진행 중이면 재분배, 시작 전이면 원래 계획 새로 생성) */
function validateDueDateChange(goal, dueDate, today = todayStr()) {
  return validateGoalEdit(goal, { ...goalToInput(goal), dueDate }, today);
}

function changeDueDate(goal, dueDate, today = todayStr()) {
  return applyGoalEdit(goal, { ...goalToInput(goal), dueDate }, today);
}

/* ----- 현황 요약 (대시보드·상세 화면 공용) ----- */

/** 대시보드 등에서 대표로 쓰는 기준: 책은 페이지, 강의는 강의 */
function getPrimaryBasis(goal) {
  return goal.type === 'book' ? 'page' : 'lecture';
}

function getUnitLabel(basis) {
  return { page: '페이지', chapter: '챕터', lecture: '강' }[basis];
}

function getGoalSummary(goal, basis = getPrimaryBasis(goal), today = todayStr()) {
  const plan = getActivePlan(goal, basis);
  const total = getTotalUnits(goal, basis);
  const done = getDoneUnits(goal, basis);
  const target = cumulativeOnDate(plan, today); // 오늘까지(오늘 포함) 계획 누적
  const targetUntilYesterday = cumulativeOnDate(plan, addDays(today, -1));
  const isComplete = done >= total;
  const isOverdue = diffDays(goal.dueDate, today) > 0;
  // 밀림은 어제까지 누적보다 적을 때만, 앞섬은 오늘 분량까지 넘겼을 때만. 그 사이는 "오늘 할 일" 진행 중.
  let diff = 0;
  if (done < targetUntilYesterday) diff = done - targetUntilYesterday;
  else if (done > target) diff = done - target;

  // 하루 권장: 지금 계획의 공부하는 날 하루 평균
  const planStudyDays = Math.max(1, countStudyDays(plan.startDate, plan.endDate, plan.restWeekdays));
  const dailyPlan = Math.round((plan.to - plan.from) / planStudyDays);
  // 지금부터 기한을 맞추려면: 남은 분량 ÷ 오늘 포함 남은 공부하는 날
  const remaining = total - done;
  const fromDate = diffDays(today, goal.startDate) > 0 ? goal.startDate : today;
  const remainingStudyDays = isOverdue ? 0 : countStudyDays(fromDate, goal.dueDate, plan.restWeekdays);
  const needPerDay = remainingStudyDays > 0 ? Math.ceil(remaining / remainingStudyDays) : remaining;
  return {
    dailyPlan,
    remaining,
    remainingStudyDays,
    needPerDay,
    basis,
    plan,
    total,
    done,
    target,
    targetUntilYesterday,
    diff, // 음수: 밀림, 양수: 앞섬, 0: 계획대로
    percent: total > 0 ? Math.floor((done / total) * 100) : 0,
    isComplete,
    isOverdue,
    isActive: !isComplete && !isOverdue,
    notStarted: diffDays(today, goal.startDate) > 0,
    dday: diffDays(today, goal.dueDate),
    todayRow: buildSchedule(plan).find((r) => r.date === today) || null,
  };
}

/** 단위 범위 (from 초과 ~ to 이하)를 사람이 읽는 문구로 */
function describeUnitsRange(goal, basis, from, to) {
  if (basis === 'page') {
    const a = unitsToPage(goal.book, from + 1);
    const b = unitsToPage(goal.book, to);
    return a === b ? `p.${a}` : `p.${a}~${b}`;
  }
  if (basis === 'chapter') {
    return getChapterRanges(goal.book).slice(from, to).map((c) => c.name).join(', ');
  }
  if (to - from === 1) return `${to}강 · ${goal.lecture.titles[to - 1]}`;
  return `${from + 1}~${to}강`;
}

/** 페이지 범위가 걸치는 챕터: 전부 덮으면 이름, 일부면 "이름 일부" */
function describeChaptersForPages(book, startPage, endPage) {
  const list = chaptersInPageRange(book, startPage, endPage)
    .map((ch) => (ch.coversChapterStart && ch.coversChapterEnd ? ch.name : `${ch.name} 일부`));
  if (list.length <= 2) return list.join(' ~ ');
  return `${list[0]} ~ ${list.at(-1)}`;
}

/** 받침에 따라 조사 선택: josa('페이지', '을', '를') → '를' */
function josa(word, withBatchim, withoutBatchim) {
  const code = String(word).charCodeAt(String(word).length - 1);
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return hasBatchim ? withBatchim : withoutBatchim;
}

function formatDday(dday) {
  if (dday > 0) return `D-${dday}`;
  if (dday === 0) return 'D-Day';
  return `D+${-dday}`;
}

/** 'YYYY-MM-DD' → '10/5' */
function formatShortDate(str) {
  const d = parseDate(str);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ----- 계획표 (원래 계획 + 현재 계획을 날짜별로 합친 표) ----- */

/**
 * 계획표 행 목록
 *  - 재분배 전 날짜: 원래 계획의 값 (그때 적용되던 계획)
 *  - 재분배 이후 날짜: 현재 계획의 값
 *  - originalCumulative: 같은 날짜의 원래 계획 누적 (비교 열)
 *  - isPreReplan: 재분배 이전 날짜인지
 */
function buildTimeline(goal, basis) {
  const { original, current } = goal.plans[basis];
  const active = current || original;
  const byDate = (plan) => new Map(buildSchedule(plan).map((r) => [r.date, r]));
  const activeRows = byDate(active);
  const originalRows = byDate(original);

  // 수정으로 전체 분량이 줄었을 수 있으므로, 원래 계획 값은 현재 전체 분량을 넘지 않게 자른다
  const total = getTotalUnits(goal, basis);
  const cap = (n) => Math.min(n, total);

  const start = diffDays(original.startDate, active.startDate) < 0 ? active.startDate : original.startDate;
  const days = countDaysInclusive(start, active.endDate);
  const rows = [];
  let lastOriginal = original.from;
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const origRow = originalRows.get(date);
    if (origRow) lastOriginal = origRow.cumulative;
    else if (diffDays(original.endDate, date) > 0) lastOriginal = original.to;
    const originalCumulative = cap(lastOriginal);

    let row = activeRows.get(date);
    if (!row) {
      // 재분배 이전 날(또는 원래 계획이 끝난 뒤 재분배 시작 전 사이의 날)은 원래 계획 값
      const base = origRow || { date, isRestDay: false, prevCumulative: lastOriginal, cumulative: lastOriginal };
      const prev = cap(base.prevCumulative);
      const cum = cap(base.cumulative);
      row = { ...base, prevCumulative: prev, cumulative: cum, amount: cum - prev };
    }
    rows.push({ ...row, originalCumulative, isPreReplan: !activeRows.has(date) });
  }
  return rows;
}

/* ----- 사역자 필독서와 연결된 목표 ----- */

/** 필독서로 만든 내 목표 (없으면 null) */
function findGoalForBook(goals, bookId) {
  return goals.find((g) => g.requiredBookId === bookId) || null;
}

/** 관리자가 필독서 내용을 바꿔서 내 목표와 달라졌는지 */
function isRequiredBookChanged(goal, book) {
  return goal.title !== book.title.trim()
    || getBookAuthor(goal) !== (book.author || '').trim()
    || bookSignature(goal.book.chapters, goal.book.lastPage) !== bookSignature(book.chapters, book.lastPage);
}

/** 필독서 최신 내용을 반영한 수정 입력 (기간·쉬는 요일은 그대로) */
function inputFromRequiredBook(goal, book) {
  return {
    ...goalToInput(goal),
    title: book.title,
    author: book.author || '',
    chapters: book.chapters.map((c) => ({ name: c.name, startPage: c.startPage })),
    lastPage: book.lastPage,
  };
}

/** 필독서로 만든 목표의 표지 이미지 주소 (없으면 null) */
function getCoverUrl(goal) {
  const book = goal.requiredBookId ? requiredBooks.find((b) => b.id === goal.requiredBookId) : null;
  return book && book.coverUrl ? book.coverUrl : null;
}

/** 목표 삭제 */
function removeGoal(data, id) {
  data.goals = data.goals.filter((g) => g.id !== id);
  return data;
}

/* =========================================================================
 * 5. 저장소 — Supabase (구글 로그인)
 *    화면/계산 코드는 loadData()/saveData()만 호출한다. 저장소를 바꿀 때는 이 영역만 교체한다.
 *
 *    테이블 study_planner_goals: 사용자별로 목표 하나당 한 행
 *      (user_id, id) 기본키 / data jsonb = Goal 전체 / schema_version / updated_at
 *      RLS로 본인 행만 읽고 쓸 수 있다.
 *
 * AppData = { schemaVersion: number, goals: Goal[] }
 * ========================================================================= */

const SUPABASE_URL = 'https://pvuriqyiyghjuprewkwj.supabase.co';
// 공개(publishable) 키 — 브라우저에 노출되어도 되는 키이며, 데이터 보호는 RLS가 담당한다
const SUPABASE_KEY = 'sb_publishable_YpUYYQ7zsKQoqrcg2cvkBg_NXnigJPX';
const GOALS_TABLE = 'study_planner_goals';
const SCHEMA_VERSION = 1;

/** 로그인 도입 전 이 브라우저(localStorage)에 저장하던 데이터 */
const LEGACY_STORAGE_KEY = 'studyPlanner.data';
const LEGACY_DISMISSED_KEY = 'studyPlanner.legacyDismissed';

function createEmptyData() {
  return { schemaVersion: SCHEMA_VERSION, goals: [] };
}

/** 예전 버전 데이터를 현재 스키마로 올린다 (버전이 늘면 여기에 단계 추가) */
function migrateData(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.goals)) {
    throw new Error('올바른 데이터 형식이 아닙니다.');
  }
  const version = raw.schemaVersion || 0;
  if (version > SCHEMA_VERSION) {
    throw new Error(`이 앱보다 새로운 버전(${version})의 데이터입니다.`);
  }
  // if (version < 2) { ...v1 → v2 변환... }
  return { ...raw, schemaVersion: SCHEMA_VERSION };
}

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
    });
  }
  return supabaseClient;
}

async function getCurrentUser() {
  const { data } = await getSupabase().auth.getSession();
  return data.session ? data.session.user : null;
}

async function signInWithGoogle() {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

async function signOut() {
  await getSupabase().auth.signOut();
}

/** 서버에 마지막으로 저장된 목표별 JSON — 바뀐 목표만 저장하기 위해 기억한다 */
let syncedSnapshot = new Map();

async function loadData() {
  // 관리자는 팀원의 필독서 목표도 읽을 수 있으므로 반드시 본인 것만 가져온다
  const { data: rows, error } = await getSupabase().from(GOALS_TABLE)
    .select('id, data, schema_version').eq('user_id', currentUser.id);
  if (error) throw error;
  const version = rows.reduce((min, r) => Math.min(min, r.schema_version), SCHEMA_VERSION);
  const data = migrateData({ schemaVersion: version, goals: rows.map((r) => r.data) });
  data.goals.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  syncedSnapshot = new Map(data.goals.map((g) => [g.id, JSON.stringify(g)]));
  return data;
}

/** 바뀐 목표는 upsert, 없어진 목표는 delete */
async function saveData(data) {
  const now = new Date().toISOString();
  const currentIds = new Set(data.goals.map((g) => g.id));
  const changed = data.goals.filter((g) => syncedSnapshot.get(g.id) !== JSON.stringify(g));
  const removed = [...syncedSnapshot.keys()].filter((id) => !currentIds.has(id));
  const sb = getSupabase();

  if (changed.length) {
    const { error } = await sb.from(GOALS_TABLE).upsert(
      changed.map((g) => ({ id: g.id, data: g, schema_version: SCHEMA_VERSION, updated_at: now })),
      { onConflict: 'user_id,id' },
    );
    if (error) throw error;
    changed.forEach((g) => syncedSnapshot.set(g.id, JSON.stringify(g)));
  }
  if (removed.length) {
    const { error } = await sb.from(GOALS_TABLE).delete().eq('user_id', currentUser.id).in('id', removed);
    if (error) throw error;
    removed.forEach((id) => syncedSnapshot.delete(id));
  }
}

/* ----- 계정 · 우리 팀 · 사역자 필독서 ----- */

const PROFILES_TABLE = 'study_planner_profiles';
const REQUIRED_BOOKS_TABLE = 'study_planner_required_books';

/** 로그인할 때마다 프로필 갱신 + 관리자/팀 여부 확인 → { isAdmin, inTeam } */
async function loadAccount(user) {
  const sb = getSupabase();
  const meta = user.user_metadata || {};
  const [profile, admin] = await Promise.all([
    sb.rpc('study_planner_touch_profile', { p_name: meta.full_name || meta.name || null }),
    sb.rpc('study_planner_is_admin'),
  ]);
  if (profile.error) throw profile.error;
  if (admin.error) throw admin.error;
  return { isAdmin: admin.data === true, inTeam: !!(profile.data && profile.data.in_team) };
}

function rowToRequiredBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author || '',
    coverUrl: row.cover_url || null,
    chapters: row.chapters,
    lastPage: row.last_page,
    updatedAt: row.updated_at,
  };
}

/** 사역자 필독서 목록 (팀원·관리자만 읽을 수 있음) */
async function loadRequiredBooks() {
  const { data, error } = await getSupabase().from(REQUIRED_BOOKS_TABLE)
    .select('id, title, author, cover_url, chapters, last_page, updated_at').order('created_at');
  if (error) throw error;
  return data.map(rowToRequiredBook);
}

/* 관리자 전용 — 서버에서도 RLS/함수로 관리자만 허용된다 */

async function adminLoadProfiles() {
  const { data, error } = await getSupabase().from(PROFILES_TABLE)
    .select('user_id, email, name, in_team, created_at, last_seen_at').order('created_at');
  if (error) throw error;
  return data;
}

async function adminSetTeam(userId, inTeam) {
  const { error } = await getSupabase().rpc('study_planner_set_team', { p_user_id: userId, p_in_team: inTeam });
  if (error) throw error;
}

/** 필독서 저장 (id가 없으면 새로 만들기) → 저장된 책 */
async function adminSaveRequiredBook(book) {
  const row = {
    title: book.title.trim(),
    author: (book.author || '').trim() || null,
    cover_url: book.coverUrl || null,
    chapters: book.chapters.map((c) => ({ name: c.name.trim(), startPage: Number(c.startPage) })),
    last_page: Number(book.lastPage),
    updated_at: new Date().toISOString(),
  };
  const sb = getSupabase();
  const query = book.id
    ? sb.from(REQUIRED_BOOKS_TABLE).update(row).eq('id', book.id)
    : sb.from(REQUIRED_BOOKS_TABLE).insert(row);
  const { data, error } = await query.select('id, title, author, cover_url, chapters, last_page, updated_at').single();
  if (error) throw error;
  return rowToRequiredBook(data);
}

const COVERS_BUCKET = 'study-planner-covers';

/** 표지 이미지 업로드 → 공개 주소 */
async function adminUploadCover(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const sb = getSupabase();
  const { error } = await sb.storage.from(COVERS_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return sb.storage.from(COVERS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 더 이상 쓰지 않는 표지 파일 삭제 (실패해도 무시) */
async function adminRemoveCoverFile(url) {
  const marker = `/${COVERS_BUCKET}/`;
  if (!url || !url.includes(marker)) return;
  const path = url.slice(url.indexOf(marker) + marker.length);
  const { error } = await getSupabase().storage.from(COVERS_BUCKET).remove([path]);
  if (error) console.warn('[admin] 이전 표지 삭제 실패:', error);
}

async function adminDeleteRequiredBook(id) {
  const { error } = await getSupabase().from(REQUIRED_BOOKS_TABLE).delete().eq('id', id);
  if (error) throw error;
}

/** 모든 사용자의 필독서 목표 → [{ userId, goal }] */
async function adminLoadRequiredGoals() {
  const { data, error } = await getSupabase().from(GOALS_TABLE)
    .select('user_id, data').not('data->>requiredBookId', 'is', null);
  if (error) throw error;
  return data.map((r) => ({ userId: r.user_id, goal: r.data }));
}

/** 로그인 전 이 브라우저에 저장된 목표 (없으면 빈 배열) */
function readLegacyGoals() {
  try {
    if (localStorage.getItem(LEGACY_DISMISSED_KEY)) return [];
    const text = localStorage.getItem(LEGACY_STORAGE_KEY);
    return text ? parseBackup(text).goals : [];
  } catch (err) {
    console.warn('[storage] 이전 브라우저 데이터를 읽지 못했습니다:', err);
    return [];
  }
}

function clearLegacyGoals(moved) {
  try {
    if (moved) localStorage.removeItem(LEGACY_STORAGE_KEY);
    else localStorage.setItem(LEGACY_DISMISSED_KEY, '1');
  } catch {
    // 저장 공간을 쓸 수 없는 환경이면 무시
  }
}

/* ----- 백업: JSON 내보내기 / 불러오기 (저장소 종류와 무관) ----- */

function serializeBackup(data) {
  return JSON.stringify({
    app: 'study-planner',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    goals: data.goals,
  }, null, 2);
}

function backupFileName(today = todayStr()) {
  return `학습계획표-백업-${today}.json`;
}

function isValidPlan(plan) {
  return plan && isValidDateStr(plan.startDate) && isValidDateStr(plan.endDate)
    && Number.isInteger(plan.from) && Number.isInteger(plan.to) && plan.from <= plan.to
    && diffDays(plan.startDate, plan.endDate) >= 0
    && (plan.restWeekdays === undefined || (Array.isArray(plan.restWeekdays)
      && plan.restWeekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)));
}

/** 불러온 목표 하나의 형식 검사 (문제가 있으면 오류 메시지, 없으면 null) */
function checkGoalShape(goal, index) {
  const label = `${index + 1}번째 목표${goal && goal.title ? `(${goal.title})` : ''}`;
  if (!goal || typeof goal !== 'object') return `${label}: 형식이 올바르지 않습니다.`;
  if (typeof goal.id !== 'string' || !/^[\w-]{1,64}$/.test(goal.id) || typeof goal.title !== 'string') {
    return `${label}: id 또는 이름이 올바르지 않습니다.`;
  }
  if (!BASES_BY_TYPE[goal.type]) return `${label}: 종류(type)가 올바르지 않습니다.`;
  if (!isValidDateStr(goal.startDate) || !isValidDateStr(goal.dueDate)) return `${label}: 날짜가 올바르지 않습니다.`;
  if (goal.book && goal.book.author !== undefined && typeof goal.book.author !== 'string') {
    return `${label}: 저자 정보가 올바르지 않습니다.`;
  }
  if (goal.requiredBookId !== undefined && (typeof goal.requiredBookId !== 'string'
    || !/^[\w-]{1,64}$/.test(goal.requiredBookId))) {
    return `${label}: 필독서 연결 정보가 올바르지 않습니다.`;
  }
  if (goal.restWeekdays !== undefined && (!Array.isArray(goal.restWeekdays)
    || !goal.restWeekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))) {
    return `${label}: 쉬는 요일 정보가 올바르지 않습니다.`;
  }
  if (goal.type === 'book') {
    const b = goal.book;
    const chaptersOk = b && Array.isArray(b.chapters) && b.chapters.length > 0 && Number.isInteger(b.lastPage)
      && b.chapters.every((c, i) => c && typeof c.name === 'string' && Number.isInteger(c.startPage) && c.startPage >= 1
        && c.startPage <= b.lastPage && (i === 0 || c.startPage > b.chapters[i - 1].startPage));
    if (!chaptersOk) return `${label}: 챕터 정보가 올바르지 않습니다.`;
  } else if (!goal.lecture || !Array.isArray(goal.lecture.titles) || goal.lecture.titles.length === 0
    || !goal.lecture.titles.every((t) => typeof t === 'string')) {
    return `${label}: 강의 목록이 올바르지 않습니다.`;
  }
  const pr = goal.progress;
  if (!pr || !Number.isInteger(pr.current) || !Array.isArray(pr.history)
    || !pr.history.every((h) => h && isValidDateStr(h.date) && Number.isFinite(h.value))) {
    return `${label}: 진도 정보가 올바르지 않습니다.`;
  }
  for (const basis of BASES_BY_TYPE[goal.type]) {
    const p = goal.plans && goal.plans[basis];
    if (!p || !isValidPlan(p.original) || (p.current && !isValidPlan(p.current))) {
      return `${label}: 계획 정보가 올바르지 않습니다.`;
    }
  }
  return null;
}

/** 백업 JSON 텍스트 → AppData. 문제가 있으면 한국어 메시지로 Error를 던진다 */
function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다. 파일이 손상되었거나 JSON 형식이 아닙니다.');
  }
  const data = migrateData(raw);
  const problems = data.goals.map(checkGoalShape).filter(Boolean);
  if (problems.length) throw new Error(problems.slice(0, 5).join('\n'));
  const ids = new Set(data.goals.map((g) => g.id));
  if (ids.size !== data.goals.length) throw new Error('같은 id를 가진 목표가 여러 개 있습니다.');
  return { schemaVersion: SCHEMA_VERSION, goals: data.goals };
}

/* =========================================================================
 * 6. 자가 검증 — 계산 함수 결과를 콘솔에 출력
 * ========================================================================= */

function runPlanSelfTests() {
  const results = [];
  const check = (name, ok, detail = '') => results.push({ 검사: name, 결과: ok ? 'PASS' : 'FAIL', 비고: detail });

  const printCase = (title, plan) => {
    const rows = buildSchedule(plan);
    console.group(`■ ${title}  (N=${plan.to - plan.from}, D=${rows.length})`);
    console.table(
      rows.map((r) => ({
        날짜: `${r.date} (${weekdayKo(r.date)})`,
        분량: r.isRestDay ? '쉬는 날' : r.amount === 0 ? '휴식(분량 없음)' : r.amount,
        누적: r.cumulative,
      })),
    );
    console.groupEnd();
    return rows;
  };
  const sum = (rows) => rows.reduce((s, r) => s + r.amount, 0);

  // 케이스 1: 300페이지, 10일
  const r1 = printCase('300페이지 책, 10일', createPlan('2026-10-01', '2026-10-10', 0, 300));
  check('300p/10일: 매일 30페이지', r1.every((r) => r.amount === 30));
  check('300p/10일: 마지막 날 누적 300', r1.at(-1).cumulative === 300);

  // 케이스 2: 100페이지, 7일
  const r2 = printCase('100페이지 책, 7일', createPlan('2026-10-01', '2026-10-07', 0, 100));
  const amounts2 = r2.map((r) => r.amount);
  check('100p/7일: 합계 100', sum(r2) === 100, `분량 ${amounts2.join(', ')}`);
  check('100p/7일: 하루 분량 차이 1 이하', Math.max(...amounts2) - Math.min(...amounts2) <= 1);

  // 케이스 3: 강의 5개, 8일
  const r3 = printCase('강의 5개, 8일', createPlan('2026-10-01', '2026-10-08', 0, 5));
  check('강의5/8일: 합계 5', sum(r3) === 5, `분량 ${r3.map((r) => r.amount).join(', ')}`);
  check('강의5/8일: 분량 0인 날 포함', r3.some((r) => r.amount === 0));

  // 케이스 4: 시작일 = 마감일
  const r4 = printCase('시작일 = 마감일 (120페이지)', createPlan('2026-10-01', '2026-10-01', 0, 120));
  check('하루짜리: 1일에 전부', r4.length === 1 && r4[0].amount === 120);

  // 케이스 5: 쉬는 요일 (토·일 제외) — 10/1(목)~10/10(토) 중 공부하는 날 7일
  const r5 = printCase('70페이지, 10일, 토·일 쉼', createPlan('2026-10-01', '2026-10-10', 0, 70, [0, 6]));
  check('쉬는 요일: 주말 분량 0', r5.filter((r) => r.isRestDay).length === 3 && r5.filter((r) => r.isRestDay).every((r) => r.amount === 0));
  check('쉬는 요일: 공부하는 날 매일 10', r5.filter((r) => !r.isRestDay).every((r) => r.amount === 10));
  check('쉬는 요일: 누적 목표 계산', cumulativeOnDate(createPlan('2026-10-01', '2026-10-10', 0, 70, [0, 6]), '2026-10-04') === 20);
  check('검증: 공부하는 날 없음 차단',
    validateCommonInput({ title: 'x', startDate: '2026-10-03', dueDate: '2026-10-04', restWeekdays: [0, 6] }).length > 0);

  // 날짜 계산 (UTC 밀림, 월말, 윤년, 서머타임 구간)
  check('날짜: 월 경계', addDays('2026-01-31', 1) === '2026-02-01');
  check('날짜: 윤년', addDays('2028-02-28', 1) === '2028-02-29');
  check('날짜: 연 경계 일수', countDaysInclusive('2026-12-30', '2027-01-02') === 4);
  check('날짜: 서머타임 구간 일수', diffDays('2026-03-01', '2026-03-31') === 30);
  check('날짜: 없는 날짜 거부', !isValidDateStr('2026-02-30'));

  // 책 챕터 / 진도 연동
  const book = createBookGoal({
    title: '테스트 책',
    startDate: '2026-10-01',
    dueDate: '2026-10-10',
    chapters: [
      { name: '1장', startPage: 1 },
      { name: '2장', startPage: 40 },
      { name: '3장', startPage: 90 },
    ],
    lastPage: 150,
  });
  const ranges = getChapterRanges(book.book);
  check('챕터 끝 페이지 자동 계산', ranges.map((c) => c.endPage).join(',') === '39,89,150');
  setProgress(book, 95, '2026-10-03');
  check('페이지 95 → 완료 챕터 2개', getDoneUnits(book, 'chapter') === 2);
  setProgress(book, 100, '2026-10-03');
  check('같은 날 history는 마지막 값만', book.progress.history.length === 1 && book.progress.history[0].value === 100);
  const chapterRow = buildSchedule(getActivePlan(book, 'chapter'))[0];
  applyRowCheck(book, 'chapter', { ...chapterRow, cumulative: 3, prevCumulative: 2 }, true, '2026-10-04');
  check('챕터 체크 → 마지막 페이지로 이동', book.progress.current === 150);

  // 목표 수정
  const lec = createLectureGoal({ title: '강의', startDate: '2026-10-01', dueDate: '2026-10-10', titles: ['a', 'b', 'c', 'd'] });
  applyGoalEdit(lec, { title: '강의', startDate: '2026-10-01', dueDate: '2026-10-10', titles: ['a', 'b', 'c', 'd', 'e'] }, '2026-09-30');
  check('수정(시작 전): 원래 계획 새로 생성', lec.plans.lecture.original.to === 5 && lec.plans.lecture.current === null);
  setProgress(lec, 2, '2026-10-03');
  applyGoalEdit(lec, { title: '강의', startDate: '2026-10-01', dueDate: '2026-10-12', titles: ['a', 'b', 'c', 'd', 'e'] }, '2026-10-04');
  const cur = lec.plans.lecture.current;
  check('수정(진행 중): 오늘부터 재분배', cur && cur.startDate === '2026-10-04' && cur.from === 2 && cur.to === 5
    && lec.plans.lecture.original.endDate === '2026-10-10');
  applyGoalEdit(lec, { title: '새 이름', startDate: '2026-10-01', dueDate: '2026-10-12', titles: ['a', 'b', 'c', 'd', 'e'] }, '2026-10-05');
  check('수정(이름만): 계획 유지', lec.plans.lecture.current === cur);
  check('챕터 설명: 일부/전체', describeChaptersForPages(book.book, 30, 95) === '1장 일부 ~ 3장 일부'
    && describeChaptersForPages(book.book, 40, 89) === '2장');

  // 밀림/앞섬: 밀림은 어제까지 누적 기준, 앞섬은 오늘 누적 기준
  const g300 = createLectureGoal({ title: 't', startDate: '2026-10-01', dueDate: '2026-10-10', titles: Array(300).fill('x') });
  const diffAt = (v) => { g300.progress.current = v; return getGoalSummary(g300, 'lecture', '2026-10-03').diff; };
  check('상태: 어제까지 분량만 함 → 계획대로', diffAt(60) === 0);
  check('상태: 오늘 분량 진행 중 → 계획대로', diffAt(75) === 0);
  check('상태: 어제 누적보다 적음 → 밀림', diffAt(50) === -10);
  check('상태: 오늘 누적보다 많음 → 앞섬', diffAt(100) === 10);

  // 계획표 타임라인 (재분배 후)
  g300.progress.current = 45;
  g300.plans.lecture.current = createPlan('2026-10-04', '2026-10-12', 45, 300);
  const tl = buildTimeline(g300, 'lecture');
  check('타임라인: 원래 시작일~새 마감일', tl[0].date === '2026-10-01' && tl.at(-1).date === '2026-10-12' && tl.length === 12);
  check('타임라인: 재분배 전은 원래 계획 값', tl[2].cumulative === 90 && tl[2].isPreReplan);
  check('타임라인: 재분배 후는 현재 계획 값', tl[3].prevCumulative === 45 && !tl[3].isPreReplan && tl.at(-1).cumulative === 300);
  check('타임라인: 원래 계획 마감 후 누적 = 전체', tl.at(-1).originalCumulative === 300);

  // 재분배 / 마감일 변경
  const rg = createLectureGoal({ title: 'r', startDate: '2026-10-01', dueDate: '2026-10-10', titles: Array(20).fill('x') });
  setProgress(rg, 4, '2026-10-03');
  replanGoal(rg, '2026-10-05');
  const rp = rg.plans.lecture.current;
  check('재분배: 오늘부터 남은 분량', rp.startDate === '2026-10-05' && rp.from === 4 && rp.to === 20
    && rg.plans.lecture.original.from === 0);
  check('재분배: 마지막 날 누적 = 전체', buildSchedule(rp).at(-1).cumulative === 20);
  changeDueDate(rg, '2026-10-20', '2026-10-06');
  check('마감일 변경: 최근 계획만 유지', rg.plans.lecture.current.startDate === '2026-10-06'
    && rg.plans.lecture.current.endDate === '2026-10-20' && rg.dueDate === '2026-10-20'
    && rg.plans.lecture.original.endDate === '2026-10-10');
  check('마감일 변경: 오늘보다 앞이면 차단', validateDueDateChange(rg, '2026-10-05', '2026-10-06').length > 0);
  const sm = getGoalSummary(rg, 'lecture', '2026-10-06');
  check('남은 공부일·하루 필요량', sm.remainingStudyDays === 15 && sm.needPerDay === Math.ceil(16 / 15));

  // 백업 내보내기 / 불러오기
  const backup = serializeBackup({ goals: [book, rg] });
  const restored = parseBackup(backup);
  check('백업: 내보낸 파일을 그대로 불러옴', restored.goals.length === 2
    && JSON.stringify(restored.goals[1]) === JSON.stringify(rg) && restored.schemaVersion === SCHEMA_VERSION);
  const throws = (text) => { try { parseBackup(text); return false; } catch { return true; } };
  check('백업: JSON 아님 거부', throws('not json'));
  check('백업: 형식 오류 거부', throws(JSON.stringify({ schemaVersion: 1, goals: [{ id: 'x', title: 't', type: 'book' }] })));
  check('백업: 새 버전 데이터 거부', throws(JSON.stringify({ schemaVersion: 99, goals: [] })));

  // 점검에서 찾은 버그 재발 방지
  const withGoal = (patch) => JSON.stringify({ schemaVersion: 1, goals: [{ ...structuredClone(rg), ...patch }] });
  check('백업: 위험한 id 거부', throws(withGoal({ id: 'x"><img src=x onerror=alert(1)>' })));
  check('백업: 잘못된 진도 기록 거부', throws(withGoal({ progress: { current: 1, history: [{}] } })));
  const shrink = createBookGoal({ title: 's', startDate: '2026-09-01', dueDate: '2026-09-10', lastPage: 90,
    chapters: [{ name: 'a', startPage: 1 }, { name: 'b', startPage: 31 }, { name: 'c', startPage: 61 }] });
  setProgress(shrink, 20, '2026-09-05');
  applyGoalEdit(shrink, { ...goalToInput(shrink), dueDate: '2026-10-20', lastPage: 60,
    chapters: [{ name: 'a', startPage: 1 }, { name: 'b', startPage: 31 }] }, '2026-09-30');
  const shrinkRows = buildTimeline(shrink, 'chapter');
  check('수정으로 챕터 감소: 계획표 값이 전체를 넘지 않음', shrinkRows.every((r) => r.cumulative <= 2 && r.originalCumulative <= 2));
  let noCrash = true;
  try { applyRowCheck(shrink, 'chapter', { cumulative: 3, prevCumulative: 2 }, true, '2026-09-30'); } catch { noCrash = false; }
  check('챕터 수 초과 체크해도 오류 없음', noCrash && shrink.progress.current === 60);
  const overdue = createLectureGoal({ title: 'o', startDate: '2026-09-01', dueDate: '2026-09-20', titles: ['a', 'b'] });
  setProgress(overdue, 1, '2026-09-10');
  check('마감 지난 목표도 이름 수정 가능', validateGoalEdit(overdue, { ...goalToInput(overdue), title: '새 이름' }, '2026-09-30').length === 0);

  // 사역자 필독서 연결
  const rb = { id: 'b1', title: '필독서', lastPage: 90, chapters: [{ name: '1장', startPage: 1 }, { name: '2장', startPage: 46 }] };
  const linked = createBookGoal({ ...rb, startDate: '2026-10-01', dueDate: '2026-10-09', requiredBookId: rb.id });
  check('필독서: 목표 연결', findGoalForBook([book, linked], 'b1') === linked && !isRequiredBookChanged(linked, rb));
  const rb2 = { ...rb, chapters: [...rb.chapters, { name: '3장', startPage: 70 }] };
  check('조사: 페이지를 / 강을', josa('페이지', '을', '를') === '를' && josa('3강', '을', '를') === '을');
  check('필독서: 관리자 변경 감지', isRequiredBookChanged(linked, rb2));
  check('필독서: 저자 변경 감지', isRequiredBookChanged(linked, { ...rb, author: '박재연' }));
  applyGoalEdit(linked, inputFromRequiredBook(linked, rb2), '2026-09-30');
  check('필독서: 변경 반영(시작 전 → 계획 새로)', linked.book.chapters.length === 3 && linked.plans.chapter.original.to === 3
    && linked.requiredBookId === 'b1' && !isRequiredBookChanged(linked, rb2));

  // 입력 검증
  check(
    '검증: 오름차순 아님 차단',
    validateBookInput({ title: 'x', startDate: '2026-10-01', dueDate: '2026-10-02', lastPage: 100,
      chapters: [{ name: 'a', startPage: 10 }, { name: 'b', startPage: 5 }] }).length > 0,
  );
  check(
    '검증: 마감일 < 시작일 차단',
    validateCommonInput({ title: 'x', startDate: '2026-10-05', dueDate: '2026-10-01' }).length > 0,
  );

  console.group('■ 검사 결과');
  console.table(results);
  console.groupEnd();
  const failed = results.filter((r) => r.결과 === 'FAIL').length;
  console.log(failed === 0 ? `✅ 전체 ${results.length}개 통과` : `❌ ${failed}개 실패`);
  return failed === 0;
}

/* =========================================================================
 * 7. 화면 — 상태와 라우팅
 *    주소의 해시로 화면을 고른다 (새로고침해도 같은 화면 유지)
 *      #/            대시보드
 *      #/new         새 목표 추가
 *      #/edit/{id}   목표 수정
 *      #/goal/{id}   목표 상세
 * ========================================================================= */

let appData = null;

function getGoal(id) {
  return appData.goals.find((g) => g.id === id) || null;
}

/* ----- 저장 (순서대로 한 번에 하나씩) ----- */

let currentUser = null;
/** 관리자 / 우리 팀 여부 (로그인 때 서버에서 확인) */
let account = { isAdmin: false, inTeam: false };
/** 사역자 필독서 목록 (팀원·관리자만) */
let requiredBooks = [];
let saveQueue = Promise.resolve();
let pendingSaves = 0;
let saveState = 'saved'; // 'saving' | 'saved' | 'error'

function commit() {
  pendingSaves++;
  setSaveState('saving');
  saveQueue = saveQueue
    .then(() => saveData(appData))
    .then(() => {
      pendingSaves--;
      if (pendingSaves === 0) setSaveState('saved');
    })
    .catch((err) => {
      pendingSaves--;
      console.error('[storage] 저장 실패:', err);
      setSaveState('error');
    });
  return saveQueue;
}

function retrySave() {
  commit();
}

function setSaveState(state) {
  saveState = state;
  renderTopbar();
}

/* ----- 상단 바 (로그인 정보 · 저장 상태) ----- */

function renderTopbar() {
  const bar = document.getElementById('topbar');
  if (!bar) return;
  if (!currentUser) {
    bar.hidden = true;
    return;
  }
  const status = {
    saving: '<span class="save-state is-saving">저장 중…</span>',
    saved: '<span class="save-state is-saved">저장됨</span>',
    error: '<span class="save-state is-error">저장 실패 <button type="button" class="link-btn" data-action="retry-save">다시 시도</button></span>',
  }[saveState];
  const name = currentUser.user_metadata && (currentUser.user_metadata.full_name || currentUser.user_metadata.name);
  bar.hidden = false;
  bar.innerHTML = `
    <div class="topbar-inner">
      <nav class="topbar-nav">
        <a class="brand" href="#/">학습 진도 계획표</a>
        ${account.isAdmin ? '<a class="nav-link" href="#/admin">관리자</a>' : ''}
      </nav>
      <div class="topbar-right">
        ${status}
        <span class="user">${escapeHtml(name || currentUser.email || '')}</span>
        <button type="button" class="btn btn-small" data-action="sign-out">로그아웃</button>
      </div>
    </div>`;
}

/* ----- 로그인 · 시작 화면 ----- */

function renderMessageScreen(root, title, html) {
  root.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <h1>${title}</h1>
        ${html}
      </div>
    </div>`;
}

function renderLogin(root, errorMessage = '') {
  const isFile = location.protocol === 'file:';
  renderMessageScreen(root, '학습 진도 계획표', `
    <p class="muted">책·강의의 마감일까지 매일 할 분량을 계획하고 진도를 기록합니다.<br>
      구글 계정으로 로그인하면 어느 기기에서든 같은 계획을 볼 수 있습니다.</p>
    ${isFile ? `<p class="errors">파일을 직접 연 상태에서는 로그인할 수 없습니다. 배포된 인터넷 주소(https://…)로 열어 주세요.</p>` : ''}
    ${errorMessage ? `<p class="errors">${escapeHtml(errorMessage)}</p>` : ''}
    <button type="button" class="btn btn-google" data-action="google-login" ${isFile ? 'disabled' : ''}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      Google 계정으로 로그인
    </button>`);
  root.querySelector('[data-action="google-login"]').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await signInWithGoogle(); // 구글 로그인 페이지로 이동
    } catch (err) {
      renderLogin(root, `로그인을 시작하지 못했습니다: ${err.message}`);
    }
  });
}

/** 로그인 후: 서버에서 데이터를 불러오고, 이전 브라우저 데이터가 있으면 옮길지 묻는다 */
async function startApp(user) {
  const root = document.getElementById('app');
  currentUser = user;
  renderTopbar();
  renderMessageScreen(root, '불러오는 중…', '<p class="muted">계정에 저장된 목표를 불러오고 있습니다.</p>');
  try {
    appData = await loadData();
  } catch (err) {
    console.error('[storage] 불러오기 실패:', err);
    renderMessageScreen(root, '불러오지 못했습니다', `
      <p class="errors">${escapeHtml(err.message || String(err))}</p>
      <button type="button" class="btn btn-primary" data-action="reload">다시 시도</button>`);
    root.querySelector('[data-action="reload"]').addEventListener('click', () => startApp(user));
    return;
  }

  // 관리자·팀 정보와 필독서 — 실패해도 내 계획은 쓸 수 있게 경고만 남긴다
  try {
    account = await loadAccount(user);
    requiredBooks = account.inTeam || account.isAdmin ? await loadRequiredBooks() : [];
  } catch (err) {
    console.warn('[account] 팀·필독서 정보를 불러오지 못했습니다:', err);
    account = { isAdmin: false, inTeam: false };
    requiredBooks = [];
  }
  renderTopbar();

  const legacy = readLegacyGoals().filter((g) => !getGoal(g.id));
  if (legacy.length) {
    const move = confirm(`이 브라우저에 로그인 전에 만든 목표 ${legacy.length}개가 있습니다.\n계정으로 옮길까요?\n\n`
      + '(취소를 누르면 옮기지 않고, 다시 묻지 않습니다. 브라우저의 데이터는 지워지지 않습니다.)');
    if (move) {
      appData.goals.push(...legacy);
      await commit();
      if (saveState === 'saved') clearLegacyGoals(true);
    } else {
      clearLegacyGoals(false);
    }
  }
  render();
}

function parseRoute() {
  const [name, id, sub] = location.hash.replace(/^#\/?/, '').split('/');
  if (name === 'new' && id === 'book' && sub) return { view: 'form', bookId: sub };
  if (name === 'new') return { view: 'form' };
  if (name === 'admin') return { view: 'admin', tab: id || 'progress' };
  if (name === 'edit' && id) return { view: 'form', id };
  if (name === 'goal' && id) return { view: 'detail', id };
  return { view: 'dashboard' };
}

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function render() {
  const root = document.getElementById('app');
  if (!appData) return; // 로그인 전이거나 불러오는 중
  const route = parseRoute();
  const goal = route.id ? getGoal(route.id) : null;
  if (route.id && !goal) {
    navigate('#/');
    return;
  }
  // 미리보기는 상세 화면에서만 유효 (수정 → 미리보기 전환은 submitGoalForm이 상세로 바로 이동)
  if (route.view !== 'detail') detailState.preview = null;
  if (typeof closeExportDialog === 'function') closeExportDialog();
  if (route.view === 'admin') {
    if (!account.isAdmin) { navigate('#/'); return; }
    renderAdmin(root, route.tab);
  } else if (route.view === 'form') renderGoalForm(root, goal, route.bookId || null);
  else if (route.view === 'detail') renderGoalDetail(root, goal);
  else renderDashboard(root);
  window.scrollTo(0, 0);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* =========================================================================
 * 8. 화면 — 대시보드
 * ========================================================================= */

function renderDashboard(root) {
  const today = todayStr();
  // 필독서로 만든 목표는 "사역자 필독서" 영역에 따로 보여준다
  const showRequired = (account.inTeam || account.isAdmin) && requiredBooks.length > 0;
  const linkedIds = new Set(showRequired
    ? requiredBooks.map((b) => findGoalForBook(appData.goals, b.id)).filter(Boolean).map((g) => g.id) : []);
  const items = appData.goals.filter((g) => !linkedIds.has(g.id))
    .map((goal) => ({ goal, s: getGoalSummary(goal, undefined, today) }));
  const active = items.filter((x) => x.s.isActive)
    .sort((a, b) => diffDays(b.goal.dueDate, a.goal.dueDate));
  const finished = items.filter((x) => !x.s.isActive)
    .sort((a, b) => diffDays(a.goal.dueDate, b.goal.dueDate));

  root.innerHTML = `
    <header class="page-header">
      <div>
        <h1>학습 진도 계획표</h1>
        <p class="muted">${escapeHtml(today)} (${weekdayKo(today)})</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn" data-action="export" ${appData.goals.length ? '' : 'disabled'}
          title="모든 목표와 진도 기록을 JSON 파일로 저장합니다">JSON 내보내기</button>
        <button type="button" class="btn" data-action="import" title="백업한 JSON 파일로 전체 데이터를 바꿉니다">JSON 불러오기</button>
        <input type="file" id="import-file" accept=".json,application/json" hidden>
        <a class="btn btn-primary" href="#/new">+ 새 목표 추가</a>
      </div>
    </header>

    ${showRequired ? renderRequiredSection(today) : ''}

    <section>
      <h2 class="section-title">진행 중 <span class="count">${active.length}</span></h2>
      ${active.length
        ? `<div class="card-grid">${active.map((x) => renderGoalCard(x.goal, x.s)).join('')}</div>`
        : `<div class="empty">진행 중인 목표가 없습니다. <a href="#/new">새 목표를 추가</a>해 보세요.</div>`}
    </section>

    ${finished.length ? `
    <section class="finished-section">
      <h2 class="section-title">완료 / 종료 <span class="count">${finished.length}</span></h2>
      <div class="card-grid">${finished.map((x) => renderGoalCard(x.goal, x.s)).join('')}</div>
    </section>` : ''}
  `;
  bindDashboardEvents(root);
}

function bindDashboardEvents(root) {
  const fileInput = root.querySelector('#import-file');
  root.querySelector('[data-action="export"]').addEventListener('click', exportBackup);
  root.querySelector('[data-action="import"]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.value = ''; // 같은 파일을 다시 골라도 change가 일어나도록
    if (file) importBackup(file);
  });
}

function exportBackup() {
  const blob = new Blob([serializeBackup(appData)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onerror = () => alert('파일을 읽지 못했습니다.');
  reader.onload = () => {
    let data;
    try {
      data = parseBackup(String(reader.result));
    } catch (err) {
      alert(`불러올 수 없습니다.\n\n${err.message}`);
      return;
    }
    const message = `'${file.name}'에서 목표 ${data.goals.length}개를 불러옵니다.\n\n`
      + `지금 있는 목표 ${appData.goals.length}개는 모두 지워지고 파일 내용으로 바뀝니다.\n`
      + '계속할까요? (필요하면 먼저 "JSON 내보내기"로 백업하세요)';
    if (!confirm(message)) return;
    appData = data;
    commit();
    render();
  };
  reader.readAsText(file);
}

function renderRequiredSection(today) {
  const cards = requiredBooks.map((book) => {
    const goal = findGoalForBook(appData.goals, book.id);
    if (goal) return renderGoalCard(goal, getGoalSummary(goal, undefined, today), book);
    const pages = book.lastPage - book.chapters[0].startPage + 1;
    return `
      <div class="goal-card required-empty">
        <div class="card-top">
          <span class="type-tag type-required">필독서</span>
          <span class="badge badge-waiting">계획 없음</span>
        </div>
        <div class="card-book">
          ${renderCoverThumb(book.coverUrl)}
          <div>
            <h3 class="card-title">${escapeHtml(book.title)}</h3>
            ${book.author ? `<p class="card-author">${escapeHtml(book.author)}</p>` : ''}
            <p class="card-meta">${pages}페이지 · ${book.chapters.length}개 챕터</p>
          </div>
        </div>
        <a class="btn btn-primary" href="#/new/book/${escapeHtml(book.id)}">계획 세우기</a>
      </div>`;
  }).join('');
  return `
    <section class="required-section">
      <h2 class="section-title">사역자 필독서 <span class="count">${requiredBooks.length}</span></h2>
      <div class="card-grid">${cards}</div>
    </section>`;
}

/** 표지 썸네일 (size: 'sm' | 'md' | 'lg') */
function renderCoverThumb(url, size = 'md') {
  if (!url) return '';
  return `<img class="cover cover-${size}" src="${escapeHtml(url)}" alt="" loading="lazy">`;
}

/** 목표 카드. requiredBook이 있으면 필독서 표시와 변경 알림 */
function renderGoalCard(goal, s, requiredBook = null) {
  const typeLabel = goal.type === 'book' ? '책' : '강의';
  const changed = requiredBook && isRequiredBookChanged(goal, requiredBook);
  return `
    <a class="goal-card ${s.isActive ? '' : 'is-finished'}" href="#/goal/${escapeHtml(goal.id)}">
      <div class="card-top">
        <span class="card-tags">
          ${requiredBook ? '<span class="type-tag type-required">필독서</span>' : `<span class="type-tag type-${goal.type}">${typeLabel}</span>`}
          ${changed ? '<span class="badge badge-ended">내용 변경됨</span>' : ''}
        </span>
        ${renderStatusBadge(s)}
      </div>
      <div class="card-book">
        ${renderCoverThumb(requiredBook ? requiredBook.coverUrl : null)}
        <div>
          <h3 class="card-title">${escapeHtml(goal.title)}</h3>
          ${getBookAuthor(goal) ? `<p class="card-author">${escapeHtml(getBookAuthor(goal))}</p>` : ''}
        </div>
      </div>
      <div class="card-meta">
        <span>마감 ${escapeHtml(goal.dueDate)}</span>
        <span class="dday ${s.isActive && s.dday <= 3 ? 'is-urgent' : ''}">${formatDday(s.dday)}</span>
      </div>
      <div class="progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${s.percent}%"></div></div>
        <span class="progress-text">${s.percent}% · ${s.done}/${s.total}${getUnitLabel(s.basis)}</span>
      </div>
      <div class="card-today">
        <span class="label">오늘 할 분량</span>
        ${renderTodayAmount(goal, s)}
      </div>
    </a>
  `;
}

function renderStatusBadge(s) {
  const unit = getUnitLabel(s.basis);
  if (s.isComplete) return '<span class="badge badge-done">완료</span>';
  if (s.isOverdue) return '<span class="badge badge-ended">종료 · 미완료</span>';
  if (s.notStarted) return '<span class="badge badge-waiting">시작 전</span>';
  if (s.diff < 0) return `<span class="badge badge-behind">${-s.diff}${unit} 밀림</span>`;
  if (s.diff > 0) return `<span class="badge badge-ahead">${s.diff}${unit} 앞섬</span>`;
  return '<span class="badge badge-ontrack">계획대로</span>';
}

function renderTodayAmount(goal, s) {
  if (s.isComplete) return '<span class="today-main">모두 완료했습니다</span>';
  if (s.isOverdue) return '<span class="today-main">마감일이 지났습니다</span>';
  if (s.notStarted) return `<span class="today-main">${formatShortDate(goal.startDate)} 시작</span>`;
  const row = s.todayRow;
  if (!row) return '<span class="today-main">-</span>';
  if (row.isRestDay) return '<span class="today-main">오늘은 쉬는 날</span>';
  if (row.amount === 0) return '<span class="today-main">휴식(분량 없음)</span>';

  const unit = getUnitLabel(s.basis);
  const doneToday = s.done >= row.cumulative;
  let sub = '';
  if (s.basis === 'page') {
    sub = describeChaptersForPages(goal.book, unitsToPage(goal.book, row.prevCumulative + 1),
      unitsToPage(goal.book, row.cumulative));
  }
  return `
    <span class="today-main">${escapeHtml(describeUnitsRange(goal, s.basis, row.prevCumulative, row.cumulative))}
      <span class="muted">(${row.amount}${unit})</span>
      ${doneToday ? '<span class="today-check">✓ 완료</span>' : ''}
    </span>
    ${sub ? `<span class="today-sub">${escapeHtml(sub)}</span>` : ''}
  `;
}

/* =========================================================================
 * 9. 화면 — 목표 추가 / 수정
 * ========================================================================= */

function renderGoalForm(root, goal, bookId = null) {
  const isEdit = !!goal;
  // 사역자 필독서로 계획 세우기: 책 정보는 필독서 것을 쓰고 잠근다
  const requiredBook = bookId ? requiredBooks.find((b) => b.id === bookId)
    : (goal && goal.requiredBookId ? requiredBooks.find((b) => b.id === goal.requiredBookId) : null);
  if (bookId) {
    if (!requiredBook) { navigate('#/'); return; }
    const existing = findGoalForBook(appData.goals, bookId);
    if (existing) { navigate(`#/goal/${existing.id}`); return; }
  }
  const locked = !!requiredBook;
  const type = goal ? goal.type : 'book';
  const started = isEdit && hasGoalStarted(goal);
  // 미리보기에서 "수정으로 돌아가기"를 누르면 입력하던 값(draft)으로 다시 채운다
  const draft = isEdit && detailState.draft && detailState.goalId === goal.id ? detailState.draft : null;
  detailState.draft = null;
  const v = draft || (goal ? goalToInput(goal) : {
    title: '', startDate: todayStr(), dueDate: '', restWeekdays: [],
    chapters: [{ name: '', startPage: '' }], lastPage: '', titles: [],
  });
  if (bookId) {
    Object.assign(v, { title: requiredBook.title, author: requiredBook.author || '', chapters: requiredBook.chapters, lastPage: requiredBook.lastPage });
  }

  root.innerHTML = `
    <header class="page-header">
      <div>
        <a class="back-link" href="${isEdit ? `#/goal/${escapeHtml(goal.id)}` : '#/'}">← ${isEdit ? '목표 상세' : '대시보드'}</a>
        <h1>${isEdit ? '목표 수정' : bookId ? '필독서 계획 세우기' : '새 목표 추가'}</h1>
      </div>
    </header>

    <form id="goal-form" class="panel ${locked ? 'is-locked' : ''}" novalidate>
      ${locked ? `<p class="notice notice-info">사역자 필독서입니다. 책 제목과 챕터는 관리자가 정하며,
        여기서는 시작일·마감일·쉬는 요일만 정할 수 있습니다.</p>` : ''}
      ${started ? `<p class="notice">진행 중인 목표입니다. 날짜·쉬는 요일·챕터·강의 목록을 바꾸면 원래 계획은 보관하고,
        오늘부터 마감일까지 남은 분량을 다시 나눕니다. 저장하면 새 계획을 먼저 미리보기로 보여드립니다.</p>` : ''}

      <div class="field">
        <span class="field-label">종류</span>
        <div class="segmented">
          <label><input type="radio" name="type" value="book" ${type === 'book' ? 'checked' : ''} ${isEdit || locked ? 'disabled' : ''}> 책</label>
          <label><input type="radio" name="type" value="lecture" ${type === 'lecture' ? 'checked' : ''} ${isEdit || locked ? 'disabled' : ''}> 강의</label>
        </div>
      </div>

      <div class="field">
        <label class="field-label" for="f-title" id="f-title-label"></label>
        <input id="f-title" type="text" class="input input-wide" value="${escapeHtml(v.title)}" ${locked ? 'readonly' : ''}>
      </div>

      <div class="field-row">
        <div class="field">
          <label class="field-label" for="f-start">시작일</label>
          <input id="f-start" type="date" class="input" value="${escapeHtml(v.startDate)}">
        </div>
        <div class="field">
          <label class="field-label" for="f-due">마감일</label>
          <input id="f-due" type="date" class="input" value="${escapeHtml(v.dueDate)}">
        </div>
        <div class="field">
          <span class="field-label">기간</span>
          <span id="f-days" class="field-value">-</span>
        </div>
      </div>
      <div class="quick-due">
        <span class="field-hint">시작일부터</span>
        ${[1, 2, 4, 6, 8].map((w) => `<button type="button" class="btn btn-small" data-weeks="${w}">${w}주</button>`).join('')}
        <span id="f-daily" class="daily-estimate"></span>
      </div>

      <div class="field">
        <span class="field-label">쉬는 요일 <span class="muted">(선택한 요일에는 분량을 배정하지 않습니다)</span></span>
        <div class="weekday-picker">
          ${WEEKDAY_ORDER.map((d) => `
            <label class="weekday ${d === 0 ? 'is-sun' : d === 6 ? 'is-sat' : ''}">
              <input type="checkbox" name="rest-weekday" value="${d}"
                ${normalizeWeekdays(v.restWeekdays).includes(d) ? 'checked' : ''}>
              <span>${WEEKDAYS_KO[d]}</span>
            </label>`).join('')}
        </div>
      </div>

      <div data-section="book">
        <div class="field">
          <label class="field-label" for="f-author">저자 <span class="muted">(선택)</span></label>
          <input id="f-author" type="text" class="input input-wide" value="${escapeHtml(v.author || '')}" ${locked ? 'readonly' : ''}>
        </div>
        ${renderChapterEditorHtml(v.lastPage)}
      </div>

      <div data-section="lecture">
        <div class="field">
          <label class="field-label" for="f-lectures">강의 제목 목록 <span class="muted">(한 줄에 하나, 빈 줄은 무시)</span></label>
          <textarea id="f-lectures" class="input textarea" rows="12">${escapeHtml(v.titles.join('\n'))}</textarea>
          <span id="f-lecture-count" class="field-hint"></span>
        </div>
      </div>

      <div id="form-errors" class="errors" hidden></div>

      <div class="form-actions">
        <a class="btn" href="${isEdit ? `#/goal/${escapeHtml(goal.id)}` : '#/'}">취소</a>
        <button type="submit" class="btn btn-primary">${isEdit ? '저장' : '목표 추가'}</button>
      </div>
    </form>
  `;

  fillChapterEditor(v.chapters, locked);

  const form = root.querySelector('#goal-form');
  form.addEventListener('change', (e) => { if (e.target.name === 'type') updateFormView(); });
  form.addEventListener('input', updateFormView);
  bindChapterEditor(form, updateFormView);
  form.addEventListener('click', (e) => {
    const weeks = e.target.closest('[data-weeks]')?.dataset.weeks;
    if (!weeks) return;
    const start = form.querySelector('#f-start').value;
    if (!isValidDateStr(start)) return;
    form.querySelector('#f-due').value = addDays(start, Number(weeks) * 7 - 1);
    updateFormView();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitGoalForm(goal, requiredBook && !goal ? requiredBook.id : null);
  });
  updateFormView();
}

/* ----- 챕터 편집기 (목표 입력 · 필독서 관리 공용, 한 화면에 하나) ----- */

function renderChapterEditorHtml(lastPage) {
  return `
    <div class="field">
      <span class="field-label">챕터 목록</span>
      <table class="chapter-table">
        <thead>
          <tr><th class="col-no">#</th><th>챕터 이름</th><th class="col-page">시작 페이지</th><th class="col-page">끝 페이지</th><th class="col-del"></th></tr>
        </thead>
        <tbody id="chapter-rows"></tbody>
      </table>
      <button type="button" class="btn btn-small" id="add-chapter">+ 챕터 추가</button>
    </div>
    <div class="field-row">
      <div class="field">
        <label class="field-label" for="f-last-page">마지막 페이지</label>
        <input id="f-last-page" type="number" min="1" class="input input-num"
          value="${Number.isFinite(Number(lastPage)) && lastPage !== '' && lastPage !== null ? Number(lastPage) : ''}">
      </div>
      <div class="field">
        <span class="field-label">합계</span>
        <span id="f-book-summary" class="field-value">-</span>
      </div>
    </div>`;
}

/** 챕터 행 채우기. locked면 읽기 전용 (필독서) */
function fillChapterEditor(chapters, locked = false) {
  const list = chapters && chapters.length ? chapters : [{ name: '', startPage: '' }];
  list.forEach((ch) => addChapterRow({ name: ch.name, startPage: Number.isFinite(Number(ch.startPage)) && ch.startPage !== '' ? ch.startPage : '' }));
  if (locked) {
    document.querySelectorAll('#chapter-rows input, #f-last-page').forEach((el) => { el.readOnly = true; });
    document.getElementById('add-chapter').hidden = true;
    document.querySelectorAll('.ch-del').forEach((el) => { el.hidden = true; });
  }
}

function bindChapterEditor(container, onChange) {
  container.addEventListener('click', (e) => {
    if (e.target.id === 'add-chapter') {
      addChapterRow({ name: '', startPage: '' });
      onChange();
      const inputs = container.querySelectorAll('.ch-name');
      inputs[inputs.length - 1].focus();
    }
    if (e.target.classList.contains('ch-del')) {
      const rows = container.querySelectorAll('#chapter-rows tr');
      if (rows.length > 1) e.target.closest('tr').remove();
      onChange();
    }
  });
}

function readChapterEditor() {
  const rows = [...document.querySelectorAll('#chapter-rows tr')];
  const last = document.getElementById('f-last-page').value;
  return {
    chapters: rows.map((tr) => ({
      name: tr.querySelector('.ch-name').value,
      startPage: tr.querySelector('.ch-start').value === '' ? NaN : Number(tr.querySelector('.ch-start').value),
    })),
    lastPage: last === '' ? NaN : Number(last),
  };
}

/** 끝 페이지 자동 계산, 합계 표시 */
function refreshChapterEditor() {
  const { chapters, lastPage } = readChapterEditor();
  const rows = [...document.querySelectorAll('#chapter-rows tr')];
  rows.forEach((tr, i) => {
    tr.querySelector('.ch-no').textContent = i + 1;
    const nextStart = i < rows.length - 1 ? chapters[i + 1].startPage : lastPage + 1;
    const start = chapters[i].startPage;
    const end = nextStart - 1;
    tr.querySelector('.ch-end').textContent = Number.isInteger(start) && Number.isInteger(end) && end >= start ? end : '-';
    tr.querySelector('.ch-del').disabled = rows.length === 1;
  });
  const first = chapters[0] && chapters[0].startPage;
  document.getElementById('f-book-summary').textContent =
    Number.isInteger(first) && Number.isInteger(lastPage) && lastPage >= first
      ? `${lastPage - first + 1}페이지 · ${chapters.length}개 챕터`
      : '-';
}

function addChapterRow(ch) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="col-no ch-no"></td>
    <td><input type="text" class="input ch-name" value="${escapeHtml(ch.name)}" placeholder="예: 1장 도입"></td>
    <td class="col-page"><input type="number" min="1" class="input input-num ch-start" value="${escapeHtml(ch.startPage)}"></td>
    <td class="col-page ch-end muted">-</td>
    <td class="col-del"><button type="button" class="btn-icon ch-del" title="행 삭제">×</button></td>
  `;
  document.getElementById('chapter-rows').appendChild(tr);
}

function getFormType() {
  return document.querySelector('#goal-form input[name="type"]:checked').value;
}

/** 폼의 현재 값을 입력 객체로 모은다 */
function collectFormInput() {
  const val = (id) => document.getElementById(id).value;
  return {
    type: getFormType(),
    title: val('f-title'),
    startDate: val('f-start'),
    dueDate: val('f-due'),
    ...readChapterEditor(),
    author: val('f-author'),
    titles: parseLectureLines(val('f-lectures')),
    restWeekdays: [...document.querySelectorAll('input[name="rest-weekday"]:checked')].map((el) => Number(el.value)),
  };
}

/** 종류 전환, 끝 페이지 자동 계산, 합계 표시 */
function updateFormView() {
  const input = collectFormInput();
  const isBook = input.type === 'book';
  document.querySelector('[data-section="book"]').hidden = !isBook;
  document.querySelector('[data-section="lecture"]').hidden = isBook;
  document.getElementById('f-title-label').textContent = isBook ? '책 제목' : '강의 이름';

  const days = isValidDateStr(input.startDate) && isValidDateStr(input.dueDate)
    ? countDaysInclusive(input.startDate, input.dueDate) : null;
  let daysText = '-';
  if (days !== null) {
    const study = days > 0 ? countStudyDays(input.startDate, input.dueDate, input.restWeekdays) : 0;
    daysText = days <= 0 ? '마감일이 시작일보다 앞입니다'
      : study === days ? `${days}일` : `${days}일 중 공부하는 날 ${study}일`;
  }
  document.getElementById('f-days').textContent = daysText;

  // 하루 평균 분량 안내
  let daily = '';
  if (days > 0) {
    const study = countStudyDays(input.startDate, input.dueDate, input.restWeekdays);
    const first = input.chapters[0] && input.chapters[0].startPage;
    const total = isBook
      ? (Number.isInteger(first) && Number.isInteger(input.lastPage) ? input.lastPage - first + 1 : 0)
      : input.titles.length;
    if (study > 0 && total > 0) {
      const avg = total / study;
      const unit = isBook ? '페이지' : '강';
      daily = `공부하는 날 하루 약 <b>${avg >= 10 ? Math.round(avg) : Math.round(avg * 10) / 10}${unit}</b>`;
    }
  }
  document.getElementById('f-daily').innerHTML = daily;

  refreshChapterEditor();
  document.getElementById('f-lecture-count').textContent = `${input.titles.length}개 강의`;
}

function submitGoalForm(goal, requiredBookId = null) {
  const input = collectFormInput();
  const errors = goal
    ? validateGoalEdit(goal, input)
    : input.type === 'book' ? validateBookInput(input) : validateLectureInput(input);

  const box = document.getElementById('form-errors');
  if (errors.length) {
    box.innerHTML = `<strong>저장할 수 없습니다</strong><ul>${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  box.hidden = true;

  if (goal) {
    if (hasGoalStarted(goal) && isPlanAffectingEdit(goal, input)) {
      // 진행 중인 목표의 계획이 바뀌는 수정 → 상세 화면에서 미리보기 후 적용
      openPreview(goal, { kind: 'edit', input });
    } else {
      applyGoalEdit(goal, input);
      commit();
    }
    navigate(`#/goal/${goal.id}`);
  } else {
    const created = input.type === 'book' ? createBookGoal({ ...input, requiredBookId }) : createLectureGoal(input);
    appData.goals.push(created);
    commit();
    navigate(requiredBookId ? `#/goal/${created.id}` : '#/');
  }
}

/* =========================================================================
 * 10. 화면 — 목표 상세 (현황 + 진도 입력 + 계획표)
 * ========================================================================= */

/**
 * 상세 화면 보기 상태
 *  basis: 계획표 기준 탭 / view: 'list' | 'calendar' / month: 달력에서 보는 달('YYYY-MM')
 *  preview: 적용 전 새 계획 미리보기 { kind: 'replan' | 'due' | 'edit', dueDate?, input? }
 *  draft: 미리보기에서 "수정으로 돌아가기" 할 때 폼에 다시 채울 입력값
 */
const detailState = { goalId: null, basis: null, view: 'list', month: null, preview: null, draft: null };

function resetDetailState(goal) {
  detailState.goalId = goal.id;
  detailState.basis = getPrimaryBasis(goal);
  detailState.month = null;
  detailState.preview = null;
}

function openPreview(goal, preview) {
  if (detailState.goalId !== goal.id) resetDetailState(goal);
  detailState.preview = preview;
}

function renderGoalDetail(root, goal) {
  if (detailState.goalId !== goal.id) resetDetailState(goal);
  const basis = detailState.basis;
  const s = getGoalSummary(goal);

  root.innerHTML = `
    <div id="detail">
      <header class="page-header">
        <div class="detail-title">
          ${renderCoverThumb(getCoverUrl(goal), 'lg')}
          <div>
          <a class="back-link" href="#/">← 대시보드</a>
          <h1>${escapeHtml(goal.title)}</h1>
          ${getBookAuthor(goal) ? `<p class="detail-author">${escapeHtml(getBookAuthor(goal))} 지음</p>` : ''}
          <p class="muted">
            ${goal.requiredBookId && requiredBooks.some((b) => b.id === goal.requiredBookId)
              ? '<span class="type-tag type-required">필독서</span>'
              : `<span class="type-tag type-${goal.type}">${goal.type === 'book' ? '책' : '강의'}</span>`}
            ${goal.startDate} ~ ${goal.dueDate} · ${formatDday(s.dday)}
            ${getRestWeekdays(goal).length ? ` · 쉬는 요일 ${WEEKDAY_ORDER.filter((d) => getRestWeekdays(goal).includes(d)).map((d) => WEEKDAYS_KO[d]).join('·')}` : ''}
          </p>
          </div>
        </div>
        <div class="header-actions">
          <a class="btn" href="#/edit/${escapeHtml(goal.id)}">수정</a>
          <button type="button" class="btn btn-danger" data-action="delete">삭제</button>
        </div>
      </header>

      ${renderRequiredBookNotice(goal)}
      ${renderSummaryPanel(goal, s)}
      ${detailState.preview ? renderPreviewPanel(goal, basis) : renderPlanPanel(goal, basis)}
    </div>
  `;
  bindDetailEvents(root.querySelector('#detail'), goal);
}

function renderBasisTabs(goal, basis) {
  if (goal.type !== 'book') return '';
  return `
    <div class="tabs" role="tablist" aria-label="계획 기준">
      ${['page', 'chapter'].map((b) => `
        <button type="button" role="tab" class="tab ${b === basis ? 'is-active' : ''}" data-basis="${b}">
          ${b === 'page' ? '페이지 기준' : '챕터 기준'}
        </button>`).join('')}
    </div>`;
}

function renderPlanPanel(goal, basis) {
  return `
    <section class="panel plan-panel">
      <div class="plan-head">
        <h2 class="section-title">계획표</h2>
        <div class="plan-controls">
          <button type="button" class="btn btn-small" data-action="export-image">이미지로 내보내기</button>
          <div class="tabs" role="tablist" aria-label="보기 방식">
            ${[['list', '목록'], ['calendar', '달력']].map(([v, label]) => `
              <button type="button" role="tab" class="tab ${v === detailState.view ? 'is-active' : ''}" data-view="${v}">${label}</button>`).join('')}
          </div>
          ${renderBasisTabs(goal, basis)}
        </div>
      </div>
      ${goal.plans[basis].current ? `
        <p class="plan-note">${formatShortDate(goal.plans[basis].current.startDate)}부터 재분배된 계획입니다.
          목록 보기의 "원래 계획 누적" 열에서 처음 계획과 비교할 수 있습니다.</p>` : ''}
      ${detailState.view === 'calendar' ? renderPlanCalendar(goal, basis) : renderPlanTable(goal, basis)}
    </section>
  `;
}

/* ----- 계획 대비 현황 ----- */

function formatAmount(n, basis) {
  return `${n}${getUnitLabel(basis)}`;
}

/** 현황 안내 문구와 색 */
function getCompareMessage(goal, s) {
  const u = (n) => formatAmount(n, s.basis);
  if (s.isComplete) return { tone: 'done', html: '모두 완료했습니다. 수고하셨어요!' };
  if (s.isOverdue) {
    return { tone: 'ended', html: `마감일이 지났습니다. 남은 <b>${u(s.remaining)}</b>${josa(u(s.remaining), '은', '는')} <b>마감일 변경</b>으로 다시 계획할 수 있어요.` };
  }
  if (s.notStarted) {
    return { tone: 'neutral', html: `${formatShortDate(goal.startDate)}에 시작합니다. 공부하는 날마다 <b>하루 ${u(s.dailyPlan)}</b>씩 하면 됩니다.` };
  }
  if (s.remainingStudyDays === 0) {
    return { tone: 'behind', html: `마감일까지 공부하는 날이 남아 있지 않습니다. 남은 <b>${u(s.remaining)}</b>${josa(u(s.remaining), '을', '를')} 하려면 마감일을 변경해 주세요.` };
  }
  const rest = `남은 공부일 ${s.remainingStudyDays}일 동안 <b>하루 ${u(s.needPerDay)}</b>씩`;
  if (s.diff < 0) return { tone: 'behind', html: `계획보다 <b>${u(-s.diff)} 밀렸습니다.</b> ${rest} 하면 기한을 맞출 수 있어요.` };
  if (s.diff > 0) return { tone: 'ahead', html: `계획보다 <b>${u(s.diff)} 앞서 있어요.</b> ${rest}이면 충분해요.` };
  if (s.todayRow && s.todayRow.isRestDay) return { tone: 'ontrack', html: '오늘은 쉬는 날이에요. 계획대로 진행 중입니다.' };
  if (s.done >= s.target) return { tone: 'ontrack', html: '오늘 분량을 마쳤어요. 계획대로 진행 중입니다.' };
  return { tone: 'ontrack', html: `계획대로 진행 중이에요. 오늘 <b>${u(s.target - s.done)}</b> 남았어요.` };
}

/** 관리자가 필독서 내용을 바꿨으면 반영 안내 */
function renderRequiredBookNotice(goal) {
  const book = goal.requiredBookId ? requiredBooks.find((b) => b.id === goal.requiredBookId) : null;
  if (!book || !isRequiredBookChanged(goal, book) || detailState.preview) return '';
  return `
    <div class="notice notice-row">
      <span>관리자가 이 필독서의 책 정보(제목·챕터·페이지)를 바꿨습니다. 내 계획에 반영하려면 미리보기를 확인하세요.</span>
      <button type="button" class="btn btn-small" data-action="sync-required">반영 미리보기</button>
    </div>`;
}

function renderSummaryPanel(goal, s) {
  const { min, max } = getProgressBounds(goal);
  const isBook = goal.type === 'book';
  const cur = goal.progress.current;
  const position = isBook
    ? `${cur < bookFirstPage(goal.book) ? '아직 읽지 않음' : `p.${cur}까지 읽음`} · 완료 챕터 ${completedChapterCount(goal.book, cur)}/${goal.book.chapters.length}`
    : (cur === 0 ? '아직 듣지 않음' : `${cur}강까지 완료`);
  const targetPercent = s.total > 0 ? Math.min(100, (s.target / s.total) * 100) : 0;
  const donePercent = s.total > 0 ? Math.min(100, (s.done / s.total) * 100) : 0;
  const msg = getCompareMessage(goal, s);
  const replanBlocker = getReplanBlocker(goal);
  const previewing = !!detailState.preview;

  return `
    <section class="panel summary-panel">
      <div class="summary-top">
        <h2 class="section-title">계획 대비 현황</h2>
        ${renderStatusBadge(s)}
      </div>

      <div class="stat-boxes">
        <div class="stat-box"><strong>${formatAmount(s.dailyPlan, s.basis)}</strong><span>하루 권장</span></div>
        <div class="stat-box"><strong>${formatAmount(s.target, s.basis)}</strong><span>오늘까지 권장</span></div>
        <div class="stat-box"><strong>${formatAmount(s.done, s.basis)}</strong><span>실제 완료</span></div>
        <div class="stat-box"><strong>${formatAmount(s.total, s.basis)}</strong><span>전체</span></div>
      </div>

      <div class="compare-bar" role="img"
        aria-label="실제 진도 ${s.percent}%, 오늘까지 권장 ${Math.round(targetPercent)}%">
        <div class="compare-fill" style="width:${donePercent}%"></div>
        <div class="compare-marker" style="left:${targetPercent}%"></div>
      </div>
      <div class="compare-legend">
        <span><i class="legend-fill"></i>초록 = 실제 진도 ${s.percent}%</span>
        <span><i class="legend-marker"></i>검정 선 = 오늘까지 권장 ${Math.floor(targetPercent)}%</span>
      </div>

      <div class="compare-message tone-${msg.tone}">${msg.html}</div>

      <div class="summary-info">
        <div><span class="info-label">현재 위치</span>${escapeHtml(position)}</div>
        <div class="summary-today"><span class="info-label">오늘 할 일</span>${renderTodayAmount(goal, s)}</div>
      </div>

      <div class="summary-actions">
        <form class="progress-form" data-action="progress" novalidate>
          <label for="progress-input" class="field-label">${isBook ? '마지막으로 읽은 페이지' : '완료한 강의 수'}</label>
          <input id="progress-input" type="number" class="input input-num" min="${min}" max="${max}" value="${cur}">
          <span class="muted">${isBook ? `(p.${min}~${max})` : `(0~${max}강)`}</span>
          <button type="submit" class="btn btn-primary">진도 기록</button>
          <span class="progress-error" hidden></span>
        </form>
        <div class="plan-actions">
          <button type="button" class="btn" data-action="replan" ${replanBlocker || previewing ? 'disabled' : ''}
            title="${escapeHtml(replanBlocker || '오늘부터 마감일까지 남은 분량을 다시 균등하게 나눕니다')}">재분배</button>
          <button type="button" class="btn" data-action="due" ${previewing ? 'disabled' : ''}>마감일 변경</button>
        </div>
      </div>
    </section>
  `;
}

/* ----- 새 계획 미리보기 (계획표 자리에 표시) ----- */

/** 미리보기용으로 목표를 복제해 변경을 적용해 본다 */
function buildPreviewGoal(goal, preview, today = todayStr()) {
  const clone = structuredClone(goal);
  if (preview.kind === 'replan') {
    const blocker = getReplanBlocker(goal, today);
    if (blocker) return { errors: [blocker] };
    return { clone: replanGoal(clone, today), errors: [] };
  }
  if (preview.kind === 'due') {
    if (preview.dueDate === goal.dueDate) return { errors: [], waiting: true };
    const errors = validateDueDateChange(goal, preview.dueDate, today);
    if (errors.length) return { errors };
    return { clone: changeDueDate(clone, preview.dueDate, today), errors: [] };
  }
  const errors = validateGoalEdit(goal, preview.input, today);
  if (errors.length) return { errors };
  return { clone: applyGoalEdit(clone, preview.input, today), errors: [] };
}

/** 수정 미리보기에서 무엇이 바뀌는지 */
function describeEditChanges(goal, input) {
  const changes = [];
  if (goal.title !== input.title.trim()) changes.push('이름');
  if (goal.startDate !== input.startDate) changes.push('시작일');
  if (goal.dueDate !== input.dueDate) changes.push(`마감일(${goal.dueDate} → ${input.dueDate})`);
  if (getRestWeekdays(goal).join() !== normalizeWeekdays(input.restWeekdays).join()) changes.push('쉬는 요일');
  if (goal.type === 'book') {
    if (isBookStructureChanged(goal, input)) changes.push('챕터·페이지');
    if (getBookAuthor(goal) !== (input.author || '').trim()) changes.push('저자');
  } else if (JSON.stringify(goal.lecture.titles) !== JSON.stringify(input.titles)) {
    changes.push(`강의 목록(${goal.lecture.titles.length}개 → ${input.titles.length}개)`);
  }
  return changes;
}

/** 미리보기 본문과 적용 가능 여부 (마감일 입력칸은 다시 그리지 않도록 분리) */
function renderPreviewContent(goal, basis) {
  const preview = detailState.preview;
  const today = todayStr();
  const result = buildPreviewGoal(goal, preview, today);
  let body;
  if (result.waiting) {
    body = '<p class="preview-hint">새 마감일을 고르면 바뀐 계획을 여기에 보여드립니다.</p>';
  } else if (result.errors.length) {
    body = `<div class="errors"><ul>${result.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
  } else {
    body = renderPreviewBody(goal, result.clone, basis, preview, today);
  }
  return { body, canApply: !result.waiting && !result.errors.length };
}

function renderPreviewPanel(goal, basis) {
  const preview = detailState.preview;
  const today = todayStr();
  const title = { replan: '재분배 미리보기', due: '마감일 변경 미리보기', edit: '수정 내용 미리보기' }[preview.kind];
  const { body, canApply } = renderPreviewContent(goal, basis);

  return `
    <section class="panel plan-panel is-preview">
      <div class="plan-head">
        <h2 class="section-title">${title} <span class="badge badge-waiting">적용 전</span></h2>
        ${renderBasisTabs(goal, basis)}
      </div>

      ${preview.kind === 'due' ? `
        <div class="due-picker">
          <label class="field-label" for="preview-due">새 마감일</label>
          <input id="preview-due" type="date" class="input" value="${escapeHtml(preview.dueDate)}" min="${today}">
          <span class="muted">현재 마감일 ${goal.dueDate}</span>
        </div>` : ''}

      <div id="preview-body">${body}</div>

      <div class="preview-actions">
        ${preview.kind === 'edit' ? '<button type="button" class="btn" data-action="preview-back">수정으로 돌아가기</button>' : ''}
        <button type="button" class="btn" data-action="preview-cancel">취소</button>
        <button type="button" class="btn btn-primary" data-action="preview-apply" ${canApply ? '' : 'disabled'}>적용</button>
      </div>
    </section>
  `;
}

function renderPreviewBody(goal, clone, basis, preview, today) {
  const newPlan = getActivePlan(clone, basis);
  const oldPlan = getActivePlan(goal, basis);
  const unit = getUnitLabel(basis);
  const rows = buildSchedule(newPlan);
  const studyDays = countStudyDays(newPlan.startDate, newPlan.endDate, newPlan.restWeekdays);
  const avg = studyDays > 0 ? (newPlan.to - newPlan.from) / studyDays : 0;
  const lo = Math.floor(avg);
  const hi = Math.ceil(avg);
  const oldStudyDays = Math.max(1, countStudyDays(oldPlan.startDate, oldPlan.endDate, oldPlan.restWeekdays));
  const oldAvg = Math.round((oldPlan.to - oldPlan.from) / oldStudyDays);
  const rebuilt = !clone.plans[basis].current; // 시작 전이라 원래 계획을 새로 만든 경우

  const lines = [];
  if (preview.kind === 'edit') lines.push(`바뀌는 항목: ${describeEditChanges(goal, preview.input).join(', ')}`);
  if (preview.kind === 'due') lines.push(`마감일 ${goal.dueDate} → <b>${preview.dueDate}</b>`);
  lines.push(`남은 <b>${newPlan.to - newPlan.from}${unit}</b>${josa(unit, '을', '를')} ${formatShortDate(newPlan.startDate)}부터 ${formatShortDate(newPlan.endDate)}까지 공부하는 날 <b>${studyDays}일</b>에 나눕니다.`);
  lines.push(`하루 <b>${lo === hi ? lo : `${lo}~${hi}`}${unit}</b> <span class="muted">(지금 계획: 하루 평균 ${oldAvg}${unit})</span>`);
  lines.push(rebuilt
    ? '<span class="muted">아직 시작 전이라 원래 계획을 새로 만듭니다.</span>'
    : '<span class="muted">원래 계획은 그대로 보관되어 계획표에서 비교할 수 있습니다.</span>');

  const body = rows.map((row) => {
    const dayDiff = diffDays(today, row.date);
    const classes = [dayDiff === 0 ? 'is-today' : '', row.isRestDay ? 'is-rest-day' : ''].filter(Boolean).join(' ');
    return `
      <tr class="${classes}">
        <td class="col-date">${row.date}${dayDiff === 0 ? ' <span class="today-tag">오늘</span>' : ''}</td>
        <td class="col-weekday">${weekdayKo(row.date)}</td>
        <td class="col-content">${describeRowContent(clone, basis, row)}</td>
        <td class="col-cum"><strong>${formatCumulative(clone, basis, row.cumulative)}</strong></td>
        <td class="col-cum col-original">${formatCumulative(goal, basis, cumulativeOnDate(oldPlan, row.date))}</td>
      </tr>`;
  }).join('');

  return `
    <div class="preview-summary">${lines.map((l) => `<p>${l}</p>`).join('')}</div>
    <table class="plan-table">
      <thead>
        <tr>
          <th class="col-date">날짜</th>
          <th class="col-weekday">요일</th>
          <th>오늘 분량</th>
          <th class="col-cum">새 누적 목표</th>
          <th class="col-cum">지금 계획 누적</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

/** 계획표의 "오늘 분량" 칸 내용 */
function describeRowContent(goal, basis, row) {
  if (row.isRestDay) return '<span class="rest">쉬는 날</span>';
  if (row.amount === 0) return '<span class="rest">휴식(분량 없음)</span>';
  const from = row.prevCumulative;
  const to = row.cumulative;

  if (basis === 'page') {
    const a = unitsToPage(goal.book, from + 1);
    const b = unitsToPage(goal.book, to);
    return `<strong>${a === b ? `p.${a}` : `p.${a}~${b}`}</strong>
      <span class="muted">· ${escapeHtml(describeChaptersForPages(goal.book, a, b))} (${row.amount}페이지)</span>`;
  }
  if (basis === 'chapter') {
    return getChapterRanges(goal.book).slice(from, to)
      .map((c) => `<div>${escapeHtml(c.name)} <span class="muted">(p.${Number(c.startPage)}~${Number(c.endPage)})</span></div>`)
      .join('');
  }
  return goal.lecture.titles.slice(from, to)
    .map((title, i) => `<div><strong>${from + i + 1}강</strong> ${escapeHtml(title)}</div>`)
    .join('');
}

/** 누적 값 표시 (페이지는 도달해야 할 페이지 번호로) */
function formatCumulative(goal, basis, units) {
  if (basis === 'page') return units === 0 ? '-' : `p.${unitsToPage(goal.book, units)}`;
  if (basis === 'chapter') return `${units}챕터`;
  return `${units}강`;
}

/** 계획표 행(또는 달력 칸)의 상태: 오늘 강조, 완료 흐리게, 지난 날 미달 경고 */
function getRowState(row, done, today, replanned) {
  const dayDiff = diffDays(today, row.date); // 음수: 지난 날
  const checked = done >= row.cumulative;
  const classes = [
    dayDiff === 0 ? 'is-today' : '',
    checked ? 'is-done' : '',
    dayDiff < 0 && !checked ? 'is-behind' : '',
    row.isPreReplan && replanned ? 'is-pre-replan' : '',
    row.isRestDay ? 'is-rest-day' : '',
  ].filter(Boolean).join(' ');
  return { dayDiff, checked, classes };
}

function renderPlanTable(goal, basis) {
  const today = todayStr();
  const rows = buildTimeline(goal, basis);
  const replanned = !!goal.plans[basis].current;
  const done = getDoneUnits(goal, basis);

  const body = rows.map((row) => {
    const { dayDiff, checked, classes } = getRowState(row, done, today, replanned);

    return `
      <tr class="${classes}">
        <td class="col-date">${row.date}${dayDiff === 0 ? ' <span class="today-tag">오늘</span>' : ''}</td>
        <td class="col-weekday">${weekdayKo(row.date)}</td>
        <td class="col-content">${describeRowContent(goal, basis, row)}</td>
        <td class="col-cum">${formatCumulative(goal, basis, row.cumulative)}</td>
        ${replanned ? `<td class="col-cum col-original">${formatCumulative(goal, basis, row.originalCumulative)}</td>` : ''}
        <td class="col-check">
          ${row.amount === 0 ? '<span class="muted">-</span>'
            : `<input type="checkbox" class="row-check" data-date="${row.date}" ${checked ? 'checked' : ''}
                aria-label="${row.date} 완료">`}
        </td>
      </tr>`;
  }).join('');

  return `
    <table class="plan-table">
      <thead>
        <tr>
          <th class="col-date">날짜</th>
          <th class="col-weekday">요일</th>
          <th>오늘 분량</th>
          <th class="col-cum">누적 목표</th>
          ${replanned ? '<th class="col-cum">원래 계획 누적</th>' : ''}
          <th class="col-check">완료</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

/** 달력 칸에 들어갈 짧은 내용 */
function describeCellContent(goal, basis, row) {
  if (row.isRestDay) return '<span class="rest">쉬는 날</span>';
  if (row.amount === 0) return '<span class="rest">휴식</span>';
  const from = row.prevCumulative;
  const to = row.cumulative;
  if (basis === 'page') {
    const a = unitsToPage(goal.book, from + 1);
    const b = unitsToPage(goal.book, to);
    return `<strong>${a === b ? `p.${a}` : `p.${a}~${b}`}</strong>
      <span class="cell-sub">${escapeHtml(describeChaptersForPages(goal.book, a, b))}</span>`;
  }
  const items = basis === 'chapter'
    ? getChapterRanges(goal.book).slice(from, to).map((c) => escapeHtml(c.name))
    : goal.lecture.titles.slice(from, to).map((t, i) => `<strong>${from + i + 1}강</strong> ${escapeHtml(t)}`);
  const shown = items.slice(0, 3).map((x) => `<span class="cell-line">${x}</span>`).join('');
  return items.length > 3 ? `${shown}<span class="cell-sub">외 ${items.length - 3}개</span>` : shown;
}

function monthKey(date) {
  return date.slice(0, 7);
}

function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** 달력 보기: 한 달씩, 월요일 시작 */
function renderPlanCalendar(goal, basis) {
  const today = todayStr();
  const rows = buildTimeline(goal, basis);
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const replanned = !!goal.plans[basis].current;
  const done = getDoneUnits(goal, basis);

  const firstMonth = monthKey(rows[0].date);
  const lastMonth = monthKey(rows.at(-1).date);
  if (!detailState.month || detailState.month < firstMonth || detailState.month > lastMonth) {
    const t = monthKey(today);
    detailState.month = t < firstMonth ? firstMonth : t > lastMonth ? lastMonth : t;
  }
  const month = detailState.month;
  const [y, m] = month.split('-').map(Number);

  // 월요일 시작 격자: 첫 주 앞쪽 빈칸 수
  const firstDate = `${month}-01`;
  const lead = (parseDate(firstDate).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<div class="cal-cell is-empty"></div>');
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${month}-${pad2(d)}`;
    const row = byDate.get(date);
    const dow = parseDate(date).getDay();
    const dowClass = dow === 0 ? 'is-sun' : dow === 6 ? 'is-sat' : '';
    if (!row) {
      cells.push(`<div class="cal-cell is-out"><span class="cal-day ${dowClass}">${d}</span></div>`);
      continue;
    }
    const { dayDiff, checked, classes } = getRowState(row, done, today, replanned);
    cells.push(`
      <div class="cal-cell ${classes}">
        <div class="cal-cell-head">
          <span class="cal-day ${dowClass}">${d}${dayDiff === 0 ? ' <span class="today-tag">오늘</span>' : ''}</span>
          ${row.amount === 0 ? ''
            : `<input type="checkbox" class="row-check" data-date="${date}" ${checked ? 'checked' : ''} aria-label="${date} 완료">`}
        </div>
        <div class="cal-content">${describeCellContent(goal, basis, row)}</div>
      </div>`);
  }
  while (cells.length % 7 !== 0) cells.push('<div class="cal-cell is-empty"></div>');

  return `
    <div class="calendar">
      <div class="cal-nav">
        <button type="button" class="btn btn-small" data-month="-1" ${month <= firstMonth ? 'disabled' : ''} aria-label="이전 달">◀</button>
        <strong class="cal-title">${y}년 ${m}월</strong>
        <button type="button" class="btn btn-small" data-month="1" ${month >= lastMonth ? 'disabled' : ''} aria-label="다음 달">▶</button>
      </div>
      <div class="cal-grid">
        ${WEEKDAY_ORDER.map((d) => `<div class="cal-weekday ${d === 0 ? 'is-sun' : d === 6 ? 'is-sat' : ''}">${WEEKDAYS_KO[d]}</div>`).join('')}
        ${cells.join('')}
      </div>
    </div>
  `;
}

/** 미리보기 내용을 실제 목표에 적용 */
function applyPreview(goal) {
  const preview = detailState.preview;
  const result = buildPreviewGoal(goal, preview);
  if (result.waiting || result.errors.length) return;
  if (preview.kind === 'replan') replanGoal(goal);
  else if (preview.kind === 'due') changeDueDate(goal, preview.dueDate);
  else applyGoalEdit(goal, preview.input);
  commit();
  detailState.preview = null;
  rerenderDetail(goal);
}

function rerenderDetail(goal) {
  const y = window.scrollY;
  renderGoalDetail(document.getElementById('app'), goal);
  window.scrollTo(0, y);
}

function bindDetailEvents(container, goal) {
  container.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="export-image"]')) {
      openExportDialog(goal);
      return;
    }
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) {
      detailState.view = viewBtn.dataset.view;
      rerenderDetail(goal);
      return;
    }
    const monthBtn = e.target.closest('[data-month]');
    if (monthBtn) {
      detailState.month = shiftMonth(detailState.month, Number(monthBtn.dataset.month));
      rerenderDetail(goal);
      return;
    }
    const tab = e.target.closest('[data-basis]');
    if (tab) {
      detailState.basis = tab.dataset.basis;
      rerenderDetail(goal);
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'sync-required') {
      const book = requiredBooks.find((b) => b.id === goal.requiredBookId);
      openPreview(goal, { kind: 'edit', input: inputFromRequiredBook(goal, book) });
      rerenderDetail(goal);
      return;
    }
    if (action === 'replan') {
      openPreview(goal, { kind: 'replan' });
      rerenderDetail(goal);
      return;
    }
    if (action === 'due') {
      openPreview(goal, { kind: 'due', dueDate: goal.dueDate });
      rerenderDetail(goal);
      document.getElementById('preview-due')?.focus();
      return;
    }
    if (action === 'preview-cancel') {
      detailState.preview = null;
      rerenderDetail(goal);
      return;
    }
    if (action === 'preview-back') {
      detailState.draft = detailState.preview.input;
      detailState.preview = null;
      navigate(`#/edit/${goal.id}`);
      return;
    }
    if (action === 'preview-apply') {
      applyPreview(goal);
      return;
    }
    if (e.target.closest('[data-action="delete"]')) {
      if (confirm(`'${goal.title}' 목표를 삭제할까요?\n진도 기록과 계획이 모두 지워지며 되돌릴 수 없습니다.`)) {
        removeGoal(appData, goal.id);
        commit();
        navigate('#/');
      }
    }
  });

  // 방식 2: 계획표 체크박스 (+ 마감일 변경 미리보기의 날짜 선택)
  container.addEventListener('change', (e) => {
    if (e.target.id === 'preview-due') {
      // 입력칸은 그대로 두고 본문만 갱신 (키보드로 날짜를 입력하는 중에도 포커스 유지)
      detailState.preview.dueDate = e.target.value;
      const { body, canApply } = renderPreviewContent(goal, detailState.basis);
      container.querySelector('#preview-body').innerHTML = body;
      container.querySelector('[data-action="preview-apply"]').disabled = !canApply;
      return;
    }
    if (!e.target.classList.contains('row-check')) return;
    const basis = detailState.basis;
    const row = buildTimeline(goal, basis).find((r) => r.date === e.target.dataset.date);
    applyRowCheck(goal, basis, row, e.target.checked);
    commit();
    rerenderDetail(goal);
  });

  // 방식 1: 직접 입력
  container.querySelector('[data-action="progress"]').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = e.target.querySelector('#progress-input');
    const errorBox = e.target.querySelector('.progress-error');
    const { min, max } = getProgressBounds(goal);
    const value = Number(input.value);
    if (input.value === '' || !Number.isInteger(value) || value < min || value > max) {
      errorBox.textContent = `${min}~${max} 사이의 정수를 입력하세요.`;
      errorBox.hidden = false;
      input.focus();
      return;
    }
    setProgress(goal, value);
    commit();
    rerenderDetail(goal);
  });
}

/* =========================================================================
 * 11. 화면 — 관리자 (진도 현황 · 사역자 필독서 · 회원 관리)
 *     서버에서도 관리자만 허용되므로, 화면은 편의를 위한 것이다.
 * ========================================================================= */

const adminState = {
  loaded: false,
  loading: false,
  error: null,
  profiles: [],
  goals: [], // [{ userId, goal }] 모든 사용자의 필독서 목표
  editingBookId: null, // null | 'new' | 책 id
  cover: null, // 편집 중인 표지 { file?, previewUrl, removed? }
};

const ADMIN_TABS = [
  ['progress', '진도 현황'],
  ['books', '사역자 필독서'],
  ['members', '회원 관리'],
];

async function loadAdminData() {
  adminState.loading = true;
  adminState.error = null;
  try {
    const [profiles, books, goals] = await Promise.all([
      adminLoadProfiles(), loadRequiredBooks(), adminLoadRequiredGoals(),
    ]);
    adminState.profiles = profiles;
    adminState.goals = goals.filter((x) => checkGoalShape(x.goal, 0) === null);
    requiredBooks = books;
    adminState.loaded = true;
  } catch (err) {
    console.error('[admin] 불러오기 실패:', err);
    adminState.error = err.message || String(err);
  }
  adminState.loading = false;
  if (parseRoute().view === 'admin') render();
}

function timestampToDate(iso) {
  return iso ? formatDate(new Date(iso)) : '-';
}

function profileName(p) {
  return p.name || p.email;
}

function renderAdmin(root, tab) {
  if (!ADMIN_TABS.some(([t]) => t === tab)) tab = 'progress';
  let body;
  if (adminState.error) {
    body = `<div class="errors">불러오지 못했습니다: ${escapeHtml(adminState.error)}</div>`;
  } else if (!adminState.loaded) {
    body = '<div class="empty">불러오는 중…</div>';
    if (!adminState.loading) loadAdminData();
  } else if (tab === 'books') {
    body = renderAdminBooks();
  } else if (tab === 'members') {
    body = renderAdminMembers();
  } else {
    body = renderAdminProgress();
  }

  root.innerHTML = `
    <div id="admin">
      <header class="page-header">
        <div>
          <a class="back-link" href="#/">← 내 계획</a>
          <h1>관리자</h1>
        </div>
        <div class="header-actions">
          <button type="button" class="btn" data-action="admin-refresh" ${adminState.loading ? 'disabled' : ''}>새로고침</button>
        </div>
      </header>
      <nav class="tabs admin-tabs" aria-label="관리자 메뉴">
        ${ADMIN_TABS.map(([t, label]) => `<a class="tab ${t === tab ? 'is-active' : ''}" href="#/admin/${t}">${label}</a>`).join('')}
      </nav>
      ${body}
    </div>`;
  bindAdminEvents(root.querySelector('#admin'), tab);
  if (tab === 'books' && adminState.editingBookId && adminState.loaded) {
    const book = requiredBooks.find((b) => b.id === adminState.editingBookId);
    fillChapterEditor(book ? book.chapters : []);
    refreshChapterEditor();
  }
}

/* ----- 진도 현황 ----- */

function renderAdminProgress() {
  const team = adminState.profiles.filter((p) => p.in_team);
  if (!requiredBooks.length) return '<div class="empty">아직 필독서가 없습니다. <a href="#/admin/books">사역자 필독서</a>에서 추가하세요.</div>';
  if (!team.length) return '<div class="empty">우리 팀으로 지정된 사람이 없습니다. <a href="#/admin/members">회원 관리</a>에서 지정하세요.</div>';
  const today = todayStr();

  return requiredBooks.map((book) => {
    const rows = team.map((p) => {
      const entry = adminState.goals.find((x) => x.userId === p.user_id && x.goal.requiredBookId === book.id);
      return { p, goal: entry ? entry.goal : null, s: entry ? getGoalSummary(entry.goal, 'page', today) : null };
    });
    const planned = rows.filter((r) => r.goal).length;
    const behind = rows.filter((r) => r.s && r.s.isActive && !r.s.notStarted && r.s.diff < 0).length;
    // 밀린 사람 → 진행 중 → 계획 없음 순
    const order = (r) => (!r.s ? 3 : r.s.diff < 0 && r.s.isActive ? 0 : r.s.isComplete ? 2 : 1);
    rows.sort((a, b) => order(a) - order(b) || profileName(a.p).localeCompare(profileName(b.p)));

    return `
      <section class="panel admin-book">
        <div class="admin-book-head">
          <div class="book-cell">
            ${renderCoverThumb(book.coverUrl, 'sm')}
            <div>
              <h2 class="section-title">${escapeHtml(book.title)}</h2>
              ${book.author ? `<span class="muted">${escapeHtml(book.author)}</span>` : ''}
            </div>
          </div>
          <span class="muted">계획 세운 사람 ${planned}/${team.length}명${behind ? ` · <b class="text-danger">밀림 ${behind}명</b>` : ''}</span>
        </div>
        <table class="admin-table">
          <thead>
            <tr><th>이름</th><th>기간</th><th class="num">오늘까지 권장</th><th class="num">실제 완료</th><th class="num">전체</th><th class="col-bar">진도</th><th>상태</th></tr>
          </thead>
          <tbody>
            ${rows.map(({ p, goal, s }) => {
              if (!goal) {
                return `<tr class="is-empty"><td>${escapeHtml(profileName(p))}</td><td colspan="5" class="muted">아직 계획을 세우지 않았습니다</td><td><span class="badge badge-waiting">계획 없음</span></td></tr>`;
              }
              const targetPct = s.total ? Math.min(100, (s.target / s.total) * 100) : 0;
              const donePct = s.total ? Math.min(100, (s.done / s.total) * 100) : 0;
              return `
                <tr>
                  <td><strong>${escapeHtml(profileName(p))}</strong></td>
                  <td class="muted">${formatShortDate(goal.startDate)} ~ ${formatShortDate(goal.dueDate)} · ${formatDday(s.dday)}</td>
                  <td class="num">${s.target}페이지</td>
                  <td class="num">${s.done}페이지</td>
                  <td class="num">${s.total}페이지</td>
                  <td class="col-bar">
                    <div class="mini-bar"><div class="compare-fill" style="width:${donePct}%"></div><div class="compare-marker" style="left:${targetPct}%"></div></div>
                    <span class="mini-pct">${s.percent}%</span>
                  </td>
                  <td>${renderStatusBadge(s)}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </section>`;
  }).join('') + '<p class="muted admin-legend">진도 막대: 초록 = 실제 진도, 검정 선 = 오늘까지 권장 · 각자 정한 기간 기준입니다.</p>';
}

/* ----- 사역자 필독서 ----- */

function renderAdminBooks() {
  const team = adminState.profiles.filter((p) => p.in_team);
  const editing = adminState.editingBookId;
  const book = editing && editing !== 'new' ? requiredBooks.find((b) => b.id === editing) : null;

  const editor = editing ? `
    <form id="book-form" class="panel admin-editor" novalidate>
      <h2 class="section-title">${book ? '필독서 수정' : '필독서 추가'}</h2>
      ${book ? `<p class="notice">저장하면 이미 계획을 세운 팀원에게 "내용 변경됨"이 표시되고,
        각자 미리보기를 확인한 뒤 자기 계획에 반영합니다.</p>` : ''}
      <div class="book-form-top">
        <div class="cover-picker">
          <div class="cover-preview" id="cover-preview">${renderCoverPreview(book)}</div>
          <label class="btn btn-small">표지 이미지 선택
            <input type="file" id="cover-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
          </label>
          <button type="button" class="btn btn-small" data-action="cover-remove">표지 빼기</button>
          <span class="field-hint">JPG·PNG·WEBP, 3MB 이하</span>
        </div>
        <div class="book-form-fields">
          <div class="field">
            <label class="field-label" for="f-title">책 제목</label>
            <input id="f-title" type="text" class="input input-wide" value="${escapeHtml(book ? book.title : '')}">
          </div>
          <div class="field">
            <label class="field-label" for="f-author">저자 <span class="muted">(선택)</span></label>
            <input id="f-author" type="text" class="input input-wide" value="${escapeHtml(book ? book.author : '')}">
          </div>
        </div>
      </div>
      ${renderChapterEditorHtml(book ? book.lastPage : '')}
      <div id="form-errors" class="errors" hidden></div>
      <div class="form-actions">
        <button type="button" class="btn" data-action="book-cancel">취소</button>
        <button type="submit" class="btn btn-primary">저장</button>
      </div>
    </form>` : '';

  const list = requiredBooks.length ? `
    <table class="admin-table panel-table">
      <thead><tr><th>책 제목</th><th class="num">챕터</th><th class="num">페이지</th><th class="num">계획 세운 팀원</th><th></th></tr></thead>
      <tbody>
        ${requiredBooks.map((b) => {
          const planned = team.filter((p) => adminState.goals.some((x) => x.userId === p.user_id && x.goal.requiredBookId === b.id)).length;
          return `
            <tr>
              <td>
                <div class="book-cell">
                  ${renderCoverThumb(b.coverUrl, 'sm')}
                  <div><strong>${escapeHtml(b.title)}</strong>${b.author ? `<div class="muted">${escapeHtml(b.author)}</div>` : ''}</div>
                </div>
              </td>
              <td class="num">${b.chapters.length}개</td>
              <td class="num">${b.lastPage - b.chapters[0].startPage + 1}페이지</td>
              <td class="num">${planned}/${team.length}명</td>
              <td class="row-actions">
                ${(() => {
                  const mine = findGoalForBook(appData.goals, b.id);
                  return mine
                    ? `<a class="btn btn-small" href="#/goal/${escapeHtml(mine.id)}">내 계획 보기</a>`
                    : `<a class="btn btn-small btn-primary" href="#/new/book/${escapeHtml(b.id)}">내 계획 세우기</a>`;
                })()}
                <button type="button" class="btn btn-small" data-action="book-edit" data-id="${escapeHtml(b.id)}" ${editing ? 'disabled' : ''}>수정</button>
                <button type="button" class="btn btn-small btn-danger" data-action="book-delete" data-id="${escapeHtml(b.id)}" ${editing ? 'disabled' : ''}>삭제</button>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>` : '<div class="empty">아직 필독서가 없습니다.</div>';

  return `
    <div class="admin-toolbar">
      <p class="muted">여기서 정한 책 정보(제목·챕터·페이지)가 우리 팀 모두에게 공유됩니다. 기간은 각자 정합니다.</p>
      <button type="button" class="btn btn-primary" data-action="book-new" ${editing ? 'disabled' : ''}>+ 필독서 추가</button>
    </div>
    ${editor}
    ${list}`;
}

/** 편집 중인 표지 미리보기 (새로 고른 파일 > 기존 표지) */
function renderCoverPreview(book) {
  const c = adminState.cover;
  const url = c ? (c.removed ? null : c.previewUrl) : (book && book.coverUrl);
  return url ? `<img src="${escapeHtml(url)}" alt="표지 미리보기">` : '<span class="cover-empty">표지 없음</span>';
}

function resetCoverDraft() {
  if (adminState.cover && adminState.cover.file) URL.revokeObjectURL(adminState.cover.previewUrl);
  adminState.cover = null;
}

async function submitBookForm(form) {
  const input = {
    title: document.getElementById('f-title').value,
    author: document.getElementById('f-author').value,
    ...readChapterEditor(),
  };
  const errors = [];
  if (!input.title.trim()) errors.push('책 제목을 입력하세요.');
  errors.push(...validateBookStructure(input));
  const box = form.querySelector('#form-errors');
  if (errors.length) {
    box.innerHTML = `<strong>저장할 수 없습니다</strong><ul>${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
    box.hidden = false;
    return;
  }
  const id = adminState.editingBookId === 'new' ? null : adminState.editingBookId;
  const before = id ? requiredBooks.find((b) => b.id === id) : null;
  const oldCover = before ? before.coverUrl : null;
  const draft = adminState.cover;
  form.querySelector('button[type="submit"]').disabled = true;
  try {
    let coverUrl = oldCover;
    if (draft && draft.file) coverUrl = await adminUploadCover(draft.file);
    else if (draft && draft.removed) coverUrl = null;
    const saved = await adminSaveRequiredBook({ ...input, id, coverUrl });
    if (oldCover && oldCover !== coverUrl) adminRemoveCoverFile(oldCover);
    const idx = requiredBooks.findIndex((b) => b.id === saved.id);
    if (idx >= 0) requiredBooks[idx] = saved;
    else requiredBooks.push(saved);
    adminState.editingBookId = null;
    resetCoverDraft();
    render();
  } catch (err) {
    box.innerHTML = `<strong>저장하지 못했습니다</strong><ul><li>${escapeHtml(err.message || String(err))}</li></ul>`;
    box.hidden = false;
    form.querySelector('button[type="submit"]').disabled = false;
  }
}

/* ----- 회원 관리 ----- */

function renderAdminMembers() {
  const profiles = adminState.profiles;
  if (!profiles.length) return '<div class="empty">아직 로그인한 사람이 없습니다.</div>';
  const teamCount = profiles.filter((p) => p.in_team).length;
  return `
    <div class="admin-toolbar">
      <p class="muted">앱에 한 번이라도 로그인한 사람들입니다. <b>우리 팀</b>으로 지정하면 사역자 필독서가 보입니다. (우리 팀 ${teamCount}명)</p>
    </div>
    <table class="admin-table panel-table">
      <thead><tr><th>이름</th><th>이메일</th><th>처음 로그인</th><th>마지막 접속</th><th class="center">우리 팀</th></tr></thead>
      <tbody>
        ${profiles.map((p) => `
          <tr class="${p.in_team ? 'is-team' : ''}">
            <td><strong>${escapeHtml(p.name || '-')}</strong>${p.user_id === currentUser.id ? ' <span class="muted">(나)</span>' : ''}</td>
            <td>${escapeHtml(p.email)}</td>
            <td class="muted">${timestampToDate(p.created_at)}</td>
            <td class="muted">${timestampToDate(p.last_seen_at)}</td>
            <td class="center">
              <label class="switch">
                <input type="checkbox" data-action="team-toggle" data-id="${escapeHtml(p.user_id)}" ${p.in_team ? 'checked' : ''}
                  aria-label="${escapeHtml(profileName(p))} 우리 팀 지정">
                <span></span>
              </label>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function bindAdminEvents(container, tab) {
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'admin-refresh') {
      adminState.loaded = false;
      adminState.editingBookId = null;
      render();
    } else if (action === 'book-new') {
      resetCoverDraft();
      adminState.editingBookId = 'new';
      render();
    } else if (action === 'book-edit') {
      resetCoverDraft();
      adminState.editingBookId = btn.dataset.id;
      render();
    } else if (action === 'book-cancel') {
      resetCoverDraft();
      adminState.editingBookId = null;
      render();
    } else if (action === 'cover-remove') {
      resetCoverDraft();
      adminState.cover = { removed: true };
      container.querySelector('#cover-preview').innerHTML = renderCoverPreview(null);
    } else if (action === 'book-delete') {
      const book = requiredBooks.find((b) => b.id === btn.dataset.id);
      if (!confirm(`'${book.title}' 필독서를 삭제할까요?\n팀원들이 이미 세운 계획은 지워지지 않고 일반 목표로 남습니다.`)) return;
      btn.disabled = true;
      try {
        await adminDeleteRequiredBook(book.id);
        adminRemoveCoverFile(book.coverUrl);
        requiredBooks = requiredBooks.filter((b) => b.id !== book.id);
        render();
      } catch (err) {
        alert(`삭제하지 못했습니다: ${err.message}`);
        btn.disabled = false;
      }
    }
  });

  container.addEventListener('change', async (e) => {
    if (e.target.id === 'cover-file') {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        alert('표지 이미지는 3MB 이하로 올려 주세요.');
        e.target.value = '';
        return;
      }
      resetCoverDraft();
      adminState.cover = { file, previewUrl: URL.createObjectURL(file) };
      container.querySelector('#cover-preview').innerHTML = renderCoverPreview(null);
      return;
    }
    if (e.target.dataset.action !== 'team-toggle') return;
    const el = e.target;
    const profile = adminState.profiles.find((p) => p.user_id === el.dataset.id);
    el.disabled = true;
    try {
      await adminSetTeam(profile.user_id, el.checked);
      profile.in_team = el.checked;
      if (profile.user_id === currentUser.id) account.inTeam = el.checked;
      render();
    } catch (err) {
      alert(`변경하지 못했습니다: ${err.message}`);
      el.checked = !el.checked;
      el.disabled = false;
    }
  });

  if (tab === 'books') {
    const form = container.querySelector('#book-form');
    if (form) {
      form.addEventListener('input', refreshChapterEditor);
      bindChapterEditor(form, refreshChapterEditor);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitBookForm(form);
      });
    }
  }
}

/* =========================================================================
 * 12. 이미지로 내보내기 — 매일 읽을 분량 + 현재 진행 상황을 PNG 한 장으로
 *     외부 라이브러리 없이 Canvas로 직접 그린다. (세로형, 폭 1080px)
 * ========================================================================= */

const EXPORT_WIDTH = 1080;
const EXPORT_PAD = 64;
const EXPORT_FONT = "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
const EXPORT_COLORS = {
  bg: '#f5f6f8', surface: '#ffffff', text: '#1f2328', muted: '#6b7280', border: '#e3e5ea',
  primary: '#2f6fed', primarySoft: '#e8f0fe', danger: '#d93025', dangerSoft: '#fdecea',
  success: '#1a7f4b', successSoft: '#e6f4ec', neutralSoft: '#eef0f3', bar: '#4a9d6b',
  required: '#b35c00', requiredSoft: '#fff1e0',
};

/** 이미지용 행 내용 (HTML 없이 글자만) */
function rowTextForExport(goal, basis, row) {
  if (row.isRestDay) return { main: '쉬는 날', subs: [], rest: true };
  if (row.amount === 0) return { main: '휴식 (분량 없음)', subs: [], rest: true };
  const from = row.prevCumulative;
  const to = row.cumulative;
  if (basis === 'page') {
    const a = unitsToPage(goal.book, from + 1);
    const b = unitsToPage(goal.book, to);
    return {
      main: `${a === b ? `p.${a}` : `p.${a}~${b}`}  (${row.amount}페이지)`,
      subs: [describeChaptersForPages(goal.book, a, b)],
    };
  }
  if (basis === 'chapter') {
    const chs = getChapterRanges(goal.book).slice(from, to);
    return { main: `${chs.length}개 챕터`, subs: chs.map((c) => `${c.name} (p.${c.startPage}~${c.endPage})`) };
  }
  const titles = goal.lecture.titles.slice(from, to);
  return { main: `${from + 1}${to - from > 1 ? `~${to}` : ''}강  (${row.amount}강)`, subs: titles.map((t, i) => `${from + i + 1}강 ${t}`) };
}

function stripTags(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent;
}

/** 글자를 폭에 맞게 줄바꿈 */
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of String(text)) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch.trim() ? ch : '';
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * 계획 이미지 그리기 → canvas
 * options: { basis, range: 'all' | 'upcoming' }
 */
async function drawPlanImage(goal, options) {
  const today = todayStr();
  const { basis } = options;
  const s = getGoalSummary(goal, undefined, today);
  const msg = getCompareMessage(goal, s);
  const unit = getUnitLabel(s.basis);
  const cover = await loadImage(getCoverUrl(goal));
  let rows = buildTimeline(goal, basis);
  if (options.range === 'upcoming') rows = rows.filter((r) => diffDays(today, r.date) >= 0);
  const done = getDoneUnits(goal, basis);

  const W = EXPORT_WIDTH;
  const P = EXPORT_PAD;
  const inner = W - P * 2;
  const font = (size, weight = 400) => `${weight} ${size}px ${EXPORT_FONT}`;

  // 1) 먼저 높이를 재기 위해 행 레이아웃 계산
  const measure = document.createElement('canvas').getContext('2d');
  const contentX = P + 210;
  const contentW = inner - 210 - 170;
  const rowLayouts = rows.map((row) => {
    const t = rowTextForExport(goal, basis, row);
    measure.font = font(26);
    const subLines = t.subs.flatMap((sub) => wrapText(measure, sub, contentW));
    const height = Math.max(92, 36 + 36 + subLines.length * 34 + 22);
    return { row, t, subLines, height: t.rest ? 72 : height };
  });

  const headerH = 330;
  const statsH = 470;
  const tableHeadH = 110;
  const listH = rowLayouts.reduce((sum, r) => sum + r.height, 0);
  const footerH = 110;
  const H = headerH + statsH + tableHeadH + listH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = EXPORT_COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // 2) 머리: 표지 · 제목 · 저자 · 기간
  let y = P;
  let textX = P;
  if (cover) {
    const cw = 150;
    const ch = Math.round(cw * (cover.height / cover.width));
    ctx.save();
    ctx.shadowColor = 'rgba(16,24,40,0.25)';
    ctx.shadowBlur = 16;
    ctx.drawImage(cover, P, y, cw, Math.min(ch, 220));
    ctx.restore();
    textX = P + cw + 36;
  }
  const tagText = goal.requiredBookId && requiredBooks.some((b) => b.id === goal.requiredBookId) ? '사역자 필독서'
    : goal.type === 'book' ? '책' : '강의';
  ctx.font = font(24, 700);
  const tagW = ctx.measureText(tagText).width + 28;
  roundRect(ctx, textX, y, tagW, 40, 8, EXPORT_COLORS.requiredSoft);
  ctx.fillStyle = EXPORT_COLORS.required;
  ctx.fillText(tagText, textX + 14, y + 29);

  ctx.font = font(52, 800);
  ctx.fillStyle = EXPORT_COLORS.text;
  const titleLines = wrapText(ctx, goal.title, W - P - textX).slice(0, 2);
  titleLines.forEach((line, i) => ctx.fillText(line, textX, y + 110 + i * 62));
  let ty = y + 110 + (titleLines.length - 1) * 62;
  ctx.font = font(28);
  ctx.fillStyle = EXPORT_COLORS.muted;
  if (getBookAuthor(goal)) {
    ty += 48;
    ctx.fillText(`${getBookAuthor(goal)} 지음`, textX, ty);
  }
  ty += 48;
  const rest = getRestWeekdays(goal);
  ctx.fillText(`${goal.startDate} ~ ${goal.dueDate} · ${formatDday(s.dday)}${rest.length ? ` · ${WEEKDAY_ORDER.filter((d) => rest.includes(d)).map((d) => WEEKDAYS_KO[d]).join('·')} 쉼` : ''}`, textX, ty);

  // 3) 현황 카드
  y = headerH;
  roundRect(ctx, P, y, inner, statsH - 30, 24, EXPORT_COLORS.surface);
  const statY = y + 36;
  const boxGap = 16;
  const boxW = (inner - 72 - boxGap * 3) / 4;
  const stats = [
    [`${s.dailyPlan}${unit}`, '하루 권장'],
    [`${s.target}${unit}`, '오늘까지 권장'],
    [`${s.done}${unit}`, '실제 완료'],
    [`${s.total}${unit}`, '전체'],
  ];
  stats.forEach(([value, label], i) => {
    const bx = P + 36 + i * (boxW + boxGap);
    roundRect(ctx, bx, statY, boxW, 140, 16, '#f7f8f9');
    ctx.textAlign = 'center';
    ctx.font = font(value.length > 7 ? 34 : 40, 800);
    ctx.fillStyle = EXPORT_COLORS.text;
    ctx.fillText(value, bx + boxW / 2, statY + 72);
    ctx.font = font(24);
    ctx.fillStyle = EXPORT_COLORS.muted;
    ctx.fillText(label, bx + boxW / 2, statY + 114);
    ctx.textAlign = 'left';
  });

  // 진행 막대
  const barY = statY + 176;
  const barX = P + 36;
  const barW = inner - 72;
  roundRect(ctx, barX, barY, barW, 20, 10, EXPORT_COLORS.neutralSoft);
  const donePct = s.total ? Math.min(1, s.done / s.total) : 0;
  const targetPct = s.total ? Math.min(1, s.target / s.total) : 0;
  roundRect(ctx, barX, barY, Math.max(20, barW * donePct), 20, 10, EXPORT_COLORS.bar);
  ctx.fillStyle = EXPORT_COLORS.text;
  ctx.fillRect(barX + barW * targetPct - 2, barY - 8, 4, 36);
  ctx.font = font(24);
  ctx.fillStyle = EXPORT_COLORS.muted;
  ctx.fillText(`실제 진도 ${s.percent}%   |   오늘까지 권장 ${Math.floor(targetPct * 100)}%`, barX, barY + 62);

  // 안내 문구
  const tone = { behind: [EXPORT_COLORS.dangerSoft, '#a3261c'], ahead: [EXPORT_COLORS.successSoft, EXPORT_COLORS.success],
    done: [EXPORT_COLORS.successSoft, EXPORT_COLORS.success], ontrack: [EXPORT_COLORS.primarySoft, '#1d4ab5'],
    ended: ['#fff4e0', '#7a4a00'], neutral: [EXPORT_COLORS.neutralSoft, EXPORT_COLORS.text] }[msg.tone];
  const msgY = barY + 96;
  roundRect(ctx, barX, msgY, barW, 96, 16, tone[0]);
  ctx.font = font(27, 600);
  ctx.fillStyle = tone[1];
  const msgLines = wrapText(ctx, stripTags(msg.html), barW - 48).slice(0, 2);
  msgLines.forEach((line, i) => ctx.fillText(line, barX + 24, msgY + (msgLines.length === 1 ? 58 : 40 + i * 36)));

  // 4) 날짜별 계획
  y = headerH + statsH;
  roundRect(ctx, P, y, inner, tableHeadH + listH + 20, 24, EXPORT_COLORS.surface);
  ctx.font = font(34, 800);
  ctx.fillStyle = EXPORT_COLORS.text;
  ctx.fillText('매일 읽을 분량', P + 36, y + 62);
  ctx.font = font(24);
  ctx.fillStyle = EXPORT_COLORS.muted;
  const basisLabel = { page: '페이지 기준', chapter: '챕터 기준', lecture: '강의' }[basis];
  ctx.textAlign = 'right';
  ctx.fillText(`${basisLabel} · ${options.range === 'upcoming' ? '오늘부터' : '전체 기간'} · ✓ 완료`, W - P - 36, y + 60);
  ctx.textAlign = 'left';
  y += tableHeadH;

  rowLayouts.forEach(({ row, t, subLines, height }) => {
    const dayDiff = diffDays(today, row.date);
    const checked = !t.rest && done >= row.cumulative;
    const behind = dayDiff < 0 && !checked && !t.rest;
    if (dayDiff === 0) roundRect(ctx, P + 16, y, inner - 32, height - 6, 12, EXPORT_COLORS.primarySoft);
    else if (behind) roundRect(ctx, P + 16, y, inner - 32, height - 6, 12, EXPORT_COLORS.dangerSoft);
    ctx.globalAlpha = checked && dayDiff !== 0 ? 0.45 : 1;

    // 날짜
    const d = parseDate(row.date);
    const dow = d.getDay();
    ctx.font = font(28, 700);
    ctx.fillStyle = behind ? EXPORT_COLORS.danger : EXPORT_COLORS.text;
    ctx.fillText(`${d.getMonth() + 1}/${d.getDate()}`, P + 40, y + 46);
    ctx.font = font(26, 600);
    ctx.fillStyle = dow === 0 ? EXPORT_COLORS.danger : dow === 6 ? EXPORT_COLORS.primary : EXPORT_COLORS.muted;
    ctx.fillText(`(${WEEKDAYS_KO[dow]})`, P + 120, y + 46);
    if (dayDiff === 0) {
      roundRect(ctx, P + 40, y + 60, 70, 32, 6, EXPORT_COLORS.primary);
      ctx.font = font(20, 700);
      ctx.fillStyle = '#fff';
      ctx.fillText('오늘', P + 54, y + 83);
    }

    // 내용
    ctx.font = t.rest ? font(26) : font(29, 700);
    ctx.fillStyle = t.rest ? EXPORT_COLORS.muted : EXPORT_COLORS.text;
    ctx.fillText(t.main, contentX, y + 46);
    ctx.font = font(26);
    ctx.fillStyle = EXPORT_COLORS.muted;
    subLines.forEach((line, i) => ctx.fillText(line, contentX, y + 88 + i * 34));

    // 누적 · 완료
    ctx.textAlign = 'right';
    if (!t.rest) {
      ctx.font = font(24);
      ctx.fillStyle = EXPORT_COLORS.muted;
      ctx.fillText(`누적 ${formatCumulative(goal, basis, row.cumulative)}`, W - P - 90, y + 46);
    }
    if (checked) {
      ctx.font = font(34, 800);
      ctx.fillStyle = EXPORT_COLORS.success;
      ctx.fillText('✓', W - P - 40, y + 48);
    }
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;

    ctx.fillStyle = EXPORT_COLORS.border;
    ctx.fillRect(P + 36, y + height - 3, inner - 72, 1);
    y += height;
  });

  // 5) 바닥글
  ctx.font = font(22);
  ctx.fillStyle = EXPORT_COLORS.muted;
  ctx.textAlign = 'center';
  ctx.fillText(`학습 진도 계획표 · ${today} (${weekdayKo(today)}) 기준`, W / 2, H - 44);
  ctx.textAlign = 'left';
  return canvas;
}

/* ----- 내보내기 창 ----- */

const exportState = { goal: null, options: null, canvas: null };

async function openExportDialog(goal) {
  exportState.goal = goal;
  exportState.options = { basis: detailState.basis, range: 'all' };
  let dialog = document.getElementById('export-dialog');
  if (!dialog) {
    dialog = document.createElement('div');
    dialog.id = 'export-dialog';
    dialog.className = 'modal';
    document.body.appendChild(dialog);
    dialog.addEventListener('click', onExportDialogClick);
    dialog.addEventListener('change', onExportDialogChange);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeExportDialog(); });
  }
  const bases = getBases(goal);
  dialog.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div class="modal-head">
        <h2 id="export-title" class="section-title">이미지로 내보내기</h2>
        <button type="button" class="btn-icon" data-action="export-close" aria-label="닫기">×</button>
      </div>
      <div class="export-options">
        ${bases.length > 1 ? `
          <div class="segmented">
            ${bases.map((b) => `<label><input type="radio" name="export-basis" value="${b}" ${b === exportState.options.basis ? 'checked' : ''}> ${b === 'page' ? '페이지 기준' : '챕터 기준'}</label>`).join('')}
          </div>` : ''}
        <div class="segmented">
          <label><input type="radio" name="export-range" value="all" checked> 전체 기간</label>
          <label><input type="radio" name="export-range" value="upcoming"> 오늘부터</label>
        </div>
      </div>
      <div class="export-preview" id="export-preview"><span class="muted">그리는 중…</span></div>
      <div class="modal-actions">
        <span id="export-status" class="muted"></span>
        <button type="button" class="btn" data-action="export-copy">이미지 복사</button>
        <button type="button" class="btn btn-primary" data-action="export-download">PNG 저장</button>
      </div>
    </div>`;
  dialog.hidden = false;
  document.body.classList.add('modal-open');
  await redrawExport();
}

async function redrawExport() {
  const canvas = await drawPlanImage(exportState.goal, exportState.options);
  exportState.canvas = canvas;
  const box = document.getElementById('export-preview');
  box.innerHTML = '';
  const img = document.createElement('img');
  img.alt = '내보낼 이미지 미리보기';
  img.src = canvas.toDataURL('image/png');
  box.appendChild(img);
}

function closeExportDialog() {
  const dialog = document.getElementById('export-dialog');
  if (!dialog || dialog.hidden) return;
  dialog.hidden = true;
  document.body.classList.remove('modal-open');
}

function exportFileName() {
  const safe = exportState.goal.title.replace(/[\\/:*?"<>|]/g, '').trim() || '계획표';
  return `${safe}-계획표-${todayStr()}.png`;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function onExportDialogClick(e) {
  if (e.target.id === 'export-dialog') { closeExportDialog(); return; }
  const action = e.target.closest('[data-action]')?.dataset.action;
  const status = document.getElementById('export-status');
  if (action === 'export-close') closeExportDialog();
  if (action === 'export-download') {
    const blob = await canvasToBlob(exportState.canvas);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = '저장했습니다.';
  }
  if (action === 'export-copy') {
    try {
      const blob = await canvasToBlob(exportState.canvas);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      status.textContent = '복사했습니다. 카톡 등에 붙여넣기 하세요.';
    } catch (err) {
      console.warn('[export] 복사 실패:', err);
      status.textContent = '이 브라우저에서는 복사할 수 없습니다. PNG 저장을 이용하세요.';
    }
  }
}

async function onExportDialogChange(e) {
  if (e.target.name === 'export-basis') exportState.options.basis = e.target.value;
  if (e.target.name === 'export-range') exportState.options.range = e.target.value;
  await redrawExport();
}

/* =========================================================================
 * 시작
 * ========================================================================= */

async function boot() {
  const root = document.getElementById('app');
  // 주소 끝에 ?selftest 를 붙이면 계산 검증 결과를 콘솔에 출력
  if (location.search.includes('selftest')) runPlanSelfTests();

  if (!window.supabase) {
    renderMessageScreen(root, '연결할 수 없습니다',
      '<p class="errors">로그인 기능을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.</p>');
    return;
  }
  window.addEventListener('hashchange', render);
  document.getElementById('topbar').addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'retry-save') retrySave();
    if (action === 'sign-out') {
      if (pendingSaves > 0 && !confirm('아직 저장 중입니다. 그래도 로그아웃할까요?')) return;
      await signOut();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (pendingSaves > 0 || saveState === 'error') e.preventDefault();
  });

  getSupabase().auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      currentUser = null;
      appData = null;
      syncedSnapshot = new Map();
      account = { isAdmin: false, inTeam: false };
      requiredBooks = [];
      adminState.loaded = false;
      renderTopbar();
      renderLogin(root);
    }
  });

  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error('[auth] 세션 확인 실패:', err);
  }
  // 로그인 후 돌아온 주소의 ?code=... 를 정리
  if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);
  if (user) startApp(user);
  else renderLogin(root);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', boot);
}
