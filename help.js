/* =========================================================================
 * 오늘분량 — 도움말 (회원용 사용 설명서)
 *   질문별로 접고 펼치는 가이드. 화면 그림은 help/ 폴더 (예시 데이터로 찍은 한국어 화면).
 *   내용은 한국어/영어를 함께 두고, 앱의 현재 언어(currentLang)에 맞춰 보여 준다.
 * ========================================================================= */

const HELP_SECTIONS = [
  {
    title: { ko: '시작하기', en: 'Getting started' },
    items: [
      {
        id: 'what',
        q: { ko: '오늘분량은 어떤 앱인가요?', en: 'What is Today’s Dose?' },
        img: 'dashboard',
        a: {
          ko: `<p>책·강의·성경 통독·숙제처럼 <b>끝내야 할 분량</b>과 <b>마감일</b>만 정하면, 남은 날짜에 고르게 나눠서 <b>매일 오늘 할 분량</b>을 알려 주는 계획 앱이에요.</p>
<p>계획보다 밀리거나 앞서면 알려 주고, 필요하면 남은 기간에 맞춰 다시 나눌 수 있어요. 구글 계정으로 로그인하면 휴대폰·컴퓨터 어디서든 같은 계획을 볼 수 있어요.</p>`,
          en: `<p>Set <b>what you need to finish</b> (a book, lectures, Bible reading, homework…) and a <b>due date</b>. The app spreads it evenly over the remaining days and shows <b>today’s amount</b> every day.</p>
<p>It tells you when you fall behind or get ahead, and can re-split the rest when needed. Sign in with Google to see the same plans on any device.</p>`,
        },
      },
      {
        id: 'dashboard',
        q: { ko: '첫 화면(대시보드)은 어떻게 보나요?', en: 'How do I read the dashboard?' },
        a: {
          ko: `<p>목표마다 카드가 하나씩 있어요.</p>
<ul>
<li><b>왼쪽 위 태그</b>: 종류(책·강의·성경 통독·기타). 그룹에서 받은 목표는 <b>필독서</b>·<b>필수 시청</b>과 그룹 이름이 붙어요.</li>
<li><b>오른쪽 위</b>: <b>계획대로</b> / <b>○페이지 밀림</b>(빨강) / <b>○페이지 앞섬</b>(초록).</li>
<li><b>마감일과 D-day</b>, 진행 막대와 진행률.</li>
<li><b>오늘 할 분량</b>: 오늘 읽거나 들을 범위예요. 다 하면 <b>✓ 완료</b>가 붙어요.</li>
</ul>
<p>카드를 누르면 자세한 현황과 날짜별 계획표가 나와요. 마감이 지난 목표나 끝낸 목표는 아래쪽에 따로 모여요.</p>`,
          en: `<p>Each goal has a card.</p>
<ul>
<li><b>Top-left tag</b>: the type (book, lecture, Bible reading, other). Goals from a group show <b>Required</b> / <b>Required viewing</b> and the group name.</li>
<li><b>Top-right</b>: <b>On track</b> / <b>… behind</b> (red) / <b>… ahead</b> (green).</li>
<li><b>Due date and D-day</b>, a progress bar and percentage.</li>
<li><b>Today’s amount</b>: what to read or watch today. It shows <b>✓ Done</b> once you finish.</li>
</ul>
<p>Click a card for details and the day-by-day plan. Finished or overdue goals are grouped further down.</p>`,
        },
      },
    ],
  },
  {
    title: { ko: '목표 만들기', en: 'Creating goals' },
    items: [
      {
        id: 'book',
        q: { ko: '책 목표는 어떻게 만드나요?', en: 'How do I create a book goal?' },
        img: 'form',
        a: {
          ko: `<ol>
<li>대시보드 오른쪽 위 <b>+ 새 목표 추가</b>를 눌러요.</li>
<li><b>종류</b>에서 <b>책</b>을 고르고 <b>책 제목</b>을 적어요.</li>
<li><b>시작일</b>과 <b>마감일</b>을 정해요. (<a href="#help-due">마감일 정하는 방법</a>)</li>
<li>아래 <b>챕터 목록</b>에 챕터 이름과 <b>시작 페이지</b>를 넣고, <b>마지막 페이지</b>를 적어요. (<a href="#help-toc">목차를 사진으로 채우기</a>)</li>
<li><b>목표 추가</b>를 누르면 계획이 만들어져요.</li>
</ol>
<p>이미 읽기 시작한 책이면 <b>마지막으로 읽은 페이지</b>를 적어 주세요. 그다음 페이지부터 계획해요.</p>`,
          en: `<ol>
<li>Click <b>+ New goal</b> at the top right of the dashboard.</li>
<li>Choose <b>Book</b> as the type and enter the <b>title</b>.</li>
<li>Set the <b>start</b> and <b>due</b> dates. (<a href="#help-due">Ways to set the due date</a>)</li>
<li>In <b>Chapters</b>, enter each chapter name and its <b>start page</b>, then the <b>last page</b>. (<a href="#help-toc">Fill chapters from a photo</a>)</li>
<li>Click <b>Add goal</b> and your plan is ready.</li>
</ol>
<p>Already started the book? Enter the <b>Last page read</b> and the plan starts from the next page.</p>`,
        },
      },
      {
        id: 'toc',
        q: { ko: '목차를 사진으로 한 번에 채울 수 있나요? (AI)', en: 'Can I fill chapters from a photo of the contents? (AI)' },
        img: 'chapters',
        a: {
          ko: `<p>네. 책의 <b>목차 페이지를 사진으로 찍어</b> <b>목차 사진 올리기</b>를 누르거나, 사진을 보라색 상자에 끌어다 놓으면 AI가 <b>챕터 이름과 시작 페이지</b>를 읽어 채워요. 목차가 여러 쪽이면 사진을 여러 장 함께 고르세요.</p>
<ul>
<li>페이지를 읽지 못한 칸은 <b>노란색</b>으로 표시돼요. 직접 넣어 주세요.</li>
<li>시작 페이지 칸에서 <b>Enter</b>를 누르면 다음 빈칸으로 넘어가요.</li>
<li>챕터 이름은 이미 있고 페이지만 비어 있으면, 사진에서 <b>페이지만</b> 찾아 채워요.</li>
<li>사진이 없으면 <b>목차 글자 붙여넣기</b>로 목차 글을 붙여 넣어도 돼요.</li>
<li>챕터 왼쪽 <b>⠿</b>를 끌면 순서를 바꿀 수 있어요.</li>
</ul>
<p>AI가 잘못 읽을 수 있으니 저장 전에 실제 목차와 한 번 비교해 주세요.</p>`,
          en: `<p>Yes. Take a <b>photo of the contents page</b> and click <b>Upload contents photo</b> (or drag it onto the purple box). AI reads the <b>chapter names and start pages</b>. For multi-page contents, select several photos at once.</p>
<ul>
<li>Boxes AI couldn’t read are <b>yellow</b> — fill them in yourself.</li>
<li>Press <b>Enter</b> in a start-page box to jump to the next empty one.</li>
<li>If chapter names are already there and only pages are missing, the photo fills in <b>just the pages</b>.</li>
<li>No photo? Use <b>Paste the contents as text</b>.</li>
<li>Drag <b>⠿</b> on the left to reorder chapters.</li>
</ul>
<p>AI can misread, so compare with the real contents before saving.</p>`,
        },
      },
      {
        id: 'lecture',
        q: { ko: '강의 목표는 어떻게 만드나요? (AI)', en: 'How do I create a lecture goal? (AI)' },
        img: 'lecture',
        a: {
          ko: `<p><b>종류</b>에서 <b>강의</b>를 고르고, <b>강의 제목 목록</b>에 한 줄에 하나씩 강의 제목을 적어요. 강의 수만큼 날짜에 나눠요.</p>
<p>강의 사이트의 <b>차시 목록을 캡처</b>하거나 사진으로 찍어 <b>강의 목록 사진 올리기</b>를 누르면 AI가 제목을 순서대로 채워 줘요. 목록이 길면 여러 장을 함께 고르세요. 겹쳐 찍힌 제목은 한 번만 들어가요.</p>`,
          en: `<p>Choose <b>Lecture</b> and list the lecture titles in <b>Lecture titles</b>, one per line. They are spread over the days.</p>
<p>Or take a <b>screenshot or photo of the course’s lesson list</b> and click <b>Upload lesson list</b> — AI fills in the titles in order. Select several images for long lists; overlapping titles are added only once.</p>`,
        },
      },
      {
        id: 'bible',
        q: { ko: '성경 통독 계획은 어떻게 세우나요?', en: 'How do I plan Bible reading?' },
        a: {
          ko: `<p><b>종류</b>에서 <b>성경 통독</b>을 고르고 <b>통독 범위</b>를 정해요. <b>성경 전체</b>, <b>구약</b>, <b>신약</b>, <b>모세오경</b> 같은 버튼으로 빠르게 고를 수도 있어요. 분량은 <b>장(章)</b> 단위로 나눠요.</p>
<p>진도는 상세 화면에서 <b>어디까지 읽었는지(권·장)</b>를 골라 기록해요.</p>`,
          en: `<p>Choose <b>Bible Reading</b> and set the <b>Reading range</b>. Buttons like <b>Whole Bible</b>, <b>Old Testament</b>, <b>New Testament</b> and <b>Pentateuch</b> pick common ranges. Amounts are split by <b>chapter</b>.</p>
<p>Record progress on the goal page by choosing the <b>book and chapter</b> you read up to.</p>`,
        },
      },
      {
        id: 'custom',
        q: { ko: '숙제·문제집·단어 암기도 계획할 수 있나요?', en: 'Can I plan homework, workbooks or vocabulary?' },
        a: {
          ko: `<p>네, <b>종류</b>에서 <b>기타</b>를 고르세요.</p>
<ul>
<li><b>단위 이름</b>: 문제·과제·단원·단어처럼 셀 단위를 적거나 버튼으로 골라요.</li>
<li><b>전체 개수</b>: 예) 150문제.</li>
<li><b>항목 목록</b>(선택): 한 줄에 하나씩 적으면 계획표에 항목 이름이 나오고, 줄 수가 전체 개수가 돼요.</li>
</ul>`,
          en: `<p>Yes — choose <b>Other</b>.</p>
<ul>
<li><b>Unit name</b>: what you count (problems, tasks, units, words…).</li>
<li><b>Total count</b>: e.g. 150 problems.</li>
<li><b>Item list</b> (optional): one per line; names appear in the plan and the number of lines becomes the total.</li>
</ul>`,
        },
      },
      {
        id: 'due',
        q: { ko: '마감일은 어떻게 정하나요?', en: 'How do I set the due date?' },
        a: {
          ko: `<ul>
<li><b>마감일로 정하기</b>: 마감일을 직접 고르면 하루 평균 분량을 보여 줘요.</li>
<li><b>하루 분량으로 정하기</b>: "하루 20페이지씩"처럼 하루 분량을 넣으면 언제 끝나는지 계산해 마감일을 채워요.</li>
<li><b>마감일 빠르게 정하기</b>: 1주·2주·4주·6주·8주 동안 버튼으로 시작일부터 바로 정해요.</li>
</ul>`,
          en: `<ul>
<li><b>By due date</b>: pick the date and see the average daily amount.</li>
<li><b>By daily amount</b>: enter e.g. “20 pages a day” and the finish date is calculated for you.</li>
<li><b>Quick due date</b>: 1/2/4/6/8-week buttons from the start date.</li>
</ul>`,
        },
      },
      {
        id: 'rest',
        q: { ko: '쉬는 날이나 여유 있는 날을 정할 수 있나요?', en: 'Can I set days off or lighter/heavier days?' },
        a: {
          ko: `<ul>
<li><b>쉬는 요일</b>: 매주 빠지는 요일(예: 주일)을 고르면 그날엔 분량을 주지 않아요.</li>
<li><b>쉬는 날</b>: 수련회·여행처럼 특정 날짜를 메모와 함께 추가해요.</li>
<li><b>여유 있는 날</b>: 시간이 많은 날을 골라 평소의 1.5배·2배·3배를 배정해요.</li>
</ul>
<p>모두 목표를 만든 뒤에도 <b>수정</b>에서 바꿀 수 있어요.</p>`,
          en: `<ul>
<li><b>Rest weekdays</b>: weekdays you always skip (e.g. Sunday) get no amount.</li>
<li><b>Rest days</b>: specific dates such as a retreat or trip, with a note.</li>
<li><b>Extra days</b>: days with more time get 1.5×, 2× or 3× the usual amount.</li>
</ul>
<p>You can change all of these later under <b>Edit</b>.</p>`,
        },
      },
    ],
  },
  {
    title: { ko: '매일 기록하기', en: 'Tracking every day' },
    items: [
      {
        id: 'record',
        q: { ko: '진도는 어떻게 기록하나요?', en: 'How do I record progress?' },
        img: 'detail',
        a: {
          ko: `<p>목표 카드를 눌러 상세 화면으로 들어가요.</p>
<ul>
<li><b>책</b>: <b>마지막으로 읽은 페이지</b>를 적거나, <b>완료한 챕터</b>를 골라요.</li>
<li><b>강의·기타</b>: 완료한 개수를 적어요.</li>
<li><b>성경 통독</b>: 어디까지 읽었는지 권과 장을 골라요.</li>
</ul>
<p><b>진도 기록</b>을 누르면 저장돼요. 아래 <b>계획표</b>에서 날짜 줄의 <b>체크박스</b>를 눌러도 그날 분량까지 한 번에 기록돼요.</p>
<p><b>현재 위치</b>와 <b>오늘 할 일</b>이 바로 바뀌고, 조금 더 읽었다면 오늘 분량 중 <b>남은 부분만</b> 보여 줘요.</p>`,
          en: `<p>Open a goal from its card.</p>
<ul>
<li><b>Book</b>: enter the <b>Last page read</b>, or pick the <b>last chapter finished</b>.</li>
<li><b>Lecture / Other</b>: enter how many you have completed.</li>
<li><b>Bible reading</b>: choose the book and chapter you read up to.</li>
</ul>
<p>Click <b>Log progress</b> to save. You can also tick the <b>checkbox</b> on a day in the <b>Plan</b> below to record up to that day.</p>
<p><b>Current position</b> and <b>Today</b> update right away; if you read a bit extra, only the <b>remaining</b> part of today is shown.</p>`,
        },
      },
      {
        id: 'behind',
        q: { ko: '계획보다 밀리거나 앞서면 어떻게 되나요?', en: 'What if I’m behind or ahead of the plan?' },
        a: {
          ko: `<p>상세 화면 위쪽 <b>계획 대비 현황</b>에 <b>오늘까지 권장</b>과 <b>실제 완료</b>가 비교돼 나와요. 초록 막대가 실제 진도, 검정 선이 오늘까지 권장 위치예요.</p>
<ul>
<li><b>밀림</b>은 그날이 지나고 다음 날부터 표시돼요. 오늘 분량은 오늘 안에 하면 돼요.</li>
<li>밀렸을 때는 "남은 공부일 동안 하루 ○페이지씩 하면 기한을 맞출 수 있어요"처럼 안내해요.</li>
<li><b>재분배</b>를 누르면 오늘부터 마감일까지 <b>남은 분량을 다시 고르게</b> 나눠요. 적용 전에 <b>미리보기</b>로 바뀌는 계획을 먼저 보여 줘요.</li>
<li>앞서 있으면 그대로 두어도 되고, 재분배로 남은 날의 분량을 줄여도 돼요.</li>
</ul>
<p>처음 세운 <b>원래 계획</b>은 보관돼서 비교해 볼 수 있어요.</p>`,
          en: `<p><b>Progress vs. plan</b> at the top of the goal page compares <b>Target by today</b> with <b>Actually done</b>. The green bar is your progress; the black line is where you should be today.</p>
<ul>
<li><b>Behind</b> only shows from the next day — today’s amount can still be done today.</li>
<li>When behind, you’ll see how much a day you need to catch up.</li>
<li><b>Redistribute</b> re-splits the <b>remaining amount</b> evenly from today to the due date. A <b>preview</b> shows the new plan before you apply it.</li>
<li>If ahead, keep going or redistribute to lighten the remaining days.</li>
</ul>
<p>Your <b>original plan</b> is kept for comparison.</p>`,
        },
      },
      {
        id: 'change-due',
        q: { ko: '마감일을 바꾸고 싶어요', en: 'I want to change the due date' },
        a: {
          ko: `<p>상세 화면의 <b>마감일 변경</b>을 누르고 새 마감일을 고르거나, <b>하루 분량</b>을 넣어 끝나는 날을 계산할 수 있어요. 진행 중인 목표는 오늘부터 새 마감일까지 남은 분량을 다시 나누고, 적용 전에 <b>미리보기</b>를 보여 줘요.</p>`,
          en: `<p>Click <b>Change due date</b> on the goal page and pick a new date, or enter a <b>daily amount</b> to calculate the finish date. For goals in progress, the remaining amount is re-split from today, with a <b>preview</b> before applying.</p>`,
        },
      },
      {
        id: 'adjust',
        q: { ko: '특정 날의 분량을 직접 정할 수 있나요?', en: 'Can I set the amount for a specific day?' },
        a: {
          ko: `<p>네. 계획표 위 <b>분량 직접 조정</b>을 누르면 날짜별 분량 칸이 열려요. 원하는 날의 분량을 바꾸면 <b>나머지 날은 자동으로 다시 나뉘어요</b>. 미리보기를 확인하고 적용하세요.</p>`,
          en: `<p>Yes. Click <b>Adjust amounts</b> above the plan to edit per-day amounts. Change any day and <b>the other days are re-split automatically</b>. Check the preview, then apply.</p>`,
        },
      },
    ],
  },
  {
    title: { ko: '계획표 보기', en: 'Viewing the plan' },
    items: [
      {
        id: 'table',
        q: { ko: '날짜별 계획표는 어디서 보나요?', en: 'Where is the day-by-day plan?' },
        img: 'table',
        a: {
          ko: `<p>상세 화면 아래 <b>계획표</b>에 날짜마다 읽을 범위, 분량, 누적 목표가 나와요. 오늘 줄은 파랗게, 지난 날 못 한 줄은 빨갛게 표시돼요.</p>
<p>책은 <b>페이지 기준</b>과 <b>챕터 기준</b> 두 가지로 볼 수 있어요.</p>`,
          en: `<p>The <b>Plan</b> at the bottom of the goal page lists each day’s range, amount and cumulative target. Today is blue; missed past days are red.</p>
<p>Books can be viewed <b>by page</b> or <b>by chapter</b>.</p>`,
        },
      },
      {
        id: 'calendar',
        q: { ko: '달력으로 볼 수 있나요?', en: 'Can I see it as a calendar?' },
        img: 'calendar',
        a: {
          ko: `<p>계획표 위 <b>달력</b>을 누르면 한 달 달력으로 보여요. 칸마다 그날 범위가 나오고, 체크박스로 바로 기록할 수 있어요. 쉬는 날은 "쉬는 날"로 표시돼요. ◀ ▶로 달을 옮겨요.</p>`,
          en: `<p>Click <b>Calendar</b> above the plan for a monthly view. Each day shows its range and a checkbox to record it. Days off are marked. Use ◀ ▶ to change months.</p>`,
        },
      },
      {
        id: 'export',
        q: { ko: '계획표를 이미지로 저장·공유할 수 있나요?', en: 'Can I save or share the plan as an image?' },
        a: {
          ko: `<p>계획표 위 <b>이미지로 내보내기</b>를 누르면 현재 진도와 날짜별 분량을 한 장(16:9)으로 정리한 이미지를 만들어요. <b>전체 기간</b> 또는 <b>오늘부터</b>를 고를 수 있고, 내려받아 단톡방 등에 공유할 수 있어요.</p>`,
          en: `<p>Click <b>Export as image</b> above the plan to create a single 16:9 image of your progress and daily amounts. Choose <b>whole period</b> or <b>from today</b>, then download and share it.</p>`,
        },
      },
    ],
  },
  {
    title: { ko: '그룹', en: 'Groups' },
    items: [
      {
        id: 'join',
        q: { ko: '그룹에는 어떻게 참여하나요?', en: 'How do I join a group?' },
        a: {
          ko: `<ul>
<li>리더가 보낸 <b>초대 링크</b>를 누르고 로그인하면 참여 화면이 나와요. <b>참여하기</b>를 누르면 끝이에요.</li>
<li><b>6자리 초대 코드</b>만 받았다면 상단 <b>그룹</b> 메뉴 → <b>초대 코드로 참여</b>에 입력해요.</li>
</ul>
<p>여러 그룹에 동시에 참여할 수 있어요.</p>`,
          en: `<ul>
<li>Open the <b>invite link</b> from your leader and sign in, then click <b>Join</b>.</li>
<li>Got only a <b>6-character code</b>? Go to <b>Groups</b> → <b>Join with an invite code</b>.</li>
</ul>
<p>You can be in several groups at once.</p>`,
        },
      },
      {
        id: 'required',
        q: { ko: '필독서·필수 시청은 어떻게 계획하나요?', en: 'How do I plan required books and lectures?' },
        img: 'group',
        a: {
          ko: `<p>그룹 리더가 정한 책은 <b>필독서</b>, 강의는 <b>필수 시청</b>이에요. 대시보드 위쪽 <b>그룹 필독서 · 필수 시청</b>이나 그룹 화면에서 <b>계획 세우기</b>를 누르세요.</p>
<p>제목·목차 같은 <b>내용은 리더가 정해 두어서</b> 입력할 필요가 없고, <b>시작일·마감일·쉬는 날</b>만 각자 정하면 돼요.</p>`,
          en: `<p>Books your group leader sets are <b>Required</b>; lectures are <b>Required viewing</b>. Click <b>Make a plan</b> in <b>Required in your groups</b> on the dashboard or on the group page.</p>
<p>The <b>contents are set by the leader</b>, so you only choose your <b>start date, due date and days off</b>.</p>`,
        },
      },
      {
        id: 'leader-changed',
        q: { ko: '"리더가 내용을 수정했습니다"라고 나와요', en: '“The leader updated the contents” appears' },
        a: {
          ko: `<p>리더가 필독서·필수 시청의 목차나 목록을 고치면, 내 목표 카드에 <b>내용 변경됨</b>이 붙고 상세 화면에 안내가 나와요. <b>적용 미리보기</b>를 눌러 바뀌는 계획을 확인한 뒤 적용하면, 내 진도와 날짜는 유지한 채 새 내용으로 다시 나눠요.</p>`,
          en: `<p>When the leader edits a required book or lecture, your card shows <b>Updated</b> and the goal page shows a notice. Click <b>Preview changes</b>, check the new plan, and apply — your progress and dates are kept.</p>`,
        },
      },
      {
        id: 'privacy',
        q: { ko: '리더는 내 무엇을 볼 수 있나요?', en: 'What can the leader see?' },
        a: {
          ko: `<p>리더는 <b>그룹에서 받은 필독서·필수 시청으로 세운 계획의 진도만</b> 볼 수 있어요. 내가 따로 만든 <b>개인 목표는 보이지 않아요</b>.</p>
<p>그룹 화면의 <b>그룹 나가기</b>로 언제든 나갈 수 있고, 나가도 이미 세운 계획은 내 개인 목표로 남아요.</p>`,
          en: `<p>Leaders see <b>only the progress of plans made from the group’s required books and lectures</b>. Your <b>personal goals are never shown</b>.</p>
<p>You can <b>Leave group</b> anytime; plans you made stay as your personal goals.</p>`,
        },
      },
    ],
  },
  {
    title: { ko: '그 밖에', en: 'Other' },
    items: [
      {
        id: 'edit',
        q: { ko: '목표를 고치거나 지우려면요?', en: 'How do I edit or delete a goal?' },
        a: {
          ko: `<p>상세 화면 오른쪽 위 <b>수정</b> 또는 <b>삭제</b>를 눌러요. 진행 중인 목표의 날짜·쉬는 날·목차를 바꾸면 오늘부터 남은 분량을 다시 나누고, 적용 전에 미리보기를 보여 줘요. 지운 목표는 되돌릴 수 없어요.</p>`,
          en: `<p>Use <b>Edit</b> or <b>Delete</b> at the top right of the goal page. Changing dates, days off or chapters of a goal in progress re-splits the rest from today, with a preview first. Deleted goals can’t be restored.</p>`,
        },
      },
      {
        id: 'library',
        q: { ko: '내가 만든 책이 도서관에 등록된다고요?', en: 'My book gets added to the library?' },
        a: {
          ko: `<p>새 책 목표를 만들면 책 정보(제목·저자·목차)가 관리자 검토용으로 도서관에 제출돼요. 내 진도나 날짜는 제출되지 않아요. 검토 중에 내가 목차를 고치면 제출본도 같이 고쳐져요. 반려돼도 내 계획은 그대로 쓸 수 있어요.</p>`,
          en: `<p>When you create a new book goal, the book details (title, author, contents) are sent to the library for admin review — not your progress or dates. Edits while it’s pending update the submission too. If it’s declined, your plan stays as it is.</p>`,
        },
      },
      {
        id: 'language',
        q: { ko: '영어로 볼 수 있나요?', en: 'Can I use it in Korean?' },
        a: {
          ko: `<p>오른쪽 위 <b>한국어 / English</b>를 누르면 바뀌고, 계정에 저장돼서 다른 기기에서도 같은 언어로 보여요. (도움말의 화면 그림은 한국어 화면이에요.)</p>`,
          en: `<p>Use <b>한국어 / English</b> at the top right. The choice is saved to your account, so it follows you across devices. (Screenshots in this help show the Korean screens.)</p>`,
        },
      },
      {
        id: 'devices',
        q: { ko: '휴대폰에서도 쓸 수 있나요? 데이터는 어디 저장되나요?', en: 'Does it work on my phone? Where is my data stored?' },
        a: {
          ko: `<p>인터넷 브라우저로 같은 주소에 들어가 같은 구글 계정으로 로그인하면 어느 기기에서든 같은 계획이 보여요. 기록은 계정에 바로 저장돼요. 오른쪽 위에 <b>저장됨</b>이 보이면 저장이 끝난 거예요.</p>`,
          en: `<p>Open the same address in any browser and sign in with the same Google account to see the same plans. Changes are saved to your account right away — <b>Saved</b> at the top right means it’s done.</p>`,
        },
      },
    ],
  },
];

