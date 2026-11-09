# games — plota.ai 웹게임

게임 하나 = 폴더 하나. 각 게임은 독립된 Vite 프로젝트이고, 빌드하면
`apps/web/public/games/<게임>/` 으로 정적 파일이 나간다. 사이트는 그 파일을 그대로 서빙한다.

| 폴더 | 공개 주소 | 비고 |
|---|---|---|
| `habitats/` | `/games/habitats` | 메인 게임. `plota.ai/` 접속 시에도 이 게임이 바로 열린다 |

## 빌드·배포

```sh
cd games/habitats
npm install
npm run build          # → apps/web/public/games/habitats/ 를 새로 만든다
cd ../..
node games/set-main.mjs habitats   # 메인 게임이면: plota.ai/ 첫 화면(public/index.html) 갱신
```

빌드 결과(`apps/web/public/games/<게임>/`)를 **같이 커밋**해야 배포된다.
Cloudflare 빌드는 게임을 다시 빌드하지 않는다(pnpm 워크스페이스에 포함하지 않음).
`plota.ai/` 는 `apps/web/public/index.html` 을 Cloudflare 에셋이 그대로 내주는 방식이라, 메인 게임을 다시 빌드하면 `set-main.mjs` 도 다시 실행해야 새 파일 이름이 반영된다.

## 새 게임 추가

1. `games/<새게임>/` 에 Vite 프로젝트를 둔다. `vite.config.ts` 의 `base` 를 `/games/<새게임>/`,
   `build.outDir` 를 `../../apps/web/public/games/<새게임>` 으로 맞춘다.
2. 코드 안의 절대 경로(`/assets/...`)는 `import.meta.env.BASE_URL` 기준으로 쓴다.
3. `npm run build` 후 결과물까지 커밋한다.
4. `apps/web/src/lib/home-apps.ts` 에 홈 화면 아이콘을 추가한다.
5. 메인 게임을 바꾸려면 `node games/set-main.mjs <새게임>` 을 실행하고 `home-apps.ts` 의 `featuredGame` 도 바꾼다.

저장은 게임마다 브라우저 localStorage 키를 따로 쓴다(같은 도메인이라 키가 겹치지 않게 접두사를 붙인다).
