// 집을 사고파는 때 — 영끌 · 청약 · 팔 때 · 결혼이 만드는 집 압박
// 언제 사고 언제 파느냐가 삶을 가른다. 결혼은 돈을 모으기 쉽게 만들지 않는다: 신혼집, 양가, 비교가 압박이 된다.
import { DISTRICTS, PROP_TYPES, type PropType } from "../data/seoul";
import { clamp, int, pick, weighted } from "./rng";
import type { EventOption, HomeOffer, Life, World, WorldYear } from "./types";
import type { EventDef } from "./events";
import { moveOpt } from "./events";
import { saleQuote, buyNumbers, districtName, fmtMoney, luckChance, personalIncome, propValue, spouseIncome, wyNow } from "./life";
import { makeOffer, offersFor, roomsNeeded } from "./home";
import { partnerOf } from "./people";
import { schedule, storyStep } from "./stories";
import { marketPrice } from "./market";

const opt = (label: string, hint: string, apply: EventOption["apply"], extra: Partial<EventOption> = {}): EventOption => ({ label, hint, apply, autoWeight: 1, ...extra });
const hhIncome = (l: Life) => Math.max(1200, personalIncome(l) + spouseIncome(l));
const back = (l: Life) => (l.home.tenure === "jeonse" || l.home.tenure === "monthly" ? l.home.deposit : 0);
const owns = (l: Life) => l.props.some((p) => PROP_TYPES[p.type].livable);
/** 부모님이 지금 보태 줄 수 있는 돈 */
export const parentCanHelp = (l: Life) => (l.family.parentsAlive > 0 ? Math.round((l.flags.parentHelp ?? 0) * 0.6) : 0);
/** 신용대출로 끌어올 수 있는 돈: 가구 소득의 1.2배 */
const creditCap = (l: Life) => Math.round(hhIncome(l) * 1.2);

/** 한 해 상환액(이자+원금)과 소득 대비 비율 */
function burden(l: Life, wy: WorldYear, loan: number, credit: number) {
  const pay = loan * (wy.rate + 0.012 + 0.04) + credit * (wy.rate + 0.035 + 0.2);
  return { month: Math.round(pay / 12), pct: Math.round((pay / hhIncome(l)) * 100) };
}

/** 모자란 돈을 신용대출(과 부모님 돈)으로 채워 사는 선택지 */
function stretchOption(l: Life, world: World, o: HomeOffer, useParents: boolean, label: string, memory: string): EventOption | null {
  const wy = wyNow(world, l);
  const short = Math.max(0, o.cashNeeded - (l.cash + back(l)));
  const help = useParents ? Math.min(short, parentCanHelp(l)) : 0;
  const credit = short - help;
  if (credit > creditCap(l)) return null;
  const b = burden(l, wy, o.loan, credit);
  const m = moveOpt(l, world, o, memory, credit > 0 ? 1 : 1.5, (life) => {
    life.cash += short;
    if (credit > 0) life.flags.credit = (life.flags.credit ?? 0) + credit;
    if (help > 0) { life.flags.parentHelp = Math.max(0, (life.flags.parentHelp ?? 0) - help / 0.6); life.mind = clamp(life.mind - 1); }
    life.flags.boughtRegime = wy.regime === "boom" ? 1 : wy.regime === "bust" ? -1 : 0;
    storyStep(life, "house", "내 집 마련", `${life.age}살, ${districtName(o.district)} ${PROP_TYPES[o.type].name}을(를) ${fmtMoney(o.price)}에 샀다.${credit ? ` 신용대출 ${fmtMoney(credit)}까지 끌어왔다.` : ""}${help ? ` 부모님이 ${fmtMoney(help)}을 보태 주셨다.` : ""}${wy.regime === "boom" ? " 집값이 한창 뛰던 때였다." : wy.regime === "bust" ? " 다들 집을 팔던 때였다." : ""}`);
  });
  m.label = label + ` — ${o.label}`;
  m.hint = `${fmtMoney(o.price)} · 주담대 ${fmtMoney(o.loan)}${credit ? ` + 신용대출 ${fmtMoney(credit)}` : ""}${help ? ` + 부모님 ${fmtMoney(help)}` : ""} · 상환 월 ${fmtMoney(b.month)} (소득의 ${b.pct}%)`;
  m.cost = undefined;
  return m;
}

