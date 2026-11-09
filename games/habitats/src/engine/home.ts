// 집이 주인공 — 집의 속성(거리·크기·상태·정)과 이야기 속 '이사 후보'
import { ptById } from "../data/work";
import { DISTRICTS, PROP_TYPES, commuteMin, WORK_HUBS, type PropType } from "../data/seoul";
import { chance, pick, range, weighted } from "./rng";
import { marketPrice } from "./market";
import type { HomeOffer, Life, World, WorldYear, Home } from "./types";
import { buyNumbers, districtName, fmtMoney, job, markDeal, moveInto, newProperty, wyNow, sellQuiet } from "./life";

// ───────────── 속성 ─────────────
export const working = (l: Life) => l.phase === "adult" && !["retired", "jobless", "landlord"].includes(l.jobId) && !!l.workDistrict;

/** 지금 집에서 일터까지(분). 역세권이면 짧고, 큰길가면 조금 짧다 */
export function commuteOf(l: Life, district = l.home.district, tags = l.home.tags): number {
  if (!working(l)) return 0;
  let m = commuteMin(district, l.workDistrict!);
  if (tags.includes("역세권")) m -= 8;
  if (tags.includes("큰길가")) m -= 3;
  return Math.max(10, m);
}

/** 이 집에 같이 사는 사람 수 */
export function householdSize(l: Life): number {
  if (l.home.tenure === "parents") return 3 + (l.flags.sibling ? 1 : 0);
  if (l.home.tenure === "nursing") return 1;
  return 1 + (l.family.married ? 1 : 0) + l.family.kids.filter((k) => !k.independent).length + (l.flags.parentsWithMe ? 1 : 0);
}

export const roomsOf = (l: Life) => (l.home.tenure === "nursing" ? 1 : PROP_TYPES[l.home.type].rooms + (l.home.type === "apt84" && l.home.tenure === "parents" ? 0 : 0));
export const jeongOf = (l: Life, d = l.home.district) => l.jeong[d] ?? 0;

/** 집 상태 한 단어 */
export const conditionWord = (c: string) => (c === "good" ? "볕 잘 드는" : c === "bad" ? "낡은" : "평범한");

/** 새 집의 성격 태그 1~2개 */
export function rollTags(l: Life, type: PropType, condition: string): string[] {
  const r = l.rng;
  const pool: [string, number][] = [
    ["남향", condition === "good" ? 3 : 1.2], ["북향", condition === "bad" ? 1.5 : 0.6],
    ["층간소음", type === "apt84" || type === "apt59" ? 1.2 : 0.6], ["곰팡이", condition === "bad" ? 2 : 0.3],
    ["역세권", type === "officetel" ? 2 : 0.8], ["언덕", type === "villa" ? 1.2 : 0.4],
    ["엘리베이터 없음", type === "villa" ? 2.5 : 0], ["공원 앞", 0.8], ["큰길가", type === "officetel" ? 1.2 : 0.5],
  ];
  const n = chance(r, 0.55) ? 2 : 1;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = weighted(r, pool.filter(([x]) => !out.includes(x) && !(x === "남향" && out.includes("북향")) && !(x === "북향" && out.includes("남향"))), ([, w]) => w)[0];
    out.push(t);
  }
  return out;
}

/** 직업별 일터 동네 [추론] */
export function assignWork(l: Life): string | null {
  const id = l.jobId;
  if (["service", "self", "free"].includes(id)) return chance(l.rng, 0.6) ? l.home.district : pick(l.rng, WORK_HUBS);
  if (id === "public") return pick(l.rng, DISTRICTS).id;
  if (id === "tech") return pick(l.rng, ["seongsu", "gwanak", "nowon"]);
  if (["retired", "jobless", "landlord"].includes(id)) return null;
  return pick(l.rng, WORK_HUBS);
}

// ───────────── 이사 후보 ─────────────
export type OfferKind = "near_work" | "bigger" | "same_town" | "buy" | "smaller" | "cheaper" | "near_parents" | "elevator";

