# PLOTA 프로젝트 이해 및 수정 가이드

최종 갱신: 2026-09-25 / 서비스 분리 목업 개편.

### 2026-09-26 공통 디자인 업데이트

- 추가 정리: Lab·홈·중국어·푸터의 감성 슬로건과 반복 소개를 제거하고 주요 제목을 기능명으로 단순화했다. 제목과 UI 폰트를 sans-serif로 통일했으며 Devlog의 `making` 같은 부분 강조도 폰트·색상을 주변 제목과 맞췄다. 코드 블록의 monospace는 유지한다.

- 모든 서비스·언어·Lab 독립 경로가 `components/site-frame.tsx`의 헤더와 푸터를 사용한다. 서비스별 관련 메뉴는 유지한다.
- 헤더·푸터 내부는 동일한 1264px 최대 너비와 반응형 좌우 여백을 공유한다. 모바일에서는 메뉴와 푸터 행을 자연스럽게 줄바꿈한다.
- 언어 선택은 푸터 최하단에만 제공한다. 언어 변경은 같은 페이지 경로와 쿼리·해시를 보존한다. 공통 헤더·푸터 문구는 5개 언어로 제공한다. 기존 서비스 본문의 영어/한국어 콘텐츠 정책은 유지하며 전체 본문 번역을 새로 추가한 것은 아니다.
- `components/localized-link.tsx`는 같은 서비스 안에서 선택한 인터페이스 언어를 유지한다.
- 이탤릭, 장식 화살표·음표·문자 아이콘을 제거했다. 글의 의미를 전달하는 일반 구두점과 중국어 학습 텍스트는 보존한다.
- 공통 스타일은 `app/site-frame.css`. 기존 분리 헤더·푸터 대신 이 스타일을 우선 수정한다.
- 운영 도메인 기본값은 `https://plota.ai`이며 이전 `plota.dev` 기록보다 현재 소스를 우선한다.
- 검증: production build 202개 정적 페이지 생성 성공. 5개 언어의 대표 30개 경로에서 공통 헤더·푸터·하단 언어 메뉴 확인. 모바일 실측 375px에서 중국어·FBX·웹툰·Devlog 가로 넘침 없음, 헤더·푸터 너비 일치 및 언어 변경 후 회화 범위 쿼리 유지 확인. 이 디자인 변경은 아직 push하지 않았다.

## 1. 확정된 운영·기획

- Git 원격 반영 후 연결된 Cloudflare에서 배포하는 정적 콘텐츠 사이트. 별도 백엔드·DB·인증 서버는 없다.
- 하나의 저장소·도메인에서 서비스별 독립 메뉴와 화면을 제공한다. 모든 서비스를 공통 헤더로 연결하지 않는다.
- **허브·FBX·웹툰은 영어 기본. Lab과 그 하위 프로젝트인 중국어 학습은 한국어 기본.**
- FBX 제작과 에셋 다운로드는 하나의 서비스다. Roblox·OVERDARE를 대상으로 소개한다.
- 웹툰은 작품 → 회차 구조. 중국어 학습은 한국어 사용자 대상 모바일 웹 앱이다.
- 미정 기능과 콘텐츠는 목업으로 채우도록 사용자에게 승인받았다. 기존 코드는 필요한 부분을 참고해 재사용한다.
- README·ARCHITECTURE·PROGRESS·TODO의 Vercel 운영, Cloudflare 미사용, 옛 라우트와 버전은 과거 기록이다. 이 문서와 현재 소스·사용자 지시를 우선한다.
- Cloudflare 대시보드의 실제 프로젝트 종류·브랜치·빌드 명령·도메인은 아직 확인하지 않았다.

## 2. 현재 주소와 메뉴

