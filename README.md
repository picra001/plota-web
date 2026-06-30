# plota-web

메인 블로그(랜딩) + 토이 프로젝트 허브. SEO · GEO · 서버 비용 최소화를 우선 목표로 한 모노레포.

설계 의도와 전략은 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) 참고.

## 구조

```text
plota-web/
├─ apps/
│  └─ web/        # Next.js (App Router) — 랜딩 + 블로그(MDX)  → Vercel 정적 배포
├─ docs/          # 설계 문서
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

## 글 쓰기

`apps/web/content/posts/{slug}.mdx` 파일을 추가하고 frontmatter를 채운 뒤 커밋하면 자동 배포됩니다.

```yaml
---
title: "글 제목"
description: "한 줄 요약"
date: 2026-06-30
slug: my-post
tags: [tag1, tag2]
draft: false
---
```

## SEO / GEO 산출물

| 경로 | 설명 |
|---|---|
| `/sitemap.xml` | 자동 생성 사이트맵 |
| `/robots.txt` | 크롤러 허용 + 사이트맵 |
| `/feed.xml` | RSS 피드 |
| `/llms.txt` | 생성형 엔진(GEO)용 콘텐츠 요약 |

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