/** 필요한 방 수 (아이가 있으면 아이 방) */
export function roomsNeeded(l: Life) {
  const kids = l.family.kids.filter((k) => !k.independent).length;
  return Math.max(1, (l.family.married ? 1 : 1) + Math.min(2, kids));
}

function typeForRooms(n: number, prefer: "small" | "fit" | "big"): PropType[] {
  const all: PropType[] = ["officetel", "villa", "apt59", "apt84"];
  const fit = all.filter((t) => PROP_TYPES[t].rooms >= n);
  if (prefer === "small") return all.filter((t) => PROP_TYPES[t].rooms >= Math.max(1, n - 1)).slice(0, 2);
  if (prefer === "big") return fit.length ? fit.slice(-2) : ["apt84"];
  return fit.length ? fit : ["apt84"];
}

export function makeOffer(l: Life, wy: WorldYear, district: string, type: PropType, tenure: HomeOffer["tenure"], label: string, extraCash = 0): HomeOffer | null {
  const t = PROP_TYPES[type];
  const r = l.rng;
  const condition = weighted(r, ["good", "normal", "bad"] as const, (c) => (c === "normal" ? 3 : 1));
  const condMul = condition === "good" ? 1.04 : condition === "bad" ? 0.9 : 1;
  const base = DISTRICTS.find((d) => d.id === district)!.apt84 * t.priceRatio * range(r, 0.9, 1.08);
  const price = Math.round(marketPrice(base, district, t.beta, wy) * condMul);
  const tags = rollTags(l, type, condition);
  const back = l.home.tenure === "jeonse" || l.home.tenure === "monthly" ? l.home.deposit : 0;
  let deposit = 0, yearlyRent = 0, loan = 0, cashNeeded = 0;
  if (tenure === "jeonse") { deposit = Math.round(price * t.jeonseRatio); cashNeeded = deposit; }
  else if (tenure === "monthly") { deposit = Math.round(price * 0.05); yearlyRent = Math.round(price * t.rentYield); cashNeeded = deposit; }
  else {
    const b = buyNumbers(l, wy, price, true);
    loan = b.loan; cashNeeded = b.cashNeeded;
  }
  if (l.cash + back + extraCash < cashNeeded) return null;
  if (tenure === "monthly" && yearlyRent > Math.max(1500, (l.income + (l.flags.spouseIncome ?? 0)) * 0.45)) return null;
  const commute = working(l) ? Math.max(10, commuteMin(district, l.workDistrict!) - (tags.includes("역세권") ? 8 : 0)) : 0;
  return { district, type, tenure, base, price, deposit, yearlyRent, loan, cashNeeded, condition, tags, commute, rooms: t.rooms, label };
}

/** 이야기에 맞는 후보를 몇 개 만든다. 감당 못 하는 후보는 빠진다 */
export function offersFor(l: Life, world: World, kinds: OfferKind[]): HomeOffer[] {
  const wy = wyNow(world, l);
  const need = roomsNeeded(l);
  const out: HomeOffer[] = [];
  const cheapDs = ["nowon", "eunpyeong", "gwanak"];
  const tryRent = (d: string, types: PropType[], label: string) => {
    for (const ty of types) {
      const o = makeOffer(l, wy, d, ty, "jeonse", label) ?? makeOffer(l, wy, d, ty, "monthly", label);
      if (o) return o;
    }
    return null;
  };
  for (const k of kinds) {
    let o: HomeOffer | null = null;
    const work = l.workDistrict ?? l.home.district;
    if (k === "near_work") o = tryRent(work, typeForRooms(need, "small"), "일터 가까운 집");
    if (k === "bigger") o = tryRent(pick(l.rng, cheapDs), typeForRooms(need + 1, "big"), "멀어도 넓은 집");
    if (k === "same_town") o = tryRent(l.home.district, typeForRooms(need, "fit"), `${districtName(l.home.district)}의 다른 집`);
    if (k === "cheaper") o = tryRent(pick(l.rng, cheapDs), ["villa", "officetel"], "조금 더 싼 집");
    if (k === "smaller") o = tryRent(l.home.district, ["apt59", "officetel"], "같은 동네 작은 집");
    if (k === "near_parents") o = tryRent(l.parentsHome.district, typeForRooms(need, "fit"), "부모님 가까운 집");
    if (k === "elevator") o = tryRent(l.home.district, ["apt59", "officetel"], "엘리베이터 있는 집");
    if (k === "buy") {
      const ds = [l.home.district, work, ...cheapDs].filter((d, i, a) => a.indexOf(d) === i);
      for (const d of ds) {
        for (const ty of typeForRooms(need, "fit")) {
          const b = makeOffer(l, wy, d, ty, "buy", `${districtName(d)}에 내 집`);
          if (b) { o = b; break; }
        }
        if (o) break;
      }
    }
    if (o && !out.some((x) => x.district === o!.district && x.type === o!.type && x.tenure === o!.tenure)) out.push(o);
  }
  return out;
}

