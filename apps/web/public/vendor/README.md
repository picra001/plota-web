# public/vendor

저장소에 직접 담아 쓰는 외부 파일. npm 의존성·CDN 없이 우리 도메인에서만 제공한다.

| 파일 | 출처 | 버전 | 라이선스 |
|---|---|---|---|
| `model-viewer.min.js` | `@google/model-viewer` npm tarball 의 `dist/model-viewer.min.js` | **4.4.0** (2026-10-11 내려담음) | BSD-3-Clause (Google LLC) |

`model-viewer.min.js` 는 ES 모듈이다 — `<script type="module" src="/vendor/model-viewer.min.js">` 로만 불러온다.
FBX 결과 페이지(`/en/fbx/job`)에서 `preview.glb` 를 돌려 보는 데 쓴다.

갱신:

```bash
V=4.4.0   # https://registry.npmjs.org/@google/model-viewer/latest 로 확인
curl -sfL "https://registry.npmjs.org/@google/model-viewer/-/model-viewer-$V.tgz" -o /tmp/mv.tgz
tar -xzOf /tmp/mv.tgz package/dist/model-viewer.min.js > apps/web/public/vendor/model-viewer.min.js
```

(jsdelivr/unpkg 는 이 작업 환경에서 막혀 있어 npm 레지스트리 tarball 을 쓴다.)
