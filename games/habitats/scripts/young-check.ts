// 스물다섯 출발 자금: 집안 형편 × 진로 × 알바 수 × 독립 여부
import { generateWorld } from "../src/engine/market";
import { createLife } from "../src/engine/life";
import { autoSeason } from "../src/engine/auto";
import { chooseEvent } from "../src/engine/life";
const w = generateWorld(1, 110);
const rows: string[] = [];
const pick = (l: any, want: Record<number, number>) => {
  while (l.phase === "child") {
    if (l.pendingEventId && l.eventChoice === null) {
      const age = l.age; const idx = want[age] ?? 0;
      if (!chooseEvent(l, w, idx)) chooseEvent(l, w, 0);
    }
    autoSeason(l, w);
  }
};
for (const [label, path] of [["대학", 0], ["바로 일", 1], ["하고 싶은 일", 2]] as const)
  for (const pt of path === 1 ? [0, 1] : path === 0 ? [0, 1, 2, 3] : [0, 1, 2])
    for (const trip of [0, 1]) for (const leave of [1, 0]) {
      const res: Record<string, number[]> = {};
      for (let i = 0; i < 60; i++) {
        const l = createLife(777 + i * 31, w, 4);
        pick(l, { 19: path, 20: pt, 21: trip, 23: leave });
        (res[l.background] ??= []).push(l.cash);
      }
      const avg = (a: number[]) => a ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : NaN;
      rows.push(`${label} 선택${pt} ${trip ? "여행X" : "여행O"} ${leave ? "본가" : "독립"} | 빠듯 ${avg(res["빠듯한 집"])} · 보통 ${avg(res["보통의 집"])} · 넉넉 ${avg(res["넉넉한 집"])}`);
    }
console.log(rows.join("\n"));