export function offerHint(l: Life, o: HomeOffer): string {
  const money = o.tenure === "buy" ? `매매 ${fmtMoney(o.price)} · 대출 ${fmtMoney(o.loan)} · 현금 ${fmtMoney(o.cashNeeded)}` : o.tenure === "jeonse" ? `전세 ${fmtMoney(o.deposit)}` : `월세 연 ${fmtMoney(o.yearlyRent)} · 보증금 ${fmtMoney(o.deposit)}`;
  const parts = [`${districtName(o.district)} ${PROP_TYPES[o.type].name}`, money];
  if (o.commute) parts.push(`출퇴근 ${o.commute}분`);
  parts.push(`방 ${o.rooms}`);
  if (jeongOf(l, o.district) > 0) parts.push(`정 ${jeongOf(l, o.district)}년`);
  return parts.join(" · ") + (o.tags.length ? ` · #${o.tags.join(" #")}` : "");
}

/** 후보 집으로 옮긴다. 자가였다면 지금 집은 세를 주거나(keep) 판다(sell) */
export function takeOffer(l: Life, world: World, o: HomeOffer, memory: string, current: "keep" | "sell" = "keep"): string {
  const wy = wyNow(world, l);
  if (l.home.tenure === "own" && l.home.propUid) {
    const p = l.props.find((x) => x.uid === l.home.propUid);
    if (p) {
      if (current === "sell") sellQuiet(l, p, wy);
      else { p.mode = "rent"; p.tenant = pick(l.rng, ["신혼부부", "대학원생", "간호사", "젊은 부부", "은퇴한 부부"]); }
    }
  }
  const back = l.home.tenure === "jeonse" || l.home.tenure === "monthly" ? l.home.deposit : 0;
  l.cash += back;
  markDeal(l);
  const h: Home = { tenure: o.tenure === "buy" ? "own" : o.tenure, district: o.district, type: o.type, deposit: o.tenure === "buy" ? 0 : o.deposit, yearlyRent: o.yearlyRent, sinceYear: l.year, contractEnd: o.tenure === "buy" ? undefined : l.year + 2, condition: o.condition, tags: o.tags };
  if (o.tenure === "buy") {
    const p = newProperty(l, o.district, o.type, o.base, o.price, o.loan, o.condition, "live");
    h.propUid = p.uid;
    l.cash -= o.cashNeeded;
    l.everOwned++;
    if (!l.flags.firstBuyYear) { l.flags.firstBuyYear = l.year; l.flags.firstBuyRegime = wy.regime === "boom" ? 1 : wy.regime === "bust" ? -1 : 0; }
    if (l.lostHome) l.regained = true;
  } else l.cash -= o.deposit;
  moveInto(l, h, memory);
  const where = `${districtName(o.district)} ${PROP_TYPES[o.type].name}`;
  return o.tenure === "buy" ? `${where}을(를) ${fmtMoney(o.price)}에 샀습니다. 처음 받아 든 내 집 열쇠.` : `${where}(으)로 이사했습니다.`;
}

