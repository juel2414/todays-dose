/* =========================================================================
 * 오늘분량 메인(랜딩) 페이지 — Claude Design 리디자인(흑백 + 파랑, 손그림 일러스트)
 *   app.js에서 renderLanding(root, options)만 부른다. 모든 클래스는 lp- 접두사.
 *   문구는 LANDING_TEXT의 ko/en 두 벌. 그림은 landing/ 폴더.
 * ========================================================================= */

const LANDING_TEXT = {
  ko: {
    nav: ['소개', '기능', '이런 분들', '자주 묻는 질문'],
    login: '로그인',
    heroTitle: '계획은 맡기고, 실행만 하세요.',
    heroSub: '마감일만 정하면, 매일 오늘 할 분량이 나와요.',
    cta: 'Google 계정으로 시작하기',
    illusAlt: '책 더미에 기대어 책을 읽는 사람 손그림',
    todayCard: '오늘 분량',
    todayDate: '10월 1일 · D-24',
    todayItems: ['영어 단어 Day 12 · 40개', '수학 3단원 p.84–92', '국어 비문학 지문 3개'],
    whyTitle: '공부보다 계획 짜는 데 더 오래 걸린 적 있나요?',
    oldLabel: '예전 방식',
    oldSteps: ['목차를 펼쳐 전체 페이지 세기', '마감일까지 남은 날 세기', '쉬는 날 빼고 하루 분량 나누기', '달력에 날짜별로 옮겨 적기', '하루 밀리면 처음부터 다시'],
    newLabel: '오늘분량',
    newSteps: ['목표 만들기', '마감일', '끝'],
    calcEyebrow: '직접 넣어 보세요',
    calcTitle: '마감일만 정하면, 하루 분량은 계산해 드려요',
    s1: '쪽을', s2: '주 동안,', s3: '은 쉬면서.',
    r1: '그러면 하루에', r2: '쪽이면 돼요.',
    bubble: '오늘은 {n}쪽까지',
    days: ['월', '화', '수', '목', '금', '토', '일'],
    removeTitle: '계획 세우는 시간, 이 세 가지를 없앴어요',
    rm1: '입력',
    rm1d: '책 제목과 마지막 페이지만 적으면 돼요. 목차 사진 한 장이면 AI가 챕터와 시작 페이지까지 채워요.',
    photoLabel: '목차 사진에서 채움',
    toc: [['1장 습관의 시작', 12], ['2장 작은 변화의 힘', 31], ['3장 환경을 바꾸는 법', 58], ['4장 반복과 기록', 84]],
    rm2: '계산',
    rm2d: '마감일만 정하면 쉬는 날을 빼고 하루 분량을 고르게 나눠요.',
    deadlineLabel: '마감일', deadlineVal: '10월 14일', deadlineNote: '쉬는 날(빈칸)을 빼고 매일 같은 분량',
    rm3: '다시 짜기',
    rm3d: '밀리면 남은 분량을 다시 나눈 계획을 먼저 보여 줘요. 보고 적용하면 되고, 원래 계획은 보관돼요.',
    oldPlan: '원래 계획 (보관)', oldPlanLine: '하루 17쪽',
    newPlan: '바뀔 계획 미리보기', newPlanLine: '남은 날 하루 20쪽', newPlanNote: '오늘부터 바뀌고, 지난 기록은 그대로예요.', apply: '적용하기',
    whoTitle: '이런 분들이 써요',
    whoPhrases: ['시험을 준비하는 사람도,', '인강을 끝까지 듣고 싶은 사람도,', '모임 필독서를 함께 읽는 사람도,', '성경을 통독하는 사람도'],
    whoEnd: '오늘 분량만 따라가면 돼요.',
    personas: [
      ['시험 준비', '토익 RC 600쪽을 6주 동안, 일요일은 쉬면서', '하루 17쪽', '손그림: 시험공부하는 사람'],
      ['인강 완강', '온라인 강의 84강을 4주 동안', '하루 3강', '손그림: 노트북으로 강의 듣는 사람'],
      ['모임 필독서', '이번 달 필독서 320쪽을 2주 동안', '하루 23쪽', '손그림: 책을 든 두세 사람'],
      ['성경 통독', '신약 260장을 13주 동안', '하루 3장', '손그림: 성경을 펼친 사람'],
    ],
    storyTitle: 'Why we made it',
    story: '계획을 세우는 데 시간이 너무 오래 걸렸습니다. 목차를 세고, 남은 날을 세고, 날짜마다 나눠 적다 보면 정작 실행할 시간이 줄어들었죠. 그 시간을 없애려고 오늘분량을 만들었습니다.',
    faqTitle: '자주 묻는 질문',
    faq: [
      ['하루를 건너뛰면?', '밀린 만큼 알려 주고, 남은 날 동안 하루 얼마씩 하면 되는지 안내해요. 원하면 재분배할 수 있어요.'],
      ['쉬는 날 분량은?', '배정하지 않고 다른 공부하는 날에 나눠 담아요.'],
      ['계획을 바꾸면 지난 기록도 바뀌나요?', '아니요, 오늘부터만 바뀌고 원래 계획은 보관돼요.'],
      ['데이터는 어떻게 저장되나요?', 'Google 계정으로 로그인하면 자동 저장되어 어느 기기에서든 같은 계획을 봐요.'],
    ],
    langLabel: '언어',
    brandLabel: '오늘분량 Today’s Dose',
    toTop: '맨 위로',
  },
  en: {
    nav: ['About', 'Features', 'Who', 'FAQ'],
    login: 'Log in',
    heroTitle: 'Leave the planning to us. Just get it done.',
    heroSub: 'Set a deadline. Every day, you get today’s amount.',
    cta: 'Continue with Google',
    illusAlt: 'Hand-drawn person reading against a stack of books',
    todayCard: 'Today’s dose',
    todayDate: 'Oct 1 · D-24',
    todayItems: ['Vocab Day 12 · 40 words', 'Math unit 3, p.84–92', '3 reading passages'],
    whyTitle: 'Ever spent longer planning than studying?',
    oldLabel: 'The old way',
    oldSteps: ['Count the pages in the contents', 'Count the days to the deadline', 'Divide it up, minus days off', 'Copy it day by day into a calendar', 'Miss a day, start over'],
    newLabel: 'Today’s Dose',
    newSteps: ['Add a goal', 'Set a deadline', 'Done'],
    calcEyebrow: 'Try it',
    calcTitle: 'Set a deadline. We’ll work out each day’s dose.',
    s1: 'pages over', s2: 'weeks, with', s3: 'off.',
    r1: 'That’s', r2: 'pages a day.',
    bubble: '{n} pages today',
    days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    removeTitle: 'Three parts of planning, gone',
    rm1: 'Typing',
    rm1d: 'Just enter the title and last page. One photo of the contents and AI fills in every chapter and start page.',
    photoLabel: 'Filled from contents photo',
    toc: [['1 Where Habits Begin', 12], ['2 The Power of Small Changes', 31], ['3 Changing Your Surroundings', 58], ['4 Repeat and Record', 84]],
    rm2: 'Math',
    rm2d: 'Set a deadline and the work is split evenly across your study days.',
    deadlineLabel: 'Deadline', deadlineVal: 'Oct 14', deadlineNote: 'Same amount every day, skipping days off (empty)',
    rm3: 'Replanning',
    rm3d: 'Fall behind and you see the re-split plan first. Apply it if it looks right; the original is kept.',
    oldPlan: 'Original plan (kept)', oldPlanLine: '17 pages a day',
    newPlan: 'Preview of new plan', newPlanLine: '20 pages a day from now', newPlanNote: 'Changes start today. Past records stay as they are.', apply: 'Apply',
    whoTitle: 'Who it’s for',
    whoPhrases: ['Studying for an exam,', 'finishing an online course,', 'reading for a book club,', 'reading through the Bible —'],
    whoEnd: 'just follow today’s dose.',
    personas: [
      ['Exam prep', 'TOEIC Reading, 600 pages in 6 weeks, Sundays off', '17 pages a day', 'Sketch: person studying for an exam'],
      ['Online course', '84 lectures in 4 weeks', '3 lectures a day', 'Sketch: person watching a lecture'],
      ['Book club', 'This month’s pick, 320 pages in 2 weeks', '23 pages a day', 'Sketch: two or three people with books'],
      ['Bible reading', 'New Testament, 260 chapters in 13 weeks', '3 chapters a day', 'Sketch: person with an open Bible'],
    ],
    storyTitle: 'Why we made it',
    story: 'Planning took far too long. Counting pages, counting days, splitting it all across a calendar — it ate into the time meant for actually doing it. We built Today’s Dose to make that time disappear.',
    faqTitle: 'FAQ',
    faq: [
      ['What if I skip a day?', 'It shows how far behind you are and how much a day gets you back on track. Re-split the plan if you like.'],
      ['What happens on days off?', 'Nothing is assigned. The amount is spread over your study days.'],
      ['Does changing the plan change my past records?', 'No. Changes apply from today, and the original plan is kept.'],
      ['Where is my data stored?', 'Sign in with Google and it saves automatically, so every device shows the same plan.'],
    ],
    langLabel: 'Language',
    brandLabel: 'Today’s Dose',
    toTop: 'Back to top',
  },
};

