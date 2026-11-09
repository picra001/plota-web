// 곁의 사람들 — 최대 8명. 사는 동네·자산·여유 시간에 따라 생기고 멀어진다.
import { DISTRICTS, PROP_TYPES, commuteMin } from "../data/seoul";
import { chance, int, pick, range, weighted } from "./rng";
import type { Life, Person } from "./types";
import { feed } from "./feed";

export const MAX_PEOPLE = 8;
const NAMES = ["민서", "하준", "소율", "건우", "다은", "우진", "채원", "현우", "지민", "서윤", "하은", "도현", "유진", "재윤", "나연", "승우", "예준", "소희", "태민", "가은"];
const ROLE_KO: Record<Person["role"], string> = { parent: "부모님", sibling: "동생", friend: "동네 친구", classmate: "대학 동기", coworker: "직장 동료", neighbor: "이웃", parentFriend: "학부모", club: "모임 친구", partner: "연인" };
export const roleKo = (p: Person) => p.label ?? ROLE_KO[p.role];

function newName(l: Life) {
  const used = new Set([l.name, l.family.spouseName, ...l.family.kids.map((k) => k.name), ...l.people.map((p) => p.name)]);
  const pool = NAMES.filter((n) => !used.has(n));
  return pick(l.rng, pool.length ? pool : NAMES);
}

/** 동네와 내 형편에 따라 만나는 사람의 배경이 달라진다 */
function rollWealth(l: Life, district: string, myRich: boolean): Person["wealth"] {
  const d = DISTRICTS.find((x) => x.id === district)!;
  const posh = d.apt84 > 150000;
  return weighted(l.rng, ["tight", "middle", "rich"] as const, (w) => ({ tight: posh ? 0.1 : 0.3, middle: posh ? 0.4 : 0.55, rich: (posh ? 0.5 : 0.15) + (myRich ? 0.15 : 0) })[w]);
}

export function makePerson(l: Life, role: Person["role"], district: string, extra: Partial<Person> = {}): Person {
  const r = l.rng;
  const myRich = l.cash > 30000 || l.props.length > 0;
  return {
    id: `${role}_${Math.floor(r.s % 100000)}_${l.people.length}`,
    role,
    name: newName(l),
    district,
    closeness: int(r, 40, 65),
    trust: int(r, 20, 95),
    ambition: Math.round(range(r, 10, 90) + (["gangnam", "seongsu"].includes(district) ? 10 : 0)),
    wealth: rollWealth(l, district, myRich),
    since: l.year,
    news: [],
    ...extra,
  };
}

/** 여유 시간·이사 횟수·동네 익숙함에 따라 곁에 둘 수 있는 사람 수 (가족 제외) */
export function circleCap(l: Life, freeH: number): number {
  const recentMoves = l.homeHistory.filter((h) => h.from >= l.year - 5).length - 1;
  const jeong = l.jeong[l.home.district] ?? 0;
  let cap = 1 + Math.floor(freeH / 2) + (jeong >= 5 ? 1 : 0) + (jeong >= 12 ? 1 : 0) - (recentMoves >= 2 ? 1 : 0) - (recentMoves >= 4 ? 1 : 0) - (l.age >= 78 ? 1 : 0);
  return Math.max(1, Math.min(MAX_PEOPLE - 2, cap));
}

export const isNear = (l: Life, p: Person) => commuteMin(l.home.district, p.district) <= 35;
export const social = (l: Life) => l.people.filter((p) => p.role !== "parent" && p.role !== "sibling" && p.role !== "partner");
export const partnerOf = (l: Life) => l.people.find((p) => p.role === "partner");

/** 2026년 스물다섯: 어린 시절 친구, 대학 동기, 첫 직장 동료, 동생. 비교 소식(news)도 이들에게 붙는다 */
export function initAdultPeople(l: Life) {
  const r = l.rng;
  const childhood = l.homeHistory.find((h) => h.tenure === "parents")?.district ?? l.home.district;
  if (!l.people.some((p) => p.role === "parent")) l.people.push(makePerson(l, "parent", l.parentsHome.district, { name: "부모님", closeness: 70, trust: 95, ambition: 20, wealth: l.background === "빠듯한 집" ? "tight" : l.background === "넉넉한 집" ? "rich" : "middle" }));
  if (l.flags.sibling) l.people.push(makePerson(l, "sibling", l.parentsHome.district, { closeness: 60 + (l.flags.t_people ?? 0) * 5, label: "동생" }));
  l.people.push(makePerson(l, "friend", chance(r, 0.6) ? childhood : pick(r, DISTRICTS).id, { closeness: 45 + (l.flags.t_people ?? 0) * 8 }));
  if ((l.flags.t_study ?? 0) >= 1) l.people.push(makePerson(l, "classmate", pick(r, DISTRICTS).id, { closeness: 50 }));
  if (l.workDistrict) l.people.push(makePerson(l, "coworker", l.workDistrict, { closeness: 40 }));
  // 배낭여행에서 만난 친구: 멀리 살지만 오래 가고, 다른 세계를 보여 준다
  if (l.flags.traveled) l.people.push(makePerson(l, "friend", pick(r, DISTRICTS).id, { closeness: 55, label: "여행 친구", ambition: int(r, 50, 95), trust: int(r, 55, 95) }));
  for (const p of l.people) if (p.role !== "parent") p.news = makeNews(l, p);
  // 스물둘에 시작한 연애: 알바·일이 많았으면 살아남기 어렵다
  if (l.flags.dating) {
    const hours = (l.parttime ?? []).length + (l.flags.twoJobs ? 2 : 0);
    if (chance(r, 0.62 - hours * 0.12)) {
      const p = makePerson(l, "partner", l.home.district, { closeness: 62, trust: int(r, 50, 95) });
      l.people.push(p);
      l.flags.partnerSince = l.year - 3;
      feed(l, "milestone", `스물둘에 만난 ${p.name}과(와) 3년째 만나고 있습니다.`);
    } else feed(l, "auto", "스물넷 겨울, 첫 연애가 끝났습니다. 서로 너무 바빴습니다.");
    l.flags.dating = 0;
  }
}

