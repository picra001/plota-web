# WebMCP 사용 방법

작성·검증 기준: 2026-09-27. [구축 방법](WEBMCP_BUILD_GUIDE.md)은 별도 문서다.

## 1. 무엇이 가능한가

[PLOTA 중국어 회화 페이지](https://www.plota.ai/ko/chinese/conversation)를 브라우저에서 열고, AI가 WebMCP 도구로 단어장을 읽어 회화를 진행한다. 단어 목록이나 긴 요청문을 복사할 필요는 없다. 단, 사용하는 AI의 브라우저 연결이 WebMCP 호출을 지원해야 한다.

현재 검증된 직접 연결은 **이 작업에서 사용한 Codex 내장 브라우저**다. 사용자 Chrome은 사이트 자체 진단은 성공했지만, 이 세션의 Chrome 확장 제어 기능에는 직접 WebMCP 호출 기능이 노출되지 않았다. 이후 버전이나 다른 연결 환경의 상태는 새로 확인한다.

별도 중국어 학습 스킬은 아직 설치·제작하지 않았다. 아래 자연어 요청만으로 지원 에이전트가 도구를 사용할 수 있다. 사이트 자체에는 회화를 생성하는 LLM이 없다.

## 2. 사용자 요청 예시

WebMCP를 지원하는 내장 브라우저 환경에서 다음처럼 요청한다.

> 내장 브라우저로 https://www.plota.ai/ko/chinese/conversation 를 열고 WebMCP로 1번 ‘사람과 가족’ 단어장을 읽어줘. 해당 단어를 중심으로 회화하자. 한 번에 한 질문씩 하고, 내 답에 따라 문장 패턴을 바꿔줘. 설명과 교정은 한국어로 해줘. 화면 읽기나 JSON 파일 직접 조회로 대체하지 말고, WebMCP 연결이 없으면 알려줘.

이후에는 다음처럼 이어갈 수 있다.

- “같은 단어로 부정문과 의문문을 연습하자.”
- “이번에는 가족을 친구에게 소개하는 상황으로 바꿔줘.”
- “3번 음식과 식사 단어장으로 바꿔서 식당 주문을 연습하자.”

선택한 테마의 전체 어휘가 집중 범위이고, 자연스러운 문장을 만드는 보조 어휘는 전체 HSK 1–4급 자료에서 사용한다. 검사 통과는 어휘 기준이며 문법·문맥 정확성은 AI가 별도로 판단해야 한다.

1번 단어장을 미리 지정한 주소:

[1번 사람과 가족 회화](https://www.plota.ai/ko/chinese/conversation?deck=hsk-1-4&book=hsk-theme-01)

페이지를 연 것만으로 AI가 연결되거나 회화가 자동 시작되지는 않는다. 일반 MCP 서버 등록란에 이 페이지 URL을 넣는 방식도 아니다.

## 3. 이번에 실제로 직접 연결한 방법

아래 코드는 **이 Codex 세션의 브라우저 제어 런타임 예시**다. 사이트에 넣는 JavaScript나 Chrome 개발자 콘솔에서 실행할 코드가 아니다. 다른 AI 제품은 자체 WebMCP 연결 API를 사용해야 한다.

1. 운영 사이트를 내장 브라우저에서 열었다.
2. 페이지가 제공하는 WebMCP 도구 목록을 확인했다.
3. WebMCP capability에서 도구 핸들을 얻었다.
4. 자체 진단 버튼을 누르거나 단어 목록을 펼치지 않고 에이전트가 도구를 직접 호출했다.

```js
const tab = await cua.createBrowserTab(
  'iab',
  'https://www.plota.ai/ko/chinese/conversation',
  { visible: false }
);
const webmcp = await tab.capabilities.get('webmcp');
const tools = await webmcp.fetchTools();
// 호출 전 도구 알림 또는 tools.description()으로 이름·입력 확인
const catalog = JSON.parse(await tools.call('list_vocabulary_decks', {}));
const numbered = JSON.parse(await tools.call('get_learning_scope', { book: 1 }));
const named = JSON.parse(await tools.call('get_learning_scope', { book: '사람과 가족' }));
const search = JSON.parse(await tools.call('search_vocabulary', {
  book: 1, query: '爸爸'
}));
const check = JSON.parse(await tools.call('check_chinese_scope', {
  book: 1, text: '我爱爸爸。'
}));
```

확인된 결과:

```json
{
  "books": 19,
  "book": { "number": 1, "name": "사람과 가족", "wordCount": 49 },
  "namesMatch": true,
  "search": ["爸爸"],
  "withinVocabulary": true,
  "unknownHanzi": [],
  "focusWordsUsed": ["爸爸", "我"]
}
```

위 JSON은 실제 응답 여러 개에서 확인한 값을 모은 요약이며, 단일 도구의 원래 응답 스키마는 아니다. 페이지를 여는 과정에서 브라우저 도구가 화면 상태를 자동 반환했지만, 단어장·검사 결과는 화면 추출로 얻지 않았다.

도구 호출은 화면의 선택을 바꾸지 않는다. 다른 단어장으로 바꾼 뒤에도 필요한 호출에 `book`을 명시한다. 탭 이동·종료로 도구 핸들이 무효화되면 다시 페이지의 도구를 조회한다.

## 4. Chrome에서 사이트 자체만 검사하는 방법

1. WebMCP 실험 기능을 켠 Chrome을 재시작한다. 현재 공식 개발용 플래그는 `chrome://flags/#enable-webmcp-testing`이다.
2. [회화 페이지](https://www.plota.ai/ko/chinese/conversation)를 연다.
3. **WebMCP 연결 진단**을 펼친다.
4. **WebMCP 자체 진단 실행**을 누른다.
5. 목록, 번호·이름, 검색·예문 검사 성공과 마지막 통과 문구를 확인한다.

자체 진단은 페이지 안에서 실제 `document.modelContext.getTools()`와 `executeTool()`을 실행한다. 화면의 단어를 읽거나 단어장 함수를 직접 호출하는 모의 검사는 아니다. 하지만 이것만으로 외부 AI가 연결됐다고 판단하면 안 된다.

‘이전 Chrome 실행 API 감지’는 JSON 문자열 인수를 쓰는 호환 경로로 진행했다는 뜻이다. 뒤의 검사가 통과했다면 그 실행은 성공이다.

## 5. 상태 해석과 문제 해결

| 표시·현상 | 의미와 다음 확인 |
|---|---|
| WebMCP API 사용 불가 | 브라우저 버전·실험 활성화·출처 정책 확인. `navigator.modelContext`만 검사해 결론 내리지 않는다. 현재 사이트는 `document.modelContext` 사용 |
| 등록 실패 | 표시된 실제 오류 확인. 단순히 AI 연결 문제라고 단정하지 않는다 |
| WebMCP 도구 4개 등록됨 | 사이트 콜백 등록 성공. 외부 AI 연결은 아직 별도 |
| getTools/executeTool 없음 | 페이지 자체 진단 API 미지원. 등록 API 지원과 다를 수 있음 |
| 자체 진단 통과 | 그 브라우저에서 실제 도구 실행·응답 검증 성공 |
| 자체 진단 외 최근 도구 호출 | 해당 페이지 콜백에 호출 도착. 호출자의 신원·AI 여부를 인증하는 표시는 아님 |
| 에이전트 연결에 webmcp capability 없음 | 사이트 자체 진단과 무관하게 해당 연결에서 직접 호출 불가. 지원되는 연결 경로 필요 |
| 단어장은 보이는데 도구 호출 불가 | UI 작동과 WebMCP 작동을 구분. 화면 읽기를 호출 성공으로 보고하지 않는다 |

제한된 확장 실행 환경에서 `document.modelContext`가 `undefined`로 보인 결과만으로 실제 페이지 API가 없다고 판단하지 않는다. 이 작업에서도 확장 측 검사와 페이지의 등록 상태가 달랐으며, 페이지 자체 진단을 추가한 뒤 실제 실행 성공을 확인했다.

## 6. AI에게 적용할 사용 규칙

```text
WebMCP 테스트에서는 도구를 발견하고 실제 호출한다.
화면 텍스트, HTML, 정적 JSON 직접 다운로드로 대체한 결과를
WebMCP 호출 성공이라고 보고하지 않는다.
연결이 없으면 사용 환경과 제한을 명시한다.
단어장 번호 또는 이름으로 get_learning_scope를 호출한다.
정해진 대본 없이 질문·상황·문장 패턴을 바꾸되 어휘 범위를 지킨다.
중국어 예문은 check_chinese_scope로 검사하고 실제 호출 결과만 보고한다.
검사가 통과해도 문법·복합어 의미가 보증된다고 말하지 않는다.
```

도구로 돌려주는 학습 지침은 대화 방식과 어휘 범위이지 고정 대본이 아니다. 요청문 복사·JSON 첨부는 WebMCP 미지원 환경용 보조 수단이며 별도 방식으로 명시한다.

## 7. 토큰과 연결 조건

개인 Chrome에서 실험 플래그를 켠 테스트에는 사이트의 오리진 트라이얼 토큰 없이도 실행할 수 있다. 일반 방문자 대상 실험 제공에는 유효한 트라이얼 등록 등 브라우저 활성화 조건이 필요하다. 토큰은 AI API 키가 아니고, 외부 AI 연결 기능을 추가하지도 않는다.

실험 종료 예정일을 정식 출시일로 해석하지 않는다. 이 문서는 2026-09-27에 확인한 환경을 기록한 것으로, 이후에는 [Chrome WebMCP 문서](https://developer.chrome.com/docs/ai/webmcp)와 [API 문서](https://developer.chrome.com/docs/ai/webmcp/imperative-api)를 확인한다.
