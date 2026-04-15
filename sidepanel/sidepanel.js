/**
 * Side Panel 메인 로직
 */

// ── 확장 프로그램 하드코딩 설정 (개발자용) ─────────────────────
// 보안을 위해 API Key 노출을 제거하고, Edge Function 주소 하나로 통합 관리합니다.
const CONFIG = {
  // Edge Function 배포 후 얻게 될 API 호스팅 주소입니다.
  EDGE_FUNCTION_URL: 'https://jkqkjjchhesuyvjbwzqk.supabase.co/functions/v1/boj-api',
};

// ── 언어 설정 (Wandbox API 기준) ──────────────────────────────
const WANDBOX_CONFIG = {
  cpp17: { compiler: 'gcc-13.2.0', options: '-std=c++17' },
  cpp14: { compiler: 'gcc-13.2.0', options: '-std=c++14' },
  python3: { compiler: 'cpython-3.12.7', options: '' },
  java: { compiler: 'openjdk-jdk-22+36', options: '' },
  javascript: { compiler: 'nodejs-20.17.0', options: '' },
  c: { compiler: 'gcc-13.2.0-c', options: '' },
  kotlin: { compiler: null, options: '' }, // Wandbox 미지원
  go: { compiler: 'go-1.23.2', options: '' },
  rust: { compiler: 'rust-1.82.0', options: '' },
  ruby: { compiler: 'ruby-3.3.11', options: '' },
};

// ── 상태 ──────────────────────────────────────────────────────
let problemData = null;
let hiddenCases = [];   // AI 생성 + 커뮤니티 케이스 병합
let settings = {};

// AI API Key는 메모리(세션)에만 보관 — 디스크 미저장, 동기화 없음
const SESSION_KEY_NAME = 'boj_never_die_api_key';

// ── DOM 참조 ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const dom = {
  reloadBtn: $('reloadBtn'),
  problemBadge: $('problemBadge'),
  problemInfo: $('problemInfo'),
  problemTitle: $('problemTitle'),
  timeLimit: $('timeLimit'),
  memLimit: $('memLimit'),
  tcCount: $('tcCount'),
  noProblem: $('noProblem'),
  // 채점
  langSelect: $('langSelect'),
  runBtn: $('runBtn'),
  codeEditor: $('codeEditor'),
  editorLines: $('editorLines'),
  judgeProgress: $('judgeProgress'),
  progressFill: $('progressFill'),
  progressLabel: $('progressLabel'),
  resultSummary: $('resultSummary'),
  resultList: $('resultList'),
  // 히든
  aiProviderSelect: $('aiProviderSelect'),
  aiKeyInput: $('aiKeyInput'),
  generateBtn: $('generateBtn'),
  aiStatus: $('aiStatus'),
  loadCommunityBtn: $('loadCommunityBtn'),
  communityList: $('communityList'),
  // 피드백
  fbInput: $('fbInput'),
  fbOutput: $('fbOutput'),
  fbDesc: $('fbDesc'),
  fbAuthor: $('fbAuthor'),
  fbStatus: $('fbStatus'),
  submitFbBtn: $('submitFbBtn'),
  // 설정
  settingsAiProvider: $('settingsAiProvider'),
  settingsAiKey: $('settingsAiKey'),
  settingsTimeout: $('settingsTimeout'),
  settingsTrimOutput: $('settingsTrimOutput'),
  settingsIgnoreCase: $('settingsIgnoreCase'),
  saveSettingsBtn: $('saveSettingsBtn'),
  settingsStatus: $('settingsStatus'),
};

// ══════════════════════════════════════════════════════════════
//  초기화
// ══════════════════════════════════════════════════════════════
async function init() {
  await loadSettings();
  setupEditor();
  setupTabs();
  setupEventListeners();
  await refreshProblemData();
}

// ══════════════════════════════════════════════════════════════
//  설정 불러오기 / 저장
// ══════════════════════════════════════════════════════════════

// AI Key 패널이 열린 동안만 sessionStorage에 보관
function getSessionApiKey() {
  return sessionStorage.getItem(SESSION_KEY_NAME) || '';
}
function setSessionApiKey(key) {
  if (key) sessionStorage.setItem(SESSION_KEY_NAME, key);
  else sessionStorage.removeItem(SESSION_KEY_NAME);
}

