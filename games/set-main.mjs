// plota.ai/ 첫 화면으로 띄울 메인 게임을 정한다.
//   node games/set-main.mjs habitats
// apps/web/public/games/<게임>/index.html 을 apps/web/public/index.html 로 복사한다.
// Cloudflare 에셋이 / 요청에 이 파일을 바로 내준다(Worker·Next.js 를 거치지 않음).
// 게임을 다시 빌드해 파일 이름(해시)이 바뀌면 이 명령도 다시 실행한다.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const game = process.argv[2];
if (!game) { console.error("사용법: node games/set-main.mjs <게임 폴더 이름>"); process.exit(1); }
const pub = fileURLToPath(new URL("../apps/web/public/", import.meta.url));
const src = `${pub}games/${game}/index.html`;
if (!existsSync(src)) { console.error(`${src} 가 없습니다. 먼저 games/${game} 에서 npm run build 를 실행하세요.`); process.exit(1); }
copyFileSync(src, `${pub}index.html`);
console.log(`메인 게임: ${game} → apps/web/public/index.html`);