export function homeLabel(l: Life) {
  const h = l.home;
  if (h.tenure === "nursing") return "요양원";
  if (h.tenure === "withkid") return `${districtName(h.district)} 자녀의 집`;
  return `${districtName(h.district)} ${PROP_TYPES[h.type].name}`;
}

export { job };

// ───────────── 여유: 집이 해마다 주는 숨 쉴 틈 ─────────────
/** 직업별 야근 시간(하루) [추론] */
const OVERTIME: Record<string, number> = { office: 1, dev: 1.5, pro: 2, service: 1, tech: 0.5, public: 0.2, self: 3, free: 0.5 };
/** 하루 일하는 시간: 고른 직장의 근무 시간 + 투잡 */
export const workHours = (l: Life) => (l.work?.hours ?? 9 + (OVERTIME[l.jobId] ?? 1)) + (l.flags.sideH ?? 0);

export interface Yeoyu {
  time: number; space: number; quiet: number; money: number; total: number;
  leave?: string; back?: string; free: number; housingPct: number;
}
const hhmm = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

export function yeoyu(l: Life, home = l.home, commuteOverride?: number, roomsOverride?: number): Yeoyu {
  const youngKids = l.family.kids.filter((k) => l.year - k.born < 10).length;
  // 시간
  let free = 5;
  let leave: string | undefined, back: string | undefined;
  const c = commuteOverride ?? (working(l) ? commuteOf(l, home.district, home.tags) : 0);
  if (l.phase === "adult" && working(l)) {
    const ot = workHours(l) - 9;
    const start = 9;
    leave = hhmm(start - c / 60 - 0.15);
    const backH = 18 + ot + c / 60;
    back = hhmm(backH);
    free = 24 - 7 - (9 + ot) - (2 * c) / 60 - 1.5 - youngKids * 1.2;
  } else if (l.phase === "adult" && l.jobId === "jobless") free = 6;
  else if (l.phase === "adult") free = 7 - youngKids;
  free = Math.max(0, free);
  const time = clamp(free * 25);
  // 공간
  const people = householdSize(l);
  const rooms = roomsOverride ?? (home.tenure === "nursing" ? 1 : PROP_TYPES[home.type].rooms);
  let space = clamp(25 + 40 * (rooms / Math.max(1, people)));
  if (home.tenure === "parents" && l.phase === "adult") space = Math.min(space, 50);
  if (home.tenure === "nursing") space = 25;
  // 조용함
  let quiet = 60;
  const t = home.tags ?? [];
  if (t.includes("큰길가")) quiet -= 20;
  if (t.includes("층간소음")) quiet -= 20;
  if (t.includes("반지하")) quiet -= 10;
  if (t.includes("공원 앞")) quiet += 15;
  if (["gangnam", "seongsu", "mapo"].includes(home.district)) quiet -= 8;
  if (["eunpyeong", "nowon"].includes(home.district)) quiet += 6;
  if (home.type === "officetel") quiet -= 5;
  quiet -= youngKids * 4;
  quiet = clamp(quiet);
  // 돈: 주거비(월세+이자)가 소득에서 차지하는 비율 + 불안
  const hhIncome = l.phase === "adult" ? Math.max(1200, l.income + (l.family.married ? l.flags.spouseIncome ?? 0 : 0) + (l.flags.reverseMortgage ?? 0)) : 1;
  const interest = l.props.reduce((a, p) => a + p.loan * 0.045, 0);
  const housing = (home.yearlyRent ?? 0) + interest;
  const housingPct = l.phase === "adult" ? Math.round((housing / hhIncome) * 100) : 0;
  let money = l.phase === "child" ? (l.background === "빠듯한 집" ? 35 : l.background === "넉넉한 집" ? 85 : 60) : clamp(90 - housingPct * 1.5);
  if (l.phase === "adult" && (home.tenure === "monthly" || home.tenure === "jeonse") && (home.contractEnd ?? 9999) - l.year <= 0) money -= 10;
  if (l.cash < 0) money -= 20;
  money = clamp(money);
  const total = Math.round((time + space + quiet + money) / 4);
  return { time: Math.round(time), space: Math.round(space), quiet: Math.round(quiet), money: Math.round(money), total, leave, back, free: Math.round(free * 10) / 10, housingPct };
}

