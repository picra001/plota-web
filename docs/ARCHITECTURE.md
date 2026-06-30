# Plota Web — 설계 의도 문서 (Architecture & Strategy)

> 이 문서는 `plota-web` 프로젝트의 **설계 의도**와 **우선 목표**를 기록한다.
> 모든 기술 선택과 코드 구조는 아래 3대 우선 목표를 기준으로 판단한다.

---

## 0. 한 줄 요약

> 메인 사이트(랜딩 겸 블로그) 아래에 여러 토이 프로젝트가 붙는 구조.
> **콘텐츠를 자주 발행해 사이트 전체의 검색·생성형 엔진 노출을 높이고**,
> **서버 비용은 최소(이상적으로 0원)로 유지**하는 것을 최우선으로 한다.

---

## 1. 우선 목표 (Priority Goals)

우선순위가 충돌할 때는 아래 순서대로 판단한다.

### 1순위. SEO (Search Engine Optimization)
전통 검색엔진(Google, Naver, Bing)에서의 노출/순위 상승.

- **모든 콘텐츠는 SSG(정적 생성) 또는 SSR로 제공** — 크롤러가 완성된 HTML을 받도록 한다. CSR(클라이언트 렌더링)로 콘텐츠 본문을 내리지 않는다.
- 페이지별 `title` / `description` / `canonical` 메타데이터 필수.
- **구조화 데이터(JSON-LD)**: 글은 `Article`, 사이트는 `WebSite`/`Organization` 스키마.
- `sitemap.xml`, `robots.txt`, **RSS 피드** 자동 생성.
- 깔끔한 URL: 블로그는 **서브디렉터리** `/{locale}/blog/{slug}` 형태로 도메인 권위를 한곳에 집중(서브도메인 분산 금지).
- Core Web Vitals(LCP/CLS/INP) 최적화 — 정적 + 이미지 최적화로 확보.

### 2순위. GEO (Generative Engine Optimization)
ChatGPT, Perplexity, Gemini, Claude 등 **생성형 AI/답변형 엔진**에 인용·노출되도록 최적화.

- **명료한 시맨틱 HTML**과 구조: 질문형 H2/H3, 요약 문단을 글 상단에 배치(인용하기 좋은 형태).
- **`/llms.txt` 제공**: 사이트의 핵심 콘텐츠/구조를 LLM이 이해하기 쉽게 요약 제공.
- **FAQ / HowTo 구조화 데이터** 적극 활용 — 답변형 엔진이 발췌하기 좋다.
- 사실·수치·정의를 **자족적인(self-contained) 문장**으로 작성(맥락 없이도 인용 가능하게).
- 크롤러 차단 금지: GPTBot, PerplexityBot 등 AI 크롤러를 `robots.txt`에서 허용.
- 명확한 출처/날짜/저자 표기로 **신뢰 신호(E-E-A-T)** 강화.

### 3순위. 서버 비용 최소화 (Cost Minimization)
가능한 한 **무료 티어**로 운영하고, 트래픽이 늘기 전에는 상시 구동 서버를 두지 않는다.

- 블로그/랜딩은 **100% 정적(SSG)** → Vercel(또는 정적 호스팅) 무료 티어로 사실상 0원.
- **DB·인증·관리자 서버 불필요**: 글은 Markdown/MDX 파일로 git에 커밋(파일 기반 CMS).
- **백엔드(NestJS)는 "필요해질 때" 도입**: 토이 프로젝트가 실제 동적 로직을 요구하기 전에는 배포하지 않는다(상시 서버 = 비용 발생 지점).
- BE 도입 시에도 무료 티어(Railway/Render/Fly.io)부터, 자동 슬립/스케일-투-제로 우선.
- 외부 유료 SaaS(CMS, 검색, 분석) 의존 최소화. 분석은 무료(예: Vercel Analytics 무료 범위, 또는 Plausible 자가호스팅 추후 검토).

---

## 2. 비기능 요구사항 / 운영 원칙

- **단일 작성자**: "나만 글을 쓸 수 있어야 한다" → 저장소 push 권한 = 작성 권한. 별도 인증/admin 코드 없음.
- **공유 용이성**: 모든 글은 Open Graph / Twitter Card 메타를 갖춰 SNS·메신저에서 썸네일 카드로 공유된다.
- **발행 워크플로우**: `.mdx` 파일 작성 → git commit/push → 호스팅 자동 빌드·배포.
- **확장성**: 토이 프로젝트가 늘어나는 것을 전제로 모노레포 + 공유 패키지 구조.

---

## 3. 아키텍처 개요

### 3.1 모노레포 (단일 저장소, 분리 배포)

```text
plota-web/
├─ apps/
│  ├─ web/        # Next.js (App Router) — 랜딩 + 블로그 + 토이 프로젝트 프론트  → Vercel(무료, 정적)
│  └─ api/        # NestJS — 토이 프로젝트 백엔드 (※ 필요 시점에 추가)         → Railway/Render(무료 티어)
├─ packages/
│  ├─ types/      # FE·BE 공유 DTO/타입
│  ├─ ui/         # 공통 UI 컴포넌트
│  └─ config/     # 공통 eslint / tsconfig
└─ docs/          # 본 설계 문서 등
```

