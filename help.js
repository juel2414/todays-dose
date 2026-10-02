/* =========================================================================
 * 오늘분량 — 도움말 (Claude Design 도움말 화면)
 *   맨 위 핵심 흐름 3단계 → 상황별 탭 5개(처음 시작 · 매일 쓰기 · 그룹 참여자 · 그룹 관리자 · 자주 묻는 질문).
 *   항목마다 화면 그림 1장 + 번호 단계 + 한 줄 팁. 그림(help/v2/*.jpg)의 빨간 번호와 단계 번호가 같다.
 *   문구의 **굵게**는 앱 화면의 버튼·메뉴 이름이다.
 * ========================================================================= */

const HELP_TABS = ['start', 'daily', 'member', 'leader', 'faq'];

const HELP_TEXT = {
  ko: {
    title: '도움말',
    lead: '마감일만 정하면 오늘 할 분량을 매일 알려 드려요.',
    note: '1분이면 충분해요!',
    flow: ['목표 만들기', '오늘 분량 하고 체크', '밀리면 재분배'],
    tabs: ['처음 시작', '매일 쓰기', '그룹 참여자', '그룹 관리자', '자주 묻는 질문'],
    tip: 'TIP',
    more: '그래도 모르겠다면 문의하기로 알려 주세요.',
    contact: '문의하기',
    contactSubject: '오늘분량 문의',
    askTitle: '무엇이 궁금하거나 불편했나요?',
    askPlaceholder: '어떤 화면에서 무엇을 하려다 막혔는지 적어 주시면 더 빨리 도와드릴 수 있어요.',
    askReply: '답장은 가입한 이메일({email})로 드려요.',
    askSend: '보내기',
    askSending: '보내는 중…',
    askCancel: '취소',
    askEmpty: '내용을 적어 주세요.',
    askDone: '보냈어요! 확인하고 이메일로 답장 드릴게요.',
    askFail: '보내지 못했어요. 잠시 후 다시 시도해 주세요.',
    askMore: '하나 더 보내기',
    shotNote: '',
    guides: {
      start: [
        ['start-1-new', '새 목표 만들기', ['오른쪽 위 **+ 새 목표 추가**를 눌러요', '종류(책·강의·성경 통독·기타)를 고르고 제목을 써요', '시작일·마감일을 정하고 **목표 추가**를 눌러요'], '**○주 동안** 버튼으로 마감일을 바로 정할 수 있어요.'],
        ['start-2-toc', '책 목차 넣기', ['**목차 사진 올리기**를 누르면 AI가 챕터와 페이지를 채워요', '빈 칸만 확인해요', '마지막 페이지를 입력해요']],
        ['start-3-rest', '쉬는 날 정하기', ['쉬는 요일을 골라요', '**더 정하기**를 펼쳐 행사 같은 특정 쉬는 날을 골라요', '여유 있는 날을 정하면 그날 더 많이 배정돼요']],
      ],
      daily: [
        ['daily-1-today', '오늘 할 분량', ['다 했으면 동그라미를 눌러 체크해요. 다시 누르면 취소돼요', '목표 이름을 누르면 자세한 화면으로 가요']],
        ['daily-2-record', '조금 더 하거나 덜 했을 때', ['마지막으로 읽은 페이지(또는 완료한 챕터)를 입력해요', '**진도 기록**을 눌러요']],
        ['daily-3-behind', '밀렸을 때', ['안내 문구에서 하루에 얼마씩 하면 되는지 확인해요', '남은 분량을 다시 나누려면 **재분배**를 눌러요', '기간을 바꾸려면 **마감일 변경**을 눌러요'], '밀림은 그날이 지나야 표시돼요. 오늘 분량은 오늘 안에만 하면 돼요.'],
        ['daily-4-views', '계획표 보기', ['**목록** / **달력**을 눌러 보기를 바꿔요', '**이미지로 내보내기**로 계획표를 저장해요']],
      ],
      member: [
        ['member-1-join', '그룹 들어가기', ['관리자가 보낸 초대 링크를 누르고 **참여하기**를 눌러요', '또는 그룹 화면에서 6자리 코드를 넣고 **참여하기**를 눌러요']],
        ['member-2-plan', '필독서·필수 시청 계획 세우기', ['대시보드 오른쪽 **그룹에서 받은 항목**에서 **계획 세우기**를 눌러요', '날짜만 정하면 돼요. 제목과 목차는 잠겨 있어요']],
        ['member-3-changed', '관리자가 내용을 바꿨을 때', ['안내 띠의 **적용 미리보기**로 바뀐 내용을 확인해요', '확인한 뒤 **적용**해요. 내 진도와 날짜는 그대로예요'], '관리자는 그룹 항목의 진도만 볼 수 있어요. 개인 목표는 보이지 않아요.'],
      ],
      leader: [
        ['leader-1-create', '그룹 만들기', ['그룹 화면에서 그룹 이름을 입력해요', '**만들기**를 눌러요']],
        ['leader-2-invite', '멤버 초대', ['그룹 상세에서 초대 코드를 확인해요', '**초대 링크 복사**로 링크를 보내요', '코드를 바꾸고 싶으면 **코드 새로 만들기**를 눌러요']],
        ['leader-3-share', '필독서·필수 시청 공유', ['**+ 내 목표 공유하기**를 눌러요', '내 목표를 검색해서 골라요']],
        ['leader-4-progress', '멤버 진도 보기', ['항목별 표에서 멤버의 진도와 밀림을 확인해요', '이름을 누르면 그 사람의 계획표가 보여요']],
      ],
    },
    faq: [
      ['목표를 고치거나 지우려면요?', '목표 화면에서 **수정** 또는 **삭제**를 눌러요.'],
      ['내가 만든 책이 도서관에 등록되나요?', '관리자가 검토한 뒤 등록돼요.'],
      ['저장은 언제 되나요?', '기록할 때마다 자동으로 저장되고, 위쪽에 **저장됨**이 보여요.'],
      ['언어를 바꾸려면요?', '위쪽의 **한국어** / **English**를 눌러요.'],
    ],
  },
  en: {
    title: 'Help',
    lead: 'Set a deadline, and we’ll show you today’s dose every day.',
    note: 'Takes a minute!',
    flow: ['Create a goal', 'Do today’s dose and check it', 'Behind? Redistribute'],
    tabs: ['Getting started', 'Every day', 'Group members', 'Group admins', 'FAQ'],
    tip: 'TIP',
    more: 'Still stuck? Let us know with Contact us.',
    contact: 'Contact us',
    contactSubject: 'Today’s Dose question',
    askTitle: 'What’s confusing or not working?',
    askPlaceholder: 'Tell us which screen you were on and what you were trying to do — it helps us answer faster.',
    askReply: 'We’ll reply to your sign-in email ({email}).',
    askSend: 'Send',
    askSending: 'Sending…',
    askCancel: 'Cancel',
    askEmpty: 'Please write your message.',
    askDone: 'Sent! We’ll check it and reply by email.',
    askFail: 'Couldn’t send. Please try again shortly.',
    askMore: 'Send another',
    shotNote: 'Screenshots show the Korean screens.',
    guides: {
      start: [
        ['start-1-new', 'Create a new goal', ['Tap **+ New goal** at the top right', 'Pick a type (book, course, Bible reading, other) and enter a title', 'Set the start and end dates, then tap **Add goal**'], 'Use the **○ weeks** buttons to set the deadline in one tap.'],
        ['start-2-toc', 'Add a book’s contents', ['Tap **Upload contents photo** and AI fills in chapters and pages', 'Just check the empty fields', 'Enter the last page']],
        ['start-3-rest', 'Set days off', ['Pick your weekly days off', 'Open **More options** and pick specific days off, like events', 'Mark lighter-schedule days to get more on those days']],
      ],
      daily: [
        ['daily-1-today', 'Today’s dose', ['Done? Tap the circle to check it off. Tap again to undo', 'Tap a goal’s name to open its details']],
        ['daily-2-record', 'Did a bit more or less', ['Enter the last page you read (or the chapter you finished)', 'Tap **Log progress**']],
        ['daily-3-behind', 'When you fall behind', ['Check the guide line for how much to do each day', 'Tap **Redistribute** to spread what’s left', 'Tap **Change due date** to change the dates'], 'You’re only marked behind after the day ends. Today’s dose just needs to be done today.'],
        ['daily-4-views', 'View your schedule', ['Tap **List** / **Calendar** to switch views', 'Tap **Export as image** to save the schedule']],
      ],
      member: [
        ['member-1-join', 'Join a group', ['Tap the invite link from your admin, then tap **Join**', 'Or enter the 6-character code on the Groups screen and tap **Join**']],
        ['member-2-plan', 'Plan required reading or viewing', ['On the dashboard, find **From your groups** and tap **Make a plan**', 'Just set the dates. The title and contents are locked']],
        ['member-3-changed', 'When your admin updates an item', ['Tap **Preview changes** in the banner to see what changed', 'Tap **Apply** after checking. Your progress and dates stay the same'], 'Admins only see progress on group items. Your personal goals stay private.'],
      ],
      admin: [
        ['leader-1-create', 'Create a group', ['Enter a group name on the Groups screen', 'Tap **Create**']],
        ['leader-2-invite', 'Invite members', ['Find the invite code in group details', 'Tap **Copy invite link** and send it', 'Tap **New code** to replace the code']],
        ['leader-3-share', 'Share required reading or viewing', ['Tap **+ Share one of my goals**', 'Search your goals and pick one']],
        ['leader-4-progress', 'See member progress', ['Check progress and who’s behind in each item’s table', 'Tap a name to see that person’s schedule']],
      ],
    },
    faq: [
      ['How do I edit or delete a goal?', 'On the goal screen, tap **Edit** or **Delete**.'],
      ['Will a book I add go into the library?', 'Yes, after an admin reviews it.'],
      ['When does it save?', 'Every time you log something, automatically. You’ll see **Saved** at the top.'],
      ['How do I change the language?', 'Tap **한국어** / **English** at the top.'],
    ],
  },
};