/** 한 해의 루틴 한 줄 (같은 틀, 숫자만 바뀐다) */
export function routineLine(l: Life): string {
  const y = yeoyu(l);
  const h = Math.floor(y.free), m = Math.round((y.free - h) * 60);
  const freeTxt = `${h ? `${h}시간 ` : ""}${m ? `${m}분` : h ? "" : "0분"}`.trim();
  if (y.leave && y.back) return `출근 ${y.leave} · 귀가 ${y.back} · 내 시간 하루 ${freeTxt} · 주거비 월급의 ${y.housingPct}%`;
  if (l.jobId === "retired") return `아침 산책 · 동네 경로당 · 내 시간 하루 ${freeTxt} · 주거비 연금의 ${y.housingPct}%`;
  if (l.jobId === "landlord") return `세입자 문자 확인 · 낮엔 동네 · 주거비 수입의 ${y.housingPct}%`;
  return `일자리 찾기 · 내 시간 하루 ${freeTxt} · 주거비 수입의 ${y.housingPct}%`;
}

/** 이사 후보를 고르면 루틴이 어떻게 바뀌나 */
export function offerDelta(l: Life, o: HomeOffer): string {
  const cur = yeoyu(l);
  const fakeHome = { ...l.home, district: o.district, type: o.type, tags: o.tags, yearlyRent: o.yearlyRent, tenure: (o.tenure === "buy" ? "own" : o.tenure) as Home["tenure"] };
  const nxt = yeoyu(l, fakeHome, working(l) ? o.commute : 0, o.rooms);
  const parts: string[] = [];
  if (cur.back && nxt.back && cur.back !== nxt.back) parts.push(`귀가 ${cur.back} → ${nxt.back}`);
  const curRooms = l.home.tenure === "nursing" ? 1 : PROP_TYPES[l.home.type].rooms;
  if (curRooms !== o.rooms) parts.push(`방 ${curRooms} → ${o.rooms}`);
  const monthly = o.tenure === "monthly" ? Math.round(o.yearlyRent / 12) : 0;
  const loanM = o.tenure === "buy" ? Math.round((o.loan * 0.045) / 12) : 0;
  if (monthly) parts.push(`월세 월 ${fmtMoney(monthly)}`);
  if (loanM) parts.push(`이자 월 ${fmtMoney(loanM)}`);
  if (o.tenure === "jeonse") parts.push(`보증금 ${fmtMoney(o.deposit)}`);
  if (o.tenure === "buy") parts.push(`현금 ${fmtMoney(o.cashNeeded)} 들어감`);
  if (jeongOf(l, o.district) > 0 && o.district !== l.home.district) parts.push(`${districtName(o.district)}은(는) ${jeongOf(l, o.district)}년 살았던 동네`);
  else if (o.district !== l.home.district) parts.push("낯선 동네");
  return parts.join(" · ");
}

