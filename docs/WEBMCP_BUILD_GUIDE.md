# WebMCP 구축 방법

작성·검증 기준: 2026-09-27. PLOTA 중국어 학습 사이트의 실제 구현을 설명한다.
사용자용 절차는 [WebMCP 사용 방법](WEBMCP_USAGE_GUIDE.md)을 참고한다.

## 1. 구현 범위

정적 단어장 JSON을 브라우저에서 읽고, JavaScript 함수를 WebMCP 도구로 등록했다. 별도 단어장 백엔드, DB, LLM API 키, 원격 MCP 서버를 추가하지 않았다. 기존 Git 연동 Cloudflare 배포를 사용한다.

WebMCP는 페이지의 기능을 브라우저 에이전트에 제공하는 API다. 사이트 주소가 일반 MCP 클라이언트에 등록할 서버 엔드포인트가 되는 것은 아니다. 회화 생성은 연결된 AI가 담당한다. 사이트는 어휘와 학습 지침, 검색 및 어휘 검사 기능을 제공한다.

```text
에이전트의 WebMCP 연결
  → 브라우저에 등록된 도구 조회 및 호출
  → document.modelContext에 등록한 execute 콜백
  → runVocabularyTool + 브라우저 메모리의 정적 단어장
  → 구조화된 응답(JSON 문자열)
  → AI가 해당 어휘 범위로 회화 생성
```

페이지 로딩과 JavaScript 실행은 필요하지만, 단어를 읽기 위해 화면·HTML을 분석할 필요는 없다. 현재 도구는 페이지 생명주기에 묶여 있으며 페이지 이동·종료 시 등록을 정리한다.

## 2. 파일 구성

경로는 저장소 루트 기준이다.

| 파일 | 역할 |
|---|---|
| `apps/web/public/data/chinese/hsk-1-4.json` | 1,192개 표제어와 19개 테마 단어장 |
| `apps/web/scripts/merge-hsk.py` | PDF 추출 자료 통합 후 테마 분류 실행 |
| `apps/web/scripts/group-hsk.py` | 고정 번호·이름·단어 ID로 테마 구성 |
| `apps/web/src/lib/chinese-vocabulary.ts` | 도구 스키마, 입력 검증, 검색, 회화 범위, 어휘 검사 |
| `apps/web/src/components/chinese-webmcp.tsx` | `useChineseWebMcp`, 등록·해제·상태·자체 진단 |
| `apps/web/src/components/chinese-app.tsx` | JSON 로딩, 선택 범위 관리, 훅 및 진단 패널 표시 |
| `apps/web/src/app/chinese.css` | 진단 패널과 학습 화면 스타일 |
| `apps/web/public/data/chinese/agent-guide.md` | 공개 에이전트 안내 |
| `apps/web/scripts/check-chinese.cjs` | 데이터 및 도구 로직 검사 |

`Deck.words`에는 원본 의미·병음·출처가 있고, `Deck.themes`의 각 항목에는 `id`, `number`, `name`, `description`, `wordIds`가 있다. 테마는 단어를 복제하지 않고 ID로 참조한다.

## 3. 도구 계약

모든 도구에 `readOnlyHint: true`를 설정한다. 점수·쿠키·개인 학습 기록은 반환하지 않는다.

| 도구 | 입력 예시 | 응답 |
|---|---|---|
| `list_vocabulary_decks` | `{}` | 19개 테마의 번호·이름·설명·단어 수·링크 |
| `get_learning_scope` | `{"book":1}` | 단어장 정보, 전체 집중 어휘, 보조 어휘 범위, 학습 지침 |
| `search_vocabulary` | `{"book":1,"query":"爸爸"}` | 검색 결과와 페이지 정보 |
| `check_chinese_scope` | `{"book":1,"text":"我爱爸爸。"}` | 전체 자료 기준 어휘 포함 여부, 미확인 한자, 사용한 집중 어휘 |