/** 비교 소식: 결혼·집 장만·이민·창업·임원·귀촌·부고 */
function makeNews(l: Life, p: Person): Person["news"] {
  const r = l.rng;
  const news: Person["news"] = [];
  const rel = roleKo(p);
  const y = (age: number) => l.birthYear + age + (p.role === "sibling" ? 3 : 0);
  if (chance(r, 0.65)) { const a = int(r, 28, 37); news.push({ year: y(a), text: `${rel} ${p.name}이(가) 결혼했다. 신혼집은 ${pick(r, DISTRICTS).name}의 전세.`, kind: "marry" }); }
  const buyP = p.wealth === "rich" ? 0.85 : p.wealth === "middle" ? 0.55 : 0.3;
  if (chance(r, buyP)) {
    const a = int(r, p.wealth === "rich" ? 29 : 32, 46);
    const d = weighted(r, DISTRICTS, (x) => (x.apt84 > 150000 ? (p.wealth === "rich" ? 1.5 : 0.4) : 1.2));
    const t = pick(r, ["apt59", "apt84", "villa"] as const);
    news.push({ year: y(a), text: `${rel} ${p.name}이(가) ${d.name}에 ${PROP_TYPES[t].name}을(를) 샀다. ${a}살.`, kind: "home", district: d.id });
  }
  const special = weighted(r, ["none", "emigrate", "startup", "exec", "rural", "loss"], (k) => ({ none: 4, emigrate: 0.8, startup: 1.2 + p.ambition / 60, exec: 0.8, rural: 0.6, loss: 0.5 } as Record<string, number>)[k]);
  const a = int(r, 33, 55);
  if (special === "emigrate") news.push({ year: y(a), text: `${rel} ${p.name}이(가) 가족과 함께 해외로 이민을 갔다. 공항에서 마지막으로 통화했다.`, kind: "move" });
  if (special === "startup") news.push({ year: y(a), text: `${rel} ${p.name}이(가) 회사를 그만두고 가게를 열었다. ${chance(r, 0.5) ? "개업식에 화환을 보냈다." : "2년 뒤 문을 닫았다는 소식을 들었다."}`, kind: "job" });
  if (special === "exec") news.push({ year: y(a), text: `${rel} ${p.name}이(가) 임원이 됐다고 한다. 단톡방이 축하로 가득 찼다.`, kind: "job" });
  if (special === "rural") news.push({ year: y(a), text: `${rel} ${p.name}이(가) 서울 집을 팔고 지방 소도시로 내려갔다. "마당이 생겼어."`, kind: "move" });
  if (special === "loss") news.push({ year: y(a + 5), text: `${rel} ${p.name}의 부고를 받았다. 너무 이른 나이였다.`, kind: "loss" });
  return news.sort((x, z) => x.year - z.year);
}

/** 서울 나이대별 자가 비율 [추론] */
const OWN_RATE: Record<number, number> = { 30: 14, 35: 28, 40: 40, 45: 48, 50: 54, 55: 58, 60: 60 };

/** 해마다 봄: 비교 소식과 통계 */
export function peopleNews(l: Life) {
  const owns = l.home.tenure === "own";
  for (const p of l.people) for (const n of p.news ?? []) {
    if (n.year !== l.year) continue;
    feed(l, "peer", n.text);
    if (n.kind === "home") {
      if (n.district) p.district = n.district;
      if (!owns) { l.mind = Math.max(0, l.mind - 2); l.flags.f_comparison = (l.flags.f_comparison ?? 0) + 1; feed(l, "peer", "축하한다고 답장을 보내고, 한참 휴대폰을 내려놓지 못했다."); }
    }
    if (n.kind === "loss") { l.mind = Math.max(0, l.mind - 4); p.gone = true; }
    if (n.kind === "move" && n.text.includes("이민")) { p.gone = true; l.gak = Math.max(0, l.gak - 1); }
  }
  l.people = l.people.filter((p) => !p.gone);
  const rate = OWN_RATE[l.age];
  if (rate !== undefined) feed(l, "stat", `서울의 ${l.age}살 중 자기 집에 사는 사람은 약 ${rate}% [추론]. 당신은 그 ${owns ? "안" : "밖"}에 있다.`);
}

