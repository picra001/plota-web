// 인생 엔진 — 한 해 루프 (§3), 스탯 (§5.1), 집 매매 간단판 (§5.11 축소판)
import { DISTRICTS, PROP_TYPES, START_AGE, START_YEAR, KOREA_PROFILE, BIRTH_YEAR, CHILD_STOPS, type PropType } from "../data/seoul";
import { FAMILY_BACKGROUNDS, JOBS, START_QUESTIONS, jobById } from "../data/jobs";
import { chance, clamp, int, makeRng, normal, pick, range, weighted, next } from "./rng";
import { marketPrice, worldYear } from "./market";
import type { EventOption, Focus, Home, Life, Listing, Property, World, WorldYear, YearReport, Tenure } from "./types";
import { drawEvent, buildEvent } from "./events";
import { feed, milestone, seasonLine } from "./feed";
import { working, assignWork, commuteOf, householdSize, jeongOf, rollTags, yeoyu, routineLine, houseHunt, dayOf, dayEffects } from "./home";
import { BASE_HOURS, BASE_STRESS, ptById, workDistrictOf, type JobPost } from "../data/work";
import { housingMood } from "./housing";
import { initAdultPeople, peopleNews, yearlyPeople, relTarget } from "./people";
import { yearlyCosts } from "./stories";
import { resolveAuto } from "./events";

export const NAMES = ["지우", "서연", "민준", "하린", "도윤", "예린", "시우", "유나", "준호", "수아", "태오", "은채"];
const TENANTS = ["신혼부부", "대학원생", "간호사", "택배 기사", "은퇴한 부부", "외국인 유학생", "사회초년생", "프리랜서 디자이너"];
const PET = ["고양이", "강아지"];

export const fmtMoney = (man: number) => {
  const s = man < 0 ? "-" : "";
  const v = Math.abs(man);
  if (v >= 10000) return `${s}${(v / 10000).toFixed(v >= 100000 ? 0 : 1)}억`;
  return `${s}${Math.round(v).toLocaleString()}만`;
};

export const districtName = (id: string) => DISTRICTS.find((d) => d.id === id)!.name;
export const district = (id: string) => DISTRICTS.find((d) => d.id === id)!;

/** 올해 이야기에 쌓고 타임라인에도 한 줄 남긴다 */
function say(life: Life, line: string, k: "action" | "event" = "action") {
  life.story.push(line);
  feed(life, k, line);
}

// ── 부동산 활동은 계절(턴)마다 한 번: 사기·팔기·이사·들어가 살기
const seasonKey = (life: Life) => life.year * 10 + life.season;
export const dealUsed = (life: Life) => life.flags.dealKey === seasonKey(life);
const DEAL_USED_MSG = "이번 계절에는 이미 부동산 일을 했습니다. 다음 계절에 다시 할 수 있습니다.";
export function markDeal(life: Life) { life.flags.dealKey = seasonKey(life); }

function uid(life: Life) {
  return Math.floor(next(life.rng) * 1e9).toString(36);
}

// ───────────────────────── 생성 ─────────────────────────
export function createLife(seed: number, world: World, perYear = 4): Life {
  const r = makeRng(seed);
  const bg = weighted(r, FAMILY_BACKGROUNDS, (b) => b.weight);
  const parentsHome =
    bg.id === "tight" ? { district: "gwanak", type: "villa" as PropType, owned: false }
    : bg.id === "middle" ? { district: "nowon", type: "apt84" as PropType, owned: true }
    : { district: "gangnam", type: "apt84" as PropType, owned: true };
  const tags = bg.id === "tight" ? ["반지하", "곰팡이"] : bg.id === "middle" ? ["층간소음", "공원 앞"] : ["남향", "역세권"];
  const life: Life = {
    version: 7,
    people: [],
    stories: [],
    scheduled: [],
    phase: "child",
    birthYear: BIRTH_YEAR,
    workDistrict: null,
    jeong: {},
    parentsHome,
    seed,
    rng: r,
    name: pick(r, NAMES),
    year: BIRTH_YEAR,
    age: 0,
    alive: true,
    background: bg.label,
    parentsStory: bg.story,
    learn: 30 + int(r, -5, 5) + (bg.id === "rich" ? 5 : 0),
    health: 76 + int(r, -5, 5),
    mind: 60 + int(r, -5, 5),
    luck: Math.round(50 + normal(r, 0, 6)),
    cash: 0,
    gak: 50,
    jobId: "child",
    jobYears: 0,
    income: 0,
    jobHistory: [],
    home: { tenure: "parents", district: parentsHome.district, type: parentsHome.type, deposit: 0, yearlyRent: 0, sinceYear: BIRTH_YEAR, condition: bg.id === "tight" ? "bad" : bg.id === "rich" ? "good" : "normal", tags },
    homeHistory: [],
    props: [],
    listings: [],
    legwork: 1,
    everOwned: 0,
    lostHome: false,
    regained: false,
    family: { married: false, kids: [], parentsAlive: 2, friends: 2, pet: false },
    focus: null,
    season: 0,
    perYear: 1,
    yearEvents: [],
    pendingEventId: null,
    eventChoice: null,
    log: [],
    story: [],
    feed: [],
    flags: { parentHelp: bg.parentHelp, parentAge: 30 + int(r, -2, 4), adultPerYear: perYear, startCash: bg.startCash, bg: FAMILY_BACKGROUNDS.indexOf(bg) },
  };
  life.homeHistory.push({ district: life.home.district, type: life.home.type, tenure: "parents", from: BIRTH_YEAR, memory: childMemory(bg.id), tags });
  feed(life, "milestone", `${BIRTH_YEAR}년, ${districtName(life.home.district)}의 ${PROP_TYPES[life.home.type].name}${bg.id === "tight" ? "(반지하)" : ""}에서 태어났습니다.`);
  feed(life, "season", bg.story);
  startYear(life, world);
  return life;
}

function childMemory(bg: string) {
  if (bg === "tight") return "장마철이면 엄마가 대야를 들고 뛰어다녔다";
  if (bg === "rich") return "거실 창으로 한강이 조금 보였다";
  return "베란다에서 옆 동 친구와 손을 흔들었다";
}

/** 어린 시절 한 장면에서 다음 장면으로 (몇 해를 건너뛴다) */
function childStep(life: Life, world: World) {
  const i = CHILD_STOPS.indexOf(life.age);
  const next = CHILD_STOPS[i + 1];
  const gap = next === undefined ? 25 - life.age : next - life.age;
  const crowded = householdSize(life) > PROP_TYPES[life.home.type].rooms + 1;
  const E = dayEffects(life);
  life.jeong[life.home.district] = (life.jeong[life.home.district] ?? 0) + gap;
  if (life.age >= 4) life.learn = clamp(life.learn + gap * (0.8 + (life.flags.t_study ?? 0) * 0.2));
  life.health = clamp(life.health + gap * ((life.home.tags.includes("곰팡이") ? -0.8 : 0) + (life.home.tags.includes("공원 앞") ? 0.3 : 0)));
  life.mind = clamp(life.mind + gap * ((crowded ? -0.3 : 0.1) + E.mind * 0.25) + (58 - life.mind) * 0.1);
  life.gak = clamp(life.gak + gap * (0.3 + (life.flags.t_people ?? 0) * 0.3 + E.rel * 0.2));
  life.health = clamp(life.health + gap * E.health * 0.25);
  life.learn = clamp(life.learn + gap * E.know * 0.4);
  life.flags.parentAge += gap;
  if (life.age >= 19) youngYears(life, gap);
  if (next !== undefined) {
    life.age = next;
    life.year += gap;
    startYear(life, world);
  } else becomeAdult(life, world);
}

/** 스물 무렵: 버는 만큼만 모인다. 알바가 많으면 공부가 줄고, 집을 나가면 저축이 준다 [추론] */
function youngYears(life: Life, gap: number) {
  const path = life.flags.path ?? 1;
  const pts = (life.parttime ?? []).map(ptById);
  const atHome = life.home.tenure === "parents" && !life.flags.awayEarly;
  const student = path === 1 && life.age < 23;            // 대학 4년, 그 뒤 2년은 취업 준비·인턴
  const ptYear = pts.reduce((a, p) => a + p.monthly * 12, 0);
  let earn = 0, rate = atHome ? 0.4 : 0.12;
  if (path === 1) earn = student ? ptYear : 1300 + ptYear * 0.3; // 졸업 뒤엔 인턴 + 알바 조금
  if (path === 2) earn = 2300 + (life.flags.twoJobs ? 900 : 0);
  if (path === 3) earn = 900 + ptYear;
  if (path === 2) rate = atHome ? 0.3 : 0.1;
  if (life.background === "빠듯한 집") rate *= 0.6;      // 집에 보태는 몫
  // 데이트 비용은 모으던 돈에서 나간다
  life.flags.savings = (life.flags.savings ?? 0) + Math.round(Math.max(0, earn) * rate * gap) - (life.flags.dating ? 200 * gap : 0);
  // 등록금: 대학이면서 알바가 적으면 학자금 대출 (넉넉한 집은 부모님이 낸다)
  if (student && life.background !== "넉넉한 집") {
    const tuition = (life.background === "빠듯한 집" ? 300 : 400) * gap; // 장학금을 뺀 몫 [추론]
    const cover = Math.min(tuition, ptYear * 0.35 * gap);
    life.flags.debt = (life.flags.debt ?? 0) + (tuition - cover);
    life.flags.savings -= cover;
  }
  // 몸과 공부: 알바 종류마다 다르게 깎이고 쌓인다
  const yrs = student || path !== 1 ? gap : gap * 0.3;
  const hours = pts.reduce((a, p) => a + p.hoursWeek, 0) + (path === 2 ? (life.flags.twoJobs ? 16 : 0) : 0);
  life.learn = clamp(life.learn - yrs * Math.max(0, hours - 14) * 0.2 + (student ? gap * 1.2 : 0) + yrs * pts.reduce((a, p) => a + (p.gain.learn ?? 0), 0));
  life.health = clamp(life.health - yrs * (pts.reduce((a, p) => a + p.healthCost, 0) + (life.flags.twoJobs ? 1.5 : 0)) * (life.flags.dating ? 0.8 : 1));
  life.gak = clamp(life.gak + yrs * pts.reduce((a, p) => a + (p.gain.rel ?? 0), 0));
  // 일해 본 경험: 가게·사람을 다루는 감각 (자영업 성공에 쓰인다)
  life.flags.bizExp = (life.flags.bizExp ?? 0) + yrs * (pts.reduce((a, p) => a + (p.gain.biz ?? 0), 0) + (path === 2 ? 0.6 : path === 3 ? 0.5 : 0));
}

