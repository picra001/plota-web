import "./style.css";
import { DISTRICTS, PROP_TYPES, START_YEAR, type PropType } from "./data/seoul";
import { jobById, FAMILY_BACKGROUNDS, START_QUESTIONS } from "./data/jobs";
import { exteriorId, homeSceneId, photoId } from "./data/assets";
import { commuteOf, householdSize, jeongOf, homeLabel, yeoyu, dayOf, dayEffects, affordMap, type Day } from "./engine/home";
import type { HomeOffer } from "./engine/types";
import { CHILD_STOPS } from "./data/seoul";
import { generateWorld, marketPrice, worldYear } from "./engine/market";
import {
  advanceSeason, buy, checkBuy, chooseEvent, createLife, districtName, fmtMoney, homeYears, job, legwork, listingPrice,
  netWorth, ownedCount, propValue, rentHome, rentQuote, sell, setMode, wealthScore, familyPhoto,
  SEASONS, seasonName, optionLock, stressNow, saleQuote, gapQuote, setLease, isMonthly, annualInterest, wyNow, dealUsed, monthlyBook, maxBudget, totalLoan, statsNow,
} from "./engine/life";
import { buildEvent } from "./engine/events";
import { roleKo } from "./engine/people";
import { buildEnding, type Ending } from "./engine/ending";
import { autoToEnd, autoYear } from "./engine/auto";
import { newSeed } from "./engine/rng";
import { fixJosa } from "./engine/josa";
import type { FeedItem, Focus, Life, World } from "./engine/types";

// ───────────────────────── 상태 ─────────────────────────
type Screen = "title" | "questions" | "intro" | "year" | "report" | "ending";
type Tab = "now" | "home" | "map" | "job" | "log";

const SAVE_KEY = "keys.home.save.v4";
const SETTINGS_KEY = "keys.settings.v1";
type Settings = { seasons: boolean; noNegative: boolean };
function settings(): Settings {
  try { return { seasons: true, noNegative: false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") }; } catch { return { seasons: true, noNegative: false }; }
}
function setSettings(s: Settings) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* noop */ } }
const LIVES_KEY = "keys.home.lives.v1";

interface App {
  screen: Screen;
  tab: Tab;
  answers: number[];
  qIndex: number;
  life: Life | null;
  world: World | null;
  worldSeed: number;
  mapDistrict: string;
  ending: Ending | null;
  others: { name: string; title: string; age: number; job: string }[];
  showDev: boolean;
  playing: boolean;
  feedShown: number;
  /** 방금 새로 쌓인 줄 수(애니메이션) */
  newCount: number;
  keepScroll: boolean;
  /** 배속 1·2·4 */
  speed: number;
  /** 맨 위: 집 그림 / 지도 (평소에 탭으로 뒤집기) */
  topMap: boolean;
  /** 고비에서 한 번 누른 선택지(미리보기) */
  preview: number | null;
  /** 이사 연출: 🏠가 옮겨 간다 */
  moveAnim: { from: string; to: string } | null;
  /** 고른 뒤 결과 카드 (보여 주는 동안 시간이 멈춘다) */
  result: { title: string; label: string; line: string; roll: number; p: number } | null;
}

const app: App = {
  screen: "title",
  tab: "now",
  answers: [],
  qIndex: 0,
  life: null,
  world: null,
  worldSeed: 0,
  mapDistrict: "mapo",
  ending: null,
  others: [],
  showDev: false,
  playing: true,
  speed: 1,
  feedShown: 40,
  newCount: 0,
  keepScroll: false,
  topMap: false,
  preview: null,
  moveAnim: null,
  result: null,
};

function save() {
  try {
    if (app.life) localStorage.setItem(SAVE_KEY, JSON.stringify({ life: app.life, worldSeed: app.worldSeed, screen: app.screen }));
  } catch { /* 저장 실패는 무시 */ }
}
function load(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s.life || s.life.version !== 7) return false;
    app.life = s.life;
    app.worldSeed = s.worldSeed;
    app.world = generateWorld(s.worldSeed, 110);
    app.screen = s.screen === "ending" ? "ending" : "year";
    if (app.screen === "ending") finishLife(false);
    return true;
  } catch { return false; }
}
function lives(): { title: string; year: number; age: number; at: number }[] {
  try { return JSON.parse(localStorage.getItem(LIVES_KEY) ?? "[]"); } catch { return []; }
}
function pushLife(e: Ending, life: Life) {
  try {
    const l = lives();
    l.unshift({ title: e.title, year: life.year, age: e.deathAge, at: Date.now() });
    localStorage.setItem(LIVES_KEY, JSON.stringify(l.slice(0, 100)));
  } catch { /* noop */ }
}

// ───────────────────────── 공통 조각 ─────────────────────────
const esc = (s: string) => fixJosa(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function ph(id: string, ratio = "r16x10", extra = "") {
  return `<div class="ph ${ratio} ${extra}" data-asset="${id}"><img src="${import.meta.env.BASE_URL}assets/${id}.png" alt="" onload="this.parentElement.classList.add('loaded')" onerror="this.remove()"><span class="ph-label">${id}</span></div>`;
}

const ICON: Record<Tab, string> = {
  now: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>`,
  job: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18"/></svg>`,
  log: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z"/></svg>`,
};
const TAB_NAME: Record<Tab, string> = { now: "인생", map: "부동산", home: "내 집", job: "직업", log: "기록" };

const FOCUS: { id: Focus; label: string; hint: string }[] = [
  { id: "work", label: "일", hint: "배움·소득 ↑ · 건강·곁 −" },
  { id: "people", label: "사람", hint: "곁·마음 ↑" },
  { id: "rest", label: "쉼", hint: "건강·마음 ↑ · 지출 +" },
  { id: "home", label: "집", hint: "올해 발품 4번" },
  { id: "save", label: "모으기", hint: "지출 −15% · 마음 −" },
];
const TENURE: Record<string, string> = { monthly: "월세", jeonse: "전세", own: "자가", parents: "부모님 집" };

function header(life: Life) {
  const wy = wyNow(app.world!, life);
  const nw = netWorth(life, wy);
  const d = life.lastReport?.delta;
  const L = life.log;
  const gd = L.length >= 2 ? Math.round(L[L.length - 1].gak - L[L.length - 2].gak) : 0;
  void nw;
  const dd = (v?: number) => (!v ? "" : v > 0 ? `<span class="up">▲${v}</span>` : `<span class="down">▼${-v}</span>`);
  return `${topBar(life)}${statsRow(life)}`;
}

function topBar(life: Life, overlay = false) {
  return `<div class="top ${overlay ? "over" : ""}">
    <div>${overlay ? "" : `<div class="brand">열쇠의 기록</div>`}<div class="when">${life.year}년${life.phase === "child" ? "" : ` ${seasonName(life)}`} · 서울 · ${life.age}세</div></div>
    <div class="chip job">${life.phase === "child" ? (life.age < 7 ? "아이" : life.age < 20 ? "학생" : "청년") : life.flags.firstJob ? esc(life.work?.title ?? job(life).name) : "취업 준비"}${life.studying ? " · 공부 중" : ""}</div>
  </div>`;
}

function statsRow(life: Life, base?: Life) {
  const S = statsNow(life, app.world!);
  const B = base ? statsNow(base, app.world!) : null;
  const last = life.log[life.log.length - 1];
  const D = dayOf(life);
  const freeH = D.myH + D.familyH;
  const dd = (now: number, prev?: number) => { if (prev === undefined) return ""; const v = Math.round(now - prev); return !v ? "" : v > 0 ? `<span class="up">▲${v}</span>` : `<span class="down">▼${-v}</span>`; };
  if (base && B) {
    // 미리보기: 지금과 비교
    const bD = dayOf(base); const bFree = bD.myH + bD.familyH;
    const bNw = netWorth(base, wyNow(app.world!, base)), nw = netWorth(life, wyNow(app.world!, life));
    const bb = monthlyBook(base, app.world!), pb = monthlyBook(life, app.world!);
    const mDiff = pb.net - bb.net;
    const tDiff = Math.round((freeHOf(life) - bFree) * 60);
    const hm2 = (h: number) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 6) * 10; return mm === 60 ? `${hh + 1}h` : mm ? `${hh}h${mm}` : `${hh}h`; };
    const c = (k: string, v: string, d: string) => `<div class="stat pv"><div class="k">${k}</div><div class="v sm">${v}</div><div class="d">${d}</div></div>`;
    const arrow = (v: number, unit: string, fmt = (x: number) => String(x)) => (!v ? `<span class="flat">그대로</span>` : `<span class="${v > 0 ? "up" : "down"}">${v > 0 ? "▲" : "▼"}${fmt(Math.abs(v))}${unit}</span>`);
    void nw; void bNw;
    return `<div class="stats preview">
      ${c("자산", `한 달 ${pb.net >= 0 ? "+" : ""}${fmtMoney(pb.net)}`, arrow(mDiff, "", fmtMoney))}
      ${c("여유 시간", `하루 ${hm2(freeHOf(life))}`, arrow(tDiff, "분"))}
      ${c("체력", `${dayEffects(life).health >= 0 ? "+" : ""}${dayEffects(life).health}/년`, arrow(Math.round((dayEffects(life).health - dayEffects(base).health) * 10) / 10, ""))}
      ${c("관계", `${dayEffects(life).rel >= 0 ? "+" : ""}${dayEffects(life).rel}/년`, arrow(Math.round((dayEffects(life).rel - dayEffects(base).rel) * 10) / 10, ""))}
    </div>`;
  }
  const hm = (h: number) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 6) * 10; return mm === 60 ? `${hh + 1}h` : mm ? `${hh}h${mm}` : `${hh}h`; };
  // 자산
  let assetV = "", assetD = "";
  if (life.phase === "adult") {
    const nw = netWorth(life, wyNow(app.world!, life));
    const b = monthlyBook(life, app.world!);
    assetV = fmtMoney(nw);
    assetD = S.money < 30 ? `<span class="down">빠듯함</span>` : `<span class="${b.net >= 0 ? "up" : "down"}">한 달 ${b.net >= 0 ? "+" : ""}${fmtMoney(b.net)}</span>`;
  } else { assetV = life.background.replace(" 집", ""); assetD = `<span class="flat">부모님 형편</span>`; }
  const tPrev = last?.freeH;
  const tDiff = tPrev === undefined ? 0 : Math.round((freeH - tPrev) * 60);
  const timeD = S.time < 30 ? `<span class="down">모자람</span>` : tDiff ? `<span class="${tDiff > 0 ? "up" : "down"}">${tDiff > 0 ? "▲" : "▼"}${Math.abs(tDiff)}분</span>` : "";
  const cell = (k: string, v: string, d: string, low: boolean, small = false) => `<div class="stat ${low ? "low" : ""}"><div class="k">${k}</div><div class="v ${small ? "sm" : ""}">${v}</div><div class="d">${d}</div></div>`;
  return `<div class="stats">
    ${cell("자산", assetV, assetD, life.phase === "adult" && S.money < 30, true)}
    ${cell("여유 시간", `하루 ${hm(freeH)}`, timeD, S.time < 30, true)}
    ${cell("체력", String(S.body), S.body < 30 ? `<span class="down">지침</span>` : dd(S.body, last?.health), S.body < 30)}
    ${cell("관계", String(S.rel), S.rel < 30 ? `<span class="down">외로움</span>` : dd(S.rel, last?.gak), S.rel < 30)}
  </div>`;
}