| 경로 | 기본 언어 | 구성 |
|---|---|---|
| `/` → `/en` | 영어 | 스튜디오 소개, 독립 프로젝트 카드 |
| `/en/fbx` | 영어 | FBX 서비스 입구, 제작 안내·대표 에셋·가이드 |
| `/en/fbx/create` | 영어 | **실제 접수 화면.** 초대코드·그림 업로드·애니 클립 선택·동의 → `POST /jobs` |
| `/en/fbx/job?id=` | 영어 | **실제 결과 화면.** 진행 상태 폴링·3D 미리보기·FBX 다운로드·제목 편집. 색인 제외(noindex), 사이트맵 제외 |
| `/en/fbx/assets` | 영어 | 검색·카테고리·플랫폼 필터 |
| `/en/fbx/assets/{slug}` | 영어 | 에셋 콘셉트·사양 목업·SVG 다운로드 |
| `/en/fbx/guide` | 영어 | 플랫폼 가이드 입구 |
| `/en/fbx/guide/roblox`, `/overdare` | 영어 | 검증 전 워크플로 안내 목업 |
| `/en/webtoon` | 영어 | 작품 목록·최근 회차 |
| `/en/webtoon/{series}` | 영어 | 작품 소개·회차 목록 |
| `/en/webtoon/{series}/{episode}` | 영어 | 세로 스크롤 스토리보드·이전/다음 화 |
| `/ko/lab` | 한국어 | 작은 실험 프로젝트 소개 |
| `/ko/chinese` | 한국어 | 한마디 Chinese 학습 홈 |
| `/ko/chinese/learn` | 한국어 | 네 가지 표현 퀴즈·발음·저장 |
| `/ko/chinese/review` | 한국어 | 저장한 표현·뜻 확인·저장 해제 |
| `/ko/chinese/settings` | 한국어 | 병음 표시·저장 안내·기록 초기화 |
| `/{lang}/devlog`, `/{lang}/devlog/{slug}` | 기존 5개 언어 | 기존 Markdown 개발 기록 유지 |

짧은 주소 `/fbx/*`, `/webtoon/*`는 영어 서비스로, `/chinese/*`, `/lab`은 한국어 서비스로 이동한다. 기존 `/{lang}/novel`과 `/{lang}/novel/{slug}`는 영어 웹툰으로 영구 리다이렉트한다. 기존 세 slug를 새 작품에도 유지했다.

FBX 메뉴: Create / Asset library / Guides. 웹툰 메뉴: All series / Latest episodes. 중국어 하단 메뉴: 홈 / 학습 / 복습 / 설정. 서비스 로고는 해당 서비스 입구로 돌아간다.

상위 `[lang]`의 기존 5개 언어 생성은 유지한다. 새 서비스의 다른 언어 경로는 영어 또는 한국어 콘텐츠를 표시하는 별칭이며 번역 완료 페이지가 아니다. canonical은 위 기본 언어 주소를 가리킨다. 새 서비스의 사이트맵에는 canonical 경로만 넣는다.

## 3. 실제 동작과 목업 경계

### 실제 동작

- **FBX 제작(2026-10-12)**: `/en/fbx/create` 에서 그림 1장을 접수하고 `/en/fbx/job?id=` 에서 진행 상태와 결과 파일을 받는다.
  서버는 같은 저장소의 `apps/fbx-api`(Cloudflare Worker + D1 + R2), 실제 변환은 집 PC 의 ComfyUI 워커(comfyui-docker 저장소)다.
  초대코드 필요, 그림 10MB 이하(PNG·JPG·WEBP), Mixamo FBX 클립 업로드 가능(10MB·최대 4개).
  작업당 수정 권한은 브라우저 localStorage 의 `owner_token`(`plota-fbx-tokens-v1`). 초대코드는 `plota-fbx-invite-v1` 에 기억한다.
  3D 미리보기는 자체 호스팅 `public/vendor/model-viewer.min.js`(4.4.0, BSD-3-Clause) — CDN·npm 의존성 없음. GLB 를 못 읽으면 원본 그림으로 내려간다.