/** 선택지에 필요한 체력·지식·여유 시간. 모자라면 이유를 돌려준다 */
export function needLack(life: Life, need?: { health?: number; learn?: number; freeH?: number; biz?: number }): string {
  if (!need) return "";
  if (need.health && life.health < need.health) return `체력 ${need.health} 필요 · 지금 ${Math.round(life.health)}`;
  if (need.learn && life.learn < need.learn) return `지식이 모자랍니다`;
  if (need.biz && (life.flags.bizExp ?? 0) < need.biz) return `가게 일 경험이 모자랍니다`;
  if (need.freeH) { const h = dayOf(life).myH; if (h < need.freeH) return `하루 여유 ${need.freeH}시간 필요 · 지금 ${Math.round(h * 10) / 10}시간`; }
  return "";
}

/** 올해의 스트레스 0~4 */
export function stressNow(life: Life, myH = dayOf(life).myH) {
  if (life.phase === "child") return 0;
  let st = working(life) ? (life.work?.stress ?? BASE_STRESS[life.jobId] ?? 1) : life.jobId === "jobless" ? 2 : 0;
  if (life.flags.sideH) st += 1;
  if (life.cash < 0) st += 0.5;
  // 결혼했는데 내 집이 없다: 신혼집·학군·비교의 압박
  if (life.family.married && !life.props.some((p) => PROP_TYPES[p.type].livable) && life.age >= 30 && life.age <= 52) st += 0.6 + (life.family.kids.length ? 0.3 : 0) + Math.min(0.6, (life.flags.pressureYears ?? 0) * 0.2);
  // 영끌 대출이 남아 있으면
  if ((life.flags.credit ?? 0) > 0) st += 0.4;
  const buffer = (life.family.married ? 0.25 : 0) + (life.people.some((p) => p.role === "partner") ? 0.25 : 0) + (myH >= 3 ? 0.15 : 0);
  return Math.max(0, st * (1 - buffer));
}

/** 공고에서 고른 직장으로 일을 시작한다 */
export function takePost(life: Life, post: JobPost) {
  changeJob(life, post.base);
  life.income = Math.round(post.salary * (1 + (life.learn - 60) / 400) * (1 + normal(life.rng, 0, 0.04)));
  life.workDistrict = workDistrictOf(life, post);
  life.work = { post: post.id, title: post.title, hours: post.hours, stress: post.stress, shift: post.shift, growth: post.growth, layoff: post.layoff };
}

/** 성공이 걸린 일: 기본 확률 × 운 · 지식 · 경험 */
export function luckChance(life: Life, base: number, opts: { know?: number; biz?: number } = {}) {
  let p = base + (life.luck - 50) / 120;
  if (opts.know) p += ((life.learn - 50) / 100) * opts.know;
  if (opts.biz) p += (Math.min(0.15, (life.flags.bizExp ?? 0) * 0.02) + Math.min(0.12, (life.flags.bizPrep ?? 0) * 0.04)) * opts.biz;
  // 새해 결심을 지키는 해에는 준비한 만큼 조금 더
  if (resolutionOn(life, "estate") || resolutionOn(life, "biz") || resolutionOn(life, "study")) p += 0.03;
  const ok = chance(life.rng, Math.max(0.03, Math.min(0.95, p)));
  // 화면이 결과 카드에 '운이 따랐다/따르지 않았다'를 보여 줄 수 있게 남겨 둔다
  life.flags.lastRoll = ok ? 1 : -1;
  life.flags.lastRollP = Math.round(Math.max(0.03, Math.min(0.95, p)) * 100);
  return ok;
}

/** 올해의 새해 결심 */
export const RES_CODES = ["save", "biz", "exercise", "study", "people", "estate"] as const;
export type ResCode = (typeof RES_CODES)[number];
export const resolutionOn = (life: Life, code: ResCode) => life.flags.resYear === life.year && life.flags.res === RES_CODES.indexOf(code) + 1 && !life.flags.resBroken;

/** 스물다섯, 2026년: 첫 직업과 첫 집 */
function becomeAdult(life: Life, world: World) {
  const r = life.rng;
  life.phase = "adult";
  life.age = START_AGE;
  life.year = START_YEAR;
  life.perYear = life.flags.adultPerYear || 4;
  const tagW = (j: (typeof JOBS)[number]) => j.tags.reduce((a, t) => a + (life.flags[`t_${t}`] ?? 0), 0);
  const pt = life.flags.pt ?? 0;
  const first = weighted(r, JOBS, (j) => {
    let w = j.share * (1 + 0.5 * tagW(j));
    // 지식이 모자라면 공부로 가는 길이 좁아지고, 알바·일 경험이 많으면 가게·현장 쪽이 열린다
    if (j.tags.includes("study")) w *= Math.max(0.2, 0.5 + (life.learn - 45) / 40);
    if (j.id === "self" || j.id === "service") w *= 1 + pt * 0.35 + (life.flags.path === 3 ? 0.5 : 0);
    if (j.id === "pro" && life.flags.path !== 1) w *= 0.2;
    return w;
  });
  life.jobId = first.id;
  life.income = Math.round(first.income * (1 + normal(r, 0, 0.08)) * (1 + (life.learn - 50) / 300));
  life.jobHistory = [{ jobId: first.id, from: START_YEAR }];
  const gift = life.flags.startCash ?? 0, saved = Math.max(0, Math.round(life.flags.savings ?? 0)), debt = Math.round(life.flags.debt ?? 0);
  life.cash = gift + saved - debt;
  life.flags.moneyStory = 1;
  life.workDistrict = assignWork(life);
  const wy = worldYear(world, START_YEAR, 0.25);
  if (life.flags.leaveHome) {
    // 독립: 일터 근처 원룸 (넉넉한 집은 부모님이 전세를 보태 준다)
    const d = life.workDistrict ?? "gwanak";
    const t = PROP_TYPES.officetel;
    const price = marketPrice(district(d).apt84 * t.priceRatio, d, t.beta, wy);
    const rich = life.background === "넉넉한 집";
    const h: Home = rich
      ? { tenure: "jeonse", district: d, type: "officetel", deposit: Math.round(price * t.jeonseRatio), yearlyRent: 0, sinceYear: START_YEAR, contractEnd: START_YEAR + 2, condition: "good", tags: rollTags(life, "officetel", "good") }
      : { tenure: "monthly", district: d, type: "officetel", deposit: 1000, yearlyRent: Math.round(price * t.rentYield), sinceYear: START_YEAR, contractEnd: START_YEAR + 2, condition: pick(r, ["normal", "bad"] as const), tags: rollTags(life, "officetel", "normal") };
    if (!rich) life.cash -= 1000;
    moveInto(life, h, "처음 혼자 잠든 밤, 냉장고 소리가 크게 들렸다");
    life.mind += 2; life.gak += 2; // 첫 독립은 이사 손해를 상쇄
  }
  initAdultPeople(life);
  const c = commuteOf(life);
  const parts = [saved ? `${life.flags.path === 2 ? "일해서" : "알바로"} 모은 ${fmtMoney(saved)}` : "", gift ? `부모님이 주신 ${fmtMoney(gift)}` : "", debt ? `학자금·여행 빚 ${fmtMoney(debt)}` : ""].filter(Boolean);
  feed(life, "money", `스물다섯의 통장: ${parts.join(" · ") || "거의 빈 통장"} → ${fmtMoney(life.cash)}`);
  feed(life, "milestone", `${START_YEAR}년 봄, 스물다섯. ${life.home.tenure === "parents" ? "부모님 집" : `${districtName(life.home.district)} 원룸`}에서 채용 공고를 고릅니다.`);
  void c; void first;
  startYear(life, world);
}

// ───────────────────────── 계산 ─────────────────────────
export function propValue(p: { basePrice: number; district: string; type: PropType; condition: string }, wy: WorldYear) {
  const cond = p.condition === "good" ? 1.03 : p.condition === "bad" ? 0.92 : 1;
  return Math.round(marketPrice(p.basePrice, p.district, PROP_TYPES[p.type].beta, wy) * cond);
}

export function netWorth(life: Life, wy: WorldYear) {
  const props = life.props.reduce((a, p) => a + propValue(p, wy) - p.loan - (p.dep ?? 0), 0);
  return life.cash + props + (life.home.tenure === "jeonse" || life.home.tenure === "monthly" ? life.home.deposit : 0);
}

/** 곳간 점수: 서울 가구 순자산 중앙값 [추론] 3억 = 50점, 10배마다 +25 */
export function wealthScore(nw: number) {
  return Math.round(clamp(50 + 25 * Math.log10(Math.max(nw, 300) / 30000)));
}

export const ownedCount = (life: Life) => life.props.filter((p) => PROP_TYPES[p.type].livable).length;
export const totalLoan = (life: Life) => life.props.reduce((a, p) => a + p.loan, 0) + (life.flags.credit ?? 0);
export const job = (life: Life) => jobById(life.jobId);

export function homeYears(life: Life) {
  return life.year - life.home.sinceYear;
}

// ───────────────────────── 한 해 시작 ─────────────────────────
export const SEASONS = ["봄", "여름", "가을", "겨울"] as const;
export const seasonName = (life: Life) => (life.perYear === 1 ? "한 해" : SEASONS[life.season]);

/** 지금 계절 기준 시세 */
export function wyNow(world: World, life: Life) {
  return worldYear(world, life.year, (life.season + 1) / life.perYear);
}

