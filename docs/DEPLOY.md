# 배포 워크플로우

최종 갱신: 2026-11-09 (Next.js 16 업그레이드, Cloudflare 빌드 준비)

## 1. 지금 운영 구조

| 대상 | 호스팅 | 배포 방법 |
|---|---|---|
| `apps/web` (plota.ai) | **Vercel** | `main` 에 push 하면 Vercel 이 자동 빌드·배포 (`vercel.json`: `pnpm install` → `next build`) |
| `apps/fbx-api` (fbx-api.plota.ai) | Cloudflare Worker + D1 + R2 | 수동: `pnpm run deploy:api` |
| `games/<게임>` | 별도 배포 없음 | 빌드 결과를 `apps/web/public/games/<게임>/` 에 커밋하면 사이트와 함께 나간다 |

- 확인 근거: 운영 응답 헤더 `server: Vercel`, GitHub 커밋 상태에 Vercel 프로젝트 3개(`plota-web-web`, `-pdsz`, `-ioel`)가 올라온다.
- `apps/web/wrangler.jsonc`·`open-next.config.ts` 는 **Cloudflare 로 옮길 때를 위한 설정**이다. 지금 운영에는 쓰이지 않는다(3절).

## 2. 평소 배포 순서 (Vercel)

1. 작업 전 `git status` 로 남의 변경이 없는지 확인한다.
2. 수정 후 로컬 검사
   ```sh
   pnpm install                      # package.json·lockfile 이 바뀐 경우만
   pnpm run lint                     # = tsc --noEmit (apps/web)
   pnpm run build                    # = next build (Turbopack)
   pnpm run start                    # http://localhost:3000 에서 확인
   ```
   최소 확인 경로: `/`(메인 게임), `/home`, `/ko/fbx/create`, `/ko/chinese`, `/ko/webtoon`, `/ko/devlog`, 글 하나, `/sitemap.xml`.
3. 웹게임을 고쳤다면 먼저 게임을 빌드한다(`games/README.md`).
   ```sh
   cd games/habitats && npm install && npm run build && cd ../..
   node games/set-main.mjs habitats  # 메인 게임일 때만. / 화면(public/index.html) 갱신
   ```
4. 커밋 → `git push`. 1~2분 뒤 GitHub 커밋 상태의 Vercel 3개가 모두 success 인지 본다.
   ```sh
   curl -s https://api.github.com/repos/picra001/plota-web/commits/<커밋>/status
   ```
5. 운영 사이트에서 2번의 경로를 다시 연다. 문제가 있으면 Vercel 대시보드에서 직전 배포로 되돌린다(Instant Rollback).

주의
- `pnpm-lock.yaml` 은 `package.json` 과 함께 커밋한다. Vercel 은 lockfile 기준으로 설치한다.
- 빌드는 외부 폰트를 내려받지 않는다(Google Fonts 의존 제거). Pretendard 는 CSS 에서 jsdelivr 로 불러온다.

## 3. Cloudflare Workers 로 옮길 때

준비는 끝나 있다. 아래 순서로 옮긴다.

1. 로컬 확인
   ```sh
   pnpm run preview # opennextjs-cloudflare build && preview (로컬 wrangler, 정적 캐시도 채움)
   ```
   2절의 경로가 모두 200 인지, Devlog 글(`/ko/devlog/<slug>`)까지 열리는지 본다.
2. 첫 배포: `pnpm run deploy` (= `opennextjs-cloudflare build && opennextjs-cloudflare deploy`). Worker 이름 `web`. `pnpm deploy` 는 pnpm 내장 명령이라 `run` 을 꼭 붙인다.
   또는 Cloudflare 대시보드 Workers Builds 에 저장소를 연결하고
   - Root directory: `apps/web`
   - Build command: `pnpm exec opennextjs-cloudflare build`
   - Deploy command: `pnpm exec opennextjs-cloudflare deploy`
3. `*.workers.dev` 주소에서 확인한 뒤 plota.ai 도메인을 Worker 에 연결하고, Vercel 의 도메인 연결과 자동 배포를 끈다.
4. 이 문서 1절과 `PROJECT_CONTEXT.md` 를 실제 상태로 고친다.

설정 요점
- `open-next.config.ts`: `staticAssetsIncrementalCache` + `enableCacheInterception`. 빌드 때 만든 페이지를 Workers 정적 에셋에서 읽는다. 이 설정이 없으면 `dynamicParams=false` 인 Devlog 글 등이 404 가 된다(2026-11-09 로컬에서 재현·해결 확인). ISR·재검증을 쓰기 시작하면 R2/KV 캐시로 바꿔야 한다.
- `/` 는 `public/index.html`(메인 게임)을 Cloudflare 에셋이 Worker 보다 먼저 내준다. `/games/<게임>` 은 `/games/<게임>/` 로 한 번 리다이렉트된 뒤 열린다(Vercel 은 반대로 끝 `/` 를 뗀다). 둘 다 정상이다.
- `opennextjs-cloudflare deploy` 는 정적 캐시를 함께 올린다. `wrangler deploy` 만 단독으로 쓰지 않는다.

## 4. Next.js 버전 정책

- `@opennextjs/cloudflare` 는 **Next 지원 종료 버전이면 빌드를 거부**한다(메이저 출시 후 2년. Next 15 는 2026-10-21 종료). 그래서 2026-11-09 에 Next 16(16.4.5)·`@opennextjs/cloudflare` 1.20.16·wrangler 4.148+ 로 올렸다.
- Next 16 은 2027-10-21 에 지원이 끝난다. 그 전에 Next 17 로 올린다. `--dangerouslyUseUnsupportedNextVersion` 플래그로 우회하지 않는다(보안 패치가 끊긴 버전을 계속 쓰게 됨).
- `@opennextjs/cloudflare` 의 `next` peer 범위를 먼저 확인하고 함께 올린다: `npm view @opennextjs/cloudflare peerDependencies`.
- Next 16 에서 바뀐 점(이 저장소 기준)
  - `next build` 가 Turbopack 기본. `next lint` 가 없어져 `lint` 스크립트는 `tsc --noEmit` 이다(ESLint 설정 파일이 원래 없었다).
  - `tsconfig.json` 의 `jsx` 가 `react-jsx` 로, include 에 `.next/dev/types` 가 추가됐다(Next 가 자동 수정).
  - `lib/content.ts` 의 `process.cwd()` 경로에 `turbopackIgnore` 를 달고, `content/` 는 `next.config.mjs` 의 `outputFileTracingIncludes` 로 서버 번들에 넣는다. 이렇게 안 하면 프로젝트 전체가 서버 번들에 추적된다는 경고가 난다.

## 5. 이 작업 환경에서의 검증 메모

Claude 원격 작업 VM 은 Windows 의 `node_modules`(pnpm 심볼릭 링크·Windows 바이너리)를 쓸 수 없어 `/tmp` 에 저장소를 복사해 `pnpm install --frozen-lockfile` 로 설치하고 빌드했다. push 는 VM 에 GitHub 인증이 없어 Windows 터미널에서 한다.