/** 해마다 집 보러 가기: 전세로는 어디까지, 매매로는 어디까지 */
export function houseHunt(l: Life, world: World): string {
  const wy = wyNow(world, l);
  const cash = l.cash + (l.home.tenure === "jeonse" || l.home.tenure === "monthly" ? l.home.deposit : 0);
  const order = [...DISTRICTS].sort((a, b) => b.apt84 - a.apt84);
  const types: PropType[] = ["apt84", "apt59", "villa", "officetel"];
  let jeonse = "", buyTxt = "";
  outer: for (const t of types) for (const d of order) {
    const pt = PROP_TYPES[t];
    const price = marketPrice(d.apt84 * pt.priceRatio, d.id, pt.beta, wy);
    if (price * pt.jeonseRatio <= cash) { jeonse = `${d.name} ${pt.name.split(" ")[0]}${t === "apt59" || t === "apt84" ? ` ${pt.name.split(" ")[1]}` : ""}`; break outer; }
  }
  const budget = maxBudgetLite(l, wy, cash);
  outer2: for (const t of ["apt84", "apt59", "villa"] as PropType[]) for (const d of order) {
    const pt = PROP_TYPES[t];
    const price = marketPrice(d.apt84 * pt.priceRatio, d.id, pt.beta, wy);
    if (price <= budget) { buyTxt = `${d.name} ${pt.name}`; break outer2; }
  }
  const cheapest = Math.min(...DISTRICTS.map((d) => marketPrice(d.apt84 * PROP_TYPES.apt59.priceRatio, d.id, 1, wy)));
  const gap = cheapest - budget;
  return `집을 보러 갔다. 전세로는 ${jeonse || "원룸 월세뿐"}, 매매로는 ${buyTxt || `아직 — 가장 싼 아파트까지 ${fmtMoney(Math.max(0, gap))} 모자람`}.`;
}

export function maxBudgetLite(l: Life, wy: WorldYear, money: number) {
  const n = l.props.filter((p) => PROP_TYPES[p.type].livable).length;
  const ltv = n === 0 ? wy.ltvNoHome : n === 1 ? wy.ltvOneHome : wy.ltvMulti;
  const tax = wy.acqTax[Math.min(2, n)];
  const inc = l.income + (l.family.married ? l.flags.spouseIncome ?? 0 : 0);
  const k = wy.rate + 1 / 30;
  const dsr = Math.max(0, (inc * 0.4 - l.props.reduce((a, p) => a + p.loan, 0) * k) / k);
  let lo = 0, hi = 3000000;
  for (let i = 0; i < 36; i++) { const P = (lo + hi) / 2; const loan = Math.min(P * ltv, wy.loanCap, dsr); if (P - loan + P * tax <= Math.max(0, money)) lo = P; else hi = P; }
  return lo;
}

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// ───────────── 하루 24시간: 집이 정하는 하루 ─────────────
export interface DaySeg { k: "sleep" | "commute" | "work" | "chores" | "family" | "mine" | "school" | "academy"; h: number; label: string }
export interface Day {
  segs: DaySeg[];
  sleepH: number;
  sleepQ: number; // 0~1 잠의 깊이
  sleepWhy: string[];
  commuteMin: number; // 편도
  myH: number;
  familyH: number;
  from: string; // 집 동네
  to: string | null; // 직장/학교 동네
  toLabel: string;
}

