// 시장 엔진 — 2026년 현재 정책에서 출발하는 무작위 미래 (§5.2)
import { DISTRICTS, KOREA_PROFILE as P, POLICY_2026, START_YEAR } from "../data/seoul";
import { chance, makeRng, normal, pick, range, int } from "./rng";
import type { World, WorldYear } from "./types";

const POLICY_TIGHTEN = [
  "정부가 수도권 대출 규제를 강화했습니다. 집을 사려면 더 많은 현금이 필요합니다.",
  "다주택자 세금이 다시 무거워졌습니다.",
  "토지거래허가구역이 넓어졌습니다. 동네 부동산이 조용해졌습니다.",
];
const POLICY_LOOSEN = [
  "정부가 생애최초 대출 한도를 늘렸습니다. 주말 모델하우스에 줄이 섰습니다.",
  "취득세 중과가 한시적으로 완화됐습니다.",
  "대규모 공급 계획이 발표됐습니다. 몇 년 뒤의 이야기입니다.",
];
const BOOM = [
  "\"지금 안 사면 영영 못 산다\"는 말이 돕니다. 호가가 주마다 오릅니다.",
  "주말마다 아파트 단지 앞에 임장 온 사람들이 줄을 섭니다.",
];
const BUST = [
  "거래가 끊겼습니다. 급매물이 쌓이고 '하우스 푸어'라는 말이 다시 나옵니다.",
  "역전세 뉴스가 이어집니다. 전세금을 못 돌려받는 집이 늘었습니다.",
];
const RATE_SPIKE = [
  "한국은행이 기준금리를 크게 올렸습니다. 변동금리 대출 이자가 한 번에 뛰었습니다.",
  "물가를 잡겠다며 금리가 연달아 올랐습니다. 대출 이자 문자가 무서워졌습니다.",
];
const CRISES = [
  "해외 금융시장이 흔들렸습니다. 뉴스마다 '경착륙'이라는 단어가 나옵니다.",
  "새로운 감염병이 돌았습니다. 거리의 가게들이 셔터를 내렸습니다.",
  "금리가 갑자기 뛰었습니다. 대출 이자 문자가 무서워졌습니다.",
];