let helpSearch = '';

function helpText(obj) {
  return (currentLang === 'en' ? obj.en : obj.ko) || obj.ko;
}

function renderHelp(root) {
  const sections = HELP_SECTIONS.map((sec) => `
    <section class="help-section">
      <h2 class="section-title">${escapeHtml(helpText(sec.title))}</h2>
      ${sec.items.map((item) => `
        <details class="panel help-item" id="help-${item.id}" data-help-search="${escapeHtml(
          `${item.q.ko} ${item.q.en} ${item.a.ko.replace(/<[^>]+>/g, ' ')} ${item.a.en.replace(/<[^>]+>/g, ' ')}`.toLowerCase())}">
          <summary>${escapeHtml(helpText(item.q))}</summary>
          <div class="help-body">
            ${helpText(item.a)}
            ${item.img ? `<img class="help-img" src="help/${item.img}.jpg" alt="${escapeHtml(helpText(item.q))}" loading="lazy">` : ''}
          </div>
        </details>`).join('')}
    </section>`).join('');

  root.innerHTML = `
    <div id="help-page">
      <header class="page-header">
        <div>
          <a class="back-link" href="#/">← ${t('내 계획')}</a>
          <h1>${t('도움말')}</h1>
          <p class="muted">${t('궁금한 질문을 눌러 보세요.')}</p>
        </div>
      </header>
      <input type="search" id="help-search" class="input help-search" placeholder="${t('도움말 검색 (예: 쉬는 날, 사진, 그룹)')}" value="${escapeHtml(helpSearch)}">
      <p class="empty" id="help-empty" hidden>${t('찾는 내용이 없어요. 다른 말로 검색해 보세요.')}</p>
      ${sections}
    </div>`;

  const page = root.querySelector('#help-page');
  const apply = () => {
    const q = helpSearch.trim().toLowerCase();
    let shown = 0;
    page.querySelectorAll('.help-item').forEach((el) => {
      const ok = !q || el.dataset.helpSearch.includes(q);
      el.hidden = !ok;
      if (ok) shown += 1;
      if (q && ok) el.open = true;
    });
    page.querySelectorAll('.help-section').forEach((sec) => {
      sec.hidden = ![...sec.querySelectorAll('.help-item')].some((el) => !el.hidden);
    });
    page.querySelector('#help-empty').hidden = shown > 0;
  };
  page.querySelector('#help-search').addEventListener('input', (e) => {
    helpSearch = e.target.value;
    apply();
  });
  // 도움말 안의 "#help-…" 링크: 해당 질문을 펼치고 그 위치로
  page.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#help-"]');
    if (!a) return;
    e.preventDefault();
    const target = page.querySelector(a.getAttribute('href'));
    if (target) {
      target.hidden = false;
      target.open = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  apply();
}
