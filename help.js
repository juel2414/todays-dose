/* =========================================================================
 * 오늘분량 — 사용 설명서 (회원용)
 *   회원이 실제로 쓰는 순서대로 단계별 안내. 화면 그림(help/*.jpg)의 빨간 번호와 설명 번호가 같다.
 *   그림은 예시 데이터로 찍은 한국어 화면. 글은 한국어/영어를 함께 두고 currentLang에 맞춰 보여 준다.
 * ========================================================================= */

const GUIDE = [
  {
    id: 'login',
    title: { ko: '로그인하기', en: 'Sign in' },
    intro: {
      ko: '처음 들어오면 오늘분량 소개 화면이 나와요. 구글 계정으로 로그인하면 바로 시작할 수 있어요.',
      en: 'The first screen introduces Today’s Dose. Sign in with your Google account to start.',
    },
    shots: [{
      img: 'login',
      steps: [
        { ko: '<b>Google 계정으로 시작하기</b>를 누르고 구글 계정을 골라요.', en: 'Click <b>Continue with Google</b> and choose your Google account.' },
      ],
    }],
    tip: {
      ko: '같은 구글 계정으로 로그인하면 휴대폰·컴퓨터 어디서든 같은 계획이 보여요.',
      en: 'Sign in with the same Google account to see the same plans on your phone or computer.',
    },
  },
  {
    id: 'join',
    title: { ko: '그룹에 참여하기', en: 'Join your group' },
    intro: {
      ko: '리더가 보내 준 <b>초대 링크</b>를 누르고 로그인하면 아래 화면이 나와요.',
      en: 'Open the <b>invite link</b> your leader sent and sign in. You’ll see this screen.',
    },
    shots: [{
      img: 'join',
      steps: [
        { ko: '그룹 이름과 리더를 확인하고 <b>참여하기</b>를 눌러요.', en: 'Check the group name and leader, then click <b>Join</b>.' },
      ],
    }],
    tip: {
      ko: '링크 대신 <b>6자리 초대 코드</b>만 받았다면, 상단 <b>그룹</b> 메뉴 → <b>초대 코드로 참여</b>에 입력하세요.',
      en: 'Got a <b>6-character invite code</b> instead? Go to <b>Groups</b> at the top → <b>Join with an invite code</b>.',
    },
  },
  {
    id: 'required',
    title: { ko: '필독서·필수 시청 계획 세우기', en: 'Plan required books and lectures' },
    intro: {
      ko: '그룹에 참여하면 첫 화면 위쪽에 리더가 정한 <b>필독서</b>(책)와 <b>필수 시청</b>(강의)이 나와요.',
      en: 'After joining, <b>Required</b> books and <b>Required viewing</b> lectures from your leader appear at the top of the dashboard.',
    },
    shots: [
      {
        img: 'inbox',
        steps: [
          { ko: '계획할 책의 <b>계획 세우기</b>를 눌러요.', en: 'Click <b>Make a plan</b> on the book you want to plan.' },
        ],
      },
      {
        img: 'groupform',
        steps: [
          { ko: '<b>시작일</b>을 확인해요. 보통 오늘로 되어 있어요.', en: 'Check the <b>start date</b> (today by default).' },
          { ko: '<b>마감일</b>을 골라요. <b>1주·2주·4주 동안</b> 버튼을 누르면 바로 정해져요. 오른쪽에 하루 평균 분량이 보여요.', en: 'Pick the <b>due date</b>, or tap <b>1/2/4 weeks</b> to set it quickly. The daily average appears on the right.' },
          { ko: '맨 아래 <b>목표 추가</b>를 누르면 계획이 만들어져요.', en: 'Click <b>Add goal</b> at the bottom to create the plan.' },
        ],
      },
    ],
    tip: {
      ko: '책 제목과 목차는 리더가 정해 두어서 회색으로 잠겨 있어요. 날짜와 <a href="#guide-rest">쉬는 날</a>만 정하면 돼요.',
      en: 'The title and contents are set by the leader and locked (grey). Just choose your dates and <a href="#guide-rest">days off</a>.',
    },
  },
  {
    id: 'today',
    title: { ko: '오늘 할 분량 확인하기', en: 'Check today’s amount' },
    intro: {
      ko: '첫 화면의 목표 카드에서 매일 할 분량을 바로 볼 수 있어요.',
      en: 'Each goal card on the dashboard shows what to do today.',
    },
    shots: [{
      img: 'today',
      steps: [
        { ko: '<b>계획대로</b> / <b>○페이지 밀림</b>(빨강) / <b>○ 앞섬</b>(초록)으로 지금 상태를 알려 줘요.', en: 'Shows your status: <b>On track</b> / <b>… behind</b> (red) / <b>… ahead</b> (green).' },
        { ko: '<b>오늘 할 분량</b>이에요. 다 하면 <b>✓ 완료</b>가 붙어요. 카드를 누르면 자세한 화면으로 가요.', en: '<b>Today’s amount</b>. It shows <b>✓ Done</b> when finished. Click the card for details.' },
      ],
    }],
  },
  {
    id: 'record',
    title: { ko: '읽은 만큼 기록하기', en: 'Record what you read' },
    intro: {
      ko: '카드를 눌러 들어간 화면에서 기록해요. 조금 더 읽었으면 그만큼 적으면 돼요.',
      en: 'Record on the goal page. Read a bit extra? Just enter how far you got.',
    },
    shots: [{
      img: 'record',
      steps: [
        { ko: '<b>마지막으로 읽은 페이지</b>를 적어요. 아래 <b>완료한 챕터</b>에서 챕터를 골라도 돼요.', en: 'Enter the <b>Last page read</b>, or choose the <b>last chapter finished</b> below.' },
        { ko: '<b>진도 기록</b>을 누르면 저장돼요.', en: 'Click <b>Log progress</b> to save.' },
        { ko: '또는 <b>계획표</b>에서 오늘 줄의 <b>체크박스</b>를 누르면 그날 분량까지 한 번에 기록돼요.', en: 'Or tick today’s <b>checkbox</b> in the <b>Plan</b> to record up to that day.' },
      ],
    }],
    tip: {
      ko: '강의·기타는 완료한 개수를, 성경 통독은 어디까지 읽었는지(권·장)를 골라요. 오른쪽 위에 <b>저장됨</b>이 보이면 저장이 끝난 거예요.',
      en: 'For lectures/other, enter how many are done; for Bible reading, pick the book and chapter. <b>Saved</b> at the top right means it’s stored.',
    },
  },
  {
    id: 'behind',
    title: { ko: '밀렸거나 앞섰을 때', en: 'When you’re behind or ahead' },
    intro: {
      ko: '<b>밀림</b>은 그날이 지나고 다음 날부터 표시돼요. 오늘 분량은 오늘 안에 하면 괜찮아요.',
      en: '<b>Behind</b> shows only from the next day — today’s amount can still be done today.',
    },
    shots: [{
      img: 'behind',
      steps: [
        { ko: '얼마나 밀렸는지, 남은 날 동안 하루 얼마씩 하면 되는지 알려 줘요.', en: 'Tells you how far behind you are and how much a day catches you up.' },
        { ko: '<b>재분배</b>: 오늘부터 마감일까지 <b>남은 분량을 다시 고르게</b> 나눠요. 적용 전에 미리보기로 먼저 보여 줘요.', en: '<b>Redistribute</b>: re-splits the <b>remaining amount</b> evenly from today. You’ll see a preview first.' },
        { ko: '<b>마감일 변경</b>: 마감일을 늦추거나 당기고, 남은 분량을 새 기간에 맞게 나눠요.', en: '<b>Change due date</b>: move the deadline and re-split the rest.' },
      ],
    }],
    tip: {
      ko: '처음 세운 원래 계획은 보관돼서 나중에 비교할 수 있어요. 앞서 있을 때도 재분배로 남은 날을 가볍게 할 수 있어요.',
      en: 'Your original plan is kept for comparison. When ahead, you can redistribute to lighten the remaining days.',
    },
  },
  {
    id: 'views',
    title: { ko: '계획표를 달력·이미지로 보기', en: 'Calendar and image views' },
    intro: {
      ko: '자세한 화면 아래 <b>계획표</b>에 날짜마다 읽을 범위가 나와요.',
      en: 'The <b>Plan</b> at the bottom of the goal page lists what to read each day.',
    },
    shots: [{
      img: 'views',
      steps: [
        { ko: '<b>달력</b>을 누르면 한 달 달력으로 보여요. 달력 칸의 체크박스로도 기록할 수 있어요.', en: 'Click <b>Calendar</b> for a monthly view; you can tick days there too.' },
        { ko: '<b>이미지로 내보내기</b>를 누르면 진도와 날짜별 분량을 한 장 이미지로 만들어 저장·공유할 수 있어요.', en: 'Click <b>Export as image</b> to save or share a one-page image of your plan.' },
      ],
    }],
    tip: {
      ko: '<b>분량 직접 조정</b>을 누르면 특정 날의 분량을 바꿀 수 있고, 나머지 날은 자동으로 다시 나뉘어요.',
      en: '<b>Adjust amounts</b> lets you change a specific day; the other days re-split automatically.',
    },
  },
  {
    id: 'book',
    title: { ko: '내 책 목표 직접 만들기', en: 'Create your own book goal' },
    intro: {
      ko: '그룹 필독서 말고 개인적으로 읽는 책도 계획할 수 있어요. 첫 화면 오른쪽 위 <b>+ 새 목표 추가</b>를 누르세요.',
      en: 'You can plan personal books too. Click <b>+ New goal</b> at the top right of the dashboard.',
    },
    shots: [
      {
        img: 'newgoal',
        steps: [
          { ko: '종류에서 <b>책</b>을 골라요.', en: 'Choose <b>Book</b>.' },
          { ko: '<b>책 제목</b>을 적어요.', en: 'Enter the <b>title</b>.' },
          { ko: '<b>마감일</b>을 정해요. (<b>하루 분량으로 정하기</b>를 고르면 하루 몇 페이지씩 읽을지로 끝나는 날을 계산해요.)', en: 'Set the <b>due date</b>. (Choose <b>By daily amount</b> to calculate the finish date from pages per day.)' },
        ],
      },
      {
        img: 'chapters',
        steps: [
          { ko: '<b>목차 사진 올리기</b>: 책 목차 페이지를 찍어 올리면 <b>AI가 챕터 이름과 시작 페이지</b>를 채워요. 여러 장이면 함께 고르세요.', en: '<b>Upload contents photo</b>: AI fills in <b>chapter names and start pages</b> from a photo of the contents. Select several photos for long contents.' },
          { ko: '못 읽은 칸은 <b>노란색</b>이에요. 직접 넣고 <b>Enter</b>를 누르면 다음 빈칸으로 넘어가요.', en: 'Boxes it couldn’t read are <b>yellow</b> — type them in and press <b>Enter</b> to jump to the next.' },
          { ko: '<b>마지막 페이지</b>를 확인하고 맨 아래 <b>목표 추가</b>를 눌러요.', en: 'Check the <b>last page</b>, then click <b>Add goal</b> at the bottom.' },
        ],
      },
    ],
    tip: {
      ko: '이미 읽기 시작한 책이면 <b>마지막으로 읽은 페이지</b>를 적어 주세요. 그다음부터 계획해요. AI가 잘못 읽을 수 있으니 저장 전에 목차와 한 번 비교해 주세요.',
      en: 'Already started? Enter the <b>last page read</b> and the plan starts after it. AI can misread, so compare with the contents before saving.',
    },
  },
  {
    id: 'lecture',
    title: { ko: '강의 목표 만들기', en: 'Create a lecture goal' },
    intro: {
      ko: '온라인 강의처럼 차시가 있는 것도 계획할 수 있어요.',
      en: 'Plan courses with lessons, like online lectures.',
    },
    shots: [{
      img: 'lecture',
      steps: [
        { ko: '종류에서 <b>강의</b>를 골라요.', en: 'Choose <b>Lecture</b>.' },
        { ko: '<b>강의 목록 사진 올리기</b>: 강의 사이트의 차시 목록을 캡처해 올리면 <b>AI가 강의 제목을 순서대로</b> 채워요.', en: '<b>Upload lesson list</b>: upload a screenshot of the lesson list and <b>AI fills in the titles in order</b>.' },
        { ko: '채워진 목록을 확인해요. 직접 한 줄에 하나씩 적어도 돼요.', en: 'Check the list — or type one title per line yourself.' },
      ],
    }],
    tip: {
      ko: '<b>성경 통독</b>은 통독 범위(성경 전체·구약·신약·모세오경 등)를, <b>기타</b>는 숙제·문제집처럼 단위 이름과 전체 개수를 정하면 돼요.',
      en: 'For <b>Bible Reading</b>, pick a range (whole Bible, OT, NT, Pentateuch…). For <b>Other</b> (homework, workbooks), set a unit name and total count.',
    },
  },
  {
    id: 'rest',
    title: { ko: '쉬는 날·여유 있는 날 정하기', en: 'Days off and extra days' },
    intro: {
      ko: '목표를 만들거나 <b>수정</b>할 때 아래 칸에서 정해요. 정한 날에 맞춰 분량이 다시 나뉘어요.',
      en: 'Set these when creating or <b>editing</b> a goal. Amounts are re-split around them.',
    },
    shots: [{
      img: 'rest',
      steps: [
        { ko: '<b>쉬는 요일</b>: 매주 빠지는 요일(예: 주일)을 누르면 그날엔 분량이 없어요.', en: '<b>Rest weekdays</b>: tap weekdays you always skip (e.g. Sunday).' },
        { ko: '<b>쉬는 날</b>: 수련회·여행 같은 날짜와 메모를 넣고 <b>+ 추가</b>를 눌러요.', en: '<b>Rest days</b>: enter a date (retreat, trip…) with a note and click <b>+ Add</b>.' },
        { ko: '<b>여유 있는 날</b>: 시간이 많은 날을 고르고 평소의 1.5·2·3배를 정해 <b>+ 추가</b>를 눌러요.', en: '<b>Extra days</b>: pick a day with more time, choose 1.5×/2×/3×, and click <b>+ Add</b>.' },
      ],
    }],
  },
  {
    id: 'menu',
    title: { ko: '위쪽 메뉴', en: 'Top menu' },
    shots: [{
      img: 'topbar',
      steps: [
        { ko: '<b>그룹</b>: 내 그룹 보기, 초대 코드로 참여, 그룹 나가기.', en: '<b>Groups</b>: your groups, join with a code, leave a group.' },
        { ko: '<b>도움말</b>: 지금 보고 있는 설명서예요.', en: '<b>Help</b>: this guide.' },
        { ko: '<b>한국어 / English</b>: 화면 언어를 바꿔요. 계정에 저장돼요.', en: '<b>한국어 / English</b>: switch the language; it’s saved to your account.' },
      ],
    }],
  },
];

