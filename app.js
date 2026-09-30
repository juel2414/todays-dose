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
 * 0. 언어 (한국어 / English)
 *    - 화면 문구는 한국어 원문을 키로 쓴다: t('계획대로'), t('{n}페이지 밀림', { n })
 *    - 'ko'면 키를 그대로(매개변수만 채워서), 'en'이면 EN 사전(맨 아래)의 번역을 쓴다.
 *    - 같은 한국어가 영어에서 다르게 번역돼야 하면 키 뒤에 '||맥락'을 붙인다 (한국어 화면에는 안 보임).
 *    - 저장 데이터(성경 권 이름 등)는 항상 한국어 그대로 두고, 화면에 보일 때만 번역한다.
 * ========================================================================= */

const LANG_STORAGE_KEY = 'studyPlanner.lang';
const LANGS = ['ko', 'en'];
let currentLang = 'ko'; // 브라우저가 아닌 환경(node 자가 검증)에서는 항상 한국어
const missingTranslations = new Set();

function t(key, params) {
  const sep = key.indexOf('||');
  let text = sep >= 0 ? key.slice(0, sep) : key;
  if (currentLang === 'en') {
    if (Object.prototype.hasOwnProperty.call(EN, key)) {
      const v = EN[key];
      text = typeof v === 'function' ? v(params || {}) : v;
    } else if (typeof window !== 'undefined' && !missingTranslations.has(key)) {
      missingTranslations.add(key);
      console.warn('[i18n] 번역 없음:', key);
    }
  }
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined && params[name] !== null ? String(params[name]) : m));
}

/** 영어 복수형: plural(1, 'day') → '1 day', plural(3, 'day') → '3 days' */
function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function isLang(lang) {
  return LANGS.includes(lang);
}

/** 로그인 전 언어: 저장된 선택 → 브라우저 언어(ko*) → 영어 */
function detectInitialLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // 저장 공간을 쓸 수 없는 환경
  }
  const nav = (typeof navigator !== 'undefined' && (navigator.language || '')) || '';
  return /^ko\b/i.test(nav) ? 'ko' : 'en';
}

function storeLang(lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // 저장 공간을 쓸 수 없는 환경이면 무시
  }
}

/** 언어를 바꾸고 문서 제목·lang 속성을 맞춘다 (화면 다시 그리기는 호출한 쪽에서) */
function applyLanguage(lang) {
  currentLang = isLang(lang) ? lang : 'ko';
  if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLang;
    document.title = t('학습 진도 계획표');
  }
}

/** 한국어 | English 전환 버튼 (상단 바 · 로그인 화면) */
function renderLangToggle() {
  return `
    <div class="tabs lang-toggle" role="group" aria-label="${t('언어')}">
      ${[['ko', '한국어'], ['en', 'English']].map(([code, label]) => `
        <button type="button" class="tab ${currentLang === code ? 'is-active' : ''}" data-lang="${code}" lang="${code}"
          aria-pressed="${currentLang === code}">${label}</button>`).join('')}
    </div>`;
}

/* =========================================================================
 * 1. 날짜 유틸
 *    - 모든 날짜는 'YYYY-MM-DD' 문자열로 다룬다.
 *    - toISOString()처럼 UTC로 바꾸는 함수는 쓰지 않는다 (하루 밀림 방지).
 * ========================================================================= */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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

/** 요일 이름 (0=일 ~ 6=토), 현재 언어로 */
function weekdayName(day) {
  return (currentLang === 'en' ? WEEKDAYS_EN : WEEKDAYS_KO)[day];
}

/** 'YYYY-MM-DD'의 요일, 현재 언어로 */
function weekdayLabel(str) {
  return weekdayName(parseDate(str).getDay());
}

/** 쉬는 요일 목록 → "월·수" / "Mon·Wed" (월요일부터) */
function weekdayListLabel(days) {
  return WEEKDAY_ORDER.filter((d) => days.includes(d)).map(weekdayName).join('·');
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
 *   restDates: string[],      // 쉬는 날 (특정 날짜, 행사 등). 이 날에도 분량을 배정하지 않는다
 *   weights: { [날짜]: 배수 },  // 여유 있는 날 (1.5·2·3배 분량)
 *   fixed: { [날짜]: 분량 },    // 직접 설정한 날의 분량
 *   createdAt: ISO 문자열
 * }
 * 날짜별 표는 저장하지 않고 이 값들로 매번 계산한다 (저장 데이터를 작게, 항상 일관되게).
 * D = 기간 중 공부하는 날 수, k번째 공부하는 날(1부터) 누적 = from + round((to - from) * k / D)
 * ========================================================================= */

/**
 * extra: { weights: { 날짜: 배수 }, fixed: { 날짜: 분량 } }
 */
function createPlan(startDate, endDate, from, to, restWeekdays = [], restDates = [], extra = {}) {
  return {
    startDate, endDate, from, to,
    restWeekdays: [...restWeekdays],
    restDates: restDateList(restDates),
    weights: { ...(extra.weights || {}) },
    fixed: { ...(extra.fixed || {}) },
    createdAt: new Date().toISOString(),
  };
}

/** [{ date, label }] 또는 ['YYYY-MM-DD'] → 날짜 문자열 배열 */
function restDateList(list) {
  return (list || []).map((x) => (typeof x === 'string' ? x : x.date));
}

/** 그날이 쉬는 날인지 (쉬는 요일 또는 지정한 쉬는 날) */
function isRestDate(date, restWeekdays, restDates) {
  return isRestWeekday(restWeekdays, date) || (restDates || []).includes(date);
}

function isRestWeekday(restWeekdays, date) {
  return (restWeekdays || []).includes(parseDate(date).getDay());
}

/** start~end(포함) 중 쉬는 요일·쉬는 날을 뺀 공부하는 날 수 */
function countStudyDays(start, end, restWeekdays, restDates = []) {
  let count = 0;
  const days = countDaysInclusive(start, end);
  const dates = restDateList(restDates);
  for (let i = 0; i < days; i++) {
    if (!isRestDate(addDays(start, i), restWeekdays, dates)) count++;
  }
  return count;
}

/** k번째 공부하는 날(1..D)의 누적 목표 */
/**
 * 계획의 날짜별 행 목록
 *  - 쉬는 요일·쉬는 날 행은 isRestDay: true, 분량 0.
 *  - fixed(직접 설정한 날): 그 분량을 그대로 배정한다.
 *  - 나머지 공부하는 날: 남은 분량을 가중치(여유 있는 날은 1.5·2·3배)에 비례해 나눈다.
 *    k번째까지의 가중치 합 W_k, 전체 W 일 때 누적 = from + 고정 누적 + round(남은 분량 × W_k / W)
 *    (가중치·고정이 없으면 기존 균등 분배 round(N × k / D)와 같다)
 *  - (방어 코드) 공부하는 날이 하나도 없으면 마지막 날에 전부, 자동으로 나눌 날이 없으면 남은 분량은 마지막 공부일에.
 */
function buildSchedule(plan) {
  const days = countDaysInclusive(plan.startDate, plan.endDate);
  const noStudyDay = countStudyDays(plan.startDate, plan.endDate, plan.restWeekdays, plan.restDates) === 0;
  const weights = plan.weights || {};
  const dates = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(plan.startDate, i);
    dates.push({ date, isRestDay: noStudyDay ? i < days - 1 : isRestDate(date, plan.restWeekdays, plan.restDates) });
  }
  const study = dates.filter((d) => !d.isRestDay);

  // 직접 설정한 분량 (공부하는 날만). 합이 전체를 넘으면 무시하고 자동 분배.
  let fixed = {};
  Object.entries(plan.fixed || {}).forEach(([date, amount]) => {
    if (study.some((d) => d.date === date) && Number.isInteger(amount) && amount >= 0) fixed[date] = amount;
  });
  const N = plan.to - plan.from;
  let fixedTotal = Object.values(fixed).reduce((sum, x) => sum + x, 0);
  if (fixedTotal > N) { fixed = {}; fixedTotal = 0; }
  const rest = N - fixedTotal;
  const autoDays = study.filter((d) => fixed[d.date] === undefined);
  const totalWeight = autoDays.reduce((sum, d) => sum + (weights[d.date] || 1), 0);
  const lastStudy = study[study.length - 1];

  const rows = [];
  let prev = plan.from;
  let fixedSoFar = 0;
  let weightSoFar = 0;
  dates.forEach(({ date, isRestDay }, i) => {
    let cumulative = prev;
    if (!isRestDay) {
      if (fixed[date] !== undefined) fixedSoFar += fixed[date];
      else weightSoFar += weights[date] || 1;
      const auto = totalWeight > 0 ? Math.round((rest * weightSoFar) / totalWeight) : (date === lastStudy.date ? rest : 0);
      cumulative = plan.from + fixedSoFar + auto;
    }
    rows.push({
      index: i + 1,
      date,
      isRestDay,                        // 쉬는 요일 또는 지정한 쉬는 날
      isFixed: fixed[date] !== undefined, // 직접 설정한 날
      weight: isRestDay ? 0 : (weights[date] || 1),
      prevCumulative: prev,             // 전날까지 누적
      cumulative,                       // 오늘까지 누적 목표
      amount: cumulative - prev,        // 오늘 분량 (0이면 휴식)
    });
    prev = cumulative;
  });
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

/* ----- 성경 통독 (개역개정 66권, 권별 장 수) ----- */

const BIBLE_BOOKS = [
  ['창세기', 50], ['출애굽기', 40], ['레위기', 27], ['민수기', 36], ['신명기', 34],
  ['여호수아', 24], ['사사기', 21], ['룻기', 4], ['사무엘상', 31], ['사무엘하', 24],
  ['열왕기상', 22], ['열왕기하', 25], ['역대상', 29], ['역대하', 36], ['에스라', 10],
  ['느헤미야', 13], ['에스더', 10], ['욥기', 42], ['시편', 150], ['잠언', 31],
  ['전도서', 12], ['아가', 8], ['이사야', 66], ['예레미야', 52], ['예레미야애가', 5],
  ['에스겔', 48], ['다니엘', 12], ['호세아', 14], ['요엘', 3], ['아모스', 9],
  ['오바댜', 1], ['요나', 4], ['미가', 7], ['나훔', 3], ['하박국', 3],
  ['스바냐', 3], ['학개', 2], ['스가랴', 14], ['말라기', 4],
  ['마태복음', 28], ['마가복음', 16], ['누가복음', 24], ['요한복음', 21], ['사도행전', 28],
  ['로마서', 16], ['고린도전서', 16], ['고린도후서', 13], ['갈라디아서', 6], ['에베소서', 6],
  ['빌립보서', 4], ['골로새서', 4], ['데살로니가전서', 5], ['데살로니가후서', 3], ['디모데전서', 6],
  ['디모데후서', 4], ['디도서', 3], ['빌레몬서', 1], ['히브리서', 13], ['야고보서', 5],
  ['베드로전서', 5], ['베드로후서', 3], ['요한일서', 5], ['요한이서', 1], ['요한삼서', 1],
  ['유다서', 1], ['요한계시록', 22],
].map(([name, chapters]) => ({ name, chapters }));

/** 영어 권 이름 (BIBLE_BOOKS와 같은 순서) — 화면 표시용 */
const BIBLE_BOOKS_EN = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Songs', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
];

/** 저장된(한국어) 권 이름 → 현재 언어의 권 이름 */
function bibleBookName(name) {
  if (currentLang !== 'en') return name;
  const i = BIBLE_BOOKS.findIndex((b) => b.name === name);
  return i >= 0 ? BIBLE_BOOKS_EN[i] : name;
}

/** 자주 쓰는 범위 [이름, 시작 권 번호, 끝 권 번호] (0부터) */
const BIBLE_PRESETS = [
  ['성경 전체', 0, 65], ['구약', 0, 38], ['신약', 39, 65],
  ['모세오경', 0, 4], ['역사서', 5, 16], ['시가서', 17, 21], ['선지서', 22, 38],
  ['복음서', 39, 42], ['서신서', 44, 64],
];

function bibleBooksInRange(startIdx, endIdx) {
  return BIBLE_BOOKS.slice(startIdx, endIdx + 1).map((b) => ({ ...b }));
}

function bibleIndexOf(name) {
  return BIBLE_BOOKS.findIndex((b) => b.name === name);
}

/** 범위 이름: 프리셋과 같으면 "신약", 아니면 "창세기~신명기" */
function bibleRangeLabel(startIdx, endIdx) {
  const preset = BIBLE_PRESETS.find(([, a, b]) => a === startIdx && b === endIdx);
  if (preset) return t(preset[0]);
  const a = bibleBookName(BIBLE_BOOKS[startIdx].name);
  return startIdx === endIdx ? a : t('{from}~{to}', { from: a, to: bibleBookName(BIBLE_BOOKS[endIdx].name) });
}

function bibleTotalChapters(bible) {
  return bible.books.reduce((sum, b) => sum + b.chapters, 0);
}

/** 범위 안 n번째 장(1부터) → { index, name, chapter } */
function biblePosition(bible, n) {
  let left = n;
  for (let i = 0; i < bible.books.length; i++) {
    const b = bible.books[i];
    if (left <= b.chapters) return { index: i, name: b.name, chapter: left };
    left -= b.chapters;
  }
  const last = bible.books[bible.books.length - 1];
  return { index: bible.books.length - 1, name: last.name, chapter: last.chapters };
}

/** 범위 안 (권 순서, 장) → 누적 장 수 */
function bibleUnitsFromPosition(bible, bookIndex, chapter) {
  let units = 0;
  for (let i = 0; i < bookIndex; i++) units += bible.books[i].chapters;
  return units + chapter;
}

/** 누적 장 수 → "창세기 3장" (0이면 '-') */
function formatBiblePosition(bible, units) {
  if (units <= 0) return '-';
  const p = biblePosition(bible, units);
  return t('{book} {n}장', { book: bibleBookName(p.name), n: p.chapter });
}

/** (from 초과 ~ to 이하) → "창세기 4~6장" / "창세기 50장 ~ 출애굽기 2장" */
function describeBibleRange(bible, from, to) {
  const a = biblePosition(bible, from + 1);
  const b = biblePosition(bible, to);
  const nameA = bibleBookName(a.name);
  if (a.index === b.index) {
    return a.chapter === b.chapter ? t('{book} {n}장', { book: nameA, n: a.chapter })
      : t('{book} {from}~{to}장', { book: nameA, from: a.chapter, to: b.chapter });
  }
  return t('{book1} {ch1}장 ~ {book2} {ch2}장', { book1: nameA, ch1: a.chapter, book2: bibleBookName(b.name), ch2: b.chapter });
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
 *   id, type: 'book' | 'lecture' | 'bible', title, startDate, dueDate, createdAt, updatedAt,
 *   restWeekdays: number[],                  // 쉬는 요일 (0=일 ~ 6=토)
 *   restDates?: [{ date, label }],           // 쉬는 날 (특정 날짜 + 메모, 예: 수련회)
 *   extraDates?: [{ date, weight }],         // 여유 있는 날 (평소의 1.5·2·3배)
 *   book?:    { chapters: [{ name, startPage }], lastPage, author? },
 *   lecture?: { titles: [string] },
 *   bible?:   { books: [{ name, chapters }] },   // 통독 범위 (순서대로)
 *   progress: {
 *     current: number,                       // 책: 마지막으로 읽은 페이지 / 강의: 완료한 강의 수
 *     history: [{ date: 'YYYY-MM-DD', value }] // 날짜당 마지막 값 하나
 *   },
 *   plans: {                                  // 기준(basis)별 계획
 *     [basis]: { original: Plan, current: Plan | null }  // current는 재분배 후에만 존재
 *   }
 * }
 * basis: 책 → 'page', 'chapter' / 강의 → 'lecture' / 성경 통독 → 'bible' (장 단위)
 * ========================================================================= */

const BASES_BY_TYPE = {
  book: ['page', 'chapter'],
  lecture: ['lecture'],
  bible: ['bible'],
};

const TYPE_LABELS = { book: '책', lecture: '강의', bible: '성경 통독' };

/** 종류 이름, 현재 언어로 */
function typeLabel(type) {
  return t(TYPE_LABELS[type]);
}

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
  if (basis === 'bible') return bibleTotalChapters(goal.bible);
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
  if (goal.type === 'bible') return { min: 0, max: bibleTotalChapters(goal.bible) };
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
      original: createGoalPlan(goal, goal.startDate, 0, getTotalUnits(goal, basis)),
      current: null,
    };
  }
  return plans;
}