/** 도움말 화면 상태: 고른 탭 · 펼친 질문 */
const helpState = { tab: 'start', open: 0, ask: 'closed', draft: '' }; // ask: closed | open | sending | sent

/** 문구의 **굵게** → <b> (나머지는 그대로 이스케이프) */
function helpMd(text) {
  return String(text).split(/(\*\*[^*]+\*\*)/).filter(Boolean)
    .map((x) => (x.startsWith('**') ? `<b>${escapeHtml(x.slice(2, -2))}</b>` : escapeHtml(x))).join('');
}

function rerenderHelpKeepScroll(root) {
  const y = window.scrollY;
  renderHelp(root);
  window.scrollTo(0, y);
}

function renderHelp(root) {
  const T = HELP_TEXT[currentLang] || HELP_TEXT.ko;
  const tab = HELP_TABS.includes(helpState.tab) ? helpState.tab : 'start';
  const flowTabs = ['start', 'daily', 'daily'];

  const guides = tab === 'faq' ? '' : (T.guides[tab] || []).map(([img, title, steps, tip], i) => `
    <article class="help-item">
      <figure class="help-shot"><img src="help/v2/${img}.jpg" alt="${escapeHtml(title)}" loading="lazy"></figure>
      <div class="help-body">
        <div class="help-item-head"><span class="mono">${String(i + 1).padStart(2, '0')}</span><h2>${escapeHtml(title)}</h2></div>
        <ol class="help-steps">${steps.map((s, k) => `<li><span class="help-num">${k + 1}</span><span>${helpMd(s)}</span></li>`).join('')}</ol>
        ${tip ? `<div class="help-tip"><span>${T.tip}</span><span>${helpMd(tip)}</span></div>` : ''}
      </div>
    </article>`).join('');

  const faq = tab !== 'faq' ? '' : `
    <section class="help-faq">
      ${T.faq.map(([q, a], i) => {
        const open = helpState.open === i;
        return `
          <div class="help-faq-item ${open ? 'is-open' : ''}">
            <button type="button" class="help-faq-q" data-faq="${i}" aria-expanded="${open}">
              <span><span class="help-q">Q</span><b>${escapeHtml(q)}</b></span>
              <span class="help-faq-icon" aria-hidden="true">${open ? '−' : '+'}</span>
            </button>
            ${open ? `<p class="help-faq-a">${helpMd(a)}</p>` : ''}
          </div>`;
      }).join('')}
    </section>`;

  const email = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) || '';
  const ask = helpState.ask;
  const contactBox = ask === 'closed'
    ? `<div class="help-more">
        <span>${escapeHtml(T.more)}</span>
        <button type="button" class="btn btn-small btn-outline" data-help-ask="open">${escapeHtml(T.contact)}</button>
      </div>`
    : ask === 'sent'
      ? `<div class="help-more help-ask is-sent">
          <span class="hand-note hand-sm">${escapeHtml(T.askDone)}</span>
          <button type="button" class="link-btn" data-help-ask="open">${escapeHtml(T.askMore)}</button>
        </div>`
      : `<form class="help-ask" id="help-ask">
          <label class="help-ask-title" for="help-ask-text">${escapeHtml(T.askTitle)}</label>
          <textarea id="help-ask-text" class="gf-input gf-textarea" rows="5" maxlength="2000" placeholder="${escapeHtml(T.askPlaceholder)}" ${ask === 'sending' ? 'disabled' : ''}>${escapeHtml(helpState.draft)}</textarea>
          <div class="help-ask-foot">
            <span class="muted small">${email ? escapeHtml(T.askReply.replace('{email}', email)) : ''}</span>
            <span class="help-ask-err" id="help-ask-err" hidden></span>
            <button type="button" class="btn btn-small btn-outline-muted" data-help-ask="closed" ${ask === 'sending' ? 'disabled' : ''}>${escapeHtml(T.askCancel)}</button>
            <button type="submit" class="btn btn-small btn-dark" ${ask === 'sending' ? 'disabled' : ''}>${escapeHtml(ask === 'sending' ? T.askSending : T.askSend)}</button>
          </div>
        </form>`;
  root.innerHTML = `
    <div id="help-page" class="help">
      <div class="help-head">
        <div class="help-head-text">
          <h1>${escapeHtml(T.title)}</h1>
          <p>${escapeHtml(T.lead)}</p>
        </div>
        <span class="hand-note">${escapeHtml(T.note)}</span>
      </div>

      <div class="help-flow">
        ${T.flow.map((label, i) => `
          <button type="button" class="help-flow-step is-${i + 1}" data-help-tab="${flowTabs[i]}">
            <span class="help-flow-n">${i + 1}</span><b>${escapeHtml(label)}</b>${i < 2 ? '<span class="help-flow-arrow" aria-hidden="true">→</span>' : ''}
          </button>`).join('')}
      </div>

      <div class="help-tabs" role="tablist">
        ${HELP_TABS.map((k, i) => `<button type="button" role="tab" class="help-tab ${k === tab ? 'is-active' : ''}" aria-selected="${k === tab}" data-help-tab="${k}">${escapeHtml(T.tabs[i])}</button>`).join('')}
      </div>

      ${guides ? `<div class="help-items">${guides}</div>` : faq}
      ${guides && T.shotNote ? `<p class="muted small">${escapeHtml(T.shotNote)}</p>` : ''}

      ${contactBox}
    </div>`;

  const page = root.querySelector('#help-page');
  const askText = page.querySelector('#help-ask-text');
  if (askText) {
    askText.addEventListener('input', () => { helpState.draft = askText.value; });
    if (ask === 'open') askText.focus({ preventScroll: true });
  }
  const askForm = page.querySelector('#help-ask');
  if (askForm) {
    askForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = askText.value.trim();
      const err = page.querySelector('#help-ask-err');
      if (!message) { err.textContent = T.askEmpty; err.hidden = false; askText.focus(); return; }
      helpState.draft = message;
      helpState.ask = 'sending';
      rerenderHelpKeepScroll(root);
      try {
        await sendInquiry(message, `help/${helpState.tab}`);
        helpState.ask = 'sent';
        helpState.draft = '';
      } catch (ex) {
        console.warn('[help] 문의 보내기 실패:', ex);
        helpState.ask = 'open';
        rerenderHelpKeepScroll(root);
        const e2 = root.querySelector('#help-ask-err');
        if (e2) { e2.textContent = T.askFail; e2.hidden = false; }
        return;
      }
      rerenderHelpKeepScroll(root);
    });
  }

  page.addEventListener('click', (e) => {
    const askBtn = e.target.closest('[data-help-ask]');
    if (askBtn) {
      helpState.ask = askBtn.dataset.helpAsk;
      rerenderHelpKeepScroll(root);
      return;
    }
    const tabBtn = e.target.closest('[data-help-tab]');
    if (tabBtn) {
      helpState.tab = tabBtn.dataset.helpTab;
      helpState.open = 0;
      const y = window.scrollY;
      renderHelp(root);
      window.scrollTo(0, y);
      return;
    }
    const q = e.target.closest('[data-faq]');
    if (q) {
      const i = Number(q.dataset.faq);
      helpState.open = helpState.open === i ? -1 : i;
      renderHelp(root);
    }
  });
}