/** 지금 살 만한 집 하나 (방 수에 맞춰, 끌어올 수 있는 돈까지 포함해서) */
function stretchHome(l: Life, world: World, extra: number, prefer: "fit" | "small"): HomeOffer | null {
  const wy = wyNow(world, l);
  const need = roomsNeeded(l);
  const types: PropType[] = prefer === "small" ? ["villa", "apt59"] : need >= 3 ? ["apt84", "apt59"] : ["apt59", "apt84"];
  const ds = [l.home.district, l.workDistrict ?? l.home.district, ...DISTRICTS.map((d) => d.id)].filter((d, i, a) => a.indexOf(d) === i);
  for (const d of ds) for (const t of types) {
    const o = makeOffer(l, wy, d, t, "buy", `${districtName(d)} ${PROP_TYPES[t].name}`, extra);
    if (o) return o;
  }
  return null;
}

export const HOUSING_DEFS: EventDef[] = [
  // ════ 영끌 ════
  {
    id: "kkeul",
    weight: (l, w) => {
      if (l.phase !== "adult" || owns(l) || l.age < 29 || l.age > 50 || l.home.tenure === "parents" && !l.family.married) return 0;
      let wt = w.regime === "boom" ? 1.8 : w.change > 0.06 ? 0.9 : 0.15;
      if (l.family.married) wt += 0.5;
      if (l.flags.wantBuy) wt += 2;
      return wt;
    },
    build: (l, w, world) => {
      const extra = creditCap(l) + parentCanHelp(l);
      const fit = stretchHome(l, world, extra, "fit");
      const small = stretchHome(l, world, creditCap(l) * 0.4, "small");
      const opts: EventOption[] = [];
      if (fit) { const o = stretchOption(l, world, fit, false, "영끌해서 산다", "등기를 받던 날, 대출 서류가 집문서보다 두꺼웠다"); if (o) opts.push(o); }
      if (fit && parentCanHelp(l) > 0) { const o = stretchOption(l, world, fit, true, "부모님 도움을 받아 산다", "부모님이 집들이 날 벽지를 한참 쓰다듬으셨다"); if (o) opts.push(o); }
      if (small && (!fit || small.price < fit.price * 0.85)) { const o = stretchOption(l, world, small, false, "작게 시작한다", "작아도 내 집, 첫날 밤 바닥에 누워 천장을 봤다"); if (o) opts.push(o); }
      if (!opts.length) {
        // 끌어와도 안 되는 돈: 잠긴 선택지로 얼마나 모자란지 보여 준다
        const any = stretchHome(l, world, 1e9, "small");
        if (any) { const gap = any.cashNeeded - (l.cash + back(l)) - creditCap(l) - parentCanHelp(l); opts.push(opt(`영끌해서 산다 — ${any.label}`, `${fmtMoney(any.price)} · 주담대 ${fmtMoney(any.loan)} + 신용대출 최대 ${fmtMoney(creditCap(l))}`, () => "", { lock: `영끌해도 ${fmtMoney(Math.max(0, gap))} 모자랍니다` })); }
      }
      if (!l.flags.cheongyak) opts.push(opt("청약을 넣고 기다린다", "몇 년 뒤 당첨될 수도 · 운과 가족 수가 좌우", (life) => { life.flags.cheongyak = 1; schedule(life, "cheongyak", int(life.rng, 2, 4)); storyStep(life, "house", "내 집 마련", `${life.age}살, 청약 통장을 들고 모델하우스 줄에 섰다.`); return "청약 신청 버튼을 누르고 기도했습니다."; }, { autoWeight: 1.5 }));
      opts.push(opt("지금은 아니다", w.regime === "boom" ? "더 오르면? 상투면?" : "기다린다", (life) => { life.flags.fomoYear = life.year; life.flags.wantBuy = 0; return "부동산 앱을 지웠다가 이틀 뒤 다시 깔았습니다."; }, { autoWeight: 1.5 }));
      return {
        id: "kkeul", tier: "macro", sceneId: "evt_kkeul",
        title: w.regime === "boom" ? "\"지금 안 사면 평생 못 산다\"는 말이 들립니다." : l.flags.wantBuy ? "신혼집을 알아보러 부동산에 갔습니다." : "부동산 사무실 앞을 또 기웃거렸습니다.",
        body: `금리 ${(w.rate * 100 + 1.2).toFixed(1)}%. 올해 서울 집값 ${w.change >= 0 ? "+" : ""}${Math.round(w.change * 100)}%. 현금 ${fmtMoney(l.cash + back(l))}${parentCanHelp(l) ? `, 부모님이 보태 주실 수 있는 돈 ${fmtMoney(parentCanHelp(l))}` : ""}.`,
        options: opts,
      };
    },
  },
  {
    id: "cheongyak", scheduled: true,
    weight: (l) => (owns(l) ? 0 : 1),
    build: (l, w, world) => {
      const kids = l.family.kids.filter((k) => !k.independent).length;
      const tries = (l.flags.cheongyakTries ?? 0) + 1;
      const win = luckChance(l, 0.1 + kids * 0.08 + (l.family.married ? 0.05 : 0) + tries * 0.04);
      if (!win) return {
        id: "cheongyak", tier: "macro", sceneId: "evt_kkeul",
        title: "청약 결과: 이번에도 떨어졌습니다.",
        body: `경쟁률 ${int(l.rng, 40, 380)} 대 1. ${tries}번째 도전이었습니다.`,
        options: [
          opt("다음 분양에 또 넣는다", "2~3년 뒤", (life) => { life.flags.cheongyakTries = tries; schedule(life, "cheongyak", int(life.rng, 2, 3)); life.mind = clamp(life.mind - 1); return "청약 통장에 다시 매달 돈을 넣었습니다."; }, { autoWeight: 2 }),
          opt("청약은 접는다", "영끌이나 전세로", (life) => { life.flags.cheongyak = 0; life.flags.wantBuy = 1; storyStep(life, "house", "내 집 마련", `청약에 ${tries}번 떨어지고 접었다.`); return "청약 통장을 해지했습니다."; }),
        ],
      };
      // 당첨: 새 아파트를 시세의 75%에
      const d = weighted(l.rng, DISTRICTS, (x) => (x.apt84 < 120000 ? 2 : 0.6));
      const t: PropType = roomsNeeded(l) >= 3 ? "apt84" : "apt59";
      const base = d.apt84 * PROP_TYPES[t].priceRatio;
      const price = Math.round(marketPrice(base, d.id, PROP_TYPES[t].beta, w) * 0.75);
      const b = buyNumbers(l, w, price, true);
      const o: HomeOffer = { district: d.id, type: t, tenure: "buy", base: base * 0.75, price, deposit: 0, yearlyRent: 0, loan: b.loan, cashNeeded: b.cashNeeded, condition: "good", tags: ["남향"], commute: 0, rooms: PROP_TYPES[t].rooms, label: `${d.name} 새 아파트 ${PROP_TYPES[t].name.replace("아파트 ", "")}` };
      const take = stretchOption(l, world, o, true, "계약한다", "새 아파트 현관 비닐을 내 손으로 뜯었다");
      return {
        id: "cheongyak", tier: "macro", sceneId: "evt_kkeul",
        title: `청약에 당첨됐습니다! ${d.name} 새 아파트.`,
        body: `분양가 ${fmtMoney(price)}, 시세보다 25% 싸다고 합니다. 계약금과 중도금을 마련해야 합니다.`,
        options: [
          ...(take ? [{ ...take, autoWeight: 3 }] : []),
          opt(take ? "포기한다" : "돈이 모자라 포기한다", "당첨 기회를 날린다", (life) => { life.flags.cheongyak = 0; life.mind = clamp(life.mind - 5); storyStep(life, "house", "내 집 마련", `${d.name} 청약에 당첨됐지만 돈이 모자라 포기했다.`); return "당첨 문자를 한참 들여다봤습니다."; }),
        ],
      };
    },
  },

  // ════ 팔 때 ════
  {
    id: "sell_timing",
    weight: (l, w) => {
      const gain = Math.max(0, ...l.props.map((p) => propValue(p, w) / p.boughtPrice - 1));
      if (gain < 0.35) return 0;
      return (w.regime === "boom" ? 1.6 : 0.5) + (gain > 0.8 ? 0.6 : 0);
    },
    build: (l, w, world) => {
      const p = l.props.reduce((a, b) => (propValue(b, w) / b.boughtPrice > propValue(a, w) / a.boughtPrice ? b : a));
      const v = propValue(p, w);
      const gain = v - p.boughtPrice;
      const isHome = p.uid === l.home.propUid;
      const name = `${districtName(p.district)} ${PROP_TYPES[p.type].name}`;
      const opts: EventOption[] = [];
      if (isHome) {
        const rent = offersFor(l, world, ["same_town", "near_work"]).filter((o) => o.tenure !== "buy").slice(0, 1);
        for (const o of rent) { const m = moveOpt(l, world, o, "판 집 앞을 지날 때마다 시세 앱을 열어 봤다", 1, (life) => { storyStep(life, "house", "내 집 마련", `${life.age}살, ${name}을(를) ${fmtMoney(v)}에 팔고 ${o.tenure === "jeonse" ? "전세" : "월세"}로 옮겼다. ${fmtMoney(gain)} 남겼다.`); }); m.label = `팔고 ${m.label}`; m.hint = `차익 +${fmtMoney(gain)} · ` + m.hint; opts.push(m); }
        const up = offersFor(l, world, ["bigger", "buy"]).filter((o) => o.tenure === "buy" && o.price > v).slice(0, 1);
        for (const o of up) { const m = moveOpt(l, world, o, "갈아탄 집의 대출 이자가 첫 달부터 무거웠다", 1, (life) => { storyStep(life, "house", "내 집 마련", `${life.age}살, ${name}을(를) 팔고 ${districtName(o.district)} ${PROP_TYPES[o.type].name}(으)로 갈아탔다.`); }); m.label = `팔고 ${m.label}`; opts.push(m); }
      } else {
        opts.push(opt(`${name}을(를) 판다`, `차익 +${fmtMoney(gain)} (세금 별도)`, (life) => { const before = life.cash; const idx = life.props.indexOf(p); if (idx >= 0) { const wy = wyNow(world, life); const sold = sellQuietDirect(life, p, wy); life.props.splice(life.props.indexOf(p), 1); storyStep(life, "house", "내 집 마련", `${life.age}살, 세 주던 ${name}을(를) 팔아 ${fmtMoney(sold)}를 손에 쥐었다.`); } return `잔금이 들어왔습니다. 현금 ${fmtMoney(before)} → ${fmtMoney(life.cash)}.`; }, { deal: true }));
      }
      opts.push(opt("더 오를 거다, 계속 갖고 있는다", "팔 때를 놓칠 수도", (life) => { life.flags.heldPeak = life.year; return "부동산 사장님의 전화를 다음에 받겠다고 했습니다."; }, { autoWeight: 2 }));
      return {
        id: "sell_timing", tier: "macro", sceneId: "evt_sell",
        title: `${name}, 산 값보다 ${Math.round((v / p.boughtPrice - 1) * 100)}% 올랐습니다.`,
        body: `${fmtMoney(p.boughtPrice)} → ${fmtMoney(v)}. ${w.regime === "boom" ? "동네 부동산마다 매수 대기자가 있다고 합니다." : "주변에서 지금이 꼭지라는 말도, 아직이라는 말도 들립니다."}`,
        options: opts,
      };
    },
  },

  // ════ 결혼이 만드는 집 압박 ════
  {
    id: "meet_parents",
    weight: (l) => {
      const p = partnerOf(l);
      if (!p || l.family.married || l.flags.metParents || owns(l)) return 0;
      return l.year - (l.flags.partnerSince ?? l.year) >= 2 && p.closeness >= 50 ? 3 : 0;
    },
    build: (l) => {
      const p = partnerOf(l)!;
      const help = parentCanHelp(l) + (p.wealth === "rich" ? 5000 : p.wealth === "middle" ? 1500 : 0);
      return {
        id: "meet_parents", tier: "life", sceneId: "evt_meet_parents",
        title: `${p.name}의 부모님과 상견례 자리. "집은 어떻게 할 생각인가?"`,
        body: `통장에는 ${fmtMoney(l.cash + back(l))}. ${p.wealth === "rich" ? "상대 집은 신혼집을 사서 시작하길 바랍니다." : p.wealth === "tight" ? "상대 집도 형편이 빠듯합니다." : "양가 모두 보태 줄 여력은 크지 않습니다."}`,
        options: [
          opt("전세라도 구해서 시작하겠습니다", "결혼 뒤 집 압박이 이어진다", (life) => { life.flags.metParents = 1; life.flags.pressure = 1; p.closeness = clamp(p.closeness + 3); storyStep(life, "house", "내 집 마련", `상견례에서 "전세로 시작하겠다"고 했다. 표정들이 애매했다.`); return "식사 내내 갈비찜만 바라봤습니다."; }, { autoWeight: 2 }),
          opt("대출을 받아 신혼집을 사겠습니다", "곧 영끌 고비 · 큰 대출", (life) => { life.flags.metParents = 1; life.flags.wantBuy = 1; p.closeness = clamp(p.closeness + 6); storyStep(life, "house", "내 집 마련", "상견례에서 신혼집을 사겠다고 약속했다."); return "약속하고 나서 집에 오는 길이 길었습니다."; }, { autoWeight: 1.2 }),
          ...(help > 0 ? [opt("양가 도움을 받겠습니다", `현금 +${fmtMoney(help)} · 간섭이 따라온다 · 행복 −`, (life) => { life.flags.metParents = 1; life.cash += help; life.flags.parentHelp = Math.max(0, (life.flags.parentHelp ?? 0) - parentCanHelp(life) / 0.6); life.flags.inlawHelp = 1; life.mind = clamp(life.mind - 2); storyStep(life, "house", "내 집 마련", `양가에서 ${fmtMoney(help)}을 보태 주셨다. 대신 할 말이 많아지셨다.`); return "봉투를 받고 큰절을 두 번 했습니다."; }, { autoWeight: 1.2 })] : []),
          opt("형편이 될 때까지 미루겠습니다", "연인과 멀어질 수 있다 · 행복 −", (life) => { life.flags.metParents = 1; life.flags.delayWed = life.year; p.closeness = clamp(p.closeness - 15); life.mind = clamp(life.mind - 3); storyStep(life, "house", "내 집 마련", "상견례 뒤 결혼을 미루기로 했다. 집이 문제였다."); return "돌아오는 차 안이 조용했습니다."; }, { autoWeight: 0.6 }),
        ],
      };
    },
  },
  {
    id: "house_pressure",
    weight: (l) => (l.family.married && !owns(l) && l.age >= 31 && l.age <= 52 ? 1 + (l.family.kids.length ? 0.6 : 0) + (l.flags.pressure ? 0.5 : 0) : 0),
    build: (l) => {
      const school = l.family.kids.some((k) => { const a = l.year - k.born; return a >= 5 && a <= 8; });
      return {
        id: "house_pressure", tier: "life", sceneId: "evt_house_pressure",
        title: school ? "아이 입학을 앞두고 배우자가 묻습니다. \"우리 계속 이사 다녀야 해?\"" : `${l.family.spouseName}이(가) 친구 부부 집들이 사진을 보여 줍니다.`,
        body: `결혼 ${l.year - (l.flags.marriedYear ?? l.year)}년째, 아직 남의 집. ${l.home.tenure === "jeonse" ? `전세 계약은 ${l.home.contractEnd}년까지.` : "월세가 매달 나갑니다."}`,
        options: [
          opt("영끌을 알아본다", "곧 매수 고비 · 큰 대출", (life) => { life.flags.wantBuy = 1; return "주말마다 임장을 다녔습니다."; }, { autoWeight: 1.5 }),
          ...(!l.flags.cheongyak ? [opt("청약을 넣는다", "몇 년 뒤 당첨될 수도", (life) => { life.flags.cheongyak = 1; schedule(life, "cheongyak", int(life.rng, 2, 4)); return "청약 가점을 계산해 봤습니다. 아이가 하나 더 있으면…"; }, { autoWeight: 1.5 })] : []),
          ...(parentCanHelp(l) > 0 ? [opt("부모님께 손을 벌린다", `현금 +${fmtMoney(parentCanHelp(l))} · 행복 −`, (life) => { const h = parentCanHelp(life); life.cash += h; life.flags.parentHelp = Math.max(0, (life.flags.parentHelp ?? 0) - h / 0.6); life.flags.wantBuy = 1; life.mind = clamp(life.mind - 2); return "어머니가 적금 통장을 내미셨습니다."; })] : []),
          opt("우리 속도대로 간다", "배우자와 다툼 · 관계 −, 행복 −", (life) => { life.gak = clamp(life.gak - 3); life.mind = clamp(life.mind - 2); life.flags.pressureYears = (life.flags.pressureYears ?? 0) + 1; return "그날 밤 각자 휴대폰만 봤습니다."; }),
        ],
      };
    },
  },
];

/** 세 준 집을 판다 (양도세·보증금 반영) */
function sellQuietDirect(l: Life, p: Life["props"][number], wy: WorldYear) {
  const q = saleQuote(l, p, wy);
  l.cash += q.net;
  return q.net;
}

/** 해마다: 집값이 뛰는데 집이 없으면 '벼락거지' 기분, 결혼했는데 집이 없으면 압박 */
export function housingMood(l: Life, wy: WorldYear) {
  if (l.phase !== "adult" || owns(l)) return;
  if (wy.change > 0.08 && l.age >= 28 && l.age <= 55) {
    l.mind = clamp(l.mind - 3);
    l.flags.f_comparison = (l.flags.f_comparison ?? 0) + 1;
    return pick(l.rng, [`서울 집값이 한 해 ${Math.round(wy.change * 100)}% 올랐습니다. 가만히 있었는데 가난해진 기분입니다.`, "\"그때 샀어야 했는데.\" 올해만 몇 번째 하는 말인지 모릅니다."]);
  }
  return "";
}