async function loadSettings() {
  // API Key를 제외한 환경 설정만 chrome.storage.sync에서 불러옵니다.
  settings = await chrome.storage.sync.get({
    aiProvider: 'claude',
    timeout: 10,
    trimOutput: true,
    ignoreCase: false,
  });
  dom.settingsAiProvider.value = settings.aiProvider;
  dom.settingsTimeout.value = settings.timeout;
  dom.settingsTrimOutput.checked = settings.trimOutput;
  dom.settingsIgnoreCase.checked = settings.ignoreCase;

  // 세션에 저장된 키가 있으면 마스킹 표시, 없으면 빈칸
  const savedKey = getSessionApiKey();
  dom.settingsAiKey.value = savedKey ? '●'.repeat(20) : '';
  dom.settingsAiKey.placeholder = savedKey
    ? '키가 세션에 저장되어 있음 (새로 입력 시 덮어쓸)'
    : 'API Key 입력 (탭을 닫으면 자동 삭제)';

  // 히든 탭 제공자/키 입력란 동기화
  dom.aiProviderSelect.value = settings.aiProvider;
  // 키 값 자체는 표시 안 함 — 이후 getSessionApiKey()로만 사용
}

async function saveSettings() {
  // AI Key: 자판 문자라면 이미 저장된 키 유지, 새로 입력 시에만 갱신
  const rawInput = dom.settingsAiKey.value.trim();
  const isMasked = rawInput === '●'.repeat(20) || rawInput === '';
  if (!isMasked) {
    setSessionApiKey(rawInput);
  }

  // API Key를 제외한 나머지 환경 설정만 영구 저장
  settings = {
    aiProvider: dom.settingsAiProvider.value,
    timeout: parseInt(dom.settingsTimeout.value) || 10,
    trimOutput: dom.settingsTrimOutput.checked,
    ignoreCase: dom.settingsIgnoreCase.checked,
  };
  await chrome.storage.sync.set(settings);

  dom.aiProviderSelect.value = settings.aiProvider;
  // 마스링 다시 표시
  const saved = getSessionApiKey();
  dom.settingsAiKey.value = saved ? '●'.repeat(20) : '';

  setStatus(dom.settingsStatus, '✅ 저장 완료 (키는 탭을 닫으면 자동 삭제됩니다)', 'ok');
  updateButtonStates();
}

// ══════════════════════════════════════════════════════════════
//  문제 데이터 로드
// ══════════════════════════════════════════════════════════════
async function refreshProblemData() {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_PROBLEM_DATA' }, resolve);
    });

    if (!response || response.error || !response.problemNumber) {
      showNoProblem(response?.error);
      return;
    }

    problemData = response;
    renderProblemInfo();
    updateButtonStates();
    hiddenCases = [];
    dom.resultList.innerHTML = '';
    dom.resultSummary.classList.add('hidden');
    dom.communityList.innerHTML = '';

  } catch (e) {
    showNoProblem('문제 데이터를 가져오는 중 오류 발생');
  }
}

function renderProblemInfo() {
  dom.problemBadge.textContent = `#${problemData.problemNumber}`;
  dom.problemBadge.classList.remove('hidden');
  dom.problemTitle.textContent = problemData.title;
  dom.timeLimit.textContent = `⏱ ${problemData.timeLimit}`;
  dom.memLimit.textContent = `💾 ${problemData.memLimit}`;
  updateCaseCountBadge();
  dom.problemInfo.classList.remove('hidden');
  dom.noProblem.classList.add('hidden');
}

function showNoProblem(msg) {
  problemData = null;
  dom.problemInfo.classList.add('hidden');
  dom.problemBadge.classList.add('hidden');
  dom.noProblem.classList.remove('hidden');
  if (msg) dom.noProblem.querySelector('p').textContent = msg;
  updateButtonStates();
}