export function dayOf(l: Life, home = l.home, commuteOverride?: number, roomsOverride?: number): Day {
  const kidsYoung = l.family.kids.filter((k) => l.year - k.born < 10 && !k.independent).length;
  const kidsOlder = l.family.kids.filter((k) => l.year - k.born >= 10 && !k.independent).length;
  const people = householdSize(l);
  const rooms = roomsOverride ?? (home.tenure === "nursing" ? 1 : PROP_TYPES[home.type].rooms);
  const t = home.tags ?? [];
  // 잠의 깊이: 집과 동네가 정한다
  let q = 0.75;
  const why: string[] = [];
  if (t.includes("층간소음")) { q -= 0.2; why.push("윗집 발소리"); }
  if (t.includes("큰길가")) { q -= 0.15; why.push("밤새 차 소리"); }
  if (t.includes("반지하")) { q -= 0.1; why.push("습한 공기"); }
  if (t.includes("곰팡이")) { q -= 0.05; why.push("곰팡이 냄새"); }
  if (t.includes("공원 앞")) { q += 0.05; why.push("창밖 공원"); }
  if (t.includes("남향")) { q += 0.05; why.push("아침 햇살"); }
  if (people > rooms + 1) { q -= 0.15; why.push("방을 나눠 씀"); }
  if (kidsYoung && l.phase === "adult") { q -= Math.min(0.2, kidsYoung * 0.1); why.push("아이가 깸"); }
  if (home.type === "officetel") q -= 0.05;
  if (home.tenure === "nursing") { q -= 0.1; why.push("같은 방 사람들"); }
  if (l.phase === "adult" && l.work?.shift && working(l)) { q -= 0.15; why.push(l.work.shift === "night" ? "낮에 자는 잠" : "3교대"); }
  if (l.phase === "child" && (l.parttime ?? []).includes("conv")) { q -= 0.15; why.push("편의점 야간"); }
  if (["gangnam", "seongsu", "mapo"].includes(home.district) && !t.includes("공원 앞")) q -= 0.03;
  q = Math.max(0.2, Math.min(1, q));

  const segs: DaySeg[] = [];
  let sleepH = 7.5, myH = 0, familyH = 0, commute = 0;
  let to: string | null = null, toLabel = "";
  if (l.phase === "child") {
    const a = l.age;
    sleepH = a < 13 ? 9.5 : 7.5;
    const path = l.flags.path ?? 0; // 19살 이후: 1 대학 · 2 바로 일 · 3 하고 싶은 일
    const young = a >= 19 && path > 0;
    const school = young ? (path === 1 ? 6 : 0) : a >= 7 ? (a >= 16 ? 9 : a >= 13 ? 8 : 6) : 0;
    const academy = young ? 0 : a >= 10 ? Math.min(4, (l.flags.t_study ?? 0) * 1 + (l.home.district === "gangnam" ? 1 : 0)) : 0;
    const ptH = (l.parttime ?? []).reduce((a, id) => a + ptById(id).hoursWeek / 7, 0);
    const job = young ? (path === 2 ? 9 + (l.flags.twoJobs ? 3 : 0) : path === 3 ? 4 + ptH : ptH) : 0;
    commute = a >= 7 ? (young ? 35 : 12) : 0;
    to = a >= 7 ? home.district : null;
    toLabel = young ? (path === 1 ? "대학교" : path === 2 ? "일터" : "작업실") : a >= 16 ? "고등학교" : a >= 13 ? "중학교" : a >= 7 ? "초등학교" : "놀이터";
    if (job > 8) sleepH -= Math.min(1.5, (job - 8) * 0.3);
    const rest = Math.max(0, 24 - sleepH - school - academy - job - (commute * 2) / 60 - 1);
    familyH = Math.max(0, rest * 0.5);
    myH = Math.max(0, rest - familyH);
    segs.push({ k: "sleep", h: sleepH, label: "잠" });
    if (school) segs.push({ k: "school", h: school, label: young ? "강의" : "학교" });
    if (job) segs.push({ k: "work", h: job, label: path === 1 ? (l.parttime ?? []).map((id) => ptById(id).name).join("+") || "알바" : path === 2 ? "일" : "작업·알바" });
    if (commute) segs.push({ k: "commute", h: (commute * 2) / 60, label: young ? "이동" : "통학" });
    if (academy) segs.push({ k: "academy", h: academy, label: "학원" });
    segs.push({ k: "chores", h: 1, label: "밥·씻기" }, { k: "family", h: familyH, label: "가족" }, { k: "mine", h: myH, label: young ? "내 시간" : "놀이" });
  } else {
    const w = working(l);
    commute = commuteOverride ?? (w ? commuteOf(l, home.district, t) : 0);
    const workH = w ? workHours(l) : 0;
    const chores = 1 + kidsYoung * 1.5 + kidsOlder * 0.5 + (l.flags.parentsWithMe ? 1 : 0) + (home.tenure === "nursing" ? -0.5 : 0);
    let rest = 24 - workH - (2 * commute) / 60 - Math.max(0.5, chores) - sleepH;
    if (rest < 1) { const cut = Math.min(1.5, 1 - rest); sleepH -= cut; rest += cut; }
    rest = Math.max(0, rest);
    const together = l.family.married || kidsYoung + kidsOlder > 0 || home.tenure === "parents" || home.tenure === "withkid";
    familyH = together ? rest * (home.tenure === "parents" ? 0.3 : 0.5) : rest * (l.family.friends > 2 ? 0.3 : 0.15);
    myH = rest - familyH;
    to = w ? l.workDistrict : null;
    toLabel = w ? "직장" : l.jobId === "retired" ? "동네" : l.jobId === "jobless" ? "구직" : "";
    segs.push({ k: "sleep", h: sleepH, label: "잠" });
    if (w) segs.push({ k: "commute", h: commute / 60, label: "출근" }, { k: "work", h: workH, label: "일" }, { k: "commute", h: commute / 60, label: "퇴근" });
    segs.push({ k: "chores", h: Math.max(0.5, chores), label: kidsYoung ? "육아·집안일" : "집안일" }, { k: "family", h: familyH, label: together ? "가족" : "사람" }, { k: "mine", h: myH, label: "내 시간" });
  }
  return { segs, sleepH, sleepQ: q, sleepWhy: why, commuteMin: commute, myH, familyH, from: home.district, to, toLabel };
}