- 에셋 이름 검색, 카테고리·플랫폼 필터, 빈 상태, 필터 초기화.
- 6개 원본 SVG 콘셉트 파일 다운로드.
- 제작 화면의 입력·플랫폼 선택과 고정 샘플 결과 표시.
- 웹툰 3개 작품·4개 회차 탐색과 이전/다음 이동.
- 중국어 4개 표현의 정오답 피드백, 학습 완료, 복습 카드.
- localStorage에 학습·저장 기록과 병음 설정 유지. 키는 `plota-chinese-progress-v1`.
- 저장 불가 환경에서 메모리 상태로 동작하며 안내 표시. 기록 초기화는 화면에서 확인 후 실행.
- 브라우저 Speech Synthesis 기반 중국어 발음. 실제 음성은 기기·브라우저의 음성 지원에 의존한다.
- 지원 브라우저에서 WebMCP `find_chinese_phrase` 등록. 한국어·중국어·병음으로 공개 표현만 검색한다. 학습 기록은 제공하지 않는다. 등록 실패·미지원 상태에서도 일반 학습은 동작한다.

### 목업 / 준비 중

- 에셋 라이브러리의 6개 콘셉트는 여전히 SVG 목업이다(실제 3D 모델 아님). FBX 제작 화면만 실제로 동작한다.
- Roblox 반입은 지원하지 않는다. 현재 산출물은 OVERDARE Custom Skeleton 기준이다.
- 에셋 플랫폼 표시는 의도한 타깃이다. 호환 테스트 완료나 인증을 의미하지 않는다. 폴리곤 수는 목업 수치다.
- 웹툰은 새 이야기와 자체 SVG를 활용한 스토리보드다. 최종 컷 작업·업로드 에디터는 없다.
- 회원·클라우드 동기화·방문자 업로드·댓글·외부 학습 AI는 구현하지 않았다.

## 4. 기술 구성

`package.json` 기준 Node >=22, pnpm 9.15.9, Next.js ^15.5.20, React ^19.2.7, TypeScript, Tailwind 3, gray-matter/js-yaml/next-mdx-remote.

현재는 Next.js SSG이며 `output: export` 구성은 아니다. Cloudflare 설정은 OpenNext + Workers다. `wrangler.jsonc`의 엔트리는 `.open-next/worker.js`, 에셋은 `.open-next/assets`, Worker 이름은 `web`이다. 정적 콘텐츠 운영과 어댑터 런타임을 구분한다.

`NEXT_PUBLIC_FBX_API_URL`은 FBX 제작 화면이 호출할 API 주소다. **빌드 시점에 번들로 들어간다** — 미설정 기본값 `https://fbx-api.plota.ai`.
로컬 개발은 `NEXT_PUBLIC_FBX_API_URL=http://127.0.0.1:8787 pnpm dev` 와 `pnpm dev:api` 를 같이 띄운다.
이때 Worker 의 `ALLOW_ORIGIN` 에 `http://localhost:3000` 을 함께 넣어야 CORS 가 통과한다(쉼표로 여러 개).

`NEXT_PUBLIC_SITE_URL`은 SEO 절대 URL에 사용한다. 미설정 기본값은 `https://plota.dev`. `API_URL` rewrite는 과거 확장 설정이며 현재 백엔드 존재를 뜻하지 않는다. 배포 설정은 이번 개편에서 변경하지 않았다.

## 5. 수정할 파일 찾기

아래 `src/` 경로는 모두 `apps/web/src/` 기준이다.

