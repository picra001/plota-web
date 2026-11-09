import { generateWorld } from "../src/engine/market";
const f: number[] = []; let worst = 0, best = 0, spikes = 0, booms = 0, busts = 0; const r40: number[] = [];
for (let s = 0; s < 300; s++) { const w = generateWorld(s, 60); r40.push(w.years[40].index);
  for (let i = 1; i < 60; i++) { const c = w.years[i].change; worst = Math.min(worst, c); best = Math.max(best, c); const n = w.years[i].news.join(""); if (n.includes("금리를 크게")||n.includes("연달아")) spikes++; if (n.includes("임장")||n.includes("영영")) booms++; if (n.includes("하우스 푸어")||n.includes("역전세")) busts++; } }
r40.sort((a,b)=>a-b); console.log("40년 뒤 지수 p10/50/90", r40[30].toFixed(2), r40[150].toFixed(2), r40[270].toFixed(2), "최악/최고 한 해", worst.toFixed(2), best.toFixed(2), "60년당 급등", (spikes/300).toFixed(1), "과열", (booms/300).toFixed(1), "폭락", (busts/300).toFixed(1));
