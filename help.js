/* =========================================================================
 * 오늘분량 — 사용 설명서 (회원용)
 *   회원이 실제로 쓰는 순서대로 단계별 안내. 중점: "새 목표 추가하기"와 "그룹"(참여자 · 리더).
 *   화면 그림(help/*.jpg)의 빨간 번호와 설명 번호가 같다. 그림은 예시 데이터로 찍은 한국어 화면.
 *   글은 한국어/영어를 함께 두고 currentLang에 맞춰 보여 준다.
 * ========================================================================= */

const GUIDE_PARTS = [
  { id: 'start', title: { ko: '시작하기', en: 'Getting started' } },
  { id: 'goal', title: { ko: '새 목표 추가하기', en: 'Adding a goal' } },
  { id: 'daily', title: { ko: '매일 쓰기', en: 'Every day' } },
  { id: 'member', title: { ko: '그룹 — 참여하는 분', en: 'Groups — members' } },
  { id: 'leader', title: { ko: '그룹 — 만들고 이끄는 분(리더)', en: 'Groups — leaders' } },
  { id: 'etc', title: { ko: '그 밖에', en: 'More' } },
];

const GUIDE = [
  /* ----- 시작하기 ----- */
  {
    id: 'login', part: 'start',
    title: { ko: '로그인하기', en: 'Sign in' },
    intro: {
      ko: '처음 들어오면 오늘분량 소개 화면이 나와요. 구글 계정으로 로그인하면 바로 시작할 수 있어요.',
      en: 'The first screen introduces Today’s Dose. Sign in with your Google account to start.',
    },
    shots: [{
      img: 'login',
      steps: [{ ko: '<b>Google 계정으로 시작하기</b>를 누르고 구글 계정을 골라요.', en: 'Click <b>Continue with Google</b> and choose your account.' }],
    }],
    tip: {
      ko: '같은 구글 계정으로 로그인하면 휴대폰·컴퓨터 어디서든 같은 계획이 보여요.',
      en: 'Use the same Google account to see the same plans on any device.',
    },
  },

  /* ----- 새 목표 추가하기 ----- */
  {
    id: 'new', part: 'goal',
    title: { ko: '새 목표를 만드는 순서', en: 'Creating a goal, step by step' },
    intro: {
      ko: '책·강의·성경 통독·숙제처럼 끝내고 싶은 것을 목표로 만들어요. 화면 위에서부터 차례로 채우면 돼요.',
      en: 'Turn anything you want to finish — a book, lectures, Bible reading, homework — into a goal. Fill in the screen from top to bottom.',
    },
    shots: [
      {
        sub: { ko: '① 새 목표 화면 열기', en: '① Open the new goal screen' },
        img: 'newbtn',
        steps: [{ ko: '첫 화면 오른쪽 위 <b>+ 새 목표 추가</b>를 눌러요.', en: 'Click <b>+ New goal</b> at the top right of the dashboard.' }],
      },
      {
        sub: { ko: '② 종류·이름·기간 정하기', en: '② Type, name and dates' },
        img: 'formtop',
        steps: [
          { ko: '<b>종류</b>를 골라요: 책 / 강의 / 성경 통독 / 기타(숙제·문제집·단어 등).', en: 'Choose the <b>type</b>: Book / Lecture / Bible Reading / Other (homework, workbooks, vocabulary…).' },
          { ko: '<b>이름</b>을 적어요. (책이면 책 제목)', en: 'Enter the <b>name</b> (the title for a book).' },
          { ko: '<b>시작일</b>: 오늘로 되어 있어요. 나중에 시작하려면 바꿔요.', en: '<b>Start date</b>: today by default.' },
          { ko: '<b>마감일</b>: 언제까지 끝낼지 골라요.', en: '<b>Due date</b>: when you want to finish.' },
          { ko: '날짜 고르기가 번거로우면 <b>1주·2주·4주·6주·8주 동안</b> 버튼으로 바로 정해요.', en: 'Or tap <b>1/2/4/6/8 weeks</b> to set it quickly.' },
          { ko: '<b>공부하는 날 하루 약 ○페이지</b>가 보여요. 너무 많으면 마감일을 늘려 보세요.', en: 'The <b>daily average</b> appears here — too much? Push the due date back.' },
        ],
      },
      {
        sub: { ko: '하루 분량으로 정하고 싶다면', en: 'Prefer a daily amount?' },
        img: 'pace',
        steps: [
          { ko: '<b>하루 분량으로 정하기</b>를 골라요.', en: 'Choose <b>By daily amount</b>.' },
          { ko: '하루에 할 양(예: 20페이지)을 적어요.', en: 'Enter how much per day (e.g. 20 pages).' },
          { ko: '<b>언제 끝나는지</b> 계산해서 마감일을 자동으로 채워요.', en: 'The <b>finish date</b> is calculated and filled in for you.' },
        ],
      },
      {
        sub: { ko: '③ 쉬는 날·여유 있는 날 (선택)', en: '③ Days off and extra days (optional)' },
        img: 'rest',
        steps: [
          { ko: '<b>쉬는 요일</b>: 매주 빠지는 요일(예: 주일)을 누르면 그날엔 분량을 주지 않아요.', en: '<b>Rest weekdays</b>: tap days you always skip (e.g. Sunday).' },
          { ko: '<b>쉬는 날</b>: 수련회·여행 같은 날짜와 메모를 넣고 <b>+ 추가</b>를 눌러요.', en: '<b>Rest days</b>: enter a date (retreat, trip…) with a note, then <b>+ Add</b>.' },
          { ko: '<b>여유 있는 날</b>: 시간이 많은 날을 골라 평소의 1.5·2·3배를 정하고 <b>+ 추가</b>를 눌러요.', en: '<b>Extra days</b>: pick a day with more time, choose 1.5×/2×/3×, then <b>+ Add</b>.' },
        ],
      },
      {
        sub: { ko: '④ 내용 채우기 — 책: 목차', en: '④ Contents — Book: chapters' },
        img: 'chapters',
        steps: [
          { ko: '<b>목차 사진 올리기</b>: 책의 목차 페이지를 찍어 올리면 <b>AI가 챕터 이름과 시작 페이지</b>를 채워요. 여러 장이면 함께 고르세요.', en: '<b>Upload contents photo</b>: AI fills in <b>chapter names and start pages</b>. Select several photos for long contents.' },
          { ko: 'AI가 못 읽은 칸은 <b>노란색</b>이에요. 직접 넣고 <b>Enter</b>를 누르면 다음 빈칸으로 넘어가요.', en: 'Yellow boxes weren’t read — type them in; <b>Enter</b> jumps to the next.' },
          { ko: '<b>마지막 페이지</b>(본문이 끝나는 쪽)를 확인해요.', en: 'Check the <b>last page</b>.' },
        ],
      },
      {
        sub: { ko: '④ 내용 채우기 — 강의: 강의 목록', en: '④ Contents — Lecture: lesson list' },
        img: 'lecture',
        steps: [
          { ko: '종류에서 <b>강의</b>를 고르면 강의 목록 칸이 나와요.', en: 'Choosing <b>Lecture</b> shows the lesson list.' },
          { ko: '<b>강의 목록 사진 올리기</b>: 강의 사이트의 차시 목록을 캡처해 올리면 <b>AI가 제목을 순서대로</b> 채워요.', en: '<b>Upload lesson list</b>: AI fills in the titles in order from a screenshot.' },
          { ko: '목록을 확인해요. 한 줄에 하나씩 직접 적어도 돼요.', en: 'Check the list — or type one title per line.' },
        ],
      },
      {
        sub: { ko: '④ 내용 채우기 — 성경 통독: 범위', en: '④ Contents — Bible Reading: range' },
        img: 'bible',
        steps: [
          { ko: '<b>성경 전체·구약·신약·모세오경</b> 같은 버튼으로 범위를 바로 골라요.', en: 'Pick a range quickly: <b>Whole Bible, Old/New Testament, Pentateuch</b>…' },
          { ko: '또는 시작 권과 끝 권을 직접 골라요. 분량은 <b>장</b> 단위로 나눠요.', en: 'Or choose the first and last book. Amounts are split by <b>chapter</b>.' },
        ],
      },
      {
        sub: { ko: '④ 내용 채우기 — 기타: 숙제·문제집 등', en: '④ Contents — Other: homework, workbooks…' },
        img: 'custom',
        steps: [
          { ko: '<b>단위 이름</b>: 문제·과제·단원·단어처럼 셀 단위를 적거나 버튼으로 골라요.', en: '<b>Unit name</b>: what you count (problems, tasks, units, words…).' },
          { ko: '<b>전체 개수</b>: 예) 150문제.', en: '<b>Total count</b>: e.g. 150 problems.' },
          { ko: '<b>항목 목록</b>(선택): 한 줄에 하나씩 적으면 계획표에 항목 이름이 나와요.', en: '<b>Item list</b> (optional): one per line; names appear in the plan.' },
        ],
      },
      {
        sub: { ko: '⑤ 저장하기', en: '⑤ Save' },
        img: 'submit',
        steps: [{ ko: '맨 아래 <b>목표 추가</b>를 누르면 날짜별 계획이 만들어지고 첫 화면에 카드가 생겨요.', en: 'Click <b>Add goal</b> at the bottom — your day-by-day plan is created and a card appears on the dashboard.' }],
      },
    ],
    tip: {
      ko: '이미 읽기 시작한 책이면 저장 전에 <b>마지막으로 읽은 페이지</b>를 적어 주세요. 그다음부터 계획해요. 날짜·쉬는 날·목차는 나중에 목표 화면의 <b>수정</b>에서 언제든 바꿀 수 있어요.',
      en: 'Already started? Enter the <b>Last page read</b> before saving. You can change dates, days off and chapters later with <b>Edit</b>.',
    },
  },

  /* ----- 매일 쓰기 ----- */
  {
    id: 'today', part: 'daily',
    title: { ko: '오늘 할 분량 확인하기', en: 'Check today’s amount' },
    shots: [{
      img: 'today',
      steps: [
        { ko: '오늘 분량을 다 했으면 <b>동그라미</b>를 눌러요. 그날 분량까지 한 번에 기록되고, 다시 누르면 취소돼요.', en: 'Done with today’s dose? Click the <b>circle</b>. It records progress up to today’s amount; click again to undo.' },
        { ko: '<b>오늘 할 분량</b>이에요. 목표 이름을 누르면 자세한 화면으로 가요.', en: '<b>Today’s amount</b>. Click the goal name for details.' },
      ],
    }],
    tip: { ko: '아래 <b>목표별 진행</b>에서 목표마다 <b>계획대로</b> / <b>○페이지 밀림</b> / <b>○ 앞섬</b>과 진행률을 볼 수 있어요.', en: 'Under <b>Progress by goal</b> you can see each goal’s status (<b>On track</b> / <b>… behind</b> / <b>… ahead</b>) and progress.' },
  },
  {
    id: 'record', part: 'daily',
    title: { ko: '읽은 만큼 기록하기', en: 'Record what you read' },
    intro: { ko: '카드를 눌러 들어간 화면에서 기록해요. 조금 더 읽었으면 그만큼 적으면 돼요.', en: 'Record on the goal page. Read extra? Just enter how far you got.' },
    shots: [{
      img: 'record',
      steps: [
        { ko: '<b>마지막으로 읽은 페이지</b>를 적어요. <b>완료한 챕터</b> 탭으로 바꿔 챕터를 골라도 돼요.', en: 'Enter the <b>Last page read</b>, or switch to <b>Chapter finished</b> and pick a chapter.' },
        { ko: '<b>진도 기록</b>을 누르면 저장돼요.', en: 'Click <b>Log progress</b>.' },
        { ko: '또는 <b>계획표</b>에서 오늘 줄의 <b>동그라미</b>를 누르면 그날 분량까지 한 번에 기록돼요.', en: 'Or click today’s <b>circle</b> in the <b>Schedule</b>.' },
      ],
    }],
    tip: { ko: '강의·기타는 완료한 개수를, 성경 통독은 어디까지 읽었는지(권·장)를 골라요.', en: 'For lectures/other enter how many are done; for Bible reading pick the book and chapter.' },
  },
  {
    id: 'behind', part: 'daily',
    title: { ko: '밀렸거나 앞섰을 때', en: 'Behind or ahead' },
    intro: { ko: '<b>밀림</b>은 그날이 지나고 다음 날부터 표시돼요. 오늘 분량은 오늘 안에 하면 괜찮아요.', en: '<b>Behind</b> shows only from the next day.' },
    shots: [{
      img: 'behind',
      steps: [
        { ko: '얼마나 밀렸는지, 남은 날 동안 하루 얼마씩 하면 되는지 알려 줘요.', en: 'How far behind you are and how much a day catches you up.' },
        { ko: '<b>재분배</b>: 오늘부터 마감일까지 <b>남은 분량을 다시 고르게</b> 나눠요. 미리보기를 먼저 보여 줘요.', en: '<b>Redistribute</b>: re-splits the <b>remaining amount</b> from today, with a preview.' },
        { ko: '<b>마감일 변경</b>: 마감일을 옮기고 남은 분량을 새 기간에 맞춰 나눠요.', en: '<b>Change due date</b>: move the deadline and re-split.' },
      ],
    }],
  },
  {
    id: 'views', part: 'daily',
    title: { ko: '계획표를 달력·이미지로 보기', en: 'Calendar and image views' },
    shots: [{
      img: 'views',
      steps: [
        { ko: '<b>달력</b>을 누르면 한 달 달력으로 보여요. 달력 칸에서도 체크할 수 있어요.', en: '<b>Calendar</b> shows a monthly view; you can tick days there too.' },
        { ko: '<b>이미지로 내보내기</b>: 진도와 날짜별 분량을 한 장 이미지로 저장·공유해요.', en: '<b>Export as image</b>: save or share a one-page image.' },
      ],
    }],
    tip: { ko: '<b>분량 직접 조정</b>으로 특정 날의 분량을 바꾸면 나머지 날은 자동으로 다시 나뉘어요.', en: '<b>Adjust amounts</b> changes a specific day; the others re-split automatically.' },
  },

  /* ----- 그룹: 참여하는 분 ----- */
  {
    id: 'join', part: 'member',
    title: { ko: '그룹에 참여하기', en: 'Join a group' },
    intro: { ko: '리더에게 받은 <b>초대 링크</b>나 <b>6자리 초대 코드</b>로 참여해요. 여러 그룹에 함께 참여할 수 있어요.', en: 'Join with the <b>invite link</b> or <b>6-character code</b> from your leader. You can be in several groups.' },
    shots: [
      {
        sub: { ko: '초대 링크를 받았을 때', en: 'With an invite link' },
        img: 'join',
        steps: [{ ko: '링크를 누르고 로그인하면 이 화면이 나와요. 그룹 이름과 리더를 확인하고 <b>참여하기</b>를 눌러요.', en: 'Open the link and sign in, check the group and leader, then click <b>Join</b>.' }],
      },
      {
        sub: { ko: '초대 코드만 받았을 때', en: 'With a code only' },
        img: 'groupsjoin',
        steps: [
          { ko: '상단 <b>그룹</b> 메뉴에서 <b>초대 코드로 참여</b> 칸에 6자리 코드를 적어요.', en: 'In <b>Groups</b> at the top, enter the code under <b>Join with an invite code</b>.' },
          { ko: '<b>참여하기</b>를 누르고 다음 화면에서 한 번 더 <b>참여하기</b>를 눌러요.', en: 'Click <b>Join</b>, then <b>Join</b> again on the next screen.' },
        ],
      },
    ],
  },
  {
    id: 'mygroup', part: 'member',
    title: { ko: '그룹 화면 보기', en: 'Your group page' },
    intro: { ko: '상단 <b>그룹</b> → 그룹 이름을 누르면 리더가 정한 <b>필독서</b>(책)와 <b>필수 시청</b>(강의)이 모여 있어요.', en: 'Go to <b>Groups</b> → a group to see its <b>Required</b> books and <b>Required viewing</b> lectures.' },
    shots: [{
      img: 'membergroup',
      steps: [
        { ko: '<b>계획 세우기</b>: 아직 계획하지 않은 필독서예요. 누르면 날짜만 정해서 바로 계획할 수 있어요.', en: '<b>Make a plan</b>: not planned yet — set your dates and go.' },
        { ko: '<b>내 계획 보기</b>: 이미 계획한 필독서예요. 지금 상태(밀림·앞섬)도 함께 보여요.', en: '<b>View my plan</b>: already planned; your status is shown.' },
        { ko: '<b>그룹 나가기</b>: 언제든 나갈 수 있어요. 이미 세운 계획은 내 개인 목표로 남아요.', en: '<b>Leave group</b> anytime; your plans stay as personal goals.' },
      ],
    }],
  },
  {
    id: 'required', part: 'member',
    title: { ko: '필독서·필수 시청 계획 세우기', en: 'Plan required books and lectures' },
    intro: { ko: '첫 화면 오른쪽 <b>그룹에서 받은 항목</b> 카드에서도 바로 계획할 수 있어요.', en: 'You can also start from the <b>From your groups</b> card on the right of the dashboard.' },
    shots: [
      {
        img: 'inbox',
        steps: [{ ko: '계획할 책의 <b>계획 세우기</b>를 눌러요.', en: 'Click <b>Make a plan</b> on the book.' }],
      },
      {
        img: 'groupform',
        steps: [
          { ko: '<b>시작일</b>을 확인해요.', en: 'Check the <b>start date</b>.' },
          { ko: '<b>마감일</b>을 골라요. <b>○주 동안</b> 버튼으로 바로 정할 수 있어요.', en: 'Pick the <b>due date</b>, or tap a <b>weeks</b> button.' },
          { ko: '맨 아래 <b>목표 추가</b>를 눌러요.', en: 'Click <b>Add goal</b> at the bottom.' },
        ],
      },
    ],
    tip: { ko: '책 제목과 목차는 리더가 정해 두어서 회색으로 잠겨 있어요. 날짜와 쉬는 날만 정하면 돼요.', en: 'Title and contents are set by the leader (grey, locked). Just choose dates and days off.' },
  },
  {
    id: 'changed', part: 'member',
    title: { ko: '리더가 내용을 바꿨을 때', en: 'When the leader updates contents' },
    intro: { ko: '리더가 필독서의 목차나 강의 목록을 고치면 내 목표 카드에 <b>내용 변경됨</b>이 붙고, 목표 화면에 안내가 나와요.', en: 'When the leader edits contents, your card shows <b>Updated</b> and the goal page shows a notice.' },
    shots: [{
      img: 'changed',
      steps: [{ ko: '<b>적용 미리보기</b>를 눌러 바뀌는 계획을 확인하고 적용해요. 내 진도와 날짜는 그대로 유지돼요.', en: 'Click <b>Preview changes</b>, check the new plan and apply. Your progress and dates are kept.' }],
    }],
    tip: { ko: '리더는 그룹 필독서·필수 시청으로 세운 계획의 <b>진도만</b> 볼 수 있어요. 내가 따로 만든 개인 목표는 보이지 않아요.', en: 'Leaders see <b>only</b> the progress of plans made from the group’s required items — never your personal goals.' },
  },

  /* ----- 그룹: 리더 ----- */
  {
    id: 'create', part: 'leader',
    title: { ko: '그룹 만들기', en: 'Create a group' },
    intro: { ko: '누구나 그룹을 만들 수 있고, 만든 사람이 <b>리더</b>가 돼요. 독서 모임·소그룹·반 단위로 만들어 보세요.', en: 'Anyone can create a group and becomes its <b>leader</b> — for a reading club, small group or class.' },
    shots: [{
      img: 'groupscreate',
      steps: [
        { ko: '상단 <b>그룹</b> 메뉴의 <b>새 그룹 만들기</b>에 그룹 이름을 적어요.', en: 'In <b>Groups</b>, type a name under <b>Create a group</b>.' },
        { ko: '<b>만들기</b>를 누르면 그룹 화면으로 이동해요.', en: 'Click <b>Create</b> to open your group page.' },
      ],
    }],
  },
  {
    id: 'invite', part: 'leader',
    title: { ko: '멤버 초대하기', en: 'Invite members' },
    shots: [{
      img: 'invite',
      steps: [
        { ko: '<b>초대 코드</b>예요. 코드만 알려 줘도 [그룹 → 초대 코드로 참여]에서 들어올 수 있어요.', en: 'The <b>invite code</b> — members can enter it under [Groups → Join with an invite code].' },
        { ko: '<b>초대 링크 복사</b>를 눌러 단톡방 등에 붙여 넣어요. 링크를 받은 사람은 로그인 후 바로 참여해요. (<b>코드 복사</b>로 코드만 보낼 수도 있어요)', en: '<b>Copy invite link</b> and paste it into your chat. People join right after signing in.' },
        { ko: '<b>코드 새로 만들기</b>: 링크가 너무 퍼졌을 때 예전 코드를 막아요. 이미 참여한 멤버는 그대로예요.', en: '<b>New code</b>: stops the old code/link; existing members stay.' },
      ],
    }],
  },
  {
    id: 'share', part: 'leader',
    title: { ko: '필독서·필수 시청 공유하기', en: 'Share required books and lectures' },
    intro: { ko: '먼저 <a href="#guide-new">새 목표 추가</a>로 리더 본인의 목표(책·강의)를 만들고, 그 내용을 그룹에 공유해요. 책은 <b>필독서</b>, 강의는 <b>필수 시청</b>으로 표시돼요.', en: 'First <a href="#guide-new">add the goal</a> yourself (book or lecture), then share it. Books show as <b>Required</b>, lectures as <b>Required viewing</b>.' },
    shots: [{
      img: 'share',
      steps: [
        { ko: '그룹 화면의 <b>+ 내 목표 공유하기</b>를 눌러요.', en: 'Click <b>+ Share one of my goals</b> on the group page.' },
        { ko: '<b>내 목표에서 고르기</b>에 내 목표가 나와요. 많으면 이름으로 찾아요.', en: '<b>Choose from my goals</b> lists your goals — search by name if there are many.' },
        { ko: '공유할 목표의 <b>공유</b>를 누르면 멤버들의 첫 화면에 <b>계획 세우기</b>로 나타나요.', en: 'Click <b>Share</b> on a goal — it appears on members’ dashboards with <b>Make a plan</b>.' },
      ],
    }],
    tip: { ko: '공유되는 건 제목과 내용(목차·강의 목록·범위)뿐이에요. 리더의 날짜와 진도는 공유되지 않고, 멤버는 각자 날짜를 정해요.', en: 'Only the title and contents are shared — not your dates or progress. Each member sets their own dates.' },
  },
  {
    id: 'progress', part: 'leader',
    title: { ko: '멤버 진도 보기', en: 'Follow members’ progress' },
    shots: [{
      img: 'progress',
      steps: [
        { ko: '공유한 목표마다 멤버별 <b>기간·진도·상태·마지막 기록</b>이 보여요. 밀린 사람이 맨 위에 와요.', en: 'Each shared goal lists every member’s <b>dates, progress, status and last update</b> — those behind come first.' },
        { ko: '멤버 이름을 누르면 그 사람의 날짜별 계획표를 볼 수 있어요. (읽기 전용)', en: 'Click a name to view their day-by-day plan (read-only).' },
        { ko: '<b>바뀐 내용 공유</b>: 내 목표의 목차 등을 고쳤을 때 나타나요. 누르면 멤버들에게 "적용할까요?" 안내가 가요.', en: '<b>Share changes</b>: appears after you edit your goal’s contents; members are asked to apply.' },
      ],
    }],
    tip: { ko: '<b>공유 취소</b>를 누르면 멤버들의 계획은 각자 개인 목표로 남고, 진도는 더 이상 보이지 않아요.', en: '<b>Unshare</b> keeps members’ plans as personal goals, but you no longer see their progress.' },
  },
  {
    id: 'manage', part: 'leader',
    title: { ko: '그룹 관리하기', en: 'Manage your group' },
    shots: [
      {
        img: 'leadhead',
        steps: [
          { ko: '<b>이름 바꾸기</b>: 그룹 이름을 바꿔요.', en: '<b>Rename</b> the group.' },
          { ko: '<b>그룹 삭제</b>: 그룹과 공유 목록이 사라져요. 멤버들이 세운 계획은 각자 개인 목표로 남아요.', en: '<b>Delete group</b>: members’ plans remain as personal goals.' },
        ],
      },
      {
        img: 'manage',
        steps: [{ ko: '<b>내보내기</b>: 멤버를 그룹에서 빼요. 그 멤버의 계획은 개인 목표로 남아요.', en: '<b>Remove</b> a member; their plans stay as personal goals.' }],
      },
    ],
  },

  /* ----- 그 밖에 ----- */
  {
    id: 'menu', part: 'etc',
    title: { ko: '위쪽 메뉴', en: 'Top menu' },
    shots: [{
      img: 'topbar',
      steps: [
        { ko: '<b>그룹</b>: 내 그룹, 그룹 만들기, 초대 코드로 참여.', en: '<b>Groups</b>: your groups, create, join with a code.' },
        { ko: '<b>도움말</b>: 지금 보고 있는 설명서예요.', en: '<b>Help</b>: this guide.' },
        { ko: '<b>한국어 / English</b>: 화면 언어를 바꿔요. 계정에 저장돼요.', en: '<b>한국어 / English</b>: switch language; saved to your account.' },
      ],
    }],
  },
];