| 요청 | 파일 |
|---|---|
| 허브 | `src/app/[lang]/(site)/page.tsx` |
| 허브·기존 Devlog 헤더/푸터 | `src/app/[lang]/(site)/layout.tsx` |
| Lab 소개 | `src/app/[lang]/(site)/lab/page.tsx` |
| 서비스 경로·정적 생성·메타데이터 | `src/app/[lang]/(products)/[...product]/page.tsx` |
| 서비스별 헤더·메뉴·중국어 하단 탭 | `src/components/product-shell.tsx` |
| FBX·웹툰 페이지 화면 | `src/components/product-pages.tsx` |
| FBX 접수 화면 | `src/components/fbx-create.tsx` |
| FBX 결과·진행 화면 | `src/components/fbx-job.tsx` |
| FBX API 클라이언트·클립 목록·단계 문구 | `src/lib/fbx-api.ts` |
| FBX API 서버(별도 Worker) | `apps/fbx-api/` (자체 README) |
| 필터·제작 데모·중국어 학습 및 저장 | `src/components/product-interactions.tsx` |
| 에셋·작품·회차·중국어 표현 데이터 | `src/lib/mock-data.ts` |
| WebMCP 공개 표현 검색·입력 검증 | `src/lib/chinese-tools.ts` |
| SVG 미리보기 | `src/components/product-art.tsx` |
| 새 서비스 스타일·반응형 | `src/app/products.css` |
| 기존 본문 스타일 | `src/app/globals.css`, `apps/web/tailwind.config.ts` |
| SVG 다운로드 생성 | `apps/web/scripts/generate-concept-art.cjs` |
| 다운로드 결과물 | `apps/web/public/downloads/*-concept.svg` |
| 언어·기존 UI 사전 | `src/lib/i18n.ts`, `src/lib/dictionary.ts` |
| 기존 Markdown 로더 | `src/lib/content.ts` |
| 도메인·SEO·출력물 | `src/lib/site.ts`, `src/lib/seo.ts`, `src/app/sitemap.ts`, `feed.xml/route.ts`, `llms.txt/route.ts` |
| 리다이렉트 | `apps/web/next.config.mjs` |

`productPaths`가 새 서비스의 정적 경로 목록이다. 에셋·회차 경로는 데이터에서 생성된다. 완전히 새로운 페이지를 추가하면 경로 목록·렌더 분기·메타데이터를 함께 갱신한다.

새 서비스는 각각 명시적인 밝은 팔레트를 사용한다. 기존 테마 localStorage 값이 새 서비스나 허브의 가독성을 바꾸지 않도록 스타일을 분리했다. 새 서비스에는 테마/언어 토글을 아직 제공하지 않는다.

`PLOTA Site.html`은 별도 자료이며 Next.js 앱의 진입점이 아니다. 기존 Novel 소스·콘텐츠는 참고 자료로 남아 있으나 기존 공개 URL은 새 웹툰으로 이동한다. 과거 `site-header.tsx`와 콘텐츠 WebMCP 컴포넌트는 새 서비스 셸에서 사용하지 않는다.

## 6. 기존 Markdown 발행 규칙

- Devlog: `apps/web/content/devlog/<분류>/<slug>/meta.yml` + `{lang}.md`.
- 메타: `date`, `tag`, `cover`, `draft`, 선택적 `order`.
- 언어 파일 frontmatter: `title`, `description`; 이후 Markdown 본문.
- 요청 언어 → 영어 → 한국어 순서로 원문을 읽는다. `.mdx` 확장자는 현재 디렉터리 탐색 대상이 아니다.
- slug는 같은 섹션 안에서 유일해야 한다. URL은 분류 폴더 경로를 포함하지 않는다.
- 이미지: `public/images/devlog/{slug}/`; 본문 참조는 `/images/devlog/{slug}/...`.
- `_folder.yml`: 폴더별 `order`, `icon`, 언어별 `title`.
- `draft: true`는 production에서 제외한다. 개발 모드에서는 표시될 수 있다.
- 평면 목록은 최신순, 트리는 폴더 우선·order 우선, 이전/다음 글은 트리 순서다.
- 기존 Novel YAML은 새 웹툰 데이터의 원본이 아니다. 새 작품 편집은 `mock-data.ts`에서 한다.

## 7. 명령과 검증

