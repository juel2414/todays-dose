/* =========================================================================
 * 오늘분량 — 메인(랜딩) 페이지
 *  로그인하지 않은 상태의 첫 화면. 문구는 LANDING_TEXT (ko/en), 스타일은 landing.css.
 *  앱(app.js)에서 renderLanding(root, options)로 그린다.
 * ========================================================================= */

const LANDING_TEXT = {
  ko: {
    brandName: '오늘분량',
    langGroupLabel: '언어 선택',
    langKo: '한국어',
    langEn: 'English',
    navLogin: '로그인',

    heroTitle: '마감일만 정하세요. 오늘 읽을 분량은 매일 알려드릴게요.',
    heroDesc: '책과 강의의 전체 분량을 남은 날짜에 고르게 나누고, 밀리면 다시 맞춰 드려요. 매일 오늘분량만 채우면 기한 안에 끝납니다.',
    googleCta: 'Google 계정으로 시작하기',
    heroNote: '로그인하면 어느 기기에서든 같은 계획을 볼 수 있어요.',
    typesLabel: '이런 목표에 쓸 수 있어요',
    typeBook: '책',
    typeCourse: '강의',
    typeBible: '성경 통독',

    mockTitle: '데이터 과학 입문',
    mockType: '책',
    mockDday: 'D-8',
    mockDailyLabel: '하루 권장',
    mockDailyValue: '35페이지',
    mockTargetLabel: '오늘까지 권장',
    mockTargetValue: 'p.77',
    mockActualLabel: '실제 완료',
    mockActualBehind: 'p.42',
    mockActualOn: 'p.77',
    mockLastLabel: '마지막 페이지',
    mockLastValue: 'p.395',
    mockProgressLabel: '진행률',
    mockPctBehind: '11%',
    mockPctOn: '19%',
    mockMarker: '권장 위치',
    mockBadgeBehind: '35페이지 밀림',
    mockBadgeOn: '계획대로',
    mockGuideBehind: '남은 9일 동안 하루 40페이지씩 하면 기한을 맞출 수 있어요.',
    mockGuideOn: '이 속도라면 마감일에 맞춰 끝나요.',
    thDate: '날짜',
    thDay: '요일',
    thRange: '분량',
    thAmount: '페이지',
    thDone: '완료',
    todayTag: '오늘',
    r1Date: '10월 6일', r1Day: '화', r1Range: 'p.8~42 · 1장', r1Amount: '35페이지',
    r2Date: '10월 7일', r2Day: '수', r2Range: 'p.43~77 · 1장 일부', r2Amount: '35페이지',
    r3Date: '10월 8일', r3Day: '목', r3Range: 'p.78~112 · 2장', r3Amount: '35페이지',
    r4Date: '10월 9일', r4Day: '금', r4Range: '쉬는 날 · 한글날',
    r5Date: '10월 10일', r5Day: '토', r5Range: 'p.113~182 · 3장', r5Extra: '여유 ×2', r5Amount: '70페이지',
    checkDoneAria: '완료됨',
    checkTodayAria: '오늘 분량 완료 표시',
    checkLaterAria: '아직 예정된 날',
    mockHint: '오늘 줄을 체크해 보세요. 현황이 바로 바뀌어요.',

    featTitle: '계획은 한 번만 세우고, 매일은 오늘분량만',
    featDesc: '분량을 나누고, 일정에 맞추고, 밀린 만큼 다시 맞추는 일을 앱이 대신해요.',
    f1Title: '매일 고르게 자동 분배',
    f1Desc: '시작일과 마감일을 정하면 전체 분량을 날짜별로 나눠요. 책은 페이지와 챕터로, 강의는 강의 목록으로 계획을 세울 수 있어요.',
    f1DemoToday: '오늘',
    f1DemoRange: 'p.43~77 · 35페이지',
    f2Title: '내 일정에 맞춘 계획',
    f2Desc: '매주 쉬는 요일과 행사 같은 특정한 쉬는 날을 빼고, 여유 있는 날엔 평소의 1.5배·2배·3배를 배정해요. 계획표에서 날짜별 분량을 직접 고칠 수도 있어요.',
    wdMon: '월', wdTue: '화', wdWed: '수', wdThu: '목', wdFri: '금', wdSat: '토', wdSun: '일',
    mult15: '×1.5', mult2: '×2', mult3: '×3',
    f3Title: '편한 방법으로 기록하고, 계획과 비교',
    f3Desc: '마지막으로 읽은 페이지, 완료한 챕터, 계획표 체크박스 중 아무거나로 기록하세요. 오늘까지 권장 위치와 실제 위치를 나란히 보여주고, 밀렸는지 앞섰는지 바로 알려줘요.',
    f3BadgeBehind: '35페이지 밀림',
    f3BadgeOn: '계획대로',
    f3BadgeAhead: '20페이지 앞섬',
    f4Title: '미리 보고 다시 맞추기',
    f4Desc: '밀렸을 때 남은 분량을 다시 나누거나 마감일을 바꿀 수 있어요. 바뀔 계획을 먼저 확인한 뒤 적용하고, 원래 계획은 그대로 보관돼요.',
    f4Before: '하루 35페이지',
    f4After: '하루 40페이지',

    moreTitle: '이런 것도 할 수 있어요',
    m1Title: '성경 통독',
    m1Desc: '66권 중 읽을 범위를 골라 통독 계획을 세워요.',
    m2Title: '팀과 함께 읽기',
    m2Tag: '필독서',
    m2Desc: '관리자가 필독서를 정해 팀원에게 공유하고, 팀원들의 진도를 한눈에 확인해요.',
    m3Title: '목록·달력 보기와 이미지 공유',
    m3Desc: '계획을 목록이나 달력으로 보고, 16:9 이미지로 내보내 공유할 수 있어요.',
    m4Title: '어느 기기에서든',
    m4Desc: 'Google 계정으로 로그인하면 PC와 휴대폰에서 같은 계획을 이어서 봐요.',
    m5Title: '한국어 / English',
    m5Desc: '화면 언어를 한국어와 영어 중에서 고를 수 있어요.',

    stepsTitle: '이렇게 시작해요',
    s1Title: '목표와 마감일 정하기',
    s1Desc: '책이나 강의를 등록하고 언제까지 끝낼지 정해요.',
    s2Title: '매일 오늘분량 읽고 기록하기',
    s2Desc: '앱이 알려주는 오늘 분량을 채우고, 읽은 곳까지 기록해요.',
    s3Title: '밀리면 재분배로 다시 맞추기',
    s3Desc: '계획보다 늦어지면 남은 분량을 다시 나눠 기한을 지켜요.',

    ctaTitle: '오늘 읽을 분량부터 확인해 보세요',
    ctaDesc: '마감일 하나만 정하면 계획표가 바로 만들어져요.',

    footerCopy: '© 2026 오늘분량',
    footerNote: '책·강의·성경 통독을 위한 학습 계획 앱'
  },
  en: {
    brandName: "Today's Dose",
    langGroupLabel: 'Language',
    langKo: '한국어',
    langEn: 'English',
    navLogin: 'Sign in',

    heroTitle: "Set the deadline. We'll tell you what to read each day.",
    heroDesc: "Today's Dose spreads a book or course evenly across the days you have left, and helps you catch up when you fall behind. Do today's share, and you'll finish on time.",
    googleCta: 'Continue with Google',
    heroNote: 'Sign in once and see the same plan on any device.',
    typesLabel: 'Works for',
    typeBook: 'Books',
    typeCourse: 'Courses',
    typeBible: 'Bible reading plans',

    mockTitle: 'Intro to Data Science',
    mockType: 'Book',
    mockDday: 'D-8',
    mockDailyLabel: 'Daily target',
    mockDailyValue: '35 pages',
    mockTargetLabel: 'Target by today',
    mockTargetValue: 'p.77',
    mockActualLabel: 'Read so far',
    mockActualBehind: 'p.42',
    mockActualOn: 'p.77',
    mockLastLabel: 'Last page',
    mockLastValue: 'p.395',
    mockProgressLabel: 'Progress',
    mockPctBehind: '11%',
    mockPctOn: '19%',
    mockMarker: 'Target',
    mockBadgeBehind: '35 pages behind',
    mockBadgeOn: 'On track',
    mockGuideBehind: 'Read 40 pages a day for the next 9 days to finish on time.',
    mockGuideOn: "At this pace, you'll finish by the deadline.",
    thDate: 'Date',
    thDay: 'Day',
    thRange: 'Reading',
    thAmount: 'Pages',
    thDone: 'Done',
    todayTag: 'Today',
    r1Date: 'Oct 6', r1Day: 'Tue', r1Range: 'p.8–42 · Ch. 1', r1Amount: '35 pages',
    r2Date: 'Oct 7', r2Day: 'Wed', r2Range: 'p.43–77 · Part of Ch. 1', r2Amount: '35 pages',
    r3Date: 'Oct 8', r3Day: 'Thu', r3Range: 'p.78–112 · Ch. 2', r3Amount: '35 pages',
    r4Date: 'Oct 9', r4Day: 'Fri', r4Range: 'Day off · Hangul Day',
    r5Date: 'Oct 10', r5Day: 'Sat', r5Range: 'p.113–182 · Ch. 3', r5Extra: 'Light day ×2', r5Amount: '70 pages',
    checkDoneAria: 'Done',
    checkTodayAria: "Mark today's reading as done",
    checkLaterAria: 'Upcoming day',
    mockHint: 'Check off today and watch the status update.',

    featTitle: "Plan once. Then just do today's share.",
    featDesc: 'Splitting the work, fitting it to your schedule, and catching up when you slip — the app handles all of it.',
    f1Title: 'Split evenly, automatically',
    f1Desc: 'Pick a start date and a deadline, and the whole thing is divided day by day — by pages and chapters for books, by lesson list for courses.',
    f1DemoToday: 'Today',
    f1DemoRange: 'p.43–77 · 35 pages',
    f2Title: 'Built around your week',
    f2Desc: 'Skip the same weekday every week or mark specific days off with a note. Give easier days 1.5×, 2×, or 3× the usual load, or adjust any day by hand.',
    wdMon: 'M', wdTue: 'T', wdWed: 'W', wdThu: 'T', wdFri: 'F', wdSat: 'S', wdSun: 'S',
    mult15: '×1.5', mult2: '×2', mult3: '×3',
    f3Title: 'Log progress your way',
    f3Desc: "Enter the last page you read, tick off a chapter, or check a box in the plan. You'll see where you should be next to where you are, and whether you're ahead or behind.",
    f3BadgeBehind: '35 pages behind',
    f3BadgeOn: 'On track',
    f3BadgeAhead: '20 pages ahead',
    f4Title: 'Preview before you replan',
    f4Desc: 'Behind schedule? Spread what\'s left over the remaining days or move the deadline. Preview the new plan before applying it — your original plan is kept.',
    f4Before: '35 pages a day',
    f4After: '40 pages a day',

    moreTitle: "Also in Today's Dose",
    m1Title: 'Bible reading plans',
    m1Desc: 'Choose any range of the 66 books and get a daily reading plan.',
    m2Title: 'Reading as a team',
    m2Tag: 'Required',
    m2Desc: "Admins assign required reading to the team and see everyone's progress in one place.",
    m3Title: 'List and calendar views',
    m3Desc: 'See your plan as a list or a calendar, and export it as a 16:9 image to share.',
    m4Title: 'On any device',
    m4Desc: 'Sign in with Google to pick up the same plan on your computer or phone.',
    m5Title: '한국어 / English',
    m5Desc: 'Use the app in Korean or English.',

    stepsTitle: 'How it works',
    s1Title: 'Set a goal and a deadline',
    s1Desc: 'Add a book or course and choose when you want to finish.',
    s2Title: "Do today's share and log it",
    s2Desc: 'Read what the app sets for today, then log where you stopped.',
    s3Title: 'Fall behind? Replan',
    s3Desc: 'If you slip, spread the rest over the days you have left and still make your deadline.',

    ctaTitle: "Start with today's share",
    ctaDesc: 'Set one deadline and your plan is ready.',

    footerCopy: "© 2026 Today's Dose",
    footerNote: 'A study planner for books, courses, and Bible reading.'
  }
};

