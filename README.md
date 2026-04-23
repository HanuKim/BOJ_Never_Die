# ⚡ BOJ Never Die - Chrome Extension

백준(BOJ) 사이트 종료에 대비하여 언제든 문제 페이지에서 코드를 즉시 채점하고, **AI 기반 테스트 데이터 생성**, **테스트 케이스 공유**, 그리고 **GitHub 자동 푸시**까지 한 번에 할 수 있는 크롬 익스텐션입니다.

---

## 📦 주요 기능 개요

| 기능 | 설명 | 비고 |
|------|------|------|
| **통합 채점 엔진** | Wandbox API를 기반으로 코드 실행 (C++, Python, Java 등 10개 언어 지원) | 언어별 시간 배수 자동 적용 |
| **AI 멀티모델 폴백** | Claude, Gemini, OpenAI 지원 및 **사용량 한도 초과 시 하위 모델로 자동 무중단 폴백(Fallback)** | 사용자 BYOK |
| **GitHub 자동 푸시** | OAuth 인증 후 채점 완료된 코드를 **난이도별 폴더 구조**로 GitHub에 자동 업로드 | README 자동 생성 |
| **solved.ac 연동** | 문제 난이도(Gold III 등)와 분류 태그를 **solved.ac API**에서 정확하게 가져옴 | |
| **강력한 에디터 UX** | 들여쓰기(Tab), 중괄호 자동완성, 클립보드 붙여넣기 등 IDE 수준의 편의성 | |
| **One-Click 채점** | 백준 예제 + AI 히든 케이스 + 커뮤니티 케이스들을 **순차 통합 채점** | |
| **서버리스 커뮤니티 DB** | Edge Function 기반의 안전한 테스트 케이스 공유 | |

---

## 🚀 아키텍처 및 보안

본 프로젝트는 오픈소스 공개 및 배포를 위해 **보안 분리 구조(Serverless Architecture)**를 채택했습니다.

### 1. 보안 핵심 (Supabase Edge Functions)
익스텐션(프론트엔드)에서는 Supabase DB로 직접 접근하지 않습니다. 모든 API Key와 인증 헤더를 클라이언트에서 제거하였으며 오직 데이터 접근용 단일 URL(Edge Function)만 사용합니다.

- **Frontend**: 오로지 `EDGE_FUNCTION_URL` 하나로 Unauthenticated GET/POST 요청을 보냅니다.
- **Backend (Deno Edge Function)**: 사용자로부터 들어오는 텍스트 길이나 스팸 등을 **사전 검증(Validation)** 한 뒤, 함수 내부에서만 가지고 있는 `SERVICE_ROLE_KEY`를 사용해 DB의 RLS를 우회하여 데이터를 전달합니다.
- **Database**: 모든 RLS 정책(공개 쓰기/읽기)은 삭제되어 외부와의 직접 연결은 100% 차단됩니다.

### 2. GitHub OAuth 보안
- `client_secret`은 Supabase Edge Function 서버에만 보관 (클라이언트 코드에 미포함)
- OAuth 토큰은 `chrome.storage.local`에 저장 (기기 간 동기화 없음)
- 사용자는 [GitHub Settings → Applications](https://github.com/settings/applications)에서 언제든 토큰 revoke 가능

### 3. AI 자동 우회 (폭포수 폴백) 전략
AI 모듈이 과부하(HTTP 429) 상태이거나 한도 초과(Quota Error)가 날 경우, 자동으로 대체 모델로 넘겨줍니다.
*(예: `gemini-2.5-flash` ➡️ `gemini-2.5-pro` ➡️ `gemma-4-31b`)*

---

## 🔧 지원 언어

C++17, C++14, Python 3, Java, JavaScript(Node.js), C, Kotlin, Go, Rust, Ruby

---

## 📂 GitHub 업로드 폴더 구조

GitHub 연동 시 아래와 같은 구조로 자동 정리됩니다.

```
백준/
├── Bronze/
│   └── 3040. 백설 공주와 일곱 난쟁이/
│       ├── README.md
│       └── 3040. 백설 공주와 일곱 난쟁이.py
├── Silver/
│   └── 1012. 유기농 배추/
│       ├── README.md
│       └── 1012. 유기농 배추.cpp
├── Gold/
│   └── 17471. 게리맨더링/
│       ├── README.md
│       └── 17471. 게리맨더링.java
└── Platinum/
    └── ...
```

- **커밋 메시지**: `[Gold III] Title: 게리맨더링 -BOJ Never Die`
- **README**: 문제 링크, 분류 태그, 제출 일자, 문제 설명이 자동 포함

---

## 👤 사용자 세팅 가이드

### 기본 사용 (채점)
1. Chrome 웹 스토어에서 **BOJ Never Die**를 설치합니다.
2. 백준 문제 페이지에서 익스텐션 아이콘을 클릭하여 사이드패널을 엽니다.
3. 코드를 붙여넣고 `▶ 채점 실행` 버튼을 누르면 즉시 채점됩니다.

### AI 히든 케이스 생성
4. **설정 탭**에서 AI 제공자를 선택하고 API Key를 입력합니다 (키는 세션에만 보관, 탭 닫으면 자동 삭제).
5. **히든 케이스 탭**에서 `✨ 생성` 버튼을 클릭하면 AI가 경계값·극단값 테스트케이스를 생성합니다.

### GitHub 연동
6. **설정 탭**에서 `🔗 Authorize with GitHub` 버튼을 클릭하여 GitHub 계정을 인증합니다.
7. 저장소 이름(예: `coding_test`)을 입력하고 저장합니다. (소유자명은 자동으로 붙습니다)
8. 채점 완료 후 헤더의 GitHub 아이콘을 클릭하면 코드가 자동 업로드됩니다.

### 커뮤니티 반례 공유
9. **히든 케이스 탭**에서 `불러오기`를 클릭하면 다른 사용자들이 공유한 테스트 케이스를 받아올 수 있습니다.
10. **피드백 탭**에서 직접 테스트 케이스를 제출하여 커뮤니티에 기여할 수 있습니다.

---

## 🔒 개인정보 처리방침

자세한 내용은 [PRIVACY.md](./PRIVACY.md)를 참고해주세요.

---

## 📝 라이선스

MIT License

---

## 💬 문의

이슈나 건의사항은 GitHub Issues에 남겨주세요.

👉 **https://github.com/HanuKim/BOJ_Never_Die/issues**