루트의 기본 명령은 `pnpm dev`, `pnpm build`, `pnpm start`. Cloudflare용은 `pnpm --filter @plota/web run build:worker`, `pnpm run preview`, 실제 배포는 `pnpm run deploy`다. 분석·검증을 위해 배포 명령을 실행하지 않는다.

`apps/web`에서 실행 가능한 검증/보조 명령:

```sh
node scripts/generate-concept-art.cjs
node scripts/check-mock-data.cjs
node scripts/check-preview.cjs # 아래 start 명령으로 서버를 먼저 실행한 뒤 별도 터미널에서 수행
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next start -p 3000
```

현재 도구 환경의 pnpm shim은 설치된 버전과 달라 의도하지 않은 install을 시도했다. 이번 검증은 기존 node_modules의 TypeScript·Next CLI를 직접 실행했다. 의존성 추가·lockfile 변경은 하지 않았다. 기존 Google Font의 빌드 다운로드 때문에 네트워크 허용 후 빌드했다.

자동 점검은 WebMCP 입력 오류, 한국어·중국어·병음 검색, 알 수 없는 검색어, 중복 경로, 퀴즈 정답, 에셋 파일 존재 및 회차 링크를 확인한다.

### 2026-09-25 실제 검증 결과

- 최종 Next.js production build 성공: 정적 페이지 192개 생성(기존 언어 경로·별칭 포함).
- TypeScript 검사, 빌드 내 lint/타입 검사, `check-mock-data.cjs` 통과.
- 실행 서버 점검: canonical 페이지 26개, 리다이렉트 6개, SVG 다운로드 6개, sitemap/RSS/llms.txt, 잘못된 주소 3개의 404 응답 통과.
- 브라우저 확인: 허브·FBX·웹툰 화면, 카테고리/플랫폼 필터, 검색 빈 상태 및 초기화, 제작 샘플 결과.
- 좁은 모바일 화면 확인: 중국어 글자 줄바꿈 수정, 웹툰 회차 이동, 가로 넘침 여부 확인.
- 중국어 퀴즈 오답/정답·4단계 완료, 저장한 표현 새로고침 후 유지, 병음 설정 적용, 기록 초기화 확인. 검증용 학습 기록은 정리했다.
- 브라우저 WebMCP에서 한국어 검색으로 공개 표현을 반환하는 것을 확인. 별도 Inspector/Lighthouse 평가 및 실제 음성 청취는 수행하지 않았다.
- Cloudflare 배포 검증은 수행하지 않았다.

## 8. 이후 수정 원칙

1. Git 변경 상태를 먼저 확인하고 기존 사용자 변경을 보존한다.
2. 서비스 독립 메뉴와 언어 정책을 유지한다. 중국어 앱에 FBX·웹툰 메뉴를 추가하지 않는다.
3. 목업을 실제 기능으로 바꿀 때 파일/모델/호환 검증을 함께 완료하고 문구를 갱신한다.
4. 새 공개 경로는 canonical·sitemap·llms.txt·기존 URL 이동을 확인한다.
5. 데이터·기능 변경은 타입 검사와 빌드, UI 변경은 좁은 모바일 화면과 데스크톱에서 검증한다.
6. 학습 기능은 WebMCP 지원과 무관하게 동작해야 한다. 공개 전용 도구와 개인 학습 기록을 분리한다.
7. 구조 변경과 실제 검증 결과는 이 문서와 작업 기록에 갱신한다. 확인하지 않은 운영 배포 상태를 성공으로 기록하지 않는다.

이번 개편은 로컬 구현·검증 범위다. 커밋·push·Cloudflare 배포는 하지 않았다. 실제 도메인 및 Cloudflare 대시보드 확인, 플랫폼별 FBX 테스트, 최종 웹툰 컷, 전체 서비스 번역은 후속 작업이다.

## 9. HSK 단어장 업데이트 (2026-09-26)