/** 한 해 시작: 초점은 바꾸지 않으면 작년 것을 그대로 쓴다 */
export function startYear(life: Life, world: World) {
  life.flags.dYear = 0;
  life.flags.resBroken = 0;
  life.flags.ySwing = normal(life.rng, 0, job(life).volatility);
  life.story = [];
  life.season = 0;
  life.yearEvents = [];
  const m = milestone(life);
  if (m) feed(life, "milestone", m);
  if (life.phase === "adult") {
    // 루틴 층: 같은 틀, 숫자만 바뀐다
    feed(life, "routine", routineLine(life));
    if (life.age < 78 && life.home.tenure !== "nursing" && life.home.tenure !== "withkid" && (life.home.tenure !== "own" || life.year % 3 === 0)) feed(life, "hunt", houseHunt(life, world));
    peopleNews(life);
  }
  startSeason(life, world, true);
}

/** 계절 시작: 매물 일부 교체, 발품 충전, 이야기는 있을 수도 없을 수도 */
export function startSeason(life: Life, world: World, fullRefresh = false) {
  const wy = wyNow(world, life);
  life.eventChoice = null;
  life.legwork = (life.focus === "home" ? 2 : 1) + (resolutionOn(life, "estate") ? 2 : 0);
  refreshListings(life, wy, fullRefresh);
  // 빠른 모드(1년 1번)는 이야기 확률을 높여 한 해에 하나쯤 나오게
  const p = life.perYear === 1 ? 0.85 : 0.32;
  life.pendingEventId = drawEvent(life, wy, p);
  if (life.pendingEventId) life.yearEvents.push(life.pendingEventId);
  // 사소한 일은 묻지 않고 그냥 일어난다
  if (life.pendingEventId && resolveAuto(life.pendingEventId, life, world)) life.pendingEventId = null;
  // 계절 문장은 가끔만 (봄은 루틴 줄, 겨울은 연말 카드가 대신한다)
  if (life.phase === "child" || ((life.season === 1 || life.season === 2) && chance(life.rng, 0.55))) feed(life, "season", seasonLine(life));
  if (life.season === 0 && wy.news.length && life.pendingEventId !== "news") feed(life, "news", wy.news[0]);
}

/** 다음 계절로. 겨울이 끝나면 한 해를 마무리하고 결산을 돌려준다 */
export function advanceSeason(life: Life, world: World): YearReport | null {
  if (life.pendingEventId && life.eventChoice === null) return null;
  if (life.phase === "child") { childStep(life, world); return null; }
  seasonFlow(life, world);
  if (life.season < life.perYear - 1) {
    life.season++;
    startSeason(life, world);
    return null;
  }
  return endYear(life, world);
}

export function refreshListings(life: Life, wy: WorldYear, full = true) {
  const r = life.rng;
  // 계절마다: 절반쯤 남고 나머지는 새로 나온다. 해가 바뀌면 발품 판 매물 일부만 남는다
  const keep = full ? life.listings.filter((l) => l.revealed && chance(r, 0.4)).slice(0, 2) : life.listings.filter(() => chance(r, 0.55));
  const out: Listing[] = [...keep];
  const target = 5 + int(r, 0, 2);
  while (out.length < target) {
    const d = pick(r, DISTRICTS);
    const t = weighted(r, Object.values(PROP_TYPES), (x) => (x.id === "shop" ? 0.7 : x.id === "apt84" ? 1.2 : 1));
    const cond = weighted(r, ["good", "normal", "bad"] as const, (c) => (c === "normal" ? 3 : 1));
    out.push({
      uid: uid(life),
      district: d.id,
      type: t.id,
      basePrice: Math.round(d.apt84 * t.priceRatio * range(r, 0.85, 1.15)),
      askMul: range(r, 0.93, 1.08),
      condition: cond,
      revealed: false,
      note: "",
    });
  }
  life.listings = out;
}

export function listingPrice(l: Listing, wy: WorldYear) {
  return Math.round(propValue(l, wy) * l.askMul);
}

export function legwork(life: Life, listingUid: string): string {
  const l = life.listings.find((x) => x.uid === listingUid);
  if (!l || l.revealed) return "";
  if (life.legwork <= 0) return "올해는 더 발품을 팔 시간이 없습니다.";
  life.legwork--;
  l.revealed = true;
  const accurate = chance(life.rng, 0.55 + life.learn / 250);
  const shown = accurate ? l.condition : pick(life.rng, ["good", "normal", "bad"] as const);
  const notes = {
    good: ["남향이라 겨울에도 거실이 따뜻합니다.", "관리 사무소 아저씨가 단지 자랑을 합니다.", "버스 정류장이 바로 앞입니다."],
    normal: ["딱 평범합니다. 흠잡을 데도, 자랑할 데도 없습니다.", "윗집 발소리가 조금 들립니다.", "주차가 좀 빡빡합니다."],
    bad: ["욕실 천장에 누렇게 번진 자국이 있습니다.", "창틀 사이로 바람이 샙니다.", "밤에 큰길 소음이 심합니다."],
  } as const;
  l.note = pick(life.rng, notes[shown]);
  return l.note;
}

// ───────────────────────── 매매 ─────────────────────────
export interface BuyCheck {
  ok: boolean;
  price: number;
  loan: number;
  tax: number;
  cashNeeded: number;
  reason?: string;
  ltv: number;
}

/** 이 가격의 집을 산다면: 대출·세금·필요 현금 */
export function buyNumbers(life: Life, wy: WorldYear, price: number, livable: boolean) {
  const n = life.props.filter((p) => PROP_TYPES[p.type].livable).length;
  const ltv = !livable ? 0.5 : n === 0 ? wy.ltvNoHome : n === 1 ? wy.ltvOneHome : wy.ltvMulti;
  const taxRate = !livable ? 0.046 : wy.acqTax[Math.min(2, n)];
  const tax = Math.round(price * taxRate);
  const incomeBase = Math.max(personalIncome(life) + spouseIncome(life), rentIncomeEstimate(life, wy));
  const k = wy.rate + 1 / 30;
  const dsrMax = Math.max(0, (incomeBase * 0.4 - totalLoan(life) * k) / k);
  const loan = Math.max(0, Math.floor(Math.min(price * ltv, livable ? wy.loanCap : price, dsrMax)));
  return { loan, tax, cashNeeded: price - loan + tax, ltv };
}

/** base = 2026년 지수 기준가 (시세 = base × 지수 × 동네 배수) */
export function newProperty(life: Life, district: string, type: PropType, base: number, price: number, loan: number, condition: Property["condition"], mode: Property["mode"]): Property {
  const p: Property = { uid: uid(life), district, type, basePrice: Math.round(base), boughtYear: life.year, boughtPrice: price, loan, condition, mode };
  life.props.push(p);
  return p;
}

/** 조용히 판다(이사와 함께) — 세금 계산은 sell과 같다 */
/** 지금 팔면: 시세 · 양도세 · 수수료 · 갚을 대출 · 돌려줄 보증금 → 손에 쥐는 돈 */
export function saleQuote(life: Life, p: Property, wy: WorldYear) {
  const value = propValue(p, wy);
  const gain = value - p.boughtPrice;
  const held = life.year - p.boughtYear;
  // 양도세 [추론 단순화]: 1주택 2년 이상 보유 시 비과세, 그 외 차익의 30%(3채 이상 45%)
  const taxFree = ownedCount(life) === 1 && held >= 2 && p.mode === "live";
  const rate = taxFree ? 0 : ownedCount(life) >= 3 ? 0.45 : 0.3;
  const tax = gain > 0 ? Math.round(gain * rate) : 0;
  const fee = Math.round(value * 0.005);
  const dep = p.dep ?? 0;
  return { value, gain, tax, fee, loan: p.loan, dep, net: value - tax - fee - p.loan - dep, taxFree, held };
}
export const isMonthly = (p: Property) => p.mode === "rent" && p.lease !== "jeonse";

/** 조용히 판다(이사와 함께) — 세금 계산은 sell과 같다 */
export function sellQuiet(life: Life, p: Property, wy: WorldYear) {
  const q = saleQuote(life, p, wy);
  life.cash += q.net;
  life.props = life.props.filter((x) => x !== p);
  life.story.push(`${districtName(p.district)} ${PROP_TYPES[p.type].name}을(를) ${fmtMoney(q.value)}에 팔았습니다.`);
}

/** 전세 끼고 사기(갭): 세입자 보증금으로 집값 대부분을 치른다. 대출 없이 [추론] */
export function gapQuote(life: Life, l: Listing, wy: WorldYear) {
  const price = listingPrice(l, wy);
  const t = PROP_TYPES[l.type];
  const n = life.props.filter((p) => PROP_TYPES[p.type].livable).length;
  const tax = Math.round(price * (t.livable ? wy.acqTax[Math.min(2, n)] : 0.046));
  const dep = Math.round(propValue(l, wy) * t.jeonseRatio);
  const cashNeeded = price - dep + tax;
  return { price, dep, tax, cashNeeded, gap: price - dep, ok: t.livable && life.cash >= cashNeeded };
}

/** 세 놓는 방식을 바꾼다: 월세 → 전세면 보증금을 받고, 전세 → 월세면 보증금을 돌려준다 */
export function setLease(life: Life, propUid: string, lease: "monthly" | "jeonse", world: World): string {
  const wy = wyNow(world, life);
  const p = life.props.find((x) => x.uid === propUid);
  if (!p || p.mode !== "rent") return "";
  if (dealUsed(life)) return DEAL_USED_MSG;
  const where = `${districtName(p.district)} ${PROP_TYPES[p.type].name}`;
  if (lease === "jeonse") {
    const dep = Math.round(propValue(p, wy) * PROP_TYPES[p.type].jeonseRatio);
    markDeal(life);
    p.lease = "jeonse"; p.dep = dep; p.leaseEnd = life.year + 2; p.tenant = pick(life.rng, TENANTS);
    life.cash += dep;
    return `${where}을(를) 전세로 돌렸습니다. 보증금 ${fmtMoney(dep)}이(가) 들어왔습니다. 월세는 끊깁니다.`;
  }
  const dep = p.dep ?? 0;
  if (life.cash < dep) return `세입자에게 돌려줄 보증금 ${fmtMoney(dep)}이(가) 모자랍니다.`;
  markDeal(life);
  life.cash -= dep;
  p.lease = "monthly"; p.dep = 0; p.leaseEnd = undefined; p.tenant = pick(life.rng, TENANTS);
  return `${where} 전세 보증금 ${fmtMoney(dep)}을(를) 돌려주고 월세로 돌렸습니다.`;
}