function updateCaseCountBadge() {
  if (!problemData) return;
  const tcLen = problemData.testCases.length;
  const dbLen = hiddenCases.filter(c => c.source === 'community').length;
  const aiLen = hiddenCases.filter(c => c.source === 'ai').length;

  let text = `📝 예제 ${tcLen}개`;
  if (dbLen > 0) text += ` + DB ${dbLen}개`;
  if (aiLen > 0) text += ` + AI ${aiLen}개`;
  dom.tcCount.textContent = text;
}

// ══════════════════════════════════════════════════════════════
//  탭 전환
// ══════════════════════════════════════════════════════════════
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      $(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  에디터 라인 넘버
// ══════════════════════════════════════════════════════════════
function setupEditor() {
  function updateLines() {
    const lines = dom.codeEditor.value.split('\n').length;
    dom.editorLines.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  }

  dom.codeEditor.addEventListener('input', updateLines);
  dom.codeEditor.addEventListener('scroll', () => {
    dom.editorLines.scrollTop = dom.codeEditor.scrollTop;
  });

  // 붙여넣기 시 일어나는 포맷팅 문제 방지 (순수 텍스트로 보정)
  dom.codeEditor.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    const start = dom.codeEditor.selectionStart;
    const end = dom.codeEditor.selectionEnd;
    const val = dom.codeEditor.value;
    dom.codeEditor.value = val.substring(0, start) + text + val.substring(end);
    dom.codeEditor.selectionStart = dom.codeEditor.selectionEnd = start + text.length;
    updateLines();
    updateButtonStates();
  });

  // IDE와 같은 단축키/작성 경험 제공
  dom.codeEditor.addEventListener('keydown', e => {
    const start = dom.codeEditor.selectionStart;
    const end = dom.codeEditor.selectionEnd;
    const val = dom.codeEditor.value;

    // 1. 탭(Tab) 키 처리 (다중 라인 들여쓰기 포함)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (start === end) {
        dom.codeEditor.value = val.substring(0, start) + '    ' + val.substring(end);
        dom.codeEditor.selectionStart = dom.codeEditor.selectionEnd = start + 4;
      } else {
        // 다중 라인 선택 시 전체 들여쓰기
        const selectedText = val.substring(start, end);
        const lines = selectedText.split('\n');
        let newSelectionStart = start;
        let newSelectionEnd = end;

        if (e.shiftKey) {
          // 내어쓰기(Shift+Tab)
          const newLines = lines.map(line => line.startsWith('    ') ? line.substring(4) : (line.startsWith('\t') ? line.substring(1) : line));
          const newText = newLines.join('\n');
          dom.codeEditor.value = val.substring(0, start) + newText + val.substring(end);
          newSelectionEnd = start + newText.length;
        } else {
          // 들여쓰기(Tab)
          const newText = lines.map(line => '    ' + line).join('\n');
          dom.codeEditor.value = val.substring(0, start) + newText + val.substring(end);
          newSelectionEnd = start + newText.length;
        }
        dom.codeEditor.selectionStart = start;
        dom.codeEditor.selectionEnd = newSelectionEnd;
      }
      updateLines();
    }
    // 2. 자동 들여쓰기 (Enter)
    else if (e.key === 'Enter') {
      e.preventDefault();
      // 현재 줄의 앞부분 공백을 찾음
      const beforeCursor = val.substring(0, start);
      const lastLine = beforeCursor.split('\n').pop() || '';
      const match = lastLine.match(/^(\s+)/);
      let indent = match ? match[1] : '';

      // 만약 여는 괄호 {, (, [ 로 끝났다면 들여쓰기 1레벨(공백 4칸) 추가
      if (/[{\[(]\s*$/.test(lastLine)) {
        indent += '    ';
      }

      dom.codeEditor.value = val.substring(0, start) + '\n' + indent + val.substring(end);
      dom.codeEditor.selectionStart = dom.codeEditor.selectionEnd = start + 1 + indent.length;

      // 만약 블록 사이에 빈 줄을 넣는 거라면(예: { | }) 바로 닫는 괄호 줄 맞춤
      const nextChar = val.substring(end, end + 1);
      if (lastLine.trim().endsWith('{') && nextChar === '}') {
        const outerIndent = match ? match[1] : '';
        dom.codeEditor.value = dom.codeEditor.value.substring(0, dom.codeEditor.selectionStart) + '\n' + outerIndent + val.substring(end);
        dom.codeEditor.selectionEnd -= (outerIndent.length + 1); // 닫는 괄호를 다음 줄로 보내고 커서는 가운데 유지
      }
      updateLines();
    }
    // 3. 괄호/따옴표 자동 닫기
    else if (['{', '(', '[', '"', "'"].includes(e.key)) {
      const pairs = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'" };
      const closeChar = pairs[e.key];

      // 블록 지정 안 된 상태에서만 괄호 닫아줌
      if (start === end) {
        e.preventDefault();
        dom.codeEditor.value = val.substring(0, start) + e.key + closeChar + val.substring(end);
        dom.codeEditor.selectionStart = dom.codeEditor.selectionEnd = start + 1;
        updateLines();
      }
    }
    // 4. 닫는 괄호 타건 시 스킵
    else if (['}', ')', ']', '"', "'"].includes(e.key)) {
      const nextChar = val.substring(start, start + 1);
      if (nextChar === e.key && start === end) {
        e.preventDefault();
        dom.codeEditor.selectionStart = dom.codeEditor.selectionEnd = start + 1;
      }
    }
    // 5. 백스페이스로 빈 괄호 쌍 지우기
    else if (e.key === 'Backspace' && start === end && start > 0) {
      const prevChar = val.substring(start - 1, start);
      const nextChar = val.substring(start, start + 1);
      const pairs = ['{}', '()', '[]', '""', "''"];
      if (pairs.includes(prevChar + nextChar)) {
        e.preventDefault();
        dom.codeEditor.value = val.substring(0, start - 1) + val.substring(start + 1);
        dom.codeEditor.selectionStart = dom.codeEditor.selectionEnd = start - 1;
        updateLines();
      }
    }

    // 키보드 입력 및 치환으로 값이 변경되었을 가능성이 있으므로 버튼 상태 갱신
    updateButtonStates();
  });

  updateLines();
}