/** 이 하루가 1년 이어지면 네 스탯이 얼마나 움직이나 (집이 만드는 몫) */
export function dayEffects(l: Life, d = dayOf(l)) {
  const moneyOk = l.phase === "child" || l.cash > 0;
  const need = l.phase === "child" && l.age < 13 ? 9.5 : 7.5;
  const cap = (v: number) => Math.max(-3, Math.min(3, v));
  const rt = (2 * d.commuteMin) / 60;
  const health = cap((d.sleepH - need) * 1.2 + (d.sleepQ - 0.6) * 3 - Math.max(0, rt - 1) * 1.2 + (d.myH >= 2 && moneyOk ? 0.5 : -0.3));
  const mind = cap((Math.min(d.myH, 5) - 3) * 0.6 + (d.sleepQ - 0.6) * 3 + (d.sleepH - need) * 0.5);
  const rel = cap((Math.min(d.familyH, 4) - 2) * 0.9);
  const know = (d.myH >= 2.5 ? 0.5 : d.myH >= 1 ? 0.1 : -0.3) + (l.phase === "child" ? (d.segs.find((s) => s.k === "academy")?.h ?? 0) * 0.4 : 0);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return { health: r1(health), mind: r1(mind), rel: r1(rel), know: r1(know) };
}

/** 동네마다 지금 내 돈으로 무엇이 되나: 매매 / 전세 / 월세 / 아직 (방 수는 지금 식구에 맞춰) */
export function affordMap(l: Life, world: World): Record<string, "buy" | "jeonse" | "monthly" | "no"> {
  const wy = wyNow(world, l);
  const cash = l.cash + (l.home.tenure === "jeonse" || l.home.tenure === "monthly" ? l.home.deposit : 0);
  const budget = maxBudgetLite(l, wy, cash);
  const need = roomsNeeded(l);
  const types = (["officetel", "villa", "apt59", "apt84"] as PropType[]).filter((t) => PROP_TYPES[t].rooms >= Math.min(need, 3));
  const out: Record<string, "buy" | "jeonse" | "monthly" | "no"> = {};
  for (const d of DISTRICTS) {
    const prices = types.map((t) => ({ t, p: marketPrice(d.apt84 * PROP_TYPES[t].priceRatio, d.id, PROP_TYPES[t].beta, wy) }));
    const cheapest = prices.sort((a, b) => a.p - b.p)[0];
    const pt = PROP_TYPES[cheapest.t];
    if (cheapest.p <= budget) out[d.id] = "buy";
    else if (cheapest.p * pt.jeonseRatio <= cash) out[d.id] = "jeonse";
    else if (cheapest.p * 0.05 <= cash) out[d.id] = "monthly";
    else out[d.id] = "no";
  }
  return out;
}