/** 해마다: 전세 만기면 시세대로 다시 계약 — 오르면 보증금을 더 받고, 떨어지면 돌려준다(역전세) */
export function renewLeases(life: Life, wy: WorldYear, lines: string[]) {
  for (const p of life.props) {
    if (p.lease !== "jeonse" || p.mode !== "rent" || (p.leaseEnd ?? 0) > life.year) continue;
    const next = Math.round(propValue(p, wy) * PROP_TYPES[p.type].jeonseRatio);
    const delta = next - (p.dep ?? 0);
    p.dep = next; p.leaseEnd = life.year + 2;
    const where = `${districtName(p.district)} ${PROP_TYPES[p.type].name}`;
    life.cash += delta;
    if (delta > 0) lines.push(`${where} 전세 재계약: 보증금을 ${fmtMoney(delta)} 올려 받았습니다.`);
    else if (delta < 0) { lines.push(`${where} 역전세: 전셋값이 떨어져 세입자에게 ${fmtMoney(-delta)}을(를) 돌려줬습니다.`); life.mind = clamp(life.mind - 2); }
  }
}

export function checkBuy(life: Life, l: Listing, wy: WorldYear): BuyCheck {
  const price = listingPrice(l, wy);
  const n = life.props.filter((p) => PROP_TYPES[p.type].livable).length;
  const livable = PROP_TYPES[l.type].livable;
  const ltv = !livable ? 0.5 : n === 0 ? wy.ltvNoHome : n === 1 ? wy.ltvOneHome : wy.ltvMulti;
  const taxRate = !livable ? 0.046 : wy.acqTax[Math.min(2, n)];
  const tax = Math.round(price * taxRate);
  // DSR: 연 원리금(이자 + 30년 상환분) ≤ 소득 × 40%
  const incomeBase = Math.max(personalIncome(life) + spouseIncome(life), rentIncomeEstimate(life, wy));
  const dsrMax = Math.max(0, (incomeBase * 0.4 - totalLoan(life) * (wy.rate + 1 / 30)) / (wy.rate + 1 / 30));
  const loan = Math.max(0, Math.floor(Math.min(price * ltv, livable ? wy.loanCap : price, dsrMax)));
  // 지금 사는 전세·월세 보증금은 이사하면 돌려받는다고 보고 계산에 넣는다
  const deposit = life.home.tenure === "jeonse" || life.home.tenure === "monthly" ? life.home.deposit : 0;
  const cashNeeded = price - loan + tax;
  const ok = life.cash + deposit >= cashNeeded;
  let reason: string | undefined;
  if (!ok) {
    if (ltv === 0 && livable) reason = "다주택자는 이 집을 살 때 대출을 받을 수 없습니다.";
    else reason = `현금이 ${fmtMoney(cashNeeded - life.cash - deposit)} 부족합니다.`;
  }
  return { ok, price, loan, tax, cashNeeded, reason, ltv };
}

/** 지금 현금·소득으로 살 수 있는 집의 최대 가격 (살 집 기준) */
export function maxBudget(life: Life, world: World): { price: number; loan: number; ltv: number; limitBy: string } {
  const wy = wyNow(world, life);
  const n = ownedCount(life);
  const ltv = n === 0 ? wy.ltvNoHome : n === 1 ? wy.ltvOneHome : wy.ltvMulti;
  const taxRate = wy.acqTax[Math.min(2, n)];
  const incomeBase = Math.max(personalIncome(life) + spouseIncome(life), rentIncomeEstimate(life, wy));
  const k = wy.rate + 1 / 30;
  const dsrMax = Math.max(0, (incomeBase * 0.4 - totalLoan(life) * k) / k);
  const deposit = life.home.tenure === "jeonse" || life.home.tenure === "monthly" ? life.home.deposit : 0;
  const money = Math.max(0, life.cash + deposit);
  let lo = 0, hi = 3000000;
  for (let i = 0; i < 40; i++) {
    const P = (lo + hi) / 2;
    const loan = Math.min(P * ltv, wy.loanCap, dsrMax);
    if (P - loan + P * taxRate <= money) lo = P; else hi = P;
  }
  const loan = Math.min(lo * ltv, wy.loanCap, dsrMax);
  const limitBy = loan >= dsrMax - 1 && dsrMax < lo * ltv ? "소득(DSR)" : loan >= wy.loanCap - 1 ? "대출 한도" : ltv === 0 ? "다주택 대출 금지" : "현금";
  return { price: Math.round(lo), loan: Math.round(loan), ltv, limitBy };
}

export function buy(life: Life, listingUid: string, world: World, mode: "live" | "rent" | "gap"): string {
  const wy = wyNow(world, life);
  const l = life.listings.find((x) => x.uid === listingUid);
  if (!l) return "";
  if (dealUsed(life)) return DEAL_USED_MSG;
  if (mode === "gap") {
    const g = gapQuote(life, l, wy);
    if (!g.ok) return `현금이 ${fmtMoney(g.cashNeeded - life.cash)} 부족합니다.`;
    markDeal(life);
    life.cash -= g.cashNeeded;
    const p: Property = { uid: l.uid, district: l.district, type: l.type, basePrice: Math.round(l.basePrice * l.askMul), boughtYear: life.year, boughtPrice: g.price, loan: 0, condition: l.condition, mode: "rent", lease: "jeonse", dep: g.dep, leaseEnd: life.year + 2, tenant: pick(life.rng, TENANTS) };
    life.props.push(p);
    life.listings = life.listings.filter((x) => x.uid !== l.uid);
    life.everOwned++;
    if (!life.flags.firstBuyYear) { life.flags.firstBuyYear = life.year; life.flags.firstBuyRegime = wy.regime === "boom" ? 1 : wy.regime === "bust" ? -1 : 0; }
    const where = `${districtName(l.district)} ${PROP_TYPES[l.type].name}`;
    say(life, `${where}을(를) 전세 끼고 ${fmtMoney(g.price)}에 샀습니다. 내 돈 ${fmtMoney(g.cashNeeded)}, 세입자 보증금 ${fmtMoney(g.dep)}.`);
    return `갭투자: ${where}. 내 돈 ${fmtMoney(g.cashNeeded)}로 집 한 채. 전세가 떨어지면 보증금을 돌려줘야 합니다.`;
  }
  const c = checkBuy(life, l, wy);
  if (!c.ok) return c.reason ?? "살 수 없습니다.";
  // 사는 집 보증금 회수는 이사할 때만
  let cash = life.cash;
  if (mode === "live" && (life.home.tenure === "jeonse" || life.home.tenure === "monthly")) cash += life.home.deposit;
  if (cash < c.cashNeeded) {
    // 임대용인데 보증금이 묶여 있으면 실패
    return "사는 집 보증금이 묶여 있어 현금이 모자랍니다. 이 집으로 이사하면 살 수 있습니다.";
  }
  markDeal(life);
  const p: Property = {
    uid: l.uid,
    district: l.district,
    type: l.type,
    basePrice: Math.round(l.basePrice * l.askMul),
    boughtYear: life.year,
    boughtPrice: c.price,
    loan: c.loan,
    condition: l.condition,
    mode: mode,
  };
  life.cash = cash - c.cashNeeded;
  if (mode === "live") {
    // 보증금은 위에서 이미 회수
    life.home.deposit = 0;
  }
  if (mode === "live") for (const q of life.props) if (q.mode === "live") { q.mode = "rent"; q.tenant = pick(life.rng, TENANTS); }
  life.props.push(p);
  life.listings = life.listings.filter((x) => x.uid !== l.uid);
  life.everOwned++;
  if (life.lostHome) life.regained = true;
  const where = `${districtName(l.district)} ${PROP_TYPES[l.type].name}`;
  if (mode === "live") {
    moveInto(life, { tenure: "own", district: l.district, type: l.type, deposit: 0, yearlyRent: 0, propUid: p.uid, sinceYear: life.year, condition: l.condition, tags: rollTags(life, l.type, l.condition) }, ownMemory(life));
    say(life, `${where}을(를) ${fmtMoney(c.price)}에 샀습니다. 대출 ${fmtMoney(c.loan)}. 열쇠가 하나 늘었습니다.`);
  } else {
    if (PROP_TYPES[l.type].livable || l.type === "shop") {
      p.tenant = pick(life.rng, TENANTS);
    }
    say(life, `${where}을(를) ${fmtMoney(c.price)}에 사서 ${p.tenant ?? "임차인"}에게 세를 줬습니다.`);
  }
  return life.story[life.story.length - 1];
}

function ownMemory(life: Life) {
  const m = ["처음으로 벽에 못을 박아도 되는 집", "현관 비밀번호를 내 생일로 바꿨다", "베란다에 화분을 하나씩 늘려 갔다", "아이 키를 문틀에 연필로 그었다"];
  return pick(life.rng, m);
}

