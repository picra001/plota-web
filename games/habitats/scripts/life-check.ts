// 초반 선택의 결과 분포: 첫 직장 · 연애·결혼 · 투잡 · 휴가 · 이별
import { generateWorld } from "../src/engine/market";
import { createLife } from "../src/engine/life";
import { autoToEnd } from "../src/engine/auto";
const N = Number(process.argv[2] ?? 200);
const posts: Record<string, number> = {}; let married = 0, marryAge = 0, breakups = 0, side = 0, firstLove = 0, failed = 0, kids = 0;
let pts: Record<string, number> = {}; const ages: number[] = [];
for (let i = 0; i < N; i++) {
  const w = generateWorld(500 + i, 110);
  const l = createLife(9000 + i * 7, w, 4);
  autoToEnd(l, w);
  const fj = l.stories.find((s) => s.id === "first_job");
  const first = l.jobHistory.find((h) => h.jobId !== "child");
  if (fj) { const m = fj.steps[0].text.match(/(.+?)\(으\)로 첫 출근|(.+?)\(으\)로 시작했다/); if (fj.steps[0].text.includes("떨어졌다")) failed++; const k = fj.steps[0].text.split(/[.(]/)[0]; posts[k] = (posts[k] ?? 0) + 1; void m; }
  void first;
  for (const id of l.parttime ?? []) pts[id] = (pts[id] ?? 0) + 1;
  const wed = l.stories.flatMap((s) => s.steps).find((x) => /결혼했다|가족이 됐다/.test(x.text));
  if (l.family.married) { married++; marryAge += wed?.age ?? 0; ages.push(wed?.age ?? 0); }
  breakups += l.stories.filter((s) => s.steps.some((x) => x.text.includes("헤어졌다"))).length;
  side += l.feed.filter((f) => f.t.includes("부업을 한 지") || f.sub?.includes("배달") || f.sub?.includes("외주")).length ? 1 : 0;
  firstLove += l.feed.some((f) => f.t.includes("스물둘에 만난")) ? 1 : 0;
  kids += l.family.kids.length;
}
console.log("첫 직장:", Object.entries(posts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v / N * 100)}%`).join(" · "), `| 시험·면접 탈락 ${Math.round(failed / N * 100)}%`);
console.log("알바:", Object.entries(pts).map(([k, v]) => `${k} ${Math.round(v / N * 100)}%`).join(" · "));
ages.sort((a, b) => a - b); console.log("결혼 나이 분위", ages[Math.floor(ages.length * 0.25)], ages[Math.floor(ages.length * 0.5)], ages[Math.floor(ages.length * 0.75)]);
console.log(`결혼 ${Math.round(married / N * 100)}% (평균 ${(marryAge / Math.max(1, married)).toFixed(1)}세) · 첫 연애 25세까지 이어짐 ${Math.round(firstLove / N * 100)}% · 이별 ${(breakups / N).toFixed(2)}회/인생 · 투잡 경험 ${Math.round(side / N * 100)}% · 아이 ${(kids / N).toFixed(2)}명`);
