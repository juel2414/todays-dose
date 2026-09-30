'use strict';

/* =========================================================================
 * 오늘분량 (Today's Dose) — app.js
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
    document.title = t('오늘분량');
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

/**
 * 하루 perDay씩(여유 있는 날은 배수만큼) 하면 total을 끝내는 날.
 * 쉬는 요일·쉬는 날은 건너뛴다. 10년 안에 못 끝나면 null.
 */
function dueDateForPace(startDate, total, perDay, restWeekdays = [], restDates = [], extraDates = []) {
  if (!isValidDateStr(startDate) || !(total > 0) || !(perDay > 0)) return null;
  const rest = restDateList(restDates);
  const weights = Object.fromEntries((extraDates || []).map((x) => [x.date, x.weight]));
  let done = 0;
  let date = startDate;
  for (let i = 0; i < 3660; i++) {
    if (!isRestDate(date, restWeekdays, rest)) {
      done += perDay * (weights[date] || 1);
      if (done >= total - 1e-9) return date;
    }
    date = addDays(date, 1);
  }
  return null;
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
  custom: ['custom'],
};

const TYPE_LABELS = { book: '책', lecture: '강의', bible: '성경 통독', custom: '기타' };

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
  if (basis === 'custom') return goal.custom.total;
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
  if (goal.type === 'custom') return { min: 0, max: goal.custom.total };
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
    // 이미 읽은 곳이 있으면 그 다음부터 나눈다 (없으면 0)
    const total = getTotalUnits(goal, basis);
    plans[basis] = {
      original: createGoalPlan(goal, goal.startDate, Math.min(getDoneUnits(goal, basis), total), total),
      current: null,
    };
  }
  return plans;
}