const GUIDE_FAQ = [
  {
    q: { ko: '리더는 내 무엇을 볼 수 있나요?', en: 'What can my leader see?' },
    a: {
      ko: '그룹의 필독서·필수 시청으로 세운 계획의 <b>진도만</b> 볼 수 있어요. 내가 따로 만든 개인 목표는 보이지 않아요. 그룹 화면의 <b>그룹 나가기</b>로 언제든 나갈 수 있고, 이미 세운 계획은 내 개인 목표로 남아요.',
      en: 'Only the <b>progress</b> of plans made from the group’s required books and lectures. Your personal goals are never shown. You can <b>Leave group</b> anytime; your plans stay as personal goals.',
    },
  },
  {
    q: { ko: '"내용 변경됨"이 붙었어요', en: 'A goal says “Updated”' },
    a: {
      ko: '리더가 필독서의 목차나 강의 목록을 고쳤다는 뜻이에요. 목표를 열어 <b>적용 미리보기</b>를 누르고 확인하면, 내 진도와 날짜는 그대로 두고 새 내용으로 다시 나눠요.',
      en: 'Your leader changed the contents. Open the goal, click <b>Preview changes</b>, and apply — your progress and dates are kept.',
    },
  },
  {
    q: { ko: '목표를 고치거나 지우려면요?', en: 'How do I edit or delete a goal?' },
    a: {
      ko: '목표 화면 오른쪽 위 <b>수정</b> 또는 <b>삭제</b>를 눌러요. 진행 중인 목표를 고치면 오늘부터 남은 분량을 다시 나누고 미리보기를 먼저 보여 줘요. 지운 목표는 되돌릴 수 없어요.',
      en: 'Use <b>Edit</b> or <b>Delete</b> at the top right of the goal page. Edits to a goal in progress re-split the rest from today, with a preview. Deleted goals can’t be restored.',
    },
  },
  {
    q: { ko: '내가 만든 책이 도서관에 등록되나요?', en: 'Is my book added to the library?' },
    a: {
      ko: '새 책 목표를 만들면 책 정보(제목·저자·목차)만 관리자 검토용으로 제출돼요. 내 진도나 날짜는 제출되지 않고, 반려돼도 내 계획은 그대로 쓸 수 있어요.',
      en: 'Only the book details (title, author, contents) are sent for admin review — not your progress or dates. If declined, your plan stays as it is.',
    },
  },
];