function createBookGoal({ title, startDate, dueDate, restWeekdays = [], restDates = [], extraDates = [], chapters, lastPage, author = '', requiredBookId = null }) {
  const now = new Date().toISOString();
  const goal = {
    id: generateId(),
    type: 'book',
    title: title.trim(),
    startDate,
    dueDate,
    restWeekdays: normalizeWeekdays(restWeekdays),
    restDates: normalizeRestDates(restDates),
    extraDates: normalizeExtraDates(extraDates),
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

function createLectureGoal({ title, startDate, dueDate, restWeekdays = [], restDates = [], extraDates = [], titles }) {
  const now = new Date().toISOString();
  const goal = {
    id: generateId(),
    type: 'lecture',
    title: title.trim(),
    startDate,
    dueDate,
    restWeekdays: normalizeWeekdays(restWeekdays),
    restDates: normalizeRestDates(restDates),
    extraDates: normalizeExtraDates(extraDates),
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

/** 쉬는 날 정리: 올바른 날짜만, 날짜 중복 제거, 날짜순 */
function normalizeRestDates(list) {
  const map = new Map();
  (list || []).forEach((x) => {
    const date = typeof x === 'string' ? x : x && x.date;
    if (isValidDateStr(date)) map.set(date, { date, label: String((x && x.label) || '').trim() });
  });
  return [...map.values()].sort((a, b) => diffDays(b.date, a.date));
}

function getRestDates(goal) {
  return goal.restDates || [];
}

const EXTRA_WEIGHTS = [1.5, 2, 3];

/** 여유 있는 날 정리: 올바른 날짜·배수만, 날짜 중복 제거, 날짜순 */
function normalizeExtraDates(list) {
  const map = new Map();
  (list || []).forEach((x) => {
    const weight = Number(x && x.weight);
    if (x && isValidDateStr(x.date) && EXTRA_WEIGHTS.includes(weight)) map.set(x.date, { date: x.date, weight });
  });
  return [...map.values()].sort((a, b) => diffDays(b.date, a.date));
}

function getExtraDates(goal) {
  return goal.extraDates || [];
}

/** 여유 있는 날 → 계획용 가중치 { 날짜: 배수 } */
function extraWeights(goal) {
  return Object.fromEntries(getExtraDates(goal).map((x) => [x.date, x.weight]));
}

/** 목표의 쉬는 날·여유 있는 날로 계획 만들기 */
function createGoalPlan(goal, startDate, from, to, fixed = {}) {
  return createPlan(startDate, goal.dueDate, from, to, getRestWeekdays(goal), getRestDates(goal),
    { weights: extraWeights(goal), fixed });
}

/** 지정한 쉬는 날의 메모 (없으면 '') */
function getRestDateLabel(goal, date) {
  const item = getRestDates(goal).find((x) => x.date === date);
  return item ? item.label : '';
}

/** 쉬는 날 표시 문구: "쉬는 날" / "쉬는 날 · 수련회" */
function restText(goal, date) {
  const label = getRestDateLabel(goal, date);
  return label ? t('쉬는 날 · {label}', { label }) : t('쉬는 날');
}

function createBibleGoal({ title, startDate, dueDate, restWeekdays = [], restDates = [], extraDates = [], bibleStart, bibleEnd }) {
  const now = new Date().toISOString();
  const goal = {
    id: generateId(),
    type: 'bible',
    title: title.trim(),
    startDate,
    dueDate,
    restWeekdays: normalizeWeekdays(restWeekdays),
    restDates: normalizeRestDates(restDates),
    extraDates: normalizeExtraDates(extraDates),
    createdAt: now,
    updatedAt: now,
    bible: { books: bibleBooksInRange(Number(bibleStart), Number(bibleEnd)) },
    progress: { current: 0, history: [] },
    plans: null,
  };
  goal.plans = buildInitialPlans(goal);
  return goal;
}

/** 입력 종류에 맞게 목표 만들기 */
function createGoalFromInput(input, requiredBookId = null) {
  if (input.type === 'book') return createBookGoal({ ...input, requiredBookId });
  if (input.type === 'bible') return createBibleGoal(input);
  return createLectureGoal(input);
}

/* ----- 검증: 오류 메시지 배열을 반환 (빈 배열이면 통과) ----- */

function validateCommonInput({ title, startDate, dueDate, restWeekdays = [], restDates = [] }) {
  const errors = [];
  if (!title || !title.trim()) errors.push(t('이름을 입력하세요.'));
  if (!isValidDateStr(startDate)) errors.push(t('시작일이 올바르지 않습니다.'));
  if (!isValidDateStr(dueDate)) errors.push(t('마감일이 올바르지 않습니다.'));
  if (normalizeWeekdays(restWeekdays).length === 7) {
    errors.push(t('쉬는 요일을 모두 선택할 수는 없습니다.'));
  } else if (isValidDateStr(startDate) && isValidDateStr(dueDate)) {
    if (diffDays(startDate, dueDate) < 0) errors.push(t('마감일은 시작일과 같거나 뒤여야 합니다.'));
    else if (countStudyDays(startDate, dueDate, restWeekdays, restDates) === 0) {
      errors.push(t('기간 안에 공부하는 날이 없습니다. 기간이나 쉬는 요일을 바꾸세요.'));
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

  if (!Number.isInteger(last) || last < 1) errors.push(t('마지막 페이지를 1 이상의 정수로 입력하세요.'));
  if (!chapters || chapters.length === 0) {
    errors.push(t('챕터를 한 개 이상 입력하세요.'));
    return errors;
  }

  chapters.forEach((ch, i) => {
    const label = t('{n}번째 챕터', { n: i + 1 });
    const start = Number(ch.startPage);
    if (!ch.name || !ch.name.trim()) errors.push(`${label}: ${t('이름을 입력하세요.')}`);
    if (!Number.isInteger(start) || start < 1) {
      errors.push(`${label}: ${t('시작 페이지를 1 이상의 정수로 입력하세요.')}`);
      return;
    }
    if (i > 0 && start <= Number(chapters[i - 1].startPage)) {
      errors.push(`${label}: ${t('시작 페이지가 앞 챕터보다 커야 합니다 (오름차순).')}`);
    }
    if (Number.isInteger(last) && start > last) {
      errors.push(`${label}: ${t('시작 페이지가 마지막 페이지({last})보다 큽니다.', { last })}`);
    }
  });
  return errors;
}

function validateBibleInput(input) {
  const errors = validateCommonInput(input);
  const a = Number(input.bibleStart);
  const b = Number(input.bibleEnd);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b > 65) errors.push(t('통독 범위를 선택하세요.'));
  else if (a > b) errors.push(t('통독 범위의 시작 권이 끝 권보다 뒤에 있습니다.'));
  return errors;
}

/** 종류에 맞는 입력 검증 */
function validateGoalInput(input) {
  if (input.type === 'book') return validateBookInput(input);
  if (input.type === 'bible') return validateBibleInput(input);
  return validateLectureInput(input);
}

function validateLectureInput(input) {
  const errors = validateCommonInput(input);
  if (!input.titles || input.titles.length === 0) errors.push(t('강의 제목을 한 줄 이상 입력하세요.'));
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
  const errors = validateGoalInput({ ...input, type: goal.type });
  // 이름만 바꾸는 등 계획에 영향이 없는 수정은 날짜 제한을 두지 않는다 (마감 지난 목표도 이름 수정 가능)
  if (errors.length || !isPlanAffectingEdit(goal, input)) return errors;
  if (hasGoalStarted(goal, today) && isValidDateStr(input.dueDate) && diffDays(today, input.dueDate) < 0) {
    errors.push(t('진행 중인 목표는 마감일을 오늘 이후로 정해야 합니다.'));
  } else if (hasGoalStarted(goal, today) && isValidDateStr(input.dueDate) && isValidDateStr(input.startDate)
    && normalizeWeekdays(input.restWeekdays).length < 7) {
    const from = diffDays(today, input.startDate) > 0 ? input.startDate : today;
    if (countStudyDays(from, input.dueDate, input.restWeekdays, input.restDates) === 0) {
      errors.push(t('오늘부터 마감일까지 공부하는 날이 없습니다. 마감일이나 쉬는 요일을 바꾸세요.'));
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
  if (isRestDatesChanged(goal, input)) return true;
  if (isExtraDatesChanged(goal, input)) return true;
  if (goal.type === 'book') return isBookStructureChanged(goal, input);
  if (goal.type === 'bible') return isBibleRangeChanged(goal, input);
  return JSON.stringify(goal.lecture.titles) !== JSON.stringify(input.titles);
}

/** 쉬는 날(날짜)이 바뀌었는지 — 메모만 바뀐 것은 계획에 영향 없음 */
function isRestDatesChanged(goal, input) {
  return restDateList(getRestDates(goal)).join() !== restDateList(normalizeRestDates(input.restDates)).join();
}

function isExtraDatesChanged(goal, input) {
  return JSON.stringify(getExtraDates(goal)) !== JSON.stringify(normalizeExtraDates(input.extraDates));
}

function isBibleRangeChanged(goal, input) {
  const books = bibleBooksInRange(Number(input.bibleStart), Number(input.bibleEnd));
  return goal.bible.books.map((b) => b.name).join() !== books.map((b) => b.name).join();
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
  goal.restDates = normalizeRestDates(input.restDates);
  goal.extraDates = normalizeExtraDates(input.extraDates);
  if (goal.type === 'book') {
    goal.book = {
      chapters: input.chapters.map((c) => ({ name: c.name.trim(), startPage: Number(c.startPage) })),
      lastPage: Number(input.lastPage),
    };
    if (input.author && input.author.trim()) goal.book.author = input.author.trim();
  } else if (goal.type === 'bible') {
    goal.bible = { books: bibleBooksInRange(Number(input.bibleStart), Number(input.bibleEnd)) };
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
    const from = Math.min(getDoneUnits(goal, basis), total);
    // 직접 설정해 둔 앞으로의 분량은 가능하면 유지 (합이 남은 분량을 넘으면 버림)
    const prev = goal.plans[basis].current || goal.plans[basis].original;
    const keep = Object.fromEntries(Object.entries(prev.fixed || {})
      .filter(([date]) => diffDays(planStart, date) >= 0 && diffDays(date, goal.dueDate) >= 0));
    const keepTotal = Object.values(keep).reduce((sum, x) => sum + x, 0);
    goal.plans[basis].current = createGoalPlan(goal, planStart, from, total, keepTotal <= total - from ? keep : {});
  }
  goal.updatedAt = new Date().toISOString();
  return goal;
}

/** 재분배 가능 여부 (불가능하면 이유 문자열) */
function getReplanBlocker(goal, today = todayStr()) {
  const s = getGoalSummary(goal, undefined, today);
  if (s.isComplete) return t('이미 완료한 목표입니다.');
  if (s.isOverdue) return t('마감일이 지났습니다. 마감일을 변경해 주세요.');
  if (!hasGoalStarted(goal, today)) return t('아직 시작 전이라 재분배할 필요가 없습니다.');
  if (s.remainingStudyDays === 0) return t('오늘부터 마감일까지 공부하는 날이 없습니다. 마감일을 변경해 주세요.');
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
    restDates: getRestDates(goal).map((x) => ({ ...x })),
    extraDates: getExtraDates(goal).map((x) => ({ ...x })),
    chapters: goal.type === 'book' ? goal.book.chapters.map((c) => ({ ...c })) : [],
    lastPage: goal.type === 'book' ? goal.book.lastPage : NaN,
    author: goal.type === 'book' ? getBookAuthor(goal) : '',
    titles: goal.type === 'lecture' ? [...goal.lecture.titles] : [],
    bibleStart: goal.type === 'bible' ? bibleIndexOf(goal.bible.books[0].name) : 0,
    bibleEnd: goal.type === 'bible' ? bibleIndexOf(goal.bible.books[goal.bible.books.length - 1].name) : 65,
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
  return goal.type === 'book' ? 'page' : goal.type;
}

const UNIT_LABELS = { page: '페이지', chapter: '챕터', lecture: '강', bible: '장' };
const UNIT_LABELS_EN = { page: ['page', 'pages'], chapter: ['chapter', 'chapters'], lecture: ['lecture', 'lectures'], bible: ['chapter', 'chapters'] };

/** 단위 이름. 영어는 n에 맞춰 단수/복수 (n을 안 주면 복수) */
function getUnitLabel(basis, n) {
  if (currentLang === 'en') return UNIT_LABELS_EN[basis][n === 1 ? 0 : 1];
  return UNIT_LABELS[basis];
}

/** 분량 표시: "35페이지" / "35 pages" */
function formatAmount(n, basis) {
  return currentLang === 'en' ? `${n} ${getUnitLabel(basis, n)}` : `${n}${getUnitLabel(basis)}`;
}

/** 분량 범위: "3~4페이지" / "3–4 pages" (같으면 하나만) */
function formatAmountRange(lo, hi, basis) {
  if (lo === hi) return formatAmount(lo, basis);
  return currentLang === 'en' ? `${lo}–${hi} ${getUnitLabel(basis)}` : `${lo}~${hi}${getUnitLabel(basis)}`;
}

/** 완료/전체: "12/300페이지" / "12/300 pages" */
function formatFraction(done, total, basis) {
  return currentLang === 'en' ? `${done}/${total} ${getUnitLabel(basis, total)}` : `${done}/${total}${getUnitLabel(basis)}`;
}

/** 강의 번호: "3강" / "Lecture 3" */
function lectureLabel(n) {
  return t('{n}강', { n });
}

/** 일수: "5일" / "5 days" */
function formatDays(n) {
  return t('{n}일', { n });
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
  const planStudyDays = Math.max(1, countStudyDays(plan.startDate, plan.endDate, plan.restWeekdays, plan.restDates));
  // 10 미만이면 소수 한 자리까지 (예: 하루 0.3강)
  const avgPlan = (plan.to - plan.from) / planStudyDays;
  const dailyPlan = avgPlan >= 10 ? Math.round(avgPlan) : Math.round(avgPlan * 10) / 10;
  // 지금부터 기한을 맞추려면: 남은 분량 ÷ 오늘 포함 남은 공부하는 날
  const remaining = total - done;
  const fromDate = diffDays(today, goal.startDate) > 0 ? goal.startDate : today;
  const remainingStudyDays = isOverdue ? 0 : countStudyDays(fromDate, goal.dueDate, plan.restWeekdays, plan.restDates);
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
  if (basis === 'bible') return describeBibleRange(goal.bible, from, to);
  if (to - from === 1) return `${lectureLabel(to)} · ${goal.lecture.titles[to - 1]}`;
  return t('{from}~{to}강', { from: from + 1, to });
}

/** 페이지 범위가 걸치는 챕터: 전부 덮으면 이름, 일부면 "이름 일부" */
function describeChaptersForPages(book, startPage, endPage) {
  const list = chaptersInPageRange(book, startPage, endPage)
    .map((ch) => (ch.coversChapterStart && ch.coversChapterEnd ? ch.name : t('{name} 일부', { name: ch.name })));
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
    throw new Error(t('올바른 데이터 형식이 아닙니다.'));
  }
  const version = raw.schemaVersion || 0;
  if (version > SCHEMA_VERSION) {
    throw new Error(t('이 앱보다 새로운 버전({version})의 데이터입니다.', { version }));
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

/** 로그인할 때마다 프로필 갱신 + 관리자/팀 여부 확인 → { isAdmin, inTeam, language } */
async function loadAccount(user) {
  const sb = getSupabase();
  const meta = user.user_metadata || {};
  const [profile, admin] = await Promise.all([
    sb.rpc('study_planner_touch_profile', { p_name: meta.full_name || meta.name || null }),
    sb.rpc('study_planner_is_admin'),
  ]);
  if (profile.error) throw profile.error;
  if (admin.error) throw admin.error;
  return {
    isAdmin: admin.data === true,
    inTeam: !!(profile.data && profile.data.in_team),
    language: profile.data && isLang(profile.data.language) ? profile.data.language : null,
  };
}

/** 계정에 언어 저장 (실패해도 화면은 그대로, 경고만) */
async function saveAccountLanguage(lang) {
  try {
    const { error } = await getSupabase().rpc('study_planner_set_language', { p_language: lang });
    if (error) console.warn('[account] 언어 저장 실패:', error);
  } catch (err) {
    console.warn('[account] 언어 저장 실패:', err);
  }
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

/** 모든 회원의 목표 (개인 목표 포함) → [{ userId, goal }] */
async function adminLoadAllGoals() {
  const { data, error } = await getSupabase().from(GOALS_TABLE).select('user_id, data');
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
  return t('학습계획표-백업-{date}.json', { date: today });
}

function isValidPlan(plan) {
  return plan && isValidDateStr(plan.startDate) && isValidDateStr(plan.endDate)
    && Number.isInteger(plan.from) && Number.isInteger(plan.to) && plan.from <= plan.to
    && diffDays(plan.startDate, plan.endDate) >= 0
    && (plan.restWeekdays === undefined || (Array.isArray(plan.restWeekdays)
      && plan.restWeekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)))
    && (plan.restDates === undefined || (Array.isArray(plan.restDates) && plan.restDates.every(isValidDateStr)))
    && isDateNumberMap(plan.weights, (v) => typeof v === 'number' && v > 0)
    && isDateNumberMap(plan.fixed, (v) => Number.isInteger(v) && v >= 0);
}

/** { 'YYYY-MM-DD': 숫자 } 형식인지 (없으면 통과) */
function isDateNumberMap(obj, valueOk) {
  if (obj === undefined) return true;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Object.entries(obj).every(([k, v]) => isValidDateStr(k) && valueOk(v));
}

/** 불러온 목표 하나의 형식 검사 (문제가 있으면 오류 메시지, 없으면 null) */
function checkGoalShape(goal, index) {
  const label = `${t('{n}번째 목표', { n: index + 1 })}${goal && goal.title ? `(${goal.title})` : ''}`;
  const fail = (message) => `${label}: ${t(message)}`;
  if (!goal || typeof goal !== 'object') return fail('형식이 올바르지 않습니다.');
  if (typeof goal.id !== 'string' || !/^[\w-]{1,64}$/.test(goal.id) || typeof goal.title !== 'string') {
    return fail('id 또는 이름이 올바르지 않습니다.');
  }
  if (!BASES_BY_TYPE[goal.type]) return fail('종류(type)가 올바르지 않습니다.');
  if (!isValidDateStr(goal.startDate) || !isValidDateStr(goal.dueDate)) return fail('날짜가 올바르지 않습니다.');
  if (goal.book && goal.book.author !== undefined && typeof goal.book.author !== 'string') {
    return fail('저자 정보가 올바르지 않습니다.');
  }
  if (goal.requiredBookId !== undefined && (typeof goal.requiredBookId !== 'string'
    || !/^[\w-]{1,64}$/.test(goal.requiredBookId))) {
    return fail('필독서 연결 정보가 올바르지 않습니다.');
  }
  if (goal.extraDates !== undefined && (!Array.isArray(goal.extraDates)
    || !goal.extraDates.every((x) => x && isValidDateStr(x.date) && EXTRA_WEIGHTS.includes(x.weight)))) {
    return fail('여유 있는 날 정보가 올바르지 않습니다.');
  }
  if (goal.restDates !== undefined && (!Array.isArray(goal.restDates)
    || !goal.restDates.every((x) => x && isValidDateStr(x.date) && typeof x.label === 'string'))) {
    return fail('쉬는 날 정보가 올바르지 않습니다.');
  }
  if (goal.restWeekdays !== undefined && (!Array.isArray(goal.restWeekdays)
    || !goal.restWeekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))) {
    return fail('쉬는 요일 정보가 올바르지 않습니다.');
  }
  if (goal.type === 'book') {
    const b = goal.book;
    const chaptersOk = b && Array.isArray(b.chapters) && b.chapters.length > 0 && Number.isInteger(b.lastPage)
      && b.chapters.every((c, i) => c && typeof c.name === 'string' && Number.isInteger(c.startPage) && c.startPage >= 1
        && c.startPage <= b.lastPage && (i === 0 || c.startPage > b.chapters[i - 1].startPage));
    if (!chaptersOk) return fail('챕터 정보가 올바르지 않습니다.');
  } else if (goal.type === 'bible') {
    const books = goal.bible && goal.bible.books;
    if (!Array.isArray(books) || !books.length
      || !books.every((b) => b && bibleIndexOf(b.name) >= 0 && Number.isInteger(b.chapters) && b.chapters > 0)) {
      return fail('통독 범위가 올바르지 않습니다.');
    }
  } else if (!goal.lecture || !Array.isArray(goal.lecture.titles) || goal.lecture.titles.length === 0
    || !goal.lecture.titles.every((t) => typeof t === 'string')) {
    return fail('강의 목록이 올바르지 않습니다.');
  }
  const pr = goal.progress;
  if (!pr || !Number.isInteger(pr.current) || !Array.isArray(pr.history)
    || !pr.history.every((h) => h && isValidDateStr(h.date) && Number.isFinite(h.value))) {
    return fail('진도 정보가 올바르지 않습니다.');
  }
  for (const basis of BASES_BY_TYPE[goal.type]) {
    const p = goal.plans && goal.plans[basis];
    if (!p || !isValidPlan(p.original) || (p.current && !isValidPlan(p.current))) {
      return fail('계획 정보가 올바르지 않습니다.');
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
    throw new Error(t('JSON 파일을 읽을 수 없습니다. 파일이 손상되었거나 JSON 형식이 아닙니다.'));
  }
  const data = migrateData(raw);
  const problems = data.goals.map(checkGoalShape).filter(Boolean);
  if (problems.length) throw new Error(problems.slice(0, 5).join('\n'));
  const ids = new Set(data.goals.map((g) => g.id));
  if (ids.size !== data.goals.length) throw new Error(t('같은 id를 가진 목표가 여러 개 있습니다.'));
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
  const rd = createPlan('2026-10-01', '2026-10-10', 0, 70, [0, 6], ['2026-10-06']);
  const rdRows = buildSchedule(rd);
  check('쉬는 날(날짜): 그날 분량 0, 공부일 6일', rdRows.find((r) => r.date === '2026-10-06').isRestDay
    && countStudyDays('2026-10-01', '2026-10-10', [0, 6], ['2026-10-06']) === 6 && rdRows.at(-1).cumulative === 70);
  const rdGoal = createLectureGoal({ title: 'x', startDate: '2026-10-01', dueDate: '2026-10-10', titles: ['a', 'b', 'c'],
    restDates: [{ date: '2026-10-05', label: '수련회' }, { date: '2026-10-03', label: '' }, { date: '2026-10-05', label: '중복' }] });
  check('쉬는 날(날짜): 정리·메모', getRestDates(rdGoal).length === 2 && getRestDates(rdGoal)[0].date === '2026-10-03'
    && restText(rdGoal, '2026-10-05') === '쉬는 날 · 중복' && getActivePlan(rdGoal, 'lecture').restDates.length === 2);
  check('쉬는 날(날짜): 수정 시 계획 변경 감지', isPlanAffectingEdit(rdGoal, { ...goalToInput(rdGoal), restDates: [] })
    && !isPlanAffectingEdit(rdGoal, { ...goalToInput(rdGoal), restDates: [{ date: '2026-10-03', label: '메모만' }, { date: '2026-10-05', label: 'x' }] }));
  // 여유 있는 날 · 직접 설정
  const wRows = buildSchedule(createPlan('2026-10-01', '2026-10-04', 0, 50, [], [], { weights: { '2026-10-03': 2 } }));
  check('여유 있는 날: 2배 분량', wRows.map((r) => r.amount).join(',') === '10,10,20,10');
  const fRows = buildSchedule(createPlan('2026-10-01', '2026-10-05', 0, 50, [], [], { fixed: { '2026-10-02': 2 } }));
  check('직접 설정: 고정 분량 + 나머지 균등', fRows.map((r) => r.amount).join(',') === '12,2,12,12,12' && fRows[1].isFixed);
  const allFixed = buildSchedule(createPlan('2026-10-01', '2026-10-02', 0, 10, [], [], { fixed: { '2026-10-01': 3, '2026-10-02': 3 } }));
  check('직접 설정: 모두 고정이면 남은 분량은 마지막 날', allFixed.at(-1).cumulative === 10);
  const over = buildSchedule(createPlan('2026-10-01', '2026-10-02', 0, 10, [], [], { fixed: { '2026-10-01': 30 } }));
  check('직접 설정: 전체보다 많으면 무시', over.map((r) => r.amount).join(',') === '5,5');
  const eg = createLectureGoal({ title: 'e', startDate: '2026-10-01', dueDate: '2026-10-04', titles: ['a', 'b', 'c', 'd', 'e'],
    extraDates: [{ date: '2026-10-04', weight: 3 }, { date: '2026-10-02', weight: 7 }] });
  check('여유 있는 날: 목표 → 계획 가중치', getExtraDates(eg).length === 1 && getActivePlan(eg, 'lecture').weights['2026-10-04'] === 3
    && checkGoalShape(eg, 0) === null);
  const ag = createLectureGoal({ title: 'a', startDate: '2026-10-01', dueDate: '2026-10-05', titles: Array(50).fill('x') });
  const adj = computeAdjustedPlan(ag, 'lecture', { '2026-10-04': '2' }, '2026-10-03');
  const adjRows = buildSchedule(adj.plan);
  check('직접 조정: 지난 날 유지 + 나머지 재분배', !adj.errors.length && adjRows.map((r) => r.amount).join(',') === '10,10,14,2,14');
  check('직접 조정: 합 초과 오류', computeAdjustedPlan(ag, 'lecture', { '2026-10-04': '99' }, '2026-10-03').errors.length === 1);
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

  // 성경 통독
  check('성경: 전체 1189장 · 구약 929 · 신약 260', bibleTotalChapters({ books: bibleBooksInRange(0, 65) }) === 1189
    && bibleTotalChapters({ books: bibleBooksInRange(0, 38) }) === 929 && bibleTotalChapters({ books: bibleBooksInRange(39, 65) }) === 260);
  const bg = createBibleGoal({ title: '통독', startDate: '2026-10-01', dueDate: '2026-10-10', bibleStart: 0, bibleEnd: 1 });
  check('성경: 범위 설명', describeBibleRange(bg.bible, 0, 3) === '창세기 1~3장'
    && describeBibleRange(bg.bible, 48, 52) === '창세기 49장 ~ 출애굽기 2장' && describeBibleRange(bg.bible, 89, 90) === '출애굽기 40장');
  check('성경: 위치 변환', bibleUnitsFromPosition(bg.bible, 1, 2) === 52 && formatBiblePosition(bg.bible, 52) === '출애굽기 2장');
  check('성경: 계획 합계 90장', buildSchedule(getActivePlan(bg, 'bible')).at(-1).cumulative === 90);
  check('성경: 범위 역순 차단', validateBibleInput({ title: 'x', startDate: '2026-10-01', dueDate: '2026-10-02', bibleStart: 5, bibleEnd: 2 }).length > 0);
  check('성경: 백업 형식 검사 통과', checkGoalShape(bg, 0) === null);

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
    saving: `<span class="save-state is-saving">${t('저장 중…')}</span>`,
    saved: `<span class="save-state is-saved">${t('저장됨')}</span>`,
    error: `<span class="save-state is-error">${t('저장 실패')} <button type="button" class="link-btn" data-action="retry-save">${t('다시 시도')}</button></span>`,
  }[saveState];
  const name = currentUser.user_metadata && (currentUser.user_metadata.full_name || currentUser.user_metadata.name);
  bar.hidden = false;
  bar.innerHTML = `
    <div class="topbar-inner">
      <nav class="topbar-nav">
        <a class="brand" href="#/">${t('학습 진도 계획표')}</a>
        ${account.isAdmin ? `<a class="nav-link" href="#/admin">${t('관리자')}</a>` : ''}
      </nav>
      <div class="topbar-right">
        ${renderLangToggle()}
        ${status}
        <span class="user">${escapeHtml(name || currentUser.email || '')}</span>
        <button type="button" class="btn btn-small" data-action="sign-out">${t('로그아웃')}</button>
      </div>
    </div>`;
}

/* ----- 로그인 · 시작 화면 ----- */

function renderMessageScreen(root, title, html, withLang = false) {
  root.innerHTML = `
    <div class="login-screen">
      ${withLang ? `<div class="login-lang">${renderLangToggle()}</div>` : ''}
      <div class="login-card">
        <h1>${title}</h1>
        ${html}
      </div>
    </div>`;
}

function renderLogin(root, errorMessage = '') {
  const isFile = location.protocol === 'file:';
  renderMessageScreen(root, t('학습 진도 계획표'), `
    <p class="muted">${t('책·강의의 마감일까지 매일 할 분량을 계획하고 진도를 기록합니다.')}<br>
      ${t('구글 계정으로 로그인하면 어느 기기에서든 같은 계획을 볼 수 있습니다.')}</p>
    ${isFile ? `<p class="errors">${t('파일을 직접 연 상태에서는 로그인할 수 없습니다. 배포된 인터넷 주소(https://…)로 열어 주세요.')}</p>` : ''}
    ${errorMessage ? `<p class="errors">${escapeHtml(errorMessage)}</p>` : ''}
    <button type="button" class="btn btn-google" data-action="google-login" ${isFile ? 'disabled' : ''}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      ${t('Google 계정으로 로그인')}
    </button>`, true);
  root.querySelector('[data-action="google-login"]').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await signInWithGoogle(); // 구글 로그인 페이지로 이동
    } catch (err) {
      renderLogin(root, t('로그인을 시작하지 못했습니다: {message}', { message: err.message }));
    }
  });
}

/** 로그인 후: 서버에서 데이터를 불러오고, 이전 브라우저 데이터가 있으면 옮길지 묻는다 */
async function startApp(user) {
  const root = document.getElementById('app');
  currentUser = user;
  renderTopbar();
  renderMessageScreen(root, t('불러오는 중…'), `<p class="muted">${t('계정에 저장된 목표를 불러오고 있습니다.')}</p>`);
  try {
    appData = await loadData();
  } catch (err) {
    console.error('[storage] 불러오기 실패:', err);
    renderMessageScreen(root, t('불러오지 못했습니다'), `
      <p class="errors">${escapeHtml(err.message || String(err))}</p>
      <button type="button" class="btn btn-primary" data-action="reload">${t('다시 시도')}</button>`);
    root.querySelector('[data-action="reload"]').addEventListener('click', () => startApp(user));
    return;
  }

  // 관리자·팀 정보와 필독서 — 실패해도 내 계획은 쓸 수 있게 경고만 남긴다
  try {
    account = await loadAccount(user);
    syncAccountLanguage(account.language);
    requiredBooks = account.inTeam || account.isAdmin ? await loadRequiredBooks() : [];
  } catch (err) {
    console.warn('[account] 팀·필독서 정보를 불러오지 못했습니다:', err);
    account = { isAdmin: false, inTeam: false };
    requiredBooks = [];
  }
  renderTopbar();

  const legacy = readLegacyGoals().filter((g) => !getGoal(g.id));
  if (legacy.length) {
    const move = confirm(t('이 브라우저에 로그인 전에 만든 목표 {n}개가 있습니다.\n계정으로 옮길까요?\n\n'
      + '(취소를 누르면 옮기지 않고, 다시 묻지 않습니다. 브라우저의 데이터는 지워지지 않습니다.)', { n: legacy.length }));
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

/** 로그인 후 계정의 언어를 따른다. 계정에 없으면 지금 언어를 계정에 저장 */
function syncAccountLanguage(lang) {
  if (isLang(lang)) {
    storeLang(lang);
    if (lang !== currentLang) applyLanguage(lang);
  } else {
    saveAccountLanguage(currentLang);
  }
}

/** 전환 버튼: 언어를 바꾸고 지금 화면을 다시 그린다 */
function changeLanguage(lang) {
  if (!isLang(lang) || lang === currentLang) return;
  applyLanguage(lang);
  storeLang(lang);
  if (currentUser) saveAccountLanguage(lang);
  renderTopbar();
  const root = document.getElementById('app');
  if (!currentUser) {
    if (root.querySelector('[data-action="google-login"]')) renderLogin(root);
    return;
  }
  if (!appData) return; // 불러오는 중
  // 입력 중이던 목표 폼 값은 유지
  if (parseRoute().view === 'form' && document.getElementById('goal-form')) langFormDraft = collectFormInput();
  const exportOpen = exportState.goal && document.getElementById('export-dialog') && !document.getElementById('export-dialog').hidden;
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
  if (exportOpen && parseRoute().view === 'detail') openExportDialog(exportState.goal, exportState.options);
}

function parseRoute() {
  const [name, id, sub, sub2] = location.hash.replace(/^#\/?/, '').split('/');
  if (name === 'new' && id === 'book' && sub) return { view: 'form', bookId: sub };
  if (name === 'new') return { view: 'form' };
  if (name === 'admin' && id === 'member' && sub && sub2) return { view: 'admin', tab: 'member', userId: sub, goalId: sub2 };
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
  if (route.view !== 'detail') { detailState.preview = null; detailState.adjust = null; }
  if (typeof closeExportDialog === 'function') closeExportDialog();
  if (route.view === 'admin') {
    if (!account.isAdmin) { navigate('#/'); return; }
    renderAdmin(root, route.tab, route);
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
        <h1>${t('학습 진도 계획표')}</h1>
        <p class="muted">${escapeHtml(today)} (${weekdayLabel(today)})</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn" data-action="export" ${appData.goals.length ? '' : 'disabled'}
          title="${t('모든 목표와 진도 기록을 JSON 파일로 저장합니다')}">${t('JSON 내보내기')}</button>
        <button type="button" class="btn" data-action="import" title="${t('백업한 JSON 파일로 전체 데이터를 바꿉니다')}">${t('JSON 불러오기')}</button>
        <input type="file" id="import-file" accept=".json,application/json" hidden>
        <a class="btn btn-primary" href="#/new">${t('+ 새 목표 추가')}</a>
      </div>
    </header>

    ${showRequired ? renderRequiredSection(today) : ''}

    <section>
      <h2 class="section-title">${t('진행 중')} <span class="count">${active.length}</span></h2>
      ${active.length
        ? `<div class="card-grid">${active.map((x) => renderGoalCard(x.goal, x.s)).join('')}</div>`
        : `<div class="empty">${t('진행 중인 목표가 없습니다. <a href="#/new">새 목표를 추가</a>해 보세요.')}</div>`}
    </section>

    ${finished.length ? `
    <section class="finished-section">
      <h2 class="section-title">${t('완료 / 종료')} <span class="count">${finished.length}</span></h2>
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
  reader.onerror = () => alert(t('파일을 읽지 못했습니다.'));
  reader.onload = () => {
    let data;
    try {
      data = parseBackup(String(reader.result));
    } catch (err) {
      alert(t('불러올 수 없습니다.\n\n{message}', { message: err.message }));
      return;
    }
    const message = t("'{file}'에서 목표 {n}개를 불러옵니다.\n\n"
      + '지금 있는 목표 {current}개는 모두 지워지고 파일 내용으로 바뀝니다.\n'
      + '계속할까요? (필요하면 먼저 "JSON 내보내기"로 백업하세요)', { file: file.name, n: data.goals.length, current: appData.goals.length });
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
          <span class="type-tag type-required">${t('필독서')}</span>
          <span class="badge badge-waiting">${t('계획 없음')}</span>
        </div>
        <div class="card-book">
          ${renderCoverThumb(book.coverUrl)}
          <div>
            <h3 class="card-title">${escapeHtml(book.title)}</h3>
            ${book.author ? `<p class="card-author">${escapeHtml(book.author)}</p>` : ''}
            <p class="card-meta">${t('{pages}페이지 · {n}개 챕터', { pages, n: book.chapters.length })}</p>
          </div>
        </div>
        <a class="btn btn-primary" href="#/new/book/${escapeHtml(book.id)}">${t('계획 세우기')}</a>
      </div>`;
  }).join('');
  return `
    <section class="required-section">
      <h2 class="section-title">${t('사역자 필독서')} <span class="count">${requiredBooks.length}</span></h2>
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
  const changed = requiredBook && isRequiredBookChanged(goal, requiredBook);
  return `
    <a class="goal-card ${s.isActive ? '' : 'is-finished'}" href="#/goal/${escapeHtml(goal.id)}">
      <div class="card-top">
        <span class="card-tags">
          ${requiredBook ? `<span class="type-tag type-required">${t('필독서')}</span>` : `<span class="type-tag type-${goal.type}">${typeLabel(goal.type)}</span>`}
          ${changed ? `<span class="badge badge-ended">${t('내용 변경됨')}</span>` : ''}
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
        <span>${t('마감 {date}', { date: escapeHtml(goal.dueDate) })}</span>
        <span class="dday ${s.isActive && s.dday <= 3 ? 'is-urgent' : ''}">${formatDday(s.dday)}</span>
      </div>
      <div class="progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${s.percent}%"></div></div>
        <span class="progress-text">${s.percent}% · ${formatFraction(s.done, s.total, s.basis)}</span>
      </div>
      <div class="card-today">
        <span class="label">${t('오늘 할 분량')}</span>
        ${renderTodayAmount(goal, s)}
      </div>
    </a>
  `;
}

function renderStatusBadge(s) {
  if (s.isComplete) return `<span class="badge badge-done">${t('완료')}</span>`;
  if (s.isOverdue) return `<span class="badge badge-ended">${t('종료 · 미완료')}</span>`;
  if (s.notStarted) return `<span class="badge badge-waiting">${t('시작 전')}</span>`;
  if (s.diff < 0) return `<span class="badge badge-behind">${t('{amount} 밀림', { amount: formatAmount(-s.diff, s.basis) })}</span>`;
  if (s.diff > 0) return `<span class="badge badge-ahead">${t('{amount} 앞섬', { amount: formatAmount(s.diff, s.basis) })}</span>`;
  return `<span class="badge badge-ontrack">${t('계획대로')}</span>`;
}

function renderTodayAmount(goal, s) {
  if (s.isComplete) return `<span class="today-main">${t('모두 완료했습니다')}</span>`;
  if (s.isOverdue) return `<span class="today-main">${t('마감일이 지났습니다')}</span>`;
  if (s.notStarted) return `<span class="today-main">${t('{date} 시작', { date: formatShortDate(goal.startDate) })}</span>`;
  const row = s.todayRow;
  if (!row) return '<span class="today-main">-</span>';
  if (row.isRestDay) return `<span class="today-main">${t('오늘은 {rest}', { rest: escapeHtml(restText(goal, row.date)) })}</span>`;
  if (row.amount === 0) return `<span class="today-main">${t('휴식(분량 없음)')}</span>`;

  const doneToday = s.done >= row.cumulative;
  let sub = '';
  if (s.basis === 'page') {
    sub = describeChaptersForPages(goal.book, unitsToPage(goal.book, row.prevCumulative + 1),
      unitsToPage(goal.book, row.cumulative));
  }
  return `
    <span class="today-main">${escapeHtml(describeUnitsRange(goal, s.basis, row.prevCumulative, row.cumulative))}
      <span class="muted">(${formatAmount(row.amount, s.basis)})</span>
      ${doneToday ? `<span class="today-check">✓ ${t('완료')}</span>` : ''}
    </span>
    ${sub ? `<span class="today-sub">${escapeHtml(sub)}</span>` : ''}
  `;
}

/* =========================================================================
 * 9. 화면 — 목표 추가 / 수정
 * ========================================================================= */

/** 언어를 바꿀 때 입력 중이던 목표 폼 값 (다시 그린 폼에 한 번 채운다) */
let langFormDraft = null;

function renderGoalForm(root, goal, bookId = null) {
  const isEdit = !!goal;
  const langDraft = langFormDraft;
  langFormDraft = null;
  // 사역자 필독서로 계획 세우기: 책 정보는 필독서 것을 쓰고 잠근다
  const requiredBook = bookId ? requiredBooks.find((b) => b.id === bookId)
    : (goal && goal.requiredBookId ? requiredBooks.find((b) => b.id === goal.requiredBookId) : null);
  if (bookId) {
    if (!requiredBook) { navigate('#/'); return; }
    const existing = findGoalForBook(appData.goals, bookId);
    if (existing) { navigate(`#/goal/${existing.id}`); return; }
  }
  const locked = !!requiredBook;
  const type = goal ? goal.type : (langDraft && langDraft.type) || 'book';
  const started = isEdit && hasGoalStarted(goal);
  // 미리보기에서 "수정으로 돌아가기"를 누르면 입력하던 값(draft)으로 다시 채운다
  const draft = langDraft || (isEdit && detailState.draft && detailState.goalId === goal.id ? detailState.draft : null);
  detailState.draft = null;
  const v = draft || (goal ? goalToInput(goal) : {
    title: '', startDate: todayStr(), dueDate: '', restWeekdays: [], restDates: [], extraDates: [],
    chapters: [{ name: '', startPage: '' }], lastPage: '', titles: [], bibleStart: 0, bibleEnd: 65,
  });
  if (bookId) {
    Object.assign(v, { title: requiredBook.title, author: requiredBook.author || '', chapters: requiredBook.chapters, lastPage: requiredBook.lastPage });
  }

  root.innerHTML = `
    <header class="page-header">
      <div>
        <a class="back-link" href="${isEdit ? `#/goal/${escapeHtml(goal.id)}` : '#/'}">← ${isEdit ? t('목표 상세') : t('대시보드')}</a>
        <h1>${isEdit ? t('목표 수정') : bookId ? t('필독서 계획 세우기') : t('새 목표 추가')}</h1>
      </div>
    </header>

    <form id="goal-form" class="panel ${locked ? 'is-locked' : ''}" novalidate>
      ${locked ? `<p class="notice notice-info">${t('사역자 필독서입니다. 책 제목과 챕터는 관리자가 정하며, 여기서는 시작일·마감일·쉬는 요일만 정할 수 있습니다.')}</p>` : ''}
      ${started ? `<p class="notice">${t('진행 중인 목표입니다. 날짜·쉬는 요일·챕터·강의 목록을 바꾸면 원래 계획은 보관하고, 오늘부터 마감일까지 남은 분량을 다시 나눕니다. 저장하면 새 계획을 먼저 미리보기로 보여드립니다.')}</p>` : ''}

      <div class="field">
        <span class="field-label">${t('종류')}</span>
        <div class="segmented">
          <label><input type="radio" name="type" value="book" ${type === 'book' ? 'checked' : ''} ${isEdit || locked ? 'disabled' : ''}> ${typeLabel('book')}</label>
          <label><input type="radio" name="type" value="lecture" ${type === 'lecture' ? 'checked' : ''} ${isEdit || locked ? 'disabled' : ''}> ${typeLabel('lecture')}</label>
          <label><input type="radio" name="type" value="bible" ${type === 'bible' ? 'checked' : ''} ${isEdit || locked ? 'disabled' : ''}> ${typeLabel('bible')}</label>
        </div>
      </div>

      <div class="field">
        <label class="field-label" for="f-title" id="f-title-label"></label>
        <input id="f-title" type="text" class="input input-wide" value="${escapeHtml(v.title)}" ${locked ? 'readonly' : ''}>
      </div>

      <div class="field-row">
        <div class="field">
          <label class="field-label" for="f-start">${t('시작일')}</label>
          <input id="f-start" type="date" class="input" value="${escapeHtml(v.startDate)}">
        </div>
        <div class="field">
          <label class="field-label" for="f-due">${t('마감일')}</label>
          <input id="f-due" type="date" class="input" value="${escapeHtml(v.dueDate)}">
        </div>
        <div class="field">
          <span class="field-label">${t('기간')}</span>
          <span id="f-days" class="field-value">-</span>
        </div>
      </div>
      <div class="quick-due">
        <span class="field-hint">${t('마감일 빠르게 정하기 (시작일부터)')}</span>
        ${[1, 2, 4, 6, 8].map((w) => `<button type="button" class="btn btn-small" data-weeks="${w}"
          title="${t('시작일부터 {w}주 뒤를 마감일로 정합니다', { w })}">${t('{w}주 동안', { w })}</button>`).join('')}
        <span id="f-daily" class="daily-estimate"></span>
      </div>

      <div class="field">
        <span class="field-label">${t('쉬는 요일')} <span class="muted">${t('(선택한 요일에는 분량을 배정하지 않습니다)')}</span></span>
        <div class="weekday-picker">
          ${WEEKDAY_ORDER.map((d) => `
            <label class="weekday ${d === 0 ? 'is-sun' : d === 6 ? 'is-sat' : ''}">
              <input type="checkbox" name="rest-weekday" value="${d}"
                ${normalizeWeekdays(v.restWeekdays).includes(d) ? 'checked' : ''}>
              <span>${weekdayName(d)}</span>
            </label>`).join('')}
        </div>
      </div>

      <div class="field">
        <span class="field-label">${t('쉬는 날||label')} <span class="muted">${t('(행사·일정 등으로 빠지는 특정 날짜)')}</span></span>
        <div class="rest-date-add">
          <input id="f-rest-date" type="date" class="input" aria-label="${t('쉬는 날짜')}">
          <input id="f-rest-label" type="text" class="input rest-label-input" placeholder="${t('메모 (예: 수련회)')}" maxlength="30">
          <button type="button" class="btn btn-small" id="add-rest-date">${t('+ 추가')}</button>
        </div>
        <div id="rest-date-list" class="rest-date-list"></div>
      </div>

      <div class="field">
        <span class="field-label">${t('여유 있는 날')} <span class="muted">${t('(그날은 평소보다 많이 배정)')}</span></span>
        <div class="rest-date-add">
          <input id="f-extra-date" type="date" class="input" aria-label="${t('여유 있는 날짜')}">
          <select id="f-extra-weight" class="input extra-weight-select" aria-label="${t('분량 배수')}">
            ${EXTRA_WEIGHTS.map((w) => `<option value="${w}" ${w === 2 ? 'selected' : ''}>${t('평소의 {w}배', { w })}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-small" id="add-extra-date">${t('+ 추가')}</button>
        </div>
        <div id="extra-date-list" class="rest-date-list"></div>
      </div>

      <div data-section="book">
        <div class="field">
          <label class="field-label" for="f-author">${t('저자')} <span class="muted">${t('(선택)')}</span></label>
          <input id="f-author" type="text" class="input input-wide" value="${escapeHtml(v.author || '')}" ${locked ? 'readonly' : ''}>
        </div>
        ${renderChapterEditorHtml(v.lastPage)}
      </div>

      <div data-section="lecture">
        <div class="field">
          <label class="field-label" for="f-lectures">${t('강의 제목 목록')} <span class="muted">${t('(한 줄에 하나, 빈 줄은 무시)')}</span></label>
          <textarea id="f-lectures" class="input textarea" rows="12">${escapeHtml(v.titles.join('\n'))}</textarea>
          <span id="f-lecture-count" class="field-hint"></span>
        </div>
      </div>

      <div data-section="bible">
        <div class="field">
          <span class="field-label">${t('통독 범위')}</span>
          <div class="bible-presets">
            ${BIBLE_PRESETS.map(([name, a, b]) => `<button type="button" class="btn btn-small" data-bible-preset="${a},${b}">${t(name)}</button>`).join('')}
          </div>
          <div class="bible-range">
            <select id="f-bible-start" class="input bible-select">
              ${BIBLE_BOOKS.map((b, i) => `<option value="${i}" ${i === Number(v.bibleStart) ? 'selected' : ''}>${bibleBookName(b.name)}</option>`).join('')}
            </select>
            <span>${t('부터')}</span>
            <select id="f-bible-end" class="input bible-select">
              ${BIBLE_BOOKS.map((b, i) => `<option value="${i}" ${i === Number(v.bibleEnd) ? 'selected' : ''}>${bibleBookName(b.name)}</option>`).join('')}
            </select>
            ${t('까지') ? `<span>${t('까지')}</span>` : ''}
          </div>
          <span id="f-bible-summary" class="field-hint"></span>
        </div>
      </div>

      <div id="form-errors" class="errors" hidden></div>

      <div class="form-actions">
        <a class="btn" href="${isEdit ? `#/goal/${escapeHtml(goal.id)}` : '#/'}">${t('취소')}</a>
        <button type="submit" class="btn btn-primary">${isEdit ? t('저장') : t('목표 추가')}</button>
      </div>
    </form>
  `;

  fillChapterEditor(v.chapters, locked);
  (v.restDates || []).forEach((x) => addRestDateChip(x));
  (v.extraDates || []).forEach((x) => addExtraDateChip(x));

  const form = root.querySelector('#goal-form');
  // 언어를 바꿔 다시 그렸으면, 자동으로 붙인 통독 이름도 새 언어로
  if (langDraft && type === 'bible') syncBibleAutoTitle(form, true);
  form.addEventListener('change', (e) => {
    if (e.target.name === 'type' || e.target.classList.contains('bible-select')) {
      syncBibleAutoTitle(form);
      updateFormView();
    }
  });
  form.addEventListener('input', updateFormView);
  bindChapterEditor(form, updateFormView);
  form.addEventListener('click', (e) => {
    if (e.target.id === 'add-rest-date') {
      const dateEl = form.querySelector('#f-rest-date');
      const labelEl = form.querySelector('#f-rest-label');
      if (!isValidDateStr(dateEl.value)) { dateEl.focus(); return; }
      addRestDateChip({ date: dateEl.value, label: labelEl.value });
      dateEl.value = '';
      labelEl.value = '';
      updateFormView();
      return;
    }
    if (e.target.id === 'add-extra-date') {
      const dateEl = form.querySelector('#f-extra-date');
      if (!isValidDateStr(dateEl.value)) { dateEl.focus(); return; }
      addExtraDateChip({ date: dateEl.value, weight: Number(form.querySelector('#f-extra-weight').value) });
      dateEl.value = '';
      updateFormView();
      return;
    }
    if (e.target.closest('.rest-chip-del')) {
      e.target.closest('.rest-chip').remove();
      updateFormView();
      return;
    }
    const preset = e.target.closest('[data-bible-preset]')?.dataset.biblePreset;
    if (preset) {
      const [a, b] = preset.split(',');
      form.querySelector('#f-bible-start').value = a;
      form.querySelector('#f-bible-end').value = b;
      syncBibleAutoTitle(form);
      updateFormView();
      return;
    }
    const weeks = e.target.closest('[data-weeks]')?.dataset.weeks;
    if (!weeks) return;
    const start = form.querySelector('#f-start').value;
    if (!isValidDateStr(start)) return;
    form.querySelector('#f-due').value = addDays(start, Number(weeks) * 7 - 1);
    updateFormView();
  });
  form.querySelector('#f-rest-label').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.querySelector('#add-rest-date').click();
    }
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
      <span class="field-label">${t('챕터 목록')}</span>
      <table class="chapter-table">
        <thead>
          <tr><th class="col-drag"></th><th class="col-no">#</th><th>${t('챕터 이름')}</th><th class="col-page">${t('시작 페이지')}</th><th class="col-page">${t('끝 페이지')}</th><th class="col-del"></th></tr>
        </thead>
        <tbody id="chapter-rows"></tbody>
      </table>
      <button type="button" class="btn btn-small" id="add-chapter">${t('+ 챕터 추가')}</button>
    </div>
    <div class="field-row">
      <div class="field">
        <label class="field-label" for="f-last-page">${t('마지막 페이지')}</label>
        <input id="f-last-page" type="number" min="1" class="input input-num"
          value="${Number.isFinite(Number(lastPage)) && lastPage !== '' && lastPage !== null ? Number(lastPage) : ''}">
      </div>
      <div class="field">
        <span class="field-label">${t('합계')}</span>
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
    document.querySelectorAll('.ch-del, .ch-insert, .drag-handle').forEach((el) => { el.hidden = true; });
    document.getElementById('chapter-rows').classList.add('is-locked');
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
    if (e.target.classList.contains('ch-insert')) {
      const tr = addChapterRow({ name: '', startPage: '' }, e.target.closest('tr'));
      onChange();
      tr.querySelector('.ch-name').focus();
    }
    if (e.target.classList.contains('ch-del')) {
      const rows = container.querySelectorAll('#chapter-rows tr');
      if (rows.length > 1) e.target.closest('tr').remove();
      onChange();
    }
  });
  bindChapterDrag(container.querySelector('#chapter-rows'), onChange);
}

/** 손잡이(⠿)를 잡고 끌어서 챕터 순서 바꾸기 */
function bindChapterDrag(tbody, onChange) {
  if (!tbody || tbody.classList.contains('is-locked')) return;
  let dragging = null;

  // 손잡이를 누를 때만 행을 끌 수 있게 (입력칸 글자 선택과 충돌 방지)
  tbody.addEventListener('mousedown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (handle) handle.closest('tr').draggable = true;
  });
  tbody.addEventListener('mouseup', () => {
    tbody.querySelectorAll('tr[draggable="true"]').forEach((tr) => { tr.draggable = false; });
  });
  tbody.addEventListener('dragstart', (e) => {
    dragging = e.target.closest('tr');
    if (!dragging) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    dragging.classList.add('is-dragging');
  });
  tbody.addEventListener('dragover', (e) => {
    if (!dragging) return;
    e.preventDefault();
    const over = e.target.closest('tr');
    if (!over || over === dragging) return;
    const rect = over.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    tbody.insertBefore(dragging, after ? over.nextSibling : over);
  });
  tbody.addEventListener('drop', (e) => e.preventDefault());
  tbody.addEventListener('dragend', () => {
    if (!dragging) return;
    dragging.classList.remove('is-dragging');
    dragging.draggable = false;
    dragging = null;
    onChange();
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
      ? t('{pages}페이지 · {n}개 챕터', { pages: lastPage - first + 1, n: chapters.length })
      : '-';
}

/** 챕터 행 만들기. before가 있으면 그 행 위에 넣는다 */
function addChapterRow(ch, before = null) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="col-drag"><span class="drag-handle" title="${t('끌어서 순서 바꾸기')}" aria-hidden="true">⠿</span></td>
    <td class="col-no ch-no"></td>
    <td><input type="text" class="input ch-name" value="${escapeHtml(ch.name)}" placeholder="${t('예: 1장 도입')}"></td>
    <td class="col-page"><input type="number" min="1" class="input input-num ch-start" value="${escapeHtml(ch.startPage)}"></td>
    <td class="col-page ch-end muted">-</td>
    <td class="col-del">
      <button type="button" class="btn-icon ch-insert" title="${t('이 위에 챕터 추가')}">+</button>
      <button type="button" class="btn-icon ch-del" title="${t('행 삭제')}">×</button>
    </td>
  `;
  const tbody = document.getElementById('chapter-rows');
  if (before) tbody.insertBefore(tr, before);
  else tbody.appendChild(tr);
  return tr;
}

/** 쉬는 날 칩 추가 (같은 날짜가 있으면 메모만 바꿈), 날짜순 정렬 */
function addRestDateChip({ date, label = '' }) {
  const list = document.getElementById('rest-date-list');
  const existing = list.querySelector(`[data-date="${date}"]`);
  if (existing) existing.remove();
  const chip = document.createElement('span');
  chip.className = 'rest-chip';
  chip.dataset.date = date;
  chip.dataset.label = label.trim();
  const d = parseDate(date);
  chip.innerHTML = `
    <span class="rest-chip-date">${d.getMonth() + 1}/${d.getDate()} (${weekdayLabel(date)})</span>
    ${label.trim() ? `<span class="rest-chip-label">${escapeHtml(label.trim())}</span>` : ''}
    <button type="button" class="rest-chip-del" aria-label="${t('{date} 쉬는 날 삭제', { date })}">×</button>`;
  const after = [...list.children].find((c) => diffDays(date, c.dataset.date) > 0);
  list.insertBefore(chip, after || null);
}

/** 여유 있는 날 칩 추가 (같은 날짜면 배수만 바꿈) */
function addExtraDateChip({ date, weight }) {
  const list = document.getElementById('extra-date-list');
  const existing = list.querySelector(`[data-date="${date}"]`);
  if (existing) existing.remove();
  const chip = document.createElement('span');
  chip.className = 'rest-chip extra-chip';
  chip.dataset.date = date;
  chip.dataset.weight = String(weight);
  const d = parseDate(date);
  chip.innerHTML = `
    <span class="rest-chip-date">${d.getMonth() + 1}/${d.getDate()} (${weekdayLabel(date)})</span>
    <span class="extra-chip-weight">×${weight}</span>
    <button type="button" class="rest-chip-del" aria-label="${t('{date} 여유 있는 날 삭제', { date })}">×</button>`;
  const after = [...list.children].find((c) => diffDays(date, c.dataset.date) > 0);
  list.insertBefore(chip, after || null);
}

function readExtraDateChips() {
  return [...document.querySelectorAll('#extra-date-list .rest-chip')]
    .map((c) => ({ date: c.dataset.date, weight: Number(c.dataset.weight) }));
}

function readRestDateChips() {
  return [...document.querySelectorAll('#rest-date-list .rest-chip')]
    .map((c) => ({ date: c.dataset.date, label: c.dataset.label || '' }));
}

/** 기간 밖이거나 쉬는 날과 겹치는 칩은 흐리게 표시 */
function markRestChipsOutOfRange(startDate, dueDate, restWeekdays = [], restDates = []) {
  const restList = restDateList(restDates);
  document.querySelectorAll('#rest-date-list .rest-chip, #extra-date-list .rest-chip').forEach((c) => {
    const out = !isValidDateStr(startDate) || !isValidDateStr(dueDate)
      || diffDays(startDate, c.dataset.date) < 0 || diffDays(c.dataset.date, dueDate) < 0;
    const clash = c.classList.contains('extra-chip') && isRestDate(c.dataset.date, restWeekdays, restList);
    c.classList.toggle('is-out', out || clash);
    c.title = out ? t('기간 밖이라 계획에 영향 없음') : clash ? t('쉬는 날과 겹쳐서 적용되지 않음') : '';
  });
}

/** 통독 자동 이름: "성경 통독 · 신약" / "Bible Reading · New Testament" */
function bibleAutoTitle(a, b) {
  return t('성경 통독 · {range}', { range: bibleRangeLabel(a, b) });
}

/** 다른 언어로 자동으로 붙였던 이름인지 */
function isOtherLangAutoTitle(title, a, b) {
  const saved = currentLang;
  try {
    return LANGS.some((lang) => {
      currentLang = lang;
      return bibleAutoTitle(a, b) === title;
    });
  } finally {
    currentLang = saved;
  }
}

/**
 * 성경 통독: 이름이 비어 있거나 자동으로 채운 이름이면 범위에 맞춰 이름을 바꿔 준다
 * langChanged: 언어를 바꿔 다시 그린 경우 — 다른 언어의 자동 이름도 자동 이름으로 본다
 */
function syncBibleAutoTitle(form, langChanged = false) {
  if (getFormType() !== 'bible') return;
  const titleEl = form.querySelector('#f-title');
  const a = Number(form.querySelector('#f-bible-start').value);
  const b = Number(form.querySelector('#f-bible-end').value);
  if (a > b) return;
  const auto = bibleAutoTitle(a, b);
  if (!titleEl.value.trim() || titleEl.value === form.dataset.autoTitle
    || (langChanged && isOtherLangAutoTitle(titleEl.value, a, b))) {
    titleEl.value = auto;
    form.dataset.autoTitle = auto;
  }
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
    bibleStart: Number(val('f-bible-start')),
    bibleEnd: Number(val('f-bible-end')),
    titles: parseLectureLines(val('f-lectures')),
    restWeekdays: [...document.querySelectorAll('input[name="rest-weekday"]:checked')].map((el) => Number(el.value)),
    restDates: readRestDateChips(),
    extraDates: readExtraDateChips(),
  };
}

/** 종류 전환, 끝 페이지 자동 계산, 합계 표시 */
function updateFormView() {
  const input = collectFormInput();
  const isBook = input.type === 'book';
  const isBible = input.type === 'bible';
  document.querySelector('[data-section="book"]').hidden = !isBook;
  document.querySelector('[data-section="lecture"]').hidden = input.type !== 'lecture';
  document.querySelector('[data-section="bible"]').hidden = !isBible;
  document.getElementById('f-title-label').textContent = t({ book: '책 제목', lecture: '강의 이름', bible: '통독 이름' }[input.type]);
  const bibleChapters = input.bibleStart <= input.bibleEnd
    ? bibleBooksInRange(input.bibleStart, input.bibleEnd).reduce((sum, b) => sum + b.chapters, 0) : 0;
  document.getElementById('f-bible-summary').textContent = input.bibleStart <= input.bibleEnd
    ? t('{books}권 · {chapters}장', { books: input.bibleEnd - input.bibleStart + 1, chapters: bibleChapters })
    : t('시작 권이 끝 권보다 뒤에 있습니다');

  const days = isValidDateStr(input.startDate) && isValidDateStr(input.dueDate)
    ? countDaysInclusive(input.startDate, input.dueDate) : null;
  let daysText = '-';
  if (days !== null) {
    const study = days > 0 ? countStudyDays(input.startDate, input.dueDate, input.restWeekdays, input.restDates) : 0;
    const extraCount = (input.extraDates || []).filter((x) => diffDays(input.startDate, x.date) >= 0
      && diffDays(x.date, input.dueDate) >= 0 && !isRestDate(x.date, input.restWeekdays, restDateList(input.restDates))).length;
    daysText = days <= 0 ? t('마감일이 시작일보다 앞입니다')
      : (study === days ? formatDays(days) : t('{days}일 중 공부하는 날 {study}일', { days, study }))
        + (extraCount ? ` · ${t('여유 {n}일', { n: extraCount })}` : '');
  }
  document.getElementById('f-days').textContent = daysText;
  markRestChipsOutOfRange(input.startDate, input.dueDate, input.restWeekdays, input.restDates);

  // 하루 평균 분량 안내
  let daily = '';
  if (days > 0) {
    const study = countStudyDays(input.startDate, input.dueDate, input.restWeekdays, input.restDates);
    const first = input.chapters[0] && input.chapters[0].startPage;
    const total = isBook
      ? (Number.isInteger(first) && Number.isInteger(input.lastPage) ? input.lastPage - first + 1 : 0)
      : isBible ? bibleChapters : input.titles.length;
    if (study > 0 && total > 0) {
      const avg = total / study;
      const basis = isBook ? 'page' : isBible ? 'bible' : 'lecture';
      const amount = formatAmount(avg >= 10 ? Math.round(avg) : Math.round(avg * 10) / 10, basis);
      daily = t('공부하는 날 하루 약 <b>{amount}</b>', { amount });
    }
  }
  document.getElementById('f-daily').innerHTML = daily;

  refreshChapterEditor();
  document.getElementById('f-lecture-count').textContent = t('{n}개 강의', { n: input.titles.length });
}

function submitGoalForm(goal, requiredBookId = null) {
  const input = collectFormInput();
  const errors = goal
    ? validateGoalEdit(goal, input)
    : validateGoalInput(input);

  const box = document.getElementById('form-errors');
  if (errors.length) {
    box.innerHTML = `<strong>${t('저장할 수 없습니다')}</strong><ul>${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
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
    const created = createGoalFromInput(input, requiredBookId);
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
  detailState.adjust = null;
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
          <a class="back-link" href="#/">← ${t('대시보드')}</a>
          <h1>${escapeHtml(goal.title)}</h1>
          ${getBookAuthor(goal) ? `<p class="detail-author">${t('{author} 지음', { author: escapeHtml(getBookAuthor(goal)) })}</p>` : ''}
          <p class="muted">
            ${goal.requiredBookId && requiredBooks.some((b) => b.id === goal.requiredBookId)
              ? `<span class="type-tag type-required">${t('필독서')}</span>`
              : `<span class="type-tag type-${goal.type}">${typeLabel(goal.type)}</span>`}
            ${goal.startDate} ~ ${goal.dueDate} · ${formatDday(s.dday)}
            ${getRestWeekdays(goal).length ? ` · ${t('쉬는 요일 {days}', { days: weekdayListLabel(getRestWeekdays(goal)) })}` : ''}
          </p>
          </div>
        </div>
        <div class="header-actions">
          <a class="btn" href="#/edit/${escapeHtml(goal.id)}">${t('수정')}</a>
          <button type="button" class="btn btn-danger" data-action="delete">${t('삭제')}</button>
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
    <div class="tabs" role="tablist" aria-label="${t('계획 기준')}">
      ${['page', 'chapter'].map((b) => `
        <button type="button" role="tab" class="tab ${b === basis ? 'is-active' : ''}" data-basis="${b}">
          ${basisTabLabel(b)}
        </button>`).join('')}
    </div>`;
}

function basisTabLabel(basis) {
  return basis === 'page' ? t('페이지 기준') : t('챕터 기준');
}

function renderPlanPanel(goal, basis) {
  if (detailState.adjust) return renderAdjustPanel(goal, basis);
  const canAdjust = getGoalSummary(goal).isActive;
  return `
    <section class="panel plan-panel">
      <div class="plan-head">
        <h2 class="section-title">${t('계획표')}</h2>
        <div class="plan-controls">
          ${canAdjust ? `<button type="button" class="btn btn-small" data-action="adjust-start" title="${t('날짜별 분량을 직접 정합니다')}">${t('분량 직접 조정')}</button>` : ''}
          <button type="button" class="btn btn-small" data-action="export-image">${t('이미지로 내보내기')}</button>
          <div class="tabs" role="tablist" aria-label="${t('보기 방식')}">
            ${[['list', '목록'], ['calendar', '달력']].map(([v, label]) => `
              <button type="button" role="tab" class="tab ${v === detailState.view ? 'is-active' : ''}" data-view="${v}">${t(label)}</button>`).join('')}
          </div>
          ${renderBasisTabs(goal, basis)}
        </div>
      </div>
      ${detailState.view === 'calendar' ? renderPlanCalendar(goal, basis) : renderPlanTable(goal, basis)}
    </section>
  `;
}

/* ----- 계획 대비 현황 ----- */

/** 위치 표시: 책(페이지 기준)은 페이지 번호 "p.42", 그 외는 개수 "3강" */
function formatPosition(goal, basis, units) {
  if (basis === 'page') return units > 0 ? `p.${unitsToPage(goal.book, units)}` : '-';
  if (basis === 'bible') return formatBiblePosition(goal.bible, units);
  return formatAmount(units, basis);
}

function totalLabel(basis) {
  return basis === 'page' ? t('마지막 페이지') : basis === 'bible' ? t('끝') : t('전체');
}

/** 현황 안내 문구와 색 */
function getCompareMessage(goal, s) {
  const u = (n) => formatAmount(n, s.basis);
  if (s.isComplete) return { tone: 'done', html: t('모두 완료했습니다. 수고하셨어요!') };
  if (s.isOverdue) {
    const amount = u(s.remaining);
    return { tone: 'ended', html: t('마감일이 지났습니다. 남은 <b>{amount}</b>{josa} <b>마감일 변경</b>으로 다시 계획할 수 있어요.', { amount, josa: josa(amount, '은', '는') }) };
  }
  if (s.notStarted) {
    return { tone: 'neutral', html: t('{date}에 시작합니다. 공부하는 날마다 <b>하루 {amount}</b>씩 하면 됩니다.', { date: formatShortDate(goal.startDate), amount: u(s.dailyPlan) }) };
  }
  if (s.remainingStudyDays === 0) {
    const amount = u(s.remaining);
    return { tone: 'behind', html: t('마감일까지 공부하는 날이 남아 있지 않습니다. 남은 <b>{amount}</b>{josa} 하려면 마감일을 변경해 주세요.', { amount, josa: josa(amount, '을', '를') }) };
  }
  const rest = { days: s.remainingStudyDays, need: u(s.needPerDay) };
  if (s.diff < 0) return { tone: 'behind', html: t('계획보다 <b>{amount} 밀렸습니다.</b> 남은 공부일 {days}일 동안 <b>하루 {need}</b>씩 하면 기한을 맞출 수 있어요.', { ...rest, amount: u(-s.diff) }) };
  if (s.diff > 0) return { tone: 'ahead', html: t('계획보다 <b>{amount} 앞서 있어요.</b> 남은 공부일 {days}일 동안 <b>하루 {need}</b>씩이면 충분해요.', { ...rest, amount: u(s.diff) }) };
  if (s.todayRow && s.todayRow.isRestDay) {
    const label = getRestDateLabel(goal, s.todayRow.date);
    return { tone: 'ontrack', html: t('오늘은 쉬는 날이에요{label}. 계획대로 진행 중입니다.', { label: label ? ` (${escapeHtml(label)})` : '' }) };
  }
  if (s.done >= s.target) return { tone: 'ontrack', html: t('오늘 분량을 마쳤어요. 계획대로 진행 중입니다.') };
  return { tone: 'ontrack', html: t('계획대로 진행 중이에요. 오늘 <b>{amount}</b> 남았어요.', { amount: u(s.target - s.done) }) };
}

/** 관리자가 필독서 내용을 바꿨으면 반영 안내 */
function renderRequiredBookNotice(goal) {
  const book = goal.requiredBookId ? requiredBooks.find((b) => b.id === goal.requiredBookId) : null;
  if (!book || !isRequiredBookChanged(goal, book) || detailState.preview) return '';
  return `
    <div class="notice notice-row">
      <span>${t('관리자가 이 필독서의 책 정보(제목·챕터·페이지)를 바꿨습니다. 내 계획에 반영하려면 미리보기를 확인하세요.')}</span>
      <button type="button" class="btn btn-small" data-action="sync-required">${t('반영 미리보기')}</button>
    </div>`;
}

function renderSummaryPanel(goal, s) {
  const { min, max } = getProgressBounds(goal);
  const isBook = goal.type === 'book';
  const cur = goal.progress.current;
  const replanBlocker = getReplanBlocker(goal);
  const previewing = !!detailState.preview;

  return `
    <section class="panel summary-panel">
      ${renderCompareBlock(goal, s)}

      <div class="summary-info">
        <div><span class="info-label">${t('현재 위치')}</span>${escapeHtml(describePosition(goal))}</div>
        <div class="summary-today"><span class="info-label">${t('오늘 할 일')}</span>${renderTodayAmount(goal, s)}</div>
      </div>

      <div class="summary-actions">
        <form class="progress-form ${isBook ? 'is-two-rows' : ''}" data-action="progress" novalidate>
          ${goal.type === 'bible' ? renderBibleProgressInputs(goal) : `
          <label for="progress-input" class="field-label">${isBook ? t('마지막으로 읽은 페이지') : t('완료한 강의 수')}</label>
          <div class="progress-control">
            <input id="progress-input" type="number" class="input input-num" min="${min}" max="${max}" value="${cur}">
            <span class="muted">${isBook ? `(p.${min}~${max})` : t('(0~{max}강)', { max })}</span>
          </div>
          ${isBook ? renderChapterProgressSelect(goal) : ''}`}
          <button type="submit" class="btn btn-primary progress-submit">${t('진도 기록')}</button>
          <span class="progress-error" hidden></span>
        </form>
        <div class="plan-actions">
          <button type="button" class="btn" data-action="replan" ${replanBlocker || previewing ? 'disabled' : ''}
            title="${escapeHtml(replanBlocker || t('오늘부터 마감일까지 남은 분량을 다시 균등하게 나눕니다'))}">${t('재분배')}</button>
          <button type="button" class="btn" data-action="due" ${previewing ? 'disabled' : ''}>${t('마감일 변경')}</button>
        </div>
      </div>
    </section>
  `;
}

/** 책: "또는 완료한 챕터" 선택 — 고르면 그 챕터의 끝 페이지가 페이지 칸에 채워진다 */
function renderChapterProgressSelect(goal) {
  const doneCount = completedChapterCount(goal.book, goal.progress.current);
  return `
    <label for="progress-chapter-select" class="field-label"><span class="muted progress-or">${t('또는')}</span> ${t('완료한 챕터')}</label>
    <select id="progress-chapter-select" class="input chapter-select">
      <option value="0" ${doneCount === 0 ? 'selected' : ''}>${t('없음')}</option>
      ${getChapterRanges(goal.book).map((c, i) => `
        <option value="${i + 1}" ${doneCount === i + 1 ? 'selected' : ''}>${escapeHtml(c.name)} (~p.${c.endPage})</option>`).join('')}
    </select>`;
}

/** 성경 통독 진도 입력: 마지막으로 읽은 권 + 장 */
function renderBibleProgressInputs(goal) {
  const cur = goal.progress.current;
  const pos = cur > 0 ? biblePosition(goal.bible, cur) : null;
  return `
    <label for="progress-book" class="field-label">${t('마지막으로 읽은 곳')}</label>
    <select id="progress-book" class="input bible-select">
      <option value="-1" ${pos ? '' : 'selected'}>${t('아직 안 읽음')}</option>
      ${goal.bible.books.map((b, i) => `<option value="${i}" ${pos && pos.index === i ? 'selected' : ''}>${bibleBookName(b.name)}</option>`).join('')}
    </select>
    <input id="progress-chapter" type="number" class="input input-num" min="1" value="${pos ? pos.chapter : ''}" aria-label="${t('장')}">
    ${t('장까지') ? `<span class="muted">${t('장까지')}</span>` : ''}`;
}

/** 성경 통독 진도 입력값 → 누적 장 수 (오류면 문자열) */
function readBibleProgressInput(goal, form) {
  const bookIndex = Number(form.querySelector('#progress-book').value);
  if (bookIndex < 0) return 0;
  const book = goal.bible.books[bookIndex];
  const chapter = Number(form.querySelector('#progress-chapter').value);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return t('{book}은(는) 1~{n}장입니다.', { book: bibleBookName(book.name), n: book.chapters });
  }
  return bibleUnitsFromPosition(goal.bible, bookIndex, chapter);
}

/** 현재 위치 문구: "p.42까지 읽음 · 완료 챕터 5/23" */
function describePosition(goal) {
  const cur = goal.progress.current;
  if (goal.type === 'book') {
    return `${cur < bookFirstPage(goal.book) ? t('아직 읽지 않음') : t('p.{page}까지 읽음', { page: cur })} · ${
      t('완료 챕터 {done}/{total}', { done: completedChapterCount(goal.book, cur), total: goal.book.chapters.length })}`;
  }
  if (goal.type === 'bible') {
    return cur === 0 ? t('아직 읽지 않음')
      : `${t('{pos}까지 읽음', { pos: formatBiblePosition(goal.bible, cur) })} · ${formatFraction(cur, bibleTotalChapters(goal.bible), 'bible')}`;
  }
  return cur === 0 ? t('아직 듣지 않음') : t('{n}강까지 완료', { n: cur });
}

/** 계획 대비 현황: 숫자 상자 4개 + 진행 막대 + 안내 문구 (내 화면·관리자 화면 공용) */
function renderCompareBlock(goal, s) {
  const targetPercent = s.total > 0 ? Math.min(100, (s.target / s.total) * 100) : 0;
  const donePercent = s.total > 0 ? Math.min(100, (s.done / s.total) * 100) : 0;
  const msg = getCompareMessage(goal, s);
  return `
      <div class="summary-top">
        <h2 class="section-title">${t('계획 대비 현황')}</h2>
        ${renderStatusBadge(s)}
      </div>

      <div class="stat-boxes">
        <div class="stat-box"><strong>${formatAmount(s.dailyPlan, s.basis)}</strong><span>${t('하루 권장')}</span></div>
        <div class="stat-box"><strong>${formatPosition(goal, s.basis, s.target)}</strong><span>${t('오늘까지 권장')}</span></div>
        <div class="stat-box"><strong>${formatPosition(goal, s.basis, s.done)}</strong><span>${t('실제 완료')}</span></div>
        <div class="stat-box"><strong>${formatPosition(goal, s.basis, s.total)}</strong><span>${totalLabel(s.basis)}</span></div>
      </div>

      <div class="compare-bar" role="img"
        aria-label="${t('실제 진도 {done}%, 오늘까지 권장 {target}%', { done: s.percent, target: Math.round(targetPercent) })}">
        <div class="compare-fill" style="width:${donePercent}%"></div>
        <div class="compare-marker" style="left:${targetPercent}%"></div>
      </div>
      <div class="compare-legend">
        <span><i class="legend-fill"></i>${t('초록 = 실제 진도 {n}%', { n: s.percent })}</span>
        <span><i class="legend-marker"></i>${t('검정 선 = 오늘까지 권장 {n}%', { n: Math.floor(targetPercent) })}</span>
      </div>

      <div class="compare-message tone-${msg.tone}">${msg.html}</div>`;
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
  if (goal.title !== input.title.trim()) changes.push(t('이름'));
  if (goal.startDate !== input.startDate) changes.push(t('시작일'));
  if (goal.dueDate !== input.dueDate) changes.push(t('마감일({from} → {to})', { from: goal.dueDate, to: input.dueDate }));
  if (getRestWeekdays(goal).join() !== normalizeWeekdays(input.restWeekdays).join()) changes.push(t('쉬는 요일'));
  if (isRestDatesChanged(goal, input)) changes.push(t('쉬는 날||label'));
  if (isExtraDatesChanged(goal, input)) changes.push(t('여유 있는 날'));
  if (goal.type === 'book') {
    if (isBookStructureChanged(goal, input)) changes.push(t('챕터·페이지'));
    if (getBookAuthor(goal) !== (input.author || '').trim()) changes.push(t('저자'));
  } else if (goal.type === 'bible') {
    if (isBibleRangeChanged(goal, input)) changes.push(t('통독 범위({range})', { range: bibleRangeLabel(Number(input.bibleStart), Number(input.bibleEnd)) }));
  } else if (JSON.stringify(goal.lecture.titles) !== JSON.stringify(input.titles)) {
    changes.push(t('강의 목록({from}개 → {to}개)', { from: goal.lecture.titles.length, to: input.titles.length }));
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
    body = `<p class="preview-hint">${t('새 마감일을 고르면 바뀐 계획을 여기에 보여드립니다.')}</p>`;
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
  const title = t({ replan: '재분배 미리보기', due: '마감일 변경 미리보기', edit: '수정 내용 미리보기' }[preview.kind]);
  const { body, canApply } = renderPreviewContent(goal, basis);

  return `
    <section class="panel plan-panel is-preview">
      <div class="plan-head">
        <h2 class="section-title">${title} <span class="badge badge-waiting">${t('적용 전')}</span></h2>
        ${renderBasisTabs(goal, basis)}
      </div>

      ${preview.kind === 'due' ? `
        <div class="due-picker">
          <label class="field-label" for="preview-due">${t('새 마감일')}</label>
          <input id="preview-due" type="date" class="input" value="${escapeHtml(preview.dueDate)}" min="${today}">
          <span class="muted">${t('현재 마감일 {date}', { date: goal.dueDate })}</span>
        </div>` : ''}

      <div id="preview-body">${body}</div>

      <div class="preview-actions">
        ${preview.kind === 'edit' ? `<button type="button" class="btn" data-action="preview-back">${t('수정으로 돌아가기')}</button>` : ''}
        <button type="button" class="btn" data-action="preview-cancel">${t('취소')}</button>
        <button type="button" class="btn btn-primary" data-action="preview-apply" ${canApply ? '' : 'disabled'}>${t('적용')}</button>
      </div>
    </section>
  `;
}

function renderPreviewBody(goal, clone, basis, preview, today) {
  const newPlan = getActivePlan(clone, basis);
  const oldPlan = getActivePlan(goal, basis);
  const rows = buildSchedule(newPlan);
  const studyDays = countStudyDays(newPlan.startDate, newPlan.endDate, newPlan.restWeekdays, newPlan.restDates);
  const avg = studyDays > 0 ? (newPlan.to - newPlan.from) / studyDays : 0;
  const lo = Math.floor(avg);
  const hi = Math.ceil(avg);
  const oldStudyDays = Math.max(1, countStudyDays(oldPlan.startDate, oldPlan.endDate, oldPlan.restWeekdays, oldPlan.restDates));
  const oldAvg = Math.round((oldPlan.to - oldPlan.from) / oldStudyDays);
  const rebuilt = !clone.plans[basis].current; // 시작 전이라 원래 계획을 새로 만든 경우

  const lines = [];
  if (preview.kind === 'edit') lines.push(t('바뀌는 항목: {items}', { items: describeEditChanges(goal, preview.input).join(', ') }));
  if (preview.kind === 'due') lines.push(t('마감일 {from} → <b>{to}</b>', { from: goal.dueDate, to: preview.dueDate }));
  const remainingAmount = formatAmount(newPlan.to - newPlan.from, basis);
  lines.push(t('남은 <b>{amount}</b>{josa} {from}부터 {to}까지 공부하는 날 <b>{days}일</b>에 나눕니다.', {
    amount: remainingAmount, josa: josa(remainingAmount, '을', '를'),
    from: formatShortDate(newPlan.startDate), to: formatShortDate(newPlan.endDate), days: studyDays,
  }));
  lines.push(t('하루 <b>{range}</b> <span class="muted">(지금 계획: 하루 평균 {old})</span>', {
    range: formatAmountRange(lo, hi, basis), old: formatAmount(oldAvg, basis),
  }));
  lines.push(`<span class="muted">${rebuilt
    ? t('아직 시작 전이라 원래 계획을 새로 만듭니다.')
    : t('원래 계획은 그대로 보관되어 계획표에서 비교할 수 있습니다.')}</span>`);

  const body = rows.map((row) => {
    const dayDiff = diffDays(today, row.date);
    const classes = [dayDiff === 0 ? 'is-today' : '', row.isRestDay ? 'is-rest-day' : ''].filter(Boolean).join(' ');
    return `
      <tr class="${classes}">
        <td class="col-date">${row.date}${dayDiff === 0 ? ` <span class="today-tag">${t('오늘')}</span>` : ''}</td>
        <td class="col-weekday">${weekdayLabel(row.date)}</td>
        <td class="col-content">${describeRowContent(clone, basis, row)}</td>
        <td class="col-amount">${renderAmountCell(basis, row)}</td>
        <td class="col-cum"><strong>${formatCumulative(clone, basis, row.cumulative)}</strong></td>
        <td class="col-cum col-original">${formatCumulative(goal, basis, cumulativeOnDate(oldPlan, row.date))}</td>
      </tr>`;
  }).join('');

  return `
    <div class="preview-summary">${lines.map((l) => `<p>${l}</p>`).join('')}</div>
    <table class="plan-table">
      <thead>
        <tr>
          <th class="col-date">${t('날짜')}</th>
          <th class="col-weekday">${t('요일')}</th>
          <th>${goal.type === 'lecture' ? t('들을 강의') : t('읽을 내용')}</th>
          <th class="col-amount">${t('분량')}</th>
          <th class="col-cum">${t('새 누적 목표')}</th>
          <th class="col-cum">${t('지금 계획 누적')}</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

/** 계획표의 "오늘 분량" 칸 내용 */
function describeRowContent(goal, basis, row) {
  if (row.isRestDay) return `<span class="rest">${escapeHtml(restText(goal, row.date))}</span>`;
  if (row.amount === 0) return `<span class="rest">${t('휴식(분량 없음)')}</span>`;
  const from = row.prevCumulative;
  const to = row.cumulative;

  if (basis === 'page') {
    const a = unitsToPage(goal.book, from + 1);
    const b = unitsToPage(goal.book, to);
    return `<strong>${a === b ? `p.${a}` : `p.${a}~${b}`}</strong>
      <span class="muted">· ${escapeHtml(describeChaptersForPages(goal.book, a, b))}</span>`;
  }
  if (basis === 'bible') return `<strong>${escapeHtml(describeBibleRange(goal.bible, from, to))}</strong>`;
  if (basis === 'chapter') {
    return getChapterRanges(goal.book).slice(from, to)
      .map((c) => `<div>${escapeHtml(c.name)} <span class="muted">(p.${Number(c.startPage)}~${Number(c.endPage)})</span></div>`)
      .join('');
  }
  return goal.lecture.titles.slice(from, to)
    .map((title, i) => `<div><strong>${lectureLabel(from + i + 1)}</strong> ${escapeHtml(title)}</div>`)
    .join('');
}

/** 누적 값 표시 (페이지는 도달해야 할 페이지 번호로) */
function formatCumulative(goal, basis, units) {
  if (basis === 'page') return units === 0 ? '-' : `p.${unitsToPage(goal.book, units)}`;
  if (basis === 'chapter') return formatAmount(units, 'chapter');
  if (basis === 'bible') return formatBiblePosition(goal.bible, units);
  return formatAmount(units, 'lecture');
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

/** 그날 분량 칸: 예) 35페이지 */
function renderAmountCell(basis, row) {
  const tags = `${row.weight > 1 ? `<span class="amount-tag tag-extra">${t('여유 ×{w}', { w: row.weight })}</span>` : ''}${
    row.isFixed ? `<span class="amount-tag tag-fixed">${t('직접')}</span>` : ''}`;
  return row.amount === 0
    ? `<span class="muted">-</span>${tags}`
    : `<strong>${formatAmount(row.amount, basis)}</strong>${tags}`;
}

/* ----- 분량 직접 조정 (계획표에서 날짜별 분량을 고침) ----- */

/**
 * 직접 조정 결과 계획
 *  - 지난 날은 지금 분량 그대로 고정 (과거 계획이 바뀌지 않게)
 *  - edits: { 날짜: '숫자' | '' }  빈 값이면 자동으로 되돌림
 *  → { plan, errors }
 */
function computeAdjustedPlan(goal, basis, edits, today = todayStr()) {
  const active = getActivePlan(goal, basis);
  const rows = buildSchedule(active);
  const fixed = { ...(active.fixed || {}) };
  rows.forEach((r) => {
    if (diffDays(today, r.date) < 0 && !r.isRestDay) fixed[r.date] = r.amount;
  });
  const errors = [];
  Object.entries(edits).forEach(([date, raw]) => {
    if (raw === '' || raw === null) { delete fixed[date]; return; }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) errors.push(t('{date}: 0 이상의 정수를 입력하세요.', { date: formatShortDate(date) }));
    else fixed[date] = n;
  });
  const N = active.to - active.from;
  const studyRows = rows.filter((r) => !r.isRestDay);
  const fixedSum = studyRows.reduce((sum, r) => sum + (fixed[r.date] || 0), 0);
  const autoCount = studyRows.filter((r) => fixed[r.date] === undefined).length;
  if (!errors.length && fixedSum > N) {
    errors.push(t('직접 정한 분량의 합({sum})이 이 계획의 전체 분량({total})보다 많습니다.',
      { sum: formatAmount(fixedSum, basis), total: formatAmount(N, basis) }));
  } else if (!errors.length && autoCount === 0 && fixedSum !== N) {
    errors.push(t('모든 날을 직접 정했다면 합이 {total}이어야 합니다. (지금 {sum})',
      { sum: formatAmount(fixedSum, basis), total: formatAmount(N, basis) }));
  }
  return { plan: { ...active, fixed, createdAt: new Date().toISOString() }, errors };
}

function renderAdjustPanel(goal, basis) {
  const today = todayStr();
  const adjust = detailState.adjust;
  const { plan, errors } = computeAdjustedPlan(goal, basis, adjust.edits, today);
  const shown = structuredClone(goal);
  shown.plans[basis].current = errors.length ? getActivePlan(goal, basis) : plan;
  const active = getActivePlan(goal, basis);
  const rows = buildTimeline(shown, basis);
  const unit = getUnitLabel(basis);

  const body = rows.map((row) => {
    const dayDiff = diffDays(today, row.date);
    const editable = !row.isPreReplan && dayDiff >= 0 && !row.isRestDay
      && diffDays(active.startDate, row.date) >= 0 && diffDays(row.date, active.endDate) >= 0;
    const edited = adjust.edits[row.date] !== undefined && adjust.edits[row.date] !== '';
    const classes = [dayDiff === 0 ? 'is-today' : '', row.isRestDay ? 'is-rest-day' : '', dayDiff < 0 ? 'is-past' : '']
      .filter(Boolean).join(' ');
    return `
      <tr class="${classes}">
        <td class="col-date">${row.date}${dayDiff === 0 ? ` <span class="today-tag">${t('오늘')}</span>` : ''}</td>
        <td class="col-weekday">${weekdayLabel(row.date)}</td>
        <td class="col-content">${describeRowContent(shown, basis, row)}</td>
        <td class="col-adjust">
          ${editable ? `
            <input type="number" min="0" class="input adjust-input ${row.isFixed ? 'is-fixed' : ''}" data-date="${row.date}"
              value="${edited ? escapeHtml(adjust.edits[row.date]) : row.amount}" aria-label="${t('{date} 분량', { date: row.date })}">
            <span class="muted">${unit}</span>
            ${row.isFixed ? `<button type="button" class="btn-icon adjust-reset" data-reset-date="${row.date}" title="${t('자동으로 되돌리기')}">↺</button>` : ''}
            ${row.weight > 1 && !row.isFixed ? `<span class="amount-tag tag-extra">${t('여유 ×{w}', { w: row.weight })}</span>` : ''}`
            : renderAmountCell(basis, row)}
        </td>
        <td class="col-cum">${formatCumulative(shown, basis, row.cumulative)}</td>
      </tr>`;
  }).join('');

  return `
    <section class="panel plan-panel is-preview">
      <div class="plan-head">
        <h2 class="section-title">${t('분량 직접 조정')} <span class="badge badge-waiting">${t('적용 전')}</span></h2>
        ${renderBasisTabs(goal, basis)}
      </div>
      <div class="preview-summary">
        <p>${t('오늘부터 날짜별 <b>분량</b> 칸의 숫자를 바꾸면, 나머지 날에 남은 분량이 자동으로 다시 나뉩니다.')}</p>
        <p class="muted">${t('직접 정한 날은 <span class="amount-tag tag-fixed">직접</span>으로 표시되고, ↺를 누르면 자동으로 돌아갑니다. 지난 날은 바뀌지 않습니다.')}</p>
      </div>
      ${errors.length ? `<div class="errors"><ul>${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>` : ''}
      <table class="plan-table">
        <thead>
          <tr>
            <th class="col-date">${t('날짜')}</th><th class="col-weekday">${t('요일')}</th>
            <th>${goal.type === 'lecture' ? t('들을 강의') : t('읽을 내용')}</th>
            <th class="col-adjust">${t('분량')}</th><th class="col-cum">${t('누적 목표')}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
      <div class="preview-actions">
        <button type="button" class="btn" data-action="adjust-cancel">${t('취소')}</button>
        <button type="button" class="btn btn-primary" data-action="adjust-apply" ${errors.length ? 'disabled' : ''}>${t('적용')}</button>
      </div>
    </section>`;
}

function renderPlanTable(goal, basis, readOnly = false) {
  const today = todayStr();
  const rows = buildTimeline(goal, basis);
  const replanned = !!goal.plans[basis].current;
  const done = getDoneUnits(goal, basis);

  const body = rows.map((row) => {
    const { dayDiff, checked, classes } = getRowState(row, done, today, replanned);

    return `
      <tr class="${classes}">
        <td class="col-date">${row.date}${dayDiff === 0 ? ` <span class="today-tag">${t('오늘')}</span>` : ''}</td>
        <td class="col-weekday">${weekdayLabel(row.date)}</td>
        <td class="col-content">${describeRowContent(goal, basis, row)}</td>
        <td class="col-amount">${renderAmountCell(basis, row)}</td>
        <td class="col-cum">${formatCumulative(goal, basis, row.cumulative)}</td>
        <td class="col-check">
          ${row.amount === 0 ? '<span class="muted">-</span>'
            : readOnly ? (checked ? '<span class="check-mark">✓</span>' : '')
            : `<input type="checkbox" class="row-check" data-date="${row.date}" ${checked ? 'checked' : ''}
                aria-label="${t('{date} 완료', { date: row.date })}">`}
        </td>
      </tr>`;
  }).join('');

  return `
    <table class="plan-table">
      <thead>
        <tr>
          <th class="col-date">${t('날짜')}</th>
          <th class="col-weekday">${t('요일')}</th>
          <th>${goal.type === 'lecture' ? t('들을 강의') : t('읽을 내용')}</th>
          <th class="col-amount">${t('분량')}</th>
          <th class="col-cum">${t('누적 목표')}</th>
          <th class="col-check">${t('완료')}</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

/** 달력 칸에 들어갈 짧은 내용 */
function describeCellContent(goal, basis, row) {
  if (row.isRestDay) return `<span class="rest">${escapeHtml(restText(goal, row.date))}</span>`;
  if (row.amount === 0) return `<span class="rest">${t('휴식')}</span>`;
  const from = row.prevCumulative;
  const to = row.cumulative;
  if (basis === 'page') {
    const a = unitsToPage(goal.book, from + 1);
    const b = unitsToPage(goal.book, to);
    return `<strong>${a === b ? `p.${a}` : `p.${a}~${b}`}</strong>
      <span class="cell-sub">${escapeHtml(describeChaptersForPages(goal.book, a, b))}</span>`;
  }
  if (basis === 'bible') {
    return `<strong>${escapeHtml(describeBibleRange(goal.bible, from, to))}</strong>
      <span class="cell-sub">${formatAmount(row.amount, 'bible')}${row.weight > 1 ? ` · ${t('여유 ×{w}', { w: row.weight })}` : ''}${row.isFixed ? ` · ${t('직접')}` : ''}</span>`;
  }
  const items = basis === 'chapter'
    ? getChapterRanges(goal.book).slice(from, to).map((c) => escapeHtml(c.name))
    : goal.lecture.titles.slice(from, to).map((title, i) => `<strong>${lectureLabel(from + i + 1)}</strong> ${escapeHtml(title)}`);
  const shown = items.slice(0, 3).map((x) => `<span class="cell-line">${x}</span>`).join('');
  return items.length > 3 ? `${shown}<span class="cell-sub">${t('외 {n}개', { n: items.length - 3 })}</span>` : shown;
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
    const tm = monthKey(today);
    detailState.month = tm < firstMonth ? firstMonth : tm > lastMonth ? lastMonth : tm;
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
          <span class="cal-day ${dowClass}">${d}${dayDiff === 0 ? ` <span class="today-tag">${t('오늘')}</span>` : ''}</span>
          ${row.amount === 0 ? ''
            : `<input type="checkbox" class="row-check" data-date="${date}" ${checked ? 'checked' : ''} aria-label="${t('{date} 완료', { date })}">`}
        </div>
        <div class="cal-content">${describeCellContent(goal, basis, row)}</div>
      </div>`);
  }
  while (cells.length % 7 !== 0) cells.push('<div class="cal-cell is-empty"></div>');

  return `
    <div class="calendar">
      <div class="cal-nav">
        <button type="button" class="btn btn-small" data-month="-1" ${month <= firstMonth ? 'disabled' : ''} aria-label="${t('이전 달')}">◀</button>
        <strong class="cal-title">${t('{y}년 {m}월', { y, m })}</strong>
        <button type="button" class="btn btn-small" data-month="1" ${month >= lastMonth ? 'disabled' : ''} aria-label="${t('다음 달')}">▶</button>
      </div>
      <div class="cal-grid">
        ${WEEKDAY_ORDER.map((d) => `<div class="cal-weekday ${d === 0 ? 'is-sun' : d === 6 ? 'is-sat' : ''}">${weekdayName(d)}</div>`).join('')}
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
      if (detailState.adjust && detailState.basis !== tab.dataset.basis) detailState.adjust.edits = {};
      detailState.basis = tab.dataset.basis;
      rerenderDetail(goal);
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'adjust-start') {
      detailState.adjust = { edits: {} };
      rerenderDetail(goal);
      return;
    }
    if (action === 'adjust-cancel') {
      detailState.adjust = null;
      rerenderDetail(goal);
      return;
    }
    if (action === 'adjust-apply') {
      const { plan, errors } = computeAdjustedPlan(goal, detailState.basis, detailState.adjust.edits);
      if (errors.length) return;
      goal.plans[detailState.basis].current = plan;
      goal.updatedAt = new Date().toISOString();
      commit();
      detailState.adjust = null;
      rerenderDetail(goal);
      return;
    }
    const resetBtn = e.target.closest('[data-reset-date]');
    if (resetBtn && detailState.adjust) {
      detailState.adjust.edits[resetBtn.dataset.resetDate] = '';
      rerenderDetail(goal);
      return;
    }
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
      if (confirm(t("'{title}' 목표를 삭제할까요?\n진도 기록과 계획이 모두 지워지며 되돌릴 수 없습니다.", { title: goal.title }))) {
        removeGoal(appData, goal.id);
        commit();
        navigate('#/');
      }
    }
  });

  // 진도 입력: 챕터를 고르면 페이지 칸을, 페이지를 적으면 챕터 칸을 맞춘다
  const pageInput = container.querySelector('#progress-input');
  const chapterSelect = container.querySelector('#progress-chapter-select');
  if (pageInput && chapterSelect) {
    chapterSelect.addEventListener('change', () => {
      pageInput.value = chapterCountToPage(goal.book, Number(chapterSelect.value));
    });
    pageInput.addEventListener('input', () => {
      const page = Number(pageInput.value);
      if (Number.isInteger(page)) chapterSelect.value = String(completedChapterCount(goal.book, page));
    });
  }

  // 방식 2: 계획표 체크박스 (+ 마감일 변경 미리보기의 날짜 선택)
  container.addEventListener('change', (e) => {
    if (e.target.classList.contains('adjust-input') && detailState.adjust) {
      const date = e.target.dataset.date;
      detailState.adjust.edits[date] = e.target.value.trim();
      rerenderDetail(goal);
      // 다음 칸으로 바로 이어서 입력할 수 있게 포커스 유지
      const inputs = [...document.querySelectorAll('.adjust-input')];
      const idx = inputs.findIndex((el) => el.dataset.date === date);
      if (idx >= 0) inputs[idx].focus();
      return;
    }
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
    const errorBox = e.target.querySelector('.progress-error');
    if (goal.type === 'bible') {
      const units = readBibleProgressInput(goal, e.target);
      if (typeof units === 'string') {
        errorBox.textContent = units;
        errorBox.hidden = false;
        return;
      }
      setProgress(goal, units);
      commit();
      rerenderDetail(goal);
      return;
    }
    const input = e.target.querySelector('#progress-input');
    const { min, max } = getProgressBounds(goal);
    const value = Number(input.value);
    if (input.value === '' || !Number.isInteger(value) || value < min || value > max) {
      errorBox.textContent = t('{min}~{max} 사이의 정수를 입력하세요.', { min, max });
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
  goals: [], // [{ userId, goal }] 모든 회원의 목표
  viewBasis: null, // 회원 계획 보기에서 선택한 기준 (책: page/chapter)
  editingBookId: null, // null | 'new' | 책 id
  cover: null, // 편집 중인 표지 { file?, previewUrl, removed? }
};

const ADMIN_TABS = [
  ['progress', '진도 현황'],
  ['plans', '회원 계획'],
  ['books', '사역자 필독서'],
  ['members', '회원 관리'],
];

async function loadAdminData() {
  adminState.loading = true;
  adminState.error = null;
  try {
    const [profiles, books, goals] = await Promise.all([
      adminLoadProfiles(), loadRequiredBooks(), adminLoadAllGoals(),
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

function renderAdmin(root, tab, route = {}) {
  if (tab !== 'member' && !ADMIN_TABS.some(([key]) => key === tab)) tab = 'progress';
  let body;
  if (adminState.error) {
    body = `<div class="errors">${t('불러오지 못했습니다: {message}', { message: escapeHtml(adminState.error) })}</div>`;
  } else if (!adminState.loaded) {
    body = `<div class="empty">${t('불러오는 중…')}</div>`;
    if (!adminState.loading) loadAdminData();
  } else if (tab === 'books') {
    body = renderAdminBooks();
  } else if (tab === 'members') {
    body = renderAdminMembers();
  } else if (tab === 'plans') {
    body = renderAdminPlans();
  } else if (tab === 'member') {
    body = renderAdminMemberGoal(route.userId, route.goalId);
  } else {
    body = renderAdminProgress();
  }

  root.innerHTML = `
    <div id="admin">
      <header class="page-header">
        <div>
          <a class="back-link" href="#/">← ${t('내 계획')}</a>
          <h1>${t('관리자')}</h1>
        </div>
        <div class="header-actions">
          <button type="button" class="btn" data-action="admin-refresh" ${adminState.loading ? 'disabled' : ''}>${t('새로고침')}</button>
        </div>
      </header>
      <nav class="tabs admin-tabs" aria-label="${t('관리자 메뉴')}">
        ${ADMIN_TABS.map(([key, label]) => `<a class="tab ${key === tab || (tab === 'member' && key === 'plans') ? 'is-active' : ''}" href="#/admin/${key}">${t(label)}</a>`).join('')}
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
  if (!requiredBooks.length) return `<div class="empty">${t('아직 필독서가 없습니다. <a href="#/admin/books">사역자 필독서</a>에서 추가하세요.')}</div>`;
  if (!team.length) return `<div class="empty">${t('우리 팀으로 지정된 사람이 없습니다. <a href="#/admin/members">회원 관리</a>에서 지정하세요.')}</div>`;
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
          <span class="muted">${t('계획 세운 사람 {planned}/{total}명', { planned, total: team.length })}${behind ? ` · <b class="text-danger">${t('밀림 {n}명', { n: behind })}</b>` : ''}</span>
        </div>
        <table class="admin-table">
          <thead>
            <tr><th>${t('이름')}</th><th>${t('기간')}</th><th class="num">${t('오늘까지 권장')}</th><th class="num">${t('실제 완료')}</th><th class="num">${t('끝')}</th><th class="col-bar">${t('진도')}</th><th>${t('상태')}</th></tr>
          </thead>
          <tbody>
            ${rows.map(({ p, goal, s }) => {
              if (!goal) {
                return `<tr class="is-empty"><td>${escapeHtml(profileName(p))}</td><td colspan="5" class="muted">${t('아직 계획을 세우지 않았습니다')}</td><td><span class="badge badge-waiting">${t('계획 없음')}</span></td></tr>`;
              }
              const targetPct = s.total ? Math.min(100, (s.target / s.total) * 100) : 0;
              const donePct = s.total ? Math.min(100, (s.done / s.total) * 100) : 0;
              return `
                <tr>
                  <td><a class="member-link" href="#/admin/member/${escapeHtml(p.user_id)}/${escapeHtml(goal.id)}">${escapeHtml(profileName(p))}</a></td>
                  <td class="muted">${formatShortDate(goal.startDate)} ~ ${formatShortDate(goal.dueDate)} · ${formatDday(s.dday)}</td>
                  <td class="num">${formatPosition(goal, s.basis, s.target)}</td>
                  <td class="num">${formatPosition(goal, s.basis, s.done)}</td>
                  <td class="num">${formatPosition(goal, s.basis, s.total)}</td>
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
  }).join('') + `<p class="muted admin-legend">${t('진도 막대: 초록 = 실제 진도, 검정 선 = 오늘까지 권장 · 각자 정한 기간 기준입니다.')}</p>`;
}

/* ----- 회원 계획 (개인 목표 포함, 읽기 전용) ----- */

function renderAdminPlans() {
  const today = todayStr();
  const byUser = new Map();
  adminState.goals.forEach(({ userId, goal }) => {
    if (!byUser.has(userId)) byUser.set(userId, []);
    byUser.get(userId).push(goal);
  });
  const withGoals = adminState.profiles.filter((p) => byUser.has(p.user_id));
  const withoutGoals = adminState.profiles.filter((p) => !byUser.has(p.user_id));
  if (!withGoals.length) return `<div class="empty">${t('아직 목표를 만든 회원이 없습니다.')}</div>`;

  const sections = withGoals.map((p) => {
    const items = byUser.get(p.user_id)
      .map((goal) => ({ goal, s: getGoalSummary(goal, undefined, today) }))
      .sort((a, b) => (a.s.isActive === b.s.isActive ? diffDays(b.goal.dueDate, a.goal.dueDate) : a.s.isActive ? -1 : 1));
    return `
      <section class="panel admin-book">
        <div class="admin-book-head">
          <div>
            <h2 class="section-title">${escapeHtml(profileName(p))} ${p.in_team ? `<span class="type-tag type-required">${t('우리 팀')}</span>` : ''}</h2>
            <span class="muted">${escapeHtml(p.email)}</span>
          </div>
          <span class="muted">${t('목표 {n}개 · 진행 중 {active}개', { n: items.length, active: items.filter((x) => x.s.isActive).length })}</span>
        </div>
        <table class="admin-table">
          <thead>
            <tr><th>${t('목표')}</th><th>${t('기간')}</th><th class="num">${t('오늘까지 권장')}</th><th class="num">${t('실제 완료')}</th><th class="num">${t('끝')}</th><th class="col-bar">${t('진도')}</th><th>${t('상태')}</th></tr>
          </thead>
          <tbody>
            ${items.map(({ goal, s }) => renderAdminGoalRow(p, goal, s)).join('')}
          </tbody>
        </table>
      </section>`;
  }).join('');

  return `
    <p class="muted admin-intro">${t('회원들이 만든 모든 목표입니다. 목표를 누르면 날짜별 계획표를 볼 수 있습니다. (읽기 전용)')}</p>
    ${sections}
    ${withoutGoals.length ? `<p class="muted admin-legend">${t('목표가 없는 회원: {names}', { names: withoutGoals.map((p) => escapeHtml(profileName(p))).join(', ') })}</p>` : ''}`;
}

function renderAdminGoalRow(p, goal, s) {
  const targetPct = s.total ? Math.min(100, (s.target / s.total) * 100) : 0;
  const donePct = s.total ? Math.min(100, (s.done / s.total) * 100) : 0;
  const book = goal.requiredBookId ? requiredBooks.find((b) => b.id === goal.requiredBookId) : null;
  return `
    <tr class="${s.isActive ? '' : 'is-finished-row'}">
      <td>
        <a class="member-link" href="#/admin/member/${escapeHtml(p.user_id)}/${escapeHtml(goal.id)}">${escapeHtml(goal.title)}</a>
        <div class="muted small">${book ? t('필독서') : typeLabel(goal.type)}${getBookAuthor(goal) ? ` · ${escapeHtml(getBookAuthor(goal))}` : ''}</div>
      </td>
      <td class="muted">${formatShortDate(goal.startDate)} ~ ${formatShortDate(goal.dueDate)} · ${formatDday(s.dday)}</td>
      <td class="num">${formatPosition(goal, s.basis, s.target)}</td>
      <td class="num">${formatPosition(goal, s.basis, s.done)}</td>
      <td class="num">${formatPosition(goal, s.basis, s.total)}</td>
      <td class="col-bar">
        <div class="mini-bar"><div class="compare-fill" style="width:${donePct}%"></div><div class="compare-marker" style="left:${targetPct}%"></div></div>
        <span class="mini-pct">${s.percent}%</span>
      </td>
      <td>${renderStatusBadge(s)}</td>
    </tr>`;
}

/** 회원 한 사람의 목표 상세 (읽기 전용) */
function renderAdminMemberGoal(userId, goalId) {
  const entry = adminState.goals.find((x) => x.userId === userId && x.goal.id === goalId);
  const p = adminState.profiles.find((x) => x.user_id === userId);
  if (!entry || !p) return `<div class="empty">${t('목표를 찾을 수 없습니다. <a href="#/admin/plans">회원 계획</a>으로 돌아가세요.')}</div>`;
  const goal = entry.goal;
  const bases = getBases(goal);
  if (!bases.includes(adminState.viewBasis)) adminState.viewBasis = getPrimaryBasis(goal);
  const basis = adminState.viewBasis;
  const s = getGoalSummary(goal);
  const rest = getRestWeekdays(goal);

  return `
    <a class="back-link" href="#/admin/plans">← ${t('회원 계획')}</a>
    <div class="member-goal-head">
      ${renderCoverThumb(getCoverUrl(goal), 'lg')}
      <div>
        <p class="muted">${t('{name}님의 계획', { name: escapeHtml(profileName(p)) })}</p>
        <h2 class="member-goal-title">${escapeHtml(goal.title)}</h2>
        ${getBookAuthor(goal) ? `<p class="detail-author">${t('{author} 지음', { author: escapeHtml(getBookAuthor(goal)) })}</p>` : ''}
        <p class="muted">${goal.startDate} ~ ${goal.dueDate} · ${formatDday(s.dday)}${rest.length ? ` · ${t('쉬는 요일 {days}', { days: weekdayListLabel(rest) })}` : ''}</p>
      </div>
    </div>

    <section class="panel summary-panel">
      ${renderCompareBlock(goal, s)}
      <div class="summary-info">
        <div><span class="info-label">${t('현재 위치')}</span>${escapeHtml(describePosition(goal))}</div>
        <div class="summary-today"><span class="info-label">${t('오늘 할 일')}</span>${renderTodayAmount(goal, s)}</div>
      </div>
    </section>

    <section class="panel plan-panel">
      <div class="plan-head">
        <h2 class="section-title">${t('계획표')} <span class="badge badge-waiting">${t('읽기 전용')}</span></h2>
        ${bases.length > 1 ? `
          <div class="tabs" role="tablist">
            ${bases.map((b) => `<button type="button" role="tab" class="tab ${b === basis ? 'is-active' : ''}" data-action="admin-basis" data-basis="${b}">${basisTabLabel(b)}</button>`).join('')}
          </div>` : ''}
      </div>
      ${renderPlanTable(goal, basis, true)}
    </section>`;
}

/* ----- 사역자 필독서 ----- */

function renderAdminBooks() {
  const team = adminState.profiles.filter((p) => p.in_team);
  const editing = adminState.editingBookId;
  const book = editing && editing !== 'new' ? requiredBooks.find((b) => b.id === editing) : null;

  const editor = editing ? `
    <form id="book-form" class="panel admin-editor" novalidate>
      <h2 class="section-title">${book ? t('필독서 수정') : t('필독서 추가')}</h2>
      ${book ? `<p class="notice">${t('저장하면 이미 계획을 세운 팀원에게 "내용 변경됨"이 표시되고, 각자 미리보기를 확인한 뒤 자기 계획에 반영합니다.')}</p>` : ''}
      <div class="book-form-top">
        <div class="cover-picker">
          <div class="cover-preview" id="cover-preview">${renderCoverPreview(book)}</div>
          <label class="btn btn-small">${t('표지 이미지 선택')}
            <input type="file" id="cover-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
          </label>
          <button type="button" class="btn btn-small" data-action="cover-remove">${t('표지 빼기')}</button>
          <span class="field-hint">${t('JPG·PNG·WEBP, 3MB 이하')}</span>
        </div>
        <div class="book-form-fields">
          <div class="field">
            <label class="field-label" for="f-title">${t('책 제목')}</label>
            <input id="f-title" type="text" class="input input-wide" value="${escapeHtml(book ? book.title : '')}">
          </div>
          <div class="field">
            <label class="field-label" for="f-author">${t('저자')} <span class="muted">${t('(선택)')}</span></label>
            <input id="f-author" type="text" class="input input-wide" value="${escapeHtml(book ? book.author : '')}">
          </div>
        </div>
      </div>
      ${renderChapterEditorHtml(book ? book.lastPage : '')}
      <div id="form-errors" class="errors" hidden></div>
      <div class="form-actions">
        <button type="button" class="btn" data-action="book-cancel">${t('취소')}</button>
        <button type="submit" class="btn btn-primary">${t('저장')}</button>
      </div>
    </form>` : '';

  const list = requiredBooks.length ? `
    <table class="admin-table panel-table">
      <thead><tr><th>${t('책 제목')}</th><th class="num">${t('챕터')}</th><th class="num">${t('페이지')}</th><th class="num">${t('계획 세운 팀원')}</th><th></th></tr></thead>
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
              <td class="num">${t('{n}개', { n: b.chapters.length })}</td>
              <td class="num">${formatAmount(b.lastPage - b.chapters[0].startPage + 1, 'page')}</td>
              <td class="num">${t('{planned}/{total}명', { planned, total: team.length })}</td>
              <td class="row-actions">
                ${(() => {
                  const mine = findGoalForBook(appData.goals, b.id);
                  return mine
                    ? `<a class="btn btn-small" href="#/goal/${escapeHtml(mine.id)}">${t('내 계획 보기')}</a>`
                    : `<a class="btn btn-small btn-primary" href="#/new/book/${escapeHtml(b.id)}">${t('내 계획 세우기')}</a>`;
                })()}
                <button type="button" class="btn btn-small" data-action="book-edit" data-id="${escapeHtml(b.id)}" ${editing ? 'disabled' : ''}>${t('수정')}</button>
                <button type="button" class="btn btn-small btn-danger" data-action="book-delete" data-id="${escapeHtml(b.id)}" ${editing ? 'disabled' : ''}>${t('삭제')}</button>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>` : `<div class="empty">${t('아직 필독서가 없습니다.')}</div>`;

  return `
    <div class="admin-toolbar">
      <p class="muted">${t('여기서 정한 책 정보(제목·챕터·페이지)가 우리 팀 모두에게 공유됩니다. 기간은 각자 정합니다.')}</p>
      <button type="button" class="btn btn-primary" data-action="book-new" ${editing ? 'disabled' : ''}>${t('+ 필독서 추가')}</button>
    </div>
    ${editor}
    ${list}`;
}

/** 편집 중인 표지 미리보기 (새로 고른 파일 > 기존 표지) */
function renderCoverPreview(book) {
  const c = adminState.cover;
  const url = c ? (c.removed ? null : c.previewUrl) : (book && book.coverUrl);
  return url ? `<img src="${escapeHtml(url)}" alt="${t('표지 미리보기')}">` : `<span class="cover-empty">${t('표지 없음')}</span>`;
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
  if (!input.title.trim()) errors.push(t('책 제목을 입력하세요.'));
  errors.push(...validateBookStructure(input));
  const box = form.querySelector('#form-errors');
  if (errors.length) {
    box.innerHTML = `<strong>${t('저장할 수 없습니다')}</strong><ul>${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
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
    box.innerHTML = `<strong>${t('저장하지 못했습니다')}</strong><ul><li>${escapeHtml(err.message || String(err))}</li></ul>`;
    box.hidden = false;
    form.querySelector('button[type="submit"]').disabled = false;
  }
}

/* ----- 회원 관리 ----- */

function renderAdminMembers() {
  const profiles = adminState.profiles;
  if (!profiles.length) return `<div class="empty">${t('아직 로그인한 사람이 없습니다.')}</div>`;
  const teamCount = profiles.filter((p) => p.in_team).length;
  return `
    <div class="admin-toolbar">
      <p class="muted">${t('앱에 한 번이라도 로그인한 사람들입니다. <b>우리 팀</b>으로 지정하면 사역자 필독서가 보입니다. (우리 팀 {n}명)', { n: teamCount })}</p>
    </div>
    <table class="admin-table panel-table">
      <thead><tr><th>${t('이름')}</th><th>${t('이메일')}</th><th>${t('처음 로그인')}</th><th>${t('마지막 접속')}</th><th class="center">${t('우리 팀')}</th></tr></thead>
      <tbody>
        ${profiles.map((p) => `
          <tr class="${p.in_team ? 'is-team' : ''}">
            <td><strong>${escapeHtml(p.name || '-')}</strong>${p.user_id === currentUser.id ? ` <span class="muted">${t('(나)')}</span>` : ''}</td>
            <td>${escapeHtml(p.email)}</td>
            <td class="muted">${timestampToDate(p.created_at)}</td>
            <td class="muted">${timestampToDate(p.last_seen_at)}</td>
            <td class="center">
              <label class="switch">
                <input type="checkbox" data-action="team-toggle" data-id="${escapeHtml(p.user_id)}" ${p.in_team ? 'checked' : ''}
                  aria-label="${t('{name} 우리 팀 지정', { name: escapeHtml(profileName(p)) })}">
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
    if (action === 'admin-basis') {
      adminState.viewBasis = btn.dataset.basis;
      render();
      return;
    }
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
      if (!confirm(t("'{title}' 필독서를 삭제할까요?\n팀원들이 이미 세운 계획은 지워지지 않고 일반 목표로 남습니다.", { title: book.title }))) return;
      btn.disabled = true;
      try {
        await adminDeleteRequiredBook(book.id);
        adminRemoveCoverFile(book.coverUrl);
        requiredBooks = requiredBooks.filter((b) => b.id !== book.id);
        render();
      } catch (err) {
        alert(t('삭제하지 못했습니다: {message}', { message: err.message }));
        btn.disabled = false;
      }
    }
  });

  container.addEventListener('change', async (e) => {
    if (e.target.id === 'cover-file') {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        alert(t('표지 이미지는 3MB 이하로 올려 주세요.'));
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
      alert(t('변경하지 못했습니다: {message}', { message: err.message }));
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
 *     외부 라이브러리 없이 Canvas로 직접 그린다. (16:9 가로형, 1920×1080)
 * ========================================================================= */

const EXPORT_FONT = "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
const EXPORT_COLORS = {
  bg: '#f5f6f8', surface: '#ffffff', text: '#1f2328', muted: '#6b7280', border: '#e3e5ea',
  primary: '#2f6fed', primarySoft: '#e8f0fe', danger: '#d93025', dangerSoft: '#fdecea',
  success: '#1a7f4b', successSoft: '#e6f4ec', neutralSoft: '#eef0f3', bar: '#4a9d6b',
  required: '#b35c00', requiredSoft: '#fff1e0',
};

/** 이미지용 행 내용 (HTML 없이 글자만) */
function rowTextForExport(goal, basis, row) {
  if (row.isRestDay) return { main: restText(goal, row.date), subs: [], rest: true };
  if (row.amount === 0) return { main: t('휴식 (분량 없음)'), subs: [], rest: true };
  const from = row.prevCumulative;
  const to = row.cumulative;
  if (basis === 'page') {
    const a = unitsToPage(goal.book, from + 1);
    const b = unitsToPage(goal.book, to);
    return {
      main: `${a === b ? `p.${a}` : `p.${a}~${b}`}  (${formatAmount(row.amount, 'page')})`,
      subs: [describeChaptersForPages(goal.book, a, b)],
    };
  }
  if (basis === 'bible') return { main: describeBibleRange(goal.bible, from, to), subs: [] };
  if (basis === 'chapter') {
    const chs = getChapterRanges(goal.book).slice(from, to);
    return { main: t('{n}개 챕터', { n: chs.length }), subs: chs.map((c) => `${c.name} (p.${c.startPage}~${c.endPage})`) };
  }
  const titles = goal.lecture.titles.slice(from, to);
  const range = to - from > 1 ? t('{from}~{to}강', { from: from + 1, to }) : lectureLabel(from + 1);
  return {
    main: `${range}  (${formatAmount(row.amount, 'lecture')})`,
    subs: titles.map((title, i) => `${lectureLabel(from + i + 1)} ${title}`),
  };
}

/** 좁은 칸용 짧은 분량: "11쪽" / "11p", 영어는 "3 ch" · "2 lec" */
function compactAmount(n, basis) {
  if (currentLang === 'en') return basis === 'page' ? `${n}p` : `${n} ${basis === 'lecture' ? 'lec' : 'ch'}`;
  return basis === 'page' ? `${n}쪽` : formatAmount(n, basis);
}

function stripTags(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent;
}

/** 띄어쓰기 단위로 폭에 맞게 줄바꿈 (한 단어가 너무 길면 글자 단위로) */
function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else if (!line) {
      lines.push(...wrapChars(ctx, word, maxWidth));
    } else {
      lines.push(line);
      line = ctx.measureText(word).width <= maxWidth ? word : '';
      if (!line) lines.push(...wrapChars(ctx, word, maxWidth));
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** 글자 단위 줄바꿈 */
function wrapChars(ctx, text, maxWidth) {
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
 * 계획 이미지 그리기 → canvas (16:9 가로형, 1920×1080)
 *  - 왼쪽: 제목 · 저자 · 기간 / 현재 진도 · 진행 막대 · 핵심 숫자 · 안내
 *  - 오른쪽: 날짜별 계획 (하루 한 줄). 날짜가 많으면 2~3칸으로 나누고 줄 높이를 줄여 한 화면에 맞춘다.
 * options: { basis, range: 'all' | 'upcoming' }
 */
async function drawPlanImage(goal, options) {
  const today = todayStr();
  const { basis } = options;
  const s = getGoalSummary(goal, undefined, today);
  const msg = getCompareMessage(goal, s);
  const cover = await loadImage(getCoverUrl(goal));
  let rows = buildTimeline(goal, basis);
  if (options.range === 'upcoming') rows = rows.filter((r) => diffDays(today, r.date) >= 0);
  const done = getDoneUnits(goal, basis);
  const C = EXPORT_COLORS;

  const W = 1920;
  const H = 1080;
  const P = 64;
  const font = (size, weight = 400) => `${weight} ${size}px ${EXPORT_FONT}`;
  const fit = (ctx, text, maxW) => {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = String(text);
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
    return `${t}…`;
  };

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  /* ===== 왼쪽 ===== */
  const LW = 640;
  let y = P;
  const isRequired = goal.requiredBookId && requiredBooks.some((b) => b.id === goal.requiredBookId);

  // 표지 + 제목
  let tx = P;
  if (cover) {
    const cw = 110;
    const ch = Math.min(160, Math.round(cw * (cover.height / cover.width)));
    ctx.save();
    ctx.shadowColor = 'rgba(16,24,40,0.25)';
    ctx.shadowBlur = 14;
    ctx.drawImage(cover, P, y, cw, ch);
    ctx.restore();
    tx = P + cw + 28;
  }
  const titleW = P + LW - tx;
  let ty = y;
  if (isRequired) {
    ctx.font = font(22, 700);
    const tagText = t('사역자 필독서');
    const tw = ctx.measureText(tagText).width + 26;
    roundRect(ctx, tx, ty, tw, 38, 8, C.requiredSoft);
    ctx.fillStyle = C.required;
    ctx.fillText(tagText, tx + 13, ty + 27);
    ty += 52;
  }
  ctx.font = font(46, 800);
  ctx.fillStyle = C.text;
  const titleLines = wrapText(ctx, goal.title, titleW).slice(0, 2);
  titleLines.forEach((line, i) => ctx.fillText(line, tx, ty + 44 + i * 56));
  ty += 44 + (titleLines.length - 1) * 56;
  ctx.font = font(24);
  ctx.fillStyle = C.muted;
  if (getBookAuthor(goal)) {
    ty += 42;
    ctx.fillText(fit(ctx, t('{author} 지음', { author: getBookAuthor(goal) }), titleW), tx, ty);
  }
  const rest = getRestWeekdays(goal);
  ty += 38;
  ctx.fillText(fit(ctx, [
    `${formatShortDate(goal.startDate)} ~ ${formatShortDate(goal.dueDate)}`,
    formatDday(s.dday),
    rest.length ? t('{days} 쉼', { days: weekdayListLabel(rest) }) : '',
  ].filter(Boolean).join('  ·  '), titleW), tx, ty);

  // 현황 카드
  const cardY = Math.max(ty + 44, cover ? y + 200 : 0);
  const cardH = H - P - 44 - cardY;
  roundRect(ctx, P, cardY, LW, cardH, 24, C.surface);
  const cx = P + 36;
  const cw = LW - 72;
  let cy = cardY + 56;

  ctx.font = font(24, 600);
  ctx.fillStyle = C.muted;
  ctx.fillText(t('현재 진도'), cx, cy);
  // 상태 배지
  const badge = s.isComplete ? [t('완료'), C.successSoft, C.success]
    : s.isOverdue ? [t('종료 · 미완료'), '#fff4e0', '#9a5b00']
    : s.notStarted ? [t('시작 전'), C.neutralSoft, C.muted]
    : s.diff < 0 ? [t('{amount} 밀림', { amount: formatAmount(-s.diff, s.basis) }), C.dangerSoft, C.danger]
    : s.diff > 0 ? [t('{amount} 앞섬', { amount: formatAmount(s.diff, s.basis) }), C.successSoft, C.success]
    : [t('계획대로'), C.primarySoft, C.primary];
  ctx.font = font(24, 700);
  const bw = ctx.measureText(badge[0]).width + 36;
  roundRect(ctx, cx + cw - bw, cy - 32, bw, 46, 23, badge[1]);
  ctx.fillStyle = badge[2];
  ctx.fillText(badge[0], cx + cw - bw + 18, cy - 1);

  cy += 70;
  ctx.font = font(64, 800);
  ctx.fillStyle = C.text;
  const doneText = formatPosition(goal, s.basis, s.done);
  ctx.fillText(doneText, cx, cy);
  let nx = cx + ctx.measureText(doneText).width + 14;
  ctx.font = font(32, 600);
  ctx.fillStyle = C.muted;
  const totalText = `/ ${formatPosition(goal, s.basis, s.total)}`;
  ctx.fillText(totalText, nx, cy);
  nx += ctx.measureText(totalText).width + 20;
  ctx.font = font(34, 800);
  ctx.fillStyle = C.bar;
  ctx.fillText(`${s.percent}%`, nx, cy);

  // 진행 막대
  cy += 36;
  roundRect(ctx, cx, cy, cw, 20, 10, C.neutralSoft);
  const donePct = s.total ? Math.min(1, s.done / s.total) : 0;
  const targetPct = s.total ? Math.min(1, s.target / s.total) : 0;
  roundRect(ctx, cx, cy, Math.max(20, cw * donePct), 20, 10, C.bar);
  ctx.fillStyle = C.text;
  ctx.fillRect(cx + cw * targetPct - 2, cy - 8, 4, 36);
  ctx.font = font(20);
  ctx.fillStyle = C.muted;
  ctx.fillText(t('초록 = 실제 진도   |   검정 선 = 오늘까지 권장'), cx, cy + 56);

  // 핵심 숫자 (세로 목록)
  cy += 104;
  const facts = [
    [t('하루 권장'), formatAmount(s.dailyPlan, s.basis)],
    [t('오늘까지 권장'), formatPosition(goal, s.basis, s.target)],
    [t('남은 공부일'), s.isOverdue || s.isComplete ? '-' : formatDays(s.remainingStudyDays)],
  ];
  facts.forEach(([label, value]) => {
    ctx.fillStyle = C.border;
    ctx.fillRect(cx, cy - 36, cw, 1);
    ctx.font = font(24);
    ctx.fillStyle = C.muted;
    ctx.fillText(label, cx, cy);
    ctx.font = font(30, 800);
    ctx.fillStyle = C.text;
    ctx.textAlign = 'right';
    ctx.fillText(value, cx + cw, cy + 2);
    ctx.textAlign = 'left';
    cy += 62;
  });

  // 안내 문구 (카드 아래쪽에 맞춤)
  const tone = { behind: [C.dangerSoft, '#a3261c'], ahead: [C.successSoft, C.success], done: [C.successSoft, C.success],
    ontrack: [C.primarySoft, '#1d4ab5'], ended: ['#fff4e0', '#7a4a00'], neutral: [C.neutralSoft, C.text] }[msg.tone];
  ctx.font = font(24, 600);
  const msgLines = wrapText(ctx, stripTags(msg.html), cw - 44).slice(0, 3);
  const msgH = 36 + msgLines.length * 36;
  const msgY = Math.max(cy - 10, cardY + cardH - 36 - msgH);
  roundRect(ctx, cx, msgY, cw, msgH, 14, tone[0]);
  ctx.fillStyle = tone[1];
  msgLines.forEach((line, i) => ctx.fillText(line, cx + 22, msgY + 44 + i * 36));

  // 바닥글
  ctx.font = font(20);
  ctx.fillStyle = C.muted;
  ctx.fillText(t('학습 진도 계획표 · {date} ({weekday}) 기준', { date: today, weekday: weekdayLabel(today) }), P, H - P + 16);

  /* ===== 오른쪽: 날짜별 계획 ===== */
  const RX = P + LW + 40;
  const RW = W - P - RX;
  const RY = P;
  const RH = H - P * 2;
  roundRect(ctx, RX, RY, RW, RH, 24, C.surface);
  ctx.font = font(30, 800);
  ctx.fillStyle = C.text;
  ctx.fillText(goal.type === 'lecture' ? t('매일 들을 분량') : t('매일 읽을 분량'), RX + 36, RY + 56);
  ctx.font = font(21);
  ctx.fillStyle = C.muted;
  ctx.textAlign = 'right';
  const basisLabel = t({ page: '페이지 기준', chapter: '챕터 기준', lecture: '강의', bible: '장 단위' }[basis]);
  ctx.fillText(`${basisLabel} · ${options.range === 'upcoming' ? t('오늘부터') : t('전체 기간')}   ✓ ${t('완료')}`, RX + RW - 36, RY + 54);
  ctx.textAlign = 'left';

  const listTop = RY + 88;
  const listH = RH - 88 - 28;
  const listW = RW - 72;
  const MAX_ROW_H = 58;
  const MIN_ROW_H = 40; // 이보다 줄이 낮아지면 칸을 늘린다
  let cols = Math.max(1, Math.ceil(rows.length / Math.floor(listH / MIN_ROW_H)));
  cols = Math.min(cols, 3);
  const perCol = Math.max(1, Math.ceil(rows.length / cols));
  const rowH = Math.min(MAX_ROW_H, listH / perCol);
  const colGap = 28;
  const colW = (listW - colGap * (cols - 1)) / cols;
  const fs = rowH >= 50 ? 24 : rowH >= 40 ? 21 : 18; // 줄 높이에 맞춘 글자 크기

  rows.forEach((row, i) => {
    const col = Math.floor(i / perCol);
    const rx = RX + 36 + col * (colW + colGap);
    const ry = listTop + (i - col * perCol) * rowH;
    const txt = rowTextForExport(goal, basis, row);
    const dayDiff = diffDays(today, row.date);
    const checked = !txt.rest && done >= row.cumulative;
    const behind = dayDiff < 0 && !checked && !txt.rest;

    if (dayDiff === 0) roundRect(ctx, rx - 10, ry + 3, colW + 20, rowH - 6, 10, C.primarySoft);
    else if (behind) roundRect(ctx, rx - 10, ry + 3, colW + 20, rowH - 6, 10, C.dangerSoft);
    ctx.globalAlpha = checked && dayDiff !== 0 ? 0.4 : 1;
    const base = ry + rowH / 2 + fs * 0.36;

    const d = parseDate(row.date);
    const dow = d.getDay();
    ctx.font = font(fs, 700);
    ctx.fillStyle = behind ? C.danger : C.text;
    ctx.fillText(`${d.getMonth() + 1}/${d.getDate()}`, rx, base);
    ctx.font = font(fs - 2, 600);
    ctx.fillStyle = dow === 0 ? C.danger : dow === 6 ? C.primary : C.muted;
    ctx.fillText(weekdayName(dow), rx + fs * 3, base);

    const en = currentLang === 'en';
    const rangeX = rx + fs * (en ? 5.2 : 4.3); // 영어 요일(Wed)은 한 글자보다 넓다
    const checkW = fs * 1.4;
    const compact = cols > 1; // 여러 칸이면 분량을 짧게 (11쪽 / 11p)
    const amountW = compact ? fs * (en ? 3.6 : 3.2) : fs * (en ? 6 : 4.6);
    const rangeMaxW = colW - (rangeX - rx) - amountW - checkW;
    if (txt.rest) {
      ctx.font = font(fs - 2);
      ctx.fillStyle = C.muted;
      ctx.fillText(fit(ctx, txt.main, colW - (rangeX - rx) - checkW), rangeX, base);
    } else {
      const range = basis === 'chapter'
        ? getChapterRanges(goal.book).slice(row.prevCumulative, row.cumulative).map((c) => c.name).join(', ')
        : txt.main.replace(/\s*\(.*\)$/, '');
      ctx.font = font(fs, 700);
      ctx.fillStyle = C.text;
      const rangeText = fit(ctx, range, basis === 'page' && cols === 1 ? Math.min(rangeMaxW, fs * 8) : rangeMaxW);
      ctx.fillText(rangeText, rangeX, base);
      if (cols === 1 && basis === 'page' && txt.subs[0]) {
        const subX = rangeX + ctx.measureText(rangeText).width + 18;
        ctx.font = font(fs - 3);
        ctx.fillStyle = C.muted;
        ctx.fillText(fit(ctx, txt.subs[0], rangeX + rangeMaxW - subX), subX, base);
      }
      ctx.textAlign = 'right';
      ctx.font = font(fs - 2, 700);
      ctx.fillStyle = C.text;
      ctx.fillText(compact ? compactAmount(row.amount, basis) : formatAmount(row.amount, basis), rx + colW - checkW, base);
      ctx.textAlign = 'left';
    }
    if (checked) {
      ctx.font = font(fs + 2, 800);
      ctx.fillStyle = C.success;
      ctx.fillText('✓', rx + colW - fs, base + 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.border;
    ctx.fillRect(rx, ry + rowH - 1, colW, 1);
  });

  return canvas;
}

/* ----- 내보내기 창 ----- */

const exportState = { goal: null, options: null, canvas: null };

async function openExportDialog(goal, options = null) {
  exportState.goal = goal;
  exportState.options = options || { basis: detailState.basis, range: 'all' };
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
        <h2 id="export-title" class="section-title">${t('이미지로 내보내기')}</h2>
        <button type="button" class="btn-icon" data-action="export-close" aria-label="${t('닫기')}">×</button>
      </div>
      <div class="export-options">
        ${bases.length > 1 ? `
          <div class="segmented">
            ${bases.map((b) => `<label><input type="radio" name="export-basis" value="${b}" ${b === exportState.options.basis ? 'checked' : ''}> ${basisTabLabel(b)}</label>`).join('')}
          </div>` : ''}
        <div class="segmented">
          <label><input type="radio" name="export-range" value="all" ${exportState.options.range === 'all' ? 'checked' : ''}> ${t('전체 기간')}</label>
          <label><input type="radio" name="export-range" value="upcoming" ${exportState.options.range === 'upcoming' ? 'checked' : ''}> ${t('오늘부터')}</label>
        </div>
      </div>
      <div class="export-preview" id="export-preview"><span class="muted">${t('그리는 중…')}</span></div>
      <div class="modal-actions">
        <span id="export-status" class="muted"></span>
        <button type="button" class="btn" data-action="export-copy">${t('이미지 복사')}</button>
        <button type="button" class="btn btn-primary" data-action="export-download">${t('PNG 저장')}</button>
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
  img.alt = t('내보낼 이미지 미리보기');
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
  const safe = exportState.goal.title.replace(/[\\/:*?"<>|]/g, '').trim() || t('계획표');
  return t('{title}-계획표-{date}.png', { title: safe, date: todayStr() });
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
    status.textContent = t('저장했습니다.');
  }
  if (action === 'export-copy') {
    try {
      const blob = await canvasToBlob(exportState.canvas);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      status.textContent = t('복사했습니다. 카톡 등에 붙여넣기 하세요.');
    } catch (err) {
      console.warn('[export] 복사 실패:', err);
      status.textContent = t('이 브라우저에서는 복사할 수 없습니다. PNG 저장을 이용하세요.');
    }
  }
}

async function onExportDialogChange(e) {
  if (e.target.name === 'export-basis') exportState.options.basis = e.target.value;
  if (e.target.name === 'export-range') exportState.options.range = e.target.value;
  await redrawExport();
}

/* =========================================================================
 * 13. 영어 번역 — 키는 한국어 원문 (t() 참고)
 *     값이 함수면 매개변수로 문장을 만든다 (단수/복수 등).
 * ========================================================================= */

const EN = {
  // 공통 · 상단 바 · 로그인
  '학습 진도 계획표': 'Study Planner',
  '언어': 'Language',
  '저장 중…': 'Saving…',
  '저장됨': 'Saved',
  '저장 실패': 'Save failed',
  '다시 시도': 'Retry',
  '관리자': 'Admin',
  '로그아웃': 'Log out',
  '책·강의의 마감일까지 매일 할 분량을 계획하고 진도를 기록합니다.': 'Plan how much to do each day to finish your books and lectures by the due date, and track your progress.',
  '구글 계정으로 로그인하면 어느 기기에서든 같은 계획을 볼 수 있습니다.': 'Sign in with your Google account to see the same plans on any device.',
  '파일을 직접 연 상태에서는 로그인할 수 없습니다. 배포된 인터넷 주소(https://…)로 열어 주세요.': "You can't sign in when the file is opened directly. Please open the app from its web address (https://…).",
  'Google 계정으로 로그인': 'Sign in with Google',
  '로그인을 시작하지 못했습니다: {message}': 'Could not start sign-in: {message}',
  '불러오는 중…': 'Loading…',
  '계정에 저장된 목표를 불러오고 있습니다.': 'Loading the goals saved in your account.',
  '불러오지 못했습니다': 'Could not load',
  '불러오지 못했습니다: {message}': 'Could not load: {message}',
  '이 브라우저에 로그인 전에 만든 목표 {n}개가 있습니다.\n계정으로 옮길까요?\n\n(취소를 누르면 옮기지 않고, 다시 묻지 않습니다. 브라우저의 데이터는 지워지지 않습니다.)':
    (p) => `This browser has ${plural(p.n, 'goal')} created before you signed in.\nMove them to your account?\n\n(If you press Cancel, they won't be moved and you won't be asked again. The data in this browser won't be deleted.)`,
  '연결할 수 없습니다': 'Cannot connect',
  '로그인 기능을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.': "Couldn't load sign-in. Check your internet connection and refresh the page.",
  '아직 저장 중입니다. 그래도 로그아웃할까요?': 'Still saving. Log out anyway?',

  // 종류 · 단위 · 날짜
  '책': 'Book',
  '강의': 'Lecture',
  '성경 통독': 'Bible Reading',
  '{n}강': 'Lecture {n}',
  '{from}~{to}강': 'Lectures {from}–{to}',
  '{n}일': (p) => plural(p.n, 'day'),
  '{from}~{to}': '{from}–{to}',
  '{y}년 {m}월': (p) => `${MONTHS_EN[p.m - 1]} ${p.y}`,
  '{name} 일부': '{name} (part)',
  '{author} 지음': 'by {author}',

  // 성경
  '{book} {n}장': '{book} {n}',
  '{book} {from}~{to}장': '{book} {from}–{to}',
  '{book1} {ch1}장 ~ {book2} {ch2}장': '{book1} {ch1} – {book2} {ch2}',
  '성경 전체': 'Whole Bible',
  '구약': 'Old Testament',
  '신약': 'New Testament',
  '모세오경': 'Pentateuch',
  '역사서': 'History',
  '시가서': 'Poetry & Wisdom',
  '선지서': 'Prophets',
  '복음서': 'Gospels',
  '서신서': 'Epistles',
  '성경 통독 · {range}': 'Bible Reading · {range}',
  '{books}권 · {chapters}장': (p) => `${plural(p.books, 'book')} · ${plural(p.chapters, 'chapter')}`,
  '{book}은(는) 1~{n}장입니다.': (p) => (p.n === 1 ? `${p.book} has only 1 chapter.` : `${p.book} has chapters 1–${p.n}.`),

  // 쉬는 날 · 여유 있는 날
  '쉬는 날': 'Rest day',
  '쉬는 날 · {label}': 'Rest day · {label}',
  '쉬는 날||label': 'Rest days',
  '쉬는 요일': 'Rest weekdays',
  '쉬는 요일 {days}': 'Rest: {days}',
  '{days} 쉼': 'Rest: {days}',
  '여유 있는 날': 'Extra days',
  '여유 {n}일': (p) => plural(p.n, 'extra day'),
  '여유 ×{w}': 'Extra ×{w}',
  '직접': 'Manual',
  '휴식': 'Break',
  '휴식(분량 없음)': 'Break (nothing scheduled)',
  '휴식 (분량 없음)': 'Break (nothing scheduled)',

  // 검증 · 오류
  '이름을 입력하세요.': 'Enter a name.',
  '시작일이 올바르지 않습니다.': 'The start date is invalid.',
  '마감일이 올바르지 않습니다.': 'The due date is invalid.',
  '쉬는 요일을 모두 선택할 수는 없습니다.': "You can't make every weekday a rest day.",
  '마감일은 시작일과 같거나 뒤여야 합니다.': 'The due date must be on or after the start date.',
  '기간 안에 공부하는 날이 없습니다. 기간이나 쉬는 요일을 바꾸세요.': 'There are no study days in this period. Change the dates or rest weekdays.',
  '마지막 페이지를 1 이상의 정수로 입력하세요.': 'Enter the last page as a whole number (1 or more).',
  '챕터를 한 개 이상 입력하세요.': 'Enter at least one chapter.',
  '{n}번째 챕터': 'Chapter {n}',
  '시작 페이지를 1 이상의 정수로 입력하세요.': 'Enter the start page as a whole number (1 or more).',
  '시작 페이지가 앞 챕터보다 커야 합니다 (오름차순).': "The start page must be greater than the previous chapter's (ascending order).",
  '시작 페이지가 마지막 페이지({last})보다 큽니다.': 'The start page is greater than the last page ({last}).',
  '통독 범위를 선택하세요.': 'Choose a reading range.',
  '통독 범위의 시작 권이 끝 권보다 뒤에 있습니다.': 'The first book of the range comes after the last book.',
  '강의 제목을 한 줄 이상 입력하세요.': 'Enter at least one lecture title.',
  '진행 중인 목표는 마감일을 오늘 이후로 정해야 합니다.': 'For a goal in progress, the due date must be today or later.',
  '오늘부터 마감일까지 공부하는 날이 없습니다. 마감일이나 쉬는 요일을 바꾸세요.': 'There are no study days from today to the due date. Change the due date or rest weekdays.',
  '이미 완료한 목표입니다.': 'This goal is already complete.',
  '마감일이 지났습니다. 마감일을 변경해 주세요.': 'The due date has passed. Please change the due date.',
  '아직 시작 전이라 재분배할 필요가 없습니다.': "This goal hasn't started yet, so there's nothing to redistribute.",
  '오늘부터 마감일까지 공부하는 날이 없습니다. 마감일을 변경해 주세요.': 'There are no study days from today to the due date. Please change the due date.',
  '{date}: 0 이상의 정수를 입력하세요.': '{date}: Enter a whole number (0 or more).',
  '직접 정한 분량의 합({sum})이 이 계획의 전체 분량({total})보다 많습니다.': "The manual amounts add up to {sum}, which is more than this plan's total ({total}).",
  '모든 날을 직접 정했다면 합이 {total}이어야 합니다. (지금 {sum})': 'If you set every day manually, they must add up to {total}. (Currently {sum})',
  '{min}~{max} 사이의 정수를 입력하세요.': 'Enter a whole number between {min} and {max}.',
  '책 제목을 입력하세요.': 'Enter a book title.',
  '저장할 수 없습니다': "Can't save",
  '저장하지 못했습니다': 'Could not save',

  // 백업 (JSON)
  '올바른 데이터 형식이 아닙니다.': 'The data format is not valid.',
  '이 앱보다 새로운 버전({version})의 데이터입니다.': 'This data is from a newer version ({version}) of the app.',
  '학습계획표-백업-{date}.json': 'study-planner-backup-{date}.json',
  'JSON 파일을 읽을 수 없습니다. 파일이 손상되었거나 JSON 형식이 아닙니다.': "Can't read the JSON file. It may be damaged or not in JSON format.",
  '같은 id를 가진 목표가 여러 개 있습니다.': 'Several goals have the same id.',
  '{n}번째 목표': 'Goal {n}',
  '형식이 올바르지 않습니다.': 'Invalid format.',
  'id 또는 이름이 올바르지 않습니다.': 'Invalid id or name.',
  '종류(type)가 올바르지 않습니다.': 'Invalid type.',
  '날짜가 올바르지 않습니다.': 'Invalid dates.',
  '저자 정보가 올바르지 않습니다.': 'Invalid author.',
  '필독서 연결 정보가 올바르지 않습니다.': 'Invalid required-book link.',
  '여유 있는 날 정보가 올바르지 않습니다.': 'Invalid extra days.',
  '쉬는 날 정보가 올바르지 않습니다.': 'Invalid rest days.',
  '쉬는 요일 정보가 올바르지 않습니다.': 'Invalid rest weekdays.',
  '챕터 정보가 올바르지 않습니다.': 'Invalid chapters.',
  '통독 범위가 올바르지 않습니다.': 'Invalid reading range.',
  '강의 목록이 올바르지 않습니다.': 'Invalid lecture list.',
  '진도 정보가 올바르지 않습니다.': 'Invalid progress data.',
  '계획 정보가 올바르지 않습니다.': 'Invalid plan data.',
  '모든 목표와 진도 기록을 JSON 파일로 저장합니다': 'Save all goals and progress to a JSON file',
  'JSON 내보내기': 'Export JSON',
  '백업한 JSON 파일로 전체 데이터를 바꿉니다': 'Replace all data with a backed-up JSON file',
  'JSON 불러오기': 'Import JSON',
  '파일을 읽지 못했습니다.': 'Could not read the file.',
  '불러올 수 없습니다.\n\n{message}': "Can't import.\n\n{message}",
  "'{file}'에서 목표 {n}개를 불러옵니다.\n\n지금 있는 목표 {current}개는 모두 지워지고 파일 내용으로 바뀝니다.\n계속할까요? (필요하면 먼저 \"JSON 내보내기\"로 백업하세요)":
    (p) => `Import ${plural(p.n, 'goal')} from '${p.file}'.\n\nAll ${plural(p.current, 'current goal')} will be deleted and replaced with the file's contents.\nContinue? (If needed, back up first with "Export JSON".)`,

  // 대시보드 · 카드
  '+ 새 목표 추가': '+ New goal',
  '진행 중': 'In progress',
  '진행 중인 목표가 없습니다. <a href="#/new">새 목표를 추가</a>해 보세요.': 'No goals in progress. <a href="#/new">Add a new goal</a> to get started.',
  '완료 / 종료': 'Completed / Ended',
  '필독서': 'Required',
  '사역자 필독서': 'Required Reading',
  '계획 없음': 'No plan',
  '계획 세우기': 'Make a plan',
  '{pages}페이지 · {n}개 챕터': (p) => `${plural(p.pages, 'page')} · ${plural(p.n, 'chapter')}`,
  '내용 변경됨': 'Updated',
  '마감 {date}': 'Due {date}',
  '오늘 할 분량': "Today's amount",
  '완료': 'Done',
  '종료 · 미완료': 'Ended · Incomplete',
  '시작 전': 'Not started',
  '{amount} 밀림': '{amount} behind',
  '{amount} 앞섬': '{amount} ahead',
  '계획대로': 'On track',
  '모두 완료했습니다': 'All done',
  '마감일이 지났습니다': 'The due date has passed',
  '{date} 시작': 'Starts {date}',
  '오늘은 {rest}': 'Today: {rest}',

  // 목표 추가 · 수정
  '목표 상세': 'Goal details',
  '대시보드': 'Dashboard',
  '목표 수정': 'Edit goal',
  '필독서 계획 세우기': 'Plan required reading',
  '새 목표 추가': 'New goal',
  '사역자 필독서입니다. 책 제목과 챕터는 관리자가 정하며, 여기서는 시작일·마감일·쉬는 요일만 정할 수 있습니다.':
    'This is required reading. The admin sets the book title and chapters; here you only choose the dates and rest days.',
  '진행 중인 목표입니다. 날짜·쉬는 요일·챕터·강의 목록을 바꾸면 원래 계획은 보관하고, 오늘부터 마감일까지 남은 분량을 다시 나눕니다. 저장하면 새 계획을 먼저 미리보기로 보여드립니다.':
    "This goal is in progress. If you change the dates, rest days, chapters or lecture list, the original plan is kept and the remaining amount is redistributed from today to the due date. When you save, you'll see a preview of the new plan first.",
  '종류': 'Type',
  '시작일': 'Start date',
  '마감일': 'Due date',
  '기간': 'Period',
  '마감일 빠르게 정하기 (시작일부터)': 'Quick due date (from the start date)',
  '시작일부터 {w}주 뒤를 마감일로 정합니다': (p) => `Set the due date ${plural(p.w, 'week')} after the start date`,
  '{w}주 동안': (p) => plural(p.w, 'week'),
  '(선택한 요일에는 분량을 배정하지 않습니다)': '(nothing is scheduled on these weekdays)',
  '(행사·일정 등으로 빠지는 특정 날짜)': "(specific dates you'll miss, e.g. for events)",
  '쉬는 날짜': 'Rest date',
  '메모 (예: 수련회)': 'Note (e.g. retreat)',
  '+ 추가': '+ Add',
  '(그날은 평소보다 많이 배정)': '(more than usual is scheduled on these days)',
  '여유 있는 날짜': 'Extra date',
  '분량 배수': 'Amount multiplier',
  '평소의 {w}배': '{w}× usual',
  '{date} 쉬는 날 삭제': 'Remove rest day {date}',
  '{date} 여유 있는 날 삭제': 'Remove extra day {date}',
  '기간 밖이라 계획에 영향 없음': 'Outside the period, so it has no effect on the plan',
  '쉬는 날과 겹쳐서 적용되지 않음': 'Overlaps a rest day, so it is not applied',
  '저자': 'Author',
  '(선택)': '(optional)',
  '강의 제목 목록': 'Lecture titles',
  '(한 줄에 하나, 빈 줄은 무시)': '(one per line; blank lines are ignored)',
  '{n}개 강의': (p) => plural(p.n, 'lecture'),
  '통독 범위': 'Reading range',
  '부터': 'to',
  '까지': '',
  '시작 권이 끝 권보다 뒤에 있습니다': 'The first book comes after the last book',
  '책 제목': 'Book title',
  '강의 이름': 'Lecture name',
  '통독 이름': 'Reading plan name',
  '마감일이 시작일보다 앞입니다': 'The due date is before the start date',
  '{days}일 중 공부하는 날 {study}일': (p) => `${plural(p.study, 'study day')} out of ${plural(p.days, 'day')}`,
  '공부하는 날 하루 약 <b>{amount}</b>': 'About <b>{amount}</b> per study day',
  '취소': 'Cancel',
  '저장': 'Save',
  '목표 추가': 'Add goal',
  '챕터 목록': 'Chapters',
  '챕터 이름': 'Chapter name',
  '시작 페이지': 'Start page',
  '끝 페이지': 'End page',
  '+ 챕터 추가': '+ Add chapter',
  '마지막 페이지': 'Last page',
  '합계': 'Total',
  '끌어서 순서 바꾸기': 'Drag to reorder',
  '예: 1장 도입': 'e.g. Ch. 1 Introduction',
  '이 위에 챕터 추가': 'Add a chapter above',
  '행 삭제': 'Delete row',

  // 목표 상세
  '수정': 'Edit',
  '삭제': 'Delete',
  '계획 기준': 'Plan basis',
  '페이지 기준': 'By page',
  '챕터 기준': 'By chapter',
  '장 단위': 'By chapter',
  '계획표': 'Plan',
  '날짜별 분량을 직접 정합니다': 'Set the amount for each date yourself',
  '분량 직접 조정': 'Adjust amounts',
  '이미지로 내보내기': 'Export as image',
  '보기 방식': 'View',
  '목록': 'List',
  '달력': 'Calendar',
  '끝': 'End',
  '전체': 'Total',
  '모두 완료했습니다. 수고하셨어요!': 'All done. Great work!',
  '마감일이 지났습니다. 남은 <b>{amount}</b>{josa} <b>마감일 변경</b>으로 다시 계획할 수 있어요.':
    'The due date has passed. You can re-plan the remaining <b>{amount}</b> with <b>Change due date</b>.',
  '{date}에 시작합니다. 공부하는 날마다 <b>하루 {amount}</b>씩 하면 됩니다.': 'Starts on {date}. Just do <b>{amount} a day</b> on each study day.',
  '마감일까지 공부하는 날이 남아 있지 않습니다. 남은 <b>{amount}</b>{josa} 하려면 마감일을 변경해 주세요.':
    'There are no study days left before the due date. Change the due date to finish the remaining <b>{amount}</b>.',
  '계획보다 <b>{amount} 밀렸습니다.</b> 남은 공부일 {days}일 동안 <b>하루 {need}</b>씩 하면 기한을 맞출 수 있어요.':
    (p) => `You're <b>${p.amount} behind plan.</b> Do <b>${p.need} a day</b> for the ${p.days === 1 ? 'remaining study day' : `remaining ${p.days} study days`} to finish on time.`,
  '계획보다 <b>{amount} 앞서 있어요.</b> 남은 공부일 {days}일 동안 <b>하루 {need}</b>씩이면 충분해요.':
    (p) => `You're <b>${p.amount} ahead of plan.</b> <b>${p.need} a day</b> for the ${p.days === 1 ? 'remaining study day' : `remaining ${p.days} study days`} is enough.`,
  '오늘은 쉬는 날이에요{label}. 계획대로 진행 중입니다.': "Today is a rest day{label}. You're on track.",
  '오늘 분량을 마쳤어요. 계획대로 진행 중입니다.': "You've finished today's amount. You're on track.",
  '계획대로 진행 중이에요. 오늘 <b>{amount}</b> 남았어요.': "You're on track. <b>{amount}</b> left for today.",
  '관리자가 이 필독서의 책 정보(제목·챕터·페이지)를 바꿨습니다. 내 계획에 반영하려면 미리보기를 확인하세요.':
    'The admin changed this book (title, chapters or pages). Check the preview to apply the changes to your plan.',
  '반영 미리보기': 'Preview changes',
  '현재 위치': 'Current position',
  '오늘 할 일': 'Today',
  '마지막으로 읽은 페이지': 'Last page read',
  '완료한 강의 수': 'Lectures completed',
  '(0~{max}강)': '(0–{max})',
  '진도 기록': 'Log progress',
  '오늘부터 마감일까지 남은 분량을 다시 균등하게 나눕니다': 'Spread the remaining amount evenly again from today to the due date',
  '재분배': 'Redistribute',
  '마감일 변경': 'Change due date',
  '또는': 'or',
  '완료한 챕터': 'last chapter finished',
  '없음': 'None',
  '마지막으로 읽은 곳': 'Last read',
  '아직 안 읽음': 'Not yet',
  '장': 'Chapter',
  '장까지': '',
  '아직 읽지 않음': 'Not started yet',
  '아직 듣지 않음': 'Not started yet',
  'p.{page}까지 읽음': 'Read through p.{page}',
  '완료 챕터 {done}/{total}': 'Chapters done {done}/{total}',
  '{pos}까지 읽음': 'Read through {pos}',
  '{n}강까지 완료': (p) => `${plural(p.n, 'lecture')} completed`,
  '계획 대비 현황': 'Progress vs. plan',
  '하루 권장': 'Daily target',
  '오늘까지 권장': 'Target by today',
  '실제 완료': 'Actually done',
  '실제 진도 {done}%, 오늘까지 권장 {target}%': 'Actual progress {done}%, target by today {target}%',
  '초록 = 실제 진도 {n}%': 'Green = actual progress {n}%',
  '검정 선 = 오늘까지 권장 {n}%': 'Black line = target by today {n}%',

  // 미리보기 · 계획표
  '이름': 'Name',
  '마감일({from} → {to})': 'Due date ({from} → {to})',
  '챕터·페이지': 'Chapters/pages',
  '통독 범위({range})': 'Reading range ({range})',
  '강의 목록({from}개 → {to}개)': 'Lecture list ({from} → {to})',
  '새 마감일을 고르면 바뀐 계획을 여기에 보여드립니다.': 'Pick a new due date to see the updated plan here.',
  '재분배 미리보기': 'Redistribution preview',
  '마감일 변경 미리보기': 'Due date change preview',
  '수정 내용 미리보기': 'Edit preview',
  '적용 전': 'Not applied',
  '새 마감일': 'New due date',
  '현재 마감일 {date}': 'Current due date {date}',
  '수정으로 돌아가기': 'Back to edit',
  '적용': 'Apply',
  '바뀌는 항목: {items}': 'Changes: {items}',
  '마감일 {from} → <b>{to}</b>': 'Due date {from} → <b>{to}</b>',
  '남은 <b>{amount}</b>{josa} {from}부터 {to}까지 공부하는 날 <b>{days}일</b>에 나눕니다.':
    (p) => `The remaining <b>${p.amount}</b> will be split over <b>${plural(p.days, 'study day')}</b> from ${p.from} to ${p.to}.`,
  '하루 <b>{range}</b> <span class="muted">(지금 계획: 하루 평균 {old})</span>': '<b>{range}</b> a day <span class="muted">(current plan: {old} a day on average)</span>',
  '아직 시작 전이라 원래 계획을 새로 만듭니다.': "It hasn't started yet, so the original plan will be recreated.",
  '원래 계획은 그대로 보관되어 계획표에서 비교할 수 있습니다.': 'The original plan is kept, so you can compare it in the plan table.',
  '오늘': 'Today',
  '날짜': 'Date',
  '요일': 'Day',
  '들을 강의': 'Lectures',
  '읽을 내용': 'Reading',
  '분량': 'Amount',
  '새 누적 목표': 'New cumulative target',
  '지금 계획 누적': 'Current plan cumulative',
  '누적 목표': 'Cumulative target',
  '{date} 분량': 'Amount for {date}',
  '{date} 완료': 'Mark {date} done',
  '자동으로 되돌리기': 'Reset to automatic',
  '오늘부터 날짜별 <b>분량</b> 칸의 숫자를 바꾸면, 나머지 날에 남은 분량이 자동으로 다시 나뉩니다.':
    'Change the numbers in the <b>Amount</b> column from today on, and the rest is automatically redistributed over the other days.',
  '직접 정한 날은 <span class="amount-tag tag-fixed">직접</span>으로 표시되고, ↺를 누르면 자동으로 돌아갑니다. 지난 날은 바뀌지 않습니다.':
    "Days you set are marked <span class=\"amount-tag tag-fixed\">Manual</span>; press ↺ to make them automatic again. Past days don't change.",
  '외 {n}개': '+{n} more',
  '이전 달': 'Previous month',
  '다음 달': 'Next month',
  "'{title}' 목표를 삭제할까요?\n진도 기록과 계획이 모두 지워지며 되돌릴 수 없습니다.": "Delete the goal '{title}'?\nAll progress and plans will be erased. This can't be undone.",

  // 관리자
  '내 계획': 'My plans',
  '새로고침': 'Refresh',
  '관리자 메뉴': 'Admin menu',
  '진도 현황': 'Progress',
  '회원 계획': 'Member plans',
  '회원 관리': 'Members',
  '아직 필독서가 없습니다. <a href="#/admin/books">사역자 필독서</a>에서 추가하세요.': 'No required books yet. Add them in <a href="#/admin/books">Required Reading</a>.',
  '우리 팀으로 지정된 사람이 없습니다. <a href="#/admin/members">회원 관리</a>에서 지정하세요.': 'No one is on the team yet. Add people in <a href="#/admin/members">Members</a>.',
  '계획 세운 사람 {planned}/{total}명': 'Planned: {planned}/{total}',
  '밀림 {n}명': '{n} behind',
  '진도': 'Progress',
  '상태': 'Status',
  '아직 계획을 세우지 않았습니다': 'No plan yet',
  '진도 막대: 초록 = 실제 진도, 검정 선 = 오늘까지 권장 · 각자 정한 기간 기준입니다.': "Progress bar: green = actual progress, black line = target by today · Based on each person's own period.",
  '아직 목표를 만든 회원이 없습니다.': 'No members have created goals yet.',
  '우리 팀': 'Team',
  '목표 {n}개 · 진행 중 {active}개': (p) => `${plural(p.n, 'goal')} · ${p.active} in progress`,
  '목표': 'Goal',
  '회원들이 만든 모든 목표입니다. 목표를 누르면 날짜별 계획표를 볼 수 있습니다. (읽기 전용)': 'All goals created by members. Click a goal to see its daily plan. (Read-only)',
  '목표가 없는 회원: {names}': 'Members without goals: {names}',
  '목표를 찾을 수 없습니다. <a href="#/admin/plans">회원 계획</a>으로 돌아가세요.': 'Goal not found. Go back to <a href="#/admin/plans">Member plans</a>.',
  '{name}님의 계획': "{name}'s plan",
  '읽기 전용': 'Read-only',
  '필독서 수정': 'Edit required book',
  '필독서 추가': 'Add required book',
  '저장하면 이미 계획을 세운 팀원에게 "내용 변경됨"이 표시되고, 각자 미리보기를 확인한 뒤 자기 계획에 반영합니다.':
    'When you save, team members who already have a plan will see "Updated" and can apply the changes to their own plan after checking a preview.',
  '표지 이미지 선택': 'Choose cover image',
  '표지 빼기': 'Remove cover',
  'JPG·PNG·WEBP, 3MB 이하': 'JPG, PNG or WEBP, up to 3MB',
  '챕터': 'Chapters',
  '페이지': 'Pages',
  '계획 세운 팀원': 'Members planned',
  '{n}개': '{n}',
  '{planned}/{total}명': '{planned}/{total}',
  '내 계획 보기': 'View my plan',
  '내 계획 세우기': 'Make my plan',
  '아직 필독서가 없습니다.': 'No required books yet.',
  '여기서 정한 책 정보(제목·챕터·페이지)가 우리 팀 모두에게 공유됩니다. 기간은 각자 정합니다.': 'The book details set here (title, chapters, pages) are shared with the whole team. Everyone sets their own period.',
  '+ 필독서 추가': '+ Add required book',
  '표지 미리보기': 'Cover preview',
  '표지 없음': 'No cover',
  '아직 로그인한 사람이 없습니다.': 'No one has signed in yet.',
  '앱에 한 번이라도 로그인한 사람들입니다. <b>우리 팀</b>으로 지정하면 사역자 필독서가 보입니다. (우리 팀 {n}명)':
    'Everyone who has signed in to the app at least once. People added to the <b>Team</b> can see the required reading. (Team: {n})',
  '이메일': 'Email',
  '처음 로그인': 'First sign-in',
  '마지막 접속': 'Last seen',
  '(나)': '(me)',
  '{name} 우리 팀 지정': 'Add {name} to the team',
  "'{title}' 필독서를 삭제할까요?\n팀원들이 이미 세운 계획은 지워지지 않고 일반 목표로 남습니다.": "Delete the required book '{title}'?\nPlans team members already made won't be deleted; they'll stay as regular goals.",
  '삭제하지 못했습니다: {message}': 'Could not delete: {message}',
  '표지 이미지는 3MB 이하로 올려 주세요.': 'Please upload a cover image of 3MB or less.',
  '변경하지 못했습니다: {message}': 'Could not change: {message}',

  // 이미지로 내보내기
  '{n}개 챕터': (p) => plural(p.n, 'chapter'),
  '현재 진도': 'Current progress',
  '초록 = 실제 진도   |   검정 선 = 오늘까지 권장': 'Green = actual progress   |   Black line = target by today',
  '남은 공부일': 'Study days left',
  '학습 진도 계획표 · {date} ({weekday}) 기준': 'Study Planner · as of {date} ({weekday})',
  '매일 들을 분량': 'Daily listening plan',
  '매일 읽을 분량': 'Daily reading plan',
  '오늘부터': 'From today',
  '전체 기간': 'Whole period',
  '닫기': 'Close',
  '그리는 중…': 'Drawing…',
  '이미지 복사': 'Copy image',
  'PNG 저장': 'Save PNG',
  '내보낼 이미지 미리보기': 'Preview of the image to export',
  '{title}-계획표-{date}.png': '{title}-plan-{date}.png',
  '저장했습니다.': 'Saved.',
  '복사했습니다. 카톡 등에 붙여넣기 하세요.': 'Copied. Paste it into a chat or message.',
  '이 브라우저에서는 복사할 수 없습니다. PNG 저장을 이용하세요.': "This browser can't copy images. Use Save PNG instead.",
};

/* =========================================================================
 * 시작
 * ========================================================================= */

async function boot() {
  const root = document.getElementById('app');
  // 주소 끝에 ?selftest 를 붙이면 계산 검증 결과를 콘솔에 출력
  if (location.search.includes('selftest')) runPlanSelfTests();
  applyLanguage(detectInitialLang());
  // 언어 전환 버튼 (상단 바 · 로그인 화면)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (btn) changeLanguage(btn.dataset.lang);
  });

  if (!window.supabase) {
    renderMessageScreen(root, t('연결할 수 없습니다'),
      `<p class="errors">${t('로그인 기능을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.')}</p>`);
    return;
  }
  window.addEventListener('hashchange', render);
  document.getElementById('topbar').addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'retry-save') retrySave();
    if (action === 'sign-out') {
      if (pendingSaves > 0 && !confirm(t('아직 저장 중입니다. 그래도 로그아웃할까요?'))) return;
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