function createBookGoal({ title, startDate, dueDate, restWeekdays = [], restDates = [], extraDates = [], chapters, lastPage, author = '', requiredBookId = null, readPage = null }) {
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
  // (선택) 이미 읽은 곳: 마지막으로 읽은 페이지
  const read = Number(readPage);
  if (readPage !== null && readPage !== '' && Number.isInteger(read) && read >= bookFirstPage(goal.book) && read <= goal.book.lastPage) {
    goal.progress.current = read;
    goal.progress.history.push({ date: todayStr(), value: read });
  }
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

/** 기타 목록 정리: 항목 이름이 있으면 그 개수가 전체, 없으면 입력한 개수 */
function normalizeCustom({ customUnit, customTotal, customItems = [] }) {
  const items = customItems.map((x) => String(x).trim()).filter(Boolean);
  return {
    unit: String(customUnit || '').trim(),
    items,
    total: items.length ? items.length : Number(customTotal),
  };
}

function createCustomGoal({ title, startDate, dueDate, restWeekdays = [], restDates = [], extraDates = [], ...rest }) {
  const now = new Date().toISOString();
  const goal = {
    id: generateId(),
    type: 'custom',
    title: title.trim(),
    startDate,
    dueDate,
    restWeekdays: normalizeWeekdays(restWeekdays),
    restDates: normalizeRestDates(restDates),
    extraDates: normalizeExtraDates(extraDates),
    createdAt: now,
    updatedAt: now,
    custom: normalizeCustom(rest),
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
  if (input.type === 'custom') return createCustomGoal(input);
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
  const errors = [...validateCommonInput(input), ...validateBookStructure(input)];
  // (선택) 마지막으로 읽은 페이지
  if (input.readPage !== undefined && input.readPage !== null && input.readPage !== '' && !Number.isNaN(input.readPage)) {
    const read = Number(input.readPage);
    const first = input.chapters && input.chapters[0] ? Number(input.chapters[0].startPage) : NaN;
    const last = Number(input.lastPage);
    if (!Number.isInteger(read) || (Number.isInteger(first) && read < first) || (Number.isInteger(last) && read > last)) {
      errors.push(t('마지막으로 읽은 페이지는 {a}~{b} 사이로 입력하세요. 처음부터 읽을 거면 비워 두세요.', {
        a: Number.isInteger(first) ? first : 1, b: Number.isInteger(last) ? last : '…',
      }));
    }
  }
  return errors;
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
  if (input.type === 'custom') return validateCustomInput(input);
  return validateLectureInput(input);
}

function validateCustomInput(input) {
  const errors = validateCommonInput(input);
  const c = normalizeCustom(input);
  if (!c.unit) errors.push(t('단위 이름을 입력하세요. (예: 문제, 과제, 단원)'));
  if (!Number.isInteger(c.total) || c.total < 1) errors.push(t('전체 개수를 1 이상의 정수로 입력하거나 항목 목록을 적어 주세요.'));
  else if (c.total > 10000) errors.push(t('전체 개수는 10000개까지 입력할 수 있습니다.'));
  return errors;
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

/** 기타 범위: 이름 목록이 있으면 "첫 항목 ~ 끝 항목", 없으면 "12~15번" / "#12–15" */
function describeCustomRange(goal, from, to) {
  if (to - from === 1) return customItemLabel(goal, to);
  if (goal.custom.items.length) return `${customItemLabel(goal, from + 1)} ~ ${customItemLabel(goal, to)}`;
  return t('{from}~{to}번', { from: from + 1, to });
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
  if (goal.type === 'custom') {
    const c = normalizeCustom(input);
    return c.total !== goal.custom.total || JSON.stringify(c.items) !== JSON.stringify(goal.custom.items);
  }
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
  } else if (goal.type === 'custom') {
    goal.custom = normalizeCustom(input);
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
  useUnitOf(goal);
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
    customUnit: goal.type === 'custom' ? goal.custom.unit : '',
    customTotal: goal.type === 'custom' ? goal.custom.total : NaN,
    customItems: goal.type === 'custom' ? [...goal.custom.items] : [],
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

const UNIT_LABELS = { page: '페이지', chapter: '챕터', lecture: '강', bible: '장', custom: '개' };
const UNIT_LABELS_EN = { page: ['page', 'pages'], chapter: ['chapter', 'chapters'], lecture: ['lecture', 'lectures'], bible: ['chapter', 'chapters'], custom: ['item', 'items'] };

/**
 * 기타 목표의 단위 이름 (사용자가 정한 "문제", "과제" 등).
 * 화면 그리기는 목표 하나씩 동기적으로 진행되므로, 그 목표를 그리기 직전에 useUnitOf(goal)로 지정한다.
 */
let customUnitName = '';
function useUnitOf(goal) {
  customUnitName = goal && goal.type === 'custom' && goal.custom ? goal.custom.unit : '';
}

/** 단위 이름. 영어는 n에 맞춰 단수/복수 (n을 안 주면 복수) */
function getUnitLabel(basis, n) {
  if (basis === 'custom' && customUnitName) return customUnitName;
  if (currentLang === 'en') return UNIT_LABELS_EN[basis][n === 1 ? 0 : 1];
  return UNIT_LABELS[basis];
}

/** 분량 표시: "35페이지" / "35 pages" / 기타: "3문제" */
function formatAmount(n, basis) {
  return currentLang === 'en' ? `${n} ${getUnitLabel(basis, n)}` : `${n}${getUnitLabel(basis)}`;
}

/** 기타 항목 이름: 목록이 있으면 그 이름, 없으면 "12번" / "#12" */
function customItemLabel(goal, n) {
  const name = goal.custom.items[n - 1];
  return name || t('{n}번', { n });
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
  useUnitOf(goal);
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
  useUnitOf(goal);
  if (basis === 'page') {
    const a = unitsToPage(goal.book, from + 1);
    const b = unitsToPage(goal.book, to);
    return a === b ? `p.${a}` : `p.${a}~${b}`;
  }
  if (basis === 'chapter') {
    return getChapterRanges(goal.book).slice(from, to).map((c) => c.name).join(', ');
  }
  if (basis === 'bible') return describeBibleRange(goal.bible, from, to);
  if (basis === 'custom') return describeCustomRange(goal, from, to);
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
  useUnitOf(goal);
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
  if (book && book.coverUrl) return book.coverUrl;
  const item = groupItemForGoal(goal);
  return item && item.coverUrl ? item.coverUrl : null;
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

/* ----- 계정 · 사역자 필독서 ----- */

const PROFILES_TABLE = 'study_planner_profiles';
const REQUIRED_BOOKS_TABLE = 'study_planner_required_books';

/** 로그인할 때마다 프로필 갱신 + 관리자 여부 확인 → { isAdmin, language } */
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

const LIBRARY_COLUMNS = 'id, title, author, cover_url, chapters, last_page, created_at, updated_at, status, team_required, is_public, '
  + 'submitted_by, submitted_goal_id, merged_into, review_note';
const ASSIGNMENTS_TABLE = 'study_planner_book_assignments';

function rowToRequiredBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author || '',
    coverUrl: row.cover_url || null,
    chapters: row.chapters,
    lastPage: row.last_page,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at,
    status: row.status || 'approved',
    teamRequired: !!row.team_required,
    isPublic: !!row.is_public,
    submittedBy: row.submitted_by || null,
    submittedGoalId: row.submitted_goal_id || null,
    mergedInto: row.merged_into || null,
    reviewNote: row.review_note || '',
  };
}

/** 도서관의 책 전체 (RLS로 볼 수 있는 행만: 관리자는 전부, 회원은 승인된 공개·필독서·배정 + 내가 제출한 책) */
async function loadLibraryRows() {
  const { data, error } = await getSupabase().from(REQUIRED_BOOKS_TABLE)
    .select(LIBRARY_COLUMNS).order('created_at');
  if (error) throw error;
  return data.map(rowToRequiredBook);
}

/** 나에게 배정된 책 id 목록 */
async function loadMyAssignments() {
  const { data, error } = await getSupabase().from(ASSIGNMENTS_TABLE)
    .select('book_id').eq('user_id', currentUser.id);
  if (error) throw error;
  return data.map((r) => r.book_id);
}

/** 도서관 행 목록을 화면용 상태로 나눈다 (승인된 책 / 내가 제출한 책) */
function setLibraryRows(rows) {
  libraryRows = rows;
  requiredBooks = rows.filter((b) => b.status === 'approved');
  mySubmissions = currentUser ? rows.filter((b) => b.submittedBy === currentUser.id) : [];
}

/** 도서관 · 배정 정보를 불러와 상태에 반영 */
async function loadLibrary() {
  const [rows, assigned] = await Promise.all([loadLibraryRows(), loadMyAssignments()]);
  myAssignedBookIds = new Set(assigned);
  setLibraryRows(rows);
}

/** 내가 만든 책 목표를 도서관에 검토 요청 (실패해도 목표 만들기는 그대로) */
async function submitGoalToLibrary(goal) {
  try {
    if (!goal || goal.type !== 'book' || goal.requiredBookId || !currentUser) return;
    if (mySubmissions.some((b) => b.submittedGoalId === goal.id)) return;
    const row = {
      status: 'pending',
      submitted_by: currentUser.id,
      submitted_goal_id: goal.id,
      title: goal.title.trim(),
      author: getBookAuthor(goal) || null,
      chapters: goal.book.chapters.map((c) => ({ name: c.name, startPage: c.startPage })),
      last_page: goal.book.lastPage,
      team_required: false,
      is_public: false,
    };
    const { data, error } = await getSupabase().from(REQUIRED_BOOKS_TABLE).insert(row).select(LIBRARY_COLUMNS).single();
    if (error) throw error;
    setLibraryRows([...libraryRows, rowToRequiredBook(data)]);
  } catch (err) {
    console.warn('[library] 도서관 제출 실패:', err);
  }
}

/** 검토 대기 중인 제출본이 내 목표의 지금 책 내용(제목·저자·목차·마지막 페이지)과 다른지 */
function submissionNeedsSync(goal, sub) {
  return !!goal && goal.type === 'book' && sub.status === 'pending' && (
    goal.title.trim() !== String(sub.title || '').trim()
    || getBookAuthor(goal) !== String(sub.author || '').trim()
    || bookSignature(goal.book.chapters, goal.book.lastPage) !== bookSignature(sub.chapters || [], sub.lastPage));
}

let syncingSubmissions = false;

/** 검토 대기 중인 내 제출본을 목표의 지금 내용으로 맞춘다 (승인·반려 뒤에는 바꾸지 않는다) */
async function syncPendingSubmissions() {
  if (syncingSubmissions || !currentUser) return;
  syncingSubmissions = true;
  try {
    for (const sub of mySubmissions) {
      const goal = getGoal(sub.submittedGoalId);
      if (!submissionNeedsSync(goal, sub)) continue;
      const { data, error } = await getSupabase().rpc('study_planner_update_submission', {
        p_goal_id: goal.id,
        p_title: goal.title.trim(),
        p_author: getBookAuthor(goal),
        p_chapters: goal.book.chapters.map((c) => ({ name: c.name, startPage: Number(c.startPage) })),
        p_last_page: goal.book.lastPage,
      });
      if (error) throw error;
      // 그사이 관리자가 검토했으면 결과가 비어 온다 → 다음 로그인 때 새 상태를 받는다
      if (data && data.id) setLibraryRows(libraryRows.map((b) => (b.id === data.id ? rowToRequiredBook(data) : b)));
    }
  } catch (err) {
    console.warn('[library] 검토 대기 제출본 수정 실패:', err);
  } finally {
    syncingSubmissions = false;
  }
}

/**
 * 검토가 끝난 내 제출을 목표와 연결할 목록 → [{ goalId, bookId }]
 *  승인됨 → 제출한 책 / 기존 책과 연결됨 → 그 책. 읽을 수 없는 책(books에 없음)이나 이미 연결된 목표는 건너뛴다.
 */
function planSubmissionLinks(goals, submissions, books) {
  const links = [];
  const taken = new Set(goals.map((g) => g.requiredBookId).filter(Boolean));
  submissions.forEach((sub) => {
    const goal = goals.find((g) => g.id === sub.submittedGoalId);
    if (!goal || goal.type !== 'book' || goal.requiredBookId) return;
    const bookId = sub.status === 'approved' ? sub.id : sub.status === 'merged' ? sub.mergedInto : null;
    if (!bookId || taken.has(bookId) || !books.some((b) => b.id === bookId && b.status === 'approved')) return;
    taken.add(bookId);
    links.push({ goalId: goal.id, bookId });
  });
  return links;
}

/** 앱을 열 때: 검토가 끝난 제출을 내 목표와 연결 */
function linkReviewedSubmissions() {
  const links = planSubmissionLinks(appData.goals, mySubmissions, requiredBooks);
  links.forEach(({ goalId, bookId }) => { getGoal(goalId).requiredBookId = bookId; });
  if (links.length) commit();
  return links.length;
}

/** 이 목표로 도서관에 제출한 기록 (없으면 null) */
function findSubmissionForGoal(goalId) {
  return mySubmissions.find((b) => b.submittedGoalId === goalId) || null;
}

/** 책이 나에게 어떤 책인지: 'assigned'(배정) | null  (필독서는 그룹 공유 목표로 대신한다) */
function bookTagKind(book) {
  if (!book) return null;
  if (myAssignedBookIds.has(book.id)) return 'assigned';
  return null;
}

function renderBookTag(kind) {
  if (kind === 'assigned') return `<span class="type-tag type-assigned">${t('배정')}</span>`;
  return '';
}

/** 목표가 연결된 도서관 책 (없으면 null) */
function libraryBookForGoal(goal) {
  return goal && goal.requiredBookId ? requiredBooks.find((b) => b.id === goal.requiredBookId) || null : null;
}

/** 제목 비교용: 소문자, 공백·문장부호 제거 */
function normalizeBookTitle(title) {
  return String(title || '').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}

/** 비슷한 제목인지 (같거나, 두 글자 이상이 한쪽에 포함) */
function isSimilarBookTitle(a, b) {
  const x = normalizeBookTitle(a);
  const y = normalizeBookTitle(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 2 && long.includes(short);
}

/**
 * 목차 글을 챕터 목록으로 → [{ name, startPage|null }]
 *  줄 끝의 페이지: "····· 23", ".... 23", "… 23", 탭, " - 23", "(23)", "p.23", "23쪽"
 *  숫자만 있는 줄은 무시한다.
 */
function parseTocText(text) {
  const chapters = [];
  String(text || '').split(/\r?\n/).forEach((raw) => {
    const line = raw.replace(/ /g, ' ').trim();
    if (!line) return;
    if (/^(?:p\.?\s*)?\d+\s*(?:쪽|페이지|p)?$/i.test(line)) return;
    let name = line;
    let startPage = null;
    // 1) 뚜렷한 구분: 점선·탭·대시·괄호·p.·쪽
    let m = line.match(/^(.*?\S)\s*(?:[.·…‥・•_]{2,}|…|‥|\t+|\s[-–—:]\s?|\s*[-–—]{2,})\s*(?:p\.?\s*)?(\d{1,4})\s*(?:쪽|페이지)?$/i)
      || line.match(/^(.*?\S)\s*[([]\s*(?:p\.?\s*)?(\d{1,4})\s*(?:쪽|페이지)?\s*[)\]]$/i)
      || line.match(/^(.*?\S)\s*(?:p\.|pp\.|p)\s*(\d{1,4})$/i)
      || line.match(/^(.*?\S)\s*(\d{1,4})\s*(?:쪽|페이지)$/);
    // 2) 공백 하나 + 숫자 ("1장 도입 23"). "Chapter 12"처럼 이름이 번호로 끝나는 경우는 제외
    if (!m) {
      const w = line.match(/^(.*\S)\s+(\d{1,4})$/);
      if (w && !/^(?:chapter|part|section|lesson|unit|step|day|제|부|장)$/i.test(w[1].trim())) m = w;
    }
    if (m) {
      name = m[1].replace(/[\s.·…‥・•_\-–—:]+$/, '').trim();
      startPage = Number(m[2]);
      if (!name) return;
    }
    chapters.push({ name: name.replace(/\s+/g, ' '), startPage });
  });
  return chapters;
}

/* 관리자 전용 — 서버에서도 RLS/함수로 관리자만 허용된다 */

async function adminLoadProfiles() {
  const { data, error } = await getSupabase().from(PROFILES_TABLE)
    .select('user_id, email, name, created_at, last_seen_at').order('created_at');
  if (error) throw error;
  return data;
}

/** 모든 그룹 · 멤버 · 공유 목표 → adminState */
async function adminLoadGroups() {
  const sb = getSupabase();
  const [groups, members, items] = await Promise.all([
    sb.from(GROUPS_TABLE).select('id, name, leader_id, invite_code, created_at').order('created_at'),
    sb.from(GROUP_MEMBERS_TABLE).select('group_id, user_id, joined_at').order('joined_at'),
    sb.from(GROUP_ITEMS_TABLE).select('id, group_id, type, title, content, cover_url, source_goal_id, updated_at').order('created_at'),
  ]);
  for (const res of [groups, members, items]) if (res.error) throw res.error;
  adminState.groups = groups.data;
  adminState.groupMembers = members.data;
  adminState.groupItems = items.data.map(rowToGroupItem).filter((i) => isValidShareContent(i.type, i.content));
}

/** 관리자: 그룹 한 곳의 사람들 (리더 포함 여부 선택) → 프로필 목록 */
function adminGroupPeople(groupId, withLeader = false) {
  const g = adminState.groups.find((x) => x.id === groupId);
  const ids = adminState.groupMembers.filter((m) => m.group_id === groupId).map((m) => m.user_id);
  if (withLeader && g) ids.unshift(g.leader_id);
  return [...new Set(ids)].map((id) => adminState.profiles.find((p) => p.user_id === id)
    || { user_id: id, name: '', email: t('알 수 없음') });
}

/** 관리자: 사람이 속한 그룹 이름들 (리더 포함) */
function adminGroupsOf(userId) {
  return adminState.groups.filter((g) => g.leader_id === userId
    || adminState.groupMembers.some((m) => m.group_id === g.id && m.user_id === userId));
}

/** 도서관 책 저장 (id가 없으면 새로 만들기) → 저장된 책. status를 주면 상태도 바꾼다 (검토 승인) */
async function adminSaveRequiredBook(book) {
  const row = {
    title: book.title.trim(),
    author: (book.author || '').trim() || null,
    cover_url: book.coverUrl || null,
    chapters: book.chapters.map((c) => ({ name: c.name.trim(), startPage: Number(c.startPage) })),
    last_page: Number(book.lastPage),
    is_public: !!book.isPublic,
    updated_at: new Date().toISOString(),
  };
  if (book.status) row.status = book.status;
  if (book.status === 'approved') row.review_note = null;
  const sb = getSupabase();
  const query = book.id
    ? sb.from(REQUIRED_BOOKS_TABLE).update(row).eq('id', book.id)
    : sb.from(REQUIRED_BOOKS_TABLE).insert({ status: 'approved', ...row });
  const { data, error } = await query.select(LIBRARY_COLUMNS).single();
  if (error) throw error;
  return rowToRequiredBook(data);
}

/** 제출된 책의 검토 상태만 바꾸기 (승인 · 반려 · 기존 책과 연결) → 바뀐 책 */
async function adminSetBookStatus(id, { status, reviewNote = null, mergedInto = null }) {
  const { data, error } = await getSupabase().from(REQUIRED_BOOKS_TABLE)
    .update({ status, review_note: reviewNote, merged_into: mergedInto, updated_at: new Date().toISOString() })
    .eq('id', id).select(LIBRARY_COLUMNS).single();
  if (error) throw error;
  return rowToRequiredBook(data);
}

/** 모든 배정 → [{ book_id, user_id }] */
async function adminLoadAssignments() {
  const { data, error } = await getSupabase().from(ASSIGNMENTS_TABLE).select('book_id, user_id');
  if (error) throw error;
  return data;
}

/** 책의 배정을 userIds로 맞춘다 (새로 넣고, 빠진 사람은 지움) → 최종 배정 목록 */
async function adminSyncAssignments(bookId, userIds) {
  const before = adminState.assignments.filter((a) => a.book_id === bookId).map((a) => a.user_id);
  const add = userIds.filter((id) => !before.includes(id));
  const remove = before.filter((id) => !userIds.includes(id));
  const sb = getSupabase();
  if (add.length) {
    const { error } = await sb.from(ASSIGNMENTS_TABLE).insert(add.map((user_id) => ({ book_id: bookId, user_id })));
    if (error) throw error;
  }
  if (remove.length) {
    const { error } = await sb.from(ASSIGNMENTS_TABLE).delete().eq('book_id', bookId).in('user_id', remove);
    if (error) throw error;
  }
  adminState.assignments = adminState.assignments.filter((a) => a.book_id !== bookId)
    .concat(userIds.map((user_id) => ({ book_id: bookId, user_id })));
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
  if ((goal.groupId !== undefined && (typeof goal.groupId !== 'string' || !/^[\w-]{1,64}$/.test(goal.groupId)))
    || (goal.groupItemId !== undefined && (typeof goal.groupItemId !== 'string' || !/^[\w-]{1,64}$/.test(goal.groupItemId)))) {
    return fail('그룹 연결 정보가 올바르지 않습니다.');
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
  } else if (goal.type === 'custom') {
    const c = goal.custom;
    if (!c || typeof c.unit !== 'string' || !Array.isArray(c.items) || !c.items.every((x) => typeof x === 'string')
      || !Number.isInteger(c.total) || c.total < 1 || (c.items.length && c.items.length !== c.total)) {
      return fail('기타 목표 정보가 올바르지 않습니다.');
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

  // 도서관: 목차 붙여넣기
  const toc = parseTocText('1장 도입 ····· 23\n2장 본론....45\n\n3장\t67\n4장 결론 - 89\n부록 (101)\n머리말 p.5\n맺음말 120쪽\n12\n들어가며\nChapter 12\n5장 끝…130');
  const tocPages = toc.map((c) => c.startPage);
  check('목차: 줄 수 (숫자만 있는 줄·빈 줄 제외)', toc.length === 10, JSON.stringify(toc));
  check('목차: 점선·탭·대시·괄호·p.·쪽 페이지 인식',
    JSON.stringify(tocPages.slice(0, 7)) === JSON.stringify([23, 45, 67, 89, 101, 5, 120]) && tocPages[9] === 130, tocPages.join(','));
  check('목차: 이름 정리', toc[0].name === '1장 도입' && toc[1].name === '2장 본론' && toc[3].name === '4장 결론' && toc[4].name === '부록'
    && toc[6].name === '맺음말' && toc[9].name === '5장 끝');
  check('목차: 페이지 없는 줄', toc[7].name === '들어가며' && toc[7].startPage === null
    && toc[8].name === 'Chapter 12' && toc[8].startPage === null);
  check('목차: 공백 + 숫자', parseTocText('1장 기도의 삶 35')[0].startPage === 35 && parseTocText('')?.length === 0);

  // 도서관: 비슷한 제목 · 검토 후 연결
  check('도서관: 비슷한 제목', isSimilarBookTitle('기도의 삶', '기도의  삶!') && isSimilarBookTitle('The Prayer Life', 'prayer life')
    && !isSimilarBookTitle('기도', '말씀') && !isSimilarBookTitle('', '말씀'));
  const g1 = createBookGoal({ title: 'x', startDate: '2026-10-01', dueDate: '2026-10-09', lastPage: 90, chapters: [{ name: 'a', startPage: 1 }] });
  const g2 = createBookGoal({ title: 'y', startDate: '2026-10-01', dueDate: '2026-10-09', lastPage: 90, chapters: [{ name: 'a', startPage: 1 }] });
  const g3 = createBookGoal({ title: 'z', startDate: '2026-10-01', dueDate: '2026-10-09', lastPage: 90, chapters: [{ name: 'a', startPage: 1 }] });
  const subs = [
    { id: 's1', status: 'approved', submittedGoalId: g1.id },
    { id: 's2', status: 'merged', mergedInto: 'lib1', submittedGoalId: g2.id },
    { id: 's3', status: 'merged', mergedInto: 'hidden', submittedGoalId: g3.id },
    { id: 's4', status: 'pending', submittedGoalId: 'none' },
  ];
  const libBooks = [{ id: 's1', status: 'approved' }, { id: 'lib1', status: 'approved' }];
  const links = planSubmissionLinks([g1, g2, g3], subs, libBooks);
  check('도서관: 승인·연결된 제출만 목표와 연결', links.length === 2
    && links[0].goalId === g1.id && links[0].bookId === 's1' && links[1].goalId === g2.id && links[1].bookId === 'lib1', JSON.stringify(links));
  g2.requiredBookId = 'lib1';
  check('도서관: 이미 연결된 목표는 건너뜀', planSubmissionLinks([g1, g2, g3], subs, libBooks).length === 1);
  check('도서관: 검색', filterLibraryBooks([{ title: '기도의 삶', author: '홍길동' }, { title: '말씀', author: '' }], '길동').length === 1);

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

  // 목차 사진 여러 장 합치기
  const merged = mergeTocResults([
    { chapters: [{ name: '1장', startPage: 1 }, { name: '2장', startPage: 30 }], lastPage: null },
    { chapters: [{ name: '2장', startPage: 30 }, { name: '3장', startPage: 60 }], lastPage: 120 },
  ]);
  check('목차 사진: 여러 장 합치기(겹침 제거)', merged.chapters.map((c) => c.name).join(',') === '1장,2장,3장' && merged.lastPage === 120);

  // 마지막으로 읽은 페이지(선택)
  const readGoal = createBookGoal({ title: 'r', startDate: '2026-10-01', dueDate: '2026-10-10', lastPage: 110,
    chapters: [{ name: '1장', startPage: 11 }, { name: '2장', startPage: 61 }], readPage: 60 });
  check('이미 읽은 곳: 남은 분량만 분배', readGoal.progress.current === 60 && getActivePlan(readGoal, 'page').from === 50
    && buildSchedule(getActivePlan(readGoal, 'page'))[0].amount === 5 && getActivePlan(readGoal, 'chapter').from === 1);
  check('이미 읽은 곳: 범위 밖 차단', validateBookInput({ title: 'x', startDate: '2026-10-01', dueDate: '2026-10-02', lastPage: 110,
    chapters: [{ name: '1장', startPage: 11 }], readPage: 200 }).length > 0);

  // 하루 분량으로 마감일 계산
  check('하루 분량: 100페이지를 하루 30씩 → 4일째', dueDateForPace('2026-10-01', 100, 30) === '2026-10-04');
  check('하루 분량: 쉬는 요일 건너뜀 (토·일)', dueDateForPace('2026-10-01', 100, 30, [0, 6]) === '2026-10-06');
  check('하루 분량: 여유 있는 날 2배', dueDateForPace('2026-10-01', 100, 30, [], [], [{ date: '2026-10-02', weight: 2 }]) === '2026-10-03');
  check('하루 분량: 0이면 계산 안 함', dueDateForPace('2026-10-01', 100, 0) === null);

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

  // 기타 종류
  const cg = createCustomGoal({ title: '수학 숙제', startDate: '2026-10-01', dueDate: '2026-10-05', customUnit: '문제', customTotal: 50 });
  useUnitOf(cg);
  check('기타: 개수로 만들기', getTotalUnits(cg, 'custom') === 50 && getActivePlan(cg, 'custom').to === 50 && formatAmount(10, 'custom') === '10문제');
  check('기타: 범위 표시(목록 없음)', describeCustomRange(cg, 10, 20) === '11~20번' && describeCustomRange(cg, 4, 5) === '5번');
  const cl = createCustomGoal({ title: '단어', startDate: '2026-10-01', dueDate: '2026-10-02', customUnit: '단원', customTotal: 99, customItems: ['1단원', ' ', '2단원', '3단원'] });
  check('기타: 목록이 있으면 줄 수가 전체', cl.custom.total === 3 && describeCustomRange(cl, 0, 2) === '1단원 ~ 2단원');
  check('기타: 검증(단위·개수 없음)', validateCustomInput({ title: 'x', startDate: '2026-10-01', dueDate: '2026-10-02', customUnit: '', customTotal: NaN }).length === 2);
  check('기타: 형식 검사 통과', checkGoalShape(cg, 0) === null && checkGoalShape(cl, 0) === null);
  applyGoalEdit(cg, { ...goalToInput(cg), customTotal: 60 }, '2026-09-30');
  check('기타: 수정하면 계획 다시 만듦', getTotalUnits(cg, 'custom') === 60 && getActivePlan(cg, 'custom').to === 60);
  useUnitOf(null);

  // 그룹 공유
  const src = createBookGoal({ title: '책', startDate: '2026-10-01', dueDate: '2026-10-09', chapters: [{ name: '1장', startPage: 1 }, { name: '2장', startPage: 11 }], lastPage: 20, author: '저자' });
  const shared = { id: 'item1', groupId: 'grp1', type: 'book', title: '책', content: JSON.parse(JSON.stringify({ lastPage: 20, chapters: [{ startPage: 1, name: '1장' }, { startPage: 11, name: '2장' }], author: '저자' })) };
  const mine = linkGoalToGroupItem(createGoalFromInput({ ...goalToInput(src), title: shared.title, ...shared.content, startDate: '2026-10-02', dueDate: '2026-10-20' }), shared);
  check('그룹: 키 순서가 달라도 같은 내용', !isGroupItemChanged(mine, shared) && !isSourceGoalChanged(shared, src));
  const shared2 = { ...shared, content: { ...shared.content, lastPage: 30 } };
  check('그룹: 리더 수정 감지', isGroupItemChanged(mine, shared2) && isSourceGoalChanged(shared2, src));
  applyGoalEdit(mine, inputFromGroupItem(mine, shared2), '2026-09-30');
  check('그룹: 적용하면 같아지고 날짜는 유지', !isGroupItemChanged(mine, shared2) && mine.dueDate === '2026-10-20' && mine.groupItemId === 'item1');
  check('그룹: 형식 검사', checkGoalShape(mine, 0) === null && isValidShareContent('book', shared.content)
    && isValidShareContent('custom', goalShareContent(cg)) && !isValidShareContent('lecture', { titles: [] }));

  // 예전 필독서 계획 → 그룹 공유 목표 연결
  const legacy = createBookGoal({ ...goalToInput(src), startDate: '2026-10-01', dueDate: '2026-10-09', requiredBookId: 'oldbook' });
  const savedGroups = [myGroups, groupItems];
  myGroups = [{ id: 'grp1', isLeader: false }];
  groupItems = [{ ...shared, content: goalShareContent(src) }];
  check('그룹: 예전 필독서 계획 자동 연결', linkLegacyRequiredGoals([legacy]) && legacy.groupItemId === 'item1' && !legacy.requiredBookId);
  [myGroups, groupItems] = savedGroups;

  const subGoal = createBookGoal({ title: '제출 책', startDate: '2026-10-01', dueDate: '2026-10-09', chapters: [{ name: '1장', startPage: 1 }], lastPage: 50 });
  const sub = { status: 'pending', title: '제출 책', author: '', chapters: [{ name: '1장', startPage: 1 }], lastPage: 50 };
  check('제출본: 같으면 수정 안 함', !submissionNeedsSync(subGoal, sub));
  check('제출본: 목차 바뀌면 수정', submissionNeedsSync(subGoal, { ...sub, lastPage: 60 }));
  check('제출본: 검토 끝나면 수정 안 함', !submissionNeedsSync(subGoal, { ...sub, lastPage: 60, status: 'rejected' }));

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
/** 관리자 여부 (로그인 때 서버에서 확인) */
let account = { isAdmin: false };
/** 도서관 — 볼 수 있는 모든 행 (관리자는 검토 대기 포함 전부) */
let libraryRows = [];
/** 승인된 도서관 책 (필독서 · 공개 · 배정 · 내가 제출해 승인된 책) */
let requiredBooks = [];
/** 내가 도서관에 제출한 책 (모든 상태) */
let mySubmissions = [];
/** 나에게 배정된 책 id */
let myAssignedBookIds = new Set();
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
      syncPendingSubmissions();
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

/** 상단 바 이름 메뉴(백업 내보내기·복원)가 열려 있는지 — 저장 상태가 바뀌어 다시 그려도 유지 */
let userMenuOpen = false;

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
        <a class="brand" href="#/"><img class="brand-logo" src="logo/symbol.svg" alt="" width="26" height="26">${t('오늘분량')}</a>
        <a class="nav-link" href="#/groups">${t('그룹')}</a>
        ${account.isAdmin ? `<a class="nav-link" href="#/admin">${t('관리자')}</a>` : ''}
      </nav>
      <div class="topbar-right">
        ${renderLangToggle()}
        ${status}
        ${account.isAdmin ? `
        <div class="user-menu">
          <button type="button" class="user-menu-btn" data-action="user-menu" aria-haspopup="true" aria-expanded="${userMenuOpen}">
            ${escapeHtml(name || currentUser.email || '')} <span aria-hidden="true">▾</span>
          </button>
          <div class="user-menu-list" ${userMenuOpen ? '' : 'hidden'}>
            <button type="button" data-action="backup-export" title="${t('모든 목표와 진도 기록을 JSON 파일로 저장합니다')}">${t('백업 내보내기')}</button>
            <button type="button" data-action="backup-import" title="${t('백업한 JSON 파일로 전체 데이터를 바꿉니다')}">${t('백업에서 복원')}</button>
            <input type="file" id="backup-file" accept=".json,application/json" hidden>
          </div>
        </div>` : `<span class="user">${escapeHtml(name || currentUser.email || '')}</span>`}
        <button type="button" class="btn btn-small" data-action="sign-out">${t('로그아웃')}</button>
      </div>
    </div>`;
}

/* ----- 로그인 · 시작 화면 ----- */

function renderMessageScreen(root, title, html, withLang = false) {
  document.body.classList.remove('is-landing');
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
  // 로그인 전 첫 화면 = 메인(랜딩) 페이지 (landing.js)
  renderLanding(root, {
    lang: currentLang,
    message: errorMessage
      || (isFile ? t('파일을 직접 연 상태에서는 로그인할 수 없습니다. 배포된 인터넷 주소(https://…)로 열어 주세요.') : ''),
    loginDisabled: isFile,
    onLang: (lang) => changeLanguage(lang),
    onLogin: async () => {
      try {
        await signInWithGoogle(); // 구글 로그인 페이지로 이동
      } catch (err) {
        throw new Error(t('로그인을 시작하지 못했습니다: {message}', { message: err.message }));
      }
    },
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
  } catch (err) {
    console.warn('[account] 팀 정보를 불러오지 못했습니다:', err);
    account = { isAdmin: false };
  }
  try {
    await loadLibrary();
  } catch (err) {
    console.warn('[library] 도서관을 불러오지 못했습니다:', err);
    myAssignedBookIds = new Set();
    setLibraryRows([]);
  }
  try {
    await loadGroups();
  } catch (err) {
    console.warn('[group] 그룹을 불러오지 못했습니다:', err);
    myGroups = [];
    groupItems = [];
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
  // 도서관 검토가 끝난 내 책 목표는 도서관 책과 연결 (관리자가 고친 내용은 상세 화면에서 적용 여부를 묻는다)
  linkReviewedSubmissions();
  if (linkLegacyRequiredGoals()) commit();
  // 로그인 전에 초대 링크로 들어왔으면 그 화면으로
  const pendingJoin = takePendingJoin();
  if (pendingJoin && location.hash !== pendingJoin) { location.hash = pendingJoin; return; }
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
  if (name === 'new' && id === 'group' && sub) return { view: 'form', groupItemId: sub };
  if (name === 'groups') return { view: 'groups' };
  if (name === 'join' && id) return { view: 'join', code: id };
  if (name === 'group' && id && sub === 'member' && sub2) {
    const [, , , , goalId] = location.hash.replace(/^#\/?/, '').split('/');
    return { view: 'group', groupId: id, userId: sub2, goalId };
  }
  if (name === 'group' && id) return { view: 'group', groupId: id };
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
  document.body.classList.remove('is-landing');
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
  } else if (route.view === 'form') renderGoalForm(root, goal, route.bookId || null, route.groupItemId || null);
  else if (route.view === 'groups') renderGroups(root);
  else if (route.view === 'join') renderJoinGroup(root, route.code);
  else if (route.view === 'group') renderGroupPage(root, route);
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
  // 필독서·배정된 책으로 만든 목표는 위쪽 영역에 따로 보여준다
  const myBooks = getMyLibraryBooks();
  const showRequired = myBooks.length > 0;
  const linkedIds = new Set(myBooks.map((b) => findGoalForBook(appData.goals, b.id)).filter(Boolean).map((g) => g.id));
  const items = appData.goals.filter((g) => !linkedIds.has(g.id))
    .map((goal) => ({ goal, s: getGoalSummary(goal, undefined, today) }));
  const active = items.filter((x) => x.s.isActive)
    .sort((a, b) => diffDays(b.goal.dueDate, a.goal.dueDate));
  const finished = items.filter((x) => !x.s.isActive)
    .sort((a, b) => diffDays(a.goal.dueDate, b.goal.dueDate));

  root.innerHTML = `
    <header class="page-header">
      <div>
        <h1>${t('오늘분량')}</h1>
        <p class="muted">${escapeHtml(today)} (${weekdayLabel(today)})</p>
      </div>
      <div class="header-actions">
        <a class="btn btn-primary" href="#/new">${t('+ 새 목표 추가')}</a>
      </div>
    </header>

    ${showRequired ? renderRequiredSection(today, myBooks) : ''}
    ${renderGroupInbox()}

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

/** 대시보드 위쪽에 보여줄 책: 나에게 배정된 책 */
function getMyLibraryBooks() {
  return requiredBooks.filter((b) => bookTagKind(b) !== null);
}

function renderRequiredSection(today, books) {
  const cards = books.map((book) => {
    const goal = findGoalForBook(appData.goals, book.id);
    if (goal) return renderGoalCard(goal, getGoalSummary(goal, undefined, today));
    const pages = book.lastPage - book.chapters[0].startPage + 1;
    return `
      <div class="goal-card required-empty">
        <div class="card-top">
          ${renderBookTag(bookTagKind(book))}
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
      <h2 class="section-title">${t('배정된 책')} <span class="count">${books.length}</span></h2>
      <div class="card-grid">${cards}</div>
    </section>`;
}

/** 표지 썸네일 (size: 'sm' | 'md' | 'lg') */
function renderCoverThumb(url, size = 'md') {
  if (!url) return '';
  return `<img class="cover cover-${size}" src="${escapeHtml(url)}" alt="" loading="lazy">`;
}

/** 목표 카드. 도서관 책과 연결돼 있으면 표지 · 필독서/배정 표시 · 변경 알림 */
function renderGoalCard(goal, s) {
  useUnitOf(goal);
  const requiredBook = libraryBookForGoal(goal);
  const tagKind = bookTagKind(requiredBook);
  const groupItem = groupItemForGoal(goal);
  const changed = (requiredBook && isRequiredBookChanged(goal, requiredBook)) || (groupItem && isGroupItemChanged(goal, groupItem));
  return `
    <a class="goal-card ${s.isActive ? '' : 'is-finished'}" href="#/goal/${escapeHtml(goal.id)}">
      <div class="card-top">
        <span class="card-tags">
          ${tagKind ? renderBookTag(tagKind) : goal.groupId ? renderSharedTag(goal.type) : `<span class="type-tag type-${goal.type}">${typeLabel(goal.type)}</span>`}
          ${goal.groupId && groupNameOf(goal.groupId) ? `<span class="type-tag type-group">${escapeHtml(groupNameOf(goal.groupId))}</span>` : ''}
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
  useUnitOf(goal);
  if (s.isComplete) return `<span class="today-main">${t('모두 완료했습니다')}</span>`;
  if (s.isOverdue) return `<span class="today-main">${t('마감일이 지났습니다')}</span>`;
  if (s.notStarted) return `<span class="today-main">${t('{date} 시작', { date: formatShortDate(goal.startDate) })}</span>`;
  const row = s.todayRow;
  if (!row) return '<span class="today-main">-</span>';
  if (row.isRestDay) return `<span class="today-main">${t('오늘은 {rest}', { rest: escapeHtml(restText(goal, row.date)) })}</span>`;
  if (row.amount === 0) return `<span class="today-main">${t('휴식(분량 없음)')}</span>`;

  const doneToday = s.done >= row.cumulative;
  // 오늘 분량 중 일부를 이미 읽었으면(전날 더 읽었거나 오늘 조금 읽음) 남은 부분만 보여준다
  const partial = !doneToday && s.done > row.prevCumulative;
  const from = partial ? s.done : row.prevCumulative;
  let sub = '';
  if (s.basis === 'page') {
    sub = describeChaptersForPages(goal.book, unitsToPage(goal.book, from + 1),
      unitsToPage(goal.book, row.cumulative));
  }
  return `
    <span class="today-main">${escapeHtml(describeUnitsRange(goal, s.basis, from, row.cumulative))}
      <span class="muted">(${partial
        ? t('{left} 남음 · 오늘 분량 {amount}', { left: formatAmount(row.cumulative - from, s.basis), amount: formatAmount(row.amount, s.basis) })
        : formatAmount(row.amount, s.basis)})</span>
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

function renderGoalForm(root, goal, bookId = null, groupItemId = null) {
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
  // 그룹에서 공유된 목표로 계획 세우기: 이름·내용은 리더가 공유한 것을 쓰고 잠근다
  const groupItem = groupItemId ? groupItems.find((i) => i.id === groupItemId) : groupItemForGoal(goal);
  if (groupItemId) {
    if (!groupItem) { navigate('#/groups'); return; }
    const existing = findGoalForGroupItem(appData.goals, groupItemId);
    if (existing) { navigate(`#/goal/${existing.id}`); return; }
  }
  const locked = !!requiredBook || !!groupItem;
  const type = goal ? goal.type : groupItem ? groupItem.type : (langDraft && langDraft.type) || 'book';
  const started = isEdit && hasGoalStarted(goal);
  // 미리보기에서 "수정으로 돌아가기"를 누르면 입력하던 값(draft)으로 다시 채운다
  const draft = langDraft || (isEdit && detailState.draft && detailState.goalId === goal.id ? detailState.draft : null);
  detailState.draft = null;
  const v = draft || (goal ? goalToInput(goal) : {
    title: '', startDate: todayStr(), dueDate: '', restWeekdays: [], restDates: [], extraDates: [],
    chapters: [{ name: '', startPage: '' }], lastPage: '', titles: [], bibleStart: 0, bibleEnd: 65,
    customUnit: '', customTotal: NaN, customItems: [],
  });
  if (bookId) {
    Object.assign(v, { title: requiredBook.title, author: requiredBook.author || '', chapters: requiredBook.chapters, lastPage: requiredBook.lastPage });
  }
  if (groupItemId && !langDraft) Object.assign(v, { title: groupItem.title }, groupItem.content);

  root.innerHTML = `
    <header class="page-header">
      <div>
        <a class="back-link" href="${isEdit ? `#/goal/${escapeHtml(goal.id)}` : '#/'}">← ${isEdit ? t('목표 상세') : t('대시보드')}</a>
        <h1>${isEdit ? t('목표 수정') : bookId ? t('도서관 책으로 계획 세우기') : t('새 목표 추가')}</h1>
      </div>
    </header>

    <form id="goal-form" class="panel ${locked ? 'is-locked' : ''}" novalidate>
      ${requiredBook ? `<p class="notice notice-info">${t('도서관에 있는 책입니다. 책 제목과 챕터는 관리자가 정하며, 여기서는 시작일·마감일·쉬는 요일만 정할 수 있습니다.')}</p>` : ''}
      ${groupItem && !requiredBook ? `<p class="notice notice-info">${t("'{group}' 그룹의 {kind}입니다. 이름과 내용은 리더가 정하며, 여기서는 시작일·마감일·쉬는 요일만 정할 수 있습니다.", { group: escapeHtml(groupNameOf(groupItem.groupId)), kind: t(sharedKindOf(groupItem.type).label) })}</p>` : ''}
      ${started ? `<p class="notice">${t('진행 중인 목표입니다. 날짜·쉬는 요일·챕터·강의 목록을 바꾸면 원래 계획은 보관하고, 오늘부터 마감일까지 남은 분량을 다시 나눕니다. 저장하면 새 계획을 먼저 미리보기로 보여드립니다.')}</p>` : ''}

      <div class="field">
        <span class="field-label">${t('종류')}</span>
        <div class="segmented">
          <label><input type="radio" name="type" value="book" ${type === 'book' ? 'checked' : ''} ${isEdit || locked ? 'disabled' : ''}> ${typeLabel('book')}</label>
          <label><input type="radio" name="type" value="lecture" ${type === 'lecture' ? 'checked' : ''} ${isEdit || locked ? 'disabled' : ''}> ${typeLabel('lecture')}</label>
          <label><input type="radio" name="type" value="bible" ${type === 'bible' ? 'checked' : ''} ${isEdit || locked ? 'disabled' : ''}> ${typeLabel('bible')}</label>
          <label><input type="radio" name="type" value="custom" ${type === 'custom' ? 'checked' : ''} ${isEdit || locked ? 'disabled' : ''}> ${typeLabel('custom')}</label>
        </div>
      </div>

      ${!isEdit && !locked && account.isAdmin ? `
      <div data-section="book-pick">
        <div class="library-pick">
          <button type="button" class="btn" data-action="library-open">${t('도서관에서 고르기')}</button>
          <span class="field-hint">${t('도서관에 있는 책을 고르면 제목과 챕터를 입력하지 않아도 됩니다.')}</span>
        </div>
        <div id="library-picker" class="library-picker" hidden></div>
      </div>` : ''}

      ${!isEdit && !locked ? `
      <div data-section="book-search" class="book-search">
        <div class="book-search-row">
          <input id="f-book-q" type="search" class="input" placeholder="${t('책 제목이나 ISBN으로 찾기')}" aria-label="${t('책 검색')}">
          <button type="button" class="btn" data-action="book-search">${t('책 검색')}</button>
          <span class="field-hint">${t('국립중앙도서관 정보로 제목·저자·마지막 페이지를 채우고, 목차가 있으면 챕터도 채워요.')}</span>
        </div>
        <div id="book-search-results" class="book-search-results" hidden></div>
      </div>` : ''}

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
      ${isEdit ? '' : `<div class="plan-mode">
        <div class="segmented segmented-small" role="radiogroup" aria-label="${t('기간 정하는 방법')}">
          <label><input type="radio" name="plan-mode" value="due" checked> ${t('마감일로 정하기')}</label>
          <label><input type="radio" name="plan-mode" value="pace"> ${t('하루 분량으로 정하기')}</label>
        </div>
        <div class="pace-row" id="pace-row" hidden>
          <span>${t('하루')}</span>
          <input id="f-pace" type="number" min="1" class="input input-num" placeholder="20">
          <span id="f-pace-unit"></span>
          <span>${t('씩 하면')}</span>
          <strong id="f-pace-result" class="pace-result">-</strong>
        </div>
      </div>`}
      <div class="quick-due" id="quick-due">
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
        ${isEdit ? '' : `
        <div class="field">
          <label class="field-label" for="f-read-page">${t('마지막으로 읽은 페이지')} <span class="muted">${t('(선택 · 이미 읽기 시작한 책이면 입력)')}</span></label>
          <div class="read-page-row">
            <input id="f-read-page" type="number" min="1" class="input input-num" value="${v.readPage ? escapeHtml(v.readPage) : ''}" placeholder="${t('예: 42')}">
            <span id="f-read-hint" class="field-hint">${t('비워 두면 처음부터 읽는 것으로 계획합니다.')}</span>
          </div>
        </div>`}
      </div>

      <div data-section="lecture">
        <div class="field">
          <label class="field-label" for="f-lectures">${t('강의 제목 목록')} <span class="muted">${t('(한 줄에 하나, 빈 줄은 무시)')}</span></label>
          <textarea id="f-lectures" class="input textarea" rows="12">${escapeHtml(v.titles.join('\n'))}</textarea>
          <span id="f-lecture-count" class="field-hint"></span>
        </div>
      </div>

      <div data-section="custom">
        <p class="field-hint custom-intro">${t('숙제, 문제집, 단어 암기처럼 개수로 셀 수 있는 것이면 무엇이든 계획할 수 있어요.')}</p>
        <div class="field-row">
          <div class="field">
            <label class="field-label" for="f-custom-unit">${t('단위 이름')}</label>
            <input id="f-custom-unit" class="input" type="text" maxlength="10" value="${escapeHtml(v.customUnit || '')}" placeholder="${t('예: 문제, 과제, 단원, 단어')}">
            <div class="custom-unit-presets">
              ${['문제', '과제', '단원', '단어', '개'].map((u) => `<button type="button" class="btn btn-small" data-custom-unit="${escapeHtml(t(u))}">${escapeHtml(t(u))}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="f-custom-total">${t('전체 개수')}</label>
            <input id="f-custom-total" class="input" type="number" min="1" step="1" value="${Number.isInteger(v.customTotal) ? v.customTotal : ''}">
            <span id="f-custom-total-hint" class="field-hint"></span>
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="f-custom-items">${t('항목 목록')} <span class="muted">${t('(선택 · 한 줄에 하나)')}</span></label>
          <textarea id="f-custom-items" class="input textarea" rows="8" placeholder="${t('적으면 계획표에 항목 이름이 나오고, 줄 수가 전체 개수가 됩니다.')}">${escapeHtml((v.customItems || []).join('\n'))}</textarea>
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
  if (locked) lockSharedContentInputs(root);
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
    if (e.target.name === 'plan-mode') {
      if (e.target.value === 'pace') form.querySelector('#f-pace').focus();
      updateFormView();
    }
  });
  form.addEventListener('input', updateFormView);
  bindChapterEditor(form, updateFormView);
  bindBookSearch(form, updateFormView);
  bindLibraryPicker(form);
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
    const unitPreset = e.target.closest('[data-custom-unit]')?.dataset.customUnit;
    if (unitPreset) {
      form.querySelector('#f-custom-unit').value = unitPreset;
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
    submitGoalForm(goal, requiredBook && !goal ? requiredBook.id : null, groupItemId && !goal ? groupItemId : null);
  });
  updateFormView();
}

/* ----- 도서관에서 고르기 (새 책 목표) ----- */

/** 고를 수 있는 도서관 책 (검색어: 제목·저자) */
function filterLibraryBooks(books, query) {
  const q = normalizeBookTitle(query);
  if (!q) return books;
  return books.filter((b) => normalizeBookTitle(b.title).includes(q) || normalizeBookTitle(b.author).includes(q));
}

function renderLibraryPickerList(query) {
  const books = filterLibraryBooks(requiredBooks, query)
    .slice().sort((a, b) => a.title.localeCompare(b.title));
  if (!requiredBooks.length) return `<div class="empty">${t('아직 고를 수 있는 도서관 책이 없습니다.')}</div>`;
  if (!books.length) return `<div class="empty">${t('검색 결과가 없습니다.')}</div>`;
  return `<ul class="library-list">${books.map((b) => {
    const mine = findGoalForBook(appData.goals, b.id);
    const pages = b.lastPage - b.chapters[0].startPage + 1;
    return `
      <li>
        <button type="button" class="library-item" data-pick-book="${escapeHtml(b.id)}">
          ${renderCoverThumb(b.coverUrl, 'sm') || '<span class="cover cover-sm cover-blank"></span>'}
          <span class="library-item-text">
            <strong>${escapeHtml(b.title)}</strong>
            <span class="muted small">${b.author ? `${escapeHtml(b.author)} · ` : ''}${t('{pages}페이지 · {n}개 챕터', { pages, n: b.chapters.length })}</span>
          </span>
          ${renderBookTag(bookTagKind(b))}
          ${mine ? `<span class="badge badge-ontrack">${t('계획 있음')}</span>` : ''}
        </button>
      </li>`;
  }).join('')}</ul>`;
}

function bindLibraryPicker(form) {
  const picker = form.querySelector('#library-picker');
  if (!picker) return;
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="library-open"]')) {
      if (!picker.hidden) { picker.hidden = true; return; }
      picker.innerHTML = `
        <input type="search" id="library-search" class="input input-wide" placeholder="${t('제목이나 저자로 검색')}" aria-label="${t('도서관 검색')}">
        <div id="library-results">${renderLibraryPickerList('')}</div>`;
      picker.hidden = false;
      const search = picker.querySelector('#library-search');
      search.addEventListener('input', (ev) => {
        ev.stopPropagation();
        picker.querySelector('#library-results').innerHTML = renderLibraryPickerList(search.value);
      });
      search.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ev.preventDefault(); });
      search.focus();
      return;
    }
    const pick = e.target.closest('[data-pick-book]');
    if (pick) navigate(`#/new/book/${pick.dataset.pickBook}`);
  });
}

/* ----- 챕터 편집기 (목표 입력 · 도서관 관리 공용, 한 화면에 하나) ----- */

function renderChapterEditorHtml(lastPage) {
  return `
    <div class="field">
      <span class="field-label">${t('챕터 목록')}</span>
      <div class="ai-toc">
        <div class="ai-toc-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>
        </div>
        <div class="ai-toc-text">
          <strong>${t('AI 목차 인식')}<span class="ai-badge">AI</span></strong>
          <span>${t('책의 목차 페이지를 찍어 올리면 AI가 챕터 이름과 시작 페이지를 읽어 한 번에 채워요. 여러 쪽이면 사진을 여러 장 함께 고르세요.')}</span>
          <span class="ai-toc-drop">${t('사진을 이 상자에 끌어다 놓아도 돼요.')}</span>
        </div>
        <label class="btn btn-ai" id="toc-photo-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
          <span class="toc-photo-text">${t('목차 사진 올리기')}</span>
          <input type="file" id="toc-photo" accept="image/*" multiple hidden>
        </label>
      </div>
      <div class="toc-tools">
        <span class="field-hint">${t('사진이 없으면')}</span>
        <button type="button" class="link-btn toc-paste-link" data-action="toc-paste">${t('목차 글자 붙여넣기')}</button>
      </div>
      <p id="toc-result" class="toc-result" hidden></p>
      <div id="toc-paste-panel" class="toc-paste" hidden>
        <textarea id="toc-text" class="input textarea" rows="8"
          placeholder="${t('예:\n1장 도입 ········ 11\n2장 기도의 삶 ····· 35\n3장 말씀 묵상 (58)')}"></textarea>
        <div class="toc-paste-actions">
          <span id="toc-parse-count" class="field-hint"></span>
          <button type="button" class="btn btn-small" data-action="toc-cancel">${t('취소')}</button>
          <button type="button" class="btn btn-small btn-primary" data-action="toc-apply">${t('챕터 채우기')}</button>
        </div>
      </div>
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
    document.querySelectorAll('.ch-del, .ch-insert, .drag-handle, .toc-tools').forEach((el) => { el.hidden = true; });
    document.getElementById('chapter-rows').classList.add('is-locked');
  }
}

function bindChapterEditor(container, onChange) {
  bindTocTools(container, onChange);
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

/* ----- 목차로 챕터 채우기 (붙여넣기 · 사진) ----- */

/** 챕터 편집기에 입력한 내용이 있는지 */
function hasChapterInput() {
  return readChapterEditor().chapters.some((c) => c.name.trim() || Number.isFinite(c.startPage));
}

/** 챕터 행을 통째로 바꾼다 */
function replaceChapterRows(chapters) {
  document.getElementById('chapter-rows').innerHTML = '';
  const list = chapters.length ? chapters : [{ name: '', startPage: null }];
  list.forEach((ch) => addChapterRow({ name: ch.name || '', startPage: Number.isInteger(ch.startPage) ? ch.startPage : '' }));
}

function showChapterEditorError(container, title, message) {
  const box = container.querySelector('#form-errors');
  if (!box) { alert(`${title}\n${message}`); return; }
  box.innerHTML = `<strong>${escapeHtml(title)}</strong><ul><li>${escapeHtml(message)}</li></ul>`;
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** 목차로 채우기 전에 기존 입력을 덮어써도 되는지 */
function confirmReplaceChapters() {
  return !hasChapterInput() || confirm(t('지금 입력한 챕터를 목차 내용으로 바꿀까요?'));
}

/** 이미지 파일 → 긴 변 maxSide 이하 JPEG의 base64 */
function imageFileToJpegBase64(file, maxSide = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(t('이미지를 읽지 못했습니다. JPG나 PNG 사진으로 다시 시도하세요.')));
    };
    img.src = url;
  });
}

/**
 * 여러 장의 목차 사진 결과를 순서대로 합친다.
 * 사진이 겹쳐 찍혀 같은 항목(이름·페이지)이 바로 이어서 나오면 한 번만 남긴다.
 */
function mergeTocResults(results) {
  const chapters = [];
  let lastPage = null;
  results.forEach((r) => {
    (r.chapters || []).forEach((c) => {
      const prev = chapters[chapters.length - 1];
      const recent = chapters.slice(-5);
      const dup = recent.some((x) => x.name === c.name && x.startPage === c.startPage);
      if (prev && dup) return;
      chapters.push({ name: c.name, startPage: c.startPage });
    });
    if (r.lastPage && (!lastPage || r.lastPage > lastPage)) lastPage = r.lastPage;
  });
  return { chapters, lastPage };
}

/* ----- 책 검색 (국립중앙도서관 ISBN 서지정보, 서버 함수 study-planner-books) ----- */

/** 서버 함수 호출 → data (오류면 서버가 준 메시지로 throw) */
async function invokeFunction(name, body) {
  const { data, error } = await getSupabase().functions.invoke(name, { body });
  if (error) {
    let message = error.message || String(error);
    try {
      const b = await error.context.json();
      if (b && b.error) message = b.error;
    } catch {
      // 본문이 JSON이 아니면 기본 메시지
    }
    throw new Error(message);
  }
  return data;
}

let bookSearchResults = [];

function renderBookSearchResults(books) {
  if (!books.length) return `<p class="muted small">${t('찾는 책이 없습니다. 제목을 조금 짧게 하거나 ISBN으로 찾아보세요.')}</p>`;
  return books.map((b, i) => `
    <div class="book-result">
      ${b.coverUrl ? `<img class="cover cover-sm" src="${escapeHtml(b.coverUrl)}" alt="" loading="lazy">` : '<span class="cover cover-sm cover-none"></span>'}
      <div class="book-result-main">
        <strong>${escapeHtml(b.title)}</strong>
        <span class="muted small">${[b.author, b.publisher, b.publishDate ? b.publishDate.slice(0, 4) : '', b.pages ? t('{n}쪽', { n: b.pages }) : '']
          .filter(Boolean).map(escapeHtml).join(' · ')}</span>
      </div>
      ${b.toc ? `<span class="type-tag type-lecture">${t('목차 있음')}</span>` : ''}
      <button type="button" class="btn btn-small btn-primary" data-action="book-pick-result" data-index="${i}">${t('고르기')}</button>
    </div>`).join('');
}

function bindBookSearch(form, onChange) {
  const input = form.querySelector('#f-book-q');
  const box = form.querySelector('#book-search-results');
  if (!input || !box) return;
  const run = async () => {
    const query = input.value.trim();
    if (query.length < 2) { input.focus(); return; }
    const btn = form.querySelector('[data-action="book-search"]');
    btn.disabled = true;
    box.hidden = false;
    box.innerHTML = `<p class="muted small">${t('찾는 중…')}</p>`;
    try {
      const data = await invokeFunction('study-planner-books', { query });
      bookSearchResults = Array.isArray(data && data.books) ? data.books : [];
      box.innerHTML = renderBookSearchResults(bookSearchResults);
    } catch (err) {
      box.innerHTML = `<p class="errors small">${escapeHtml(t('책을 찾지 못했습니다: {message}', { message: err.message || String(err) }))}</p>`;
    } finally {
      btn.disabled = false;
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault(); // 폼 제출 대신 검색
    run();
  });
  form.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'book-search') run();
    if (btn.dataset.action !== 'book-pick-result') return;
    const book = bookSearchResults[Number(btn.dataset.index)];
    if (!book) return;
    await pickSearchedBook(form, book, btn, onChange);
    box.hidden = true;
  });
}

/** 검색한 책 고르기: 제목·저자·마지막 페이지 채우고, 목차가 있으면 AI로 챕터를 나눠 채운다 */
async function pickSearchedBook(form, book, btn, onChange) {
  form.querySelector('#f-title').value = book.title;
  form.querySelector('#f-author').value = book.author || '';
  const lastEl = form.querySelector('#f-last-page');
  if (book.pages && lastEl) lastEl.value = book.pages;
  const resultEl = form.querySelector('#toc-result');
  const parts = [t("'{title}' 정보를 채웠습니다.", { title: book.title })];
  if (book.pages) parts.push(t('마지막 페이지는 책 전체 쪽수({n}쪽)예요. 본문이 끝나는 페이지와 다르면 고쳐 주세요.', { n: book.pages }));
  if (book.toc && confirmReplaceChapters()) {
    btn.disabled = true;
    btn.textContent = t('목차 정리 중…');
    try {
      const data = await invokeFunction('study-planner-books', { action: 'toc', toc: book.toc });
      // 다른 판본(전자책 등)의 목차면 쪽 번호가 다를 수 있어 버린다
      const chapters = (data && Array.isArray(data.chapters) ? data.chapters : [])
        .filter((c) => c && typeof c.name === 'string' && c.name.trim())
        .map((c) => ({ name: c.name.trim(), startPage: !book.tocFromOtherEdition && Number.isInteger(c.startPage) && c.startPage > 0 ? c.startPage : null }));
      if (chapters.length) {
        replaceChapterRows(chapters);
        const missing = [...form.querySelectorAll('#chapter-rows .ch-start')].filter((el) => el.value === '');
        missing.forEach((el) => el.classList.add('is-missing'));
        parts.push(t('목차에서 챕터 {n}개를 채웠습니다.', { n: chapters.length }));
        if (missing.length) parts.push(t('시작 페이지는 목차 정보에 없어서 노란 칸에 직접 넣어 주세요. (목차 사진을 올리면 AI가 페이지까지 읽어요)'));
      }
    } catch (err) {
      console.warn('[book] 목차 정리 실패:', err);
      parts.push(t('목차는 불러오지 못했어요. 목차 사진을 올리거나 직접 입력해 주세요.'));
    }
  } else if (!book.toc) {
    parts.push(t('이 책은 목차 정보가 없어요. 목차 사진을 올리거나 직접 입력해 주세요.'));
  }
  if (resultEl) {
    resultEl.textContent = parts.join(' ');
    resultEl.hidden = false;
  }
  onChange();
}

/** 목차 사진 → { chapters: [{ name, startPage|null }], lastPage|null } (서버에서 읽는다) */
async function readTocFromImage(file) {
  const base64 = await imageFileToJpegBase64(file);
  const { data, error } = await getSupabase().functions.invoke('study-planner-toc', { body: { base64, mediaType: 'image/jpeg' } });
  if (error) {
    let message = error.message || String(error);
    try {
      const body = await error.context.json();
      if (body && body.error) message = body.error;
    } catch {
      // 본문이 JSON이 아니면 기본 메시지
    }
    throw new Error(message);
  }
  const chapters = (data && Array.isArray(data.chapters) ? data.chapters : [])
    .filter((c) => c && typeof c.name === 'string' && c.name.trim())
    .map((c) => ({ name: c.name.trim(), startPage: Number.isInteger(c.startPage) && c.startPage > 0 ? c.startPage : null }));
  const lastPage = data && Number.isInteger(data.lastPage) && data.lastPage > 0 ? data.lastPage : null;
  return { chapters, lastPage };
}

function bindTocTools(container, onChange) {
  const panel = container.querySelector('#toc-paste-panel');
  const textEl = container.querySelector('#toc-text');
  const photo = container.querySelector('#toc-photo');
  const photoLabel = container.querySelector('#toc-photo-label');
  if (!panel || !photo) return;

  container.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'toc-paste') {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) textEl.focus();
    } else if (action === 'toc-cancel') {
      panel.hidden = true;
      textEl.value = '';
      container.querySelector('#toc-parse-count').textContent = '';
    } else if (action === 'toc-apply') {
      const chapters = parseTocText(textEl.value);
      if (!chapters.length) { textEl.focus(); return; }
      if (!confirmReplaceChapters()) return;
      replaceChapterRows(chapters);
      panel.hidden = true;
      textEl.value = '';
      container.querySelector('#toc-parse-count').textContent = '';
      onChange();
    }
  });
  textEl.addEventListener('input', () => {
    const chapters = parseTocText(textEl.value);
    const withPage = chapters.filter((c) => c.startPage !== null).length;
    container.querySelector('#toc-parse-count').textContent = chapters.length
      ? t('{n}개 챕터 인식 (페이지 {p}개)', { n: chapters.length, p: withPage }) : '';
  });
  textEl.addEventListener('keydown', (e) => e.stopPropagation());
  container.addEventListener('input', (e) => {
    if (e.target.classList && e.target.classList.contains('ch-start') && e.target.value !== '') e.target.classList.remove('is-missing');
  });

  photo.addEventListener('change', () => {
    const files = [...photo.files];
    photo.value = '';
    readTocFiles(files);
  });

  // 카드에 사진을 끌어다 놓아도 읽는다
  const card = container.querySelector('.ai-toc');
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  let dragDepth = 0;
  card.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    card.classList.add('is-dragover');
  });
  card.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  card.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) card.classList.remove('is-dragover');
  });
  card.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    card.classList.remove('is-dragover');
    if (photo.disabled) return; // 읽는 중
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) {
      showChapterEditorError(container, t('목차를 읽지 못했습니다'), t('이미지 파일(JPG·PNG 등)을 끌어다 놓아 주세요.'));
      return;
    }
    readTocFiles(files);
  });

  async function readTocFiles(picked) {
    // 여러 장이면 파일 이름 순서(보통 찍은 순서)로 읽는다
    const files = [...picked].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (!files.length) return;
    if (!confirmReplaceChapters()) return;
    const text = photoLabel.querySelector('.toc-photo-text');
    const label = text.textContent;
    const resultEl = container.querySelector('#toc-result');
    resultEl.hidden = true;
    photoLabel.classList.add('is-loading');
    photo.disabled = true;
    try {
      const results = [];
      const failed = [];
      for (let i = 0; i < files.length; i++) {
        text.textContent = files.length > 1
          ? t('목차 읽는 중… ({i}/{n})', { i: i + 1, n: files.length }) : t('목차 읽는 중…');
        try {
          results.push(await readTocFromImage(files[i]));
        } catch (err) {
          console.warn('[toc] 사진 읽기 실패:', files[i].name, err);
          failed.push(files[i].name);
          if (files.length === 1) throw err;
        }
      }
      const { chapters, lastPage } = mergeTocResults(results);
      if (!chapters.length) throw new Error(t('사진에서 목차를 찾지 못했습니다. 목차가 잘 보이게 다시 찍어 주세요.'));
      replaceChapterRows(chapters);
      const lastEl = container.querySelector('#f-last-page');
      if (lastPage && lastEl && lastEl.value === '') lastEl.value = lastPage;
      const box = container.querySelector('#form-errors');
      if (box) box.hidden = true;
      onChange();

      // 결과 안내: 페이지를 못 읽은 행은 표시해서 확인하게 한다
      const missing = [...container.querySelectorAll('#chapter-rows .ch-start')].filter((el) => el.value === '');
      missing.forEach((el) => el.classList.add('is-missing'));
      const parts = [t('챕터 {n}개를 채웠습니다.', { n: chapters.length })];
      if (missing.length) parts.push(t('페이지를 읽지 못한 {n}개는 노란 칸에 직접 넣어 주세요.', { n: missing.length }));
      if (failed.length) parts.push(t('사진 {n}장은 읽지 못했습니다.', { n: failed.length }));
      parts.push(t('저장하기 전에 목차와 비교해 확인하세요.'));
      resultEl.textContent = parts.join(' ');
      resultEl.hidden = false;
    } catch (err) {
      console.warn('[toc] 목차 사진 읽기 실패:', err);
      showChapterEditorError(container, t('목차를 읽지 못했습니다'), err.message || String(err));
    } finally {
      text.textContent = label;
      photoLabel.classList.remove('is-loading');
      photo.disabled = false;
    }
  }
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
    readPage: document.getElementById('f-read-page') && val('f-read-page') !== '' ? Number(val('f-read-page')) : null,
    bibleStart: Number(val('f-bible-start')),
    bibleEnd: Number(val('f-bible-end')),
    titles: parseLectureLines(val('f-lectures')),
    customUnit: val('f-custom-unit'),
    customTotal: val('f-custom-total') === '' ? NaN : Number(val('f-custom-total')),
    customItems: parseLectureLines(val('f-custom-items')),
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
  const searchSection = document.querySelector('[data-section="book-search"]');
  if (searchSection) searchSection.hidden = !isBook;
  const pickSection = document.querySelector('[data-section="book-pick"]');
  if (pickSection) pickSection.hidden = !isBook;
  document.querySelector('[data-section="lecture"]').hidden = input.type !== 'lecture';
  document.querySelector('[data-section="bible"]').hidden = !isBible;
  const isCustom = input.type === 'custom';
  document.querySelector('[data-section="custom"]').hidden = !isCustom;
  document.getElementById('f-title-label').textContent = t({ book: '책 제목', lecture: '강의 이름', bible: '통독 이름', custom: '목표 이름' }[input.type]);
  // 기타: 항목 목록을 적으면 그 줄 수가 전체 개수
  const custom = normalizeCustom(input);
  customUnitName = custom.unit;
  const totalEl = document.getElementById('f-custom-total');
  totalEl.disabled = custom.items.length > 0;
  if (custom.items.length) totalEl.value = custom.items.length;
  document.getElementById('f-custom-total-hint').textContent = custom.items.length ? t('항목 목록 줄 수로 정해졌어요') : '';
  const customTotal = Number.isInteger(custom.total) && custom.total > 0 ? custom.total : 0;
  const unitBasis = isBook ? 'page' : isBible ? 'bible' : isCustom ? 'custom' : 'lecture';
  const bibleChapters = input.bibleStart <= input.bibleEnd
    ? bibleBooksInRange(input.bibleStart, input.bibleEnd).reduce((sum, b) => sum + b.chapters, 0) : 0;
  document.getElementById('f-bible-summary').textContent = input.bibleStart <= input.bibleEnd
    ? t('{books}권 · {chapters}장', { books: input.bibleEnd - input.bibleStart + 1, chapters: bibleChapters })
    : t('시작 권이 끝 권보다 뒤에 있습니다');

  // 하루 분량으로 정하기: 하루 분량 → 마감일 자동 계산
  const paceMode = document.querySelector('input[name="plan-mode"]:checked')?.value === 'pace';
  const paceRow = document.getElementById('pace-row');
  if (paceRow) paceRow.hidden = !paceMode;
  document.getElementById('quick-due').hidden = paceMode;
  const dueEl = document.getElementById('f-due');
  dueEl.readOnly = paceMode;
  if (paceRow) document.getElementById('f-pace-unit').textContent = getUnitLabel(unitBasis, 2);
  if (paceMode) {
    const firstPage = input.chapters[0] && input.chapters[0].startPage;
    const readFrom = Number.isInteger(input.readPage) ? input.readPage : (Number.isInteger(firstPage) ? firstPage - 1 : NaN);
    const remaining = isBook
      ? (Number.isInteger(input.lastPage) && Number.isInteger(readFrom) ? input.lastPage - readFrom : 0)
      : isBible ? bibleChapters : isCustom ? customTotal : input.titles.length;
    const perDay = Number(document.getElementById('f-pace').value);
    const due = dueDateForPace(input.startDate, remaining, perDay, input.restWeekdays, input.restDates, input.extraDates);
    const resultEl = document.getElementById('f-pace-result');
    if (!(perDay > 0)) resultEl.textContent = t('하루 분량을 입력하세요');
    else if (!(remaining > 0)) resultEl.textContent = isBook ? t('챕터와 마지막 페이지를 먼저 입력하세요') : t('목록을 먼저 입력하세요');
    else if (!due) resultEl.textContent = t('공부하는 날이 없어 계산할 수 없어요');
    else {
      dueEl.value = due;
      input.dueDate = due;
      resultEl.textContent = t('{date} ({wd})에 끝나요', { date: due, wd: weekdayLabel(due) });
    }
  }

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
      : isBible ? bibleChapters : isCustom ? customTotal : input.titles.length;
    if (study > 0 && total > 0) {
      const avg = total / study;
      const basis = unitBasis;
      const amount = formatAmount(avg >= 10 ? Math.round(avg) : Math.round(avg * 10) / 10, basis);
      daily = t('공부하는 날 하루 약 <b>{amount}</b>', { amount });
    }
  }
  document.getElementById('f-daily').innerHTML = daily;

  refreshChapterEditor();
  // 마지막으로 읽은 페이지 안내: 남은 분량
  const readHint = document.getElementById('f-read-hint');
  if (readHint) {
    const first = input.chapters[0] && input.chapters[0].startPage;
    const read = input.readPage;
    if (read === null) readHint.textContent = t('비워 두면 처음부터 읽는 것으로 계획합니다.');
    else if (Number.isInteger(first) && Number.isInteger(input.lastPage) && read >= first && read <= input.lastPage) {
      readHint.textContent = t('p.{p}까지 읽음 → 남은 {n}페이지를 나눕니다.', { p: read, n: input.lastPage - read });
    } else readHint.textContent = t('첫 챕터 시작 페이지와 마지막 페이지 사이로 입력하세요.');
  }
  document.getElementById('f-lecture-count').textContent = t('{n}개 강의', { n: input.titles.length });
}

function submitGoalForm(goal, requiredBookId = null, groupItemId = null) {
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
    const groupItem = groupItemId ? groupItems.find((i) => i.id === groupItemId) : null;
    if (groupItem) linkGoalToGroupItem(created, groupItem);
    appData.goals.push(created);
    commit();
    // 도서관에 없는 책이면 관리자 검토를 위해 도서관에 제출 (실패해도 목표는 그대로). 그룹에서 받은 책은 제외
    if (!requiredBookId && !groupItem && created.type === 'book') submitGoalToLibrary(created);
    navigate(requiredBookId || groupItem ? `#/goal/${created.id}` : '#/');
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
            ${bookTagKind(libraryBookForGoal(goal))
              ? renderBookTag(bookTagKind(libraryBookForGoal(goal)))
              : `<span class="type-tag type-${goal.type}">${typeLabel(goal.type)}</span>`}
            ${goal.startDate} ~ ${goal.dueDate} · ${formatDday(s.dday)}
            ${getRestWeekdays(goal).length ? ` · ${t('쉬는 요일 {days}', { days: weekdayListLabel(getRestWeekdays(goal)) })}` : ''}
          </p>
          ${renderSubmissionStatus(goal)}
          </div>
        </div>
        <div class="header-actions">
          <a class="btn" href="#/edit/${escapeHtml(goal.id)}">${t('수정')}</a>
          <button type="button" class="btn btn-danger" data-action="delete">${t('삭제')}</button>
        </div>
      </header>

      ${renderRequiredBookNotice(goal)}
      ${renderGroupItemNotice(goal)}
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
  useUnitOf(goal);
  if (basis === 'page') return units > 0 ? `p.${unitsToPage(goal.book, units)}` : '-';
  if (basis === 'bible') return formatBiblePosition(goal.bible, units);
  return formatAmount(units, basis);
}

function totalLabel(basis) {
  return basis === 'page' ? t('마지막 페이지') : basis === 'bible' ? t('끝') : t('전체');
}

/** 현황 안내 문구와 색 */
function getCompareMessage(goal, s) {
  useUnitOf(goal);
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

/** 도서관 책 내용이 내 계획과 다르면 적용 안내 (내가 제출한 책이면 검토 중 수정으로 안내) */
function renderRequiredBookNotice(goal) {
  const book = libraryBookForGoal(goal);
  if (!book || !isRequiredBookChanged(goal, book) || detailState.preview) return '';
  const reviewed = !!findSubmissionForGoal(goal.id);
  return `
    <div class="notice notice-row">
      <span>${reviewed
        ? t('도서관 검토 중 관리자가 책 정보를 수정했습니다. 내 계획에 적용할까요?')
        : t('관리자가 도서관의 책 정보(제목·챕터·페이지)를 수정했습니다. 내 계획에 적용할까요?')}</span>
      <button type="button" class="btn btn-small" data-action="sync-required">${t('적용 미리보기')}</button>
    </div>`;
}

/** 내가 도서관에 제출한 책의 검토 상태 (작은 안내 한 줄) */
function renderSubmissionStatus(goal) {
  const sub = findSubmissionForGoal(goal.id);
  if (!sub) return '';
  const text = sub.status === 'pending' ? t('도서관 검토 대기 중')
    : sub.status === 'rejected' ? t('도서관 등록 반려됨') + (sub.reviewNote ? ` · ${escapeHtml(sub.reviewNote)}` : '')
    : t('도서관에 등록됨');
  return `<p class="muted small submission-status">${text}</p>`;
}

function renderSummaryPanel(goal, s) {
  useUnitOf(goal);
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
          <label for="progress-input" class="field-label">${isBook ? t('마지막으로 읽은 페이지') : goal.type === 'custom' ? t('완료한 {unit} 수', { unit: getUnitLabel('custom') }) : t('완료한 강의 수')}</label>
          <div class="progress-control">
            <input id="progress-input" type="number" class="input input-num" min="${min}" max="${max}" value="${cur}">
            <span class="muted">${isBook ? `(p.${min}~${max})` : goal.type === 'custom' ? `(0~${max})` : t('(0~{max}강)', { max })}</span>
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
  useUnitOf(goal);
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
  useUnitOf(goal);
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
  useUnitOf(goal);
  const cur = goal.progress.current;
  if (goal.type === 'book') {
    return `${cur < bookFirstPage(goal.book) ? t('아직 읽지 않음') : t('p.{page}까지 읽음', { page: cur })} · ${
      t('완료 챕터 {done}/{total}', { done: completedChapterCount(goal.book, cur), total: goal.book.chapters.length })}`;
  }
  if (goal.type === 'bible') {
    return cur === 0 ? t('아직 읽지 않음')
      : `${t('{pos}까지 읽음', { pos: formatBiblePosition(goal.bible, cur) })} · ${formatFraction(cur, bibleTotalChapters(goal.bible), 'bible')}`;
  }
  if (goal.type === 'custom') {
    return cur === 0 ? t('아직 시작 전') : `${formatFraction(cur, goal.custom.total, 'custom')} ${t('완료')}${
      goal.custom.items[cur - 1] ? ` · ${goal.custom.items[cur - 1]}` : ''}`;
  }
  return cur === 0 ? t('아직 듣지 않음') : t('{n}강까지 완료', { n: cur });
}

/** 계획 대비 현황: 숫자 상자 4개 + 진행 막대 + 안내 문구 (내 화면·관리자 화면 공용) */
function renderCompareBlock(goal, s) {
  useUnitOf(goal);
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
  useUnitOf(goal);
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
        </div>
        <div class="due-picker pace-row">
          <span class="field-label">${t('또는 하루 분량으로')}</span>
          <span>${t('오늘부터 하루')}</span>
          <input id="preview-pace" type="number" min="1" class="input input-num" placeholder="20">
          <span>${escapeHtml(getUnitLabel(basis, 2))}</span>
          <span>${t('씩 하면')}</span>
          <strong id="preview-pace-result" class="pace-result">-</strong>
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
          <th>${goal.type === 'lecture' ? t('들을 강의') : goal.type === 'custom' ? t('할 내용') : t('읽을 내용')}</th>
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
  useUnitOf(goal);
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
  if (basis === 'custom') {
    if (!goal.custom.items.length) return `<strong>${escapeHtml(describeCustomRange(goal, from, to))}</strong>`;
    return goal.custom.items.slice(from, to).map((name) => `<div>${escapeHtml(name)}</div>`).join('');
  }
  return goal.lecture.titles.slice(from, to)
    .map((title, i) => `<div><strong>${lectureLabel(from + i + 1)}</strong> ${escapeHtml(title)}</div>`)
    .join('');
}

/** 누적 값 표시 (페이지는 도달해야 할 페이지 번호로) */
function formatCumulative(goal, basis, units) {
  useUnitOf(goal);
  if (basis === 'page') return units === 0 ? '-' : `p.${unitsToPage(goal.book, units)}`;
  if (basis === 'chapter') return formatAmount(units, 'chapter');
  if (basis === 'bible') return formatBiblePosition(goal.bible, units);
  if (basis === 'custom') return formatAmount(units, 'custom');
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
  useUnitOf(goal);
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
            <th>${goal.type === 'lecture' ? t('들을 강의') : goal.type === 'custom' ? t('할 내용') : t('읽을 내용')}</th>
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
          <th>${goal.type === 'lecture' ? t('들을 강의') : goal.type === 'custom' ? t('할 내용') : t('읽을 내용')}</th>
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
  useUnitOf(goal);
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
  if (basis === 'custom' && !goal.custom.items.length) {
    return `<strong>${escapeHtml(describeCustomRange(goal, from, to))}</strong>
      <span class="cell-sub">${formatAmount(row.amount, 'custom')}${row.weight > 1 ? ` · ${t('여유 ×{w}', { w: row.weight })}` : ''}${row.isFixed ? ` · ${t('직접')}` : ''}</span>`;
  }
  if (basis === 'bible') {
    return `<strong>${escapeHtml(describeBibleRange(goal.bible, from, to))}</strong>
      <span class="cell-sub">${formatAmount(row.amount, 'bible')}${row.weight > 1 ? ` · ${t('여유 ×{w}', { w: row.weight })}` : ''}${row.isFixed ? ` · ${t('직접')}` : ''}</span>`;
  }
  const items = basis === 'chapter'
    ? getChapterRanges(goal.book).slice(from, to).map((c) => escapeHtml(c.name))
    : basis === 'custom'
    ? goal.custom.items.slice(from, to).map((name) => escapeHtml(name))
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
    if (action === 'sync-group') {
      const item = groupItemForGoal(goal);
      if (item) openPreview(goal, { kind: 'edit', input: inputFromGroupItem(goal, item) });
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

  // 마감일 변경 미리보기의 '하루 분량으로': 입력할 때마다 바로 계산
  container.addEventListener('input', (e) => {
    if (e.target.id === 'preview-pace') e.target.dispatchEvent(new Event('change', { bubbles: true }));
  });

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
    if (e.target.id === 'preview-pace') {
      const basis = detailState.basis;
      const perDay = Number(e.target.value);
      const today = todayStr();
      const from = diffDays(today, goal.startDate) > 0 ? goal.startDate : today;
      const remaining = getTotalUnits(goal, basis) - getDoneUnits(goal, basis);
      const due = dueDateForPace(from, remaining, perDay, getRestWeekdays(goal), getRestDates(goal), getExtraDates(goal));
      const resultEl = container.querySelector('#preview-pace-result');
      if (!(perDay > 0)) { resultEl.textContent = '-'; return; }
      if (!(remaining > 0)) { resultEl.textContent = t('이미 다 끝냈어요'); return; }
      if (!due) { resultEl.textContent = t('공부하는 날이 없어 계산할 수 없어요'); return; }
      resultEl.textContent = t('{date} ({wd})에 끝나요', { date: due, wd: weekdayLabel(due) });
      const dueInput = container.querySelector('#preview-due');
      dueInput.value = due;
      dueInput.dispatchEvent(new Event('change', { bubbles: true }));
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
  assignments: [], // [{ book_id, user_id }] 모든 배정
  libraryFilter: 'all', // 'all' | 'pending' | 'public' | 'assigned'
  mergingId: null, // "기존 책과 연결"을 고르는 중인 제출 id
  groups: [], // 모든 그룹 [{ id, name, leader_id, invite_code, created_at }]
  groupMembers: [], // [{ group_id, user_id, joined_at }]
  groupItems: [], // 모든 공유 목표 (rowToGroupItem)
  openGroups: new Set(), // 회원 관리에서 펼친 그룹
  progressOpen: new Map(), // 진도 현황 접기/펼치기 (key → 펼침 여부)
  memberSearch: '', // 전체 회원 검색어
  planSearch: '', // 회원 계획 검색어
  memberGroupFilter: '', // '' 전체 | 'none' 그룹 없음 | 그룹 id
};

const ADMIN_TABS = [
  ['progress', '진도 현황'],
  ['plans', '회원 계획'],
  ['books', '도서관'],
  ['members', '회원 관리'],
];

async function loadAdminData() {
  adminState.loading = true;
  adminState.error = null;
  try {
    const [profiles, rows, goals, assignments] = await Promise.all([
      adminLoadProfiles(), loadLibraryRows(), adminLoadAllGoals(), adminLoadAssignments(), adminLoadGroups(),
    ]);
    adminState.profiles = profiles;
    adminState.goals = goals.filter((x) => checkGoalShape(x.goal, 0) === null);
    adminState.assignments = assignments;
    myAssignedBookIds = new Set(assignments.filter((a) => a.user_id === currentUser.id).map((a) => a.book_id));
    setLibraryRows(rows);
    adminState.loaded = true;
  } catch (err) {
    console.error('[admin] 불러오기 실패:', err);
    adminState.error = err.message || String(err);
  }
  adminState.loading = false;
  if (parseRoute().view === 'admin') render();
}

/** 서버 시각 → 이 컴퓨터 시간대 기준 "2026-09-30 14:03:25" */
function timestampToDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
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
    const book = libraryRows.find((b) => b.id === adminState.editingBookId);
    fillChapterEditor(book ? book.chapters : []);
    refreshChapterEditor();
  }
}

/* ----- 진도 현황 ----- */

/** 책을 받아야 하는 사람: 배정된 사람 */
function bookAudience(book) {
  const ids = new Set(adminState.assignments.filter((a) => a.book_id === book.id).map((a) => a.user_id));
  return adminState.profiles.filter((p) => ids.has(p.user_id));
}

function renderAdminProgress() {
  const books = requiredBooks.filter((b) => adminState.assignments.some((a) => a.book_id === b.id));
  const groups = renderAdminGroupProgress();
  const personal = renderAdminPersonalProgress();
  if (!books.length && !groups && !personal) {
    return `<div class="empty">${t('아직 그룹의 필독서·필수 시청이나 회원 목표가 없습니다.')}</div>`;
  }
  return `
    ${groups ? `<div class="progress-section-head"><h2 class="section-title">${t('그룹')}</h2></div>${groups}` : ''}
    ${books.length ? `
    <div class="progress-section-head"><h2 class="section-title">${t('배정된 책')} <span class="count">${books.length}</span></h2></div>
    ${renderAssignedProgress(books)}` : ''}
    ${personal}`;
}

/** 진도 현황 접기/펼치기 상태 (key → 펼침 여부). 그룹은 기본 펼침, 회원은 기본 접힘 */
function isProgressOpen(key, fallback) {
  return adminState.progressOpen.has(key) ? adminState.progressOpen.get(key) : fallback;
}

/** 진도 현황: 회원이 개별로 진행하는 목표 (그룹에서 받은 목표 제외) — 회원마다 접고 펼치기 */
function renderAdminPersonalProgress() {
  const today = todayStr();
  const byUser = new Map();
  adminState.goals.forEach(({ userId, goal }) => {
    if (goal.groupItemId) return;
    if (!byUser.has(userId)) byUser.set(userId, []);
    byUser.get(userId).push(goal);
  });
  const people = adminState.profiles.filter((p) => byUser.has(p.user_id));
  if (!people.length) return '';
  const blocks = people.map((p) => {
    const items = byUser.get(p.user_id)
      .map((goal) => ({ goal, s: getGoalSummary(goal, undefined, today) }))
      .sort((a, b) => (a.s.isActive === b.s.isActive ? diffDays(b.goal.dueDate, a.goal.dueDate) : a.s.isActive ? -1 : 1));
    const active = items.filter((x) => x.s.isActive).length;
    const behind = items.filter((x) => x.s.isActive && !x.s.notStarted && x.s.diff < 0).length;
    const key = `m:${p.user_id}`;
    return `
      <details class="panel progress-toggle" data-progress-key="${escapeHtml(key)}" ${isProgressOpen(key, false) ? 'open' : ''}>
        <summary>
          <span class="admin-group-name">${escapeHtml(profileName(p))}</span>
          <span class="muted">${summarizeGoalTypes(items.map((x) => x.goal), active)}</span>
          ${behind ? `<b class="text-danger small">${t('밀림 {n}개', { n: behind })}</b>` : ''}
        </summary>
        <div class="progress-toggle-body">
          <table class="admin-table">
            <thead>
              <tr><th>${t('목표')}</th><th>${t('기간')}</th><th class="num">${t('오늘까지 권장')}</th><th class="num">${t('실제 완료')}</th><th class="num">${t('끝')}</th><th class="col-bar">${t('진도')}</th><th>${t('상태')}</th></tr>
            </thead>
            <tbody>${items.map(({ goal, s }) => renderAdminGoalRow(p, goal, s)).join('')}</tbody>
          </table>
        </div>
      </details>`;
  }).join('');
  return `
    <div class="progress-section-head">
      <h2 class="section-title">${t('개별 진행')} <span class="count">${people.length}</span></h2>
      <span class="muted small">${t('그룹과 상관없이 회원이 스스로 세운 목표입니다.')}</span>
    </div>
    ${blocks}`;
}

/** 진도 현황: 그룹마다 필독서 · 필수 시청의 멤버 진도 */
function renderAdminGroupProgress() {
  return adminState.groups.map((g) => {
    const items = adminState.groupItems.filter((i) => i.groupId === g.id);
    if (!items.length) return '';
    const leader = adminState.profiles.find((p) => p.user_id === g.leader_id);
    const members = adminGroupPeople(g.id);
    const memberIds = new Set(members.map((m) => m.user_id));
    const memberGoals = adminState.goals.filter((x) => x.goal.groupId === g.id && memberIds.has(x.userId));
    const key = `g:${g.id}`;
    const planned = new Set(memberGoals.filter((x) => x.goal.groupItemId).map((x) => x.userId)).size;
    const behind = new Set(memberGoals.filter((x) => {
      if (!x.goal.groupItemId) return false;
      const s = getGoalSummary(x.goal);
      return s.isActive && !s.notStarted && s.diff < 0;
    }).map((x) => x.userId)).size;
    return `
      <details class="panel progress-toggle" data-progress-key="${escapeHtml(key)}" ${isProgressOpen(key, true) ? 'open' : ''}>
        <summary>
          <span class="admin-group-name">${escapeHtml(g.name)}</span>
          <span class="muted">${t('리더 {name}', { name: escapeHtml(leader ? profileName(leader) : t('알 수 없음')) })} · ${t('멤버 {n}명', { n: members.length })}</span>
          <span class="muted">${summarizeShared(items)}</span>
          <span class="muted">${t('계획 세운 멤버 {n}/{total}명', { n: planned, total: members.length })}</span>
          ${behind ? `<b class="text-danger small">${t('밀림 {n}명', { n: behind })}</b>` : ''}
        </summary>
        <div class="progress-toggle-body">
          ${groupItemsByKind(items).map(({ items: list }) => list.map((item) => renderGroupItemProgress(item, members, memberGoals, '',
            (m, goal) => `#/admin/member/${m.user_id}/${goal.id}`)).join('')).join('')}
        </div>
      </details>`;
  }).join('');
}

/** 진도 현황: 개별 배정된 책 */
function renderAssignedProgress(books) {
  const today = todayStr();

  return books.map((book) => {
    const people = bookAudience(book);
    const rows = people.map((p) => {
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
          <span class="muted">${renderLibraryBadges(book)} ${t('계획 세운 사람 {planned}/{total}명', { planned, total: people.length })}${behind ? ` · <b class="text-danger">${t('밀림 {n}명', { n: behind })}</b>` : ''}</span>
        </div>
        <table class="admin-table">
          <thead>
            <tr><th>${t('이름')}</th><th>${t('기간')}</th><th class="num">${t('오늘까지 권장')}</th><th class="num">${t('실제 완료')}</th><th class="num">${t('끝')}</th><th class="col-bar">${t('진도')}</th><th>${t('상태')}</th></tr>
          </thead>
          <tbody>
            ${!rows.length ? `<tr class="is-empty"><td colspan="7" class="muted">${t('아직 이 책을 받을 사람이 없습니다. (그룹 멤버는 <a href="#/admin/members">회원 관리</a>에서)')}</td></tr>` : ''}
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
      <section class="panel admin-book" data-plan-person data-search="${escapeHtml(`${p.name || ''} ${p.email || ''}`.toLowerCase())}">
        <div class="admin-book-head">
          <div>
            <h2 class="section-title">${escapeHtml(profileName(p))} ${renderAdminGroupTags(p.user_id)}</h2>
            <span class="muted">${escapeHtml(p.email)}</span>
          </div>
          <span class="muted">${summarizeGoalTypes(items.map((x) => x.goal), items.filter((x) => x.s.isActive).length)}</span>
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
    <div class="plans-toolbar">
      <p class="muted admin-intro">${t('회원들이 만든 모든 목표입니다. 목표를 누르면 날짜별 계획표를 볼 수 있습니다. (읽기 전용)')}</p>
      <input type="search" id="plan-search" class="input member-search" placeholder="${t('이름 또는 이메일 검색…')}" value="${escapeHtml(adminState.planSearch)}">
    </div>
    ${sections}
    <p class="empty" id="plan-empty" hidden>${t('조건에 맞는 회원이 없습니다.')}</p>
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
        <div class="muted small">${book ? t('도서관') : typeLabel(goal.type)}${getBookAuthor(goal) ? ` · ${escapeHtml(getBookAuthor(goal))}` : ''}</div>
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

/* ----- 도서관 (필독서 · 공개 · 배정 · 검토) ----- */

const LIBRARY_FILTERS = [
  ['all', '전체||filter'],
  ['pending', '검토 대기'],
  ['public', '공개'],
  ['assigned', '배정'],
];

function bookAssignees(bookId) {
  return adminState.assignments.filter((a) => a.book_id === bookId).map((a) => a.user_id);
}

/** 책의 배포 표시: 필독서 · 공개 · 배정 N명 */
function renderLibraryBadges(book) {
  const n = bookAssignees(book.id).length;
  return [
    book.isPublic ? `<span class="type-tag type-public">${t('공개')}</span>` : '',
    n ? `<span class="type-tag type-assigned">${t('배정 {n}명', { n })}</span>` : '',
  ].filter(Boolean).join(' ');
}

function bookPages(book) {
  const first = book.chapters && book.chapters[0] ? Number(book.chapters[0].startPage) : NaN;
  return Number.isFinite(first) ? book.lastPage - first + 1 : 0;
}

function renderAdminBooks() {
  const editing = adminState.editingBookId;
  const book = editing && editing !== 'new' ? libraryRows.find((b) => b.id === editing) : null;
  const reviewing = !!(book && book.status === 'pending');
  const pending = libraryRows.filter((b) => b.status === 'pending');
  const filter = adminState.libraryFilter;
  const assigned = book ? bookAssignees(book.id) : [];

  const editor = editing ? `
    <form id="book-form" class="panel admin-editor" novalidate>
      <h2 class="section-title">${reviewing ? t('제출된 책 검토') : book ? t('도서관 책 수정') : t('도서관에 책 추가')}</h2>
      ${reviewing ? `<p class="notice notice-info">${t('{name}님이 {date}에 만든 계획에서 제출된 책입니다. 필요하면 고친 뒤 승인하세요. 고친 내용은 제출한 사람에게 적용 여부를 묻습니다.', { name: escapeHtml(submitterName(book)), date: timestampToDate(book.createdAt) })}</p>`
        : book ? `<p class="notice">${t('저장하면 이미 계획을 세운 사람에게 "내용 변경됨"이 표시되고, 각자 미리보기를 확인한 뒤 자기 계획에 적용합니다.')}</p>` : ''}
      <div class="book-form-top">
        <div class="cover-picker">
          <div class="cover-preview" id="cover-preview">${renderCoverPreview(book)}</div>
          <label class="btn btn-small">${t('표지 이미지 선택')}
            <input type="file" id="cover-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
          </label>
          <button type="button" class="btn btn-small" data-action="cover-remove">${t('표지 빼기')}</button>
          <span class="field-hint">${t('JPG·PNG·WEBP, 3MB 이하')}</span>
          <span class="field-hint">${t('표지 칸에 이미지를 끌어다 놓아도 돼요.')}</span>
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
      <fieldset class="field distribution">
        <legend class="field-label">${t('누구에게 보일까요?')} <span class="muted">${t('(아무것도 고르지 않으면 도서관에 보관만 합니다)')}</span></legend>
        <label class="check-line"><input type="checkbox" id="f-public" ${book && book.isPublic ? 'checked' : ''}>
          <span><b>${t('공개')}</b> <span class="muted">${t('누구나 새 목표에서 "도서관에서 고르기"로 고를 수 있습니다')}</span></span></label>
        <div class="assign-picker">
          <span class="check-line-title"><b>${t('특정 사람에게 배정')}</b> <span class="muted" id="assign-count">${t('{n}명 선택', { n: assigned.length })}</span></span>
          <input type="search" id="assign-search" class="input" placeholder="${t('이름이나 이메일로 찾기')}" aria-label="${t('회원 찾기')}">
          <div class="assign-list" id="assign-list">
            ${adminState.profiles.map((p) => `
              <label class="assign-item" data-search="${escapeHtml(`${p.name || ''} ${p.email || ''}`.toLowerCase())}">
                <input type="checkbox" name="assign" value="${escapeHtml(p.user_id)}" ${assigned.includes(p.user_id) ? 'checked' : ''}>
                <span>${escapeHtml(p.name || '-')}</span>
                <span class="muted small">${escapeHtml(p.email || '')}</span>
              </label>`).join('')}
          </div>
        </div>
      </fieldset>
      <div id="form-errors" class="errors" hidden></div>
      <div class="form-actions">
        <button type="button" class="btn" data-action="book-cancel">${t('취소')}</button>
        ${reviewing ? `
          <button type="button" class="btn btn-danger" data-action="review-reject" data-id="${escapeHtml(book.id)}">${t('반려')}</button>
          <button type="submit" class="btn btn-primary">${t('승인하고 저장')}</button>`
          : `<button type="submit" class="btn btn-primary">${t('저장')}</button>`}
      </div>
    </form>` : '';

  const segments = `
    <div class="tabs library-filter" role="tablist">
      ${LIBRARY_FILTERS.map(([key, label]) => {
        const count = key === 'pending' ? pending.length : filterLibrary(key).length;
        return `<button type="button" role="tab" class="tab ${key === filter ? 'is-active' : ''}" data-action="library-filter" data-filter="${key}">
          ${t(label)} <span class="${key === 'pending' && count ? 'count-badge' : 'muted'}">${count}</span></button>`;
      }).join('')}
    </div>`;

  const body = filter === 'pending' ? renderReviewQueue(pending, editing) : renderLibraryTable(filterLibrary(filter), editing);

  return `
    <div class="admin-toolbar">
      <p class="muted">${t('도서관의 책 정보(제목·챕터·페이지)는 고른 사람 모두에게 공유됩니다. 기간은 각자 정합니다. 회원이 직접 만든 책 목표는 검토 대기로 들어옵니다.')}</p>
      <button type="button" class="btn btn-primary" data-action="book-new" ${editing ? 'disabled' : ''}>${t('+ 책 추가')}</button>
    </div>
    ${editor}
    ${segments}
    ${body}`;
}

/** 승인된 책 중 필터에 맞는 것 */
function filterLibrary(filter) {
  return requiredBooks.filter((b) => filter === 'public' ? b.isPublic
    : filter === 'assigned' ? bookAssignees(b.id).length > 0
    : true);
}

function submitterName(book) {
  const p = adminState.profiles.find((x) => x.user_id === book.submittedBy);
  return p ? profileName(p) : t('알 수 없음');
}

function renderLibraryTable(books, editing) {
  if (!books.length) return `<div class="empty">${t('해당하는 책이 없습니다.')}</div>`;
  return `
    <table class="admin-table panel-table">
      <thead><tr><th>${t('책 제목')}</th><th class="num">${t('챕터')}</th><th class="num">${t('페이지')}</th><th class="num">${t('계획 세운 사람')}</th><th></th></tr></thead>
      <tbody>
        ${books.map((b) => {
          const planned = new Set(adminState.goals.filter((x) => x.goal.requiredBookId === b.id).map((x) => x.userId)).size;
          const mine = findGoalForBook(appData.goals, b.id);
          return `
            <tr>
              <td>
                <div class="book-cell">
                  ${renderCoverThumb(b.coverUrl, 'sm')}
                  <div>
                    <strong>${escapeHtml(b.title)}</strong>${b.author ? `<div class="muted">${escapeHtml(b.author)}</div>` : ''}
                    <div class="library-badges">${renderLibraryBadges(b) || `<span class="muted small">${t('보관만')}</span>`}</div>
                  </div>
                </div>
              </td>
              <td class="num">${t('{n}개', { n: b.chapters.length })}</td>
              <td class="num">${formatAmount(bookPages(b), 'page')}</td>
              <td class="num">${t('{n}명', { n: planned })}</td>
              <td class="row-actions">
                ${mine
                  ? `<a class="btn btn-small" href="#/goal/${escapeHtml(mine.id)}">${t('내 계획 보기')}</a>`
                  : `<a class="btn btn-small btn-primary" href="#/new/book/${escapeHtml(b.id)}">${t('내 계획 세우기')}</a>`}
                <button type="button" class="btn btn-small" data-action="book-edit" data-id="${escapeHtml(b.id)}" ${editing ? 'disabled' : ''}>${t('수정')}</button>
                <button type="button" class="btn btn-small btn-danger" data-action="book-delete" data-id="${escapeHtml(b.id)}" ${editing ? 'disabled' : ''}>${t('삭제')}</button>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

/** 검토 대기: 회원이 만든 책 목표에서 제출된 책 */
function renderReviewQueue(pending, editing) {
  if (!pending.length) return `<div class="empty">${t('검토할 책이 없습니다.')}</div>`;
  return `<div class="review-list">${pending.map((b) => {
    const similar = requiredBooks.filter((x) => isSimilarBookTitle(x.title, b.title));
    const merging = adminState.mergingId === b.id;
    const choices = [...similar, ...requiredBooks.filter((x) => !similar.includes(x))];
    return `
      <div class="panel review-item">
        <div class="review-main">
          <div>
            <strong>${escapeHtml(b.title)}</strong>${b.author ? ` <span class="muted">· ${escapeHtml(b.author)}</span>` : ''}
            <div class="muted small">${t('{name} · {date} 제출', { name: escapeHtml(submitterName(b)), date: timestampToDate(b.createdAt) })}
              · ${t('{pages}페이지 · {n}개 챕터', { pages: bookPages(b), n: b.chapters.length })}</div>
            ${similar.length ? `<div class="similar-hint">${t('비슷한 책이 이미 있음: {titles}', { titles: similar.map((x) => `'${escapeHtml(x.title)}'`).join(', ') })}</div>` : ''}
          </div>
          <div class="row-actions">
            <button type="button" class="btn btn-small" data-action="book-edit" data-id="${escapeHtml(b.id)}" ${editing ? 'disabled' : ''}>${t('검토')}</button>
            <button type="button" class="btn btn-small btn-primary" data-action="review-approve" data-id="${escapeHtml(b.id)}" ${editing ? 'disabled' : ''}>${t('바로 승인')}</button>
            <button type="button" class="btn btn-small" data-action="review-merge-open" data-id="${escapeHtml(b.id)}" ${editing || !requiredBooks.length ? 'disabled' : ''}>${t('기존 책과 연결')}</button>
            <button type="button" class="btn btn-small btn-danger" data-action="review-reject" data-id="${escapeHtml(b.id)}" ${editing ? 'disabled' : ''}>${t('반려')}</button>
          </div>
        </div>
        ${merging ? `
          <div class="merge-row">
            <select class="input" id="merge-target" aria-label="${t('연결할 도서관 책')}">
              ${choices.map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.title)}${x.author ? ` · ${escapeHtml(x.author)}` : ''}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-small btn-primary" data-action="review-merge" data-id="${escapeHtml(b.id)}">${t('연결')}</button>
            <button type="button" class="btn btn-small" data-action="review-merge-cancel">${t('취소')}</button>
            <span class="field-hint">${t('제출한 사람의 계획이 고른 책과 연결되고, 다른 내용은 적용 여부를 묻습니다.')}</span>
          </div>` : ''}
      </div>`;
  }).join('')}</div>`;
}

/** 검토 상태 변경 후 목록 갱신 */
function replaceLibraryRow(saved) {
  const idx = libraryRows.findIndex((b) => b.id === saved.id);
  const rows = libraryRows.slice();
  if (idx >= 0) rows[idx] = saved;
  else rows.push(saved);
  setLibraryRows(rows);
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
    isPublic: form.querySelector('#f-public').checked,
  };
  const assignees = [...form.querySelectorAll('input[name="assign"]:checked')].map((el) => el.value);
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
  const before = id ? libraryRows.find((b) => b.id === id) : null;
  const oldCover = before ? before.coverUrl : null;
  const draft = adminState.cover;
  form.querySelectorAll('.form-actions button').forEach((b) => { b.disabled = true; });
  try {
    let coverUrl = oldCover;
    if (draft && draft.file) coverUrl = await adminUploadCover(draft.file);
    else if (draft && draft.removed) coverUrl = null;
    const status = before && before.status !== 'approved' ? 'approved' : undefined; // 검토 중이면 승인
    const saved = await adminSaveRequiredBook({ ...input, id, coverUrl, status });
    if (oldCover && oldCover !== coverUrl) adminRemoveCoverFile(oldCover);
    replaceLibraryRow(saved);
    await adminSyncAssignments(saved.id, assignees);
    myAssignedBookIds = new Set(adminState.assignments.filter((a) => a.user_id === currentUser.id).map((a) => a.book_id));
    adminState.editingBookId = null;
    resetCoverDraft();
    render();
  } catch (err) {
    box.innerHTML = `<strong>${t('저장하지 못했습니다')}</strong><ul><li>${escapeHtml(err.message || String(err))}</li></ul>`;
    box.hidden = false;
    form.querySelectorAll('.form-actions button').forEach((b) => { b.disabled = false; });
  }
}

/** 검토: 바로 승인 · 반려 · 기존 책과 연결 */
async function adminReviewAction(action, id, btn) {
  const book = libraryRows.find((b) => b.id === id);
  if (!book) return;
  let change;
  if (action === 'review-approve') {
    change = { status: 'approved' };
  } else if (action === 'review-reject') {
    const note = prompt(t("'{title}'을(를) 반려합니다. 제출한 사람에게 보여줄 메모 (선택)", { title: book.title }), '');
    if (note === null) return;
    change = { status: 'rejected', reviewNote: note.trim() || null };
  } else if (action === 'review-merge') {
    const target = document.getElementById('merge-target').value;
    if (!target) return;
    change = { status: 'merged', mergedInto: target };
  } else return;
  if (btn) btn.disabled = true;
  try {
    const saved = await adminSetBookStatus(id, change);
    replaceLibraryRow(saved);
    adminState.mergingId = null;
    if (adminState.editingBookId === id) {
      adminState.editingBookId = null;
      resetCoverDraft();
    }
    render();
  } catch (err) {
    alert(t('변경하지 못했습니다: {message}', { message: err.message }));
    if (btn) btn.disabled = false;
  }
}

/* ----- 회원 관리 ----- */

function renderAdminMembers() {
  const profiles = adminState.profiles;
  if (!profiles.length) return `<div class="empty">${t('아직 로그인한 사람이 없습니다.')}</div>`;
  return `
    <div class="section-head">
      <h2 class="section-title">${t('그룹')} <span class="count">${adminState.groups.length}</span></h2>
      <span class="muted small">${t('그룹을 누르면 멤버·공유 목표·진도를 펼쳐 볼 수 있어요. 새 그룹은 상단 [그룹] 메뉴에서 만듭니다.')}</span>
    </div>
    ${adminState.groups.length ? adminState.groups.map(renderAdminGroup).join('') : `<div class="empty">${t('아직 그룹이 없습니다.')}</div>`}

    <div class="panel member-panel">
      <div class="member-toolbar">
        <h2 class="section-title">${t('전체 회원')} <span class="count" id="member-count">${profiles.length}</span></h2>
        <span class="muted small">${t('앱에 한 번이라도 로그인한 사람들입니다.')}</span>
        <input type="search" id="member-search" class="input member-search" placeholder="${t('이름 또는 이메일 검색…')}" value="${escapeHtml(adminState.memberSearch)}">
        <select id="member-group-filter" class="input member-filter" aria-label="${t('그룹으로 거르기')}">
          <option value="">${t('전체 그룹')}</option>
          <option value="none" ${adminState.memberGroupFilter === 'none' ? 'selected' : ''}>${t('그룹 없음')}</option>
          ${adminState.groups.map((g) => `<option value="${escapeHtml(g.id)}" ${adminState.memberGroupFilter === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
        </select>
      </div>
      <table class="admin-table member-table">
        <thead><tr><th>${t('이름 / 이메일')}</th><th>${t('그룹')}</th><th>${t('처음 로그인')}</th><th>${t('마지막 접속')}</th></tr></thead>
        <tbody>
          ${profiles.map((p) => {
            const groups = adminGroupsOf(p.user_id);
            return `
            <tr data-member-row data-search="${escapeHtml(`${p.name || ''} ${p.email || ''}`.toLowerCase())}" data-groups="${escapeHtml(groups.map((g) => g.id).join(' '))}">
              <td>
                <strong>${escapeHtml(p.name || '-')}</strong>${p.user_id === currentUser.id ? ` <span class="muted">${t('(나)')}</span>` : ''}
                <div class="muted small">${escapeHtml(p.email)}</div>
              </td>
              <td>${renderMemberGroupCell(p, groups)}</td>
              <td class="muted nowrap">${timestampToDateTime(p.created_at)}</td>
              <td class="muted nowrap">${timestampToDateTime(p.last_seen_at)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <p class="empty" id="member-empty" hidden>${t('조건에 맞는 회원이 없습니다.')}</p>
    </div>`;
}

/** 전체 회원 표의 그룹 칸: 속한 그룹(× 로 빼기) + 드롭다운으로 그룹 추가 */
function renderMemberGroupCell(p, groups) {
  const others = adminState.groups.filter((g) => !groups.includes(g));
  const tags = groups.map((g) => g.leader_id === p.user_id
    ? `<span class="type-tag type-leader" title="${t('리더는 그룹에서 뺄 수 없습니다')}">${escapeHtml(g.name)} · ${t('리더')}</span>`
    : `<span class="type-tag type-group group-chip">${escapeHtml(g.name)}<button type="button" class="chip-x" data-action="ag-remove-member"
        data-group="${escapeHtml(g.id)}" data-user="${escapeHtml(p.user_id)}" data-name="${escapeHtml(profileName(p))}"
        aria-label="${t('{group}에서 빼기', { group: escapeHtml(g.name) })}">×</button></span>`).join('');
  return `
    <div class="member-groups">
      ${tags}
      ${others.length ? `<select class="input input-small member-group-add" data-member-group-add="${escapeHtml(p.user_id)}" aria-label="${t('그룹에 추가')}">
        <option value="">${groups.length ? t('+ 그룹 추가') : t('그룹 선택')}</option>
        ${others.map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join('')}
      </select>` : ''}
    </div>`;
}

/** 전체 회원 표: 검색어·그룹 필터 적용 (다시 그리지 않고 줄만 숨김) */
function applyMemberFilter(container) {
  const q = adminState.memberSearch.trim().toLowerCase();
  const f = adminState.memberGroupFilter;
  let shown = 0;
  container.querySelectorAll('[data-member-row]').forEach((tr) => {
    const groups = tr.dataset.groups ? tr.dataset.groups.split(' ') : [];
    const ok = (!q || tr.dataset.search.includes(q))
      && (!f || (f === 'none' ? groups.length === 0 : groups.includes(f)));
    tr.hidden = !ok;
    if (ok) shown += 1;
  });
  const count = container.querySelector('#member-count');
  if (count) count.textContent = shown;
  const empty = container.querySelector('#member-empty');
  if (empty) empty.hidden = shown > 0;
}

/** 회원 계획 탭: 이름·이메일 검색 (다시 그리지 않고 숨김) */
function applyPlanFilter(container) {
  const q = adminState.planSearch.trim().toLowerCase();
  let shown = 0;
  container.querySelectorAll('[data-plan-person]').forEach((el) => {
    el.hidden = !!q && !el.dataset.search.includes(q);
    if (!el.hidden) shown += 1;
  });
  const empty = container.querySelector('#plan-empty');
  if (empty) empty.hidden = shown > 0 || !container.querySelector('[data-plan-person]');
}

/** 관리자: 드롭다운으로 고른 그룹에 회원 추가 */
async function adminAddToGroup(select) {
  const groupId = select.value;
  if (!groupId) return;
  select.disabled = true;
  try {
    const { error } = await getSupabase().from(GROUP_MEMBERS_TABLE).insert({ group_id: groupId, user_id: select.dataset.memberGroupAdd });
    if (error) throw error;
    await Promise.all([adminLoadGroups(), loadGroups()]);
    renderTopbar();
    render();
  } catch (err) {
    alert(t('처리하지 못했습니다.\n\n{message}', { message: err.message || String(err) }));
    select.value = '';
    select.disabled = false;
  }
}

/** 목표 종류별 개수: "책 2개 · 강의 1개" (+ 진행 중 N개) */
function summarizeGoalTypes(goals, activeCount = null) {
  const parts = Object.keys(TYPE_LABELS)
    .map((type) => [type, goals.filter((g) => g.type === type).length])
    .filter(([, n]) => n > 0)
    .map(([type, n]) => t('{type} {n}개', { type: typeLabel(type), n }));
  if (activeCount !== null) parts.push(t('진행 중 {n}개', { n: activeCount }));
  return parts.join(' · ');
}

/** 사람이 속한 그룹 태그 (리더면 "리더" 표시) */
function renderAdminGroupTags(userId) {
  return adminGroupsOf(userId).map((g) => `<span class="type-tag ${g.leader_id === userId ? 'type-leader' : 'type-group'}">${escapeHtml(g.name)}${
    g.leader_id === userId ? ` · ${t('리더')}` : ''}</span>`).join(' ');
}

/** 관리자: 그룹 하나 (접고 펼치기) — 멤버 관리 · 공유 목표별 진도 · 그룹 필독서 */
function renderAdminGroup(g) {
  const leader = adminState.profiles.find((p) => p.user_id === g.leader_id);
  const members = adminGroupPeople(g.id);
  const memberIds = new Set(members.map((m) => m.user_id));
  const items = adminState.groupItems.filter((i) => i.groupId === g.id);
  const memberGoals = adminState.goals.filter((x) => x.goal.groupId === g.id && memberIds.has(x.userId));
  const candidates = adminState.profiles.filter((p) => !memberIds.has(p.user_id) && p.user_id !== g.leader_id);
  const open = adminState.openGroups.has(g.id);

  return `
    <details class="panel admin-group" data-group="${escapeHtml(g.id)}" ${open ? 'open' : ''}>
      <summary>
        <span class="admin-group-name">${escapeHtml(g.name)}</span>
        <span class="muted">${t('리더 {name}', { name: escapeHtml(leader ? profileName(leader) : t('알 수 없음')) })}</span>
        <span class="muted">${t('멤버 {n}명', { n: members.length })}</span>
        <span class="muted">${summarizeShared(items)}</span>
      </summary>
      ${open ? `
      <div class="admin-group-body">
        <div class="admin-group-actions">
          <span class="muted small">${t('초대 코드')} <b class="invite-code-small">${escapeHtml(g.invite_code)}</b></span>
          <button type="button" class="btn btn-small" data-action="ag-rename" data-group="${escapeHtml(g.id)}">${t('이름 바꾸기')}</button>
          <button type="button" class="btn btn-small btn-danger" data-action="ag-delete" data-group="${escapeHtml(g.id)}">${t('그룹 삭제')}</button>
        </div>

        <h3 class="admin-group-sub">${t('멤버')}</h3>
        <div class="group-form-row admin-group-add">
          <select class="input" data-add-member="${escapeHtml(g.id)}">
            <option value="">${t('회원을 골라 이 그룹에 추가')}</option>
            ${candidates.map((p) => `<option value="${escapeHtml(p.user_id)}">${escapeHtml(p.name || '-')} (${escapeHtml(p.email)})</option>`).join('')}
          </select>
          <button type="button" class="btn btn-small" data-action="ag-add-member" data-group="${escapeHtml(g.id)}">${t('추가')}</button>
        </div>
        ${members.length ? `
        <table class="admin-table">
          <thead><tr><th>${t('이름')}</th><th>${t('이메일')}</th><th>${t('참여일')}</th><th></th></tr></thead>
          <tbody>
            ${members.map((m) => {
              const row = adminState.groupMembers.find((x) => x.group_id === g.id && x.user_id === m.user_id);
              return `<tr>
                <td>${escapeHtml(m.name || '-')}</td>
                <td class="muted">${escapeHtml(m.email)}</td>
                <td class="muted nowrap">${timestampToDate(row && row.joined_at)}</td>
                <td class="num"><button type="button" class="btn btn-small btn-danger" data-action="ag-remove-member" data-group="${escapeHtml(g.id)}"
                  data-user="${escapeHtml(m.user_id)}" data-name="${escapeHtml(profileName(m))}">${t('내보내기||member')}</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>` : `<p class="muted small">${t('아직 참여한 멤버가 없습니다.')}</p>`}

        ${items.length ? groupItemsByKind(items).map(({ kind, items: list }) => `<h3 class="admin-group-sub">${t(kind.label)} <span class="count">${list.length}</span></h3>`
          + list.map((item) => renderGroupItemProgress(item, members, memberGoals,
          `<button type="button" class="btn btn-small btn-danger" data-action="ag-item-delete" data-item="${escapeHtml(item.id)}">${t('공유 취소')}</button>`,
          (m, goal) => `#/admin/member/${m.user_id}/${goal.id}`)).join('')).join('')
          : `<p class="muted small">${t('리더가 아직 필독서나 필수 시청을 정하지 않았습니다.')}</p>`}
      </div>` : ''}
    </details>`;
}

/** 관리자: 그룹 관리 버튼 처리 → 처리했으면 true */
async function handleAdminGroupAction(action, btn, container) {
  if (!action.startsWith('ag-')) return false;
  const sb = getSupabase();
  const g = adminState.groups.find((x) => x.id === btn.dataset.group);
  const check = ({ error }) => { if (error) throw error; };
  let job = null;
  if (action === 'ag-rename' && g) {
    const name = prompt(t('새 그룹 이름'), g.name);
    if (name === null || !name.trim() || name.trim() === g.name) return true;
    job = async () => check(await sb.from(GROUPS_TABLE).update({ name: name.trim().slice(0, 40) }).eq('id', g.id));
  } else if (action === 'ag-delete' && g) {
    if (!confirm(t("'{name}' 그룹을 삭제할까요?\n공유한 목표와 멤버 목록이 사라집니다. 멤버들이 이미 만든 계획은 각자에게 개인 목표로 남습니다.", { name: g.name }))) return true;
    job = async () => check(await sb.from(GROUPS_TABLE).delete().eq('id', g.id));
  } else if (action === 'ag-add-member' && g) {
    const userId = container.querySelector(`[data-add-member="${g.id}"]`).value;
    if (!userId) return true;
    job = async () => check(await sb.from(GROUP_MEMBERS_TABLE).insert({ group_id: g.id, user_id: userId }));
  } else if (action === 'ag-remove-member' && g) {
    if (!confirm(t('{name}님을 그룹에서 내보낼까요?\n그 멤버의 계획은 개인 목표로 남고, 더 이상 볼 수 없습니다.', { name: btn.dataset.name }))) return true;
    job = async () => check(await sb.from(GROUP_MEMBERS_TABLE).delete().eq('group_id', g.id).eq('user_id', btn.dataset.user));
  } else if (action === 'ag-item-delete') {
    const item = adminState.groupItems.find((i) => i.id === btn.dataset.item);
    if (!item || !confirm(t("'{title}' 공유를 취소할까요?\n멤버들이 이미 만든 계획은 각자에게 개인 목표로 남지만, 리더는 더 이상 진도를 볼 수 없습니다.", { title: item.title }))) return true;
    job = async () => check(await sb.from(GROUP_ITEMS_TABLE).delete().eq('id', item.id));
  }
  if (!job) return true;
  btn.disabled = true;
  try {
    await job();
    await Promise.all([adminLoadGroups(), loadGroups()]);
    renderTopbar();
    render();
  } catch (err) {
    alert(t('처리하지 못했습니다.\n\n{message}', { message: err.message || String(err) }));
    btn.disabled = false;
  }
  return true;
}

/** 표지로 쓸 이미지 파일을 고른다 (파일 선택·끌어다 놓기 공통) */
function setCoverDraftFile(container, file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    alert(t('표지는 JPG·PNG·WEBP·GIF 이미지로 올려 주세요.'));
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    alert(t('표지 이미지는 3MB 이하로 올려 주세요.'));
    return;
  }
  resetCoverDraft();
  adminState.cover = { file, previewUrl: URL.createObjectURL(file) };
  container.querySelector('#cover-preview').innerHTML = renderCoverPreview(null);
}

/** 표지 칸에 이미지를 끌어다 놓기 */
function bindCoverDrop(container) {
  const zone = container.querySelector('.cover-picker');
  if (!zone) return;
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  let depth = 0;
  zone.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    zone.classList.add('is-dragover');
  });
  zone.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  zone.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) zone.classList.remove('is-dragover');
  });
  zone.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    zone.classList.remove('is-dragover');
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
    if (!file) {
      alert(t('표지는 JPG·PNG·WEBP·GIF 이미지로 올려 주세요.'));
      return;
    }
    setCoverDraftFile(container, file);
  });
}

function bindAdminEvents(container, tab) {
  bindCoverDrop(container);
  // 회원 관리: 검색
  container.addEventListener('input', (e) => {
    if (e.target.id === 'plan-search') {
      adminState.planSearch = e.target.value;
      applyPlanFilter(container);
      return;
    }
    if (e.target.id !== 'member-search') return;
    adminState.memberSearch = e.target.value;
    applyMemberFilter(container);
  });
  if (tab === 'members') applyMemberFilter(container);
  if (tab === 'plans') applyPlanFilter(container);
  // 회원 관리: 그룹 펼치기/접기 (펼칠 때 내용을 그린다)
  container.addEventListener('toggle', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.progressKey) {
      adminState.progressOpen.set(el.dataset.progressKey, el.open);
      return;
    }
    if (!el.classList || !el.classList.contains('admin-group')) return;
    const id = el.dataset.group;
    if (el.open === adminState.openGroups.has(id)) return;
    if (el.open) adminState.openGroups.add(id);
    else adminState.openGroups.delete(id);
    if (el.open) render();
  }, true);
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (await handleAdminGroupAction(action, btn, container)) return;
    if (action === 'admin-basis') {
      adminState.viewBasis = btn.dataset.basis;
      render();
      return;
    }
    if (action === 'admin-refresh') {
      adminState.loaded = false;
      adminState.editingBookId = null;
      render();
    } else if (action === 'library-filter') {
      adminState.libraryFilter = btn.dataset.filter;
      adminState.mergingId = null;
      render();
    } else if (action === 'review-merge-open') {
      adminState.mergingId = btn.dataset.id;
      render();
    } else if (action === 'review-merge-cancel') {
      adminState.mergingId = null;
      render();
    } else if (action === 'review-approve' || action === 'review-reject' || action === 'review-merge') {
      await adminReviewAction(action, btn.dataset.id, btn);
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
      const book = libraryRows.find((b) => b.id === btn.dataset.id);
      if (!confirm(t("'{title}' 책을 도서관에서 삭제할까요?\n이미 세운 계획은 지워지지 않고 일반 목표로 남습니다.", { title: book.title }))) return;
      btn.disabled = true;
      try {
        await adminDeleteRequiredBook(book.id);
        adminRemoveCoverFile(book.coverUrl);
        setLibraryRows(libraryRows.filter((b) => b.id !== book.id));
        adminState.assignments = adminState.assignments.filter((a) => a.book_id !== book.id);
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
      e.target.value = '';
      if (file) setCoverDraftFile(container, file);
      return;
    }
    if (e.target.dataset.memberGroupAdd) {
      adminAddToGroup(e.target);
      return;
    }
    if (e.target.id === 'member-group-filter') {
      adminState.memberGroupFilter = e.target.value;
      applyMemberFilter(container);
    }
  });

  if (tab === 'books') {
    const form = container.querySelector('#book-form');
    if (form) {
      form.addEventListener('input', (e) => {
        if (e.target.id === 'assign-search') {
          const q = e.target.value.trim().toLowerCase();
          form.querySelectorAll('.assign-item').forEach((el) => { el.hidden = !!q && !el.dataset.search.includes(q); });
          return;
        }
        refreshChapterEditor();
      });
      form.addEventListener('change', (e) => {
        if (e.target.name === 'assign') {
          form.querySelector('#assign-count').textContent = t('{n}명 선택', { n: form.querySelectorAll('input[name="assign"]:checked').length });
        }
      });
      form.querySelector('#assign-search').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
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
  useUnitOf(goal);
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
  if (basis === 'custom') {
    return {
      main: `${describeCustomRange(goal, from, to)}  (${formatAmount(row.amount, 'custom')})`,
      subs: to - from > 1 ? goal.custom.items.slice(from, to) : [],
    };
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
  if (basis === 'custom') return formatAmount(n, basis);
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
  useUnitOf(goal);
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
  const libraryTag = bookTagKind(libraryBookForGoal(goal));
  const groupName = goal.groupId ? groupNameOf(goal.groupId) : '';
  const isRequired = !!libraryTag || !!groupName;

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
    const tagText = groupName || t('배정된 책');
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
  ctx.fillText(t('오늘분량 · {date} ({weekday}) 기준', { date: today, weekday: weekdayLabel(today) }), P, H - P + 16);

  /* ===== 오른쪽: 날짜별 계획 ===== */
  const RX = P + LW + 40;
  const RW = W - P - RX;
  const RY = P;
  const RH = H - P * 2;
  roundRect(ctx, RX, RY, RW, RH, 24, C.surface);
  ctx.font = font(30, 800);
  ctx.fillStyle = C.text;
  ctx.fillText(goal.type === 'lecture' ? t('매일 들을 분량') : goal.type === 'custom' ? t('매일 할 분량') : t('매일 읽을 분량'), RX + 36, RY + 56);
  ctx.font = font(21);
  ctx.fillStyle = C.muted;
  ctx.textAlign = 'right';
  const basisLabel = basis === 'custom' ? t('{unit} 단위', { unit: getUnitLabel('custom') })
    : t({ page: '페이지 기준', chapter: '챕터 기준', lecture: '강의', bible: '장 단위' }[basis]);
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
 * 12-2. 그룹 — 회원 누구나 그룹을 만들어 리더가 되고, 초대 링크/코드로 멤버를 모은다.
 *   리더는 내 목표의 내용(책 목차·강의 목록 등, 날짜 제외)을 그룹에 공유하고,
 *   멤버는 그 내용으로 각자 날짜를 정해 계획한다.
 *   리더는 공유한 목표로 만든 멤버 계획의 진도만 볼 수 있다 (서버 RLS: study_planner_leader_can_view).
 * ========================================================================= */

const GROUPS_TABLE = 'study_planner_groups';
const GROUP_MEMBERS_TABLE = 'study_planner_group_members';
const GROUP_ITEMS_TABLE = 'study_planner_group_items';
const PENDING_JOIN_KEY = 'study-planner:pending-join';

/** 내 그룹 [{ id, name, leaderId, leaderName, inviteCode(리더만), memberCount, isLeader }] */
let myGroups = [];
/** 내 그룹들에 공유된 목표 [{ id, groupId, type, title, content, coverUrl, sourceGoalId, updatedAt }] */
let groupItems = [];

/** 그룹 상세 화면 상태 (리더: 멤버 목록 · 멤버들의 공유 목표) */
const groupState = {
  groupId: null,
  loaded: false,
  loading: false,
  error: null,
  members: [], // [{ user_id, name, email, joined_at }]
  memberGoals: [], // [{ userId, goal }]
  sharing: false, // "내 목표 공유하기" 선택 상자 열림
};

/* ----- 공유 내용 (계산 · 비교) ----- */

/** 목표에서 그룹에 공유할 내용만 (이름은 따로, 날짜·진도·쉬는 날은 제외) */
function goalShareContent(goal) {
  const v = goalToInput(goal);
  if (goal.type === 'book') {
    return { author: v.author, chapters: v.chapters.map((c) => ({ name: c.name, startPage: Number(c.startPage) })), lastPage: v.lastPage };
  }
  if (goal.type === 'bible') return { bibleStart: v.bibleStart, bibleEnd: v.bibleEnd };
  if (goal.type === 'custom') return { customUnit: v.customUnit, customTotal: v.customTotal, customItems: v.customItems };
  return { titles: v.titles };
}

/** 키 순서와 상관없이 같은 값이면 같은 문자열 (서버 jsonb는 키 순서를 바꾼다) */
function canonicalJson(x) {
  if (Array.isArray(x)) return `[${x.map(canonicalJson).join(',')}]`;
  if (x && typeof x === 'object') {
    return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(x[k])}`).join(',')}}`;
  }
  return JSON.stringify(x === undefined ? null : x);
}

function shareSignature(title, content) {
  return canonicalJson({ title: String(title).trim(), ...content });
}

/** 리더가 공유 내용을 바꿔서 내 목표와 달라졌는지 */
function isGroupItemChanged(goal, item) {
  return goal.type !== item.type || shareSignature(goal.title, goalShareContent(goal)) !== shareSignature(item.title, item.content);
}

/** 리더의 원본 목표가 공유한 뒤에 바뀌었는지 (리더 화면의 "공유 내용 업데이트") */
function isSourceGoalChanged(item, goal) {
  return !!goal && (goal.type !== item.type || shareSignature(goal.title, goalShareContent(goal)) !== shareSignature(item.title, item.content));
}

/** 공유 내용 최신본을 반영한 수정 입력 (기간·쉬는 날은 그대로) */
function inputFromGroupItem(goal, item) {
  return { ...goalToInput(goal), title: item.title, ...item.content };
}

function linkGoalToGroupItem(goal, item) {
  goal.groupId = item.groupId;
  goal.groupItemId = item.id;
  return goal;
}

function findGoalForGroupItem(goals, itemId) {
  return goals.find((g) => g.groupItemId === itemId) || null;
}

function groupItemForGoal(goal) {
  return goal && goal.groupItemId ? groupItems.find((i) => i.id === goal.groupItemId) || null : null;
}

/** 그룹 공유 목표의 이름: 책은 필독서, 강의는 필수 시청, 그 밖은 공유 목표 */
const SHARED_KINDS = [
  { key: 'book', label: '필독서', count: '필독서 {n}권' },
  { key: 'lecture', label: '필수 시청', count: '필수 시청 {n}개' },
  { key: 'other', label: '공유 목표', count: '공유 목표 {n}개' },
];

function sharedKindOf(type) {
  return SHARED_KINDS.find((k) => k.key === type) || SHARED_KINDS[2];
}

function renderSharedTag(type) {
  const kind = sharedKindOf(type);
  return `<span class="type-tag shared-${kind.key}">${t(kind.label)}</span>`;
}

/** 종류별로 나누기 → [{ kind, items }] (빈 종류는 뺀다) */
function groupItemsByKind(items) {
  return SHARED_KINDS.map((kind) => ({ kind, items: items.filter((i) => sharedKindOf(i.type) === kind) }))
    .filter((x) => x.items.length);
}

/** "필독서 2권 · 필수 시청 1개" (없으면 "아직 없음") */
function summarizeShared(items) {
  const parts = groupItemsByKind(items).map(({ kind, items: list }) => t(kind.count, { n: list.length }));
  return parts.length ? parts.join(' · ') : t('필독서·필수 시청 없음');
}

function groupNameOf(groupId) {
  const g = myGroups.find((x) => x.id === groupId);
  return g ? g.name : '';
}

/** 공유 목표 한 줄 설명: "312페이지 · 23개 챕터" / "12개 강의" / "창세기~신명기 · 187장" / "120문제" */
function describeShareContent(item) {
  const c = item.content || {};
  if (item.type === 'book' && c.chapters && c.chapters.length) {
    return t('{pages}페이지 · {n}개 챕터', { pages: c.lastPage - c.chapters[0].startPage + 1, n: c.chapters.length });
  }
  if (item.type === 'lecture') return t('{n}개 강의', { n: (c.titles || []).length });
  if (item.type === 'bible') {
    const books = bibleBooksInRange(Number(c.bibleStart), Number(c.bibleEnd));
    return t('{books}권 · {chapters}장', { books: books.length, chapters: books.reduce((sum, b) => sum + b.chapters, 0) });
  }
  if (item.type === 'custom') {
    const total = (c.customItems || []).length || c.customTotal;
    return currentLang === 'en' ? `${total} ${c.customUnit}` : `${total}${c.customUnit}`;
  }
  return '';
}

/** 공유 내용이 올바른 형식인지 (서버에서 받은 행 검사) */
function isValidShareContent(type, content) {
  if (!content || typeof content !== 'object') return false;
  if (type === 'book') return validateBookStructure(content).length === 0;
  if (type === 'lecture') return Array.isArray(content.titles) && content.titles.length > 0;
  if (type === 'bible') return validateBibleInput({ title: 'x', startDate: '2026-01-01', dueDate: '2026-01-01', ...content }).length === 0;
  if (type === 'custom') return validateCustomInput({ title: 'x', startDate: '2026-01-01', dueDate: '2026-01-01', ...content }).length === 0;
  return false;
}

/**
 * 예전 필독서(도서관)로 세운 계획을 같은 내용의 그룹 공유 목표에 연결한다 (필독서 → 그룹 공유 목표 전환).
 * 서버에서 한 번 옮겼지만, 열려 있던 옛 화면이 저장하며 되돌린 경우를 위해 로그인할 때마다 확인한다.
 */
function linkLegacyRequiredGoals(goals = appData.goals) {
  let changed = false;
  goals.forEach((goal) => {
    if (!goal.requiredBookId || goal.groupItemId || goal.type !== 'book') return;
    const item = groupItems.find((i) => {
      const g = myGroups.find((x) => x.id === i.groupId);
      return g && !g.isLeader && i.type === 'book' && !findGoalForGroupItem(goals, i.id) && !isGroupItemChanged(goal, i);
    });
    if (!item) return;
    delete goal.requiredBookId;
    linkGoalToGroupItem(goal, item);
    changed = true;
  });
  return changed;
}

/* ----- 초대 링크 (로그인 전에 들어온 경우 기억) ----- */

function rememberPendingJoin() {
  try {
    if (/^#\/join\/[\w-]+$/.test(location.hash)) localStorage.setItem(PENDING_JOIN_KEY, location.hash);
  } catch (err) { /* 저장소를 못 써도 링크를 다시 누르면 된다 */ }
}

function takePendingJoin() {
  try {
    const hash = localStorage.getItem(PENDING_JOIN_KEY);
    localStorage.removeItem(PENDING_JOIN_KEY);
    return hash && /^#\/join\/[\w-]+$/.test(hash) ? hash : null;
  } catch (err) {
    return null;
  }
}

function inviteLink(code) {
  return `${location.origin}${location.pathname}#/join/${code}`;
}

/* ----- 저장소 (Supabase) ----- */

function rowToGroupItem(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    type: row.type,
    title: row.title,
    content: row.content,
    coverUrl: row.cover_url || null,
    sourceGoalId: row.source_goal_id || null,
    updatedAt: row.updated_at,
  };
}

/** 내 그룹과 공유된 목표 불러오기 */
async function loadGroups() {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('study_planner_my_groups');
  if (error) throw error;
  myGroups = data.map((r) => ({
    id: r.id,
    name: r.name,
    leaderId: r.leader_id,
    leaderName: r.leader_name || '',
    inviteCode: r.invite_code || null,
    memberCount: r.member_count,
    isLeader: r.is_leader,
  }));
  if (!myGroups.length) {
    groupItems = [];
    return;
  }
  const items = await sb.from(GROUP_ITEMS_TABLE)
    .select('id, group_id, type, title, content, cover_url, source_goal_id, updated_at')
    .in('group_id', myGroups.map((g) => g.id)).order('created_at');
  if (items.error) throw items.error;
  groupItems = items.data.map(rowToGroupItem).filter((i) => isValidShareContent(i.type, i.content));
}

/** 그룹 상세(리더): 멤버 목록 + 멤버들이 이 그룹에서 받은 목표 */
async function loadGroupDetail(groupId) {
  groupState.loading = true;
  groupState.error = null;
  try {
    const sb = getSupabase();
    const [members, goals] = await Promise.all([
      sb.rpc('study_planner_group_members', { p_group: groupId }),
      sb.from(GOALS_TABLE).select('user_id, data').eq('data->>groupId', groupId).neq('user_id', currentUser.id),
    ]);
    if (members.error) throw members.error;
    if (goals.error) throw goals.error;
    groupState.members = members.data;
    groupState.memberGoals = goals.data
      .map((r) => ({ userId: r.user_id, goal: r.data }))
      .filter((x) => checkGoalShape(x.goal, 0) === null);
    groupState.loaded = true;
  } catch (err) {
    console.error('[group] 불러오기 실패:', err);
    groupState.error = err.message || String(err);
  }
  groupState.loading = false;
  if (parseRoute().view === 'group') render();
}

async function refreshGroups() {
  await loadGroups();
  groupState.loaded = false;
  renderTopbar();
  render();
}

/* ----- 화면: 그룹 목록 ----- */

function renderGroups(root) {
  const cards = myGroups.map((g) => {
    const items = groupItems.filter((i) => i.groupId === g.id);
    const planned = items.filter((i) => findGoalForGroupItem(appData.goals, i.id)).length;
    return `
      <a class="goal-card group-card" href="#/group/${escapeHtml(g.id)}">
        <div class="card-top">
          <span class="type-tag ${g.isLeader ? 'type-leader' : 'type-group'}">${g.isLeader ? t('리더') : t('멤버')}</span>
          <span class="muted small">${t('멤버 {n}명', { n: g.memberCount })}</span>
        </div>
        <h3 class="card-title">${escapeHtml(g.name)}</h3>
        <p class="card-meta">${g.isLeader ? summarizeShared(items)
          : `${summarizeShared(items)} · ${t('계획 {n}개', { n: planned })}`}</p>
      </a>`;
  }).join('');

  root.innerHTML = `
    <div id="groups-page">
      <header class="page-header">
        <div>
          <a class="back-link" href="#/">← ${t('내 계획')}</a>
          <h1>${t('그룹')}</h1>
          <p class="muted">${t('그룹을 만들면 리더가 되어 책·강의 같은 목표를 멤버들에게 나눠 주고 진도를 볼 수 있어요.')}</p>
        </div>
      </header>

      <div class="group-actions">
        <form class="panel group-form" data-form="create" novalidate>
          <h2 class="section-title">${t('새 그룹 만들기')}</h2>
          <div class="group-form-row">
            <input id="g-name" type="text" class="input" maxlength="40" placeholder="${t('예: 청년부 독서 모임')}">
            <button type="submit" class="btn btn-primary">${t('만들기')}</button>
          </div>
        </form>
        <form class="panel group-form" data-form="join" novalidate>
          <h2 class="section-title">${t('초대 코드로 참여')}</h2>
          <div class="group-form-row">
            <input id="g-code" type="text" class="input input-code" maxlength="6" placeholder="${t('6자리 코드')}" autocomplete="off">
            <button type="submit" class="btn">${t('참여하기')}</button>
          </div>
        </form>
      </div>
      <p class="errors" id="group-error" hidden></p>

      <section>
        <h2 class="section-title">${t('내 그룹')} <span class="count">${myGroups.length}</span></h2>
        ${myGroups.length ? `<div class="card-grid">${cards}</div>` : `<div class="empty">${t('아직 속한 그룹이 없습니다.')}</div>`}
      </section>
    </div>`;

  const page = root.querySelector('#groups-page');
  page.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kind = e.target.dataset.form;
    const errorEl = page.querySelector('#group-error');
    const btn = e.target.querySelector('button[type="submit"]');
    errorEl.hidden = true;
    try {
      btn.disabled = true;
      if (kind === 'create') {
        const name = page.querySelector('#g-name').value.trim();
        if (!name) throw new Error(t('그룹 이름을 입력하세요.'));
        const { data, error } = await getSupabase().from(GROUPS_TABLE)
          .insert({ name, leader_id: currentUser.id }).select('id').single();
        if (error) throw error;
        await loadGroups();
        renderTopbar();
        navigate(`#/group/${data.id}`);
      } else {
        const code = page.querySelector('#g-code').value.trim().toUpperCase();
        if (!/^[0-9A-F]{6}$/.test(code)) throw new Error(t('초대 코드 6자리를 확인하세요.'));
        navigate(`#/join/${code}`);
      }
    } catch (err) {
      errorEl.textContent = err.message || String(err);
      errorEl.hidden = false;
      btn.disabled = false;
    }
  });
}

/* ----- 화면: 초대 링크로 참여 ----- */

function renderJoinGroup(root, code) {
  root.innerHTML = `<div class="empty">${t('불러오는 중…')}</div>`;
  getSupabase().rpc('study_planner_group_by_code', { p_code: code }).then(({ data, error }) => {
    if (parseRoute().view !== 'join') return;
    const info = !error && data && data[0];
    if (!info) {
      renderMessageScreen(root, t('그룹을 찾을 수 없습니다'), `
        <p class="muted">${t('초대 코드가 틀렸거나, 리더가 코드를 새로 만들었을 수 있어요. 리더에게 새 링크를 받아 주세요.')}</p>
        <a class="btn" href="#/groups">${t('그룹 목록')}</a>`);
      return;
    }
    if (info.is_member) { navigate(`#/group/${info.id}`); return; }
    renderMessageScreen(root, t("'{name}' 그룹에 참여할까요?", { name: escapeHtml(info.name) }), `
      <p class="muted">${t('리더: {name}', { name: escapeHtml(info.leader_name) })}</p>
      <p class="muted">${t('참여하면 리더가 공유한 목표로 계획을 세울 수 있고, 리더는 그 목표의 진도만 볼 수 있어요. 개인 목표는 보이지 않습니다.')}</p>
      <div class="join-actions">
        <button type="button" class="btn btn-primary" data-action="join">${t('참여하기')}</button>
        <a class="btn" href="#/">${t('취소')}</a>
      </div>
      <p class="errors" id="join-error" hidden></p>`);
    root.querySelector('[data-action="join"]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      const res = await getSupabase().rpc('study_planner_join_group', { p_code: code });
      if (res.error) {
        const el = root.querySelector('#join-error');
        el.textContent = res.error.message;
        el.hidden = false;
        e.target.disabled = false;
        return;
      }
      await loadGroups();
      renderTopbar();
      navigate(`#/group/${res.data}`);
    });
  });
}

/* ----- 화면: 그룹 상세 ----- */

function renderGroupPage(root, route) {
  const group = myGroups.find((g) => g.id === route.groupId);
  if (!group) { navigate('#/groups'); return; }
  if (groupState.groupId !== group.id) {
    Object.assign(groupState, { groupId: group.id, loaded: false, error: null, members: [], memberGoals: [], sharing: false });
  }
  if (group.isLeader && !groupState.loaded && !groupState.loading && !groupState.error) loadGroupDetail(group.id);

  const body = route.userId && group.isLeader
    ? renderGroupMemberGoal(group, route.userId, route.goalId)
    : group.isLeader ? renderLeaderGroup(group) : renderMemberGroup(group);

  root.innerHTML = `<div id="group-page">${body}</div>`;
  bindGroupEvents(root.querySelector('#group-page'), group);
}

function renderGroupHeader(group, actions) {
  return `
    <header class="page-header">
      <div>
        <a class="back-link" href="#/groups">← ${t('그룹 목록')}</a>
        <h1>${escapeHtml(group.name)}</h1>
        <p class="muted">${group.isLeader ? t('내가 리더인 그룹') : t('리더 {name}', { name: escapeHtml(group.leaderName) })} · ${t('멤버 {n}명', { n: group.memberCount })}</p>
      </div>
      <div class="header-actions">${actions}</div>
    </header>`;
}

/** 멤버 화면: 공유된 목표 → 계획 세우기 / 내 계획 보기 */
function renderMemberGroup(group) {
  const today = todayStr();
  const items = groupItems.filter((i) => i.groupId === group.id);
  const renderRow = (item) => {
    const goal = findGoalForGroupItem(appData.goals, item.id);
    const s = goal ? getGoalSummary(goal, undefined, today) : null;
    return `
      <div class="group-item">
        ${renderCoverThumb(item.coverUrl, 'sm')}
        <div class="group-item-main">
          <div>${renderSharedTag(item.type)} <strong>${escapeHtml(item.title)}</strong></div>
          <div class="muted small">${escapeHtml(describeShareContent(item))}</div>
        </div>
        <div class="group-item-side">
          ${goal ? `${renderStatusBadge(s)}${isGroupItemChanged(goal, item) ? ` <span class="badge badge-ended">${t('내용 변경됨')}</span>` : ''}
            <a class="btn btn-small" href="#/goal/${escapeHtml(goal.id)}">${t('내 계획 보기')}</a>`
          : `<a class="btn btn-primary btn-small" href="#/new/group/${escapeHtml(item.id)}">${t('계획 세우기')}</a>`}
        </div>
      </div>`;
  };
  const sections = groupItemsByKind(items).map(({ kind, items: list }) => `
    <section class="panel">
      <h2 class="section-title">${t(kind.label)} <span class="count">${list.length}</span></h2>
      <div class="group-items">${list.map(renderRow).join('')}</div>
    </section>`).join('');
  return `
    ${renderGroupHeader(group, `<button type="button" class="btn btn-danger" data-action="group-leave">${t('그룹 나가기')}</button>`)}
    ${sections || `<div class="empty">${t('리더가 아직 필독서나 필수 시청을 정하지 않았습니다.')}</div>`}
    <p class="muted small">${t('리더는 여기서 만든 계획의 진도만 볼 수 있어요. 개인 목표는 보이지 않습니다.')}</p>`;
}

/**
 * 공유 목표 하나 + 멤버별 진도 표 (리더 화면 · 관리자 회원 관리 공용)
 *  members: [{ user_id, name, email }] (null이면 불러오는 중) / memberGoals: [{ userId, goal }]
 */
function renderGroupItemProgress(item, members, memberGoals, actionsHtml, linkFor) {
  const today = todayStr();
  const entries = memberGoals.filter((x) => x.goal.groupItemId === item.id);
  // 밀린 사람 → 진행 중 → 완료 → 계획 없음 순
  const rank = (m) => {
    const entry = entries.find((x) => x.userId === m.user_id);
    if (!entry) return 3;
    const s = getGoalSummary(entry.goal, undefined, today);
    return s.isActive && !s.notStarted && s.diff < 0 ? 0 : s.isComplete ? 2 : 1;
  };
  const sorted = (members || []).map((m) => ({ m, r: rank(m) }))
    .sort((a, b) => a.r - b.r || profileName(a.m).localeCompare(profileName(b.m))).map((x) => x.m);
  const behind = sorted.filter((m) => rank(m) === 0).length;
  const memberRows = sorted.map((m) => {
    const entry = entries.find((x) => x.userId === m.user_id);
    if (!entry) return `<tr><td>${escapeHtml(profileName(m))}</td><td colspan="4" class="muted">${t('아직 계획 없음')}</td></tr>`;
    const goal = entry.goal;
    const s = getGoalSummary(goal, undefined, today);
    const targetPct = s.total ? Math.min(100, (s.target / s.total) * 100) : 0;
    const donePct = s.total ? Math.min(100, (s.done / s.total) * 100) : 0;
    const last = goal.progress.history.length ? goal.progress.history[0].date : null;
    return `
      <tr class="${s.isActive ? '' : 'is-finished-row'}">
        <td><a class="member-link" href="${escapeHtml(linkFor(m, goal))}">${escapeHtml(profileName(m))}</a></td>
        <td class="muted">${formatShortDate(goal.startDate)} ~ ${formatShortDate(goal.dueDate)} · ${formatDday(s.dday)}</td>
        <td class="col-bar">
          <div class="mini-bar"><div class="compare-fill" style="width:${donePct}%"></div><div class="compare-marker" style="left:${targetPct}%"></div></div>
          <span class="mini-pct">${s.percent}%</span>
        </td>
        <td>${renderStatusBadge(s)}</td>
        <td class="muted">${last ? formatShortDate(last) : '-'}</td>
      </tr>`;
  }).join('');
  const plannedCount = members ? members.filter((m) => entries.some((x) => x.userId === m.user_id)).length : 0;
  return `
    <section class="panel group-share">
      <div class="group-item">
        ${renderCoverThumb(item.coverUrl, 'sm')}
        <div class="group-item-main">
          <div>${renderSharedTag(item.type)} <strong>${escapeHtml(item.title)}</strong></div>
          <div class="muted small">${escapeHtml(describeShareContent(item))}${members ? ` · ${t('계획 세운 멤버 {n}/{total}명', { n: plannedCount, total: members.length })}` : ''}${
            behind ? ` · <b class="text-danger">${t('밀림 {n}명', { n: behind })}</b>` : ''}</div>
        </div>
        <div class="group-item-side">${actionsHtml}</div>
      </div>
      ${!members ? '' : members.length ? `
      <table class="admin-table">
        <thead><tr><th>${t('멤버')}</th><th>${t('기간')}</th><th class="col-bar">${t('진도')}</th><th>${t('상태')}</th><th>${t('마지막 기록')}</th></tr></thead>
        <tbody>${memberRows}</tbody>
      </table>` : `<p class="muted small">${t('아직 참여한 멤버가 없습니다. 초대 링크를 보내 주세요.')}</p>`}
    </section>`;
}

/** 리더 화면: 초대 · 공유한 목표(멤버 진도) · 멤버 */
function renderLeaderGroup(group) {
  const today = todayStr();
  const items = groupItems.filter((i) => i.groupId === group.id);
  const sharedSources = new Set(items.map((i) => i.sourceGoalId).filter(Boolean));
  // 그룹에서 받은 목표는 다시 공유하지 않는다 (다른 그룹 내용의 재배포 방지)
  const shareable = appData.goals.filter((g) => !sharedSources.has(g.id) && !g.groupItemId);
  const loading = !groupState.loaded;

  const renderItem = (item) => {
    const source = item.sourceGoalId ? getGoal(item.sourceGoalId) : null;
    const actions = `
      ${isSourceGoalChanged(item, source) ? `<button type="button" class="btn btn-small" data-action="share-update" data-item="${escapeHtml(item.id)}"
        title="${t('내 목표에서 바꾼 이름·내용을 멤버들에게 다시 공유합니다')}">${t('바뀐 내용 공유')}</button>` : ''}
      <button type="button" class="btn btn-small btn-danger" data-action="share-delete" data-item="${escapeHtml(item.id)}">${t('공유 취소')}</button>`;
    return renderGroupItemProgress(item, loading ? null : groupState.members, groupState.memberGoals, actions,
      (m, goal) => `#/group/${group.id}/member/${m.user_id}/${goal.id}`);
  };
  const itemsHtml = groupItemsByKind(items).map(({ kind, items: list }) => `
    <h3 class="shared-kind-title">${t(kind.label)} <span class="count">${list.length}</span></h3>
    ${list.map(renderItem).join('')}`).join('');

  const membersHtml = groupState.members.map((m) => `
    <tr>
      <td>${escapeHtml(profileName(m))}</td>
      <td class="muted">${escapeHtml(m.email)}</td>
      <td class="muted nowrap">${timestampToDate(m.joined_at)}</td>
      <td class="num"><button type="button" class="btn btn-small btn-danger" data-action="member-remove" data-user="${escapeHtml(m.user_id)}" data-name="${escapeHtml(profileName(m))}">${t('내보내기||member')}</button></td>
    </tr>`).join('');

  return `
    ${renderGroupHeader(group, `
      <button type="button" class="btn" data-action="group-refresh">${t('새로고침')}</button>
      <button type="button" class="btn" data-action="group-rename">${t('이름 바꾸기')}</button>
      <button type="button" class="btn btn-danger" data-action="group-delete">${t('그룹 삭제')}</button>`)}
    ${groupState.error ? `<div class="errors">${t('불러오지 못했습니다: {message}', { message: escapeHtml(groupState.error) })}</div>` : ''}

    <section class="panel invite-panel">
      <h2 class="section-title">${t('멤버 초대')}</h2>
      <div class="invite-row">
        <span class="invite-code">${escapeHtml(group.inviteCode || '')}</span>
        <input class="input invite-link" type="text" readonly value="${escapeHtml(inviteLink(group.inviteCode || ''))}">
        <button type="button" class="btn btn-primary" data-action="invite-copy">${t('링크 복사')}</button>
        <button type="button" class="btn" data-action="invite-reset" title="${t('지금 코드는 더 이상 쓸 수 없게 됩니다')}">${t('코드 새로 만들기')}</button>
      </div>
      <p class="muted small">${t('링크를 받은 사람은 로그인한 뒤 바로 참여할 수 있어요. 코드만 알려 줘도 [그룹 → 초대 코드로 참여]에서 들어올 수 있습니다.')}</p>
    </section>

    <div class="section-head">
      <h2 class="section-title">${t('필독서 · 필수 시청')} <span class="count">${items.length}</span></h2>
      <button type="button" class="btn btn-primary" data-action="share-open">${t('+ 내 목표 공유하기')}</button>
    </div>
    ${groupState.sharing ? `
    <div class="panel share-picker">
      ${shareable.length ? `
        <p class="muted small">${t('내 목표의 이름과 내용(목차·목록·범위)만 공유되고, 날짜와 진도는 공유되지 않아요. 멤버는 각자 날짜를 정합니다.')}</p>
        <div class="group-form-row">
          <select id="share-goal" class="input">
            ${shareable.map((g) => `<option value="${escapeHtml(g.id)}">[${typeLabel(g.type)}] ${escapeHtml(g.title)}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-primary" data-action="share-confirm">${t('공유')}</button>
          <button type="button" class="btn" data-action="share-close">${t('취소')}</button>
        </div>`
      : `<p class="muted">${t('공유할 목표가 없습니다. 먼저 <a href="#/new">새 목표</a>를 만들어 주세요. (그룹에서 받은 목표는 다시 공유할 수 없어요)')}</p>
         <button type="button" class="btn btn-small" data-action="share-close">${t('닫기')}</button>`}
    </div>` : ''}
    ${items.length ? itemsHtml : `<div class="empty">${t('아직 필독서나 필수 시청이 없습니다. 내 책·강의 목표를 공유하면 멤버들이 같은 내용으로 계획을 세울 수 있어요.')}</div>`}

    <section class="panel">
      <h2 class="section-title">${t('멤버')} <span class="count">${loading ? '' : groupState.members.length}</span></h2>
      ${loading ? `<div class="empty">${t('불러오는 중…')}</div>` : groupState.members.length ? `
      <table class="admin-table">
        <thead><tr><th>${t('이름')}</th><th>${t('이메일')}</th><th>${t('참여일')}</th><th></th></tr></thead>
        <tbody>${membersHtml}</tbody>
      </table>` : `<p class="muted">${t('아직 참여한 멤버가 없습니다. 초대 링크를 보내 주세요.')}</p>`}
    </section>`;
}

/** 리더: 멤버 한 사람의 공유 목표 계획 (읽기 전용) */
function renderGroupMemberGoal(group, userId, goalId) {
  const back = `<a class="back-link" href="#/group/${escapeHtml(group.id)}">← ${escapeHtml(group.name)}</a>`;
  if (!groupState.loaded) return `${back}<div class="empty">${t('불러오는 중…')}</div>`;
  const entry = groupState.memberGoals.find((x) => x.userId === userId && x.goal.id === goalId);
  const m = groupState.members.find((x) => x.user_id === userId);
  if (!entry || !m) return `${back}<div class="empty">${t('목표를 찾을 수 없습니다.')}</div>`;
  const goal = entry.goal;
  const basis = getPrimaryBasis(goal);
  const s = getGoalSummary(goal);
  const rest = getRestWeekdays(goal);
  return `
    ${back}
    <div class="member-goal-head">
      ${renderCoverThumb(getCoverUrl(goal), 'lg')}
      <div>
        <p class="muted">${t('{name}님의 계획', { name: escapeHtml(profileName(m)) })}</p>
        <h2 class="member-goal-title">${escapeHtml(goal.title)}</h2>
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
      </div>
      ${renderPlanTable(goal, basis, true)}
    </section>`;
}

function bindGroupEvents(container, group) {
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const sb = getSupabase();
    const run = async (fn) => {
      btn.disabled = true;
      try {
        await fn();
      } catch (err) {
        console.error('[group]', err);
        alert(t('처리하지 못했습니다.\n\n{message}', { message: err.message || String(err) }));
        btn.disabled = false;
      }
    };
    const check = ({ error }) => { if (error) throw error; };

    if (action === 'group-refresh') {
      groupState.loaded = false;
      groupState.error = null;
      await run(refreshGroups);
    } else if (action === 'invite-copy') {
      const link = inviteLink(group.inviteCode);
      try {
        await navigator.clipboard.writeText(link);
        btn.textContent = t('복사됨');
      } catch (err) {
        container.querySelector('.invite-link').select();
      }
    } else if (action === 'invite-reset') {
      if (!confirm(t('초대 코드를 새로 만들까요?\n지금 코드와 링크로는 더 이상 참여할 수 없습니다. (이미 참여한 멤버는 그대로예요)'))) return;
      await run(async () => { check(await sb.rpc('study_planner_reset_invite', { p_group: group.id })); await refreshGroups(); });
    } else if (action === 'group-rename') {
      const name = prompt(t('새 그룹 이름'), group.name);
      if (name === null || !name.trim() || name.trim() === group.name) return;
      await run(async () => { check(await sb.from(GROUPS_TABLE).update({ name: name.trim().slice(0, 40) }).eq('id', group.id)); await refreshGroups(); });
    } else if (action === 'group-delete') {
      if (!confirm(t("'{name}' 그룹을 삭제할까요?\n공유한 목표와 멤버 목록이 사라집니다. 멤버들이 이미 만든 계획은 각자에게 개인 목표로 남습니다.", { name: group.name }))) return;
      await run(async () => { check(await sb.from(GROUPS_TABLE).delete().eq('id', group.id)); await loadGroups(); renderTopbar(); navigate('#/groups'); });
    } else if (action === 'group-leave') {
      if (!confirm(t("'{name}' 그룹에서 나갈까요?\n이미 만든 계획은 개인 목표로 남고, 리더는 더 이상 볼 수 없습니다.", { name: group.name }))) return;
      await run(async () => {
        check(await sb.from(GROUP_MEMBERS_TABLE).delete().eq('group_id', group.id).eq('user_id', currentUser.id));
        await loadGroups();
        renderTopbar();
        navigate('#/groups');
      });
    } else if (action === 'member-remove') {
      if (!confirm(t("{name}님을 그룹에서 내보낼까요?\n그 멤버의 계획은 개인 목표로 남고, 더 이상 볼 수 없습니다.", { name: btn.dataset.name }))) return;
      await run(async () => { check(await sb.from(GROUP_MEMBERS_TABLE).delete().eq('group_id', group.id).eq('user_id', btn.dataset.user)); await refreshGroups(); });
    } else if (action === 'share-open' || action === 'share-close') {
      groupState.sharing = action === 'share-open';
      render();
    } else if (action === 'share-confirm') {
      const goal = getGoal(container.querySelector('#share-goal').value);
      if (!goal) return;
      await run(async () => {
        check(await sb.from(GROUP_ITEMS_TABLE).insert({
          group_id: group.id, type: goal.type, title: goal.title.trim(), content: goalShareContent(goal),
          cover_url: getCoverUrl(goal), source_goal_id: goal.id,
        }));
        groupState.sharing = false;
        await refreshGroups();
      });
    } else if (action === 'share-update') {
      const item = groupItems.find((i) => i.id === btn.dataset.item);
      const goal = item && getGoal(item.sourceGoalId);
      if (!goal) return;
      if (!confirm(t('내 목표의 바뀐 이름·내용을 멤버들에게 다시 공유할까요?\n이미 계획을 세운 멤버에게는 "적용할까요?" 안내가 나타납니다.'))) return;
      await run(async () => {
        check(await sb.from(GROUP_ITEMS_TABLE).update({
          type: goal.type, title: goal.title.trim(), content: goalShareContent(goal), cover_url: getCoverUrl(goal), updated_at: new Date().toISOString(),
        }).eq('id', item.id));
        await refreshGroups();
      });
    } else if (action === 'share-delete') {
      const item = groupItems.find((i) => i.id === btn.dataset.item);
      if (!item || !confirm(t("'{title}' 공유를 취소할까요?\n멤버들이 이미 만든 계획은 각자에게 개인 목표로 남지만, 리더는 더 이상 진도를 볼 수 없습니다.", { title: item.title }))) return;
      await run(async () => { check(await sb.from(GROUP_ITEMS_TABLE).delete().eq('id', item.id)); await refreshGroups(); });
    }
  });
}

/* ----- 대시보드 · 목표 화면 연결 ----- */

/** 대시보드: 아직 계획을 세우지 않은 그룹 공유 목표 */
function renderGroupInbox() {
  const pending = groupItems.filter((i) => {
    const g = myGroups.find((x) => x.id === i.groupId);
    return g && !g.isLeader && !findGoalForGroupItem(appData.goals, i.id);
  });
  if (!pending.length) return '';
  const cards = pending.map((item) => `
    <div class="goal-card required-empty">
      <div class="card-top">
        <span class="card-tags">${renderSharedTag(item.type)} <span class="type-tag type-group">${escapeHtml(groupNameOf(item.groupId))}</span></span>
        <span class="badge badge-waiting">${t('계획 없음')}</span>
      </div>
      <div class="card-book">
        ${renderCoverThumb(item.coverUrl)}
        <div>
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          <p class="card-meta">${typeLabel(item.type)} · ${escapeHtml(describeShareContent(item))}</p>
        </div>
      </div>
      <a class="btn btn-primary" href="#/new/group/${escapeHtml(item.id)}">${t('계획 세우기')}</a>
    </div>`).join('');
  return `
    <section class="required-section">
      <h2 class="section-title">${t('그룹 필독서 · 필수 시청')} <span class="count">${pending.length}</span></h2>
      <div class="card-grid">${cards}</div>
    </section>`;
}

/** 상세 화면: 리더가 공유 내용을 바꿨으면 적용 안내 */
function renderGroupItemNotice(goal) {
  const item = groupItemForGoal(goal);
  if (!item || !isGroupItemChanged(goal, item) || detailState.preview) return '';
  return `
    <div class="notice notice-row">
      <span>${t('그룹 리더가 공유 내용(이름·목차·목록)을 수정했습니다. 내 계획에 적용할까요?')}</span>
      <button type="button" class="btn btn-small" data-action="sync-group">${t('적용 미리보기')}</button>
    </div>`;
}

/** 목표 폼: 공유받은 내용 입력칸을 읽기 전용으로 */
function lockSharedContentInputs(root) {
  root.querySelectorAll('#f-lectures, #f-custom-unit, #f-custom-total, #f-custom-items').forEach((el) => { el.readOnly = true; });
  root.querySelectorAll('#f-bible-start, #f-bible-end').forEach((el) => { el.disabled = true; });
  root.querySelectorAll('.bible-presets, .custom-unit-presets').forEach((el) => { el.hidden = true; });
}

/* =========================================================================
 * 13. 영어 번역 — 키는 한국어 원문 (t() 참고)
 *     값이 함수면 매개변수로 문장을 만든다 (단수/복수 등).
 * ========================================================================= */

const EN = {
  // 공통 · 상단 바 · 로그인
  '백업 내보내기': 'Export backup',
  '백업에서 복원': 'Restore from backup',
  '내보낼 목표가 없습니다.': 'There are no goals to export.',
  '목차를 복사해 붙여넣거나 사진을 찍어 올리면 챕터를 자동으로 채웁니다. 목차가 여러 쪽이면 사진을 여러 장 함께 고르세요.': 'Paste the table of contents or upload a photo to fill in chapters automatically. If the contents run over several pages, select all the photos at once.',
  '목차 읽는 중… ({i}/{n})': 'Reading contents… ({i}/{n})',
  '챕터 {n}개를 채웠습니다.': (p) => `Filled in ${p.n} ${p.n === 1 ? 'chapter' : 'chapters'}.`,
  '페이지를 읽지 못한 {n}개는 노란 칸에 직접 넣어 주세요.': (p) => `Enter the start page for the ${p.n} highlighted ${p.n === 1 ? 'row' : 'rows'} yourself.`,
  '사진 {n}장은 읽지 못했습니다.': (p) => `Couldn't read ${p.n} ${p.n === 1 ? 'photo' : 'photos'}.`,
  '저장하기 전에 목차와 비교해 확인하세요.': 'Check it against the book before saving.',
  'AI 목차 인식': 'AI contents reader',
  '책의 목차 페이지를 찍어 올리면 AI가 챕터 이름과 시작 페이지를 읽어 한 번에 채워요. 여러 쪽이면 사진을 여러 장 함께 고르세요.': 'Snap the table of contents and AI fills in every chapter name and start page at once. If it runs over several pages, select all the photos together.',
  '목차 사진 올리기': 'Upload contents photo',
  '사진이 없으면': 'No photo?',
  '목차 글자 붙여넣기': 'Paste the contents as text',
  '(선택 · 이미 읽기 시작한 책이면 입력)': '(optional · if you have already started)',
  '예: 42': 'e.g. 42',
  '비워 두면 처음부터 읽는 것으로 계획합니다.': 'Leave blank to plan from the beginning.',
  'p.{p}까지 읽음 → 남은 {n}페이지를 나눕니다.': (p) => `Read through p.${p.p} → the remaining ${p.n} ${p.n === 1 ? 'page' : 'pages'} will be split.`,
  '첫 챕터 시작 페이지와 마지막 페이지 사이로 입력하세요.': 'Enter a page between the first chapter and the last page.',
  '마지막으로 읽은 페이지는 {a}~{b} 사이로 입력하세요. 처음부터 읽을 거면 비워 두세요.': 'Enter a last page read between {a} and {b}, or leave it blank to start from the beginning.',
  '사진을 이 상자에 끌어다 놓아도 돼요.': 'You can also drag photos onto this box.',
  '이미지 파일(JPG·PNG 등)을 끌어다 놓아 주세요.': 'Drop image files (JPG, PNG, etc.).',
  '기간 정하는 방법': 'How to set the schedule',
  '마감일로 정하기': 'By due date',
  '하루 분량으로 정하기': 'By daily amount',
  '하루': 'Do',
  '씩 하면': 'a day →',
  '하루 분량을 입력하세요': 'Enter a daily amount',
  '챕터와 마지막 페이지를 먼저 입력하세요': 'Enter the chapters and last page first',
  '목록을 먼저 입력하세요': 'Enter the list first',
  '공부하는 날이 없어 계산할 수 없어요': 'No study days to calculate with',
  '{date} ({wd})에 끝나요': "you'll finish on {date} ({wd})",
  '또는 하루 분량으로': 'Or by daily amount',
  '오늘부터 하루': 'From today, do',
  '이미 다 끝냈어요': 'Already finished',
  '{left} 남음 · 오늘 분량 {amount}': '{left} left · today {amount}',
  '표지 칸에 이미지를 끌어다 놓아도 돼요.': 'You can also drag an image onto the cover.',
  '표지는 JPG·PNG·WEBP·GIF 이미지로 올려 주세요.': 'Please use a JPG, PNG, WEBP or GIF image for the cover.',
  '오늘분량': "Today's Dose",
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
  '오늘분량 · {date} ({weekday}) 기준': "Today's Dose · as of {date} ({weekday})",
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

  // 도서관
  '도서관': 'Library',
  '배정': 'Assigned',
  '배정된 책': 'Assigned book',
  '필독서 · 배정된 책': 'Required & assigned books',
  '도서관 책으로 계획 세우기': 'Plan a library book',
  '도서관에 있는 책입니다. 책 제목과 챕터는 관리자가 정하며, 여기서는 시작일·마감일·쉬는 요일만 정할 수 있습니다.':
    'This book is from the library. The admin sets the title and chapters; here you can only choose the start date, due date and rest days.',
  '도서관에서 고르기': 'Pick from library',
  '도서관에 있는 책을 고르면 제목과 챕터를 입력하지 않아도 됩니다.': "Pick a book from the library and you won't need to enter the title and chapters.",
  '아직 고를 수 있는 도서관 책이 없습니다.': 'There are no library books you can pick yet.',
  '검색 결과가 없습니다.': 'No results.',
  '계획 있음': 'Planned',
  '제목이나 저자로 검색': 'Search by title or author',
  '도서관 검색': 'Search the library',
  '목차 붙여넣기': 'Paste table of contents',
  '목차 사진으로 채우기': 'Fill from TOC photo',
  '목차를 복사해 붙여넣거나 사진을 찍어 올리면 챕터를 자동으로 채웁니다.': 'Paste the table of contents or upload a photo of it to fill in the chapters automatically.',
  '예:\n1장 도입 ········ 11\n2장 기도의 삶 ····· 35\n3장 말씀 묵상 (58)': 'e.g.\n1. Introduction ········ 11\n2. A Life of Prayer ····· 35\n3. Meditating on the Word (58)',
  '챕터 채우기': 'Fill chapters',
  '지금 입력한 챕터를 목차 내용으로 바꿀까요?': 'Replace the chapters you entered with the table of contents?',
  '이미지를 읽지 못했습니다. JPG나 PNG 사진으로 다시 시도하세요.': "Couldn't read the image. Try again with a JPG or PNG photo.",
  '{n}개 챕터 인식 (페이지 {p}개)': (p) => `${plural(p.n, 'chapter')} found (${plural(p.p, 'page number')})`,
  '목차 읽는 중…': 'Reading TOC…',
  '사진에서 목차를 찾지 못했습니다. 목차가 잘 보이게 다시 찍어 주세요.': "Couldn't find a table of contents in the photo. Please retake it so the contents are clearly visible.",
  '목차를 읽지 못했습니다': "Couldn't read the table of contents",
  '도서관 검토 중 관리자가 책 정보를 수정했습니다. 내 계획에 적용할까요?': 'The admin edited the book details while reviewing it for the library. Apply the changes to your plan?',
  '관리자가 도서관의 책 정보(제목·챕터·페이지)를 수정했습니다. 내 계획에 적용할까요?': 'The admin edited this library book (title, chapters or pages). Apply the changes to your plan?',
  '적용 미리보기': 'Preview changes',
  '도서관 검토 대기 중': 'Waiting for library review',
  '도서관 등록 반려됨': 'Not added to the library',
  '도서관에 등록됨': 'Added to the library',
  '아직 필독서나 배정된 책이 없습니다. <a href="#/admin/books">도서관</a>에서 정하세요.': 'No required or assigned books yet. Set them up in the <a href="#/admin/books">Library</a>.',
  '아직 이 책을 받을 사람이 없습니다. (우리 팀 지정은 <a href="#/admin/members">회원 관리</a>에서)': 'Nobody receives this book yet. (Set team members in <a href="#/admin/members">Members</a>.)',
  '공개': 'Public',
  '배정 {n}명': (p) => `Assigned to ${plural(p.n, 'person', 'people')}`,
  '제출된 책 검토': 'Review submitted book',
  '도서관 책 수정': 'Edit library book',
  '도서관에 책 추가': 'Add a book to the library',
  '{name}님이 {date}에 만든 계획에서 제출된 책입니다. 필요하면 고친 뒤 승인하세요. 고친 내용은 제출한 사람에게 적용 여부를 묻습니다.':
    "Submitted from a plan {name} made on {date}. Fix anything needed, then approve. {name} will be asked whether to apply your edits.",
  '저장하면 이미 계획을 세운 사람에게 "내용 변경됨"이 표시되고, 각자 미리보기를 확인한 뒤 자기 계획에 적용합니다.':
    'When you save, people who already made a plan will see "Changed", and each can preview and apply it to their own plan.',
  '누구에게 보일까요?': 'Who should see it?',
  '(아무것도 고르지 않으면 도서관에 보관만 합니다)': '(If nothing is selected, the book is just kept in the library)',
  '팀 필독서': 'Team required reading',
  '우리 팀 모두의 대시보드에 필독서로 보입니다': "Shown as required reading on every team member's dashboard",
  '누구나 새 목표에서 "도서관에서 고르기"로 고를 수 있습니다': 'Anyone can pick it with "Pick from library" when adding a goal',
  '특정 사람에게 배정': 'Assign to specific people',
  '{n}명 선택': (p) => `${plural(p.n, 'person', 'people')} selected`,
  '이름이나 이메일로 찾기': 'Find by name or email',
  '회원 찾기': 'Find members',
  '반려': 'Reject',
  '승인하고 저장': 'Approve & save',
  '도서관의 책 정보(제목·챕터·페이지)는 고른 사람 모두에게 공유됩니다. 기간은 각자 정합니다. 회원이 직접 만든 책 목표는 검토 대기로 들어옵니다.':
    "A library book's details (title, chapters, pages) are shared with everyone who picks it; each person sets their own dates. Book goals members create themselves arrive here for review.",
  '+ 책 추가': '+ Add book',
  '알 수 없음': 'Unknown',
  '해당하는 책이 없습니다.': 'No matching books.',
  '계획 세운 사람': 'People with a plan',
  '보관만': 'Stored only',
  '{n}명': (p) => plural(p.n, 'person', 'people'),
  '검토할 책이 없습니다.': 'Nothing to review.',
  '{name} · {date} 제출': 'Submitted by {name} · {date}',
  '비슷한 책이 이미 있음: {titles}': 'A similar book already exists: {titles}',
  '검토': 'Review',
  '바로 승인': 'Approve',
  '기존 책과 연결': 'Link to existing book',
  '연결할 도서관 책': 'Library book to link to',
  '연결': 'Link',
  '제출한 사람의 계획이 고른 책과 연결되고, 다른 내용은 적용 여부를 묻습니다.': "The submitter's plan will be linked to the chosen book, and they'll be asked whether to apply any differences.",
  "'{title}'을(를) 반려합니다. 제출한 사람에게 보여줄 메모 (선택)": "Rejecting '{title}'. Note for the submitter (optional)",
  "'{title}' 책을 도서관에서 삭제할까요?\n이미 세운 계획은 지워지지 않고 일반 목표로 남습니다.": "Delete '{title}' from the library?\nPlans people already made won't be deleted; they'll stay as regular goals.",
  '검토 대기': 'Pending review',
  '전체||filter': 'All',
  // 기타 종류
  '기타': 'Other',
  '아직 시작 전': 'Not started yet',
  '{unit} 단위': (p) => `By ${p.unit}`,
  '{n}번': (p) => `#${p.n}`,
  '{from}~{to}번': (p) => `#${p.from}–${p.to}`,
  '할 내용': 'To do',
  '매일 할 분량': 'Daily amount',
  '목표 이름': 'Goal name',
  '단위 이름': 'Unit name',
  '전체 개수': 'Total count',
  '항목 목록': 'Item list',
  '(선택 · 한 줄에 하나)': '(optional · one per line)',
  '예: 문제, 과제, 단원, 단어': 'e.g. problems, tasks, units, words',
  '문제': 'problems',
  '과제': 'tasks',
  '단원': 'units',
  '단어': 'words',
  '개': 'items',
  '숙제, 문제집, 단어 암기처럼 개수로 셀 수 있는 것이면 무엇이든 계획할 수 있어요.': 'Plan anything you can count — homework, workbook problems, vocabulary and more.',
  '적으면 계획표에 항목 이름이 나오고, 줄 수가 전체 개수가 됩니다.': 'If you list items, their names appear in the plan and the number of lines becomes the total.',
  '항목 목록 줄 수로 정해졌어요': 'Set from the number of listed items',
  '완료한 {unit} 수': (p) => `Completed (${p.unit})`,
  '단위 이름을 입력하세요. (예: 문제, 과제, 단원)': 'Enter a unit name (e.g. problems, tasks, units).',
  '전체 개수를 1 이상의 정수로 입력하거나 항목 목록을 적어 주세요.': 'Enter a total count of 1 or more, or list the items.',
  '전체 개수는 10000개까지 입력할 수 있습니다.': 'The total count can be at most 10,000.',
  '기타 목표 정보가 올바르지 않습니다.': 'Custom goal data is invalid.',
  // 그룹
  '그룹': 'Groups',
  '그룹 연결 정보가 올바르지 않습니다.': 'Group link data is invalid.',
  "'{group}' 그룹에서 공유된 목표입니다. 이름과 내용은 리더가 정하며, 여기서는 시작일·마감일·쉬는 요일만 정할 수 있습니다.": (p) => `This goal was shared in the group '${p.group}'. The leader sets its name and contents; here you can only set the start date, due date and rest days.`,
  '리더': 'Leader',
  '멤버': 'Member',
  '멤버 {n}명': (p) => `${p.n} ${p.n === 1 ? 'member' : 'members'}`,
  '공유한 목표 {n}개': (p) => `${p.n} shared ${p.n === 1 ? 'goal' : 'goals'}`,
  '리더 {name}': (p) => `Leader ${p.name}`,
  '공유된 목표 {n}개 · 계획 {planned}개': (p) => `${p.n} shared · ${p.planned} planned`,
  '그룹을 만들면 리더가 되어 책·강의 같은 목표를 멤버들에게 나눠 주고 진도를 볼 수 있어요.': 'Create a group to become its leader, share goals like books and lectures with members, and follow their progress.',
  '새 그룹 만들기': 'Create a group',
  '예: 청년부 독서 모임': 'e.g. Youth reading club',
  '만들기': 'Create',
  '초대 코드로 참여': 'Join with an invite code',
  '6자리 코드': '6-character code',
  '참여하기': 'Join',
  '내 그룹': 'My groups',
  '아직 속한 그룹이 없습니다.': 'You are not in any group yet.',
  '그룹 이름을 입력하세요.': 'Enter a group name.',
  '초대 코드 6자리를 확인하세요.': 'Check the 6-character invite code.',
  '그룹을 찾을 수 없습니다': 'Group not found',
  '초대 코드가 틀렸거나, 리더가 코드를 새로 만들었을 수 있어요. 리더에게 새 링크를 받아 주세요.': 'The invite code is wrong, or the leader created a new one. Ask the leader for a new link.',
  '그룹 목록': 'Groups',
  "'{name}' 그룹에 참여할까요?": (p) => `Join the group '${p.name}'?`,
  '리더: {name}': (p) => `Leader: ${p.name}`,
  '참여하면 리더가 공유한 목표로 계획을 세울 수 있고, 리더는 그 목표의 진도만 볼 수 있어요. 개인 목표는 보이지 않습니다.': 'After joining you can plan the goals the leader shares. The leader can see progress on those goals only — never your personal goals.',
  '내가 리더인 그룹': 'You lead this group',
  '그룹 나가기': 'Leave group',
  '공유된 목표': 'Shared goals',
  '리더가 아직 공유한 목표가 없습니다.': 'The leader has not shared any goals yet.',
  '리더는 여기서 만든 계획의 진도만 볼 수 있어요. 개인 목표는 보이지 않습니다.': 'The leader can see progress only on plans made from these goals. Your personal goals stay private.',
  '아직 계획 없음': 'No plan yet',
  '계획 세운 멤버 {n}/{total}명': (p) => `${p.n}/${p.total} members planned`,
  '내 목표에서 바꾼 이름·내용을 멤버들에게 다시 공유합니다': 'Share the name and contents you changed in your goal with members again',
  '바뀐 내용 공유': 'Share changes',
  '공유 취소': 'Unshare',
  '마지막 기록': 'Last update',
  '아직 참여한 멤버가 없습니다. 초대 링크를 보내 주세요.': 'No members yet. Send them the invite link.',
  '내보내기||member': 'Remove',
  '이름 바꾸기': 'Rename',
  '그룹 삭제': 'Delete group',
  '멤버 초대': 'Invite members',
  '링크 복사': 'Copy link',
  '지금 코드는 더 이상 쓸 수 없게 됩니다': 'The current code will stop working',
  '코드 새로 만들기': 'New code',
  '링크를 받은 사람은 로그인한 뒤 바로 참여할 수 있어요. 코드만 알려 줘도 [그룹 → 초대 코드로 참여]에서 들어올 수 있습니다.': 'Anyone with the link can join right after signing in. You can also share just the code — they enter it under [Groups → Join with an invite code].',
  '공유한 목표': 'Shared goals',
  '+ 내 목표 공유하기': '+ Share one of my goals',
  '내 목표의 이름과 내용(목차·목록·범위)만 공유되고, 날짜와 진도는 공유되지 않아요. 멤버는 각자 날짜를 정합니다.': 'Only the name and contents (table of contents, list, range) are shared — not your dates or progress. Each member sets their own dates.',
  '공유': 'Share',
  '공유할 목표가 없습니다. 먼저 <a href="#/new">새 목표</a>를 만들어 주세요. (그룹에서 받은 목표는 다시 공유할 수 없어요)': 'Nothing to share. Create a <a href="#/new">new goal</a> first. (Goals received from a group cannot be re-shared.)',
  '아직 공유한 목표가 없습니다. 내 목표를 공유하면 멤버들이 같은 내용으로 계획을 세울 수 있어요.': 'No shared goals yet. Share one of your goals so members can plan with the same contents.',
  '참여일': 'Joined',
  '목표를 찾을 수 없습니다.': 'Goal not found.',
  '처리하지 못했습니다.\n\n{message}': (p) => `Something went wrong.\n\n${p.message}`,
  '복사됨': 'Copied',
  '초대 코드를 새로 만들까요?\n지금 코드와 링크로는 더 이상 참여할 수 없습니다. (이미 참여한 멤버는 그대로예요)': 'Create a new invite code?\nThe current code and link will stop working. (Existing members stay.)',
  '새 그룹 이름': 'New group name',
  "'{name}' 그룹을 삭제할까요?\n공유한 목표와 멤버 목록이 사라집니다. 멤버들이 이미 만든 계획은 각자에게 개인 목표로 남습니다.": (p) => `Delete the group '${p.name}'?\nShared goals and the member list will be removed. Plans members already made stay with them as personal goals.`,
  "'{name}' 그룹에서 나갈까요?\n이미 만든 계획은 개인 목표로 남고, 리더는 더 이상 볼 수 없습니다.": (p) => `Leave the group '${p.name}'?\nPlans you made stay as personal goals, and the leader can no longer see them.`,
  '{name}님을 그룹에서 내보낼까요?\n그 멤버의 계획은 개인 목표로 남고, 더 이상 볼 수 없습니다.': (p) => `Remove ${p.name} from the group?\nTheir plans stay as personal goals, and you will no longer see them.`,
  '내 목표의 바뀐 이름·내용을 멤버들에게 다시 공유할까요?\n이미 계획을 세운 멤버에게는 "적용할까요?" 안내가 나타납니다.': 'Share the updated name and contents with members?\nMembers who already planned will be asked whether to apply the changes.',
  "'{title}' 공유를 취소할까요?\n멤버들이 이미 만든 계획은 각자에게 개인 목표로 남지만, 리더는 더 이상 진도를 볼 수 없습니다.": (p) => `Unshare '${p.title}'?\nPlans members already made stay as personal goals, but you will no longer see their progress.`,
  '그룹에서 공유된 목표': 'Shared in your groups',
  '그룹 리더가 공유 내용(이름·목차·목록)을 수정했습니다. 내 계획에 적용할까요?': 'The group leader updated the shared contents (name, table of contents, list). Apply to your plan?',
  // 그룹 (관리자)
  '아직 이 책을 받을 사람이 없습니다. (그룹 멤버는 <a href="#/admin/members">회원 관리</a>에서)': 'Nobody receives this book yet. (Manage group members in <a href="#/admin/members">Members</a>.)',
  '필독서 · {group}': (p) => `Required · ${p.group}`,
  '그룹 필독서': 'Required for groups',
  '고른 그룹의 모든 사람(리더 포함) 대시보드에 필독서로 보입니다': "Shown as required reading on the dashboard of everyone in the selected groups (leaders included)",
  '아직 그룹이 없습니다.': 'No groups yet.',
  '그룹을 누르면 멤버·공유 목표·진도를 펼쳐 볼 수 있어요. 새 그룹은 상단 [그룹] 메뉴에서 만듭니다.': 'Click a group to see its members, shared goals and progress. Create new groups from the [Groups] menu at the top.',
  '전체 회원': 'All members',
  '앱에 한 번이라도 로그인한 사람들입니다.': 'Everyone who has signed in at least once.',
  '공유 목표 {n}개': (p) => `${p.n} shared ${p.n === 1 ? 'goal' : 'goals'}`,
  '필독서 {n}권': (p) => `${p.n} required ${p.n === 1 ? 'book' : 'books'}`,
  '초대 코드': 'Invite code',
  '회원을 골라 이 그룹에 추가': 'Pick a member to add to this group',
  '추가': 'Add',
  '아직 참여한 멤버가 없습니다.': 'No members yet.',
  '도서관에서 바꾸기': 'Change in Library',
  '이름 또는 이메일 검색…': 'Search name or email…',
  '그룹으로 거르기': 'Filter by group',
  '전체 그룹': 'All groups',
  '그룹 없음': 'No group',
  '이름 / 이메일': 'Name / Email',
  '조건에 맞는 회원이 없습니다.': 'No members match.',
  '리더는 그룹에서 뺄 수 없습니다': 'The leader cannot be removed from the group',
  '{group}에서 빼기': (p) => `Remove from ${p.group}`,
  '그룹에 추가': 'Add to group',
  '+ 그룹 추가': '+ Add group',
  '그룹 선택': 'Choose group',
  '아직 배정된 책이 없습니다. <a href="#/admin/books">도서관</a>에서 정하세요. (그룹의 진도는 <a href="#/admin/members">회원 관리</a>의 그룹에서 봅니다)': 'No assigned books yet. Assign them in the <a href="#/admin/books">Library</a>. (See group progress under groups in <a href="#/admin/members">Members</a>.)',
  // 필독서 · 필수 시청
  '필독서 {n}권': (p) => `${p.n} required ${p.n === 1 ? 'book' : 'books'}`,
  '필수 시청': 'Required viewing',
  '필수 시청 {n}개': (p) => `${p.n} required ${p.n === 1 ? 'lecture' : 'lectures'}`,
  '공유 목표': 'Shared goal',
  '필독서·필수 시청 없음': 'No required books or lectures',
  '계획 {n}개': (p) => `${p.n} planned`,
  '리더가 아직 필독서나 필수 시청을 정하지 않았습니다.': 'The leader has not set any required books or lectures yet.',
  '필독서 · 필수 시청': 'Required books · lectures',
  '아직 필독서나 필수 시청이 없습니다. 내 책·강의 목표를 공유하면 멤버들이 같은 내용으로 계획을 세울 수 있어요.': 'No required books or lectures yet. Share one of your book or lecture goals so members can plan with the same contents.',
  '그룹 필독서 · 필수 시청': 'Required in your groups',
  "'{group}' 그룹의 {kind}입니다. 이름과 내용은 리더가 정하며, 여기서는 시작일·마감일·쉬는 요일만 정할 수 있습니다.": (p) => `${p.kind} in the group '${p.group}'. The leader sets its name and contents; here you can only set the start date, due date and rest days.`,
  '아직 그룹의 필독서·필수 시청이나 배정된 책이 없습니다.': 'No group required books/lectures or assigned books yet.',
  '아직 그룹의 필독서·필수 시청이나 회원 목표가 없습니다.': 'No group required books/lectures or member goals yet.',
  '개별 진행': 'Individual goals',
  '그룹과 상관없이 회원이 스스로 세운 목표입니다.': 'Goals members set up on their own, outside any group.',
  '밀림 {n}개': (p) => `${p.n} behind`,
  '{type} {n}개': (p) => `${p.n} ${p.type.toLowerCase()}${p.n === 1 ? '' : 's'}`,
  '진행 중 {n}개': (p) => `${p.n} in progress`,
  // 책 검색
  '책 제목이나 ISBN으로 찾기': 'Search by title or ISBN',
  '책 검색': 'Find book',
  '국립중앙도서관 정보로 제목·저자·마지막 페이지를 채우고, 목차가 있으면 챕터도 채워요.': 'Fills in the title, author and last page from the National Library of Korea, plus chapters when a table of contents is available.',
  '찾는 책이 없습니다. 제목을 조금 짧게 하거나 ISBN으로 찾아보세요.': 'No books found. Try a shorter title or the ISBN.',
  '{n}쪽': (p) => `${p.n} pp.`,
  '목차 있음': 'Has contents',
  '고르기': 'Choose',
  '찾는 중…': 'Searching…',
  '책을 찾지 못했습니다: {message}': (p) => `Could not search books: ${p.message}`,
  "'{title}' 정보를 채웠습니다.": (p) => `Filled in '${p.title}'.`,
  '마지막 페이지는 책 전체 쪽수({n}쪽)예요. 본문이 끝나는 페이지와 다르면 고쳐 주세요.': (p) => `The last page is the book's total page count (${p.n}); adjust it if the main text ends elsewhere.`,
  '목차 정리 중…': 'Reading contents…',
  '목차에서 챕터 {n}개를 채웠습니다.': (p) => `Added ${p.n} chapters from the contents.`,
  '시작 페이지는 목차 정보에 없어서 노란 칸에 직접 넣어 주세요. (목차 사진을 올리면 AI가 페이지까지 읽어요)': 'Start pages are not in the catalog data, so fill in the yellow boxes. (Upload a photo of the contents and AI reads the pages too.)',
  '목차는 불러오지 못했어요. 목차 사진을 올리거나 직접 입력해 주세요.': 'Could not load the contents. Upload a photo of the contents or type them in.',
  '이 책은 목차 정보가 없어요. 목차 사진을 올리거나 직접 입력해 주세요.': 'No contents for this book. Upload a photo of the contents or type them in.',
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
  rememberPendingJoin();
  document.getElementById('topbar').addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'user-menu') {
      userMenuOpen = !userMenuOpen;
      renderTopbar();
      return;
    }
    if ((action === 'backup-export' || action === 'backup-import') && account.isAdmin) {
      userMenuOpen = false;
      renderTopbar();
      if (action === 'backup-import') document.getElementById('backup-file').click();
      else if (appData && appData.goals.length) exportBackup();
      else alert(t('내보낼 목표가 없습니다.'));
      return;
    }
    if (action === 'retry-save') retrySave();
    if (action === 'sign-out') {
      if (pendingSaves > 0 && !confirm(t('아직 저장 중입니다. 그래도 로그아웃할까요?'))) return;
      await signOut();
    }
  });
  document.getElementById('topbar').addEventListener('change', (e) => {
    if (e.target.id !== 'backup-file' || !account.isAdmin) return;
    const file = e.target.files[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 change가 일어나도록
    if (file) importBackup(file);
  });
  // 메뉴 바깥을 누르면 닫기
  document.addEventListener('click', (e) => {
    if (userMenuOpen && !e.target.closest('.user-menu')) {
      userMenuOpen = false;
      renderTopbar();
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
      account = { isAdmin: false };
      setLibraryRows([]);
      myAssignedBookIds = new Set();
      myGroups = [];
      groupItems = [];
      groupState.groupId = null;
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