/* 그림 (landing/ 폴더). 사람 그림은 동그란 알약 칸에 맞게 확대·위치를 조금씩 다르게 */
const LP_ASSETS = {
  hero: 'landing/hero-reading.svg',
  markLight: 'landing/mark-light.svg', // 어두운 칸 위 로고
  markDark: 'landing/mark-dark.svg', // 밝은 바탕 위 로고
  personas: [
    { img: 'landing/exam.svg', zoom: 1.1, origin: '45% 45%' },
    { img: 'landing/lecture.svg', zoom: 1.1, origin: '55% 40%' },
    { img: 'landing/reading-group.svg', zoom: 1.1, origin: '50% 38%' },
    { img: 'landing/bible.svg', zoom: 1.05, origin: '35% 38%' },
  ],
};

const LP_SECTIONS = ['lp-why', 'lp-remove', 'lp-who', 'lp-faq'];

/* 웹 글꼴 (한 번만 불러온다) */
function loadLandingFonts() {
  if (document.getElementById('lp-fonts')) return;
  const links = [
    'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&family=Hahmlet:wght@600&family=JetBrains+Mono:wght@500&family=Nanum+Myeongjo:wght@800&family=Nanum+Pen+Script&display=swap',
  ];
  links.forEach((href, i) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (i === 0) link.id = 'lp-fonts';
    document.head.appendChild(link);
  });
}

