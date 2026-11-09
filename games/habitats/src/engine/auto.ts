// 자동 결정 — "대부분의 사람이 고를 법한 선택"(현실 분포)과 '숙련 봇'(테스트용)
import { PROP_TYPES } from "../data/seoul";
import { weighted, chance } from "./rng";
import { buildEvent } from "./events";
import { optionLock, advanceSeason, checkBuy, buy, chooseEvent, dealUsed, legwork, ownedCount, wyNow } from "./life";
import type { Life, World, YearReport } from "./types";

export type AutoMode = "auto" | "skilled";

export function autoYear(life: Life, world: World, mode: AutoMode = "auto"): YearReport | null {
  const start = life.year;
  const wasChild = life.phase === "child";
  let rep: YearReport | null = null;
  let guard = 0;
  while (!rep && life.alive && guard++ < 12) {
    rep = autoSeason(life, world, mode);
    if (wasChild && (life.year !== start || life.phase === "adult")) break;
    if (!wasChild && life.year !== start) break;
  }
  return rep;
}

/** 한 계절(어린 시절엔 한 장면) 자동 진행 */
export function autoSeason(life: Life, world: World, mode: AutoMode = "auto"): YearReport | null {
  const r = life.rng;
  if (life.pendingEventId && life.eventChoice === null) {
    const ev = buildEvent(life.pendingEventId, life, world);
    const ok = (i: number) => !optionLock(life, ev.options[i]);
    const idxs = ev.options.map((_, i) => i).filter(ok);
    if (!idxs.length) { life.eventChoice = -1; life.pendingEventId = null; return advanceSeason(life, world); } // 고를 수 있는 게 없으면 지나간다
    let idx = idxs[0] ?? 0;
    if (mode === "skilled") {
      // 숙련: 출퇴근 짧고 방이 맞는 집, 살 수 있으면 산다
      const scored = idxs.map((i) => {
        const o = ev.options[i].offer;
        let s = ev.options[i].autoWeight ?? 1;
        if (o) s += (o.tenure === "buy" ? 2 : 0) + (o.commute && o.commute < 35 ? 1 : 0) + (o.tags.includes("남향") ? 0.5 : 0) - (o.tags.includes("곰팡이") ? 1 : 0);
        return { i, s };
      }).sort((a, b) => b.s - a.s);
      idx = scored[0]?.i ?? idx;
    } else if (idxs.length) {
      // 보통 사람은 집 사는 결정을 미룬다 (매수 선택지는 덜 고른다)
      idx = weighted(r, idxs, (i) => (ev.options[i].autoWeight ?? 1) * (ev.options[i].offer?.tenure === "buy" ? 0.55 : 1));
    }
    chooseEvent(life, world, idx);
  }
  // 숙련 봇만 지도에서 투자도 한다
  if (mode === "skilled" && life.phase === "adult" && !dealUsed(life)) {
    const wy = wyNow(world, life);
    for (const l of life.listings) if (life.legwork > 0) legwork(life, l.uid);
    const cands = life.listings
      .filter((l) => !l.revealed || l.condition !== "bad")
      .map((l) => ({ l, c: checkBuy(life, l, wy) }))
      .filter((x) => x.c.ok && x.l.askMul < 1.0 && life.cash - x.c.cashNeeded > 3000 && ownedCount(life) >= 1)
      .sort((a, b) => a.l.askMul - b.l.askMul);
    if (cands.length && wy.change < 0.01 && chance(r, 0.25)) buy(life, cands[0].l.uid, world, PROP_TYPES[cands[0].l.type].livable ? "rent" : "rent");
  }
  return advanceSeason(life, world);
}

export function autoToEnd(life: Life, world: World, mode: AutoMode = "auto", maxSteps = 600) {
  let n = 0;
  while (life.alive && n < maxSteps) {
    if (life.pendingEventId && life.eventChoice === null) {
      const at = `${life.year}.${life.season}.${life.pendingEventId}`;
      autoSeason(life, world, mode);
      // 같은 계절, 같은 이야기에서 아무것도 못 골랐을 때만
      if (at === `${life.year}.${life.season}.${life.pendingEventId}` && life.eventChoice === null) {
        // 고를 수 있는 게 없으면 첫 번째를 강제로
        life.eventChoice = 0;
      }
    } else autoSeason(life, world, mode);
    n++;
  }
  if (life.alive) { life.alive = false; life.deathAge = life.age; }
  return life;
}