export function sell(life: Life, propUid: string, world: World): string {
  const wy = wyNow(world, life);
  const p = life.props.find((x) => x.uid === propUid);
  if (!p) return "";
  if (dealUsed(life)) return DEAL_USED_MSG;
  markDeal(life);
  const q = saleQuote(life, p, wy);
  const v = q.value, gain = q.gain, tax = q.tax;
  life.cash += q.net;
  life.props = life.props.filter((x) => x.uid !== propUid);
  const where = `${districtName(p.district)} ${PROP_TYPES[p.type].name}`;
  let line = `${where}을(를) ${fmtMoney(v)}에 팔았습니다. ${gain >= 0 ? "차익" : "손실"} ${fmtMoney(Math.abs(gain))}${tax ? `, 세금 ${fmtMoney(tax)}` : ""}${q.dep ? `, 전세 보증금 ${fmtMoney(q.dep)} 반환` : ""}. 손에 쥔 돈 ${fmtMoney(q.net)}.`;
  if (life.home.propUid === propUid) {
    // 살던 집을 팔면 같은 동네 전세로
    const price = marketPrice(district(p.district).apt84 * PROP_TYPES.apt59.priceRatio, p.district, 1, wy);
    const dep = Math.round(price * PROP_TYPES.apt59.jeonseRatio);
    if (life.cash >= dep) {
      life.cash -= dep;
      moveInto(life, { tenure: "jeonse", district: p.district, type: "apt59", deposit: dep, yearlyRent: 0, sinceYear: life.year, contractEnd: life.year + 2, condition: "normal", tags: rollTags(life, "apt59", "normal") }, "다시 남의 집 열쇠를 받았다");
    } else {
      rentCheap(life, wy, p.district);
    }
    line += " 살던 집을 비워 주고 이사했습니다.";
  }
  say(life, line);
  return line;
}

export function setMode(life: Life, propUid: string, mode: "live" | "rent", world: World): string | void {
  const p = life.props.find((x) => x.uid === propUid);
  if (!p) return;
  if (mode === "live") {
    if (!PROP_TYPES[p.type].livable) return;
    if (dealUsed(life)) return DEAL_USED_MSG;
    markDeal(life);
    for (const q of life.props) if (q.mode === "live") { q.mode = "rent"; q.lease = "monthly"; }
    if (life.home.tenure === "jeonse" || life.home.tenure === "monthly") life.cash += life.home.deposit;
    if (p.dep) { life.cash -= p.dep; p.dep = 0; }
    p.lease = undefined; p.leaseEnd = undefined;
    p.mode = "live";
    p.tenant = undefined;
    moveInto(life, { tenure: "own", district: p.district, type: p.type, deposit: 0, yearlyRent: 0, propUid: p.uid, sinceYear: life.year, condition: p.condition, tags: rollTags(life, p.type, p.condition) }, "세를 주던 집에 내가 들어가 살았다");
    say(life, `${districtName(p.district)} ${PROP_TYPES[p.type].name}에 직접 들어가 살기로 했습니다.`);
  } else {
    p.mode = "rent";
    p.tenant = pick(life.rng, TENANTS);
  }
}

/** 임차 이사: 월세 또는 전세 */
export function rentHome(life: Life, world: World, districtId: string, type: PropType, tenure: "monthly" | "jeonse"): string {
  const wy = wyNow(world, life);
  if (dealUsed(life)) return DEAL_USED_MSG;
  const t = PROP_TYPES[type];
  const price = marketPrice(district(districtId).apt84 * t.priceRatio, districtId, t.beta, wy);
  const back = life.home.tenure === "jeonse" || life.home.tenure === "monthly" ? life.home.deposit : 0;
  if (life.home.tenure === "own") {
    const p = life.props.find((x) => x.uid === life.home.propUid);
    if (p) { p.mode = "rent"; p.tenant = pick(life.rng, TENANTS); }
  }
  let deposit: number, yearly: number;
  if (tenure === "jeonse") {
    deposit = Math.round(price * t.jeonseRatio);
    yearly = 0;
  } else {
    deposit = Math.round(price * 0.05);
    yearly = Math.round(price * t.rentYield);
  }
  if (life.cash + back < deposit) return `보증금이 ${fmtMoney(deposit - life.cash - back)} 모자랍니다.`;
  markDeal(life);
  life.cash += back - deposit;
  moveInto(life, { tenure, district: districtId, type, deposit, yearlyRent: yearly, sinceYear: life.year, contractEnd: life.year + 2, condition: pick(life.rng, ["good", "normal", "normal", "bad"] as const), tags: rollTags(life, type, "normal") }, pick(life.rng, ["이삿짐 상자가 몇 달째 베란다에 있었다", "새 동네 빵집 아주머니가 먼저 인사했다", "벽지 무늬를 외울 만큼 오래 누워 있었다"]));
  const line = `${districtName(districtId)} ${t.name}에 ${tenure === "jeonse" ? `전세 ${fmtMoney(deposit)}` : `월세(연 ${fmtMoney(yearly)})`}로 이사했습니다.`;
  say(life, line);
  return line;
}

export function rentQuote(life: Life, world: World, districtId: string, type: PropType) {
  const wy = wyNow(world, life);
  const t = PROP_TYPES[type];
  const price = marketPrice(district(districtId).apt84 * t.priceRatio, districtId, t.beta, wy);
  return { jeonse: Math.round(price * t.jeonseRatio), monthlyDeposit: Math.round(price * 0.05), monthlyYearly: Math.round(price * t.rentYield) };
}

function rentCheap(life: Life, wy: WorldYear, districtId = "gwanak") {
  // 안전망: 공공임대 [추론] — 보증금 거의 없이, 낮은 월세
  life.cash += life.home.tenure === "jeonse" || life.home.tenure === "monthly" ? life.home.deposit : 0;
  moveInto(life, { tenure: "monthly", district: districtId, type: "villa", deposit: 300, yearlyRent: 300, sinceYear: life.year, contractEnd: life.year + 2, condition: "normal", tags: ["엘리베이터 없음"] }, "공공임대 신청서를 세 번 고쳐 썼다");
  life.cash -= 300;
}

export function moveInto(life: Life, h: Home, memory: string) {
  const last = life.homeHistory[life.homeHistory.length - 1];
  if (last && last.to === undefined) last.to = life.year;
  if (life.year !== life.home.sinceYear || life.homeHistory.length > 1) {
    life.mind -= 2;
    life.gak -= 2;
  }
  life.home = h;
  life.homeHistory.push({ district: h.district, type: h.type, tenure: h.tenure, from: life.year, memory, tags: h.tags });
  life.flags.moves = (life.flags.moves ?? 0) + 1;
}

function rentIncomeEstimate(life: Life, wy: WorldYear) {
  return life.props.filter(isMonthly).reduce((a, p) => a + propValue(p, wy) * PROP_TYPES[p.type].rentYield, 0);
}

// ───────────────────────── 선택 ─────────────────────────
export function chooseEvent(life: Life, world: World, idx: number): string {
  if (!life.pendingEventId || life.eventChoice !== null) return "";
  const ev = buildEvent(life.pendingEventId, life, world);
  const opt = ev.options[idx];
  if (!opt) return "";
  const lock = optionLock(life, opt);
  if (lock) return lock;
  life.eventChoice = idx;
  const line = opt.apply(life, wyNow(world, life));
  life.story.push(line);
  feed(life, "event", ev.title, { img: ev.sceneId, sub: `${opt.label} — ${line}` });
  return line;
}

export function setFocus(life: Life, f: Focus) {
  const was = life.focus;
  life.focus = f;
  if (f === "home" && was !== "home") life.legwork += 1;
}

