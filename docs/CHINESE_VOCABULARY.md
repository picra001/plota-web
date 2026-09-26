# 중국어 단어장·WebMCP 구현 기록

## 데이터

정적 원본: `apps/web/public/data/chinese/hsk-1-4.json`.
세 PDF의 1,200개 항목을 1,192개 고유 표제어로 통합했다. 동형어의 발음·뜻·급수는 `senses`와 `levels`에 보존하며 원본 식별자, PDF 페이지, 항목 번호는 `sources`에 기록한다. 원본 파일 SHA-256도 포함한다.

- 단어한끝 35쪽: 이미지 기반 1,200개 번호·표제어를 OCR하고 다른 두 자료와 대조했다. 불일치 행은 원본 렌더를 보고 교정했다. 이 자료의 뜻 전체를 전사한 것은 아니다.
- 유수중국어 45쪽: 4급 600항목의 병음·뜻을 표에서 추출했다. `入又`는 다른 원본과 대조하여 `入口`로 교정했다.
- 가장쉬운독학 15쪽: 1급 150, 2급 150, 3급 300항목을 좌우 칼럼으로 추출하고 PDF 글꼴의 병음 성조 매핑을 복구했다.
- 원본의 급수 구분을 유지했다. 최신 HSK 체계의 공식 목록으로 주장하지 않는다.

## 화면 및 확장

- `/ko/chinese/learn`: 단어장·급수·문제 수 선택, 한국어 뜻 퀴즈.
- `/ko/chinese/vocabulary`: 검색, 페이지 나누기, 원본 뜻·출처, JSON 다운로드.
- `/ko/chinese/review`: 저장·오답 단어와 복습 JSON 다운로드.
- `/ko/chinese/conversation`: 집중 어휘 선택, 범위 링크·요청문 복사, 범위 JSON, 예문 어휘 검사.
- `/ko/chinese/settings`: 병음 표시 및 해당 단어장 기록 초기화.

다음 단어장은 동일 JSON 스키마로 추가하고 `src/lib/chinese-vocabulary.ts`의 `decks`에 등록한다. 상태는 `plota-chinese-v2:<deckId>`에 분리 저장한다. 현재 카탈로그에는 실제 단어장 하나만 등록되어 있다.

## 에이전트 연결

공개 프로토콜: `/data/chinese/agent-guide.md`. `llms.txt`에도 데이터 URL과 범위 해석을 기록했다. 지원 브라우저에서 `document.modelContext.registerTool`로 네 가지 읽기 전용 도구를 등록하고 AbortSignal로 정리한다.

1. `list_vocabulary_decks`: 공개 목록 및 JSON 주소.
2. `get_learning_scope`: 선택 범위·집중 단어·한국어 회화 규칙.
3. `search_vocabulary`: 한자·한국어·병음 검색과 페이지 나누기.
4. `check_chinese_scope`: 예문 한자의 단어장 어휘 분리 검사.

집중 단어는 URL의 deck/level/offset/count로 재현한다. 보조 어휘는 같은 단어장 전체로 제한하도록 안내한다. 검사는 어휘 분리만 수행하므로 복합어 의미·문법·난이도를 보장하지 않는다. 개인 학습 기록은 도구에 노출하지 않는다.

ChatGPT 앱 원격 MCP 연결에는 별도 HTTP MCP 서버가 필요하다. 현재 정적 URL을 앱 커넥터 서버라고 표시하지 않는다. 미지원 환경은 복사 요청문과 단어장 JSON 첨부로 사용한다. 사이트 자체의 LLM 호출·API 키·백엔드는 없다.

## 원본 재추출

Python: pdfplumber, pypdfium2. OCR용 Node: tesseract.js 및 chi_sim/eng 모델. 앱 실행에는 이 의존성들이 필요하지 않다. 저장소 루트에서 실행하며 PDF_DIR는 원본 폴더로 대체한다.

```sh
python apps/web/scripts/extract-hsk-text.py PDF_DIR tmp/pdfs
python apps/web/scripts/render-hsk-index.py PDF_DIR/HSK_1-4급_단어한끝_필수어휘1200단어장.pdf tmp/pdfs
node apps/web/scripts/ocr-hsk-index.cjs tmp/pdfs
python apps/web/scripts/extract-hsk-index.py tmp/pdfs
python apps/web/scripts/merge-hsk.py tmp/pdfs PDF_DIR
```

OCR 버전이 바뀌면 번호별 교정을 다시 확인해야 한다. 중간 파일·OCR 모델·이미지는 `tmp/pdfs`에 보관하고 Git에서 제외했다.

## 확인된 검증

2026-09-25~26 로컬 확인:
- 1,200개 원본 번호 누락 없음, 1,192개 ID 고유성, 모든 항목 병음·뜻·출처 검사 통과.
- 전 단어 퀴즈 선택지 4개·정답 하나, 범위 링크 왕복, 잘못된 도구 입력, 어휘 범위 검사 통과 (`node scripts/check-chinese.cjs`).
- TypeScript 및 Next production build 통과, 정적 페이지 202개 생성.
- 브라우저 4급 5문제 완료, 정답·오답 피드백, 저장·오답 유지 확인.
- 실제 WebMCP 범위 조회(4급 21번째부터 5개), 한국어 검색, 범위 밖 예문 검사 호출 성공.
- 최종 보완 빌드 통과. 실행 서버 28개 canonical 페이지, 리다이렉트 6개, 다운로드 6개, sitemap/RSS/llms.txt 및 잘못된 경로 점검 통과.
- 좁은 모바일 뷰포트에서 회화 화면의 가로 넘침 없음 확인.
- 실제 ChatGPT 앱 커넥터 연결, Cloudflare 배포, 음성 청취는 검증하지 않았다.