// ══════════════════════════════════════════════════════════════
//  버튼 이벤트 연결
// ══════════════════════════════════════════════════════════════
function setupEventListeners() {
  dom.reloadBtn.addEventListener('click', refreshProblemData);
  dom.runBtn.addEventListener('click', runJudge);
  dom.generateBtn.addEventListener('click', generateHiddenCases);
  dom.loadCommunityBtn.addEventListener('click', loadCommunityCases);
  dom.submitFbBtn.addEventListener('click', submitFeedback);
  dom.saveSettingsBtn.addEventListener('click', saveSettings);

  // AI 키/제공자 변경 -> generateBtn 상태 수시 업데이트
  // 히든 탭의 짧은 키 입력란: 키를 sessionStorage에 바로 쓰고 비활성화된 버튼 업데이트
  dom.aiKeyInput.addEventListener('input', () => {
    const val = dom.aiKeyInput.value.trim();
    if (val) setSessionApiKey(val);
    updateButtonStates();
  });
  // 설정 탭의 키 입력란: 카운트 업데이트만 (저장은 saveSettings에서)
  dom.settingsAiKey.addEventListener('input', () => {
    updateButtonStates();
  });
  dom.aiProviderSelect.addEventListener('change', () => {
    dom.settingsAiProvider.value = dom.aiProviderSelect.value;
  });
  dom.settingsAiProvider.addEventListener('change', () => {
    dom.aiProviderSelect.value = dom.settingsAiProvider.value;
  });
}

function updateButtonStates() {
  const hasProblem = !!problemData;
  const hasCode = dom.codeEditor.value.trim().length > 0;
  const aiKeyVal = dom.aiKeyInput.value.trim() || getSessionApiKey();
  const hasAiKey = !!aiKeyVal;

  // Edge Function 연결 여부가 있으면 허용
  const hasSupabase = !!CONFIG.EDGE_FUNCTION_URL;

  dom.runBtn.disabled = !(hasProblem && hasCode);
  dom.generateBtn.disabled = !(hasProblem && hasAiKey);
  dom.loadCommunityBtn.disabled = !hasProblem;
  dom.submitFbBtn.disabled = !hasProblem;
}