// ───────────────────────── 가계 (계절마다 정산) ─────────────────────────
/** 본인 연 소득(올해 흔들림·배움·초점 반영) */
export function personalIncome(life: Life, focus: Focus | null = life.focus): number {
  const j = job(life);
  if (j.id === "retired") return 900 + (life.flags.lastIncome ?? 3000) * 0.2; // 연금 [추론]
  if (j.id === "jobless") return (life.flags.lastIncome ?? 2500) * 0.3; // 실업급여·단기 일 [추론]
  if (j.id === "landlord") return 0;
  const learnBonus = (life.learn - 50) / 300;
  let v = Math.max(600, life.income * (1 + (life.flags.ySwing ?? 0)) * (1 + learnBonus) * (focus === "work" ? 1.05 : 1));
  if (life.studying) v *= 0.85;
  return v;
}
/** 배우자 연 소득 [추론: 맞벌이, 62세까지, 아이가 어릴 때 절반] */
export function spouseIncome(life: Life): number {
  if (!life.family.married || !life.flags.spouseIncome || life.age >= 62) return 0;
  const youngKid = life.family.kids.some((k) => life.year - k.born < 3);
  return life.flags.spouseIncome * (youngKid || life.flags.spouseCut ? 0.5 : 1);
}
export function annualRent(life: Life, wy: WorldYear): { total: number; items: { name: string; v: number }[] } {
  const items = life.props.filter(isMonthly).map((p) => ({ name: `${districtName(p.district)} ${PROP_TYPES[p.type].name}`, v: propValue(p, wy) * PROP_TYPES[p.type].rentYield }));
  return { total: items.reduce((a, x) => a + x.v, 0), items };
}
/** 아이 한 명 한 해 비용 [추론, 2026년 돈 가치]: 나이 단계 + 학원(동네 따라) */
export function kidCost(life: Life, k: Life["family"]["kids"][number]): number {
  if (k.independent) return 0;
  const a = life.year - k.born;
  // 학원비: 동네 분위기 × 형편 (벌이가 적으면 덜 보낸다)
  const hh = (life.flags.lastIncome ?? life.income) + (life.family.married ? (life.flags.spouseIncome ?? 0) : 0);
  const academy = (["gangnam"].includes(life.home.district) ? 1.6 : ["mapo", "seongsu"].includes(life.home.district) ? 1.1 : 0.8) * Math.min(1.2, Math.max(0.4, hh / 8000));
  if (a < 0) return 0;
  if (a <= 6) return 1200;                    // 어린이집·기저귀·분유
  if (a <= 12) return 1300 + 700 * academy;   // 초등 + 학원
  if (a <= 18) return 1500 + 1500 * academy;  // 중고등 + 학원
  if (a <= 23) return 1400;                   // 대학 등록금·용돈
  return 600;                                  // 취업 준비, 아직 집에
}
/** 씀씀이: 벌수록 더 쓰고, 많이 벌면 더 빨리 는다 [추론] */
export function consumeOf(income: number, retired: boolean) {
  const c = Math.min(income, 6000) * 0.36 + Math.max(0, income - 6000) * 0.5;
  return c * (retired ? 0.75 : 1);
}
export function annualSpend(life: Life, wy: WorldYear, householdIncome: number, rentIncome: number, focus: Focus | null = life.focus): number {
  const j = job(life);
  // 생활비 [추론]: 기본 + 배우자 + 아이(나이별) + 차·취미 + 소비
  const kids = life.family.kids.reduce((a, k) => a + kidCost(life, k), 0);
  // 빚이 쌓이면 사람은 씀씀이부터 줄인다 (현금이 마이너스면 소비 절반, 소득만큼 빚지면 30%)
  const tight = life.cash < -(householdIncome + rentIncome) ? 0.3 : life.cash < 0 ? 0.5 : 1;
  let s = 2200 + (life.family.married ? 1200 : 0) + kids * (life.cash < 0 ? 0.8 : 1) + (life.family.pet ? 150 : 0) + (life.flags.carCost ?? 0) + (life.flags.hobbyCost ?? 0) + consumeOf(householdIncome + rentIncome, j.id === "retired") * tight;
  if (life.home.tenure === "parents") s -= 500;
  if ((life.flags.frugalUntil ?? 0) >= life.year) s -= consumeOf(householdIncome + rentIncome, j.id === "retired") * 0.4;
  if (resolutionOn(life, "save")) s -= consumeOf(householdIncome + rentIncome, j.id === "retired") * 0.25;
  if (resolutionOn(life, "exercise")) s += 200;
  if (resolutionOn(life, "study")) s += 150;
  if (j.id === "retired") s -= 400;
  // 마지막 거처 [추론]: 요양원 연 2,400만 / 자녀 집 생활비 절반 / 집에서 돌봄 연 1,800만
  if (life.home.tenure === "nursing") s = 2400;
  if (life.home.tenure === "withkid") s *= 0.5;
  if (life.care === "home") s += 1800;
  if (focus === "save") s *= 0.85;
  if (focus === "rest") s += 300;
  if (focus === "people") s += 150;
  s += life.home.yearlyRent;
  // 보유세·관리 [추론]: 보유 가액의 0.3%, 3채 이상 0.8%
  const propTotal = life.props.reduce((a, p) => a + propValue(p, wy), 0);
  s += propTotal * (ownedCount(life) >= 3 ? 0.008 : 0.003);
  return s;
}
/** 대출 이자: 시장 금리 + 가산 1.2%p (변동금리) */
export function annualInterest(life: Life, wy: WorldYear): number {
  // 신용대출(영끌)은 금리 + 3.5%p
  return life.props.reduce((a, p) => a + p.loan * (wy.rate + 0.012), 0) + (life.flags.credit ?? 0) * (wy.rate + 0.035);
}
/** 원금 상환: 주담대는 해마다 남은 대출의 4%, 신용대출은 20% (반드시 낸다) */
export const principalDue = (life: Life) => life.props.reduce((a, p) => a + Math.min(p.loan, Math.round(p.loan * 0.04)), 0) + Math.round((life.flags.credit ?? 0) * 0.2);
/** 지금 기준 한 달 가계 (화면용) */
export function monthlyBook(life: Life, world: World) {
  const wy = wyNow(world, life);
  const mine = personalIncome(life), sp = spouseIncome(life);
  const rent = annualRent(life, wy).total;
  const spend = annualSpend(life, wy, mine + sp, rent);
  const housing = life.home.yearlyRent;
  const interest = annualInterest(life, wy);
  const m = (v: number) => Math.round(v / 12);
  // 생활비 = 고정(식비·관리비·아이) + 소비(소득에 따라 느는 씀씀이, 당장의 즐거움)
  const living = spend - housing;
  const consume = Math.min(living, consumeOf(mine + sp + rent, job(life).id === "retired"));
  return { salary: m(mine), spouse: m(sp), rent: m(rent), living: m(living), fixed: m(living - consume), consume: m(consume), housing: m(housing), interest: m(interest), principal: m(principalDue(life)), net: m(mine + sp + rent - spend - interest - principalDue(life)) };
}

// ───────────────────────── 네 스탯: 돈 · 시간 · 체력 · 관계 / 행복(숨김) ─────────────────────────
/** 돈: 한 달에 남는 돈 + 모아 둔 돈 (지금 기준으로 다시 계산) */
export function moneyScore(life: Life, world: World): number {
  if (life.phase === "child") return life.background === "빠듯한 집" ? 30 : life.background === "넉넉한 집" ? 80 : 55;
  const b = monthlyBook(life, world);
  const inc = Math.max(100, b.salary + b.spouse + b.rent);
  const netRatio = b.net / inc; // 한 달에 남는 비율
  const spendM = Math.max(100, b.living + b.housing + b.interest);
  const months = Math.max(-12, Math.min(30, life.cash / spendM)); // 몇 달 버틸 돈
  return Math.round(clamp(25 + netRatio * 80 + months * 0.9));
}
/** 시간: 하루에 내 것으로 남는 시간 (잠이 모자라면 깎인다) */
export function timeScore(life: Life): number {
  const d = dayOf(life);
  const need = life.phase === "child" && life.age < 13 ? 9.5 : 7.5;
  // 은퇴 뒤: 할 일이 없으면 남는 시간이 여유가 되지 못한다
  const mine = life.jobId === "retired" ? Math.min(d.myH, 4) + Math.max(0, d.myH - 4) * (life.flags.f_retireAct ? 0.7 : 0.2) : d.myH;
  return Math.round(clamp((mine + d.familyH * 0.6) * 17 + (d.sleepH - need) * 12));
}
export function statsNow(life: Life, world: World) {
  return { money: moneyScore(life, world), time: timeScore(life), body: Math.round(life.health), rel: Math.round(life.gak) };
}
/** 행복의 목표치: 평균도 보지만 가장 모자란 칸이 더 크게 끌어내린다 */
export function happyTarget(s: { money: number; time: number; body: number; rel: number }) {
  const v = [s.money, s.time, s.body, s.rel];
  const avg = v.reduce((a, b) => a + b, 0) / 4;
  const min = Math.min(...v);
  return 0.5 * avg + 0.5 * min;
}

/** 계절이 끝날 때 그 계절 몫의 돈이 오간다. 월세가 들어오면 타임라인에 남긴다 */
export function seasonFlow(life: Life, world: World) {
  const wy = wyNow(world, life);
  const q = 1 / life.perYear;
  const r = life.rng;
  const inc = (personalIncome(life) + spouseIncome(life)) * q;
  let rent = 0;
  const rentLines: string[] = [];
  for (const p of life.props) {
    if (!isMonthly(p)) continue;
    const name = `${districtName(p.district)} ${PROP_TYPES[p.type].name}`;
    const v = propValue(p, wy) * PROP_TYPES[p.type].rentYield * q;
    if (chance(r, (p.type === "shop" ? 0.12 : 0.06) * (life.perYear === 1 ? 1 : 1.2))) {
      feed(life, "money", `${name}이(가) 이번 ${seasonName(life)} 비어 있었습니다. 월세가 들어오지 않았습니다.`);
      continue;
    }
    rent += v;
    rentLines.push(`${name} +${fmtMoney(v)}`);
  }
  const spend = annualSpend(life, wy, inc / q, rent / q) * q;
  const interest = annualInterest(life, wy) * q;
  const net = inc + rent - spend - interest;
  life.cash += net;
  life.flags.yInc = (life.flags.yInc ?? 0) + inc;
  life.flags.yRent = (life.flags.yRent ?? 0) + rent;
  life.flags.ySpend = (life.flags.ySpend ?? 0) + spend;
  life.flags.yInt = (life.flags.yInt ?? 0) + interest;
  // 월세가 들어올 때만 계절마다 한 줄. 나머지 가계는 연말 카드에 모은다
  if (rent > 0) feed(life, "rent", `월세 입금 ${fmtMoney(rent)}`, { sub: `${rentLines.join(" · ")} · 현금 ${fmtMoney(life.cash)}` });
}