/**
 * 랜딩 페이지 그리기
 * options: {
 *   lang: 'ko' | 'en',
 *   onLogin: () => Promise,     // Google 로그인 시작
 *   onLang: (lang) => void,     // 언어 전환 (앱이 저장·다시 그리기 담당)
 *   message: string,            // 오류·안내 문구 (없으면 '')
 *   loginDisabled: boolean,     // 파일로 직접 연 경우 등
 * }
 */
function renderLanding(root, options) {
  const lang = LANDING_TEXT[options.lang] ? options.lang : 'ko';
  const dict = LANDING_TEXT[lang];
  document.body.classList.add('is-landing');
  root.innerHTML = `
<div class="landing" lang="${lang}">

  <!-- ===== Top bar ===== -->
  <header class="lp-topbar">
    <div class="lp-wrap lp-topbar-inner">
      <div class="lp-brand">
        <span class="lp-brand-mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        </span>
        <span class="lp-brand-name" data-i18n="brandName"></span>
      </div>
      <div class="lp-top-actions">
        <div class="lp-lang-toggle" role="group" data-i18n-aria="langGroupLabel">
          <button type="button" data-lang="ko" aria-pressed="true" data-i18n="langKo"></button>
          <button type="button" data-lang="en" aria-pressed="false" data-i18n="langEn"></button>
        </div>
        <button type="button" class="lp-btn-login" data-action="google-login" data-i18n="navLogin"></button>
      </div>
    </div>
  </header>

  <!-- ===== Hero ===== -->
  <section class="lp-hero">
    <div class="lp-wrap lp-hero-grid">
      <div>
        <h1 class="lp-hero-title" data-i18n="heroTitle"></h1>
        <p class="lp-hero-desc" data-i18n="heroDesc"></p>
        <div class="lp-hero-cta">
          <button type="button" class="lp-btn-google" data-action="google-login">
            <span class="lp-g-badge" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            </span>
            <span data-i18n="googleCta"></span>
          </button>
          <p class="lp-hero-note" data-i18n="heroNote"></p>
          <p class="lp-alert" data-lp-alert hidden></p>
        </div>
        <div class="lp-types">
          <span class="lp-types-label" data-i18n="typesLabel"></span>
          <span class="lp-type-pill" data-i18n="typeBook"></span>
          <span class="lp-type-pill" data-i18n="typeCourse"></span>
          <span class="lp-type-pill" data-i18n="typeBible"></span>
        </div>
      </div>

      <!-- Mockup -->
      <div class="lp-mock-area">
        <div class="lp-mock" id="landingMock">
          <div class="lp-mock-head">
            <span class="lp-mock-title" data-i18n="mockTitle"></span>
            <span class="lp-chip lp-chip-type" data-i18n="mockType"></span>
            <span class="lp-chip lp-chip-dday" data-i18n="mockDday"></span>
          </div>

          <div class="lp-stats">
            <div class="lp-stat">
              <div class="lp-stat-label" data-i18n="mockDailyLabel"></div>
              <div class="lp-stat-value" data-i18n="mockDailyValue"></div>
            </div>
            <div class="lp-stat">
              <div class="lp-stat-label" data-i18n="mockTargetLabel"></div>
              <div class="lp-stat-value" data-i18n="mockTargetValue"></div>
            </div>
            <div class="lp-stat lp-stat-actual">
              <div class="lp-stat-label" data-i18n="mockActualLabel"></div>
              <div class="lp-stat-value" data-i18n="mockActualBehind" data-state-key="actual"></div>
            </div>
            <div class="lp-stat">
              <div class="lp-stat-label" data-i18n="mockLastLabel"></div>
              <div class="lp-stat-value" data-i18n="mockLastValue"></div>
            </div>
          </div>

          <div class="lp-progress">
            <div class="lp-progress-top">
              <span data-i18n="mockProgressLabel"></span>
              <span class="lp-progress-pct" data-i18n="mockPctBehind" data-state-key="pct"></span>
            </div>
            <div class="lp-bar">
              <div class="lp-bar-fill"></div>
              <div class="lp-bar-marker" aria-hidden="true"></div>
              <span class="lp-bar-marker-label" data-i18n="mockMarker"></span>
            </div>
          </div>

          <div class="lp-status">
            <span class="lp-badge lp-badge-behind" data-i18n="mockBadgeBehind" data-state-key="badge"></span>
            <span class="lp-status-text" data-i18n="mockGuideBehind" data-state-key="guide"></span>
          </div>

          <div class="lp-table-wrap">
            <table class="lp-plan">
              <thead>
                <tr>
                  <th data-i18n="thDate"></th>
                  <th data-i18n="thDay"></th>
                  <th data-i18n="thRange"></th>
                  <th class="lp-col-num" data-i18n="thAmount"></th>
                  <th class="lp-col-check" data-i18n="thDone"></th>
                </tr>
              </thead>
              <tbody>
                <tr class="lp-row-past">
                  <td data-i18n="r1Date"></td>
                  <td data-i18n="r1Day"></td>
                  <td data-i18n="r1Range"></td>
                  <td class="lp-col-num" data-i18n="r1Amount"></td>
                  <td class="lp-col-check">
                    <button type="button" class="lp-check lp-is-checked" disabled data-i18n-aria="checkDoneAria">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
                    </button>
                  </td>
                </tr>
                <tr class="lp-row-today">
                  <td><span data-i18n="r2Date"></span><span class="lp-today-tag" data-i18n="todayTag"></span></td>
                  <td data-i18n="r2Day"></td>
                  <td data-i18n="r2Range"></td>
                  <td class="lp-col-num" data-i18n="r2Amount"></td>
                  <td class="lp-col-check">
                    <button type="button" class="lp-check lp-check-live" id="landingTodayCheck" aria-pressed="false" data-i18n-aria="checkTodayAria">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
                    </button>
                  </td>
                </tr>
                <tr>
                  <td data-i18n="r3Date"></td>
                  <td data-i18n="r3Day"></td>
                  <td data-i18n="r3Range"></td>
                  <td class="lp-col-num" data-i18n="r3Amount"></td>
                  <td class="lp-col-check"><button type="button" class="lp-check" disabled data-i18n-aria="checkLaterAria"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button></td>
                </tr>
                <tr class="lp-row-rest">
                  <td data-i18n="r4Date"></td>
                  <td data-i18n="r4Day"></td>
                  <td data-i18n="r4Range"></td>
                  <td class="lp-col-num lp-muted">–</td>
                  <td class="lp-col-check"></td>
                </tr>
                <tr>
                  <td data-i18n="r5Date"></td>
                  <td data-i18n="r5Day"></td>
                  <td><span data-i18n="r5Range"></span><span class="lp-extra" data-i18n="r5Extra"></span></td>
                  <td class="lp-col-num" data-i18n="r5Amount"></td>
                  <td class="lp-col-check"><button type="button" class="lp-check" disabled data-i18n-aria="checkLaterAria"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p class="lp-mock-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          <span data-i18n="mockHint"></span>
        </p>
      </div>
    </div>
  </section>

  <!-- ===== Features ===== -->
  <section class="lp-section">
    <div class="lp-wrap">
      <h2 class="lp-section-title" data-i18n="featTitle"></h2>
      <p class="lp-section-desc" data-i18n="featDesc"></p>

      <div class="lp-features">
        <article class="lp-feature">
          <div class="lp-feature-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/></svg>
          </div>
          <h3 class="lp-feature-title" data-i18n="f1Title"></h3>
          <p class="lp-feature-desc" data-i18n="f1Desc"></p>
          <div class="lp-demo">
            <span class="lp-demo-today"><strong data-i18n="f1DemoToday"></strong><span data-i18n="f1DemoRange"></span></span>
          </div>
        </article>

        <article class="lp-feature">
          <div class="lp-feature-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>
          </div>
          <h3 class="lp-feature-title" data-i18n="f2Title"></h3>
          <p class="lp-feature-desc" data-i18n="f2Desc"></p>
          <div class="lp-demo">
            <div class="lp-days">
              <span class="lp-day" data-i18n="wdMon"></span>
              <span class="lp-day" data-i18n="wdTue"></span>
              <span class="lp-day" data-i18n="wdWed"></span>
              <span class="lp-day" data-i18n="wdThu"></span>
              <span class="lp-day" data-i18n="wdFri"></span>
              <span class="lp-day" data-i18n="wdSat"></span>
              <span class="lp-day lp-off" data-i18n="wdSun"></span>
            </div>
            <div class="lp-mults">
              <span class="lp-mult" data-i18n="mult15"></span>
              <span class="lp-mult" data-i18n="mult2"></span>
              <span class="lp-mult" data-i18n="mult3"></span>
            </div>
          </div>
        </article>

        <article class="lp-feature">
          <div class="lp-feature-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.3l2.6 2.6 4.8-5.2"/></svg>
          </div>
          <h3 class="lp-feature-title" data-i18n="f3Title"></h3>
          <p class="lp-feature-desc" data-i18n="f3Desc"></p>
          <div class="lp-demo">
            <span class="lp-badge lp-badge-behind" data-i18n="f3BadgeBehind"></span>
            <span class="lp-badge lp-badge-on" data-i18n="f3BadgeOn"></span>
            <span class="lp-badge lp-badge-ahead" data-i18n="f3BadgeAhead"></span>
          </div>
        </article>

        <article class="lp-feature">
          <div class="lp-feature-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>
          </div>
          <h3 class="lp-feature-title" data-i18n="f4Title"></h3>
          <p class="lp-feature-desc" data-i18n="f4Desc"></p>
          <div class="lp-demo">
            <span class="lp-replan">
              <span class="lp-replan-old" data-i18n="f4Before"></span>
              <svg class="lp-replan-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              <span class="lp-replan-new" data-i18n="f4After"></span>
            </span>
          </div>
        </article>
      </div>

      <div class="lp-more">
        <h3 class="lp-more-title" data-i18n="moreTitle"></h3>
        <ul class="lp-more-list">
          <li class="lp-more-item">
            <svg class="lp-more-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/></svg>
            <div>
              <div class="lp-more-name" data-i18n="m1Title"></div>
              <p class="lp-more-text" data-i18n="m1Desc"></p>
            </div>
          </li>
          <li class="lp-more-item lp-more-item-team">
            <svg class="lp-more-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.6c2.3.2 4 1.7 4.5 4.4"/></svg>
            <div>
              <div class="lp-more-name"><span data-i18n="m2Title"></span><span class="lp-tag-required" data-i18n="m2Tag"></span></div>
              <p class="lp-more-text" data-i18n="m2Desc"></p>
            </div>
          </li>
          <li class="lp-more-item">
            <svg class="lp-more-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 15l5-4 4 3 3-2 6 4"/><circle cx="16" cy="9" r="1.4"/></svg>
            <div>
              <div class="lp-more-name" data-i18n="m3Title"></div>
              <p class="lp-more-text" data-i18n="m3Desc"></p>
            </div>
          </li>
          <li class="lp-more-item">
            <svg class="lp-more-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="14" height="10" rx="1.8"/><path d="M6 18.5h6.5"/><rect x="15.5" y="9" width="6" height="11" rx="1.6"/></svg>
            <div>
              <div class="lp-more-name" data-i18n="m4Title"></div>
              <p class="lp-more-text" data-i18n="m4Desc"></p>
            </div>
          </li>
          <li class="lp-more-item">
            <svg class="lp-more-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5s1.2-6.1 3.5-8.5z"/></svg>
            <div>
              <div class="lp-more-name" data-i18n="m5Title"></div>
              <p class="lp-more-text" data-i18n="m5Desc"></p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <!-- ===== Steps ===== -->
  <section class="lp-section">
    <div class="lp-wrap">
      <h2 class="lp-section-title" data-i18n="stepsTitle"></h2>
      <ol class="lp-steps">
        <li class="lp-step">
          <span class="lp-step-num" aria-hidden="true">1</span>
          <h3 class="lp-step-title" data-i18n="s1Title"></h3>
          <p class="lp-step-desc" data-i18n="s1Desc"></p>
        </li>
        <li class="lp-step">
          <span class="lp-step-num" aria-hidden="true">2</span>
          <h3 class="lp-step-title" data-i18n="s2Title"></h3>
          <p class="lp-step-desc" data-i18n="s2Desc"></p>
        </li>
        <li class="lp-step">
          <span class="lp-step-num" aria-hidden="true">3</span>
          <h3 class="lp-step-title" data-i18n="s3Title"></h3>
          <p class="lp-step-desc" data-i18n="s3Desc"></p>
        </li>
      </ol>
    </div>
  </section>

  <!-- ===== Bottom CTA ===== -->
  <section class="lp-section">
    <div class="lp-wrap">
      <div class="lp-cta">
        <div>
          <h2 class="lp-cta-title" data-i18n="ctaTitle"></h2>
          <p class="lp-cta-desc" data-i18n="ctaDesc"></p>
        </div>
        <button type="button" class="lp-btn-google" data-action="google-login">
          <span class="lp-g-badge" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          </span>
          <span data-i18n="googleCta"></span>
        </button>
      </div>
    </div>
  </section>

  <!-- ===== Footer ===== -->
  <footer class="lp-footer">
    <div class="lp-wrap lp-footer-inner">
      <span data-i18n="footerCopy"></span>
      <span data-i18n="footerNote"></span>
    </div>
  </footer>

</div>
`;
  const landing = root.querySelector('.landing');

  // 문구 채우기
  let mockDone = false;
  const STATE_KEYS = {
    actual: ['mockActualBehind', 'mockActualOn'],
    pct: ['mockPctBehind', 'mockPctOn'],
    badge: ['mockBadgeBehind', 'mockBadgeOn'],
    guide: ['mockGuideBehind', 'mockGuideOn'],
  };
  const fillText = () => {
    landing.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) el.textContent = dict[key];
    });
    landing.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (dict[key] !== undefined) el.setAttribute('aria-label', dict[key]);
    });
    landing.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
  };

  // 화면 예시: 오늘 줄 체크 → 현황이 "계획대로"로 바뀌는 데모
  const renderMock = () => {
    const mock = landing.querySelector('#landingMock');
    const check = landing.querySelector('#landingTodayCheck');
    mock.classList.toggle('lp-is-done', mockDone);
    check.classList.toggle('lp-is-checked', mockDone);
    check.setAttribute('aria-pressed', mockDone ? 'true' : 'false');
    landing.querySelectorAll('[data-state-key]').forEach((el) => {
      const pair = STATE_KEYS[el.getAttribute('data-state-key')];
      if (pair) el.setAttribute('data-i18n', pair[mockDone ? 1 : 0]);
    });
    const badge = landing.querySelector('[data-state-key="badge"]');
    badge.classList.toggle('lp-badge-behind', !mockDone);
    badge.classList.toggle('lp-badge-on', mockDone);
    fillText();
  };
  landing.querySelector('#landingTodayCheck').addEventListener('click', () => {
    mockDone = !mockDone;
    renderMock();
  });

  // 안내·오류 문구
  const alertEl = landing.querySelector('[data-lp-alert]');
  if (options.message) {
    alertEl.textContent = options.message;
    alertEl.hidden = false;
  }

  // 언어 전환
  landing.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => options.onLang(btn.getAttribute('data-lang')));
  });

  // Google 로그인 (상단·히어로·하단 버튼 공통)
  landing.querySelectorAll('[data-action="google-login"]').forEach((btn) => {
    btn.disabled = !!options.loginDisabled;
    btn.addEventListener('click', async () => {
      landing.querySelectorAll('[data-action="google-login"]').forEach((b) => { b.disabled = true; });
      try {
        await options.onLogin();
      } catch (err) {
        landing.querySelectorAll('[data-action="google-login"]').forEach((b) => { b.disabled = false; });
        alertEl.textContent = err && err.message ? err.message : String(err);
        alertEl.hidden = false;
      }
    });
  });

  fillText();
}