dom.codeEditor.addEventListener('input', updateButtonStates);

// ══════════════════════════════════════════════════════════════
//  Wandbox API 코드 실행
// ══════════════════════════════════════════════════════════════
async function callExecute(langKey, code, stdin) {
  const cfg = WANDBOX_CONFIG[langKey];
  if (!cfg || !cfg.compiler) {
    throw new Error(`${langKey} 언어는 현재 연결된 무료 컴파일러(Wandbox)에서 지원하지 않습니다.`);
  }

  // Java의 경우 Wandbox 가상 파일명(prog.java)과 일치해야 하므로 public 제한자를 제거하여 컴파일 에러 우회
  let finalCode = code;
  if (langKey === 'java') {
    finalCode = finalCode.replace(/public\s+class\s+/g, 'class ');
  }

  const resp = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler: cfg.compiler,
      code: finalCode,
      stdin: stdin ?? '',
      'compiler-option-raw': cfg.options
    }),
  });

  if (!resp.ok) throw new Error(`컴파일러 API 오류: ${resp.status}`);
  const data = await resp.json();

  // Piston 응답 객체와 유사하게 포맷팅하여 하위 로직 파손 방지
  return {
    compile: {
      output: data.compiler_error || data.compiler_message || '',
      code: parseInt(data.status) !== 0 && !data.program_message ? 1 : 0
    },
    run: {
      stdout: data.program_output || '',
      stderr: data.program_error || '',
      code: parseInt(data.status) === 0 ? 0 : 1,
      signal: data.signal || null
    }
  };
}

// ══════════════════════════════════════════════════════════════
//  출력 비교
// ══════════════════════════════════════════════════════════════
function normalize(str) {
  let s = str ?? '';
  if (settings.trimOutput) s = s.trim();
  if (settings.ignoreCase) s = s.toLowerCase();
  return s;
}

function compareOutput(actual, expected) {
  return normalize(actual) === normalize(expected);
}

// ══════════════════════════════════════════════════════════════
//  채점 실행 (예제 케이스 + 커뮤니티 + AI 히든 케이스 통합)
// ══════════════════════════════════════════════════════════════
async function runJudge() {
  if (!problemData || !dom.codeEditor.value.trim()) return;

  const baseCases = problemData.testCases.map((tc, idx) => ({ ...tc, label: `예제 ${idx + 1}` }));
  const commCases = hiddenCases.filter(c => c.source === 'community').map((tc, idx) => ({ ...tc, label: `DB 케이스 ${idx + 1}` }));
  const aiCases = hiddenCases.filter(c => c.source === 'ai').map((tc, idx) => ({ ...tc, label: `AI 케이스 ${idx + 1}` }));

  const allCases = [...baseCases, ...commCases, ...aiCases];

  await judgeTestCases(
    allCases,
    dom.codeEditor.value,
    dom.langSelect.value,
    dom.resultList,
    dom.resultSummary,
    dom.judgeProgress,
    dom.progressFill,
    dom.progressLabel,
    ''
  );
}