- `book`은 번호 `1`, 이름 `사람과 가족`, 고정 ID `hsk-theme-01`로 지정할 수 있다.
- `get_learning_scope`는 화면을 바꾸지 않는다. 다음 호출에도 필요한 `book`을 전달한다.
- `get_learning_scope`에서 `book` 생략 시 현재 페이지 범위를 사용한다. 테마 미선택 시 과거 `level/offset/count` 방식이 남아 있으므로 테마 학습에는 `book`을 명시한다.
- `search_vocabulary`는 `book`을 생략하면 선택 테마와 관계없이 전체 1,192개에서 검색한다. `limit`은 최대 50이며 `nextOffset`으로 계속 조회한다.
- `check_chinese_scope`는 선택 테마만으로 문장을 제한하지 않는다. 집중 단어는 테마, 보조 단어는 전체 HSK 1–4급 자료다. 한자 분리 가능성 검사이며 문법·문맥·복합어 의미를 보증하지 않는다. `focusWordsUsed`는 문자열 포함 기준이다.
- 알 수 없는 단어장은 `BOOK_NOT_FOUND`, 잘못된 입력은 `INVALID_ARGUMENT`를 반환한다. 실제 API 호출 성공과 업무 결과의 오류 응답을 구분한다.

## 4. 등록 방식과 생명주기

현재 코드의 핵심 패턴이다. 전체 오류 처리와 정리는 `chinese-webmcp.tsx`를 기준으로 한다.

```ts
const context = document.modelContext;
const controller = new AbortController();

await context.registerTool({
  ...spec, // name, description, inputSchema
  annotations: { readOnlyHint: true },
  execute: (input) => JSON.stringify(
    runVocabularyTool(spec.name, input, deck, currentScope.current, location.origin)
  ),
}, { signal: controller.signal });

// 페이지/컴포넌트 정리 시 등록 해제
controller.abort();
```

구현 순서:

1. 클라이언트에서 URL의 선택 범위를 읽는다.
2. 카탈로그의 JSON을 가져와 ID, 스키마 버전, 단어 개수, 테마 유무를 확인한다.
3. `document.modelContext.registerTool`을 기능 탐지한다. 미지원이어도 퀴즈는 계속 동작한다.
4. 도구 4개를 순차 등록한다. 중간 실패 시 등록을 정리하고 실제 오류를 표시한다.
5. 선택 변경은 ref에 반영한다. 단어장 선택마다 재등록하지 않아 등록 경쟁을 줄인다.
6. 도구는 DOM 텍스트가 아닌 단어장 데이터와 공통 함수를 사용한다.

상태는 API 사용 불가, 등록 중, 등록 실패, 4개 등록 완료로 구분한다. ‘등록됨’은 에이전트 연결 성공을 뜻하지 않는다. 자체 진단 외 콜백 수신 시 최근 도구명·시간·결과 상태를 메모리에 표시한다. 호출자 신원은 판별하지 않으며 자체 진단 중 동시 호출도 이 기록에서 제외된다.

## 5. 브라우저 자체 진단

회화 페이지의 ‘WebMCP 연결 진단’에서 실행한다. 등록된 함수를 직접 부르는 모의 검사가 아니다.

```js
const context = document.modelContext;
const tools = await context.getTools();
const tool = tools.find(t => t.name === 'get_learning_scope');
if (!tool) throw new Error('도구 없음');
const raw = await context.executeTool(tool, { book: 1 });
const result = JSON.parse(raw);
```

실제 진단은 동일 출처의 도구 4개 존재, 목록 개수, 1번의 전체 단어 ID 및 이름 조회 일치, `爸爸` 검색, `我爱爸爸。` 어휘 검사를 확인한다. 15초 제한과 취소 신호가 있다.

### Chrome 인수 호환성

테스트한 사용자 Chrome에서는 도구 조회는 성공했지만 객체 인수로 실행하면 `UnknownError: Failed to parse input arguments`가 발생했다. JSON 문자열 인수로 실행하면 성공했다.

