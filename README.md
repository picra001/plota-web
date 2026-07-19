# PLOTA.AI

PLOTA.AI는 **사람이 그린 2D 이미지를 3D 모델로 변환하는 서비스**다. 별도 설치 없이 무료로 변환해 볼 수 있는 웹 워크플로와, 사용자 장비에 직접 구축할 수 있는 무료 로컬 설치 프로그램을 제공하는 것을 목표로 한다.

현재 코어 서비스는 개발 중이며, 이 저장소는 제품 소개 페이지와 5개 언어(ko·en·ja·zh·es)로 발행하는 콘텐츠 영역을 함께 관리한다. 콘텐츠 페이지는 에디터 없이 **마크다운 파일**로 작성하고 정적(SSG)으로 생성한다.

## 사이트 컨셉

- **핵심 가치** — 손으로 그린 2D 아이디어를 실제 제작에 활용할 수 있는 3D 에셋으로 연결한다.
- **무료 웹 변환** — 설치 없이 이미지를 입력하고 3D 변환 워크플로를 경험할 수 있게 한다.
- **무료 로컬 구축** — 데이터와 실행 환경을 직접 통제하려는 사용자를 위해 로컬 설치 프로그램을 제공한다.
- **커뮤니케이션 원칙** — 과장된 AI 표현보다 입력, 재구성, 출력으로 이어지는 기술 흐름과 실제 사용 방식을 명확히 설명한다.
- **시각 방향** — 절제된 레이아웃, 모노스페이스 레이블, 파이프라인 표현을 사용해 테크 전문성이 느껴지도록 한다.

콘텐츠는 두 종류다.

- **Devlog** — 제품을 만드는 과정과 기술적 의사결정을 기록
- **Novel** — PLOTA의 시각 콘텐츠 실험을 담은 짧은 이야기

설계 의도와 전략은 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) 참고.

## 구조

```text
plota-web/
├─ apps/
│  └─ web/
│     ├─ src/app/[lang]/            # 언어별 라우트 (ko·en·ja·zh·es), '/'는 /ko로 리다이렉트
│     │   ├─ page.tsx               # 코어 서비스 소개 홈
│     │   ├─ devlog/                # Devlog 목록 / [slug] 상세
│     │   └─ novel/                 # Novel 목록 / [slug] 상세
│     ├─ src/lib/                   # i18n · 사전(dictionary) · 콘텐츠 로더 · SEO 헬퍼
│     ├─ content/                   # ▶ 글 원본 (마크다운)
│     │   ├─ devlog/{slug}/         #   meta.yml + ko.md en.md ja.md zh.md es.md
│     │   └─ novels/{slug}/         #   meta.yml + ko.md en.md ja.md zh.md es.md
│     └─ public/images/             # ▶ 이미지
│         ├─ devlog/{slug}/...      #   글 본문 그림
│         ├─ novels/{slug}/...      #   컷툰 패널/표지
│         └─ motifs/                #   공용 모티프 SVG
├─ docs/
└─ (추후) apps/api # NestJS 백엔드, packages/* 공유 패키지
```

## 요구사항

- Node.js >= 20
- pnpm 9 (`npm install -g pnpm@9`)

## 개발

```bash
pnpm install        # 의존성 설치
pnpm dev            # 개발 서버 (http://localhost:3000)
pnpm build          # 프로덕션 빌드 (정적 생성)
```

> 참고: 루트 스크립트는 현재 `pnpm --filter`로 직접 실행합니다. Turborepo는 설치돼 있으나
> 일부 Windows 환경에서 네이티브 바이너리 실행에 VC++ 재배포 패키지가 필요해, 기본 스크립트에서는 사용하지 않습니다.

## 글 쓰기 (에디터 없음 — 마크다운만)

별도 편집 화면이 없다. **폴더 하나 + 마크다운 파일**을 추가하고 커밋하면 빌드 시 정적 페이지가 만들어진다.
번역 파일이 없는 언어는 자동으로 **한국어(ko)로 폴백**되므로, 최소 `ko.md` 하나만 있으면 5개 언어 모두에서 글이 노출된다.

> 새 글을 쓸 때는 아래 **예시 폴더를 통째로 복사**해 슬러그(폴더명)만 바꾸고 내용을 채우면 된다.
> - Devlog 예시: `apps/web/content/devlog/read-only-on-purpose/`
> - Novel 예시: `apps/web/content/novels/miros-shop/`

### Devlog 글 추가

1. `apps/web/content/devlog/{slug}/` 폴더 생성 (`{slug}`가 URL이 됨 → `/{lang}/devlog/{slug}`)
2. 공통 메타 `meta.yml` 작성

   ```yaml
   date: 2026-06-28        # 발행일 (정렬 기준)
   tag: ENGINEERING        # 상단 라벨
   cover: cover.png        # (선택) OG 이미지, public/images/devlog/{slug}/ 기준
   draft: false            # true면 프로덕션에서 숨김
   ```

3. 언어별 본문 `ko.md`, `en.md`, `ja.md`, `zh.md`, `es.md` 작성

   ```md
   ---
   title: "글 제목"
   description: "한 줄 요약(목록·검색·OG에 사용)"
   ---

   본문 마크다운. 제목(##), 목록, 인용, 코드블록 사용 가능.

   <figure>
     <img src="/images/devlog/{slug}/fig-01.svg" alt="설명" />
     <figcaption>FIG.01 — 캡션</figcaption>
   </figure>
   ```

