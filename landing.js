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

    /* 히어로 */
    heroTitle: '마감일만 정하세요. 오늘 읽을 분량은 매일 알려드릴게요.',
    heroDesc: '책과 강의의 전체 분량을 남은 날짜에 고르게 나누고, 밀리면 다시 맞춰 드려요. 매일 오늘분량만 채우면 기한 안에 끝납니다.',
    googleCta: 'Google 계정으로 시작하기',
    heroNote: '로그인하면 어느 기기에서든 같은 계획을 볼 수 있어요.',
    typesLabel: '이런 목표에 쓸 수 있어요',
    typeBook: '책',
    typeCourse: '강의',
    typeBible: '성경 통독',

    /* 히어로 화면 예시 */
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
    mockGuideOn: '오늘 분량을 마쳤어요. 계획대로 진행 중입니다.',
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
    mockHint: '오늘 줄을 체크해 보세요!',

    /* 목표 종류 */
    kindsTitle: '책도, 강의도, 성경 통독도 같은 방식으로',
    kindsDesc: '무엇을 공부하든 전체 분량과 기간만 있으면 됩니다. 종류에 맞는 단위로 날짜마다 할 일을 정해 드려요.',
    kBookTitle: '책',
    kBookDesc: '챕터별 시작 페이지를 입력하면 페이지 기준과 챕터 기준, 두 가지 계획표를 함께 볼 수 있어요. 저자도 기록해 둘 수 있어요.',
    kBookExLabel: '오늘',
    kBookEx: 'p.43~77 · 1장 일부',
    kCourseTitle: '강의',
    kCourseDesc: '강의 제목을 한 줄에 하나씩 붙여넣으면 날짜마다 들을 강의가 제목과 함께 정해져요.',
    kCourseExLabel: '오늘',
    kCourseEx: '12강 함수와 스코프',
    kBibleTitle: '성경 통독',
    kBibleDesc: '66권 중 범위를 직접 고르거나 성경 전체, 구약, 신약, 복음서 같은 범위를 한 번에 선택해요.',
    kBibleExLabel: '오늘',
    kBibleEx: '마태복음 5~7장',

    /* 계산기 */
    calcTitle: '하루에 얼마씩 하면 될지 바로 계산해 보세요',
    calcDesc: '분량과 기간, 쉬는 요일만 고르면 하루 권장 분량이 나와요. 앱에서는 이 계산이 날짜별 계획표로 만들어집니다.',
    calcKindLabel: '무엇을 할까요?',
    calcKindBook: '책',
    calcKindCourse: '강의',
    calcKindBible: '성경 통독',
    calcTotalLabel: '전체 분량',
    calcWeeksLabel: '기간 (오늘부터)',
    calcWeek: '{w}주',
    calcRestLabel: '쉬는 요일 (누르면 빠져요)',
    calcResultLabel: '하루 권장',
    calcResult: '{n}{unit}',
    calcResultSub: '공부하는 날 {days}일 · 쉬는 날 {rest}일',
    calcNoDays: '공부하는 날이 없어요',
    calcNote: '앱에서는 행사 같은 특정 쉬는 날, 평소보다 많이 하는 여유 있는 날, 날짜별 직접 조정까지 반영해서 나눠요.',
    unitPage: '페이지', unitLecture: '강', unitChapter: '장',
    unitPageOne: '페이지', unitLectureOne: '강', unitChapterOne: '장',
    wdMon: '월', wdTue: '화', wdWed: '수', wdThu: '목', wdFri: '금', wdSat: '토', wdSun: '일',

    /* 기능 소개 */
    featTitle: '계획은 한 번만 세우고, 매일은 오늘분량만',
    featDesc: '분량을 나누고, 일정에 맞추고, 밀린 만큼 다시 맞추는 일을 앱이 대신해요.',

    schKicker: '유연한 일정',
    schTitle: '쉬는 날은 빼고, 여유 있는 날엔 더 많이',
    schDesc: '매일 똑같이 할 수 없는 게 보통이에요. 내 일정을 알려주면 그만큼 다른 날에 나눠 담아요.',
    schP1: '매주 쉬는 요일을 정하면 그날은 분량을 배정하지 않아요.',
    schP2: '행사처럼 빠지는 날짜는 메모와 함께 쉬는 날로 추가해요.',
    schP3: '여유 있는 날엔 평소의 1.5배, 2배, 3배를 배정해요.',
    schP4: '마감일은 1·2·4·6·8주 버튼으로 빠르게 정할 수 있어요.',
    calMonth: '10월 계획표',
    calCaption: '숫자 = 그날 읽을 페이지',
    calRest: '쉼',
    calMemo: '수련회',
    calToday: '오늘',
    legOff: '쉬는 요일',
    legMemo: '쉬는 날짜',
    legX2: '여유 있는 날 ×2',
    quickDue: '마감일 빠르게',
    quickW1: '1주', quickW2: '2주', quickW4: '4주', quickW6: '6주', quickW8: '8주',

    recKicker: '진도 기록',
    recTitle: '어떻게 기록해도 같은 진도로 맞춰져요',
    recDesc: '편한 방법 하나만 쓰면 돼요. 페이지, 챕터, 체크박스가 서로 연결되어 있어서 어느 쪽으로 기록해도 계획표와 현황이 함께 바뀌어요.',
    recP1: '마지막으로 읽은 페이지를 입력하거나',
    recP2: '완료한 챕터를 고르거나',
    recP3: '계획표에서 그날 줄을 체크하면 끝이에요.',
    recPanelTitle: '진도 기록',
    recPage: '마지막으로 읽은 페이지',
    recPageVal: 'p.77',
    recOr: '또는',
    recChapter: '완료한 챕터',
    recChapterVal: '1장 (~p.60)',
    recCheck: '계획표 체크',
    recCheckVal: '10월 7일 분량',
    recKeyTarget: '검정 선 = 오늘까지 권장 19%',
    recKeyDone: '초록 = 실제 진도 19%',

    cmpKicker: '계획 대비 현황',
    cmpTitle: '밀려도, 앞서도 바로 알려줘요',
    cmpDesc: '오늘까지 권장 위치와 실제 위치를 비교해서, 지금 어떤 상태인지와 앞으로 하루에 얼마씩 하면 되는지를 한 문장으로 알려줘요.',
    cmpBehindBadge: '35페이지 밀림',
    cmpBehind: '남은 공부일 9일 동안 하루 40페이지씩 하면 기한을 맞출 수 있어요.',
    cmpAheadBadge: '20페이지 앞섬',
    cmpAhead: '남은 공부일 9일 동안 하루 33페이지씩이면 충분해요.',
    cmpOnBadge: '계획대로',
    cmpOn: '계획대로 진행 중이에요. 오늘 35페이지 남았어요.',
    cmpRestBadge: '쉬는 날',
    cmpRest: '오늘은 쉬는 날이에요 (한글날). 계획대로 진행 중입니다.',

    rpKicker: '재분배 · 마감일 변경',
    rpTitle: '계획을 바꾸기 전에 미리 보고 적용해요',
    rpDesc: '밀렸을 때 남은 분량을 다시 나누거나 마감일을 옮길 수 있어요. 바뀌는 계획을 먼저 보여드리고, 적용해도 원래 계획은 그대로 보관돼요.',
    rpP1: '재분배, 마감일 변경, 목표 수정 모두 미리보기로 확인한 뒤 적용해요.',
    rpP2: '특정 날짜의 분량을 직접 정하면 나머지 날에 남은 분량이 다시 나뉘어요.',
    rpP3: '지난 날의 기록은 바뀌지 않아요.',
    pvTitle: '반영 미리보기',
    pvBefore: '적용 전',
    pvChange: '마감일 10월 15일 → ',
    pvChangeNew: '10월 20일',
    pvSum: '남은 353페이지를 공부하는 날 12일에 나눕니다. 하루 29~30페이지',
    pvColDate: '날짜',
    pvColOld: '지금 계획 누적',
    pvColNew: '새 누적 목표',
    pvD1: '10월 7일', pvD2: '10월 8일', pvD3: '10월 9일', pvD4: '10월 10일',
    pvRest: '쉬는 날',
    pvCancel: '취소',
    pvApply: '적용',
    adjTitle: '분량 직접 조정',
    adjDate: '10월 12일',
    adjUnit: '페이지',
    adjFixed: '직접',
    adjReset: '자동으로 되돌리기',
    adjNote: '나머지 날의 분량이 자동으로 다시 나뉘어요.',

    shKicker: '보기 방식 · 공유',
    shTitle: '달력으로 한눈에 보고, 이미지로 공유해요',
    shDesc: '계획표는 목록과 달력 중에 편한 방식으로 볼 수 있어요. 공유할 때는 16:9 이미지로 내보내 PNG로 저장하거나 바로 복사해 붙여넣으세요.',
    shP1: '전체 기간 또는 오늘부터 남은 계획만 골라서 내보낼 수 있어요.',
    shP2: '진행률, 계획 대비 현황, 날짜별 분량이 한 장에 담겨요.',
    shList: '목록',
    shCal: '달력',
    shFrameTitle: '데이터 과학 입문',
    shRangeAll: '전체 기간',
    shRangeFrom: '오늘부터',
    shSave: 'PNG 저장',
    shCopy: '이미지 복사',

    /* 팀 */
    teamKicker: '팀 기능',
    teamTitle: '팀이 함께 읽는 필독서',
    teamDesc: '관리자가 필독서를 정하면 팀원들의 첫 화면에 필독서가 따로 보여요. 팀원은 시작일과 마감일, 쉬는 요일만 정하면 바로 계획이 만들어져요.',
    teamP1: '관리자는 표지, 저자, 챕터까지 필독서 정보를 등록해요.',
    teamP2: '팀원들의 진도와 계획을 한 화면에서 확인해요.',
    teamP3: '책 정보가 바뀌면 팀원에게 알려주고, 미리보기로 반영해요.',
    reqTag: '필독서',
    reqWaiting: '계획 없음',
    reqTitle: '함께 자라는 습관',
    reqAuthor: '정다은 지음',
    reqMeta: '248페이지 · 12개 챕터',
    reqBtn: '계획 세우기',
    reqChanged: '내용 변경됨',
    reqChangedNote: '관리자가 챕터를 바꾸면 이렇게 알려드려요.',
    adTab1: '진도 현황', adTab2: '회원 계획', adTab3: '필독서', adTab4: '회원 관리',
    adSum: '계획 세운 사람 3/4명 · 밀림 1명',
    m1Name: '김하늘', m1Badge: '계획대로',
    m2Name: '이준', m2Badge: '12페이지 밀림',
    m3Name: '박소망', m3Badge: '8페이지 앞섬',

    /* 기본 */
    baseTitle: '매일 쓰기 편하도록',
    b1Title: '어느 기기에서든',
    b1Desc: 'Google 계정으로 로그인하면 계획과 진도가 자동으로 저장돼서, PC와 휴대폰에서 이어서 볼 수 있어요.',
    b2Title: 'JSON 백업과 복원',
    b2Desc: '모든 목표와 진도 기록을 파일 하나로 내보내고, 필요할 때 다시 불러올 수 있어요.',
    b3Title: '한국어 / English',
    b3Desc: '화면 언어를 고르면 계정에 저장되어 다음에도 그 언어로 열려요.',

    /* 사용법 */
    stepsTitle: '이렇게 시작해요',
    s1Title: '목표와 마감일 정하기',
    s1Desc: '책, 강의, 성경 통독 중에 고르고 언제까지 끝낼지 정해요.',
    s2Title: '매일 오늘분량 읽고 기록하기',
    s2Desc: '첫 화면에 보이는 오늘 할 분량을 채우고, 읽은 곳까지 기록해요.',
    s3Title: '밀리면 재분배로 다시 맞추기',
    s3Desc: '계획보다 늦어지면 미리보기로 확인하고 남은 분량을 다시 나눠요.',

    /* FAQ */
    faqTitle: '자주 묻는 질문',
    q1: '하루를 건너뛰면 어떻게 되나요?',
    a1: '밀린 만큼 배지로 알려주고, 남은 공부일 동안 하루에 얼마씩 하면 기한을 맞출 수 있는지 안내해요. 원하면 재분배로 남은 분량을 다시 나눌 수 있어요.',
    q2: '쉬는 날에는 분량이 어떻게 되나요?',
    a2: '쉬는 요일과 쉬는 날짜에는 분량을 배정하지 않고, 그만큼을 다른 공부하는 날에 나눠 담아요. 오늘이 쉬는 날이면 첫 화면에도 그렇게 표시돼요.',
    q3: '계획을 바꾸면 지난 기록도 바뀌나요?',
    a3: '아니요. 재분배나 분량 조정은 오늘부터 적용되고 지난 날은 바뀌지 않아요. 원래 계획도 보관되어 계획표에서 비교할 수 있어요.',
    q4: '성경 통독은 어떻게 기록하나요?',
    a4: '마지막으로 읽은 권과 장을 고르면 돼요. 계획표에는 날짜마다 읽을 권과 장이 표시돼요.',
    q5: '데이터를 따로 백업할 수 있나요?',
    a5: '로그인하면 계정에 자동으로 저장되고, 대시보드에서 모든 목표를 JSON 파일로 내보내거나 다시 불러올 수 있어요.',

    /* 하단 */
    ctaTitle: '오늘 읽을 분량부터 확인해 보세요',
    ctaDesc: '마감일 하나만 정하면 계획표가 바로 만들어져요.',
    footerCopy: '© 2026 오늘분량',
    footerNote: '책·강의·성경 통독을 위한 학습 계획 앱',
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
    typeBible: 'Bible reading',

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
    mockGuideOn: "You've finished today's share. You're on track.",
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
    mockHint: 'Try checking off today!',

    kindsTitle: 'Books, courses, and Bible reading — one simple method',
    kindsDesc: 'Whatever you study, all you need is the total and a deadline. Each goal is split into the unit that fits it.',
    kBookTitle: 'Books',
    kBookDesc: 'Enter the first page of each chapter and get two plans side by side: by page and by chapter. You can note the author, too.',
    kBookExLabel: 'Today',
    kBookEx: 'p.43–77 · Part of Ch. 1',
    kCourseTitle: 'Courses',
    kCourseDesc: 'Paste your lesson titles, one per line, and each day shows exactly which lessons to watch.',
    kCourseExLabel: 'Today',
    kCourseEx: 'Lesson 12: Functions and scope',
    kBibleTitle: 'Bible reading',
    kBibleDesc: 'Pick any range of the 66 books, or choose the whole Bible, the Old or New Testament, or the Gospels in one tap.',
    kBibleExLabel: 'Today',
    kBibleEx: 'Matthew 5–7',

    calcTitle: 'See your daily share in seconds',
    calcDesc: 'Choose how much, how long, and which days you rest. The app turns this same calculation into a day-by-day plan.',
    calcKindLabel: 'What are you working on?',
    calcKindBook: 'Book',
    calcKindCourse: 'Course',
    calcKindBible: 'Bible reading',
    calcTotalLabel: 'Total',
    calcWeeksLabel: 'Time frame (from today)',
    calcWeek: '{w} wk',
    calcRestLabel: 'Days off (tap to skip)',
    calcResultLabel: 'Daily target',
    calcResult: '{n} {unit}',
    calcResultSub: '{days} study days · {rest} days off',
    calcNoDays: 'No study days left',
    calcNote: 'In the app, specific days off, heavier days, and hand-adjusted days are all taken into account.',
    unitPage: 'pages', unitLecture: 'lectures', unitChapter: 'chapters',
    unitPageOne: 'page', unitLectureOne: 'lecture', unitChapterOne: 'chapter',
    wdMon: 'Mon', wdTue: 'Tue', wdWed: 'Wed', wdThu: 'Thu', wdFri: 'Fri', wdSat: 'Sat', wdSun: 'Sun',

    featTitle: "Plan once. Then just do today's share.",
    featDesc: 'Splitting the work, fitting it to your schedule, and catching up when you slip — the app handles all of it.',

    schKicker: 'Flexible schedule',
    schTitle: 'Skip the days you rest. Do more when you have time.',
    schDesc: "Nobody studies the same amount every day. Tell the app about your week and it moves the work to the days you're free.",
    schP1: 'Set weekly days off, and those days get nothing assigned.',
    schP2: 'Add one-off days off, like events, with a short note.',
    schP3: 'Give easier days 1.5×, 2×, or 3× the usual amount.',
    schP4: 'Set a deadline 1, 2, 4, 6, or 8 weeks out in one tap.',
    calMonth: 'October plan',
    calCaption: 'Numbers = pages to read',
    calRest: 'Off',
    calMemo: 'Retreat',
    calToday: 'Today',
    legOff: 'Weekly day off',
    legMemo: 'Specific day off',
    legX2: 'Heavier day ×2',
    quickDue: 'Quick deadline',
    quickW1: '1 wk', quickW2: '2 wk', quickW4: '4 wk', quickW6: '6 wk', quickW8: '8 wk',

    recKicker: 'Logging progress',
    recTitle: 'Log it any way you like — it all lines up',
    recDesc: 'Use whichever method is easiest. Pages, chapters, and checkboxes are linked, so the plan and your status update no matter how you log.',
    recP1: 'Enter the last page you read,',
    recP2: 'pick the chapters you finished,',
    recP3: "or check off the day's row in your plan.",
    recPanelTitle: 'Log progress',
    recPage: 'Last page read',
    recPageVal: 'p.77',
    recOr: 'or',
    recChapter: 'Chapters finished',
    recChapterVal: 'Ch. 1 (to p.60)',
    recCheck: 'Plan checkbox',
    recCheckVal: "Oct 7's reading",
    recKeyTarget: 'Black line = target by today, 19%',
    recKeyDone: 'Green = actual progress, 19%',

    cmpKicker: 'Plan vs. actual',
    cmpTitle: "Behind or ahead, you'll know right away",
    cmpDesc: "The app compares where you should be with where you are, then tells you in one sentence how you're doing and how much to do each day from here.",
    cmpBehindBadge: '35 pages behind',
    cmpBehind: 'Read 40 pages a day for your 9 remaining study days to finish on time.',
    cmpAheadBadge: '20 pages ahead',
    cmpAhead: '33 pages a day over your 9 remaining study days is enough.',
    cmpOnBadge: 'On track',
    cmpOn: "You're on track. 35 pages left for today.",
    cmpRestBadge: 'Day off',
    cmpRest: "Today is a day off (Hangul Day). You're on track.",

    rpKicker: 'Replan · Change deadline',
    rpTitle: 'Preview every change before you apply it',
    rpDesc: "When you fall behind, spread what's left over the remaining days or move the deadline. You'll see the new plan first, and your original plan is kept.",
    rpP1: 'Replanning, changing the deadline, and editing a goal all show a preview first.',
    rpP2: 'Set a specific amount for any day, and the rest is redistributed automatically.',
    rpP3: 'Past days never change.',
    pvTitle: 'Preview changes',
    pvBefore: 'Not applied',
    pvChange: 'Deadline Oct 15 → ',
    pvChangeNew: 'Oct 20',
    pvSum: 'The remaining 353 pages are split across 12 study days: 29–30 pages a day.',
    pvColDate: 'Date',
    pvColOld: 'Current plan',
    pvColNew: 'New target',
    pvD1: 'Oct 7', pvD2: 'Oct 8', pvD3: 'Oct 9', pvD4: 'Oct 10',
    pvRest: 'Day off',
    pvCancel: 'Cancel',
    pvApply: 'Apply',
    adjTitle: 'Adjust by hand',
    adjDate: 'Oct 12',
    adjUnit: 'pages',
    adjFixed: 'Manual',
    adjReset: 'Reset to automatic',
    adjNote: 'The remaining days are rebalanced automatically.',

    shKicker: 'Views · Sharing',
    shTitle: 'See it on a calendar. Share it as an image.',
    shDesc: 'View your plan as a list or a calendar. To share, export it as a 16:9 image and save it as a PNG or copy it straight to your clipboard.',
    shP1: 'Export the whole period or just the days from today on.',
    shP2: 'Progress, your status, and the daily plan fit on one image.',
    shList: 'List',
    shCal: 'Calendar',
    shFrameTitle: 'Intro to Data Science',
    shRangeAll: 'Whole period',
    shRangeFrom: 'From today',
    shSave: 'Save PNG',
    shCopy: 'Copy image',

    teamKicker: 'For teams',
    teamTitle: 'Required reading, together',
    teamDesc: "When an admin assigns required reading, it appears in its own section on each member's home screen. Members only pick a start date, a deadline, and days off, and their plan is ready.",
    teamP1: 'Admins add the book with its cover, author, and chapters.',
    teamP2: "See everyone's progress and plans on one screen.",
    teamP3: 'If the book details change, members are notified and can preview the update.',
    reqTag: 'Required',
    reqWaiting: 'No plan yet',
    reqTitle: 'Growing Together',
    reqAuthor: 'by Daeun Jung',
    reqMeta: '248 pages · 12 chapters',
    reqBtn: 'Make a plan',
    reqChanged: 'Updated',
    reqChangedNote: "When an admin changes the chapters, you'll see this.",
    adTab1: 'Progress', adTab2: 'Member plans', adTab3: 'Required reading', adTab4: 'Members',
    adSum: '3 of 4 have a plan · 1 behind',
    m1Name: 'Alex', m1Badge: 'On track',
    m2Name: 'Jamie', m2Badge: '12 pages behind',
    m3Name: 'Sam', m3Badge: '8 pages ahead',

    baseTitle: 'Built for everyday use',
    b1Title: 'On any device',
    b1Desc: 'Sign in with Google and your plans and progress save automatically, so you can pick up on your computer or phone.',
    b2Title: 'JSON backup and restore',
    b2Desc: 'Export every goal and progress record to a single file, and load it back whenever you need to.',
    b3Title: '한국어 / English',
    b3Desc: 'Your language choice is saved to your account, so the app opens the same way next time.',

    stepsTitle: 'How it works',
    s1Title: 'Set a goal and a deadline',
    s1Desc: 'Choose a book, course, or Bible reading plan, and decide when to finish.',
    s2Title: "Do today's share and log it",
    s2Desc: "Read what's set for today on your home screen, then log where you stopped.",
    s3Title: 'Fall behind? Replan',
    s3Desc: "Preview the new plan and spread what's left over the days you have.",

    faqTitle: 'Questions',
    q1: 'What happens if I skip a day?',
    a1: "You'll see how far behind you are and how much to do each day to still finish on time. If you like, replan to spread what's left over the remaining days.",
    q2: 'What about days off?',
    a2: "Weekly days off and specific days off get nothing assigned; that work moves to your other study days. If today is a day off, your home screen says so.",
    q3: 'Does changing the plan change past days?',
    a3: 'No. Replanning and manual adjustments apply from today on, and past days stay as they were. Your original plan is kept so you can compare.',
    q4: 'How do I log Bible reading?',
    a4: 'Pick the last book and chapter you read. Your plan shows which books and chapters to read each day.',
    q5: 'Can I back up my data?',
    a5: 'Everything saves to your account when you sign in. You can also export all your goals to a JSON file from the dashboard and import it again later.',

    ctaTitle: "Start with today's share",
    ctaDesc: 'Set one deadline and your plan is ready.',
    footerCopy: "© 2026 Today's Dose",
    footerNote: 'A study planner for books, courses, and Bible reading.',
  },
};

