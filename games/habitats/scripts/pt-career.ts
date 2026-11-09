// 스무 살 알바 선택 → 25세 지식 · 첫 직장(공고) 분포
import { generateWorld } from "../src/engine/market";
import { createLife, chooseEvent } from "../src/engine/life";
import { autoSeason } from "../src/engine/auto";
const w = generateWorld(1, 110);
const GROUP: Record<string, string> = { bigco: "사무·공무·전문", sme: "사무·공무·전문", civil: "사무·공무·전문", teacher: "사무·공무·전문", nurse: "사무·공무·전문", startup: "개발", itbig: "개발", store: "서비스·가게", chef: "서비스·가게", shop: "서비스·가게", factory: "현장", logimgr: "현장", designer: "프리랜서" };
for (const pick of [0, 1, 4]) {
  const out: Record<string, number> = {}; let learn = 0, combo = 0; const N = 150;
  for (let i = 0; i < N; i++) {
    const l = createLife(999 + i * 17, w, 4);
    while (!l.flags.firstJob && l.alive) {
      if (l.pendingEventId && l.eventChoice === null && l.phase === "child") {
        const idx = l.age === 19 ? 0 : l.age === 20 ? pick : 0;
        if (chooseEvent(l, w, idx) && l.eventChoice === null) chooseEvent(l, w, 1);
        if (l.age === 20 && (l.parttime?.length ?? 0) >= 2) combo++;
      }
      if (l.phase === "adult" && !l.flags.learn25) { learn += l.learn; l.flags.learn25 = 1; }
      autoSeason(l, w);
    }
    const g = GROUP[l.work?.post ?? ""] ?? "기타"; out[g] = (out[g] ?? 0) + 1;
  }
  console.log(`${pick === 0 ? "공부만" : pick === 4 ? "알바 둘" : "알바 하나"} (둘 성공 ${combo}): 25세 지식 ${(learn / N).toFixed(0)} | ` + Object.entries(out).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v / N * 100)}%`).join(" · "));
}