### Novel(컷툰) 추가

1. `apps/web/content/novels/{slug}/` 폴더 생성
2. `meta.yml` — 에피소드 정보 + 패널 이미지/톤 순서

   ```yaml
   ep: "014"
   status: LIVE            # LIVE | DRAFT (표시용 배지)
   date: 2026-06-20
   cover: cover.svg
   draft: false
   panels:
     - image: p01.svg      # public/images/novels/{slug}/p01.svg
       tone: plain         # plain | accent(베르밀리온 강조 컷)
     - image: p02.svg
       tone: accent
   ```

3. 언어별 `{lang}.md` — 제목/로그라인 + 패널 캡션(순서가 `panels`와 1:1로 매칭)

   ```md
   ---
   title: "미로의 가게"
   logline: "문 닫을 시간, 마지막 손님이 들어온다."
   captions:
     - "첫 번째 컷 대사/설명"
     - "두 번째 컷 대사/설명"
   ---
   ```

### 이미지 위치 규칙

| 용도 | 경로 | 마크다운/메타에서 참조 |
|---|---|---|
| Devlog 본문 그림 | `apps/web/public/images/devlog/{slug}/파일.svg` | `/images/devlog/{slug}/파일.svg` |
| Novel 패널·표지 | `apps/web/public/images/novels/{slug}/파일.svg` | `meta.yml`의 `image`/`cover`엔 **파일명만** |
| 공용 모티프 | `apps/web/public/images/motifs/*.svg` | `/images/motifs/graph.svg` 등 |

> `public/` 아래는 빌드 시 도메인 루트로 서빙되므로 본문에서는 항상 `/images/...` 절대경로로 쓴다.

## SEO / GEO 산출물

| 경로 | 설명 |
|---|---|
| `/sitemap.xml` | 모든 언어·글 URL + `hreflang`/`x-default` 대체 링크 |
| `/robots.txt` | 크롤러 허용 + 사이트맵 |
| `/feed.xml` | RSS 피드(기본 언어 Devlog) |
| `/llms.txt` | 생성형 엔진(GEO)용 콘텐츠 요약 |

추가로 각 페이지에 언어별 `<link rel="alternate" hreflang>`, canonical, Open Graph(locale), JSON-LD(WebSite/Article/CreativeWork)가 자동 출력된다.

## 배포 (분리 배포)

하나의 저장소(모노레포)지만 FE와 BE는 **서로 다른 플랫폼에 따로 배포**한다.
도메인은 하나(`example.com`)로 묶고, `/api/*` 요청만 BE로 프록시한다.

```text
example.com           → Vercel  (apps/web, Next.js 정적)
example.com/api/*      → Vercel rewrite로 Railway(apps/api)에 프록시
```

### 1. FE — Vercel (`apps/web`)

1. 이 저장소를 GitHub(`picra001/plota-web`)에 push
2. Vercel → New Project → 저장소 선택
3. **Root Directory** = `apps/web` (모노레포 외부 파일 포함은 기본 활성)
4. Framework Preset = Next.js (자동 감지)
5. **Ignored Build Step** = `npx turbo-ignore` — `apps/web`/`packages` 변경 시에만 빌드(블로그 글만 고쳐도 BE 무관)
6. 환경변수
   - `NEXT_PUBLIC_SITE_URL` = 실제 도메인 (예: `https://plota.dev`)
   - `API_URL` = BE 배포 URL (예: `https://plota-api.up.railway.app`) — **BE 배포 후 설정**. 없으면 `/api/*` 프록시는 비활성.

> Vercel은 빌드 OS가 Linux라, 로컬(Windows)에서 발생한 turbo DLL 이슈와 무관하게 `turbo-ignore`가 정상 동작한다.

### 2. BE — Railway (`apps/api`) — *NestJS 추가 후 적용*

> 비용 최소화 원칙에 따라 BE는 **실제 동적 기능이 필요해질 때** 추가한다. `apps/api`가 생기면 아래대로 설정한다.

1. Railway → New Project → Deploy from GitHub repo → 같은 저장소 선택
2. Service 설정
   - **Root Directory** = `apps/api`
   - **Install** = `pnpm install`
   - **Build** = `pnpm build`
   - **Start** = `pnpm start` (또는 `node dist/main.js`)
   - **Watch Paths** = `apps/api/**`, `packages/**` (해당 변경 시에만 재배포)
3. 환경변수
   - `PORT` = Railway가 주입(코드에서 `process.env.PORT` 사용)
   - 그 외 `DATABASE_URL` 등 프로젝트별 비밀값
4. 배포 후 발급된 URL을 Vercel의 `API_URL` 환경변수에 입력 → `example.com/api/*` 가 BE로 연결됨

### 분리 배포 핵심 정리

| 항목 | Vercel (FE) | Railway (BE) |
|---|---|---|
| 대상 | `apps/web` | `apps/api` |
| Root Directory | `apps/web` | `apps/api` |
| 빌드 트리거 제한 | `npx turbo-ignore` | Watch Paths |
| 비용 | 정적 → 무료 티어 | 무료 티어(스케일-투-제로 우선) |
| 연결 | `API_URL` 로 BE 프록시 | — |
