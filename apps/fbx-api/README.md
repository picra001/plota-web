# fbx-api — 그림 1장 → OverDare 반입용 FBX 작업 큐 (Cloudflare Worker)

브라우저는 이 Worker 에만 접수하고, 집 PC(ComfyUI 컨테이너)가 **바깥으로만** 폴링해 작업을 가져간다.
산출물은 R2 `plota-assets` 에 올라가고 `assets.plota.ai` 로 공개된다. 집 PC 로 들어오는 포트는 하나도 열지 않는다.

```
브라우저 ──▶ fbx-api.plota.ai (Worker) ── D1 jobs ── R2 plota-assets
         ──▶ assets.plota.ai (공개·CDN)        ▲
                                               │ 20초마다 claim (Bearer WORKER_TOKEN)
                              집 PC: ovdr/server/worker.py --api   (comfyui-docker 저장소)
```

설계 근거와 전체 로드맵은 comfyui-docker 저장소의 `ovdr/docs/fbx_web_service_plan_v2.md` §6·§8,
워커 쪽 규약은 `ovdr/server/README.md` §7.

---

## 설정 절차 (처음 한 번)

명령은 `C:\Projects\site-blog\apps\fbx-api` 에서 PowerShell 로 실행한다. `pnpm exec` 대신 `npx` 도 된다.

### 1. 의존성 · D1

```powershell
pnpm install
pnpm exec wrangler login
pnpm exec wrangler d1 create fbx-jobs
```

마지막 명령이 출력한 `database_id` 를 `wrangler.jsonc` 의 `REPLACE_WITH_D1_ID` 자리에 붙여 넣고, 스키마를 적용한다.

```powershell
pnpm --filter @plota/fbx-api db:apply
```

### 2. 시크릿 3개

토큰은 길고 무작위여야 한다. PowerShell 에서 만들기: `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`

```powershell
pnpm exec wrangler secret put WORKER_TOKEN
pnpm exec wrangler secret put ADMIN_TOKEN
pnpm exec wrangler secret put INVITE_CODES
```

- `WORKER_TOKEN` — 집 PC 워커용. 같은 값을 comfyui-docker 의 `.env` `FBX_WORKER_TOKEN` 에 넣는다.
- `ADMIN_TOKEN` — 숨기기·requeue·삭제용. 운영자만.
- `INVITE_CODES` — 쉼표로 여러 개. 예: `plota2026,family`

로컬 `wrangler dev` 는 시크릿을 `.dev.vars` 에서 읽는다. `cp .dev.vars.example .dev.vars` (커밋 금지).

### 3. R2 공개 도메인

버킷 `plota-assets` 는 P0-3 에서 이미 만들었다. 대시보드에서
**R2 → plota-assets → Settings → Public access → Connect custom domain** 에 `assets.plota.ai` 를 연결한다.

- 공개되는 키는 `p/<작업id>/...` 뿐이다. 입력 이미지와 사용자가 올린 클립은 `priv/jobs/<작업id>/...` 에 두고
  이 Worker 가 중계한다(숨긴 작업은 404). 다만 **R2 공개 도메인은 키를 아는 사람에게는 `priv/` 도 내준다** —
  작업 id 가 UUID 라서 추측은 사실상 불가능하지만, 더 막으려면 `assets.plota.ai` 에
  WAF 규칙 `URI Path starts with "/priv/"` → Block 을 하나 추가한다(권장).
- **CORS (필수, 2026-10-19 적용)**: 결과 페이지의 3D 미리보기(model-viewer)는 `preview.glb` 를 `fetch` 로 읽는다.
  CORS 규칙이 없으면 브라우저가 막아 원본 그림(poster)만 보인다(다운로드 링크는 CORS 와 무관해서 된다).
  규칙 파일 `r2-cors.json`(plota.ai · www.plota.ai · localhost:3000, GET/HEAD):
  `npx wrangler r2 bucket cors set plota-assets --file r2-cors.json -y` → 확인 `npx wrangler r2 bucket cors list plota-assets`.
  사이트 주소를 새로 쓰면 `origins` 에 추가하고 다시 set.

### 4. 커스텀 도메인 · 배포

`wrangler.jsonc` 의 `routes` 가 `fbx-api.plota.ai` 를 쓴다. 존이 아직 없다면 그 블록을 주석 처리하고
`workers.dev` 주소로 먼저 테스트한다.

```powershell
pnpm deploy:api
```

### 5. 집 PC 워커 연결

comfyui-docker 저장소에서 `.env.example` 을 `.env` 로 복사해 `FBX_API_URL`·`FBX_WORKER_TOKEN` 을 채우고
호스트 PowerShell 에서 `docker compose up -d`. 자세한 내용은 `ovdr/server/README.md` §7.

### 6. 사이트 연결 (P3)

접수·결과 화면은 같은 저장소의 `apps/web` 에 있다(`/en/fbx/create`, `/en/fbx/job?id=`).

- 사이트가 부를 주소는 **빌드 시점 환경변수** `NEXT_PUBLIC_FBX_API_URL` 이다. 미설정 기본값은 `https://fbx-api.plota.ai`.
  Cloudflare 빌드 설정에 넣거나, 기본값을 그대로 쓴다.
