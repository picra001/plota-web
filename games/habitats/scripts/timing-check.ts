// 언제 샀느냐: 과열기 매수 · 폭락기 매수 · 보통 때 매수 → 60세 순자산, 급매·경매, 행복
import { generateWorld, worldYear } from "../src/engine/market";
import { createLife, netWorth } from "../src/engine/life";
import { autoYear } from "../src/engine/auto";
const N = Number(process.argv[2] ?? 300);
const G: Record<string, { n: number; nw: number; dist: number; happy: number; credit: number }> = {};
for (let i = 0; i < N; i++) {
  const w = generateWorld(3000 + i, 110); const l = createLife(11000 + i * 7, w, 4);
  let nw60 = 0;
  while (l.alive && l.age < 61) { autoYear(l, w); if (l.age === 60) nw60 = netWorth(l, worldYear(w, l.year, 1)); }
  const st = l.stories.find((s) => s.id === "house")?.steps.find((x) => x.text.includes("샀다"));
  const fy = l.flags.firstBuyYear, rg = l.flags.firstBuyRegime;
  const k = !fy || fy - l.birthYear > 60 ? "안 삼(25~60)" : rg === 1 ? "과열기에 첫 매수" : rg === -1 ? "폭락기에 첫 매수" : "보통 때 첫 매수";
  const g = (G[k] ??= { n: 0, nw: 0, dist: 0, happy: 0, credit: 0 }); g.n++; g.nw += nw60;
  g.dist += l.feed.some((f) => /급매로 팔았|경매로 넘어/.test(f.sub ?? "") || (f.lines ?? []).some((x) => /급매로 팔았|경매로 넘어/.test(x))) ? 1 : 0;
  g.happy += l.mind; g.credit += st?.text.includes("신용대출") ? 1 : 0;
}
for (const [k, g] of Object.entries(G)) console.log(`${k}: ${g.n}명 · 60세 순자산 ${(g.nw / g.n / 10000).toFixed(1)}억 · 급매·경매 ${Math.round(g.dist / g.n * 100)}% · 신용대출까지 ${Math.round(g.credit / g.n * 100)}% · 60세 행복 ${Math.round(g.happy / g.n)}`);