/** Today's Dose 글자 로고 (가운데 o는 로고 마크) */
function landingWordmark(size, dark) {
  return `<span class="lp-wordmark lp-wordmark-${size}">
    <span class="lp-wm-today">Today<span class="lp-apos">’</span>s</span><span class="lp-wm-dose">D<img src="${dark ? LP_ASSETS.markLight : LP_ASSETS.markDark}" alt="" class="lp-wm-o">se</span>
  </span>`;
}

/* 큰 글자 로고의 o (파란 반달이 있는 원) */
const LP_BIG_O = '<svg viewBox="0 0 100 100" class="lp-big-o" aria-hidden="true"><path class="lp-o-ring" d="M51.62 3.68 A46.35 46.35 0 0 1 71.56 91.03" fill="none" stroke="#141414" stroke-width="7.3"/><path class="lp-o-arc" pathLength="100" d="M66.89 88.45 A42 42 0 0 1 33.11 88.45" fill="none" stroke="#3B5BA5" stroke-width="16"/><path class="lp-o-ring" d="M28.44 91.03 A46.35 46.35 0 0 1 48.38 3.68" fill="none" stroke="#141414" stroke-width="2.4"/></svg>';

/* 첫 화면 효과용: 글자 하나씩 감싸기 (아래에서 잘려 올라오는 효과) */
function lpChars(text, start) {
  return [...text].map((ch, i) => `<span class="lp-char" style="--i:${start + i}"><span>${ch}</span></span>`).join('');
}
/* 제목 단어 하나씩 감싸기 (흐림에서 또렷하게) */
function lpWords(text) {
  return text.split(' ').map((w, i) => `<span class="lp-word" style="--i:${i}">${w}</span>`).join(' ');
}

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
  const T = LANDING_TEXT[lang];
  const E = escapeLandingHtml;
  document.body.classList.add('is-landing');
  loadLandingFonts();

  const navLinks = (cls) => T.nav.map((label, i) => `<a href="#" class="${cls}" data-lp-scroll="${LP_SECTIONS[i]}">${E(label)}</a>`).join('');
  const googleBtn = (cls) => `<button type="button" class="${cls}" data-action="google-login"><span class="lp-g">G</span>${E(T.cta)}</button>`;

  root.innerHTML = `
  <div class="landing">
    <div class="lp-page">
      <header class="lp-hero" id="lp-top">
        <div class="lp-hero-bloom" aria-hidden="true"><i class="lp-bloom-a"></i><i class="lp-bloom-b"></i><i class="lp-bloom-c"></i><i class="lp-bloom-d"></i></div>
        <div class="lp-hero-lines" aria-hidden="true">
          <i class="lp-line-v" style="--x:20%;--d:.15s"></i><i class="lp-line-v" style="--x:50%;--d:.3s"></i><i class="lp-line-v" style="--x:80%;--d:.45s"></i>
          <i class="lp-line-h" style="--y:96px;--d:0s"></i><i class="lp-line-h lp-line-h-mid" style="--d:.25s"></i><i class="lp-line-h lp-line-h-low" style="--d:.4s"></i>
          <span class="lp-dust"></span>
        </div>
        <div class="lp-hero-glow" aria-hidden="true"></div>
        <div class="lp-topbar">
          <a href="#" class="lp-brand" data-lp-scroll="lp-top" aria-label="${E(T.brandLabel)}">
            <span class="lp-brand-tile"><img src="${LP_ASSETS.markLight}" alt=""></span>
            ${landingWordmark('md', false)}
          </a>
          <nav class="lp-nav">${navLinks('lp-nav-link')}</nav>
          <div class="lp-top-right">
            <div class="lp-lang" role="group" aria-label="${E(T.langLabel)}">
              <button type="button" data-lang="ko" class="${lang === 'ko' ? 'is-on' : ''}" aria-pressed="${lang === 'ko'}">KO</button>
              <button type="button" data-lang="en" class="${lang === 'en' ? 'is-on' : ''}" aria-pressed="${lang === 'en'}">EN</button>
            </div>
            <button type="button" class="lp-login" data-action="google-login">${E(T.login)}<span class="lp-login-arrow">↗</span></button>
          </div>
        </div>

        <h1 class="lp-hero-title"><span class="lp-dot"></span><span>${lpWords(E(T.heroTitle))}</span></h1>
        <div class="lp-wm-wrap">
          <div class="lp-big-wordmark" aria-hidden="true">
            <span class="lp-big-today">${lpChars('Today', 0)}<span class="lp-char" style="--i:5"><span class="lp-apos">’</span></span>${lpChars('s', 6)}</span>
            <span class="lp-big-dose">${lpChars('D', 7)}<span class="lp-char lp-char-o" style="--i:8"><span>${LP_BIG_O}</span></span>${lpChars('se', 9)}</span>
            <img class="lp-hero-mini" src="${LP_ASSETS.hero}" alt="">
          </div>
          <div class="lp-big-wordmark lp-wm-shine" aria-hidden="true">
            <span class="lp-big-today">${lpChars('Today', 0)}<span class="lp-char" style="--i:5"><span class="lp-apos">’</span></span>${lpChars('s', 6)}</span>
            <span class="lp-big-dose">${lpChars('D', 7)}<span class="lp-char lp-char-o" style="--i:8"><span>${LP_BIG_O}</span></span>${lpChars('se', 9)}</span>
          </div>
        </div>

        <div class="lp-hero-row">
          <div class="lp-hero-left">
            <p class="lp-hero-sub">${E(T.heroSub)}</p>
            ${googleBtn('lp-cta')}
            <p class="lp-alert" data-lp-alert hidden></p>
          </div>
          <img class="lp-hero-illus" src="${LP_ASSETS.hero}" alt="${E(T.illusAlt)}">
          <div class="lp-hero-right">
            <div class="lp-today-card">
              <div class="lp-today-head"><b>${E(T.todayCard)}</b><span>${E(T.todayDate)}</span></div>
              <div class="lp-today-bar"><div></div></div>
              ${T.todayItems.map((text, i) => `<div class="lp-today-item ${i < 2 ? 'is-done' : ''}"><span class="lp-check"></span>${E(text)}</div>`).join('')}
            </div>
          </div>
        </div>
      </header>

      <section class="lp-why" id="lp-why">
        <h2 class="lp-h-xl">${E(T.whyTitle)}</h2>
        <div class="lp-why-grid">
          <div class="lp-old">
            <span class="lp-eyebrow">${E(T.oldLabel)}</span>
            <ol>${T.oldSteps.map((text, i) => `<li><span class="lp-mono">${String(i + 1).padStart(2, '0')}</span><span class="lp-old-text">${E(text)}</span></li>`).join('')}</ol>
          </div>
          <div class="lp-new">
            <span class="lp-eyebrow lp-eyebrow-dark">${E(T.newLabel)}</span>
            <div class="lp-new-steps">
              ${T.newSteps.map((text, i) => `<div class="lp-new-step ${i === 2 ? 'is-last' : ''}"><span class="lp-serif-num">${i + 1}</span><span>${E(text)}</span></div>`).join('')}
            </div>
          </div>
        </div>
      </section>

      <section class="lp-calc" id="lp-calc">
        <div class="lp-calc-main">
          <div class="lp-calc-head"><span class="lp-eyebrow">${E(T.calcEyebrow)}</span><h2 class="lp-h-lg">${E(T.calcTitle)}</h2></div>
          <p class="lp-calc-sentence">
            <input type="number" min="0" class="lp-num lp-num-wide" data-lp-amount value="600" aria-label="${E(T.s1)}">${E(T.s1)}
            <input type="number" min="0" max="52" class="lp-num" data-lp-weeks value="6" aria-label="${E(T.s2)}">${E(T.s2)}
            <span class="lp-days-line"><span class="lp-days">${T.days.map((d, i) => `<button type="button" class="lp-day ${i === 6 ? 'is-rest' : ''}" data-lp-day="${i}" aria-pressed="${i === 6}">${E(d)}</button>`).join('')}</span>
            <span class="lp-days-tail">${E(T.s3)}</span></span>
          </p>
          <div class="lp-calc-result">
            <span>${E(T.r1)}</span><span class="lp-per-day" data-lp-perday>17</span><span>${E(T.r2)}</span>
          </div>
        </div>
        <div class="lp-calc-side">
          <img src="${LP_ASSETS.hero}" alt="">
          <span class="lp-bubble" data-lp-bubble></span>
        </div>
      </section>

      <section class="lp-remove" id="lp-remove">
        <h2 class="lp-h-remove">${E(T.removeTitle)}</h2>
        <div class="lp-rm-row lp-rm-left">
          <div class="lp-rm-copy"><span class="lp-rm-word lp-rm-word-1">${E(T.rm1)}</span><p>${E(T.rm1d)}</p></div>
          <div class="lp-card lp-toc-card">
            <span class="lp-card-label">${E(T.photoLabel)}<span class="lp-ai">AI</span></span>
            ${T.toc.map(([name, page]) => `<div class="lp-toc-row"><span>${E(name)}</span><span>${page}</span></div>`).join('')}
          </div>
        </div>
        <div class="lp-rm-row lp-rm-right">
          <div class="lp-card lp-deadline-card">
            <div class="lp-deadline-head"><span>${E(T.deadlineLabel)}</span><b>${E(T.deadlineVal)}</b></div>
            <div class="lp-strip">${Array.from({ length: 14 }, (_, i) => `<span class="${i % 7 === 6 ? 'is-off' : i === 0 ? 'is-today' : ''}"></span>`).join('')}</div>
            <span class="lp-deadline-note">${E(T.deadlineNote)}</span>
          </div>
          <div class="lp-rm-copy"><span class="lp-rm-word lp-rm-word-2">${E(T.rm2)}</span><p>${E(T.rm2d)}</p></div>
        </div>
        <div class="lp-rm-row lp-rm-left lp-rm-last">
          <div class="lp-rm-copy"><span class="lp-rm-word lp-rm-word-3">${E(T.rm3)}</span><p>${E(T.rm3d)}</p></div>
          <div class="lp-replan">
            <div class="lp-replan-old"><span>${E(T.oldPlan)}</span><span>${E(T.oldPlanLine)}</span></div>
            <div class="lp-replan-new"><span class="lp-card-label">${E(T.newPlan)}</span><b>${E(T.newPlanLine)}</b><span class="lp-replan-note">${E(T.newPlanNote)}</span><span class="lp-apply">${E(T.apply)}</span></div>
          </div>
        </div>
      </section>

      <section class="lp-who" id="lp-who">
        <span class="lp-eyebrow">${E(T.whoTitle)}</span>
        <p class="lp-who-sentence">
          ${T.personas.map((p, i) => `<span class="lp-pill"><img src="${LP_ASSETS.personas[i].img}" alt="${E(p[3])}" style="transform:scale(${LP_ASSETS.personas[i].zoom});transform-origin:${LP_ASSETS.personas[i].origin}"></span>${E(T.whoPhrases[i])} `).join('')}<span class="lp-accent">${E(T.whoEnd)}</span>
        </p>
        <div class="lp-who-grid">
          ${T.personas.map(([who, line, tag]) => `<div class="lp-who-item"><b>${E(who)}</b><span>${E(line)}</span><span class="lp-serif-tag">${E(tag)}</span></div>`).join('')}
        </div>
      </section>

      <section class="lp-faq" id="lp-faq">
        <div class="lp-story">
          <span class="lp-story-title">${E(T.storyTitle)}</span>
          <p>${E(T.story)}</p>
        </div>
        <div class="lp-faq-main">
          <h2 class="lp-h-lg">${E(T.faqTitle)}</h2>
          <div class="lp-faq-list">
            ${T.faq.map(([q, a]) => `<details class="lp-faq-item"><summary>${E(q)}<span class="lp-plus" aria-hidden="true">+</span></summary><p>${E(a)}</p></details>`).join('')}
          </div>
        </div>
      </section>

      <section class="lp-end">
        <h2>${E(T.heroTitle)}</h2>
        ${googleBtn('lp-cta lp-cta-light')}
        <footer class="lp-footer">
          <a href="#" class="lp-brand lp-brand-dark" data-lp-scroll="lp-top" aria-label="${E(T.toTop)}">
            <span class="lp-brand-tile lp-brand-tile-light"><img src="${LP_ASSETS.markDark}" alt=""></span>
            ${landingWordmark('sm', true)}
          </a>
          <span class="lp-footer-nav">${navLinks('')}</span>
        </footer>
      </section>
    </div>
  </div>`;
  const landing = root.querySelector('.landing');
  initLandingHeroFx(landing);

  // 메뉴: 주소(#)를 바꾸지 않고 해당 칸으로 스크롤 (앱이 # 주소를 화면 이동에 쓴다)
  landing.addEventListener('click', (e) => {
    const link = e.target.closest('[data-lp-scroll]');
    if (!link) return;
    e.preventDefault();
    const target = landing.querySelector(`#${link.getAttribute('data-lp-scroll')}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 계산기: 전체 ÷ (주 × 공부하는 요일 수), 올림
  const amountEl = landing.querySelector('[data-lp-amount]');
  const weeksEl = landing.querySelector('[data-lp-weeks]');
  const rest = [false, false, false, false, false, false, true];
  const renderCalc = () => {
    const amount = Math.max(0, Math.floor(Number(amountEl.value)) || 0);
    const weeks = Math.min(52, Math.max(0, Math.floor(Number(weeksEl.value)) || 0));
    const studyDays = weeks * (7 - rest.filter(Boolean).length);
    const perDay = studyDays > 0 && amount > 0 ? Math.ceil(amount / studyDays) : '—';
    landing.querySelector('[data-lp-perday]').textContent = perDay;
    landing.querySelector('[data-lp-bubble]').textContent = T.bubble.replace('{n}', perDay);
    landing.querySelectorAll('[data-lp-day]').forEach((btn) => {
      const on = rest[Number(btn.getAttribute('data-lp-day'))];
      btn.classList.toggle('is-rest', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };
  amountEl.addEventListener('input', renderCalc);
  weeksEl.addEventListener('input', renderCalc);
  landing.querySelectorAll('[data-lp-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-lp-day'));
      rest[i] = !rest[i];
      renderCalc();
    });
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

  // Google 로그인 (상단·첫 화면·맨 아래 버튼 공통)
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

  renderCalc();
}

function escapeLandingHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}


/* =========================================================================
 * 첫 화면 효과 (21st 참고 · 순수 JS/CSS, React·애니메이션 라이브러리 없음)
 *  - 등장: 큰 글자 아래에서 잘려 올라오기 · 제목 단어 흐림→또렷 · 나머지 차례로 떠오르기 · o의 파란 반달 그리기
 *  - 오늘 분량 카드: 항목이 하나씩 체크되고 막대가 차오름
 *  - 마우스: 손그림·카드·큰 글자가 깊이를 달리해 살짝 움직임(시차) · 배경 점무늬가 커서를 따라 비침 · 시작 버튼이 커서를 따라옴
 *  - 스크롤: 큰 글자가 위로 떠오르며 옅어짐
 *  움직임 줄이기 설정이면 아무 효과도 넣지 않는다.
 * ========================================================================= */
function initLandingHeroFx(landing) {
  const hero = landing && landing.querySelector('.lp-hero');
  if (!hero) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  hero.classList.add('lp-fx');

  // 오늘 분량 카드: 처음엔 비워 두었다가 하나씩 체크
  const items = [...hero.querySelectorAll('.lp-today-item')];
  const doneIdx = items.map((el, i) => (el.classList.contains('is-done') ? i : -1)).filter((i) => i >= 0);
  items.forEach((el) => el.classList.remove('is-done'));
  const bar = hero.querySelector('.lp-today-bar div');
  if (bar) bar.style.width = '0%';

  const start = () => requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-in')));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(start);
  } else start();

  const timers = [];
  doneIdx.forEach((i, n) => {
    timers.push(setTimeout(() => {
      if (!hero.isConnected) return;
      items[i].classList.add('is-done');
      if (bar) bar.style.width = `${Math.round(((n + 1) / items.length) * 100 * 0.93)}%`;
    }, 1900 + n * 750));
  });

  // 마우스 시차 · 점무늬 빛
  let raf = 0;
  let px = 0;
  let py = 0;
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = hero.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width) * 2 - 1;
    py = ((e.clientY - r.top) / r.height) * 2 - 1;
    hero.style.setProperty('--gx', `${e.clientX - r.left}px`);
    hero.style.setProperty('--gy', `${e.clientY - r.top}px`);
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      hero.style.setProperty('--px', px.toFixed(3));
      hero.style.setProperty('--py', py.toFixed(3));
    });
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--px', '0');
    hero.style.setProperty('--py', '0');
  });

  // 시작 버튼: 커서를 살짝 따라온다
  const cta = hero.querySelector('.lp-cta');
  if (cta) {
    cta.addEventListener('pointermove', (e) => {
      const r = cta.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      cta.style.transform = `translate(${(dx * 10).toFixed(1)}px, ${(dy * 8).toFixed(1)}px)`;
    });
    cta.addEventListener('pointerleave', () => { cta.style.transform = ''; });
  }

  // 스크롤: 첫 화면을 지나는 만큼 0 → 1
  let sraf = 0;
  const onScroll = () => {
    if (!hero.isConnected) { window.removeEventListener('scroll', onScroll); timers.forEach(clearTimeout); return; }
    if (sraf) return;
    sraf = requestAnimationFrame(() => {
      sraf = 0;
      const h = hero.offsetHeight || window.innerHeight;
      const sy = Math.min(1, Math.max(0, window.scrollY / h));
      hero.style.setProperty('--sy', sy.toFixed(3));
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}
