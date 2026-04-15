/**
 * BOJ 문제 페이지에서 문제 데이터 추출
 */
function extractProblemData() {
  const url = window.location.href;
  const problemNumber = url.match(/\/problem\/(\d+)/)?.[1];
  if (!problemNumber) return null;

  // 문제 기본 정보
  const title = document.querySelector('#problem_title')?.textContent?.trim() ?? '알 수 없음';

  // 제한 정보 (테이블 파싱)
  const limitCells = document.querySelectorAll('.col-md-12 table tbody tr td');
  const timeLimit  = limitCells[0]?.textContent?.trim() ?? '';
  const memLimit   = limitCells[1]?.textContent?.trim() ?? '';

  // 문제 본문 텍스트 (Claude에게 넘길 용도, innerHTML 아닌 textContent)
  const description    = document.querySelector('#problem_description')?.textContent?.trim() ?? '';
  const inputDesc      = document.querySelector('#problem_input')?.textContent?.trim() ?? '';
  const outputDesc     = document.querySelector('#problem_output')?.textContent?.trim() ?? '';
  const conditionDesc  = document.querySelector('#problem_limit')?.textContent?.trim() ?? '';

  // 예제 입출력 전부 수집
  const testCases = [];
  for (let i = 1; i <= 20; i++) {
    const inputEl  = document.querySelector(`#sample-input-${i}`);
    const outputEl = document.querySelector(`#sample-output-${i}`);
    if (!inputEl || !outputEl) break;
    testCases.push({
      id: i,
      input:  inputEl.textContent,
      output: outputEl.textContent
    });
  }

  return {
    problemNumber,
    title,
    timeLimit,
    memLimit,
    description,
    inputDesc,
    outputDesc,
    conditionDesc,
    testCases,
    url
  };
}

// 사이드패널 / background 로부터 요청 수신
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PROBLEM_DATA') {
    sendResponse(extractProblemData());
  }
  return true;
});
