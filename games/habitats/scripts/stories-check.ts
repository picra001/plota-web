import { generateWorld } from "../src/engine/market";
import { createLife } from "../src/engine/life";
import { autoToEnd } from "../src/engine/auto";
const N = Number(process.argv[2] ?? 200);
const cnt: Record<string, number> = {}; const steps: Record<string, number> = {};
let ppl = 0, pplMax = 0, gone = 0; const hist: number[] = Array(9).fill(0);
let sample = "";
for (let i = 0; i < N; i++) {
  const w = generateWorld(1000 + i, 110);
  const l = createLife(5000 + i * 13, w, 4);
  l.noNegative = process.argv[3] === "soft";
  const sizes: number[] = [];
  const orig = l.feed.push.bind(l.feed);
  autoToEnd(l, w, "auto");
  for (const s of l.stories) { cnt[s.id] = (cnt[s.id] ?? 0) + 1; steps[s.id] = (steps[s.id] ?? 0) + s.steps.length; }
  ppl += l.people.length; pplMax = Math.max(pplMax, l.people.length); hist[l.people.length]++;
  gone += l.feed.filter((f) => f.t.includes("연락이 뜸해")).length;
  if (i === 3) sample = l.stories.map((s) => `[${s.title}] ` + s.steps.map((x) => `${x.age}:${x.text}`).join(" → ")).join("\n");
  void sizes; void orig;
}
console.log("stories per life:", Object.entries(cnt).map(([k, v]) => `${k} ${(v / N * 100).toFixed(0)}% (avg ${(steps[k] / v).toFixed(1)} steps)`).join(" | "));
console.log("people at death avg", (ppl / N).toFixed(1), "max", pplMax, "hist", hist.join(","), "faded per life", (gone / N).toFixed(1));
console.log(sample);