async function judgeTestCases(cases, code, langKey, listEl, summaryEl, progressEl, fillEl, labelEl, prefix) {
  listEl.innerHTML = '';
  if (summaryEl) summaryEl.classList.add('hidden');

  const total = cases.length;
  if (total === 0) {
    listEl.innerHTML = '<p style="color:var(--text2);font-size:12px;padding:8px">테스트케이스가 없습니다.</p>';
    return;
  }

  if (progressEl) {
    progressEl.classList.remove('hidden');
    fillEl.style.width = '0%';
    labelEl.textContent = `0 / ${total} 채점 중…`;
  }

  let passCount = 0;
  const results = [];

  for (let i = 0; i < total; i++) {
    const tc = cases[i];
    if (progressEl) {
      fillEl.style.width = `${((i) / total) * 100}%`;
      labelEl.textContent = `${i + 1} / ${total} 채점 중…`;
    }

    let status = 'error', actual = '', execTime = 0;
    try {
      const start = Date.now();
      const res = await callExecute(langKey, code, tc.input);
      execTime = Date.now() - start;
      const runRes = res.run || res.compile;

      if (res.compile && res.compile.code !== 0) {
        status = 'error';
        actual = res.compile.stderr || res.compile.output || '컴파일 오류';
      } else if (runRes.code === null && runRes.signal === 'SIGKILL') {
        status = 'tle';
        actual = '시간 초과';
      } else {
        actual = runRes.stdout || '';
        const stderr = runRes.stderr || '';
        if (runRes.code !== 0 && !actual) {
          status = 'error';
          actual = stderr || `런타임 오류 (exit ${runRes.code})`;
        } else {
          status = compareOutput(actual, tc.output) ? 'pass' : 'fail';
        }
      }
    } catch (e) {
      status = 'error';
      actual = e.message;
    }

    if (status === 'pass') passCount++;
    results.push({ tc, status, actual, execTime, index: i + 1 });

    // 카드 렌더링
    listEl.appendChild(makeResultCard(results[results.length - 1], prefix));
  }

  if (progressEl) {
    fillEl.style.width = '100%';
    labelEl.textContent = `완료: ${passCount} / ${total} 통과`;
    setTimeout(() => progressEl.classList.add('hidden'), 1500);
  }

  if (summaryEl) {
    summaryEl.classList.remove('hidden', 'all-pass', 'some-fail', 'error');
    if (passCount === total) {
      summaryEl.classList.add('all-pass');
      summaryEl.textContent = `🎉 모두 통과! (${passCount} / ${total})`;
    } else {
      summaryEl.classList.add('some-fail');
      summaryEl.textContent = `${passCount} / ${total} 통과 — ${total - passCount}개 실패`;
    }
  }
}

function makeResultCard({ tc, status, actual, execTime, index }, prefix) {
  const statusMap = { pass: ['status-pass', '✅ 통과'], fail: ['status-fail', '❌ 오답'], error: ['status-error', '⚠️ 오류'], tle: ['status-tle', '⏰ TLE'] };
  const [cls, label] = statusMap[status] || ['status-error', '오류'];

  const card = document.createElement('div');
  card.className = 'result-card';
  card.innerHTML = `
    <div class="result-card-header">
      <span class="result-label">${tc.label || (prefix + ' ' + index)}${tc.description ? ` — ${tc.description}` : ''}</span>
      <span class="result-status ${cls}">${label}</span>
    </div>
    <div class="result-card-body">
      <div class="result-grid${status === 'fail' ? ' result-grid-3' : ''}">
        <div>
          <div class="code-block-label">입력</div>
          <div class="code-block">${escHtml(tc.input)}</div>
        </div>
        <div>
          <div class="code-block-label">기댓값</div>
          <div class="code-block">${escHtml(tc.output)}</div>
        </div>
        ${status === 'fail' ? `<div>
          <div class="code-block-label">실제 출력</div>
          <div class="code-block">${escHtml(actual)}</div>
        </div>` : ''}
        ${status === 'error' || status === 'tle' ? `<div>
          <div class="code-block-label">오류 내용</div>
          <div class="code-block">${escHtml(actual)}</div>
        </div>` : ''}
      </div>
      <div class="exec-time">⏱ ${execTime}ms</div>
    </div>
  `;

  card.querySelector('.result-card-header').addEventListener('click', () => {
    card.querySelector('.result-card-body').classList.toggle('open');
  });
  return card;
}