현재 진단은 객체 인수를 우선 사용하고 **정확히 이 파싱 오류가 발생한 읽기 전용 호출에 한해서** `JSON.stringify(input)`으로 재시도한다. 그 진단 실행의 나머지 호출도 문자열 방식을 쓴다. 모든 오류에 무조건 재시도하지 않는다. 최신 Chrome 공식 문서는 객체 인수를 사용하고 문자열 인수는 Chrome 155부터 deprecated라고 설명한다. 따라서 문자열만 고정 사용하지 않는다.

이는 사이트 자체 진단의 호환 처리다. 외부 에이전트 연결 구현까지 수정하거나 대신하는 것은 아니다.

## 6. 활성화와 표준 상태

2026-09-27 확인 기준 WebMCP 명세는 Draft Community Group Report이며 정식 W3C 표준이 아니다. Chrome의 오리진 트라이얼은 규격 자체가 아니라 브라우저 기능 배포 방식이다.

- 개발·개인 테스트: 지원 Chrome에서 `chrome://flags/#enable-webmcp-testing` 활성화 후 재시작. AI 쪽 호출 연결도 필요하다.
- 일반 방문자 대상 실험: 유효한 오리진 트라이얼 등록과 토큰 적용, 지원 Chrome이 필요하다. 현재 프로젝트에는 이 토큰을 추가하지 않았다.
- `https://plota.ai` 등록 시 `www.plota.ai`까지 적용하려면 하위 도메인 포함을 선택한다. Third-party matching은 현재 용도에 필요 없다.
- 토큰은 HTML `origin-trial` meta 또는 `Origin-Trial` 응답 헤더로 제공할 수 있다. 만료·갱신을 관리한다.
- 사용자 제공 등록 화면에는 Chrome 149–156, 종료 예정일 2026-11-17이 표시됐다. 이 날짜는 정식 출시일이나 향후 지원 보장이 아니다. 배포 시 최신 등록 조건을 다시 확인한다.
- 토큰이나 폴리필만으로 모든 AI 앱이 사이트에 자동 연결되지는 않는다.

## 7. 검증 및 배포

`apps/web`에서 실행한다.

```powershell
node scripts/check-chinese.cjs
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next start -p 3003
```

단위 검사 통과와 실제 브라우저 API 실행 성공은 별개다. 개발 서버와 빌드가 같은 `.next`를 동시에 쓰지 않도록 개발 서버를 종료한 뒤 프로덕션 빌드를 진행한다. 배포는 검토한 파일만 커밋해 `main`에 push하면 기존 Cloudflare 연동이 처리한다.

2026-09-27 실제 확인:

| 환경 | 결과 |
|---|---|
| 단어장 검사·프로덕션 빌드 | 통과, 정적 페이지 202개 |
| 사용자 Chrome, 로컬 및 운영 사이트 자체 진단 | 실제 getTools/executeTool 호출 통과, 문자열 호환 경로 사용 |
| Codex 내장 브라우저, 운영 사이트 직접 WebMCP 호출 | 도구 4종 성공, 19개 테마, 1번 49개, 이름·번호 일치 |
| 이 세션의 사용자 Chrome 확장 연결 | WebMCP 직접 호출 capability가 노출되지 않음. 자체 진단 성공과 구분 |

진단 구현 배포 커밋은 `4097619`이다. 직접 호출 상세 절차는 사용 문서 3절에 기록했다. 위 결과를 모든 Chrome 버전, 모든 AI 앱, 플래그 없는 방문자에게 일반화하지 않는다.

## 8. 참고 자료

- [WebMCP 명세와 상태](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP 안내 및 활성화](https://developer.chrome.com/docs/ai/webmcp)
- [등록·조회·실행 API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [WebMCP와 MCP의 차이](https://developer.chrome.com/docs/ai/webmcp/compare-mcp)
- [오리진 트라이얼 등록과 갱신](https://developer.chrome.com/docs/web-platform/origin-trials)
- 사용자 제공 `WebMCP Chromium Design Doc.pdf` (2026-03-27): Chromium 내부 설계 설명. 최신 API나 배포 조건은 위 최신 문서와 별도 확인한다.
