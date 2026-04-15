# Privacy Policy — BOJ Never Die Chrome Extension

**Last Updated: 2026-04-16**

---

## 1. Overview

BOJ Never Die ("the Extension") is a Chrome browser extension designed solely to help users test and grade their code submissions on Baekjoon Online Judge (BOJ) problem pages. This Privacy Policy explains what information is handled by the Extension, how it is used, and what rights you have.

The Extension is developed and maintained by an individual developer and is not operated by any company or organization.

---

## 2. Data We Do NOT Collect

The Extension does **not** collect, store, transmit, or share any of the following:

- Personal identification information (name, email address, phone number, etc.)
- Health or medical information
- Financial or payment information
- Browsing history or web activity across sites other than `acmicpc.net`
- User behavior analytics or telemetry
- Location data

---

## 3. Data Handled by the Extension

### 3-1. AI API Key (Authentication Credential)

- **What**: An AI API Key (Claude, Gemini, or OpenAI) that the user voluntarily types into the Extension's input field.
- **How it is stored**: The key is held **only in the browser's session memory (`sessionStorage`)** while the Extension's side panel is open. It is **never written to disk, never synced across devices, and never transmitted to any server operated by the developer**.
- **When it is deleted**: Automatically and permanently deleted when the user closes the side panel or the browser.
- **Where it is sent**: Directly to the respective AI provider's API endpoint (e.g., `api.anthropic.com`, `generativelanguage.googleapis.com`, `api.openai.com`) solely for the purpose of generating hidden test cases. This transmission occurs entirely between the user's browser and the AI provider; the developer has no access to this data at any point.

### 3-2. Non-Sensitive Extension Settings

- **What**: User preferences such as selected programming language, AI model provider choice, and output comparison options (e.g., ignore whitespace).
- **How it is stored**: Saved locally via `chrome.storage.sync` (Chrome's built-in storage). This data may be synchronized across the user's own Chrome devices if Chrome Sync is enabled by the user.
- **What it does NOT include**: AI API Keys are explicitly excluded from this storage.

### 3-3. Community-Submitted Test Cases (Optional)

- **What**: When a user voluntarily submits a test case (feedback), the following data is stored in the developer's Supabase database:
  - Problem number (e.g., `1000`)
  - Input data for the test case
  - Expected output for the test case
  - Optional description text
  - Submitter nickname (defaults to `anonymous` if not provided)
  - Submission timestamp
- **Why**: To allow other users of the Extension to benefit from community-contributed edge cases.
- **Retention**: Submitted data is retained indefinitely to serve the community database feature. Data is not linked to any personal identity.
- **Note**: Do **not** submit any personal information in the description or nickname fields.

### 3-4. Problem Page Content (Transient)

- **What**: When the user opens a BOJ problem page with the Extension active, the Extension reads the following data directly from the current browser tab's DOM: problem number, title, time limit, memory limit, and sample input/output.
- **How it is used**: This data is processed entirely in the user's local browser memory solely to enable the grading feature. It is never logged, stored permanently, or sent to any server operated by the developer.

---

## 4. Third-Party Services

The Extension communicates with the following third-party services. Each service is governed by its own privacy policy.

| Service | Purpose | Privacy Policy |
|---|---|---|
| Wandbox (`wandbox.org`) | Free cloud compiler for executing user code | [https://wandbox.org](https://wandbox.org) |
| Anthropic Claude API | AI-powered hidden test case generation (user's own API key) | [https://www.anthropic.com/privacy](https://www.anthropic.com/privacy) |
| Google Gemini API | AI-powered hidden test case generation (user's own API key) | [https://policies.google.com/privacy](https://policies.google.com/privacy) |
| OpenAI API | AI-powered hidden test case generation (user's own API key) | [https://openai.com/privacy](https://openai.com/privacy) |
| Supabase | Community test case database (via serverless Edge Function) | [https://supabase.com/privacy](https://supabase.com/privacy) |

> **Important**: The AI APIs are called using **the user's own API key**. The developer has no access to any API key and bears no responsibility for any costs or usage incurred on the user's AI provider account.

---

## 5. Data Security

- All communication with external APIs uses HTTPS (TLS encryption).
- The developer's database (Supabase) is protected by Row Level Security (RLS) with all direct public access policies removed. Data can only be accessed through a secured serverless Edge Function that validates all inputs before processing.
- AI API Keys are never stored on disk or on any server. They exist only in temporary browser memory during the active session.

---

## 6. Children's Privacy

This Extension is not directed at children under the age of 13, and we do not knowingly collect any personal information from children.

---

## 7. Changes to This Policy

This Privacy Policy may be updated from time to time. The "Last Updated" date at the top of this document will reflect the most recent revision. Continued use of the Extension after any changes constitutes acceptance of the updated policy.

---

## 8. Contact

If you have any questions about this Privacy Policy, please open an issue on the GitHub repository:

👉 **https://github.com/HanuKim/BOJ_Never_Die/issues**

---

*This policy applies solely to the BOJ Never Die Chrome Extension and does not apply to any third-party services linked within the Extension.*