// ══════════════════════════════════════════════════════════════
//  AI API - 히든 테스트케이스 생성 (Claude, Gemini, OpenAI)
// ══════════════════════════════════════════════════════════════
async function generateHiddenCases() {
  const key = dom.aiKeyInput.value.trim() || getSessionApiKey();
  const provider = dom.aiProviderSelect.value || 'claude';
  if (!key || !problemData) return;

  setStatus(dom.aiStatus, `🤖 ${provider}이(가) 히든 케이스를 생성 중…`, 'loading');
  dom.generateBtn.disabled = true;

  try {
    const prompt = buildHiddenCasePrompt(problemData);
    let text = '';

    const executeProviderWithFallback = async (fetcherFn, models) => {
      let lastErr = null;
      for (const model of models) {
        try {
          return await fetcherFn(model);
        } catch (e) {
          // 상태 코드가 포함된 에러(429, 503, 500 등)거나 할당량 만료일 경우 다음 모델로 넘어감
          if (e.message.includes('429') || e.message.includes('503') || e.message.includes('500') || e.message.includes('초과') || e.message.includes('Quota')) {
            lastErr = e;
            setStatus(dom.aiStatus, `⚠️ ${model} 한도 초과/오류. 대체 모델 시도 중…`, 'loading');
            continue;
          }
          throw e; // API 키 오류 등은 즉시 종료
        }
      }
      throw new Error(lastErr?.message || '모든 대체 모델 요청에 실패했습니다.');
    };

    if (provider === 'claude') {
      text = await executeProviderWithFallback(async (model) => {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error?.message || `Claude API 오류 ${resp.status}`);
        }
        const data = await resp.json();
        return data.content?.[0]?.text ?? '';
      }, ['claude-sonnet-4-5-20250929', 'claude-haiku-4-5@20251001']);

    } else if (provider === 'gemini') {
      text = await executeProviderWithFallback(async (model) => {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2048 }
          }),
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error?.message || `Gemini API 오류 ${resp.status}`);
        }
        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      }, ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemma-4-31b']);

    } else if (provider === 'openai') {
      text = await executeProviderWithFallback(async (model) => {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }]
          }),
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error?.message || `OpenAI API 오류 ${resp.status}`);
        }
        const data = await resp.json();
        return data.choices?.[0]?.message?.content ?? '';
      }, ['gpt-oss-120b', 'gpt-oss-20b']);
    }

    const parsed = parseHiddenCases(text);

    if (!parsed.length) throw new Error('케이스를 파싱하지 못했습니다. 다시 시도하세요.');

    // 기존 AI 케이스 대체
    hiddenCases = hiddenCases.filter(c => c.source === 'community');
    hiddenCases.push(...parsed.map(c => ({ ...c, source: 'ai' })));

    updateCaseCountBadge();
    setStatus(dom.aiStatus, `✅ ${parsed.length}개 생성 완료! 채점 탭에서 함께 실행됩니다.`, 'ok');

    // 생성 완료 시 채점 탭으로 자동 이동
    document.querySelector('.tab-btn[data-tab="judge"]').click();

  } catch (e) {
    setStatus(dom.aiStatus, `❌ ${e.message}`, 'err');
  } finally {
    dom.generateBtn.disabled = false;
    updateButtonStates();
  }
}

function buildHiddenCasePrompt(p) {
  const examples = p.testCases.map((tc, i) =>
    `예제 ${i + 1}\n**입력**\n\`\`\`\n${tc.input}\n\`\`\`\n**출력**\n\`\`\`\n${tc.output}\n\`\`\``
  ).join('\n\n');

  return `다음 백준 알고리즘 문제에 대한 히든 테스트케이스를 5개 생성해주세요.

문제 번호: ${p.problemNumber}
제목: ${p.title}

[문제 설명]
${p.description}

[입력 형식]
${p.inputDesc}

[출력 형식]
${p.outputDesc}

[제약 조건]
${p.conditionDesc}

[기존 예제]
${examples}

다음 유형을 포함해서 만들어주세요:
- 최솟값/최댓값 경계 케이스
- 예외적인 입력 패턴
- 큰 입력 (성능 테스트)
- 일반적인 케이스

**답변은 반드시 다음 형식으로만 5개의 케이스를 작성해 줘. 문제에 적합한 테스트케이스인지를 단계적으로 검증한 뒤 답변해줘. (제발 다른 설명은 쓰지 말고 아래 형식의 코드 블록 쌍만 반복해줘. JSON 쓰지 마.)**

**입력**
\`\`\`
입력값
\`\`\`
**출력**
\`\`\`
기대출력값
\`\`\`
`;
}