/** 연말: 친밀도가 변하고, 멀어진 사람은 떠나고, 빈자리에 새 사람이 온다 */
export function yearlyPeople(l: Life, freeH: number, familyH: number) {
  const r = l.rng;
  const moved = l.home.sinceYear === l.year;
  for (const p of l.people) {
    if (p.role === "parent") { p.district = l.parentsHome.district; continue; }
    let d = -4 + familyH * 1.2 + (freeH >= 2 ? 1 : 0);
    if (isNear(l, p)) d += 3;
    if (moved && p.role === "neighbor") d -= 25;
    if (moved && p.role === "friend" && !isNear(l, p)) d -= 4;
    if (p.role === "coworker" && (l.workDistrict !== p.district || !l.workDistrict)) d -= 6;
    if (p.role === "sibling") d = Math.max(d, -1);
    // 연인: 함께 보낼 시간이 있어야 가까워진다. 바쁘면 식는다
    if (p.role === "partner") d = (freeH - 2) * 4 + (isNear(l, p) ? 2 : -2) - (l.flags.sideH ? 4 : 0);
    p.closeness = Math.max(0, Math.min(100, p.closeness + d + range(r, -3, 3)));
  }
  // 곁에 둘 수 있는 수보다 많으면, 덜 가까운 사람부터 멀어진다
  const capNow = circleCap(l, freeH);
  const extra = social(l).sort((a, b) => a.closeness - b.closeness).slice(0, Math.max(0, social(l).length - capNow));
  for (const p of extra) p.closeness -= 8;
  // 나이 들면 떠나보내는 사람도 생긴다
  if (l.age >= 72) for (const p of social(l)) if (chance(r, (l.age - 70) * 0.006)) { feed(l, "auto", `${roleKo(p)} ${p.name}의 부고를 받았습니다.`); p.gone = true; l.mind = Math.max(0, l.mind - 3); }
  // 멀어진 사람
  for (const p of social(l)) if (!p.gone && p.closeness < 15) {
    feed(l, "auto", `${roleKo(p)} ${p.name}와(과) 연락이 뜸해졌습니다.`);
    p.gone = true;
  }
  l.people = l.people.filter((p) => !p.gone);
  // 새 사람: 자리가 있고, 지금 삶에 만날 곳이 있으면
  if (social(l).length < capNow && l.people.length < MAX_PEOPLE && chance(r, 0.35)) {
    const jeong = l.jeong[l.home.district] ?? 0;
    const kidsSchool = l.family.kids.some((k) => { const a = l.year - k.born; return a >= 6 && a <= 15; });
    const opts: [Person["role"], number][] = [
      ["neighbor", jeong >= 3 && l.home.tenure !== "nursing" ? 1.5 : 0],
      ["coworker", l.workDistrict && !["retired", "jobless"].includes(l.jobId) ? 1.2 : 0],
      ["parentFriend", kidsSchool ? 1.4 : 0],
      ["club", freeH >= 3 || l.flags.f_club ? 1 : 0],
    ];
    if (opts.some(([, w]) => w > 0)) {
      const role = weighted(r, opts, ([, w]) => w)[0];
      const district = role === "coworker" ? l.workDistrict! : l.home.district;
      const p = makePerson(l, role, district, { closeness: int(r, 35, 50) });
      l.people.push(p);
      const how: Record<string, string> = {
        neighbor: `옆집 ${p.name} 씨와 인사를 트게 됐습니다.`,
        coworker: `새로 온 ${p.name}와(과) 점심을 자주 먹게 됐습니다.`,
        parentFriend: `아이 친구 엄마·아빠인 ${p.name} 씨와 가까워졌습니다.`,
        club: `동네 모임에서 ${p.name}와(과) 친해졌습니다.`,
      };
      feed(l, "auto", how[role] + (p.wealth === "rich" ? " 사는 집이 꽤 넓다고 했습니다." : p.wealth === "tight" ? " 형편이 빠듯하다고 했습니다." : ""));
    }
  }
}

/** 관계 스탯을 사람들의 친밀도 쪽으로 조금 끌어당긴다 */
export function relTarget(l: Life): number | null {
  if (!l.people.length) return null;
  const s = l.people.map((p) => p.closeness * (p.role === "parent" || p.role === "sibling" ? 0.7 : 1));
  const top = s.sort((a, b) => b - a).slice(0, 5);
  const avg = top.reduce((a, b) => a + b, 0) / top.length;
  const countBonus = Math.min(15, social(l).length * 3);
  return avg * 0.8 + countBonus;
}