/* ---------- 인라인 SVG ---------- */
const LP_SVG = {
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  brand: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  google: '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
  arrow: '<svg width="40" height="22" viewBox="0 0 40 22" fill="none" stroke="#2b3440" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4c6 12 18 16 30 12M28 10l6 6-8 3"/></svg>',
  chevron: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  reset: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.6M4 4v4.6h4.6"/></svg>',
  books: '<svg width="150" height="130" viewBox="0 0 150 130" fill="none" stroke="#2b3440" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="75" cy="124" rx="66" ry="5" fill="#e8ecf1" stroke="none"/><rect x="8" y="88" width="134" height="32" rx="5" fill="#bcd6f2"/><path d="M26 88v32M126 94h8M126 104h8M126 114h8"/><rect x="20" y="58" width="112" height="30" rx="5" fill="#f6c9a0"/><path d="M112 58v30"/><path d="M52 88v16l6-5 6 5V88" fill="#f28b82"/><rect x="12" y="30" width="118" height="28" rx="5" fill="#b9dcc4"/><path d="M30 30v28M44 40h52M44 48h34"/></svg>',
  cup: '<svg width="76" height="150" viewBox="0 0 76 150" fill="none" stroke="#2b3440" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="38" cy="144" rx="30" ry="5" fill="#e8ecf1" stroke="none"/><path d="M16 70V20l6-12 6 12v50" fill="#f6d98c"/><path d="M16 20h12"/><g transform="rotate(12 48 70)"><rect x="40" y="18" width="12" height="52" fill="#bcd6f2"/><rect x="40" y="8" width="12" height="10" rx="2" fill="#f7b6b0"/></g><path d="M8 66h60l-5 74H13z" fill="#ffffff"/><path d="M10 86h56"/><circle cx="28" cy="108" r="3" fill="#2b3440" stroke="none"/><circle cx="46" cy="108" r="3" fill="#2b3440" stroke="none"/><path d="M33 116q4 4 8 0"/></svg>',
  clock: '<svg width="120" height="140" viewBox="0 0 120 140" fill="none" stroke="#2b3440" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="60" cy="134" rx="44" ry="5" fill="#e8ecf1" stroke="none"/><path d="M36 112l-10 18M84 112l10 18"/><path d="M14 42a18 18 0 0 1 26-24z" fill="#f6c9a0"/><path d="M106 42a18 18 0 0 0-26-24z" fill="#f6c9a0"/><path d="M60 22v-8M52 12h16"/><circle cx="60" cy="72" r="46" fill="#f6d98c"/><circle cx="60" cy="72" r="34" fill="#ffffff"/><path d="M60 42v5M60 97v5M30 72h5M85 72h5"/><path d="M60 72V52M60 72l14 8"/><circle cx="60" cy="72" r="3" fill="#2b3440" stroke="none"/></svg>',
  smallClock: '<svg width="70" height="80" viewBox="0 0 120 140" fill="none" stroke="#2b3440" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M36 112l-10 18M84 112l10 18"/><path d="M14 42a18 18 0 0 1 26-24z" fill="#f6c9a0"/><path d="M106 42a18 18 0 0 0-26-24z" fill="#f6c9a0"/><circle cx="60" cy="72" r="46" fill="#f6d98c"/><circle cx="60" cy="72" r="34" fill="#ffffff"/><path d="M60 72V52M60 72l14 8"/></svg>',
  smallBooks: '<svg width="96" height="70" viewBox="0 0 150 110" fill="none" stroke="#2b3440" stroke-width="3" stroke-linejoin="round"><rect x="8" y="68" width="134" height="32" rx="5" fill="#bcd6f2"/><rect x="20" y="38" width="112" height="30" rx="5" fill="#f6c9a0"/><rect x="12" y="10" width="118" height="28" rx="5" fill="#b9dcc4"/></svg>',
  /* 목표 종류 그림 */
  kindBook: '<svg width="170" height="112" viewBox="0 0 170 112" fill="none" stroke="#2b3440" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 96l10-58c22-6 44-2 63 10 19-12 41-16 63-10l10 58c-24-6-50-2-73 12-23-14-49-18-73-12z" fill="#ffffff"/><path d="M85 48v60"/><path d="M34 56c12-2 24 0 36 5M32 68c12-2 24 0 36 5M30 80c12-2 24 0 36 5M100 61c12-5 24-7 36-5M102 73c12-5 24-7 36-5"/><path d="M118 44v26l6-5 6 5V42" fill="#f28b82"/><rect x="138" y="20" width="10" height="62" rx="2" transform="rotate(20 143 51)" fill="#f6d98c"/></svg>',
  kindCourse: '<svg width="170" height="112" viewBox="0 0 170 112" fill="none" stroke="#2b3440" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M66 90l-10 20M104 90l10 20M85 90v20"/><rect x="28" y="14" width="114" height="78" rx="8" fill="#ffffff"/><rect x="38" y="24" width="56" height="40" rx="5" fill="#bcd6f2"/><path d="M60 36v16l13-8z" fill="#ffffff"/><path d="M102 28h30M102 40h24M102 52h28M38 76h94"/><circle cx="56" cy="76" r="4" fill="#f6d98c"/></svg>',
  kindBible: '<svg width="170" height="112" viewBox="0 0 170 112" fill="none" stroke="#2b3440" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M54 12h64a6 6 0 0 1 6 6v84H60a6 6 0 0 1-6-6z" fill="#b9dcc4"/><path d="M54 96a6 6 0 0 0 6 6h64v-8H60a6 6 0 0 0-6 2z" fill="#fff3b0"/><path d="M72 12v84"/><path d="M84 34h26M84 44h18"/><path d="M100 102v8l5-4 5 4v-8" fill="#f28b82"/><circle cx="136" cy="30" r="10" fill="#f6d98c"/><path d="M136 12v6M136 42v6M118 30h6M148 30h6"/></svg>',
  /* 기본 아이콘 */
  devices: '<svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="#2b3440" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="4" y="9" width="30" height="21" rx="3" fill="#bcd6f2"/><path d="M12 37h14M19 30v7"/><rect x="30" y="18" width="14" height="24" rx="3" fill="#ffffff"/><path d="M35 38h4"/></svg>',
  backup: '<svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="#2b3440" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M10 6h20l8 8v28H10z" fill="#ffffff"/><path d="M30 6v8h8" fill="#e8ecf1"/><path d="M17 24h14M17 30h10" /><circle cx="34" cy="36" r="8" fill="#b9dcc4"/><path d="M34 32v8M30.5 36.5L34 40l3.5-3.5"/></svg>',
  globe: '<svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="#2b3440" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><circle cx="24" cy="24" r="17" fill="#f6d98c"/><path d="M7 24h34M24 7c5 5 7 11 7 17s-2 12-7 17c-5-5-7-11-7-17s2-12 7-17z" fill="none"/></svg>',
  reqCover: '<svg width="46" height="62" viewBox="0 0 46 62" fill="none" stroke="#2b3440" stroke-width="2" stroke-linejoin="round"><rect x="2" y="2" width="42" height="58" rx="4" fill="#f6c9a0"/><path d="M9 2v58" /><rect x="15" y="14" width="22" height="6" rx="1.5" fill="#ffffff"/><circle cx="26" cy="38" r="7" fill="#fff3b0"/></svg>',
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
  const S = LP_SVG;
  document.body.classList.add('is-landing');

  const googleBtn = `
        <button type="button" class="lp-btn-google" data-action="google-login">
          <span class="lp-g-badge" aria-hidden="true">${S.google}</span>
          <span data-i18n="googleCta"></span>
        </button>`;
  const points = (keys) => `<ul class="lp-row-points">${keys.map((k) => `<li data-i18n="${k}"></li>`).join('')}</ul>`;

  // 미니 달력: 10월 12일(월)~25일(일)
  const calCells = [];
  for (let d = 12; d <= 25; d++) {
    const wd = (d - 12) % 7; // 0 = 월
    let cls = '';
    let amt = '30';
    let key = '';
    if (wd === 6) { cls = 'lp-off'; key = 'calRest'; }
    else if (d === 16) { cls = 'lp-memo'; key = 'calMemo'; }
    else if (d === 22) { cls = 'lp-x2'; amt = '60'; }
    else if (d === 13) { cls = 'lp-today'; }
    calCells.push(`<div class="lp-cal-cell ${cls}"><span class="lp-cal-date">${d}</span><span class="lp-cal-amt"${key ? ` data-i18n="${key}"` : ''}>${key ? '' : amt}</span></div>`);
  }
  const WD_KEYS = ['wdMon', 'wdTue', 'wdWed', 'wdThu', 'wdFri', 'wdSat', 'wdSun'];

  root.innerHTML = `
<div class="landing" lang="${lang}">

  <!-- ===== 상단 바 ===== -->
  <header class="lp-topbar">
    <div class="lp-wrap lp-topbar-inner">
      <div class="lp-brand">
        <span class="lp-brand-mark" aria-hidden="true">${S.brand}</span>
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

  <!-- ===== 히어로 ===== -->
  <section class="lp-hero">
    <div class="lp-wrap lp-hero-grid">
      <div class="lp-hero-left">
        <h1 class="lp-hero-title" data-i18n="heroTitle"></h1>
        <p class="lp-hero-desc" data-i18n="heroDesc"></p>
        <div class="lp-hero-cta">
          ${googleBtn}
          <p class="lp-hero-note" data-i18n="heroNote"></p>
          <p class="lp-alert" data-lp-alert hidden></p>
        </div>
        <div class="lp-types">
          <span class="lp-types-label" data-i18n="typesLabel"></span>
          <span class="lp-type-pill" data-i18n="typeBook"></span>
          <span class="lp-type-pill" data-i18n="typeCourse"></span>
          <span class="lp-type-pill" data-i18n="typeBible"></span>
        </div>
        <div class="lp-desk-items" aria-hidden="true">${S.books}${S.cup}${S.clock}</div>
      </div>

      <div class="lp-mock-area">
        <div class="lp-mock" id="landingMock">
          <div class="lp-sticky"><span data-i18n="mockHint"></span>${S.arrow}</div>
          <div class="lp-mock-head">
            <span class="lp-mock-title" data-i18n="mockTitle"></span>
            <span class="lp-chip lp-chip-type" data-i18n="mockType"></span>
            <span class="lp-chip lp-chip-dday" data-i18n="mockDday"></span>
          </div>
          <div class="lp-stats">
            <div class="lp-stat"><div class="lp-stat-label" data-i18n="mockDailyLabel"></div><div class="lp-stat-value" data-i18n="mockDailyValue"></div></div>
            <div class="lp-stat"><div class="lp-stat-label" data-i18n="mockTargetLabel"></div><div class="lp-stat-value" data-i18n="mockTargetValue"></div></div>
            <div class="lp-stat lp-stat-actual"><div class="lp-stat-label" data-i18n="mockActualLabel"></div><div class="lp-stat-value" data-i18n="mockActualBehind" data-state-key="actual"></div></div>
            <div class="lp-stat"><div class="lp-stat-label" data-i18n="mockLastLabel"></div><div class="lp-stat-value" data-i18n="mockLastValue"></div></div>
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
              <thead><tr>
                <th data-i18n="thDate"></th><th data-i18n="thDay"></th><th data-i18n="thRange"></th>
                <th class="lp-col-num" data-i18n="thAmount"></th><th class="lp-col-check" data-i18n="thDone"></th>
              </tr></thead>
              <tbody>
                <tr class="lp-row-past">
                  <td data-i18n="r1Date"></td><td data-i18n="r1Day"></td><td data-i18n="r1Range"></td>
                  <td class="lp-col-num" data-i18n="r1Amount"></td>
                  <td class="lp-col-check"><button type="button" class="lp-check lp-is-checked" disabled data-i18n-aria="checkDoneAria">${S.check}</button></td>
                </tr>
                <tr class="lp-row-today">
                  <td><span data-i18n="r2Date"></span><span class="lp-today-tag" data-i18n="todayTag"></span></td>
                  <td data-i18n="r2Day"></td><td data-i18n="r2Range"></td>
                  <td class="lp-col-num" data-i18n="r2Amount"></td>
                  <td class="lp-col-check"><button type="button" class="lp-check lp-check-live" id="landingTodayCheck" aria-pressed="false" data-i18n-aria="checkTodayAria">${S.check}</button></td>
                </tr>
                <tr>
                  <td data-i18n="r3Date"></td><td data-i18n="r3Day"></td><td data-i18n="r3Range"></td>
                  <td class="lp-col-num" data-i18n="r3Amount"></td>
                  <td class="lp-col-check"><button type="button" class="lp-check" disabled tabindex="-1" aria-hidden="true">${S.check}</button></td>
                </tr>
                <tr class="lp-row-rest">
                  <td data-i18n="r4Date"></td><td data-i18n="r4Day"></td><td data-i18n="r4Range"></td>
                  <td class="lp-col-num lp-muted">–</td><td class="lp-col-check"></td>
                </tr>
                <tr>
                  <td data-i18n="r5Date"></td><td data-i18n="r5Day"></td>
                  <td><span data-i18n="r5Range"></span><span class="lp-extra" data-i18n="r5Extra"></span></td>
                  <td class="lp-col-num" data-i18n="r5Amount"></td>
                  <td class="lp-col-check"><button type="button" class="lp-check" disabled tabindex="-1" aria-hidden="true">${S.check}</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== 목표 종류 ===== -->
  <section class="lp-section">
    <div class="lp-wrap">
      <h2 class="lp-section-title" data-i18n="kindsTitle"></h2>
      <p class="lp-section-desc" data-i18n="kindsDesc"></p>
      <div class="lp-typecards">
        ${[['kBook', S.kindBook], ['kCourse', S.kindCourse], ['kBible', S.kindBible]].map(([k, art]) => `
        <article class="lp-typecard">
          <div class="lp-typecard-art" aria-hidden="true">${art}</div>
          <div class="lp-typecard-body">
            <h3 class="lp-typecard-title" data-i18n="${k}Title"></h3>
            <p class="lp-typecard-desc" data-i18n="${k}Desc"></p>
            <span class="lp-typecard-ex"><strong data-i18n="${k}ExLabel"></strong><span data-i18n="${k}Ex"></span></span>
          </div>
        </article>`).join('')}
      </div>
    </div>
  </section>

  <!-- ===== 계산기 ===== -->
  <section class="lp-section lp-calc-band">
    <div class="lp-wrap lp-calc">
      <div>
        <h2 class="lp-section-title" data-i18n="calcTitle"></h2>
        <p class="lp-section-desc" data-i18n="calcDesc"></p>
        <p class="lp-calc-note" data-i18n="calcNote"></p>
      </div>
      <div class="lp-calc-panel" id="lpCalc">
        <div>
          <span class="lp-field-label" data-i18n="calcKindLabel"></span>
          <div class="lp-seg" data-calc-kind>
            <button type="button" data-kind="book" data-i18n="calcKindBook"></button>
            <button type="button" data-kind="course" data-i18n="calcKindCourse"></button>
            <button type="button" data-kind="bible" data-i18n="calcKindBible"></button>
          </div>
        </div>
        <div>
          <label class="lp-field-label" for="lpCalcTotal" data-i18n="calcTotalLabel"></label>
          <div class="lp-num-row">
            <input id="lpCalcTotal" class="lp-num-input" type="number" min="1" max="99999" inputmode="numeric">
            <span class="lp-unit" data-calc-unit></span>
          </div>
        </div>
        <div>
          <span class="lp-field-label" data-i18n="calcWeeksLabel"></span>
          <div class="lp-seg" data-calc-weeks>
            ${[1, 2, 4, 6, 8].map((w) => `<button type="button" data-weeks="${w}">${escapeLandingHtml(dict.calcWeek.replace('{w}', w))}</button>`).join('')}
          </div>
        </div>
        <div>
          <span class="lp-field-label" data-i18n="calcRestLabel"></span>
          <div class="lp-seg lp-seg-days" data-calc-rest>
            ${WD_KEYS.map((k, i) => `<button type="button" data-wd="${i}" data-i18n="${k}"></button>`).join('')}
          </div>
        </div>
        <div class="lp-calc-result" aria-live="polite">
          <div>
            <div class="lp-calc-result-label" data-i18n="calcResultLabel"></div>
            <div class="lp-calc-result-value" data-calc-value></div>
          </div>
          <div class="lp-calc-result-sub" data-calc-sub></div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== 기능 (지그재그) ===== -->
  <section class="lp-section">
    <div class="lp-wrap">
      <h2 class="lp-section-title" data-i18n="featTitle"></h2>
      <p class="lp-section-desc" data-i18n="featDesc"></p>

      <div class="lp-rows">
        <!-- 유연한 일정 -->
        <div class="lp-row">
          <div class="lp-row-text">
            <p class="lp-row-kicker" data-i18n="schKicker"></p>
            <h3 class="lp-row-title" data-i18n="schTitle"></h3>
            <p class="lp-row-desc" data-i18n="schDesc"></p>
            ${points(['schP1', 'schP2', 'schP3', 'schP4'])}
          </div>
          <div class="lp-visual" aria-hidden="true">
            <div class="lp-panel">
              <div class="lp-panel-head">
                <span class="lp-panel-title" data-i18n="calMonth"></span>
                <span class="lp-small" data-i18n="calCaption"></span>
              </div>
              <div class="lp-cal">
                ${WD_KEYS.map((k) => `<span class="lp-cal-wd" data-i18n="${k}"></span>`).join('')}
                ${calCells.join('')}
              </div>
              <div class="lp-legend">
                <span><i class="lp-sw-off"></i><span data-i18n="legOff"></span></span>
                <span><i class="lp-sw-memo"></i><span data-i18n="legMemo"></span></span>
                <span><i class="lp-sw-x2"></i><span data-i18n="legX2"></span></span>
              </div>
            </div>
            <div class="lp-panel">
              <div class="lp-weeks">
                <span class="lp-small" data-i18n="quickDue"></span>
                <span class="lp-mini-btn" data-i18n="quickW1"></span>
                <span class="lp-mini-btn" data-i18n="quickW2"></span>
                <span class="lp-mini-btn lp-on" data-i18n="quickW4"></span>
                <span class="lp-mini-btn" data-i18n="quickW6"></span>
                <span class="lp-mini-btn" data-i18n="quickW8"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 진도 기록 -->
        <div class="lp-row lp-flip">
          <div class="lp-row-text">
            <p class="lp-row-kicker" data-i18n="recKicker"></p>
            <h3 class="lp-row-title" data-i18n="recTitle"></h3>
            <p class="lp-row-desc" data-i18n="recDesc"></p>
            ${points(['recP1', 'recP2', 'recP3'])}
          </div>
          <div class="lp-visual" aria-hidden="true">
            <div class="lp-panel">
              <div class="lp-panel-head"><span class="lp-panel-title" data-i18n="recPanelTitle"></span></div>
              <div class="lp-rec">
                <div class="lp-rec-row"><span class="lp-rec-label" data-i18n="recPage"></span><span class="lp-fake-input" data-i18n="recPageVal"></span></div>
                <div class="lp-or" data-i18n="recOr"></div>
                <div class="lp-rec-row"><span class="lp-rec-label" data-i18n="recChapter"></span><span class="lp-fake-input"><span data-i18n="recChapterVal"></span>${S.chevron}</span></div>
                <div class="lp-or" data-i18n="recOr"></div>
                <div class="lp-rec-row"><span class="lp-rec-label" data-i18n="recCheck"></span><span class="lp-fake-input"><span data-i18n="recCheckVal"></span><span class="lp-check lp-is-checked">${S.check}</span></span></div>
              </div>
            </div>
            <div class="lp-panel">
              <div class="lp-bar">
                <div class="lp-bar-fill" style="width:19.5%"></div>
                <div class="lp-bar-marker"></div>
              </div>
              <div class="lp-bar-legend">
                <span><i class="lp-key-line"></i><span data-i18n="recKeyTarget"></span></span>
                <span><i class="lp-key-fill"></i><span data-i18n="recKeyDone"></span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 계획 대비 현황 -->
        <div class="lp-row">
          <div class="lp-row-text">
            <p class="lp-row-kicker" data-i18n="cmpKicker"></p>
            <h3 class="lp-row-title" data-i18n="cmpTitle"></h3>
            <p class="lp-row-desc" data-i18n="cmpDesc"></p>
          </div>
          <div class="lp-visual" aria-hidden="true">
            <div class="lp-msgs">
              <div class="lp-msg"><span class="lp-badge lp-badge-behind" data-i18n="cmpBehindBadge"></span><p data-i18n="cmpBehind"></p></div>
              <div class="lp-msg"><span class="lp-badge lp-badge-ahead" data-i18n="cmpAheadBadge"></span><p data-i18n="cmpAhead"></p></div>
              <div class="lp-msg"><span class="lp-badge lp-badge-on" data-i18n="cmpOnBadge"></span><p data-i18n="cmpOn"></p></div>
              <div class="lp-msg"><span class="lp-badge lp-badge-rest" data-i18n="cmpRestBadge"></span><p data-i18n="cmpRest"></p></div>
            </div>
          </div>
        </div>

        <!-- 재분배 미리보기 -->
        <div class="lp-row lp-flip">
          <div class="lp-row-text">
            <p class="lp-row-kicker" data-i18n="rpKicker"></p>
            <h3 class="lp-row-title" data-i18n="rpTitle"></h3>
            <p class="lp-row-desc" data-i18n="rpDesc"></p>
            ${points(['rpP1', 'rpP2', 'rpP3'])}
          </div>
          <div class="lp-visual" aria-hidden="true">
            <div class="lp-panel">
              <div class="lp-panel-head">
                <span class="lp-panel-title" data-i18n="pvTitle"></span>
                <span class="lp-tag-before" data-i18n="pvBefore"></span>
              </div>
              <p class="lp-pv-change"><span data-i18n="pvChange"></span><b data-i18n="pvChangeNew"></b></p>
              <p class="lp-pv-sum" data-i18n="pvSum"></p>
              <table class="lp-mini-table">
                <thead><tr><th data-i18n="pvColDate"></th><th data-i18n="pvColOld"></th><th data-i18n="pvColNew"></th></tr></thead>
                <tbody>
                  <tr><td data-i18n="pvD1"></td><td class="lp-old">p.77</td><td class="lp-new">p.71</td></tr>
                  <tr><td data-i18n="pvD2"></td><td class="lp-old">p.112</td><td class="lp-new">p.101</td></tr>
                  <tr class="lp-rest"><td data-i18n="pvD3"></td><td colspan="2" data-i18n="pvRest"></td></tr>
                  <tr><td data-i18n="pvD4"></td><td class="lp-old">p.182</td><td class="lp-new">p.130</td></tr>
                </tbody>
              </table>
              <div class="lp-pv-actions">
                <span class="lp-fake-btn" data-i18n="pvCancel"></span>
                <span class="lp-fake-btn lp-primary" data-i18n="pvApply"></span>
              </div>
            </div>
            <div class="lp-panel">
              <div class="lp-panel-head"><span class="lp-panel-title" data-i18n="adjTitle"></span></div>
              <div class="lp-adjust-row">
                <span data-i18n="adjDate"></span>
                <span class="lp-adjust-input">50</span>
                <span class="lp-small" data-i18n="adjUnit"></span>
                <span class="lp-tag-fixed" data-i18n="adjFixed"></span>
                <span class="lp-reset" data-i18n-aria="adjReset">${S.reset}</span>
              </div>
              <p class="lp-small" style="margin-top:8px" data-i18n="adjNote"></p>
            </div>
          </div>
        </div>

        <!-- 보기 방식 · 공유 -->
        <div class="lp-row">
          <div class="lp-row-text">
            <p class="lp-row-kicker" data-i18n="shKicker"></p>
            <h3 class="lp-row-title" data-i18n="shTitle"></h3>
            <p class="lp-row-desc" data-i18n="shDesc"></p>
            ${points(['shP1', 'shP2'])}
          </div>
          <div class="lp-visual" aria-hidden="true">
            <div class="lp-share-top">
              <span class="lp-weeks"><span class="lp-mini-btn" data-i18n="shList"></span><span class="lp-mini-btn lp-on" data-i18n="shCal"></span></span>
              <span class="lp-weeks"><span class="lp-mini-btn" data-i18n="shRangeAll"></span><span class="lp-mini-btn lp-on" data-i18n="shRangeFrom"></span></span>
            </div>
            <div class="lp-frame">
              <div class="lp-frame-left">
                <div class="lp-frame-cover"></div>
                <div class="lp-frame-title" data-i18n="shFrameTitle"></div>
                <div class="lp-frame-bar"></div>
                <span class="lp-badge lp-badge-behind" style="font-size:10px;padding:0 6px;align-self:flex-start" data-i18n="mockBadgeBehind"></span>
              </div>
              <div class="lp-frame-rows">
                <div class="lp-frame-row lp-hl"></div>
                <div class="lp-frame-row"></div>
                <div class="lp-frame-row lp-rest"></div>
                <div class="lp-frame-row"></div>
                <div class="lp-frame-row"></div>
                <div class="lp-frame-row"></div>
              </div>
              <span class="lp-frame-size">1920 × 1080</span>
            </div>
            <div class="lp-share-bottom">
              <span></span>
              <span class="lp-weeks">
                <span class="lp-fake-btn" data-i18n="shCopy"></span>
                <span class="lp-fake-btn lp-primary" data-i18n="shSave"></span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== 팀 ===== -->
  <section class="lp-section lp-team-band">
    <div class="lp-wrap lp-team">
      <div>
        <span class="lp-team-kicker" data-i18n="teamKicker"></span>
        <h2 class="lp-section-title" data-i18n="teamTitle"></h2>
        <p class="lp-section-desc" data-i18n="teamDesc"></p>
        ${points(['teamP1', 'teamP2', 'teamP3'])}
      </div>
      <div class="lp-team-visual" aria-hidden="true">
        <div>
          <div class="lp-req-card">
            <div class="lp-panel-head" style="margin-bottom:0">
              <span class="lp-req-tag" data-i18n="reqTag"></span>
              <span class="lp-badge lp-badge-rest" style="font-size:11px;padding:1px 8px" data-i18n="reqWaiting"></span>
            </div>
            <div class="lp-req-book">
              ${S.reqCover}
              <div>
                <div class="lp-req-title" data-i18n="reqTitle"></div>
                <div class="lp-req-meta" data-i18n="reqAuthor"></div>
                <div class="lp-req-meta" data-i18n="reqMeta"></div>
              </div>
            </div>
            <div class="lp-req-btn" data-i18n="reqBtn"></div>
          </div>
          <p class="lp-req-note"><span class="lp-badge lp-badge-changed" style="font-size:11px;padding:1px 8px" data-i18n="reqChanged"></span><span data-i18n="reqChangedNote"></span></p>
        </div>
        <div class="lp-admin">
          <div class="lp-admin-tabs">
            <span class="lp-on" data-i18n="adTab1"></span><span data-i18n="adTab2"></span><span data-i18n="adTab3"></span><span data-i18n="adTab4"></span>
          </div>
          <p class="lp-admin-sum" data-i18n="adSum"></p>
          <div class="lp-member"><span data-i18n="m1Name"></span><span class="lp-member-bar"><i style="width:62%"></i></span><span class="lp-badge lp-badge-on" data-i18n="m1Badge"></span></div>
          <div class="lp-member"><span data-i18n="m2Name"></span><span class="lp-member-bar"><i style="width:38%"></i></span><span class="lp-badge lp-badge-behind" data-i18n="m2Badge"></span></div>
          <div class="lp-member"><span data-i18n="m3Name"></span><span class="lp-member-bar"><i style="width:75%"></i></span><span class="lp-badge lp-badge-ahead" data-i18n="m3Badge"></span></div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== 기본 ===== -->
  <section class="lp-section">
    <div class="lp-wrap">
      <h2 class="lp-section-title" data-i18n="baseTitle"></h2>
      <div class="lp-trio">
        ${[['b1', S.devices], ['b2', S.backup], ['b3', S.globe]].map(([k, icon]) => `
        <div class="lp-trio-item">
          <span aria-hidden="true">${icon}</span>
          <h3 class="lp-trio-title" data-i18n="${k}Title"></h3>
          <p class="lp-trio-desc" data-i18n="${k}Desc"></p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- ===== 사용법 ===== -->
  <section class="lp-section">
    <div class="lp-wrap">
      <h2 class="lp-section-title" data-i18n="stepsTitle"></h2>
      <ol class="lp-steps">
        ${[1, 2, 3].map((n) => `
        <li class="lp-step">
          <span class="lp-step-num" aria-hidden="true">${n}</span>
          <h3 class="lp-step-title" data-i18n="s${n}Title"></h3>
          <p class="lp-step-desc" data-i18n="s${n}Desc"></p>
        </li>`).join('')}
      </ol>
    </div>
  </section>

  <!-- ===== 자주 묻는 질문 ===== -->
  <section class="lp-section">
    <div class="lp-wrap">
      <h2 class="lp-section-title" data-i18n="faqTitle"></h2>
      <div class="lp-faq">
        ${[1, 2, 3, 4, 5].map((n) => `
        <details>
          <summary data-i18n="q${n}"></summary>
          <p class="lp-faq-a" data-i18n="a${n}"></p>
        </details>`).join('')}
      </div>
    </div>
  </section>

  <!-- ===== 하단 시작하기 ===== -->
  <section class="lp-section">
    <div class="lp-wrap">
      <div class="lp-cta">
        <div>
          <h2 class="lp-cta-title" data-i18n="ctaTitle"></h2>
          <p class="lp-cta-desc" data-i18n="ctaDesc"></p>
        </div>
        ${googleBtn}
        <div class="lp-cta-art" aria-hidden="true">${S.smallBooks}${S.smallClock}</div>
      </div>
    </div>
  </section>

  <!-- ===== 푸터 ===== -->
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

  // 계산기: 앱과 같은 방식 (마감일 = 시작일 + N주 - 1일, 하루 권장 = 전체 ÷ 공부하는 날)
  const calc = {
    kind: 'book',
    totals: { book: 395, course: 40, bible: 260 },
    weeks: 4,
    rest: new Set([6]), // 0 = 월 … 6 = 일
  };
  const UNIT_KEYS = { book: 'unitPage', course: 'unitLecture', bible: 'unitChapter' };
  const calcEl = landing.querySelector('#lpCalc');
  const totalInput = calcEl.querySelector('#lpCalcTotal');
  const unitName = (n) => dict[n === 1 ? `${UNIT_KEYS[calc.kind]}One` : UNIT_KEYS[calc.kind]];
  const renderCalc = () => {
    calcEl.querySelectorAll('[data-kind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === calc.kind)));
    calcEl.querySelectorAll('[data-weeks]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.weeks) === calc.weeks)));
    calcEl.querySelectorAll('[data-wd]').forEach((b) => b.setAttribute('aria-pressed', String(calc.rest.has(Number(b.dataset.wd)))));
    calcEl.querySelector('[data-calc-unit]').textContent = dict[UNIT_KEYS[calc.kind]];

    const total = calc.totals[calc.kind];
    const days = calc.weeks * 7;
    const restDays = calc.rest.size * calc.weeks;
    const studyDays = days - restDays;
    const valueEl = calcEl.querySelector('[data-calc-value]');
    const subEl = calcEl.querySelector('[data-calc-sub]');
    if (!total || total < 1) {
      valueEl.textContent = '–';
    } else if (studyDays <= 0) {
      valueEl.textContent = dict.calcNoDays;
    } else {
      const avg = total / studyDays;
      const n = avg >= 10 ? Math.round(avg) : Math.round(avg * 10) / 10;
      valueEl.textContent = dict.calcResult.replace('{n}', n).replace('{unit}', unitName(n));
    }
    subEl.textContent = dict.calcResultSub.replace('{days}', Math.max(0, studyDays)).replace('{rest}', restDays);
  };
  calcEl.addEventListener('click', (e) => {
    const kindBtn = e.target.closest('[data-kind]');
    const weekBtn = e.target.closest('[data-weeks]');
    const dayBtn = e.target.closest('[data-wd]');
    if (kindBtn) {
      calc.kind = kindBtn.dataset.kind;
      totalInput.value = calc.totals[calc.kind];
    } else if (weekBtn) {
      calc.weeks = Number(weekBtn.dataset.weeks);
    } else if (dayBtn) {
      const wd = Number(dayBtn.dataset.wd);
      if (calc.rest.has(wd)) calc.rest.delete(wd); else calc.rest.add(wd);
    } else {
      return;
    }
    renderCalc();
  });
  totalInput.addEventListener('input', () => {
    const v = Math.floor(Number(totalInput.value));
    calc.totals[calc.kind] = Number.isFinite(v) && v > 0 ? Math.min(v, 99999) : 0;
    renderCalc();
  });
  totalInput.value = calc.totals[calc.kind];

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
  renderCalc();
}

function escapeLandingHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