export function generateWorld(seed: number, years = 90): World {
  const r = makeRng(seed ^ 0x9e3779b9);
  const period = range(r, P.cyclePeriod[0], P.cyclePeriod[1]);
  const phase = range(r, 0, Math.PI * 2);
  const out: WorldYear[] = [];
  let index = 1;
  let rate = POLICY_2026.rate;
  let ltvNoHome = POLICY_2026.ltvNoHome;
  let ltvOneHome = POLICY_2026.ltvOneHome;
  let ltvMulti = POLICY_2026.ltvMulti;
  let loanCap = POLICY_2026.loanCap;
  let acqTax = [...POLICY_2026.acqTax];
  const dmul: Record<string, number> = Object.fromEntries(DISTRICTS.map((d) => [d.id, 1]));
  // 국면: 보통 · 과열(몇 해 크게 오름) · 폭락(과열 뒤 꺼짐) [추론]
  let regime: "normal" | "boom" | "bust" = "normal";
  let regimeLeft = 0;
  let spike = 0; // 금리 급등 잔여분
  // 인구 감소 장기 효과 [추론]: 2045년 이후 외곽 동네 약세
  for (let i = 0; i < years; i++) {
    const year = START_YEAR + i;
    const news: string[] = [];
    let change = 0;
    if (i > 0) {
      // 금리: 평균 회귀 + 잡음
      rate = Math.max(0.01, rate + (P.rateMean - rate) * 0.3 + normal(r, 0, P.rateVol));
      // 금리 급등: 한 해에 1.5~2.5%p
      if (spike > 0) { spike -= 0.5; } else if (chance(r, P.rateSpikeFreq)) { const jump = range(r, 0.015, 0.025); rate += jump; spike = 2; news.push(pick(r, RATE_SPIKE)); }
      const cycle = P.cycleAmp * Math.sin((2 * Math.PI * i) / period + phase);
      const rateEffect = -(rate - P.rateMean) * 3;
      const demo = year > 2045 ? -0.006 : 0;
      // 과열·폭락
      let reg = 0;
      if (regime === "normal" && regimeLeft <= 0) {
        if (rate < P.rateMean && chance(r, P.boomFreq)) { regime = "boom"; regimeLeft = int(r, 2, 4); news.push(pick(r, BOOM)); }
      }
      if (regime === "boom") { reg = range(r, 0.07, 0.14); if (--regimeLeft <= 0) { if (chance(r, 0.65)) { regime = "bust"; regimeLeft = int(r, 2, 3); rate += 0.012; news.push(pick(r, BUST)); } else { regime = "normal"; regimeLeft = 3; } } }
      else if (regime === "bust") { reg = -range(r, 0.06, 0.12); if (--regimeLeft <= 0) { regime = "normal"; regimeLeft = 3; } }
      else regimeLeft--;
      if (spike > 0) reg -= 0.03;
      change = P.trend + cycle + rateEffect + demo + reg + normal(r, 0, P.noise);
      // 정책 이벤트 — 한국: 규제와 완화가 자주 바뀜. 과열 뒤엔 규제, 하락 뒤엔 완화가 잦다
      if (chance(r, P.policyFreq)) {
        const prev = out[i - 1].change;
        const tighten = chance(r, prev > 0.03 ? 0.75 : prev < -0.02 ? 0.2 : 0.5);
        if (tighten) {
          news.push(pick(r, POLICY_TIGHTEN));
          ltvNoHome = Math.max(0.4, ltvNoHome - 0.1);
          ltvOneHome = Math.max(0, ltvOneHome - 0.1);
          loanCap = Math.max(40000, loanCap - 10000);
          acqTax = [acqTax[0], Math.min(0.12, acqTax[1] + 0.02), Math.min(0.15, acqTax[2] + 0.02)];
          change -= 0.02;
        } else {
          news.push(pick(r, POLICY_LOOSEN));
          ltvNoHome = Math.min(0.8, ltvNoHome + 0.1);
          ltvOneHome = Math.min(0.6, ltvOneHome + 0.1);
          ltvMulti = Math.min(0.3, ltvMulti + 0.1);
          loanCap = Math.min(100000, loanCap + 10000);
          acqTax = [acqTax[0], Math.max(0.03, acqTax[1] - 0.02), Math.max(0.04, acqTax[2] - 0.02)];
          change += 0.015;
        }
      }
      if (chance(r, P.crisisFreq)) {
        news.push(pick(r, CRISES));
        change -= range(r, 0.1, 0.2);
        rate += 0.01;
      }
      // 동네별 차이
      for (const d of DISTRICTS) {
        let dx = normal(r, 0, 0.02);
        if (year > 2045 && d.commute >= 2) dx -= 0.006;
        if (d.id === "seongsu" && i < 15) dx += 0.005;
        dmul[d.id] *= 1 + dx;
      }
      index *= 1 + change;
    }
    out.push({
      year,
      index,
      change,
      rate,
      ltvNoHome,
      ltvOneHome,
      ltvMulti,
      loanCap,
      acqTax: [...acqTax],
      news,
      districtMul: { ...dmul },
      regime,
    });
  }
  return { seed, years: out };
}

/** frac: 한 해 중 지난 비율(0~1). 1이면 그해 말 값. 계절마다 시세가 조금씩 움직인다. */
export function worldYear(w: World, year: number, frac = 1): WorldYear {
  const i = Math.min(w.years.length - 1, Math.max(0, year - START_YEAR));
  const cur = w.years[i];
  if (frac >= 1 || i === 0) return cur;
  const prev = w.years[i - 1];
  const lerp = (a: number, b: number) => a * Math.pow(b / a, frac);
  const districtMul: Record<string, number> = {};
  for (const k of Object.keys(cur.districtMul)) districtMul[k] = lerp(prev.districtMul[k], cur.districtMul[k]);
  return { ...cur, index: lerp(prev.index, cur.index), districtMul };
}

/** 시세 = 기본가 × (1 + (지수-1)×β) × 동네 배수 */
export function marketPrice(basePrice: number, district: string, typeBeta: number, wy: WorldYear): number {
  const d = DISTRICTS.find((x) => x.id === district)!;
  const idx = 1 + (wy.index - 1) * d.beta * typeBeta;
  return Math.round(basePrice * Math.max(0.2, idx) * wy.districtMul[district]);
}