const GUIDE_FAQ = [
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
      en: 'Only the book details (title, author, contents) are sent for admin review — not your progress or dates. If declined, your plan stays.',
    },
  },
  {
    q: { ko: '저장은 언제 되나요?', en: 'When is it saved?' },
    a: {
      ko: '바꾸는 즉시 계정에 저장돼요. 오른쪽 위에 <b>저장됨</b>이 보이면 끝난 거예요.',
      en: 'Changes save to your account right away — <b>Saved</b> at the top right means it’s done.',
    },
  },
];

function helpText(obj) {
  if (!obj) return '';
  return (currentLang === 'en' ? obj.en : obj.ko) || obj.ko;
}

function renderHelp(root) {
  let no = 0;
  const numbered = GUIDE.map((g) => ({ ...g, no: ++no }));
  const toc = GUIDE_PARTS.map((p) => {
    const items = numbered.filter((g) => g.part === p.id);
    return `
      <div class="guide-toc-part">
        <strong>${escapeHtml(helpText(p.title))}</strong>
        <div>${items.map((g) => `<a href="#guide-${g.id}"><span>${g.no}</span>${escapeHtml(helpText(g.title))}</a>`).join('')}</div>
      </div>`;
  }).join('');

  const sections = GUIDE_PARTS.map((p) => {
    const items = numbered.filter((g) => g.part === p.id);
    return `
      <div class="guide-part" id="guide-part-${p.id}">
        <h2 class="guide-part-title">${escapeHtml(helpText(p.title))}</h2>
        ${items.map((g) => `
          <section class="guide-section" id="guide-${g.id}">
            <h3><span class="guide-no">${g.no}</span>${escapeHtml(helpText(g.title))}</h3>
            ${g.intro ? `<p class="guide-intro">${helpText(g.intro)}</p>` : ''}
            ${g.shots.map((s) => `
              <div class="guide-shot-block">
                ${s.sub ? `<h4>${escapeHtml(helpText(s.sub))}</h4>` : ''}
                <figure class="guide-shot"><img src="help/${s.img}.jpg" alt="" loading="lazy"></figure>
                <ol class="guide-steps">${s.steps.map((st) => `<li>${helpText(st)}</li>`).join('')}</ol>
              </div>`).join('')}
            ${g.tip ? `<p class="guide-tip">💡 ${helpText(g.tip)}</p>` : ''}
          </section>`).join('')}
      </div>`;
  }).join('');

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
      <nav class="guide-toc" aria-label="${t('목차')}">
        ${toc}
        <div class="guide-toc-part"><strong>${t('자주 묻는 질문')}</strong><div><a href="#guide-faq"><span>?</span>${t('자주 묻는 질문')}</a></div></div>
      </nav>
      ${sections}
      <div class="guide-part">
        <h2 class="guide-part-title" id="guide-faq">${t('자주 묻는 질문')}</h2>
        ${faq}
      </div>
      ${currentLang === 'en' ? `<p class="muted small">${t('설명서의 화면 그림은 한국어 화면이에요.')}</p>` : ''}
    </div>`;

  // 목차·본문 안 링크: 주소(#/help)는 그대로 두고 해당 위치로만 이동
  root.querySelector('#help-page').addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#guide-"]');
    if (!a) return;
    e.preventDefault();
    const target = root.querySelector(a.getAttribute('href'));
    if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
  });
}