중국어의 기존 4문장 목업은 실제 PDF 기반 HSK 단어장으로 교체했다. 최신 구현·데이터 출처·재추출 절차·WebMCP 제약은 [CHINESE_VOCABULARY.md](CHINESE_VOCABULARY.md)를 우선 참고한다.

- 단일 정적 데이터: `apps/web/public/data/chinese/hsk-1-4.json` (1,200항목 → 1,192개 표제어).
- UI: `src/components/chinese-app.tsx`, 스타일: `src/app/chinese.css`.
- 카탈로그·퀴즈·범위 검사·도구: `src/lib/chinese-vocabulary.ts`.
- 새 경로: `/ko/chinese/vocabulary`, `/ko/chinese/conversation`.
- 중국어는 이제 `product-interactions.tsx`에서 구현하지 않는다. 기존 `chinese-tools.ts`의 4문장 검색은 사용되지 않는 이전 코드다.
- 현재 퀴즈 기록은 저장하지 않는다. 화면 안에서 이번 점수만 표시한다(아래 테마 단어장 개편 기준).
- ChatGPT 앱용 MCP 서버는 구현되지 않았다. 브라우저 WebMCP 및 정적 JSON/요청문 전달을 지원한다.

## 10. 테마 단어장 개편

중국어는 19개 테마 단어장 목록에서 클릭 즉시 퀴즈를 시작한다. 각 단어장은 고정 번호·이름·단어 ID 목록을 단일 JSON의 themes에 보관한다. 전체 1,192개 단어를 중복·누락 없이 분류했다. 이번 점수만 표시하고 누적 정오답·저장·localStorage 기능은 제거했다. 기존 저장 키를 임의로 삭제하지는 않는다. WebMCP는 단어장 이름·번호를 book 인자로 받아 자유로운 문장 패턴 회화의 범위를 제공한다. 세부 규칙은 CHINESE_VOCABULARY.md와 공개 agent-guide.md 참조.

퀴즈 진행 중에는 quiz-active 상태로 공통 헤더·푸터를 숨기고 100dvh 화면을 사용한다. 제목 우측 x 버튼으로 단어장 목록에 복귀하며 결과/목록 화면에서는 공통 레이아웃을 복원한다. 긴 보기·큰 글씨에서 콘텐츠가 잘리지 않도록 보기와 피드백 영역만 필요한 경우 내부 스크롤을 허용한다. 로컬 모바일 325x703 및 267x473 CSS 픽셀 화면에서 페이지 세로 넘침 없음, 답 선택 후 하단 버튼 표시, 종료 후 헤더 복원을 확인했고 프로덕션 빌드를 통과했다.

## 11. WebMCP 진단 (2026-09-27)
등록은 components/chinese-webmcp.tsx의 useChineseWebMcp에서 관리한다. 등록 실패 원인을 표시하고 선택 범위는 ref로 갱신하여 선택할 때마다 도구를 재등록하지 않는다. 회화 페이지의 WebMCP 연결 진단은 실제 document.modelContext.getTools/executeTool을 호출한다. JSON 객체 인수를 우선 사용하며, 이전 Chrome의 정확한 인수 파싱 오류에 한해서 읽기 전용 호출을 JSON 문자열로 재시도한다. 자체 진단 성공은 외부 AI 연결 성공과 다르다. 최근 호출은 자체 진단 중에는 기록하지 않으며, 호출자 신원은 판별하지 않는다. 상태는 메모리에만 유지한다.
사용자 Chrome 확장으로 localhost:3003에서 진단 UI를 실행했다. 최초 객체 인수 호출은 Failed to parse input arguments로 실패했고 문자열 호환 경로에서는 도구 4개 조회, 19개 단어장, 1번 이름/번호의 49개 단어 일치, 검색 및 예문 검사가 통과했다. 진단 구현은 커밋 4097619로 배포했고 운영 사이트에서도 사용자 Chrome 자체 진단을 통과했다. 이후 Codex 내장 브라우저의 WebMCP capability로 운영 사이트 도구 4종을 직접 호출해 19개 단어장, 1번 49개 단어, 번호·이름 일치, 검색 및 예문 검사를 확인했다. 이 세션의 사용자 Chrome 확장에는 직접 호출 capability가 없었으며, 내장 브라우저 결과와 구분한다.