- 이 Worker 의 `ALLOW_ORIGIN`(`wrangler.jsonc` vars)에 사이트 주소가 들어 있어야 브라우저가 호출할 수 있다.
  운영은 `https://plota.ai`. 미리보기 도메인이나 로컬을 쓰려면 쉼표로 덧붙인다:
  `"ALLOW_ORIGIN": "https://plota.ai,http://localhost:3000"`
- 둘을 같이 띄워 보기: 한 창에서 `pnpm dev:api`, 다른 창에서
  `NEXT_PUBLIC_FBX_API_URL=http://127.0.0.1:8787 pnpm dev` (Worker 쪽 ALLOW_ORIGIN 에 `http://localhost:3000` 포함).

---

## 점검

```powershell
# 1) 로컬: 한 창에서 dev, 다른 창에서 테스트 (42개 항목)
pnpm dev:api
bash test_api.sh

# 2) 배포본
$env:BASE="https://fbx-api.plota.ai"; $env:INVITE="<초대코드>"; $env:WTOK="<워커토큰>"; $env:ATOK="<운영자토큰>"; $env:ASSETS="https://assets.plota.ai"
bash test_api.sh
```

`test_api.sh` 는 실제 작업 행을 만든다. 배포본에 돌린 뒤에는 남은 작업을 지운다.

```powershell
curl -X POST "https://fbx-api.plota.ai/admin/jobs/<id>" -H "Authorization: Bearer <운영자토큰>" -d '{\"delete\":true}'
```

### 실제 접수 1건 (P2 완료 기준)

```powershell
curl -X POST https://fbx-api.plota.ai/jobs -F invite=<초대코드> -F consent=1 -F image=@kid.png -F "anims={\"anims\":[\"Walking\"],\"default\":\"Walking\"}"
curl https://fbx-api.plota.ai/jobs/<id>          # status 가 queued → running → done
curl -I https://assets.plota.ai/p/<id>/final.fbx # 200 이면 공개 확인
```

---

## 엔드포인트

| 엔드포인트 | 호출자 | 동작 |
|---|---|---|
| `POST /jobs` (multipart) | 브라우저 | `invite`·`consent=1`·`image` 필수, `anims`(요청서 JSON)·`clip_<이름>`(FBX) 선택. 같은 이미지는 기존 작업 id 를 돌려준다 |
| `GET /jobs/{id}` | 브라우저 | 상태·단계·진행률·대기순서·워커 온라인·공개 파일 URL |
| `GET /jobs/{id}/input.png` | 브라우저 | 입력 이미지 중계 (숨긴 작업은 404) |
| `PATCH /jobs/{id}` | 생성자 | Bearer `owner_token` → `title`, `public` |
| `GET /jobs?public=1&limit=&cursor=` | 브라우저 | 완료·공개 작업 목록 (60초 캐시) |
| `POST /worker/claim` | 집 PC | 가장 오래된 `queued` 1건을 `running` 으로. 요청서·업로드 클립 목록을 함께 준다 |
| `POST /worker/ping` | 집 PC | 생존 표시만 (PAUSE·로컬 작업 중) |
| `GET /worker/jobs/{id}/input` · `/clips/{이름}` | 집 PC | 입력 이미지 · 사용자 업로드 클립 |
| `POST /worker/jobs/{id}/progress` | 집 PC | `{step, progress, log_tail}` → heartbeat 갱신. 응답 `cancelled` 로 중단 통보 |
| `PUT /worker/jobs/{id}/files/{이름}` | 집 PC | R2 `p/<id>/<이름>` 업로드. 허용 이름만: `final.fbx` `preview.glb` `preview.png` `thumb.webp` `anims/<클립>_ovdr.fbx` |
| `POST /worker/jobs/{id}/finish` | 집 PC | `{ok, files, seed_used, skeleton_src, body_type, anim_default, comfy_crash, error_private}` → `done`/`failed` |
| `POST /admin/jobs/{id}` | 운영자 | `{hidden, requeue, delete_input, delete}` |
| `GET /admin/jobs` | 운영자 | 최근 50건 (비공개 사유 포함) |
| `GET /health` | 누구나 | 워커 온라인 여부 |

`/worker/*` 와 `/admin/*` 은 Bearer 토큰 없이는 401. 접수는 초대코드 + `consent=1` + 대기열 5건 + 이미지 10MB·클립 10MB·선두 바이트 검사.

## 상태

`queued → running → done | failed`. cron(5분)이 `running` 인데 heartbeat 가 15분 넘은 작업을 `failed("연결이 끊겼습니다")` 로
정리하고, 실패한 지 7일 지난 작업의 `priv/` 입력을 지운다. 집 PC 가 꺼져 있어도 접수는 쌓이고, 켜지면 순서대로 처리된다.

### P2 설계 결정 (2026-10-11)

1. **업로드 목록** = 기본 4개 + `anims/*.fbx` 전부 (웹에서 클립별 다운로드 가능)
2. **요청서 형식** = 집 PC inbox 와 같은 `{"anims":[...],"default":"..."}` — 워커가 그대로 파일로 떨어뜨려 기존 해석 코드를 그대로 쓴다
3. **사용자 FBX 업로드** 허용 — `clip_<이름>` 필드, 10MB·FBX 서명 검사, 성공하면 `priv/` 원본 삭제
4. **크래시 재시도 없음**(PoC) — ComfyUI 가 작업 중 죽으면 `comfy_crash` 로 실패 보고만 하고 사용자에게 재접수를 안내한다