- **분리 배포여도 모노레포 유지**: 타입/디자인 공유, 원자적 변경(한 PR), 1인 관리 효율 때문.
- Vercel은 Root Directory를 `apps/web`로, BE 호스팅은 `apps/api`로 지정해 각자 빌드.

### 3.2 왜 NestJS를 Vercel에 올리지 않는가
Vercel은 서버리스(요청마다 함수 기동) 모델이라 **상시 구동형 NestJS**와 맞지 않는다(콜드스타트, 실행시간 제한, WebSocket/Cron 불가, DB 커넥션 폭증, 어댑터 래핑 필요). 따라서:

- `apps/web`(Next.js) → **Vercel** (Root Directory `apps/web`, Ignored Build Step `npx turbo-ignore`)
- `apps/api`(NestJS) → **Railway/Render/Fly.io** (필요 시, Root Directory `apps/api`)
- 도메인은 하나로 묶고 `/api/*`를 rewrite로 BE에 프록시 → SEO 권위 집중 + 비용 최소.
  - 연결 고리는 환경변수 **`API_URL`**: Vercel에 BE URL을 넣으면 `next.config.mjs`의 rewrite가 `/api/*` → BE로 프록시(미설정 시 비활성).
  - 구체 배포 설정값은 [`README.md`](../README.md#배포-분리-배포) 표 참고.

### 3.3 라우팅 / URL 전략

| 경로 | 설명 | 렌더링 |
|---|---|---|
| `/` | 메인 랜딩 (사이트 소개 + 최신 글 + 토이 프로젝트 진입) | SSG |
| `/blog` | 글 목록 | SSG |
| `/blog/{slug}` | 글 상세 | SSG (+ ISR 선택) |
| `/apps/{project}` | 각 토이 프로젝트 진입점 | 프로젝트별 |
| `/sitemap.xml` `/robots.txt` `/feed.xml` `/llms.txt` | SEO/GEO 메타 산출물 | 자동 생성 |

---

## 4. 콘텐츠(글) 작성 규약

글은 `apps/web/content/posts/{slug}.mdx` 에 작성한다. Frontmatter 표준:

```yaml
---
title: "글 제목"              # SEO title
description: "한 줄 요약"      # meta description / OG description (인용되기 좋게)
date: 2026-06-30             # 발행일 (ISO)
slug: my-post                # URL 슬러그
tags: [nextjs, seo]
thumbnail: /og/my-post.png   # OG 이미지 (선택)
draft: false                 # true면 빌드에서 제외
---
```

작성 가이드(GEO 친화):
- 글 첫 문단에 **자족적 요약**(이 글이 무엇을 답하는지)을 둔다.
- 소제목은 가능하면 **질문형**으로(검색·답변 엔진이 매칭하기 좋음).
- 핵심 정의/수치/단계는 목록·표로 명확히.

---

## 5. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프론트/렌더링 | **Next.js (App Router) + TypeScript** | SSG/SSR + SEO 메타 API + 생태계 |
| 스타일 | Tailwind CSS | 빠른 개발 + 일관된 모던 UI |
| 콘텐츠 | **MDX 파일 + gray-matter** | DB·서버 없는 파일 기반 CMS(비용 0, 단일 작성자) |
| 백엔드(추후) | NestJS | 토이 프로젝트용 구조적 API |
| 패키지/모노레포 | pnpm workspace + Turborepo | 경량, 캐시, 공유 패키지 |
| FE 배포 | Vercel(무료) | 정적/ISR 최적, 비용 0에 가까움 |
| BE 배포(추후) | Railway/Render/Fly.io | 무료 티어, 스케일-투-제로 |

---

## 6. 단계별 로드맵

1. **(현재) 메인 랜딩 + 블로그 골격 + SEO/GEO 기반** 구축, Vercel 배포. — 비용 0
2. 콘텐츠 누적(자주 발행) + OG 이미지/공유 버튼 다듬기.
3. 첫 토이 프로젝트 추가. 동적 로직이 필요하면 그때 `apps/api`(NestJS) 도입.
4. 트래픽/필요에 따라 분석·검색·캐시 등 점진 도입(무료 우선).

---

## 7. 의사결정 기록 (요약)

- 글 작성 방식: **파일 기반 MDX**(웹 admin/DB 미사용) — 비용·복잡도 0, 단일 작성자에 최적.
- 배포: FE=**Vercel**, BE=**별도 호스팅**(서버리스 비호환 회피).
- 저장소: **모노레포**(분리 배포여도 유지) — 공유·관리 효율.
- BE는 **지연 도입**(YAGNI) — 상시 서버 비용을 미루는 것이 비용 최소화의 핵심.