## 12. WebMCP 구축·사용 문서

- [WebMCP 구축 방법](WEBMCP_BUILD_GUIDE.md): 실제 소스 구성, 도구 계약, 등록·정리, Chrome 호환 진단, 배포와 검증.
- [WebMCP 사용 방법](WEBMCP_USAGE_GUIDE.md): 사용자 요청 예시, 실제 에이전트 직접 호출 절차, Chrome 자체 진단, 연결 제한과 오류 해석.
- 최신 WebMCP 상태는 위 문서와 11절을 우선한다. 앞 절의 초기 목업·미배포 기록은 작성 당시의 이력이다.

## 13. FBX 제작 실동작 (P3, 2026-10-12)

목업이던 `/en/fbx/create` 를 실제 접수 화면으로 바꾸고 결과 화면 `/en/fbx/job?id=` 을 더했다. 서버는 `apps/fbx-api`(P2).

| 화면 | 하는 일 |
|---|---|
| `/en/fbx/create` | 초대코드, 그림 1장(PNG·JPG·WEBP ≤10MB), 애니 클립 선택(라이브러리 Walking·Salute + Mixamo FBX 업로드 ≤10MB·최대 4개), 공개 동의 → `POST /jobs` → 결과 페이지로 이동 |
| `/en/fbx/job?id=` | 3초(2분 뒤 8초) 간격 폴링. `queued`(대기 순서) → `running`(단계·진행률 막대) → `done`(3D 미리보기·다운로드) / `failed`(사람 말 사유·다시 보내기). 워커가 꺼져 있으면 그 사실을 알린다 |

- 주소 방식: 정적 생성을 유지하려고 **동적 라우트 대신 `?id=`** 를 쓴다. `productPaths` 에 `fbx/job` 하나만 추가했고 사이트맵에서는 뺐으며 메타데이터는 noindex 다.
- 클립 이름 목록은 `src/lib/fbx-api.ts` 의 `LIBRARY_CLIPS`. 집 PC `serve_data/anims/` 에 클립을 추가하면 이 배열도 같이 늘린다.
- 단계 문구(`STEP_LABELS`)는 워커의 step 값과 1:1 이다(`ovdr/server/README.md` §7). 워커 쪽 단계 이름을 바꾸면 여기도 바꾼다.
- 3D 미리보기는 `public/vendor/model-viewer.min.js` 를 직접 담아 쓴다(출처·갱신법은 `public/vendor/README.md`). 외부 요청은 늘지 않았다 — 확인된 외부 요청은 기존 `globals.css` 의 Pretendard(jsdelivr) 하나뿐이다.

### 검증 (2026-10-12, 로컬)

- `tsc --noEmit` 통과, production build 성공 — 정적 페이지 **207개**(이전 202개 + `fbx/job` ×5 언어).
- 실제 Worker(로컬 wrangler dev) + 실제 사이트(next start)로 Playwright 브라우저 검사 **42항목 전부 통과**:
  접수 폼 검증·업로드·클립 선택 → 접수 → 대기 순서 → 진행 단계·막대 → 완료 → GLB 실제 로드 → FBX 실제 내려받기 →
  제목 편집(보낸 브라우저만) → 남의 브라우저에서는 편집 숨김 → 없는 id·id 없음 안내 → 같은 그림 재접수 안내 →
  실패 화면 → GLB 손상 시 그림으로 내려감 → 모바일 375px 가로 넘침 없음.
- 아직 안 한 것: Cloudflare 배포본에서의 확인, 실제 GPU 변환 1건 관통(= P2 완료 기준), 다른 브라우저·실기기 확인.
