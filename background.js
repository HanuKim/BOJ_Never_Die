// 익스텐션 아이콘 클릭 시 사이드 패널 열기
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

// BOJ 문제 페이지 진입 시 자동으로 사이드패널 활성화 가능하게
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('acmicpc.net/problem/')) {
    chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel/sidepanel.html',
      enabled: true
    });
  }
});

// 사이드패널 → 컨텐츠 스크립트 메시지 중계
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PROBLEM_DATA') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ error: 'No active tab' });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PROBLEM_DATA' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: 'BOJ 문제 페이지에서 실행해주세요.' });
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // 비동기 응답
  }
});