// ───────────────────────── 한 해 마무리 ─────────────────────────
export function endYear(life: Life, world: World): YearReport {
  const wy = worldYear(world, life.year, 1);
  const r = life.rng;
  const j = job(life);
  const before = { learn: life.learn, health: life.health, mind: life.mind, wealth: wealthScore(netWorth(life, wy)) };
  const lines: string[] = [...life.story];
  const storyCount = lines.length;
  const focus = null;

  // ── 가계: 계절마다 이미 정산했다(seasonFlow). 연말에는 합계만 쓰고, 승급·원금 상환만 처리한다
  const income = Math.round(life.flags.yInc ?? 0);
  const rentIncome = Math.round(life.flags.yRent ?? 0);
  const spend = Math.round(life.flags.ySpend ?? 0);
  const interest = Math.round(life.flags.yInt ?? 0);
  life.flags.yInc = life.flags.yRent = life.flags.ySpend = life.flags.yInt = 0;
  if (!["retired", "jobless", "landlord"].includes(j.id)) {
    life.flags.lastIncome = Math.round(personalIncome(life, focus));
    // 경력 곡선: 초반에 빨리 오르고 25~30년 차에 평평해짐, 상한은 그 직업 첫 소득의 2.6배 [추론]
    life.income = Math.round(Math.min(Math.max(j.income, life.work?.post ? life.income : 0) * 2.0, life.income * (1 + (life.work?.growth ?? j.growth) * Math.max(0, 1 - life.jobYears / 28))));
  }
  if (life.family.married && life.flags.spouseIncome) life.flags.spouseIncome = Math.round(life.flags.spouseIncome * 1.02);
  // 원금 상환: 반드시 낸다 (모자라면 마이너스 통장)
  for (const p of life.props) {
    const pay = Math.min(p.loan, Math.round(p.loan * 0.04));
    p.loan -= pay; life.cash -= pay;
  }
  if (life.flags.credit) { const pay = life.flags.credit < 300 ? life.flags.credit : Math.round(life.flags.credit * 0.2); life.flags.credit -= pay; life.cash -= pay; }
  if (life.cash < 0) {
    // 마이너스 통장 이자
    life.cash += Math.round(life.cash * 0.07);
  }

  const burden = (life.home.yearlyRent + interest) / Math.max(1200, income + rentIncome);

  // ── 스탯 변화: 집이 주는 '여유'가 네 스탯을 움직인다
  const h = life.home;
  const tags = h.tags ?? [];
  const c = commuteOf(life);
  const Y = yeoyu(life);
  const rooms = PROP_TYPES[h.type].rooms;
  const jeong = jeongOf(life);
  const old = life.age >= 70;
  const resting = h.tenure === "nursing";
  life.flags.commuteSum = (life.flags.commuteSum ?? 0) + c;
  life.flags.yeoyuSum = (life.flags.yeoyuSum ?? 0) + Y.total;
  life.flags.yeoyuN = (life.flags.yeoyuN ?? 0) + 1;

  // 하루 24시간이 네 스탯을 움직인다 (집이 만드는 몫) + 그 밖의 삶
  const D = dayOf(life);
  const E = dayEffects(life, D);

  // 지식
  let dl = E.know + (j.id !== "retired" && j.id !== "jobless" ? 0.4 : 0);
  if (life.studying) dl += 3;
  dl *= 1 - life.learn / 120;
  if (life.age > 55) dl -= 0.8;
  life.learn = clamp(life.learn + dl);

  // 건강
  const target = 77 - Math.max(0, life.age - 40) * 0.65;
  let dh = (target - life.health) * 0.08 - j.healthDrain * 0.4 + E.health * 0.8;
  if (h.condition === "bad") dh -= 0.6;
  if (old && (tags.includes("엘리베이터 없음") || tags.includes("언덕"))) dh -= 1.5;
  if (!old && tags.includes("언덕")) dh += 0.3;
  if (resting) dh += 1.5;
  if (life.mind < 30) dh -= 1;
  if (ownedCount(life) >= 4) dh -= 0.6;
  // 스트레스: 일의 압박 + 투잡. 연인·배우자·쉬는 시간이 완충한다
  const stress = stressNow(life, D.myH);
  dh -= stress * 0.15;
  dh += normal(r, 0, 1.2);
  life.health = clamp(life.health + dh);

  // 행복(숨김): 네 칸의 목표치로 끌려가고, 잠·내 시간·불안이 더한다
  const S = statsNow(life, world);
  let dm = (happyTarget(S) - life.mind) * 0.3 + E.mind * 0.4 - Math.max(0, Y.housingPct - 30) * 0.04;
  if (burden > 0.4) lines.push("주거비와 이자가 월급의 절반 가까이 가져갔습니다.");
  if (h.tenure === "own") dm += 0.8;
  if (jeong >= 5) dm += 0.6;
  if (life.gak > 60) dm += 1;
  if (life.gak < 25) dm -= 1.5;
  if (j.id === "jobless") dm -= 5;
  dm -= stress * 0.5;
  if (life.people.some((p) => p.role === "partner")) dm += 1.5;
  if (life.cash < 0) dm -= 2;
  if (resting) dm -= 1;
  dm += normal(r, 0, 1.2);
  life.mind = clamp(life.mind + dm);

  // 관계
  let dg = E.rel * 0.7 - j.gakDrain * 0.4;
  if (life.family.married) dg += 0.8;
  dg += Math.min(3, life.family.kids.length) * 0.5;
  if (jeong >= 5) dg += 0.6;
  if (homeYears(life) === 0) dg -= 1;
  const grandkids = life.family.kids.reduce((a, k) => a + k.kids, 0);
  if (grandkids > 0 && rooms >= 3) dg += 2;
  if (life.family.parentsAlive > 0 && h.district === life.parentsHome.district) dg += 1;
  if (h.tenure === "withkid") dg += 3;
  if (resting) dg -= 1.5;
  if (life.age > 75) dg -= 0.5;
  dg += (50 - life.gak) * 0.06;
  // 곁의 사람들: 친밀도가 관계를 끌어당긴다
  yearlyPeople(life, D.myH, D.familyH);
  const rt = relTarget(life);
  if (rt !== null) dg += (rt - life.gak) * 0.1;
  life.gak = clamp(life.gak + dg);
  // 경조사·병원비 같은 해마다 나가는 돈
  if (life.phase === "adult") yearlyCosts(life);
  if (jeong >= 5 && life.family.friends < 10 && chance(r, 0.12)) life.family.friends++;
  if (h.tenure !== "nursing") life.jeong[h.district] = (life.jeong[h.district] ?? 0) + 1;

  // ── 공부 진행
  if (life.studying) {
    life.studying.years--;
    if (life.studying.years <= 0) {
      const target = life.studying.target;
      if (luckChance(life, 0.35, { know: 1 })) {
        changeJob(life, target);
        lines.push(`몇 년의 밤 공부 끝에 ${jobById(target).name}(으)로 일을 바꿨습니다.`);
      } else {
        lines.push("시험에 떨어졌습니다. 책은 책장 맨 아래 칸으로 내려갔습니다.");
        life.mind = clamp(life.mind - 4);
      }
      life.studying = undefined;
    }
  }

  // ── 실직
  const keep = (life.luck - 50) / 100 + (j.id === "self" ? Math.min(0.3, (life.flags.bizExp ?? 0) * 0.04) : 0);
  if ((life.work?.layoff ?? j.layoff) > 0 && chance(r, (life.work?.layoff ?? j.layoff) * (life.learn > 70 ? 0.6 : 1) * (wy.news.length && wy.change < -0.05 ? 2 : 1) * Math.max(0.3, 1 - keep))) {
    lines.push(j.id === "self" ? "가게 문을 닫았습니다. 마지막 날 단골이 꽃을 두고 갔습니다." : "회사에서 구조조정 명단이 돌았고, 거기 당신의 이름이 있었습니다.");
    changeJob(life, "jobless");
  }

  // ── 가족의 시간
  life.flags.parentAge++;
  if (life.family.parentsAlive > 0 && life.flags.parentAge > 72 && chance(r, (life.flags.parentAge - 70) * 0.012)) {
    life.family.parentsAlive--;
    lines.push(life.family.parentsAlive === 1 ? "부모님 중 한 분이 먼저 떠나셨습니다." : "남은 부모님마저 떠나셨습니다. 어린 시절의 집이 정리됐습니다.");
    life.mind = clamp(life.mind - 8);
    if (life.family.parentsAlive === 0 && life.parentsHome.owned) life.flags.inheritPending = 1;
    if (life.family.parentsAlive === 0 && life.flags.parentHelp > 0 && !life.parentsHome.owned) {
      const inherit = Math.round(life.flags.parentHelp * 1.5 * wy.index);
      life.cash += inherit;
      lines.push(`부모님이 남긴 ${fmtMoney(inherit)}을(를) 물려받았습니다.`);
      life.flags.parentHelp = 0;
    }
    if (life.home.tenure === "parents" && (life.family.parentsAlive > 0 || !life.parentsHome.owned)) {
      if (life.family.parentsAlive === 0) rentCheapOrJeonse(life, wy);
    }
  }
  for (const k of life.family.kids) {
    const kage = life.year - k.born;
    if (!k.independent && kage >= 27 && chance(r, 0.25)) {
      k.independent = true;
      lines.push(`${k.name}이(가) 독립했습니다. 방 하나가 조용해졌습니다.`);
    }
    if (k.independent && !k.married && kage >= 29 && chance(r, 0.12)) {
      k.married = true;
      lines.push(`${k.name}이(가) 결혼했습니다.`);
    }
    if (k.married && k.kids < 3 && kage <= 42 && chance(r, 0.12)) {
      k.kids++;
      lines.push(`${k.name}에게 아이가 생겼습니다. 당신은 할머니·할아버지가 됐습니다.`);
      life.mind = clamp(life.mind + 5);
      life.gak = clamp(life.gak + 5);
    }
  }
  if (!life.family.married && life.family.friends > 0 && life.age > 45 && chance(r, 0.03)) life.family.friends--;

  renewLeases(life, wy, lines);
  // 새해 결심: 스트레스가 크거나 여유가 없으면 흐지부지된다
  if (life.flags.resYear === life.year && life.flags.res) {
    const code = RES_CODES[life.flags.res - 1];
    const keepP = 0.75 - stressNow(life, D.myH) * 0.08 + Math.min(0.15, D.myH * 0.03);
    const kept = chance(r, Math.max(0.25, Math.min(0.92, keepP)));
    if (!kept) { life.flags.resBroken = 1; life.mind = clamp(life.mind - 1); lines.push("새해 결심은 봄을 넘기지 못했습니다."); }
    else {
      if (code === "save") lines.push("한 해 동안 가계부를 썼습니다. 통장이 조금 두꺼워졌습니다.");
      if (code === "biz") { life.flags.bizPrep = (life.flags.bizPrep ?? 0) + 1; life.flags.bizExp = (life.flags.bizExp ?? 0) + 0.8; lines.push("주말마다 창업 강의를 듣고 상권을 걸었습니다."); }
      if (code === "exercise") { life.health = clamp(life.health + 3); life.mind = clamp(life.mind + 1); lines.push("아침 운동이 습관이 됐습니다."); }
      if (code === "study") { life.learn = clamp(life.learn + 3); lines.push("자격증 책 한 권을 끝까지 봤습니다."); }
      if (code === "people") { life.gak = clamp(life.gak + 3); for (const p of life.people) if (p.role !== "parent") p.closeness = clamp(p.closeness + 6); lines.push("한 달에 한 번은 먼저 연락했습니다."); }
      if (code === "estate") { life.luck = clamp(life.luck + 1); life.learn = clamp(life.learn + 1); lines.push("주말마다 임장을 다녔습니다. 동네 시세가 손에 잡히기 시작했습니다."); }
    }
  }
  // ── 돈이 모자랄 때: ① 주택연금(60세+, 자가) ② 세 준 집 급매 ③ 그래도 안 되면 경매 (집을 잃어도 게임은 계속)
  if (life.cash < 0 && life.age >= 60 && life.home.tenure === "own" && !life.flags.reverseMortgage) {
    const p = life.props.find((x) => x.uid === life.home.propUid);
    if (p && p.loan < propValue(p, wy) * 0.3) {
      life.flags.reverseMortgage = Math.round(propValue(p, wy) * 0.035);
      lines.push(`집을 담보로 주택연금을 신청했습니다. 해마다 ${fmtMoney(life.flags.reverseMortgage)}씩 받으며 이 집에서 계속 삽니다.`);
    }
  }
  if (life.flags.reverseMortgage) life.cash += life.flags.reverseMortgage;
  if (life.cash < -Math.max(3000, income) && life.props.some((p) => p.mode === "rent")) {
    const p = life.props.find((x) => x.mode === "rent")!;
    const v = Math.round(propValue(p, wy) * 0.95);
    life.cash += v - p.loan - (p.dep ?? 0);
    life.props = life.props.filter((x) => x !== p);
    lines.push(`급하게 ${districtName(p.district)} ${PROP_TYPES[p.type].name}을(를) 시세보다 싸게 팔았습니다.`);
    life.mind = clamp(life.mind - 4);
  }
  // 경매 전에: 빚이 감당 못 할 만큼이면 살던 집을 급매로 팔고 싼 집으로 (남는 돈이 있을 때)
  if (life.cash < -Math.max(5000, (income + rentIncome) * 1.5) && life.home.tenure === "own") {
    const p = life.props.find((x) => x.uid === life.home.propUid);
    if (p && propValue(p, wy) * 0.93 - p.loan + life.cash > 0) {
      life.cash += Math.round(propValue(p, wy) * 0.93) - p.loan;
      life.props = life.props.filter((x) => x !== p);
      lines.push(`빚을 감당할 수 없어 ${districtName(p.district)} 집을 급매로 팔았습니다.`);
      life.mind = clamp(life.mind - 6);
      rentCheap(life, wy);
    }
  }
  if (life.cash < -Math.max(8000, (income + rentIncome) * 2.5) && life.props.length) {
    const p = life.props.reduce((a, b) => (propValue(a, wy) - a.loan - (a.dep ?? 0) > propValue(b, wy) - b.loan - (b.dep ?? 0) ? b : a));
    const v = Math.round(propValue(p, wy) * 0.8);
    life.cash += v - p.loan - (p.dep ?? 0);
    const wasHome = life.home.propUid === p.uid;
    life.props = life.props.filter((x) => x !== p);
    lines.push(`${districtName(p.district)} ${PROP_TYPES[p.type].name}이(가) 경매로 넘어갔습니다.`);
    life.lostHome = true;
    life.mind = clamp(life.mind - 12);
    if (wasHome) rentCheap(life, wy);
  }
  if (life.cash < -2000 && life.home.tenure !== "parents" && life.home.yearlyRent > 500) {
    rentCheap(life, wy, life.home.district);
    lines.push("감당이 안 돼 공공임대로 옮겼습니다. 좁지만 비가 새지는 않습니다.");
  }

  const mood = housingMood(life, wy);
  if (mood) lines.push(mood);
  // 시세 반영 메시지
  if (wy.change > 0.08) lines.push(`서울 집값이 한 해 ${Math.round(wy.change * 100)}% 올랐습니다.`);
  if (wy.change < -0.06) lines.push(`서울 집값이 한 해 ${Math.round(-wy.change * 100)}% 떨어졌습니다.`);

  // ── 연말 가족사진
  const nw = netWorth(life, wy);
  const photo = familyPhoto(life);
  life.log.push({
    year: life.year,
    age: life.age,
    learn: life.learn,
    health: life.health,
    mind: life.mind,
    wealth: wealthScore(nw),
    netWorth: nw,
    gak: life.gak,
    money: S.money,
    time: S.time,
    freeH: (() => { const d = dayOf(life); return Math.round((d.myH + d.familyH) * 10) / 10; })(),
    happy: life.mind,
    photo,
    photoPlace: life.home.tenure === "nursing" ? "요양원" : `${districtName(life.home.district)} ${PROP_TYPES[life.home.type].name}`,
    headline: lines[0] ?? "별일 없이 한 해가 지나갔습니다.",
  });

  // ── 죽음 (생명표 + 건강 보정) §5.1.1
  const q = mortality(life.age, life.health);
  let died = false;
  if (chance(r, q)) {
    died = true;
    life.alive = false;
    life.deathAge = life.age;
    const last = life.homeHistory[life.homeHistory.length - 1];
    if (last && last.to === undefined) last.to = life.year;
  }

  const report: YearReport = {
    year: life.year,
    age: life.age,
    lines,
    delta: {
      learn: Math.round(life.learn - before.learn),
      health: Math.round(life.health - before.health),
      mind: Math.round(life.mind - before.mind),
      wealth: wealthScore(nw) - before.wealth,
    },
    income,
    spend,
    rentIncome,
    interest,
    netWorth: nw,
    died,
  };
  life.lastReport = report;
  feed(life, died ? "death" : "yearend", died ? `${life.age}살의 겨울, 이야기가 끝났습니다.` : `${life.year}년 12월 · 가족사진`, {
    photo: photo.length,
    sub: `${life.home.tenure === "nursing" ? "요양원" : `${districtName(life.home.district)} ${PROP_TYPES[life.home.type].name}`}에서 · ${photo.join(", ")}`,
    d: (() => { const L = life.log, a = L[L.length - 1], b = L[L.length - 2]; return b ? [Math.round((a.money ?? 0) - (b.money ?? a.money ?? 0)), Math.round((a.time ?? 0) - (b.time ?? a.time ?? 0)), Math.round(a.health - b.health), Math.round(a.gak - b.gak)] : [0, 0, 0, 0]; })(),
    nw,
    lines: [...lines.slice(storyCount), `올해 가계 ${income + rentIncome - spend - interest >= 0 ? "+" : ""}${fmtMoney(income + rentIncome - spend - interest)} · 현금 ${fmtMoney(life.cash)}`],
  });
  if (!died) {
    life.year++;
    life.age++;
    life.jobYears++;
    startYear(life, world);
  }
  return report;
}