function helpText(obj) {
  if (!obj) return '';
  return (currentLang === 'en' ? obj.en : obj.ko) || obj.ko;
}

function renderHelp(root) {
  const toc = GUIDE.map((g, i) => `<a href="#guide-${g.id}"><span>${i + 1}</span>${escapeHtml(helpText(g.title))}</a>`).join('');
  const sections = GUIDE.map((g, i) => `
    <section class="guide-section" id="guide-${g.id}">
      <h2><span class="guide-no">${i + 1}</span>${escapeHtml(helpText(g.title))}</h2>
      ${g.intro ? `<p class="guide-intro">${helpText(g.intro)}</p>` : ''}
      ${g.shots.map((s) => `
        <figure class="guide-shot">
          <img src="help/${s.img}.jpg" alt="" loading="lazy">
        </figure>
        <ol class="guide-steps">
          ${s.steps.map((st) => `<li>${helpText(st)}</li>`).join('')}
        </ol>`).join('')}
      ${g.tip ? `<p class="guide-tip">💡 ${helpText(g.tip)}</p>` : ''}
    </section>`).join('');
  const faq = GUIDE_FAQ.map((f) => `
    <div class="guide-faq-item">
      <h3>${escapeHtml(helpText(f.q))}</h3>
      <p>${helpText(f.a)}</p>
    </div>`).join('');

  root.innerHTML = `
    <div id="help-page" class="guide">
      <header class="page-header">
        <div>
          <a class="back-link" href="#/">← ${t('내 계획')}</a>
          <h1>${t('오늘분량 사용 설명서')}</h1>
          <p class="muted">${t('처음이라면 1번부터 차례로 따라 해 보세요. 그림의 빨간 번호를 순서대로 누르면 돼요.')}</p>
        </div>
      </header>
      <nav class="guide-toc" aria-label="${t('목차')}">${toc}<a href="#guide-faq"><span>?</span>${t('자주 묻는 질문')}</a></nav>
      ${sections}
      <section class="guide-section" id="guide-faq">
        <h2><span class="guide-no">?</span>${t('자주 묻는 질문')}</h2>
        ${faq}
      </section>
      ${currentLang === 'en' ? `<p class="muted small">${t('설명서의 화면 그림은 한국어 화면이에요.')}</p>` : ''}
    </div>`;

  // 목차 링크: 주소(#/help)는 그대로 두고 해당 위치로만 이동
  root.querySelector('#help-page').addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#guide-"]');
    if (!a) return;
    e.preventDefault();
    const target = root.querySelector(a.getAttribute('href'));
    if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
  });
}
