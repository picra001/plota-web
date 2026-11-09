import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// plota.ai 에서는 /games/habitats/ 아래 정적 파일로 올라간다.
// 빌드 결과는 Next.js 의 public 폴더로 바로 나가며, 그 결과물을 Git 에 함께 커밋한다.
export default defineConfig({
  base: "/games/habitats/",
  build: {
    outDir: fileURLToPath(new URL("../../apps/web/public/games/habitats", import.meta.url)),
    emptyOutDir: true,
  },
  server: { host: "127.0.0.1", port: 5181 },
});