function rentCheapOrJeonse(life: Life, wy: WorldYear) {
  const t = PROP_TYPES.villa;
  const price = marketPrice(district("eunpyeong").apt84 * t.priceRatio, "eunpyeong", t.beta, wy);
  const dep = Math.round(price * t.jeonseRatio);
  if (life.cash >= dep) {
    life.cash -= dep;
    moveInto(life, { tenure: "jeonse", district: "eunpyeong", type: "villa", deposit: dep, yearlyRent: 0, sinceYear: life.year, contractEnd: life.year + 2, condition: "normal", tags: rollTags(life, "villa", "normal") }, "부모님 집에서 가져온 밥솥 하나");
  } else rentCheap(life, wy, "eunpyeong");
}

export function changeJob(life: Life, jobId: string) {
  const last = life.jobHistory[life.jobHistory.length - 1];
  if (last && last.to === undefined) last.to = life.year;
  life.jobHistory.push({ jobId, from: life.year });
  const j = jobById(jobId);
  if (j.income > 0) life.income = Math.round(j.income * (1 + (life.learn - 50) / 300) * (1 + Math.min(15, life.age - 25) * 0.012));
  life.jobId = jobId;
  life.jobYears = 0;
  life.work = { title: j.name, hours: BASE_HOURS[jobId] ?? 9.5, stress: BASE_STRESS[jobId] ?? 1 };
}

/** Gompertz 생명표 — 서울 e0 ≈ 84 근처로 맞춘 [추론] 값 + 건강 보정 (대략 ×0.4 ~ ×2.7) */
export function mortality(age: number, health: number) {
  const a = 5.9e-6, b = 0.11;
  const base = a * Math.exp(b * age);
  return Math.min(1, base * Math.exp((60 - health) / 40) * (KOREA_PROFILE.e0 / 84));
}

export function familyPhoto(life: Life): string[] {
  const p: string[] = [life.name];
  if (life.family.married && life.family.spouseName) p.push(life.family.spouseName);
  for (const k of life.family.kids) {
    if (!k.independent || life.gak > 40) p.push(k.name);
    if (life.gak > 35) for (let i = 0; i < k.kids; i++) p.push(`${k.name}의 아이`);
  }
  if (life.family.parentsAlive > 0 && life.gak > 30) p.push(life.family.parentsAlive === 2 ? "부모님" : "어머니");
  if (life.family.pet) p.push("반려동물");
  if (!life.family.married && life.gak > 55) for (let i = 0; i < Math.min(3, Math.floor(life.family.friends / 3)); i++) p.push("친구");
  return p;
}

export function marry(life: Life) {
  life.family.married = true;
  const p = life.people.find((x) => x.role === "partner");
  const base = p?.wealth === "rich" ? [3600, 6000] : p?.wealth === "tight" ? [2200, 3600] : [2600, 4800];
  life.flags.spouseIncome = chance(life.rng, 0.75) ? Math.round(range(life.rng, base[0], base[1])) : 0;
  life.family.spouseName = p?.name ?? pick(life.rng, NAMES.filter((n) => n !== life.name));
  if (p) life.people = life.people.filter((x) => x !== p);
}

/** 고를 수 있나: 현금·조건·체력 (못 고르면 이유) */
export function optionLock(life: Life, o: EventOption): string {
  if (o.lock) return o.lock;
  if (o.cost && o.cost > life.cash) return `현금 ${fmtMoney(o.cost)} 필요 · 지금 ${fmtMoney(life.cash)}`;
  if (o.deal && dealUsed(life)) return DEAL_USED_MSG;
  return needLack(life, o.need);
}

export function haveKid(life: Life) {
  // 출산·산후조리 [추론] 500만, 맞벌이면 셋 중 하나는 경력이 끊긴다
  life.cash -= 500;
  if (life.flags.spouseIncome && !life.flags.careerGap && chance(life.rng, 0.35)) { life.flags.careerGap = 1; life.flags.spouseIncome = Math.round(life.flags.spouseIncome * 0.45); feed(life, "auto", `${life.family.spouseName}이(가) 아이를 키우며 일을 그만뒀습니다. 몇 년 뒤 시간제로 다시 일을 시작했습니다.`); }
  life.family.kids.push({ name: pick(life.rng, NAMES.filter((n) => n !== life.name && n !== life.family.spouseName)), born: life.year, married: false, kids: 0, independent: false });
}

export function adoptPet(life: Life) {
  life.family.pet = true;
  return pick(life.rng, PET);
}

export { rentCheap };
export type { Tenure };
