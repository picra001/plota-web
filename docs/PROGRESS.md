# 진행 기록 (Progress Log)

> 설계 의도는 [`ARCHITECTURE.md`](./ARCHITECTURE.md), 사용법은 [`../README.md`](../README.md) 참고.
> 이 문서는 "지금까지 무엇을 했고, 다음에 무엇을 할지"만 간단히 기록한다.

## 현재 상태 (2026-07-01)

- ✅ 모노레포(pnpm workspace) + Next.js 14(App Router) 블로그/랜딩 구축
- ✅ MDX 파일 기반 글쓰기, SEO/GEO 산출물(sitemap·robots·feed·llms.txt) 동작
- ✅ GitHub 푸시: `picra001/plota-web` (main)
- ✅ **Vercel 프로덕션 배포 성공**: https://plota-web-web-sand.vercel.app
  - 전 경로 200 확인 (`/`, `/blog`, `/blog/{slug}`, `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/llms.txt`)
- 🔜 다음: **로컬에서 사이트 개발 마무리** 후 다시 배포

## 배포 구성 (Vercel)

- Project: `plota-web` / Team: `plota`
- **Root Directory: `apps/web`** (중요)
- Build Command: `next build` (`apps/web/vercel.json`로 고정 — turbo 우회)
- Production = `main` push / Preview = 그 외 브랜치 push / Development = 로컬

## 트러블슈팅 기록 (다시 겪지 않기 위해)

1. **pnpm 버전**: 최신 pnpm은 Node 22 요구 → Node 20 환경이라 **pnpm 9**(`npm i -g pnpm@9`) 사용.
2. **turbo가 로컬(Windows)에서 크래시**: 네이티브 바이너리 DLL 오류(VC++ 런타임 추정).
   → 루트 스크립트를 `pnpm --filter @plota/web ...` 직접 실행으로 변경. Vercel(Linux)은 무관.
3. **Vercel 1차 배포 실패**: Root Directory 미설정으로 출력물(`.next`)을 못 찾음 → `apps/web`로 지정해 해결.
4. **turbo 원격 캐시 우려**: `apps/web/vercel.json`에서 `buildCommand: next build`로 고정.
5. **next-mdx-remote 보안 경고(CVE-2026-0969)**: 5.0.0 → **6.0.0** 업그레이드로 해소.
   - v6는 MDX 내 JS 표현식(`{...}`)을 기본 차단. 현재 글은 순수 마크다운이라 영향 없음.
   - 추후 글에서 JSX/표현식을 쓰려면 `serialize`/RSC 옵션에서 신뢰 콘텐츠 설정 필요.
6. **Vercel 로그인 벽**: Preview URL(`...-해시-...`)은 Deployment Protection으로 로그인 요구.
   → 공개가 목적이면 Settings → Deployment Protection에서 해제. 프로덕션 URL은 공개됨.
7. **GitHub 계정 불일치**: 저장된 자격증명이 `felz-kdy`라 push 403 → 자격증명 삭제 후 `picra001`로 재로그인.

## 로컬 개발 메모

```bash
pnpm install
pnpm --filter @plota/web dev   # http://localhost:3000
pnpm --filter @plota/web build # 정적 빌드 검증
```

- 글 추가: `apps/web/content/devlog/<폴더…>/{slug}/{meta.yml, ko.md}` (규약은 ARCHITECTURE.md 4장)
- 폴더 추가: 디렉터리를 만들고 `_folder.yml` 에 `order` · `title` 을 넣으면 왼쪽 목차에 반영된다
- 이미지: `apps/web/public/images/devlog/{slug}/` 에 두고 `![](/images/devlog/{slug}/파일명)`

## 남은 일 (TODO)

- [ ] **`NEXT_PUBLIC_SITE_URL` 설정** — 현재 sitemap/RSS/OG에 기본값 `https://plota.dev`가 박힘.
      실제 도메인(또는 vercel.app 주소)으로 맞춰야 SEO 정확. (코드 기본값 또는 Vercel 환경변수)
- [ ] 커스텀 도메인 연결(정해지면)
- [ ] (선택) 작업용 `develop` 브랜치 도입 → Preview에서 검토 후 main 머지
- [ ] 콘텐츠 지속 발행, 공유용 OG 이미지 정비
- [ ] (지연) 토이 프로젝트가 동적 기능 필요해질 때 `apps/api`(NestJS) + Railway 추가