const freeHOf = (l: Life) => { const d = dayOf(l); return d.myH + d.familyH; };

/** 고비에서 후보 집을 골랐다고 가정한 삶 (미리보기용 사본) */
function previewLife(life: Life, o: HomeOffer): Life {
  const c: Life = structuredClone(life);
  const wy = wyNow(app.world!, c);
  if (c.home.tenure === "jeonse" || c.home.tenure === "monthly") c.cash += c.home.deposit;
  if (c.home.tenure === "own" && c.home.propUid) {
    const p = c.props.find((x) => x.uid === c.home.propUid);
    if (p) { c.props = c.props.filter((x) => x !== p); c.cash += propValue(p, wy) - p.loan; }
  }
  if (o.tenure === "buy") {
    c.cash -= o.cashNeeded;
    c.props.push({ uid: "preview", district: o.district, type: o.type, basePrice: o.base, boughtYear: c.year, boughtPrice: o.price, loan: o.loan, condition: o.condition, mode: "live" });
    c.home = { tenure: "own", district: o.district, type: o.type, deposit: 0, yearlyRent: 0, propUid: "preview", sinceYear: c.year, condition: o.condition, tags: o.tags };
  } else {
    c.cash -= o.deposit;
    c.home = { tenure: o.tenure, district: o.district, type: o.type, deposit: o.deposit, yearlyRent: o.yearlyRent, sinceYear: c.year, contractEnd: c.year + 2, condition: o.condition, tags: o.tags };
  }
  return c;
}

/** 한 달 돈 막대 (수입 = 100%): 빨강 주거비·이자 / 회색 고정 생활비 / 녹색 소비 / 주황 저축 / 빗금 적자 */
function moneyBar(life: Life) {
  if (life.phase !== "adult") return "";
  const b = monthlyBook(life, app.world!);
  const inc = Math.max(1, b.salary + b.spouse + b.rent);
  const housing = b.housing + b.interest + b.principal;
  const save = b.net;
  const total = Math.max(inc, housing + b.fixed + b.consume);
  const seg = (v: number, c: string, label: string, cls = "") => (v > 0 ? `<i class="${cls}" style="flex:${v};background:${c}">${v / total >= 0.16 ? label : ""}</i>` : "");
  const pct = (v: number) => `${Math.round((v / inc) * 100)}%`;
  const loan = totalLoan(life);
  const dep = life.home.tenure === "jeonse" || life.home.tenure === "monthly" ? life.home.deposit : 0;
  return `<div class="gbar">
    <div class="gk">한 달 <b>${fmtMoney(inc)}</b></div>
    <div class="dbar">${seg(housing, C_RED, `주거 ${pct(housing)}`)}${seg(b.fixed, C_GRAY, `생활 ${pct(b.fixed)}`)}${seg(b.consume, C_GREEN, `소비 ${pct(b.consume)}`)}${save > 0 ? seg(save, C_ORANGE, `저축 ${pct(save)}`) : seg(-save, "", `적자`, "deficit")}</div>
    <div class="gsub">현금 ${fmtMoney(life.cash)}${dep ? ` · 보증금 ${fmtMoney(dep)}` : ""}${loan ? ` · <span class="down">대출 ${fmtMoney(loan)} · 이자 월 ${fmtMoney(b.interest)} + 원금 ${fmtMoney(b.principal)}</span>` : ""}</div>
  </div>`;
}
/** 하루 막대: 빨강 근무 / 노랑 이동 / 녹색 여유 / 회색 잠·집안일 */
function simpleDay(D: Day) {
  const sum = (ks: string[]) => D.segs.filter((s) => ks.includes(s.k)).reduce((a, s) => a + s.h, 0);
  return { work: sum(["work", "school", "academy"]), move: sum(["commute"]), free: sum(["mine", "family"]), base: sum(["sleep", "chores"]) };
}
function workLabel(D: Day) {
  const job = D.segs.find((x) => x.k === "work"), school = D.segs.some((x) => x.k === "school" || x.k === "academy");
  if (job && school) return `학교+${job.label}`;
  if (job && D.toLabel !== "직장" && D.toLabel) return job.label;
  return school ? "학교" : "근무";
}
function timeBar(D: Day, thin = false) {
  const s = simpleDay(D);
  const seg = (v: number, c: string, label: string) => (v > 0.05 ? `<i style="flex:${v};background:${c}">${!thin && v >= 2.2 ? label : ""}</i>` : "");
  const h = (v: number) => (Math.round(v * 10) / 10).toString().replace(/\.0$/, "");
  return `<div class="dbar ${thin ? "thin" : ""}">${seg(s.base, C_GRAY, `잠·집안일 ${h(s.base)}h`)}${seg(s.work, C_RED, `${workLabel(D)} ${h(s.work)}h`)}${seg(s.move, C_YELLOW, `이동 ${h(s.move)}h`)}${seg(s.free, C_GREEN, `여유 ${h(s.free)}h`)}</div>`;
}
function dayBlock(life: Life) {
  const D = dayOf(life);
  return `<div class="gbar"><div class="gk">하루 <b>24h</b></div>${timeBar(D)}</div>`;
}
const C_RED = "#d9625f", C_YELLOW = "#e6c34f", C_GREEN = "#6fbf7f", C_ORANGE = "#e8954a", C_GRAY = "#4a4a50";

function nav() {
  const child = app.life?.phase === "child";
  return `<div class="nav" style="grid-template-columns:repeat(${child ? 2 : 5},1fr)">${(Object.keys(TAB_NAME) as Tab[]).filter((t) => !child || t === "now" || t === "log")
    .map((t) => `<button data-a="tab" data-v="${t}" class="${app.tab === t ? "on" : ""}">${ICON[t]}${TAB_NAME[t]}</button>`)
    .join("")}</div><div class="foot">프로토타입 · 수치는 [추론] 임시값 · 미래는 가상</div>`;
}

// ───────────────────────── 화면 ─────────────────────────
function viewTitle() {
  const has = !!localStorage.getItem(SAVE_KEY);
  const rec = lives().slice(0, 3);
  return `<div class="phone">
    <div class="brand">열쇠의 기록</div>
    <div class="when" style="font-size:24px;margin:6px 0 14px">어떤 집에서, 누구와, 몇 살까지</div>
    ${ph("ui_title", "r4x5")}
    <p class="p" style="margin-top:14px">태어날 집은 고를 수 없습니다. 2001년 서울의 어느 집에서 태어난 한 사람이 자라고, 집을 떠나고, 내 집을 찾고, 마지막 거처를 정하기까지.</p>
    <button class="cta" data-a="start">태어나기</button>
    ${has ? `<button class="ghost" style="width:100%;margin-top:10px" data-a="continue">이어서 살기</button>` : ""}
    ${rec.length ? `<div class="label">내 인생들</div>${rec.map((r) => `<div class="small">· ${esc(r.title)} <span style="color:var(--dim)">(${r.age}세)</span></div>`).join("")}` : ""}
    <div class="foot" style="margin-top:auto">이 프로토타입은 서울 한 곳만 담고 있습니다. 미래는 플레이마다 달라지는 가상의 미래입니다.</div>
  </div>`;
}

function viewQuestions() {
  const q = START_QUESTIONS[app.qIndex];
  return `<div class="phone q">
    <div class="brand">태어나기 · ${app.qIndex + 1} / ${START_QUESTIONS.length}</div>
    <div class="when" style="margin:8px 0 14px">${esc(q.text)}</div>
    ${ph(`ui_q_${q.id}`, "r16x10")}
    ${q.options.map((o, i) => `<button class="opt" data-a="answer" data-v="${i}"><div><b>${esc(o.label)}</b></div><div class="ck"></div></button>`).join("")}
  </div>`;
}

function viewIntro(life: Life) {
  const j = job(life);
  return `<div class="phone">
    <div class="brand">2026년, 서울</div>
    <div class="when" style="margin:6px 0 12px">${esc(life.name)}의 첫 출근</div>
    ${ph("ui_city_seoul", "r16x10")}
    <div class="label">당신이 자란 집</div>
    <p class="p"><b>${esc(life.background)}</b> — ${esc(life.parentsStory)}</p>
    <div class="label">첫 직업</div>
    <div class="card listing">${ph(`job_${j.id}`, "r1x1")}<div><div class="t">${esc(j.name)}</div><div class="small">${esc(j.card)} · 첫해 연 소득 약 ${fmtMoney(life.income)}</div><div class="small">서울 25세의 첫 직업 분포에서 정해졌습니다. 일은 살면서 바뀔 수 있습니다.</div></div></div>
    <div class="label">처음 사는 집</div>
    <p class="p">${esc(districtName(life.home.district))} ${esc(PROP_TYPES[life.home.type].name)} · ${TENURE[life.home.tenure]}${life.home.deposit ? ` (보증금 ${fmtMoney(life.home.deposit)})` : ""}</p>
    <p class="small" style="margin-top:12px">한 해는 봄·여름·가을·겨울 네 번 멈춥니다. 계절마다 집을 사고팔 수 있고, 이야기는 찾아올 때도 있고 아닐 때도 있습니다.</p>
    <p class="small" style="margin-top:6px">2026년 현재의 대출·세금 제도에서 출발합니다. 그 뒤의 미래는 아무도 모르지만, 한국다운 방식으로 흘러갑니다.</p>
    <button class="cta" data-a="begin">스물다섯, 시작하기</button>
  </div>`;
}

