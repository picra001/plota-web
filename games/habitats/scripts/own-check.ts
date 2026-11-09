// 집을 어떻게 갖게 됐나: 직접 매수 · 상속 · 둘 다
import { generateWorld } from "../src/engine/market";
import { createLife } from "../src/engine/life";
import { autoToEnd } from "../src/engine/auto";
const N = Number(process.argv[2] ?? 200); let buy = 0, inh = 0, both = 0, none = 0; const age: number[] = []; const bg: Record<string, [number, number]> = {};
for (let i = 0; i < N; i++) { const w = generateWorld(2000 + i, 110); const l = createLife(7000 + i * 11, w, 4); autoToEnd(l, w);
  const b = l.homeHistory.find((h) => h.tenure === "own" && !/연필 자국/.test(h.memory));
  const inherited = l.feed.some((f) => /어린 시절의 집으로|낯선 가족이 들어와/.test(f.sub ?? ""));
  if (b) age.push(b.from - l.birthYear);
  if (b && inherited) both++; else if (b) buy++; else if (inherited) inh++; else none++;
  const g = (bg[l.background] ??= [0, 0]); g[1]++; if (b || inherited) g[0]++; }
age.sort((a, b) => a - b);
console.log(`직접 매수만 ${Math.round(buy / N * 100)}% · 상속만 ${Math.round(inh / N * 100)}% · 둘 다 ${Math.round(both / N * 100)}% · 없음 ${Math.round(none / N * 100)}% | 첫 매수 나이 p25/50/75 ${age[Math.floor(age.length * .25)]}/${age[Math.floor(age.length * .5)]}/${age[Math.floor(age.length * .75)]}`);
console.log(Object.entries(bg).map(([k, [a, n]]) => `${k} ${Math.round(a / n * 100)}% (${n})`).join(" · "));