function parseHiddenCases(text) {
  // ``` 블록 단위로 독립 추출 (첫 번째는 입력, 두 번째는 출력 쌍으로 인식)
  const blockRegex = /```(?:[a-zA-Z]*)\n([\s\S]*?)```/g;
  let match;
  const blocks = [];
  while ((match = blockRegex.exec(text)) !== null) {
    blocks.push(match[1].trim() + '\n');
  }

  const newCases = [];
  for (let i = 0; i < blocks.length; i += 2) {
    if (i + 1 < blocks.length) {
      newCases.push({
        input: blocks[i],
        output: blocks[i + 1]
      });
    }
  }

  return newCases;
}

// ══════════════════════════════════════════════════════════════
//  Supabase Edge Functions - 커뮤니티 케이스
// ══════════════════════════════════════════════════════════════
async function loadCommunityCases() {
  const edgeUrl = CONFIG.EDGE_FUNCTION_URL;

  if (!edgeUrl || !problemData) {
    dom.communityList.innerHTML = '<div class="status-msg">설정된 Edge Function 주소가 없습니다.</div>';
    return;
  }

  dom.loadCommunityBtn.disabled = true;
  dom.communityList.innerHTML = '<div class="status-msg loading">불러오는 중…</div>';

  try {
    const url = `${edgeUrl}?problem_number=${problemData.problemNumber}`;
    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) throw new Error(`서버 오류: ${resp.status}`);
    const rows = await resp.json();

    hiddenCases = hiddenCases.filter(c => c.source === 'ai');
    hiddenCases.push(...rows.map(r => ({
      id: r.id,
      input: r.input,
      output: r.expected_output,
      description: r.description,
      votes: r.votes,
      source: 'community',
    })));

    updateCaseCountBadge();
    if (rows.length === 0) {
      dom.communityList.innerHTML = '<div class="status-msg">아직 제출된 케이스가 없습니다.</div>';
    } else {
      dom.communityList.innerHTML = `<div class="status-msg ok">✅ ${rows.length}개 불러오기 완료! 채점 탭에서 함께 실행됩니다.</div>`;
    }

  } catch (e) {
    dom.communityList.innerHTML = `<p style="color:var(--red);font-size:12px">❌ ${e.message}</p>`;
  } finally {
    dom.loadCommunityBtn.disabled = false;
  }
}



// ══════════════════════════════════════════════════════════════
//  피드백 제출
// ══════════════════════════════════════════════════════════════
async function submitFeedback() {
  if (!problemData) return;

  const input = dom.fbInput.value.trim();
  const output = dom.fbOutput.value.trim();
  if (!input || !output) {
    setStatus(dom.fbStatus, '❌ 입력값과 기댓값을 모두 입력해주세요.', 'err');
    return;
  }
  const edgeUrl = CONFIG.EDGE_FUNCTION_URL;

  if (!edgeUrl) {
    setStatus(dom.fbStatus, '서버 연결에 실패했습니다. 개발자에게 문의하세요.', 'err');
    return;
  }

  dom.submitFbBtn.disabled = true;
  setStatus(dom.fbStatus, '전송 중…', 'loading');

  try {
    const resp = await fetch(edgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem_number: problemData.problemNumber,
        input: dom.fbInput.value,
        expected_output: dom.fbOutput.value,
        description: dom.fbDesc.value.trim() || null,
        submitted_by: dom.fbAuthor.value.trim() || 'anonymous',
      }),
    });
    if (!resp.ok) throw new Error(`서버 오류: ${resp.status}`);

    setStatus(dom.fbStatus, '✅ 제출 완료! 기여해주셔서 감사합니다.', 'ok');
    dom.fbInput.value = dom.fbOutput.value = dom.fbDesc.value = '';

  } catch (e) {
    setStatus(dom.fbStatus, `❌ ${e.message}`, 'err');
  } finally {
    dom.submitFbBtn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════
//  유틸
// ══════════════════════════════════════════════════════════════
function escHtml(str) {
  return (str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setStatus(el, msg, type) {
  el.textContent = msg;
  el.className = `status-msg ${type || ''}`;
  if (type === 'ok' || type === 'err') {
    setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 4000);
  }
}

// ══════════════════════════════════════════════════════════════
//  실행
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);