// ───────────────────────── 그래프 ─────────────────────────
interface Series { name: string; color: string; values: number[]; dash?: boolean; bold?: boolean }
function lineChart(series: Series[], labels: string[], opts: { unit?: (v: number) => string; h?: number; zero?: boolean } = {}) {
  const W = 380, H = opts.h ?? 150, L = 40, R = 8, T = 10, B = 20;
  const all = series.flatMap((s) => s.values);
  if (!all.length || labels.length < 2) return `<div class="small">아직 그릴 만큼 시간이 지나지 않았습니다.</div>`;
  let min = Math.min(...all), max = Math.max(...all);
  if (opts.zero) min = Math.min(0, min);
  if (max - min < 1e-9) { max += 1; min -= 1; }
  const pad = (max - min) * 0.08; min -= pad; max += pad;
  const x = (i: number) => L + (i / (labels.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const fmt = opts.unit ?? ((v: number) => v.toFixed(0));
  const ticks = [max - pad, (max + min) / 2, min + pad];
  const grid = ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#2b2b2e"/><text x="${L - 4}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="#6d6d73">${fmt(v)}</text>`).join("");
  const step = Math.max(1, Math.ceil(labels.length / 6));
  const xl = labels.map((s, i) => (i % step === 0 || i === labels.length - 1 ? `<text x="${x(i)}" y="${H - 5}" text-anchor="middle" font-size="9" fill="#6d6d73">${s}</text>` : "")).join("");
  const lines = series.map((s) => `<polyline fill="none" stroke="${s.color}" stroke-width="${s.bold ? 2.4 : 1.4}" ${s.dash ? 'stroke-dasharray="4 3"' : ""} points="${s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}"/>`).join("");
  const dots = series.filter((s) => s.bold).map((s) => `<circle cx="${x(s.values.length - 1)}" cy="${y(s.values[s.values.length - 1])}" r="3" fill="${s.color}"/>`).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${grid}${xl}${lines}${dots}</svg>
    <div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div>`;
}
function sparkline(values: number[], color: string) {
  if (values.length < 2) return "";
  const W = 90, H = 26, min = Math.min(...values), max = Math.max(...values) || 1, d = max - min || 1;
  return `<svg class="spark" viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="${color}" stroke-width="1.6" points="${values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 2 - ((v - min) / d) * (H - 4)).toFixed(1)}`).join(" ")}"/></svg>`;
}
const DCOLORS: Record<string, string> = { gangnam: "#f5d77a", mapo: "#7fb2ff", seongsu: "#f08ad0", eunpyeong: "#8fd19e", nowon: "#ffa86b", gwanak: "#b49cff" };
/** 2026년부터 지금(이번 계절)까지 해마다 한 점 */
function timePoints(life: Life) {
  const pts: { label: string; wy: ReturnType<typeof worldYear> }[] = [];
  for (let y = START_YEAR; y < life.year; y++) pts.push({ label: String(y).slice(2), wy: worldYear(app.world!, y, 1) });
  pts.push({ label: `${String(life.year).slice(2)}${life.perYear === 4 ? SEASONS[life.season][0] : ""}`, wy: wyNow(app.world!, life) });
  return pts;
}
const apt84Price = (d: (typeof DISTRICTS)[number], wy: ReturnType<typeof worldYear>) => marketPrice(d.apt84, d.id, 1, wy);

const SEG_COLOR: Record<string, string> = { sleep: "#3d4f86", commute: "#e07a7a", work: "#5f5f66", school: "#5f5f66", academy: "#9a84e6", chores: "#b8925a", family: "#e8c766", mine: "#7cc68f" };
const fmtH = (h: number) => { const hh = Math.floor(h + 1e-6), mm = Math.round((h - hh) * 60); return mm === 60 ? `${hh + 1}h` : mm ? `${hh}h${String(mm).padStart(2, "0")}` : `${hh}h`; };
function dayBar(D: Day, thin = false) {
  return `<div class="dbar ${thin ? "thin" : ""}">${D.segs.filter((s) => s.h > 0.05).map((s) => `<i style="flex:${s.h};background:${SEG_COLOR[s.k]}" title="${s.label} ${fmtH(s.h)}">${!thin && s.h >= 1.6 ? s.label : ""}</i>`).join("")}</div>`;
}
const fxChip = (k: string, v: number) => (Math.abs(v) < 0.15 ? `<span class="fx flat">${k} –</span>` : `<span class="fx ${v > 0 ? "up" : "down"}">${k} ${v > 0 ? "▲" : "▼"}${Math.abs(v).toFixed(1)}</span>`);

/** 서울을 박스로 추상화한 지도: 동네 점, 집·일터·부모님·친구·정든 동네, 이사 후보 */
function cityMap(life: Life, offers: { letter: string; o: HomeOffer }[] = [], hi?: string, move?: { from: string; to: string }) {
  const W = 380, H = 200;
  const P = (d: string) => { const p = DISTRICTS.find((x) => x.id === d)!.pos; return { x: 40 + (p[0] / 9) * 300, y: 26 + ((11 - p[1]) / 11) * 150 }; };
  const adult = life.phase === "adult";
  const aff = adult ? affordMap(life, app.world!) : {};
  const FILL: Record<string, [string, string]> = { buy: ["#22382a", "#8fd19e"], jeonse: ["#3a3322", "#f5d77a"], monthly: ["#26262a", "#77777d"], no: ["#18181b", "#3a3a3e"] };
  const home = life.home.district;
  const work = adult && life.workDistrict && !["retired", "jobless", "landlord"].includes(life.jobId) ? life.workDistrict : null;
  const fav = Object.entries(life.jeong).filter(([d]) => d !== home).sort((a, b) => b[1] - a[1])[0]?.[0];
  const parents = life.family.parentsAlive > 0 && life.home.tenure !== "parents" ? life.parentsHome.district : null;
  const friends = (life.people ?? []).filter((p) => p.role !== "parent").reduce<Record<string, number>>((a, p) => { a[p.district] = (a[p.district] ?? 0) + 1; return a; }, {});
  // 한강
  const ry = (P("gangnam").y + P("mapo").y) / 2;
  const river = `<path d="M 4 ${ry + 4} C 90 ${ry - 14}, 170 ${ry + 16}, 250 ${ry - 4} S 360 ${ry + 6}, 378 ${ry - 8}" stroke="#23466e" stroke-width="7" fill="none" opacity=".55"/><text x="12" y="${ry - 10}" fill="#3d6a99" font-size="9">한강</text>`;
  const lines: string[] = [];
  if (work) {
    const a = P(home), b = P(work);
    if (home !== work) lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#e07a7a" stroke-width="2.5"/><text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 6}" fill="#f2b0b0" font-size="11" text-anchor="middle" font-weight="700">${commuteOf(life)}분</text>`);
  }
  for (const { letter, o } of offers) {
    if (work && o.district !== work) { const a = P(o.district), b = P(work); lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#9fb2e8" stroke-width="1.4" stroke-dasharray="4 3"/>`); }
    void letter;
  }
  const nodes = DISTRICTS.map((d) => {
    const p = P(d.id);
    const [fill, stroke] = adult ? FILL[aff[d.id] ?? "no"] : ["#1e1e22", "#3a3a3e"];
    const isHome = d.id === home;
    return `<g><circle cx="${p.x}" cy="${p.y}" r="${isHome ? 18 : 16}" fill="${fill}" stroke="${isHome ? "#fff" : stroke}" stroke-width="${isHome ? 2.5 : 1.5}"/>
      <text x="${p.x}" y="${p.y}" fill="${isHome ? "#fff" : "#c8c8cc"}" font-size="10.5" text-anchor="middle" dominant-baseline="central" font-weight="${isHome ? 700 : 500}">${d.name}</text></g>`;
  }).join("");
  const mark = (d: string, dx: number, dy: number, s: string, size = 13) => { const p = P(d); return `<text x="${p.x + dx}" y="${p.y + dy}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${s}</text>`; };
  const marks: string[] = [];
  if (move) {
    const a = P(move.from), b = P(move.to);
    marks.push(`<g><text x="${a.x - 20}" y="${a.y - 16}" font-size="18" text-anchor="middle" dominant-baseline="central">🏠<animate attributeName="x" from="${a.x - 20}" to="${b.x - 20}" dur="1.1s" fill="freeze"/><animate attributeName="y" from="${a.y - 16}" to="${b.y - 16}" dur="1.1s" fill="freeze"/></text></g>`);
    marks.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 4" opacity=".6"/>`);
  } else marks.push(mark(home, -20, -16, "🏠", 14));
  if (work) marks.push(mark(work, 20, -16, life.jobId === "self" ? "🏪" : "💼"));
  if (!adult && life.age >= 7) marks.push(mark(home, 20, -16, "🏫", 12));
  if (parents) marks.push(mark(parents, -20, 16, "👪", 11));
  for (const [d, n] of Object.entries(friends)) marks.push(mark(d, 20, 16, n > 1 ? "👥" : "👤", 11));
  if (fav) marks.push(mark(fav, 0, -22, "❤️", 10));
  const used: Record<string, number> = {};
  for (const { letter, o } of offers) { const p = P(o.district); const k = used[o.district] = (used[o.district] ?? 0) + 1; const x = p.x + 24 + (k - 1) * 16, y = p.y; const on = hi === letter; marks.push(`<g><circle cx="${x}" cy="${y}" r="${on ? 11 : 8.5}" fill="${on ? "#fff" : "#9fb2e8"}" stroke="#111" stroke-width="1"/><text x="${x}" y="${y}" fill="#111" font-size="10.5" font-weight="800" text-anchor="middle" dominant-baseline="central">${letter}</text></g>`); }
  const legend = `<div class="mlegend"><span>🏠 집</span>${work ? `<span>${life.jobId === "self" ? "🏪 가게" : "💼 일터"}</span>` : ""}${parents ? "<span>👪 부모님</span>" : ""}${Object.keys(friends).length ? "<span>👤 곁의 사람</span>" : ""}${fav ? "<span>❤️ 정든 동네</span>" : ""}${adult ? `<span class="sw"><i style="background:#8fd19e"></i>살 수 있음</span><span class="sw"><i style="background:#f5d77a"></i>전세</span><span class="sw"><i style="background:#77777d"></i>월세</span>` : ""}</div>`;
  return `<svg class="cmap" viewBox="0 0 ${W} ${H}"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="#111114" stroke="#26262a"/>${river}${lines.join("")}${nodes}${marks.join("")}</svg>${legend}`;
}

function dayPanel(life: Life, offers: { letter: string; o: HomeOffer }[] = []) {
  const D = dayOf(life);
  const E = dayEffects(life, D);
  const merged = new Map<string, { k: string; h: number }>();
  for (const s of D.segs) { const key = s.k === "commute" ? (life.phase === "child" ? "통학" : "출퇴근") : s.label; const m = merged.get(key) ?? { k: s.k, h: 0 }; m.h += s.h; merged.set(key, m); }
  const legend = [...merged.entries()].filter(([, v]) => v.h > 0.05).map(([k, v]) => `<span><i style="background:${SEG_COLOR[v.k]}"></i>${k} ${fmtH(v.h)}</span>`).join("");
  const dots = Math.round(D.sleepQ * 5);
  const tags = (life.home.tags ?? []).map((x) => `<span class="hc tag ${["남향", "공원 앞", "역세권"].includes(x) ? "good" : ["층간소음", "곰팡이", "반지하", "북향"].includes(x) ? "bad" : ""}">#${esc(x)}</span>`).join("");
  return `<div class="day">
    ${cityMap(life, offers)}
    <div class="hchips">${tags}<span class="hc">익숙함 ${jeongOf(life)}년</span></div>
  </div>`;
}

function yeoyuPanel(life: Life) {
  const Y = yeoyu(life);
  const bar = (k: string, v: number, why: string) => `<div class="yb"><div class="yk">${k}</div><div class="ybar"><i style="width:${v}%;background:${v >= 60 ? "var(--good)" : v >= 35 ? "var(--accent)" : "var(--bad)"}"></i></div><div class="yw">${esc(why)}</div></div>`;
  const people = householdSize(life);
  const rooms = life.home.tenure === "nursing" ? 1 : PROP_TYPES[life.home.type].rooms;
  const t = life.home.tags ?? [];
  const quietWhy = t.includes("층간소음") ? "윗집 발소리" : t.includes("큰길가") ? "창밖은 대로" : t.includes("공원 앞") ? "창밖은 공원" : t.includes("반지하") ? "창 높이로 지나는 발" : ["gangnam", "seongsu", "mapo"].includes(life.home.district) ? "도심의 소음" : "대체로 조용함";
  const timeWhy = Y.back ? `귀가 ${Y.back} · 하루 ${Y.free}시간` : life.phase === "child" ? "놀 시간" : `하루 ${Y.free}시간`;
  const moneyWhy = life.phase === "child" ? life.background : life.home.tenure === "parents" ? "부모님 집 · 주거비 0" : `주거비 월급의 ${Y.housingPct}%`;
  return `<div class="yeoyu">
    <div class="yhead"><b>여유 ${Y.total}</b><span>이 집이 주는 숨 쉴 틈 · 마음이 회복되는 속도</span></div>
    ${bar("시간", Y.time, timeWhy)}${bar("공간", Y.space, `방 ${rooms} · ${people}명`)}${bar("조용함", Y.quiet, quietWhy)}${bar("돈", Y.money, moneyWhy)}
    <div class="hchips">${t.map((x) => `<span class="hc tag ${["남향", "공원 앞", "역세권"].includes(x) ? "good" : ["층간소음", "곰팡이", "반지하", "북향"].includes(x) ? "bad" : ""}">#${esc(x)}</span>`).join("")}<span class="hc">동네 익숙함 ${jeongOf(life)}년</span></div>
  </div>`;
}

function homeChips(life: Life) {
  const h = life.home;
  const c = commuteOf(life);
  const people = householdSize(life);
  const rooms = h.tenure === "nursing" ? 1 : PROP_TYPES[h.type].rooms;
  const crowd = people > rooms + 1 ? "bad" : rooms >= people ? "good" : "";
  const chip = (k: string, v: string, cls = "") => `<span class="hc ${cls}"><b>${k}</b>${v}</span>`;
  return `<div class="hchips">
    ${c ? chip("출퇴근", `${c}분`, c >= 60 ? "bad" : c <= 25 ? "good" : "") : ""}
    ${chip("방", `${rooms} · ${people}명`, crowd)}
    ${chip("상태", h.condition === "good" ? "좋음" : h.condition === "bad" ? "낡음" : "보통", h.condition === "good" ? "good" : h.condition === "bad" ? "bad" : "")}
    ${chip("정", `${jeongOf(life)}년`, jeongOf(life) >= 8 ? "good" : "")}
    ${(h.tags ?? []).map((t) => `<span class="hc tag ${["남향", "공원 앞", "역세권"].includes(t) ? "good" : ["층간소음", "곰팡이", "반지하", "북향"].includes(t) ? "bad" : ""}">#${esc(t)}</span>`).join("")}
  </div>`;
}
/** 스탯 힌트(곁 ↑ 같은)는 빼고 구체적인 것만 남긴다 */
const STAT_WORDS = "곁|마음|건강|배움|지식|관계|여유|정|보금자리|친구|손|모험|이웃";
function concreteHint(h: string) {
  return h.split(" · ").map((p) => p.trim()).filter((p) =>
    p &&
    !new RegExp(`(${STAT_WORDS})\\s*(↑|↓|−|-|\\+)`).test(p) &&            // "곁 ↑", "건강 −"
    !new RegExp(`^(${STAT_WORDS})(\\s*조금)?$`).test(p) &&                // "배움", "곁 조금"
    !/^(변화 없음|미룬다)$/.test(p)).join(" · ");
}
function offerChips(o: import("./engine/types").HomeOffer) {
  const money = o.tenure === "buy" ? `매매 ${fmtMoney(o.price)}` : o.tenure === "jeonse" ? `전세 ${fmtMoney(o.deposit)}` : `월세 월 ${fmtMoney(Math.round(o.yearlyRent / 12))}`;
  return [`<b>${esc(districtName(o.district))} ${esc(PROP_TYPES[o.type].name)}</b>`, money, o.commute ? `🚇${o.commute}분` : "", `방${o.rooms}`, ...o.tags.map((t) => `#${esc(t)}`)].filter(Boolean).map((x) => `<span>${x}</span>`).join("");
}

function wallet(life: Life) {
  const b = monthlyBook(life, app.world!);
  const bud = maxBudget(life, app.world!);
  const loan = totalLoan(life);
  const deposit = life.home.tenure === "jeonse" || life.home.tenure === "monthly" ? life.home.deposit : 0;
  const inc = b.salary + b.spouse + b.rent;
  const out = b.living + b.housing + b.interest;
  return `<div class="wallet">
    <div class="wrow"><div><div class="wk">현금</div><div class="wv ${life.cash < 0 ? "down" : ""}">${fmtMoney(life.cash)}</div></div>
      <div><div class="wk">한 달 들어옴</div><div class="wv">${fmtMoney(inc)}</div></div>
      <div><div class="wk">한 달 나감</div><div class="wv">${fmtMoney(out)}</div></div>
      <div><div class="wk">한 달 남음</div><div class="wv ${b.net >= 0 ? "up" : "down"}">${b.net >= 0 ? "+" : ""}${fmtMoney(b.net)}</div></div></div>
    <div class="wsub">월급 ${fmtMoney(b.salary)}${b.spouse ? ` · 배우자 ${fmtMoney(b.spouse)}` : ""}${b.rent ? ` · <span class="up">월세 ${fmtMoney(b.rent)}</span>` : ""} / 생활비 ${fmtMoney(b.living)}${b.housing ? ` · 주거비 ${fmtMoney(b.housing)}` : ""}${b.interest ? ` · 이자 ${fmtMoney(b.interest)}` : ""}</div>
    <div class="wsub">${deposit ? `보증금 ${fmtMoney(deposit)} · ` : ""}${loan ? `대출 ${fmtMoney(loan)} · ` : ""}지금 살 수 있는 집 <b>최대 ${fmtMoney(bud.price)}</b> <span style="color:var(--dim)">(대출 ${fmtMoney(bud.loan)}, ${bud.limitBy}에 막힘)</span></div>
  </div>`;
}

function feedItem(f: FeedItem, isNew: boolean) {
  const when = `<span class="fw">${f.y < START_YEAR ? `${f.y} · ${f.age}살` : `${f.y} ${f.k === "yearend" || f.k === "death" ? "12월" : SEASONS[f.s] ?? ""}`}</span>`;
  const cls = `fi k-${f.k}${isNew ? " new" : ""}`;
  if (f.k === "yearend" || f.k === "death") {
    const dv = (k: string, v = 0) => (v ? `<span class="${v > 0 ? "up" : "down"}">${k}${v > 0 ? "+" : ""}${v}</span>` : "");
    return `<div class="${cls}"><div class="yc">${ph(photoId(f.photo ?? 1), "r4x3")}<div>
      <div class="ft">${esc(f.t)}</div><div class="small">${esc(f.sub ?? "")}</div>
      <div class="dl">${dv("돈", f.d?.[0])}${dv("시간", f.d?.[1])}${dv("체력", f.d?.[2])}${dv("관계", f.d?.[3])}</div>
      ${(f.lines ?? []).map((l) => `<div class="small">· ${esc(l)}</div>`).join("")}
    </div></div></div>`;
  }
  if (f.k === "routine" || f.k === "hunt" || f.k === "peer" || f.k === "stat" || f.k === "auto") {
    return `<div class="${cls}">${when}<span class="ftx">${esc(f.t)}</span></div>`;
  }
  if (f.k === "money" || f.k === "rent") {
    return `<div class="${cls}">${when}<span class="ftx">${esc(f.t)}${f.sub ? `<span class="fsub">${esc(f.sub)}</span>` : ""}</span></div>`;
  }
  if (f.k === "event") {
    return `<div class="${cls}">${when}<div class="ev2">${ph(f.img ?? "", "r1x1")}<div><div class="ft">${esc(f.t)}</div><div class="small">${esc(f.sub ?? "")}</div></div></div></div>`;
  }
  return `<div class="${cls}">${when}<span class="ftx">${esc(f.t)}</span></div>`;
}

const PLACE_EVENTS = new Set(["contract_end", "landlord_sells", "first_home", "commute_long", "room_short", "kid_school", "parents_near", "empty_nest", "stairs", "force_move", "inherit", "eldercare"]);

function viewNow(life: Life) {
  const ev = life.pendingEventId && life.eventChoice === null ? buildEvent(life.pendingEventId, life, app.world!) : null;
  const LET = "ABCDE";
  const offerList: { letter: string; o: HomeOffer }[] = [];
  if (ev) ev.options.forEach((o) => { if (o.offer) offerList.push({ letter: LET[offerList.length], o: o.offer }); });
  const isPlace = !!ev && (offerList.length > 0 || PLACE_EVENTS.has(ev.id));
  const sel = ev && app.preview !== null ? ev.options[app.preview] : null;
  const selLetter = sel?.offer ? offerList.find((x) => x.o === sel.offer)?.letter : undefined;
  const pv = sel?.offer ? previewLife(life, sel.offer) : null;
  const y = homeYears(life);
  const last = life.season === life.perYear - 1;
  const ci = CHILD_STOPS.indexOf(life.age);
  const nextLabel = !life.alive ? "" : life.phase === "child" ? (CHILD_STOPS[ci + 1] !== undefined ? `${CHILD_STOPS[ci + 1]}살로` : "스물다섯, 2026년으로") : last ? `${life.year}년을 보내기` : fixJosa(`${SEASONS[life.season + 1]}(으)로`);
  const tags = (life.home.tags ?? []).map((x) => `#${esc(x)}`).join(" ");
  const caption = `${esc(homeLabel(life))} · ${TENURE[life.home.tenure]} ${y ? `${y + 1}년째` : "첫해"}${tags ? ` · ${tags}` : ""} · 익숙함 ${jeongOf(life)}년`;

  // ── 맨 위: 집 그림 / 지도 / 고비 장면
  let top: string;
  const mapLegend = (life2: Life) => `<div class="mapleg">🏠 집${life2.workDistrict && life2.phase === "adult" ? ` · ${life2.jobId === "self" ? "🏪 가게" : "💼 일터"}` : ""} · 👤 친구 · ❤️ 정든 동네${life2.phase === "adult" ? ` · <i style="background:#8fd19e"></i>살 수 있음 <i style="background:#f5d77a"></i>전세 <i style="background:#77777d"></i>월세` : ""}</div>`;
  if (app.moveAnim) {
    top = `<div class="topbox map">${cityMap(life, [], undefined, app.moveAnim)}${topBar(life, true)}<div class="cap">${app.moveAnim.from === app.moveAnim.to ? `${esc(districtName(app.moveAnim.to))} 안에서 이사` : `${esc(districtName(app.moveAnim.from))} → ${esc(districtName(app.moveAnim.to))} 이사`}</div></div>`;
  } else if (ev && isPlace) {
    top = `<div class="topbox map">${cityMap(life, offerList, selLetter)}${topBar(life, true)}${mapLegend(life)}</div>`;
  } else if (ev) {
    top = `<div class="topbox">${ph(ev.sceneId, "r16x10")}${topBar(life, true)}<div class="cap">${esc(ev.title)}</div></div>`;
  } else if (app.topMap) {
    top = `<div class="topbox map flip" data-a="flip">${cityMap(life)}${topBar(life, true)}${mapLegend(life)}<div class="fliphint">탭: 집으로</div></div>`;
  } else {
    top = `<div class="topbox flip" data-a="flip">${ph(homeSceneId(life.home.type, life.home.district, life.home.tenure), "r16x10")}${topBar(life, true)}<div class="cap">${caption}</div>${life.perYear === 4 && life.phase === "adult" ? `<div class="badge">${ph(`season_${["spring", "summer", "autumn", "winter"][life.season]}`, "r1x1")}</div>` : ""}<div class="fliphint">탭: 지도</div></div>`;
  }

  // ── 가운데: 스탯과 막대 (고른 후보가 있으면 그 모습을 미리)
  const mid = pv
    ? `${statsRow(pv, life)}<div class="gbars pvbars"><div class="pvlabel">${selLetter}로 가면</div>${moneyBar(pv)}${dayBlock(pv)}</div>`
    : `${statsRow(life)}<div class="gbars">${moneyBar(life)}${dayBlock(life)}</div>`;

  // ── 아래: 평소엔 로그, 고비엔 선택지
  let low: string;
  if (app.result && !ev) {
    const r = app.result;
    low = `<div class="result ${r.roll > 0 ? "win" : r.roll < 0 ? "lose" : ""}" data-a="dismiss">
      ${r.roll ? `<div class="roll">🎲 ${r.roll > 0 ? "운이 따랐습니다" : "운이 따르지 않았습니다"} <small>성공 확률 약 ${r.p}%</small></div>` : ""}
      <div class="rq">${esc(fixJosa(r.title))}</div>
      <div class="rl">▸ ${esc(fixJosa(r.label))}</div>
      <div class="rt">${esc(fixJosa(r.line))}</div>
      <div class="rc">눌러서 계속 ›</div>
    </div>`;
  } else if (ev) {
    low = `<div class="choice">
      <div class="ct"><b>${esc(ev.title)}</b> ${esc(ev.body)}</div>
      ${ev.options.map((o, i) => {
        const why = optionLock(life, o);
        const off = !!why;
        const letter = o.offer ? offerList.find((x) => x.o === o.offer)!.letter : "";
        const on = app.preview === i;
        const sub = o.offer ? `<div class="ochips">${offerChips(o.offer)}</div>` : concreteHint(o.hint) ? `<span>${esc(concreteHint(o.hint))}</span>` : "";
        return `<button class="opt ${off ? "off" : ""} ${on ? "on" : ""}" data-a="choose" data-v="${i}" ${off ? "disabled" : ""}>${letter ? `<span class="olet">${letter}</span>` : ""}<div style="flex:1"><b>${o.luck ? "🎲 " : ""}${esc(o.label)}</b>${sub}${why ? `<span class="warn" style="display:block">🔒 ${esc(why)}</span>` : ""}</div><div class="ck"></div></button>`;
      }).join("")}
    </div>`;
  } else {
    const items = life.feed.slice(-14).reverse();
    low = `<div class="feed" id="feed">${items.map((f, i) => feedItem(f, i < app.newCount)).join("")}</div>`;
  }

  const speedBtns = [1, 2, 4].map((s) => `<button class="spd ${app.speed === s ? "on" : ""}" data-a="speed" data-v="${s}">${s}×</button>`).join("");
  // 시간은 늘 흐른다(일시정지 없음). 고비에서만 멈춘다
  app.playing = true;
  const flow = speedBtns;
  const controls = !life.alive
    ? `<button class="cta" data-a="toending">어떤 삶이었는지 보기</button>`
    : ev
      ? `<div class="controls">${flow}${life.phase === "adult" ? `<button class="estate" data-a="tab" data-v="map">🏠 부동산 보러가기${dealUsed(life) ? "" : " <small>이번 계절 1회</small>"}</button>` : `<div class="flowstate">하나를 고르면 바로 이어집니다</div>`}</div>`
      : `<div class="controls">${flow}<div class="flowstate"><span class="pulse"></span>흐르는 중</div><button class="ghost sm step" data-a="next" title="${esc(nextLabel)}">한 칸 ›</button></div>
         ${life.phase === "adult" ? `<div class="row" style="margin-top:8px"><button class="ghost sm" data-a="tab" data-v="map">매물 보기 · 이사 (${life.listings.length})</button><button class="ghost sm" data-a="tab" data-v="home">내 집 관리 · 팔기</button><span class="small" style="margin-left:auto">${dealUsed(life) ? "부동산 일 ✓" : "부동산 일 1회 남음"}</span></div>` : ""}`;

  return `${top}${mid}${low}${controls}`;
}

function dealBanner(life: Life) {
  const used = dealUsed(life);
  return `<div class="deal ${used ? "used" : ""}">${used ? `이번 ${seasonName(life)}의 부동산 일은 끝났습니다 · 다음 계절에 다시` : `이번 ${seasonName(life)}에 부동산 일 <b>한 번</b> — 사기·팔기·이사 중 하나`}</div>`;
}

function viewHome(life: Life) {
  const wy = wyNow(app.world!, life);
  const h = life.home;
  const dis = dealUsed(life) ? "disabled" : "";
  const qs = life.props.map((p) => ({ p, q: saleQuote(life, p, wy) }));
  const total = qs.reduce((a, x) => a + x.q.value, 0);
  const loans = qs.reduce((a, x) => a + x.q.loan, 0);
  const deps = qs.reduce((a, x) => a + x.q.dep, 0);
  const rentIn = life.props.filter(isMonthly).reduce((a, p) => a + propValue(p, wy) * PROP_TYPES[p.type].rentYield, 0);
  const interest = annualInterest(life, wy);
  const card = ({ p, q }: (typeof qs)[number]) => {
    const t = PROP_TYPES[p.type];
    const pct = Math.round((q.value / p.boughtPrice - 1) * 100);
    const mine = q.value - q.loan - q.dep;
    const status = p.mode === "live" ? "🏠 내가 사는 집" : p.lease === "jeonse" ? `전세 · ${esc(p.tenant ?? "")} · ${p.leaseEnd}년 만기` : p.mode === "rent" ? `월세 · ${esc(p.tenant ?? "")}` : "공실";
    const income = isMonthly(p) ? q.value * t.rentYield : 0;
    return `<div class="card prop ${p.mode === "live" ? "live" : ""}"><div class="listing">${ph(exteriorId(p.type, p.district), "r1x1")}<div style="flex:1">
      <div class="t">${esc(districtName(p.district))} ${esc(t.name)}</div>
      <div><span class="tag ${p.mode === "live" ? "good" : ""}">${status}</span></div>
      <div class="row">${sparkline([...Array.from({ length: life.year - p.boughtYear }, (_, i) => propValue(p, worldYear(app.world!, p.boughtYear + i, 1))), q.value], q.gain >= 0 ? "#8fd19e" : "#f08a8a")}<span class="small">${p.boughtYear}년 ${fmtMoney(p.boughtPrice)}</span></div>
      <div class="kv">
        <div>시세</div><div><b>${fmtMoney(q.value)}</b> <span class="${q.gain >= 0 ? "up" : "down"}">${pct >= 0 ? "+" : ""}${pct}%</span></div>
        ${q.loan ? `<div>대출</div><div class="down">${fmtMoney(q.loan)}</div>` : ""}
        ${q.dep ? `<div>세입자 보증금</div><div class="down">${fmtMoney(q.dep)}</div>` : ""}
        <div>내 몫</div><div>${fmtMoney(mine)}</div>
        ${income ? `<div>월세 수입</div><div class="up">월 ${fmtMoney(Math.round(income / 12))}</div>` : ""}
      </div>
      <div class="sellq">지금 팔면 <b>${fmtMoney(q.net)}</b> 손에 쥡니다 <span class="small">${q.tax ? `양도세 ${fmtMoney(q.tax)}` : q.taxFree ? "1주택 비과세" : "세금 없음"}${q.dep ? ` · 보증금 반환 ${fmtMoney(q.dep)}` : ""}${q.loan ? ` · 대출 상환 ${fmtMoney(q.loan)}` : ""}</span></div>
      <div class="row wrap" style="margin-top:8px">
        <button class="sellbtn" data-a="sell" data-v="${p.uid}" ${dis}>팔기</button>
        ${t.livable && p.mode !== "live" ? `<button class="ghost sm" data-a="livein" data-v="${p.uid}" ${dis}>들어가 살기${q.dep ? " (보증금 반환)" : ""}</button>` : ""}
        ${p.mode === "rent" && t.livable ? (p.lease === "jeonse" ? `<button class="ghost sm" data-a="lease" data-v="${p.uid}|monthly" ${dis}>월세로 돌리기</button>` : `<button class="ghost sm" data-a="lease" data-v="${p.uid}|jeonse" ${dis}>전세로 돌리기 (+${fmtMoney(Math.round(q.value * t.jeonseRatio))})</button>`) : ""}
      </div></div></div></div>`;
  };
  return `
    ${dealBanner(life)}
    <div class="label">내 부동산</div>
    ${life.props.length ? `<div class="card estate-sum"><div class="kv">
      <div>집</div><div><b>${life.props.length}채</b> · 시세 합계 ${fmtMoney(total)}</div>
      <div>빚</div><div class="down">대출 ${fmtMoney(loans)}${deps ? ` · 세입자 보증금 ${fmtMoney(deps)}` : ""}</div>
      <div>내 몫</div><div><b>${fmtMoney(total - loans - deps)}</b></div>
      <div>한 해</div><div><span class="up">월세 +${fmtMoney(Math.round(rentIn))}</span> · <span class="down">이자 −${fmtMoney(Math.round(interest))}</span></div>
    </div><div class="small" style="margin-top:6px">갭투자는 부동산 탭의 매물에서 '전세 끼고 사기'로 합니다. 전세가 떨어지면 만기에 보증금 차액을 돌려줘야 합니다(역전세).</div></div>` : ""}
    ${qs.filter((x) => x.p.mode === "live").map(card).join("")}
    ${qs.filter((x) => x.p.mode !== "live").map(card).join("")}
    ${life.props.length ? "" : `<div class="card small">아직 내 이름으로 된 집이 없습니다. <button class="estate" style="margin:8px 0 0;width:100%" data-a="tab" data-v="map">🏠 부동산 보러가기</button></div>`}
    <div class="label">지금 사는 곳</div>
    ${ph(homeSceneId(h.type, h.district, h.tenure), "r16x10")}
    <div class="card"><div class="t">${esc(districtName(h.district))} ${esc(PROP_TYPES[h.type].name)} · ${TENURE[h.tenure]}</div>
      <div class="small">${esc(DISTRICTS.find((d) => d.id === h.district)!.vibe)}</div>
      <div class="kv"><div>산 지</div><div>${homeYears(life) + 1}년째</div>
      ${h.deposit ? `<div>보증금</div><div>${fmtMoney(h.deposit)}</div>` : ""}
      ${h.yearlyRent ? `<div>월세</div><div>월 ${fmtMoney(Math.round(h.yearlyRent / 12))}</div>` : ""}
      ${h.contractEnd ? `<div>계약 만료</div><div>${h.contractEnd}년</div>` : ""}
      <div>방</div><div>${PROP_TYPES[h.type].rooms}개</div></div>
    </div>
    <div class="label">동네와의 정</div>
    <div class="card small">${Object.entries(life.jeong).sort((a, b) => b[1] - a[1]).map(([d, y]) => `${esc(districtName(d))} ${y}년`).join(" · ") || "아직 없음"}<br><span style="color:var(--dim)">오래 살수록 이웃·단골·아이 친구가 생깁니다. 떠났다 돌아와도 정은 남습니다.</span></div>
    <div class="label">살아온 집</div>
    <div class="timeline">${life.homeHistory.slice().reverse().map((r) => `<div>${esc(districtName(r.district))} ${esc(PROP_TYPES[r.type].name)} · ${TENURE[r.tenure]} <small>${r.from}–${r.to ?? "지금"} · “${esc(r.memory)}”</small></div>`).join("")}</div>`;
}

function viewMap(life: Life) {
  const wy = wyNow(app.world!, life);
  const d = DISTRICTS.find((x) => x.id === app.mapDistrict)!;
  const listings = life.listings.filter((l) => l.district === d.id);
  const others = life.listings.filter((l) => l.district !== d.id);
  const ql = rentQuote(life, app.world!, d.id, "apt59");
  const qv = rentQuote(life, app.world!, d.id, "villa");
  const qo = rentQuote(life, app.world!, d.id, "officetel");
  const listingCard = (l: typeof life.listings[number]) => {
    const t = PROP_TYPES[l.type];
    const c = checkBuy(life, l, wy);
    const g = gapQuote(life, l, wy);
    const dis = dealUsed(life) ? "disabled" : "";
    const mkt = propValue(l, wy);
    const ask = listingPrice(l, wy);
    return `<div class="card"><div class="listing">${ph(exteriorId(l.type, l.district), "r1x1")}<div style="flex:1">
      <div class="t">${esc(districtName(l.district))} ${esc(t.name)}</div>
      <div class="kv"><div>호가</div><div><b>${fmtMoney(ask)}</b> <span class="small">(시세 ${fmtMoney(mkt)} 대비 ${ask >= mkt ? "+" : ""}${Math.round((ask / mkt - 1) * 100)}%)</span></div>
      <div>대출 가능</div><div>${fmtMoney(c.loan)} (LTV ${Math.round(c.ltv * 100)}%)</div><div>필요 현금</div><div>${fmtMoney(c.cashNeeded)} <span class="small">세금 ${fmtMoney(c.tax)} 포함</span></div>
      ${t.livable ? "" : `<div>예상 임대수익</div><div>연 ${(t.rentYield * 100).toFixed(1)}%</div>`}</div>
      ${l.revealed ? `<div class="small" style="margin-top:6px">🔎 ${esc(l.note)}</div>` : `<button class="ghost sm" style="margin-top:6px" data-a="legwork" data-v="${l.uid}">발품 팔기 (남은 ${life.legwork})</button>`}
      ${t.livable ? `<div class="gapline">전세 끼고 사기(갭): 전세금 ${fmtMoney(g.dep)} · <b>내 돈 ${fmtMoney(g.cashNeeded)}</b> <span class="small">월세 수입 없음 · 역전세 위험</span></div>` : ""}
      <div class="row wrap" style="margin-top:8px">
        ${c.ok && t.livable ? `<button class="ghost sm" data-a="buylive" data-v="${l.uid}" ${dis}>사서 들어가 살기</button>` : ""}
        ${c.ok ? `<button class="ghost sm" data-a="buyrent" data-v="${l.uid}" ${dis}>사서 월세 주기</button>` : ""}
        ${t.livable ? `<button class="gapbtn" data-a="buygap" data-v="${l.uid}" ${dis || (g.ok ? "" : "disabled")}>전세 끼고 사기</button>` : ""}
      </div>
      ${c.ok ? "" : `<div class="warn">대출 끼고 사기: ${esc(c.reason ?? "")}</div>`}${t.livable && !g.ok ? `<div class="warn">갭투자: 현금 ${fmtMoney(g.cashNeeded - life.cash)} 부족</div>` : ""}
    </div></div></div>`;
  };
  return `
    ${dealBanner(life)}
    <div class="label">매물 <span style="color:var(--dim)">— 서울 · 올해 시세 ${wy.change >= 0 ? "+" : ""}${(wy.change * 100).toFixed(1)}% · 금리 ${(wy.rate * 100).toFixed(1)}%</span></div>
    <div class="dchips">${DISTRICTS.map((x) => {
      const n = life.listings.filter((l) => l.district === x.id).length;
      return `<button data-a="district" data-v="${x.id}" class="${x.id === d.id ? "on" : ""}">${x.name}<small>매물 ${n}</small></button>`;
    }).join("")}</div>
    ${listings.map(listingCard).join("") || `<div class="small" style="margin:6px 0 10px">${esc(d.name)}에는 지금 나온 매물이 없습니다.</div>`}
    ${others.length ? `<div class="label">다른 동네 매물 ${others.length}건</div>${others.map(listingCard).join("")}` : ""}
    <div class="label">${esc(d.name)} 시세 · 동네</div>
    <div class="map">${ph("map_seoul", "r4x3")}<div class="tiles">${DISTRICTS.map((x) => {
      const n = life.listings.filter((l) => l.district === x.id).length;
      const now = apt84Price(x, wy), ago = apt84Price(x, worldYear(app.world!, life.year - 1, (life.season + 1) / life.perYear));
      const ch = life.year > START_YEAR ? (now / ago - 1) * 100 : 0;
      return `<button data-a="district" data-v="${x.id}" class="${x.id === d.id ? "on" : ""}">${x.name}<small>${fmtMoney(now)} · <span class="${ch >= 0 ? "up" : "down"}">${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%</span></small><small>매물 ${n}</small></button>`;
    }).join("")}</div></div>
    <div class="small" style="margin-top:8px"><b>${esc(d.name)}</b> — ${esc(d.vibe)} · 출퇴근 부담 ${"●".repeat(d.commute)}${"○".repeat(3 - d.commute)}</div>
    ${mapCharts(life, d.id)}
    <div class="label">${esc(d.name)}에 세 들어 살기</div>
    <div class="card"><div class="kv">
      <div>아파트 59㎡</div><div>전세 ${fmtMoney(ql.jeonse)} · 월세 연 ${fmtMoney(ql.monthlyYearly)}</div>
      <div>빌라</div><div>전세 ${fmtMoney(qv.jeonse)} · 월세 연 ${fmtMoney(qv.monthlyYearly)}</div>
      <div>오피스텔</div><div>전세 ${fmtMoney(qo.jeonse)} · 월세 연 ${fmtMoney(qo.monthlyYearly)}</div></div>
      <div class="row wrap" style="margin-top:10px">
        ${(["apt59", "villa", "officetel"] as PropType[]).map((t) => `<button class="ghost sm" data-a="rent" data-v="${t}|jeonse" ${dealUsed(life) ? "disabled" : ""}>${PROP_TYPES[t].name.split(" ")[0]} 전세</button><button class="ghost sm" data-a="rent" data-v="${t}|monthly" ${dealUsed(life) ? "disabled" : ""}>월세</button>`).join("")}
      </div>
      <div class="small" style="margin-top:6px">이사하면 관계가 조금 흔들리고, 동네 익숙함은 처음부터 다시 쌓입니다. 지금 보증금은 돌려받습니다.</div>
    </div>`;
}

function mapCharts(life: Life, did: string) {
  const pts = timePoints(life);
  const labels = pts.map((p) => p.label);
  const d = DISTRICTS.find((x) => x.id === did)!;
  const types: { id: PropType; name: string; color: string }[] = [
    { id: "apt84", name: "아파트 84㎡", color: "#f5d77a" },
    { id: "apt59", name: "아파트 59㎡", color: "#7fb2ff" },
    { id: "villa", name: "빌라", color: "#8fd19e" },
    { id: "officetel", name: "오피스텔", color: "#f08ad0" },
    { id: "shop", name: "1층 상가", color: "#ffa86b" },
  ];
  const abs = lineChart(types.map((tp, i) => ({ name: tp.name, color: tp.color, bold: i === 0, values: pts.map((p) => marketPrice(d.apt84 * PROP_TYPES[tp.id].priceRatio, d.id, PROP_TYPES[tp.id].beta, p.wy)) })), labels, { unit: (v) => fmtMoney(v) });
  const rel = lineChart(DISTRICTS.map((x) => ({ name: x.name, color: DCOLORS[x.id], bold: x.id === did, values: pts.map((p) => (apt84Price(x, p.wy) / x.apt84 - 1) * 100) })), labels, { unit: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%` });
  const rows = DISTRICTS.map((x) => {
    const now = apt84Price(x, pts[pts.length - 1].wy);
    const prev = life.year > START_YEAR ? apt84Price(x, worldYear(app.world!, life.year - 1, (life.season + 1) / life.perYear)) : now; // 1년 전 같은 계절
    const c1 = (now / prev - 1) * 100, c0 = (now / x.apt84 - 1) * 100;
    const cl = (v: number) => `<span class="${v >= 0 ? "up" : "down"}">${v >= 0 ? "+" : ""}${v.toFixed(1)}%</span>`;
    return `<tr class="${x.id === did ? "on" : ""}" data-a="district" data-v="${x.id}"><td><i style="background:${DCOLORS[x.id]}"></i>${x.name}</td><td>${fmtMoney(now)}</td><td>${cl(c1)}</td><td>${cl(c0)}</td></tr>`;
  }).join("");
  return `
    <div class="label">${esc(d.name)} 시세 흐름 <span style="color:var(--dim)">— 유형별</span></div>
    <div class="card">${abs}</div>
    <div class="label">동네 비교 <span style="color:var(--dim)">— 아파트 84㎡, 2026년 대비</span></div>
    <div class="card">${rel}
      <table class="cmp"><thead><tr><th>동네</th><th>84㎡ 시세</th><th>1년</th><th>2026 대비</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}

function viewJob(life: Life) {
  const j = job(life);
  return `
    <div class="label">지금의 명함</div>
    <div class="card listing">${ph(`job_${j.id}`, "r1x1")}<div><div class="t">${esc(life.work?.title ?? j.name)}</div><div class="small">${esc(j.card)} · ${life.jobYears + 1}년째</div>
    <div class="kv">${life.work ? `<div>하루 근무</div><div>${life.work.hours}시간${life.work.shift ? ` · ${life.work.shift === "night" ? "야간" : "3교대"}` : ""}${life.flags.sideH ? ` + 부업 ${life.flags.sideH}시간` : ""}</div><div>스트레스</div><div>${"●".repeat(Math.round(stressNow(life)))}${"○".repeat(Math.max(0, 4 - Math.round(stressNow(life))))} <span class="small">연인·가족·쉬는 시간이 덜어 줌</span></div>` : ""}<div>기본 연 소득</div><div>${j.income ? fmtMoney(life.income) : "—"}</div>${life.flags.spouseIncome && life.family.married ? `<div>배우자 소득</div><div>${fmtMoney(life.flags.spouseIncome)}</div>` : ""}<div>경력</div><div>${"★".repeat(Math.max(1, Math.round(life.learn / 20)))}${"☆".repeat(5 - Math.max(1, Math.round(life.learn / 20)))} <span class="small">시간을 들여 쌓고, 이직·연봉으로 이어짐</span></div><div>정년</div><div>${j.retireAge < 99 ? `${j.retireAge}세` : "없음"}</div>${life.workDistrict ? `<div>일터</div><div>${esc(districtName(life.workDistrict))} · 출퇴근 ${commuteOf(life)}분</div>` : ""}</div></div></div>
    ${life.studying ? `<div class="card"><div class="t">공부 중 → ${esc(jobById(life.studying.target).name)}</div><div class="small">남은 기간 ${life.studying.years}년 · 지식이 높을수록 붙을 확률이 높습니다.</div></div>` : ""}
    <div class="label">스탯이 하는 일</div>
    <div class="card small">
      <b>돈</b> — 한 달에 남는 돈과 모아 둔 돈. 직장·주거비·대출·식구가 움직입니다<br>
      <b>시간</b> — 하루에 내 것으로 남는 시간. 출퇴근·야근·육아·돌봄이 가져갑니다<br>
      <b>체력</b> — 떠날 위험과 일할 힘. 잠(집의 소음·공간), 출퇴근, 운동할 짬, 나이<br>
      <b>관계</b> — 가족·친구와 보내는 시간. 결혼·이웃·익숙한 동네로 쌓이고, 잦은 이사·긴 출퇴근에 깎입니다<br>
      <span style="color:var(--dim)">행복은 네 칸으로 정해지지만 화면에 보이지 않습니다. 가장 모자란 칸이 크게 끌어내립니다. 엔딩에서 공개됩니다.</span><br>
      
    </div>
    <div class="label">명함 꾸러미</div>
    <div class="timeline">${life.jobHistory.slice().reverse().map((h) => `<div>${esc(jobById(h.jobId).card)} <small>${h.from}–${h.to ?? "지금"}</small></div>`).join("")}</div>`;
}

function peopleBlock(life: Life) {
  const ps = [...life.people].sort((a, b) => b.closeness - a.closeness);
  const W: Record<string, string> = { tight: "빠듯", middle: "보통", rich: "넉넉" };
  return `<div class="label">곁의 사람들 <small>${ps.length}/8</small></div>
    <div class="people">${ps.map((p) => `<div class="person"><b>${esc(p.role === "parent" ? "부모님" : p.name)}</b> <small>${esc(p.role === "parent" ? "" : roleKo(p))} · ${districtName(p.district)} · ${W[p.wealth]}</small><div class="cbar"><i style="width:${Math.round(p.closeness)}%"></i></div></div>`).join("") || `<div class="small">곁에 아무도 없습니다.</div>`}</div>`;
}
function storiesBlock(life: Life) {
  const st = [...life.stories].reverse();
  if (!st.length) return `<div class="small">아직 이어지는 이야기가 없습니다.</div>`;
  return st.slice(0, 8).map((s) => `<div class="story ${s.done ? "done" : "open"}"><div class="st">${esc(s.title)} <small>${s.done ? "끝" : "이어지는 중"}</small></div>${s.steps.map((x) => `<div class="sx"><small>${x.year} · ${x.age}세</small> ${esc(fixJosa(x.text))}</div>`).join("")}</div>`).join("");
}

function viewLog(life: Life) {
  const photos = life.log.slice(-9).reverse();
  return `
    <div class="label">연말 가족사진</div>
    ${photos.length ? `<div class="photos">${photos.map((l) => `<div>${ph(photoId(l.photo.length), "r4x3")}<div class="cap">${l.year} · ${l.photo.length}명</div></div>`).join("")}</div>` : `<div class="small">첫 연말이 아직 오지 않았습니다.</div>`}
    ${life.phase === "adult" ? peopleBlock(life) : ""}
    <div class="label">이어지는 이야기</div>
    ${storiesBlock(life)}
    <div class="label">지난해들</div>
    <div class="timeline">${life.log.slice(-12).reverse().map((l) => `<div>${l.year}년 · ${l.age}세 <small>${esc(l.headline)}</small></div>`).join("")}</div>
    <div class="label">내 인생들</div>
    ${lives().slice(0, 10).map((r) => `<div class="small">· ${esc(r.title)} (${r.age}세)</div>`).join("") || `<div class="small">아직 끝난 삶이 없습니다.</div>`}
    <div class="label">설정</div>
    <div class="row"><button class="ghost sm" data-a="toggleNeg">부정적 일 ${settings().noNegative ? "빼는 중 → 다시 넣기" : "포함 중 → 빼기"}</button></div>
    <div class="small" style="margin-top:4px">병·사기·외로움처럼 무거운 장면을 빼거나 순하게 바꿉니다.</div>
    <div class="dev">
      <div class="small">개발용</div>
      <div class="row wrap" style="margin-top:6px">
        <button class="ghost sm" data-a="auto1">자동 1년</button>
        <button class="ghost sm" data-a="auto10">자동 10년</button>
        <button class="ghost sm" data-a="autoall">끝까지 자동</button>
        <button class="ghost sm" data-a="reset">처음부터</button>
      </div>
      <div class="row" style="margin-top:10px"><button class="ghost sm" data-a="toggleSeasons">${settings().seasons ? "계절 모드(4번) 켜짐 → 빠른 모드로" : "빠른 모드(1번) 켜짐 → 계절 모드로"}</button></div>
      <div class="small" style="margin-top:6px">시드 ${life.seed} · 미래 시드 ${app.worldSeed}</div>
    </div>`;
}

function viewYear(life: Life) {
  const body = app.tab === "now" ? viewNow(life) : app.tab === "home" ? viewHome(life) : app.tab === "map" ? viewMap(life) : app.tab === "job" ? viewJob(life) : viewLog(life);
  return `<div class="phone">${app.tab === "now" ? "" : header(life)}${body}<div style="height:16px"></div>${nav()}</div>`;
}

function viewReport(life: Life) {
  const r = life.lastReport!;
  const last = life.log[life.log.length - 1];
  const dv = (k: string, v: number) => `<div>${k}<br><b class="${v > 0 ? "up" : v < 0 ? "down" : ""}">${v > 0 ? "+" : ""}${v}</b></div>`;
  return `<div class="phone report">
    <div class="month">${r.year}년 12월</div>
    <div class="when" style="margin:4px 0 12px">${r.died ? "마지막 겨울" : "연말 가족사진"}</div>
    ${ph(photoId(last.photo.length), "r4x3")}
    <div class="small" style="margin-top:6px">${esc(last.photoPlace)}에서 · ${last.photo.map(esc).join(", ")}</div>
    <div class="delta">${dv("건강", r.delta.health)}${dv("마음", r.delta.mind)}${dv("지식", r.delta.learn)}</div>
    <div class="storybox">${(r.lines.length ? r.lines : ["별일 없이 한 해가 지나갔습니다."]).map((s) => `<div>${esc(s)}</div>`).join("")}</div>
    <div class="card small"><div class="kv">
      <div>들어온 돈</div><div>${fmtMoney(r.income + r.rentIncome)}${r.rentIncome ? ` (임대 ${fmtMoney(r.rentIncome)})` : ""}</div>
      <div>나간 돈</div><div>${fmtMoney(r.spend + r.interest)}${r.interest ? ` (이자 ${fmtMoney(r.interest)})` : ""}</div>
      <div>순자산</div><div>${fmtMoney(r.netWorth)}</div></div></div>
    ${r.died ? `<p class="p" style="margin-top:14px">${r.age}살의 겨울, ${esc(life.name)}의 이야기가 끝났습니다.</p><button class="cta" data-a="toending">어떤 삶이었는지 보기</button>` : `<button class="cta" data-a="nextyear">${r.year + 1}년으로</button>`}
    <div style="margin-top:auto"></div>
  </div>`;
}

function curve(life: Life) {
  const L = life.log.filter((l) => l.money !== undefined);
  if (L.length < 2) return "";
  const W = 380, H = 150;
  const x = (i: number) => 8 + (i / (L.length - 1)) * (W - 16);
  const y = (v: number) => H - 8 - (v / 100) * (H - 16);
  const line = (get: (l: (typeof L)[number]) => number, c: string, w = 1.6, dash = "") => `<polyline fill="none" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ""} points="${L.map((l, i) => `${x(i).toFixed(1)},${y(get(l)).toFixed(1)}`).join(" ")}"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${line((l) => l.money!, "#f5d77a")}${line((l) => l.time!, "#7fb2ff")}${line((l) => l.health, "#8fd19e")}${line((l) => l.gak, "#f08ad0")}${line((l) => l.happy ?? l.mind, "#ffffff", 3)}</svg>
  <div class="legend"><span><i style="background:#fff"></i><b>행복</b></span><span><i style="background:#f5d77a"></i>돈</span><span><i style="background:#7fb2ff"></i>시간</span><span><i style="background:#8fd19e"></i>체력</span><span><i style="background:#f08ad0"></i>관계</span><span>${L[0].year}–${L[L.length - 1].year}</span></div>`;
}

function viewEnding(life: Life) {
  const e = app.ending!;
  const shots = life.log.filter((_, i) => i % 5 === 0 || i === life.log.length - 1);
  return `<div class="phone ending">
    ${ph("ending_bg", "r4x5")}
    <div class="title">${esc(e.title)}</div>
    <div class="happy"><div><span>평생의 행복</span><b>${e.happy}</b></div><div><span>가장 자주 모자랐던 것</span><b>${esc(e.lack)}</b></div><div><span>가장 넉넉했던 것</span><b>${esc(e.rich)}</b></div></div>
    <div class="small" style="margin:-4px 0 10px">숨어 있던 수치 · 지식 ${Math.round(life.learn)} · 운 ${Math.round(life.luck)}</div>
    ${e.epilogue.map((s) => `<p class="p" style="margin-bottom:6px">${esc(s)}</p>`).join("")}

    <section><h3>연말 가족사진</h3><div class="photos">${shots.map((l) => `<div>${ph(photoId(l.photo.length), "r4x3")}<div class="cap">${l.year} · ${l.age}세 · ${l.photo.length}명</div></div>`).join("")}</div></section>

    <section><h3>열쇠 꾸러미 — 살았던 집</h3><div class="timeline">${e.keys.map((k) => `<div>${esc(k.where)} · ${k.tenure} <small>${k.years} · “${esc(k.memory)}”</small></div>`).join("")}</div></section>

    <section><h3>명함 꾸러미</h3><div class="timeline">${e.cards.map((c) => `<div>${esc(c.job)} <small>${c.years}</small></div>`).join("")}</div></section>

    <section class="curve"><h3>평생의 곡선</h3>${curve(life)}</section>

    <section><h3>같은 해 서울에서 시작한 사람들</h3>
      ${app.others.map((o) => `<div class="other"><b>${esc(o.name)}</b><div>${esc(o.title)}<div class="small">${esc(o.job)}로 시작 · ${o.age}세</div></div></div>`).join("")}
      <div class="small" style="margin-top:8px">${esc(e.realityLine)}</div>
    </section>

    <section><h3>부동산 기록</h3><div class="record">${e.propertyRecord.map(esc).join("<br>")}</div></section>

    <section><h3>그 집에게 남기는 말</h3><textarea data-a="msg" placeholder="마지막 집에게 한 줄을 남겨 주세요">${esc(life.message ?? "")}</textarea></section>

    <section><h3>공유 카드</h3><div class="share">${ph(photoId(life.log[life.log.length - 1]?.photo.length ?? 1), "r4x3")}
      <div class="st" style="margin-top:10px">${esc(e.title)}</div>
      <div class="small" style="margin-top:6px">2026년 서울 · ${esc(e.startLine)}</div></div>
      <button class="ghost" style="width:100%;margin-top:8px" data-a="copyshare">문장 복사하기</button>
      <div class="small" style="margin-top:4px">공유 카드에는 금액과 보유 채 수가 들어가지 않습니다.</div>
    </section>

    <button class="cta" data-a="reborn">다시 태어나기</button>
    <div class="foot">미래 시드 ${app.worldSeed} · 인생 시드 ${life.seed}</div>
  </div>`;
}

// ───────────────────────── 렌더 ─────────────────────────
const root = document.getElementById("app")!;
function render() {
  const life = app.life;
  let html = "";
  if (app.screen === "title") html = viewTitle();
  else if (app.screen === "questions") html = viewQuestions();
  else if (app.screen === "intro" && life) html = viewIntro(life);
  else if (app.screen === "year" && life) html = viewYear(life);
  else if (app.screen === "report" && life) html = viewReport(life);
  else if (app.screen === "ending" && life) html = viewEnding(life);
  else html = viewTitle();
  root.innerHTML = html;
  const f = document.getElementById("feed");
  void f;
  app.keepScroll = false;
}

// ───────────────────────── 시간의 흐름 ─────────────────────────
/** 한 계절 앞으로. 이야기가 나오면 흐름은 그 자리에서 기다린다 */
function step() {
  const life = app.life, world = app.world;
  if (!life || !world || !life.alive) { app.playing = false; return; }
  if (life.pendingEventId && life.eventChoice === null) return;
  const n = life.feed.length;
  app.preview = null;
  const rep = advanceSeason(life, world);
  if (rep && life.season === 0 && life.alive) life.perYear = settings().seasons ? 4 : 1;
  app.newCount = life.feed.length - n;
  if (!life.alive) app.playing = false;
}
/** 시간은 기본으로 흐른다. 선택해야 하는 이벤트에서만 멈춘다 */
const BASE_MS = 1300;
function tick() {
  setTimeout(tick, BASE_MS / app.speed);
  if (!app.playing || app.screen !== "year" || app.tab !== "now" || app.moveAnim) return;
  const life = app.life;
  if (!life) return;
  if (life.pendingEventId && life.eventChoice === null) return; // 선택을 기다린다
  if (app.result) return; // 결과를 읽는 중
  step();
  save();
  render();
}
setTimeout(tick, BASE_MS);
function toast(msg: string) {
  if (!msg) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = fixJosa(msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function finishLife(record = true) {
  const life = app.life!, world = app.world!;
  app.ending = buildEnding(life, world);
  // 같은 미래를 사는 다른 4명 (자동 결정)
  app.others = [];
  for (let i = 1; i <= 4; i++) {
    const other = createLife((life.seed + i * 7919) >>> 0, world);
    autoToEnd(other, world, "auto");
    const firstJob = jobById(other.jobHistory[0]?.jobId ?? "office").name;
    const oe = buildEnding(other, world);
    const used = [life.name, ...app.others.map((o) => o.name)];
    const name = used.includes(other.name) ? ["민서", "하준", "소율", "건우"][i - 1] : other.name;
    app.others.push({ name, title: oe.title, age: oe.deathAge, job: firstJob });
  }
  if (record) pushLife(app.ending, life);
}

function startNew() {
  app.worldSeed = newSeed();
  app.world = generateWorld(app.worldSeed, 110);
  app.life = createLife(newSeed(), app.world, settings().seasons ? 4 : 1);
  app.life.noNegative = settings().noNegative;
  app.ending = null;
  app.tab = "now";
  app.screen = "year";
  app.playing = true;
}
function newGame() {
  app.answers = [];
  app.qIndex = 0;
  app.life = null;
  app.ending = null;
  app.tab = "now";
  app.screen = "questions";
}

// ───────────────────────── 입력 ─────────────────────────
root.addEventListener("click", (ev) => {
  const el = (ev.target as HTMLElement).closest("[data-a]") as HTMLElement | null;
  if (!el || el.tagName === "TEXTAREA") return;
  const a = el.dataset.a!, v = el.dataset.v ?? "";
  app.newCount = 0;
  app.keepScroll = a === "more";
  const life = app.life, world = app.world;
  switch (a) {
    case "start": startNew(); break;
    case "continue": if (!load()) startNew(); app.playing = true; break;
    case "answer":
      app.answers.push(Number(v));
      if (app.qIndex < START_QUESTIONS.length - 1) app.qIndex++;
      else {
        app.worldSeed = newSeed();
        app.world = generateWorld(app.worldSeed, 110);
        app.life = createLife(newSeed(), app.world, settings().seasons ? 4 : 1);
        app.life.noNegative = settings().noNegative;
        app.screen = "intro";
      }
      break;
    case "begin": app.screen = "year"; app.tab = "now"; break;
    case "tab": app.tab = v as Tab; setTimeout(() => window.scrollTo(0, 0), 0); break;
    case "choose": {
      // 누르면 바로 정해지고 흐름이 이어진다
      app.preview = Number(v);
      if (!life || !world || !life.pendingEventId) break;
      const ev = buildEvent(life.pendingEventId, life, world);
      const opt = ev.options[app.preview];
      const from = life.home.district;
      const n = life.feed.length;
      life.flags.lastRoll = 0;
      const line = chooseEvent(life, world, app.preview);
      app.newCount = life.feed.length - n;
      app.preview = null;
      // 결과를 카드로 보여 주고, 읽을 시간 동안 흐름을 멈춘다 (운이 걸린 일은 더 오래)
      if (line && life.eventChoice !== null) {
        app.result = { title: ev.title, label: opt?.label ?? "", line, roll: life.flags.lastRoll ?? 0, p: life.flags.lastRollP ?? 0 };
        const ms = life.flags.lastRoll ? 4200 : 2600;
        const mine = app.result;
        setTimeout(() => { if (app.result === mine) { app.result = null; render(); } }, ms);
      }
      if (opt?.offer && life.home.district !== from) {
        app.moveAnim = { from, to: life.home.district };
        setTimeout(() => { app.moveAnim = null; render(); }, 1600);
      } else if (opt?.offer) {
        app.moveAnim = { from, to: from };
        setTimeout(() => { app.moveAnim = null; render(); }, 900);
      }
      break;
    }
    case "dismiss": app.result = null; break;
    case "flip": app.topMap = !app.topMap; break;
    case "next": if (app.result) { app.result = null; break; } if (life && world) step(); break;
    case "play": app.playing = !app.playing; break;
    case "speed": app.speed = Number(v); app.playing = true; break;
    case "more": app.feedShown += 40; app.newCount = 0; break;
    case "toggleNeg": {
      const s = settings();
      s.noNegative = !s.noNegative;
      setSettings(s);
      if (life) life.noNegative = s.noNegative;
      break;
    }
    case "toggleSeasons": {
      const s = settings();
      s.seasons = !s.seasons;
      setSettings(s);
      if (life && life.season === 0) life.perYear = s.seasons ? 4 : 1;
      toast(s.seasons ? "계절 모드: 한 해에 네 번 멈춥니다." : "빠른 모드: 한 해에 한 번 멈춥니다." + (life && life.season ? " (내년부터)" : ""));
      break;
    }
    case "nextyear":
      if (life && life.season === 0) life.perYear = settings().seasons ? 4 : 1;
      app.screen = "year"; app.tab = "now"; break;
    case "toending": app.playing = false; finishLife(); app.screen = "ending"; window.scrollTo({ top: 0 }); break;
    case "district": app.mapDistrict = v; break;
    case "legwork": if (life) toast(legwork(life, v) || "올해는 더 발품을 팔 시간이 없습니다."); break;
    case "buylive": if (life && world) toast(buy(life, v, world, "live")); break;
    case "buyrent": if (life && world) toast(buy(life, v, world, "rent")); break;
    case "buygap": if (life && world) toast(buy(life, v, world, "gap")); break;
    case "lease": if (life && world) { const [uid, ls] = v.split("|"); toast(setLease(life, uid, ls as "monthly" | "jeonse", world)); } break;
    case "sell": if (life && world && confirmSell()) toast(sell(life, v, world)); break;
    case "livein": if (life && world) toast(setMode(life, v, "live", world) || ""); break;
    case "rent": {
      if (!life || !world) break;
      const [t, ten] = v.split("|");
      toast(rentHome(life, world, app.mapDistrict, t as PropType, ten as "monthly" | "jeonse"));
      break;
    }
    case "auto1": if (life && world) { autoYear(life, world); app.tab = "now"; } break;
    case "auto10": if (life && world) { for (let i = 0; i < 10 && life.alive; i++) autoYear(life, world); app.tab = "now"; } break;
    case "autoall": if (life && world) { autoToEnd(life, world); finishLife(); app.screen = "ending"; } break;
    case "reset": localStorage.removeItem(SAVE_KEY); app.screen = "title"; app.life = null; break;
    case "reborn": localStorage.removeItem(SAVE_KEY); startNew(); break;
    case "copyshare": {
      if (!app.ending) break;
      const text = `${fixJosa(app.ending.title)}\n2026년 서울 · ${fixJosa(app.ending.startLine)}\n— 열쇠의 기록`;
      navigator.clipboard?.writeText(text).then(() => toast("복사했습니다."), () => toast(text));
      break;
    }
  }
  save();
  render();
});
root.addEventListener("input", (ev) => {
  const el = ev.target as HTMLTextAreaElement;
  if (el.dataset.a === "msg" && app.life) { app.life.message = el.value; save(); }
});
function confirmSell() { return true; } // 브라우저 확인창은 쓰지 않는다 — 실수 방지는 v6에서

// 처음 화면
render();

// 디버그용
(window as unknown as { __app: App; __photo: typeof familyPhoto }).__app = app;
void START_YEAR; void FAMILY_BACKGROUNDS; void ownedCount;
