// 이야기 — 집이 무대다. 대부분의 사건이 '이 집, 이 동네' 때문에 일어나고, 선택지가 곧 이사·매수가 된다.
import { DISTRICTS, PROP_TYPES, WORK_HUBS, type PropType } from "../data/seoul";
import { jobById } from "../data/jobs";
import { chance, clamp, pick, weighted } from "./rng";
import type { EventOption, GameEvent, HomeOffer, Life, World, WorldYear } from "./types";
import { RES_CODES, optionLock, needLack, adoptPet, changeJob, districtName, fmtMoney, haveKid, marry, moveInto, netWorth, newProperty, propValue, sellQuiet, wyNow, markDeal } from "./life";
import { feed } from "./feed";
import { commuteOf, householdSize, jeongOf, offerHint, offersFor, takeOffer, working, rollTags, makeOffer, offerDelta, yeoyu } from "./home";
import { marketPrice } from "./market";
import { PARTTIMES, ptById } from "../data/work";
import { ADULT_DEFS } from "./adult";
import { HOUSING_DEFS } from "./housing";
import { STORY_DEFS, checkupStory, onRetire, storyStep } from "./stories";

export interface EventDef {
  id: string;
  /** 무거운·안좋은 일 (설정에서 뺄 수 있다) */
  negative?: boolean;
  /** 앞선 선택이 예약해 둔 뒷이야기 (평소 뽑기에는 안 나온다) */
  scheduled?: boolean;
  /** 묻지 않고 그냥 일어나는 사소한 일 */
  auto?: boolean;
  weight: (l: Life, w: WorldYear) => number;
  forced?: boolean;
  build: (l: Life, w: WorldYear, world: World) => GameEvent;
}

const tag = (l: Life, k: string, n = 1) => { l.flags[`t_${k}`] = (l.flags[`t_${k}`] ?? 0) + n; };
const isRenter = (l: Life) => l.home.tenure === "monthly" || l.home.tenure === "jeonse";
const kidsAt = (l: Life, a: number, b: number) => l.family.kids.filter((k) => l.year - k.born >= a && l.year - k.born <= b);
const back = (l: Life) => (isRenter(l) ? l.home.deposit : 0);

/** 이사·매수 선택지 */
export function moveOpt(l: Life, world: World, o: HomeOffer, memory: string, autoWeight = 1, extra?: (life: Life) => void): EventOption {
  const current = l.home.tenure === "own" ? "sell" : "keep";
  const verb = o.tenure === "buy" ? "산다" : "옮긴다";
  return {
    label: `${o.label}${o.tenure === "buy" ? "을(를)" : "(으)로"} ${verb}`,
    hint: offerDelta(l, o) + (current === "sell" ? " · 지금 집은 판다" : ""),
    offer: o,
    deal: true,
    autoWeight,
    apply: (life) => { extra?.(life); return takeOffer(life, world, o, memory, current); },
  };
}
const MEM_MOVE = ["이삿짐 상자가 몇 달째 베란다에 있었다", "새 동네 빵집 아주머니가 먼저 인사했다", "벽지 무늬를 외울 만큼 오래 누워 있었다", "창문을 열면 다른 바람 냄새가 났다"];

/** 부모님 집을 옮긴다(어린 시절) */
function moveParents(l: Life, district: string, type: PropType, tags: string[], memory: string) {
  l.parentsHome = { district, type, owned: l.parentsHome.owned };
  moveInto(l, { tenure: "parents", district, type, deposit: 0, yearlyRent: 0, sinceYear: l.year, condition: "normal", tags }, memory);
}

/** 배낭여행: 빚이나 저축을 쓰고, 사람과 운을 얻는다 */
function travel(l: Life) {
  l.luck = clamp(l.luck + 8); l.gak = clamp(l.gak + 6); l.mind = clamp(l.mind + 4); l.learn = clamp(l.learn + 1);
  l.flags.traveled = 1; tag(l, "people");
}

const CHILD: Record<number, EventDef["build"]> = {
  4: (l) => ({
    id: "child_4", tier: "life", sceneId: "evt_child_playground",
    title: "놀이터에서 해가 질 때까지 놀았습니다.",
    body: `${districtName(l.home.district)}의 저녁, 엄마가 베란다에서 이름을 불렀습니다.`,
    options: [
      { label: "조금만 더 놀겠다고 버텼다", hint: "", apply: (life) => { tag(life, "people"); life.gak = clamp(life.gak + 3); life.family.friends++; return "놀이터 친구들의 이름을 다 외웠습니다."; } },
      { label: "집에 들어가 그림책을 폈다", hint: "", apply: (life) => { tag(life, "study"); life.learn = clamp(life.learn + 3); return "같은 그림책을 백 번은 읽었습니다."; } },
    ],
  }),
  7: (l) => {
    const tight = l.background === "빠듯한 집";
    const to = tight ? { d: "eunpyeong", t: "villa" as PropType, tags: ["언덕", "엘리베이터 없음"] } : l.background === "넉넉한 집" ? { d: "gangnam", t: "apt84" as PropType, tags: ["남향", "공원 앞"] } : { d: "mapo", t: "apt59" as PropType, tags: ["층간소음"] };
    return {
      id: "child_7", tier: "life", sceneId: "evt_child_move",
      title: tight ? "집주인이 보증금을 올려 달라고 했습니다." : "부모님이 이사 이야기를 했습니다.",
      body: tight ? "엄마 아빠가 밤늦게까지 계산기를 두드렸습니다. 입학을 앞둔 봄이었습니다." : `${districtName(to.d)} 쪽으로 옮기면 아빠 회사가 가깝다고 했습니다. 입학을 앞둔 봄이었습니다.`,
      options: [
        { label: "전학 가기 싫다고 울었다", hint: "이 동네, 이 친구들 그대로", apply: (life) => { life.mind = clamp(life.mind - 1); life.gak = clamp(life.gak + 2); return tight ? "부모님은 적금을 깨서 보증금을 올려 주었습니다. 같은 동네, 같은 친구들." : "부모님은 이사를 몇 년 미루기로 했습니다."; } },
        { label: "새 동네가 궁금했다", hint: `${districtName(to.d)}(으)로 이사 · 전학`, apply: (life) => { moveParents(life, to.d, to.t, to.tags, "새 학교 운동장이 낯설게 넓었다"); tag(life, "risk"); return `${districtName(to.d)}의 ${PROP_TYPES[to.t].name}(으)로 이사했습니다.`; } },
      ],
    };
  },
  10: (l) => {
    const rooms = PROP_TYPES[l.home.type].rooms;
    if (rooms < 3) return {
      id: "child_10", tier: "life", sceneId: "evt_child_sibling",
      title: "동생이 생겼습니다. 방이 하나 모자랍니다.",
      body: `방 ${rooms}개짜리 집에 식구가 넷이 됐습니다.`,
      options: [
        { label: "동생과 방을 같이 쓴다", hint: "이층 침대 위 칸", apply: (life) => { life.flags.sibling = 1; life.gak = clamp(life.gak + 4); tag(life, "people"); return "이층 침대 위 칸은 내 차지였습니다."; } },
        { label: "거실 구석을 내 자리로 만든다", hint: "접이식 밥상이 내 책상", apply: (life) => { life.flags.sibling = 1; life.learn = clamp(life.learn + 2); tag(life, "hands"); return "책상 대신 접이식 밥상에서 숙제를 했습니다."; } },
      ],
    };
    return {
      id: "child_10", tier: "life", sceneId: "evt_child_room",
      title: "처음으로 내 방이 생겼습니다.",
      body: "벽지 색을 고르라고 했습니다.",
      options: [
        { label: "책상을 창가에 둔다", hint: "", apply: (life) => { tag(life, "study"); life.learn = clamp(life.learn + 3); return "창밖 놀이터를 보며 숙제를 했습니다."; } },
        { label: "친구들을 불러 방을 자랑한다", hint: "", apply: (life) => { tag(life, "people"); life.gak = clamp(life.gak + 3); life.family.friends++; return "방바닥에 친구들과 나란히 누웠습니다."; } },
      ],
    };
  },
  13: () => ({
    id: "child_13", tier: "life", sceneId: "evt_child_teen",
    title: "열세 살, 방문을 닫는 날이 많아졌습니다.",
    body: "문 너머로 저녁 먹으라는 소리가 들렸습니다.",
    options: [
      { label: "밤새 무언가를 만들었다", hint: "", apply: (life) => { tag(life, "hands"); tag(life, "risk"); life.health = clamp(life.health - 1); return "책상 위에 부품과 그림이 쌓였습니다."; } },
      { label: "동네 친구들과 쏘다녔다", hint: "", apply: (life) => { tag(life, "people"); life.gak = clamp(life.gak + 3); life.family.friends++; return "골목마다 우리만 아는 이름이 붙었습니다."; } },
      { label: "학원 가방을 쌌다", hint: "밤 열 시 학원 버스", apply: (life) => { tag(life, "study"); life.learn = clamp(life.learn + 4); life.mind = clamp(life.mind - 2); return "밤 열 시, 학원 버스가 동네를 돌았습니다."; } },
    ],
  }),
  16: (l) => l.home.tags.includes("반지하") ? {
    id: "child_16", tier: "life", sceneId: "evt_child_flood",
    title: "장마, 반지하 방에 물이 찼습니다.",
    body: "새벽에 아빠가 깨웠습니다. 교과서가 젖고 있었습니다.",
    options: [
      { label: "가족과 밤새 물을 퍼냈다", hint: "", apply: (life) => { life.gak = clamp(life.gak + 5); life.health = clamp(life.health - 2); tag(life, "hands"); return "아침에 다 같이 라면을 먹었습니다. 아무도 울지 않았습니다."; } },
      { label: "독서실로 피했다", hint: "", apply: (life) => { life.learn = clamp(life.learn + 4); tag(life, "study"); life.flags.wantOut = 1; return "언젠가 볕 드는 집에 살겠다고 노트에 적었습니다."; } },
    ],
  } : {
    id: "child_16", tier: "life", sceneId: "evt_child_study",
    title: "열여섯, 학원가 불빛이 늦게까지 켜져 있습니다.",
    body: `${districtName(l.home.district)}에서 학원가까지 버스로 ${l.home.district === "gangnam" ? 5 : 40}분.`,
    options: [
      { label: "학원을 늘린다", hint: "버스 막차로 귀가", apply: (life) => { tag(life, "study", 2); life.learn = clamp(life.learn + 5); life.mind = clamp(life.mind - 3); return "버스 창에 기대 졸며 집에 왔습니다."; } },
      { label: "동아리에 빠진다", hint: "", apply: (life) => { tag(life, "hands"); tag(life, "people"); life.mind = clamp(life.mind + 2); return "동아리방 열쇠를 내가 들고 다녔습니다."; } },
    ],
  },
  19: () => ({
    id: "child_19", tier: "life", sceneId: "evt_child_twenty",
    title: "열아홉, 진로를 정해야 합니다.",
    body: "부엌 식탁에서 부모님과 처음으로 오래 이야기했습니다.",
    options: [
      { label: "대학에 간다", hint: "4년 더 공부 · 등록금이 든다 · 회사원·개발자·전문직 쪽으로", apply: (life) => { life.flags.path = 1; tag(life, "study", 2); life.learn = clamp(life.learn + 6); return "합격 문자를 받은 날, 엄마가 미역국을 끓였습니다."; } },
      { label: "바로 일을 시작한다", hint: "월급이 일찍 들어온다 · 기술·서비스 쪽으로", apply: (life) => { life.flags.path = 2; tag(life, "hands", 2); return "첫 월급으로 부모님께 내복을 샀습니다."; } },
      { label: "하고 싶은 걸 해 본다", hint: "벌이는 들쭉날쭉 · 프리랜서·자영업 쪽으로", apply: (life) => { life.flags.path = 3; tag(life, "risk", 2); life.mind = clamp(life.mind + 3); return "어른들은 걱정했지만, 나는 조금 설렜습니다."; } },
    ],
  }),
  20: (l) => {
    const path = l.flags.path ?? 1;
    const tight = l.background === "빠듯한 집", rich = l.background === "넉넉한 집";
    const setPt = (life: Life, ids: string[]) => { life.parttime = ids; life.flags.pt = ids.length; };
    const ptOpt = (ids: string[], extra: Partial<EventOption> = {}): EventOption => {
      const ps = ids.map(ptById);
      const month = ps.reduce((a, p) => a + p.monthly, 0), week = ps.reduce((a, p) => a + p.hoursWeek, 0);
      const need = { health: Math.max(0, ...ps.map((p) => p.need?.health ?? 0), ps.length >= 2 ? 52 + (ps.length - 2) * 10 : 0) || undefined, learn: Math.max(0, ...ps.map((p) => p.need?.learn ?? 0)) || undefined };
      return {
        label: ps.length === 1 ? `${ps[0].name} 알바` : ps.map((p) => p.name).join(" + "),
        hint: `월 ${month}만 · 주 ${week}시간 · ${ps.length === 1 ? ps[0].note : week >= 36 ? "학점과 잠을 내준다" : "주말이 사라진다"}`,
        need, autoWeight: ps.length === 1 ? 2 : 1,
        apply: (life) => { setPt(life, ids); for (const p of ps) { if (p.gain.rel) tag(life, "people"); if (p.gain.biz) tag(life, "hands"); if (p.gain.learn) tag(life, "study"); } return ps.length === 1 ? `${ps[0].place}의 ${ps[0].name}에서 일하기 시작했습니다.` : `${ps.map((p) => p.name).join("과 ")}을 오가며 한 주가 지나갔습니다.`; },
        ...extra,
      };
    };
    if (path === 1) {
      // 알바 여섯 가지 중 셋이 눈에 띈다 (하나쯤은 조건이 안 맞을 수도)
      const pool = [...PARTTIMES];
      const shown: string[] = [];
      while (shown.length < 3) { const p = pick(l.rng, pool); if (!shown.includes(p.id)) shown.push(p.id); }
      const okIds = shown.filter((id) => !needLack(l, ptById(id).need));
      const combo = okIds.length >= 2 ? [okIds[0], okIds[1]] : null;
      return {
        id: "child_20", tier: "life", sceneId: "evt_child_parttime",
        title: "스물, 등록금 고지서가 나왔습니다.",
        body: rich ? "부모님이 등록금을 내 주셨습니다. 용돈은 알아서 벌어 보라고 하셨습니다." : tight ? "집에 손 벌릴 형편이 아닙니다. 알바를 안 하면 학자금 대출이 쌓입니다." : "등록금 절반은 부모님이, 나머지는 학자금 대출로. 알바를 하면 대출이 줄어듭니다.",
        options: [
          { label: "공부에만 집중한다", hint: rich ? "알바 없음 · 지식 ↑" : "알바 없음 · 지식 ↑ · 학자금 대출이 쌓인다", autoWeight: rich ? 2 : 1, apply: (life) => { setPt(life, []); tag(life, "study"); life.learn = clamp(life.learn + 3); return "도서관 3층 창가 자리가 내 자리가 됐습니다."; } },
          ...shown.map((id) => ptOpt([id])),
          ...(combo ? [ptOpt(combo)] : []),
        ],
      };
    }
    if (path === 2) return {
      id: "child_20", tier: "life", sceneId: "evt_child_parttime",
      title: "스물, 첫 월급이 들어왔습니다.",
      body: "실수령 190만 원. 동기들은 아직 대학생입니다.",
      options: [
        { label: "한 곳에서 기술을 익힌다", hint: "저축 보통 · 기술 쪽으로", autoWeight: 2, apply: (life) => { life.flags.twoJobs = 0; tag(life, "hands"); life.learn = clamp(life.learn + 2); return "선배가 연장 쓰는 법을 처음부터 다시 가르쳐 줬습니다."; } },
        { label: "주말에도 일한다", hint: "저축 ↑ · 체력 −− · 가게 일을 배운다", need: { health: 55 }, apply: (life) => { life.flags.twoJobs = 1; tag(life, "people"); return "일요일 저녁, 통장 숫자를 보며 잠들었습니다."; } },
      ],
    };
    return {
      id: "child_20", tier: "life", sceneId: "evt_child_parttime",
      title: "스물, 작은 작업실을 함께 쓰기로 했습니다.",
      body: "월세를 셋이 나눠 냅니다. 벌이는 달마다 다릅니다.",
      options: [
        ptOpt(["cafe"], { label: "카페 알바를 하며 작업한다" }),
        ptOpt(["dining"], { label: "고깃집에서 장사를 배운다", apply: (life) => { setPt(life, ["dining"]); life.flags.bizExp = (life.flags.bizExp ?? 0) + 1.5; tag(life, "people"); return "사장님이 마감 장부를 맡기기 시작했습니다."; } }),
        ptOpt(["logis"], { label: "상하차로 목돈을 번다" }),
        { label: "작업에만 몰두한다", hint: "벌이 ↓ · 행복 ↑", apply: (life) => { setPt(life, []); life.mind = clamp(life.mind + 4); return "작업실 불이 새벽까지 꺼지지 않았습니다."; } },
      ],
    };
  },
  21: (l) => {
    const saved = Math.round(l.flags.savings ?? 0);
    const trip = 500;
    const canPay = saved >= trip;
    return {
      id: "child_21", tier: "life", sceneId: "evt_child_backpack",
      title: "스물하나, 친구들이 배낭여행 계획을 짜고 있습니다.",
      body: `한 달, 비행기 표와 숙소까지 ${fmtMoney(trip)}. 통장에는 ${fmtMoney(Math.max(0, saved))}.`,
      options: [
        canPay
          ? { label: "모은 돈으로 떠난다", hint: `저축 −${fmtMoney(trip)} · 관계 ↑ · 운이 트인다`, need: { health: 42 }, apply: (life) => { life.flags.savings = (life.flags.savings ?? 0) - trip; travel(life); return "낯선 기차역 벤치에서 친구와 컵라면을 나눠 먹었습니다."; } }
          : { label: "빚을 내서 떠난다", hint: `빚 +${fmtMoney(trip)} · 관계 ↑ · 운이 트인다`, need: { health: 42 }, apply: (life) => { life.flags.debt = (life.flags.debt ?? 0) + trip; travel(life); return "카드 할부 12개월. 그래도 그 바다는 잊히지 않았습니다."; } },
        { label: "그 돈으로 알바를 더 한다", hint: "저축 +300만 · 친구들 사진을 본다", apply: (life) => { life.flags.savings = (life.flags.savings ?? 0) + 300; life.mind = clamp(life.mind - 2); return "단톡방에 올라온 사진에 하트만 눌렀습니다."; } },
      ],
    };
  },
  22: (l) => {
    const pts = l.parttime ?? [];
    const where = pts.includes("cafe") ? "같은 카페에서 일하는" : pts.includes("dining") ? "고깃집 마감을 같이 하는" : l.flags.traveled ? "여행에서 만난 친구가 소개해 준" : l.flags.path === 1 ? "같은 수업을 듣는" : "일터 근처 단골 가게의";
    return {
      id: "child_22", tier: "life", sceneId: "evt_child_romance",
      title: "스물둘, 자꾸 눈이 가는 사람이 있습니다.",
      body: `${where} 사람. 연락하면 답장이 빨리 옵니다.`,
      options: [
        { label: "사귀어 본다", hint: "행복 ↑ · 스트레스가 덜하다 · 데이트비 연 200만", need: { freeH: 1.5 }, autoWeight: 2, apply: (life) => { life.flags.dating = 1; life.mind = clamp(life.mind + 5); life.gak = clamp(life.gak + 3); return "처음으로 '우리'라는 말을 썼습니다."; } },
        { label: "마음만 둔다", hint: "변화 없음", apply: (life) => { life.mind = clamp(life.mind - 1); return "졸업 사진 속 그 사람은 다른 쪽을 보고 있었습니다."; } },
        { label: "지금은 내 일이 먼저다", hint: l.flags.path === 1 ? "지식 ↑" : "저축 +200만", apply: (life) => { if (life.flags.path === 1) life.learn = clamp(life.learn + 2); else life.flags.savings = (life.flags.savings ?? 0) + 200; return "휴대폰을 엎어 두고 할 일을 했습니다."; } },
      ],
    };
  },
  23: (l) => {
    const saved = Math.round(l.flags.savings ?? 0);
    return {
      id: "child_23", tier: "life", sceneId: "evt_child_leave",
      title: "스물셋, 이 집을 떠날까 생각합니다.",
      body: `${districtName(l.home.district)}에서 산 지 ${jeongOf(l)}년. 통장에는 ${fmtMoney(Math.max(0, saved))}${l.flags.debt ? `, 갚을 빚 ${fmtMoney(Math.round(l.flags.debt))}` : ""}. ${l.background === "넉넉한 집" ? "부모님이 원룸 전세를 보태 주겠다고 했습니다." : "월세를 내면 모으는 돈이 줄어듭니다."}`,
      options: [
        { label: "원룸을 구해 나간다", hint: "스물다섯부터 원룸 월세 · 그동안 저축이 준다", apply: (life) => { life.flags.leaveHome = 1; life.mind = clamp(life.mind + 3); life.flags.awayEarly = 1; return "짐을 싸다가 어릴 때 일기장을 찾았습니다."; } },
        { label: "부모님 집에 남는다", hint: "주거비 0 · 버는 돈의 절반쯤이 모인다", apply: (life) => { life.flags.leaveHome = 0; life.gak = clamp(life.gak + 2); return "내 방 벽지는 그대로였습니다."; } },
      ],
    };
  },
};

const DEFS: EventDef[] = [
  // ════════ 강제 ════════
  {
    id: "contract_end", forced: true,
    weight: (l) => (isRenter(l) && (l.home.contractEnd ?? 9999) <= l.year ? 1 : 0),
    build: (l, w, world) => {
      const up = l.home.tenure === "jeonse" ? Math.round(l.home.deposit * Math.max(0, w.index - 1) * 0.4 + l.home.deposit * 0.05) : Math.round(l.home.yearlyRent * 0.05);
      const kinds: Parameters<typeof offersFor>[2] = [];
      if (commuteOf(l) >= 50) kinds.push("near_work");
      if (householdSize(l) > PROP_TYPES[l.home.type].rooms) kinds.push("bigger");
      kinds.push("same_town", "buy", "cheaper");
      const offers = offersFor(l, world, kinds).slice(0, 3);
      return {
        id: "contract_end", tier: "micro", sceneId: "evt_contract_message",
        title: `${l.year - l.home.sinceYear >= 4 ? `이 집에서 ${l.year - l.home.sinceYear}년째.` : ""} 집주인에게서 문자가 왔습니다.`,
        body: `계약 만료가 다가옵니다. 다시 계약하려면 ${l.home.tenure === "jeonse" ? `보증금을 ${fmtMoney(up)} 올려 달라` : "월세를 5% 올리겠다"}고 합니다.`,
        options: [
          {
            label: "이 집에 2년 더 산다", hint: l.home.tenure === "jeonse" ? `현금 −${fmtMoney(up)} (모자라면 월세로 바뀜) · 이 동네 그대로` : "월세 5% 오름 · 이 동네 그대로", autoWeight: 3,
            apply: (life) => {
              if (life.home.tenure === "jeonse") {
                if (life.cash >= up) { life.cash -= up; life.home.deposit += up; }
                else { life.home.tenure = "monthly"; life.home.yearlyRent = Math.round(up * 0.05 + 200); }
              } else life.home.yearlyRent = Math.round(life.home.yearlyRent * 1.05);
              life.home.contractEnd = life.year + 2;
              return "같은 집에서 2년 더 살기로 했습니다.";
            },
          },
          ...offers.map((o) => moveOpt(l, world, o, pick(l.rng, MEM_MOVE), o.tenure === "buy" ? 1 : 1)),
        ],
      };
    },
  },
  {
    id: "inherit", forced: true,
    weight: (l) => (l.flags.inheritPending ? 1 : 0),
    build: (l, w, world) => {
      const ph = l.parentsHome;
      const t = PROP_TYPES[ph.type];
      const base = DISTRICTS.find((d) => d.id === ph.district)!.apt84 * t.priceRatio;
      const price = Math.round(marketPrice(base, ph.district, t.beta, w) * 0.92);
      const grewUp = l.homeHistory.some((h) => h.tenure === "parents" && h.district === ph.district);
      const living = l.home.tenure === "parents";
      const share = l.flags.sibling ? 0.5 : 1; // 형제가 있으면 반씩
      const buyout = Math.round(price * (1 - share));
      // 상속세 [추론, 단순화]: 내 몫에서 공제 10억을 넘는 부분 × 20%(30억까지) / 40%(그 위)
      const mine = price * share, over = Math.max(0, mine - 100000);
      const tax = Math.round(Math.min(over, 200000) * 0.2 + Math.max(0, over - 200000) * 0.4);
      const done = (life: Life) => { life.flags.inheritPending = 0; life.parentsHome.owned = false; };
      const mkProp = (life: Life, mode: "live" | "rent") => {
        const p = newProperty(life, ph.district, ph.type, base * 0.92, price, 0, "bad", mode);
        life.everOwned++;
        if (mode === "rent") p.tenant = pick(life.rng, ["신혼부부", "젊은 부부", "간호사"]);
        return p;
      };
      return {
        id: "inherit", tier: "life", sceneId: "evt_inherit",
        title: grewUp ? "어린 시절의 그 집이 남았습니다." : "부모님이 사시던 집이 남았습니다.",
        body: `${districtName(ph.district)} ${t.name}. 시세 ${fmtMoney(price)}${tax ? `, 상속세 ${fmtMoney(tax)}` : ""}. 현관문 비밀번호는 아직 당신의 생일입니다.`,
        options: [
          {
            label: living ? "이 집에서 계속 산다" : "그 집으로 들어가 산다", hint: (buyout ? `동생 몫 ${fmtMoney(buyout)}을(를) 내준다 · ` : "") + (tax ? `상속세 ${fmtMoney(tax)} · ` : "") + "어린 시절의 집으로", deal: !living, autoWeight: 1, cost: buyout + tax || undefined,
            apply: (life) => {
              done(life);
              life.cash -= buyout + tax;
              const p = mkProp(life, "live");
              if (!living) { if (life.home.tenure === "own") { const cur = life.props.find((x) => x.uid === life.home.propUid); if (cur) { cur.mode = "rent"; cur.tenant = "젊은 부부"; } } if (isRenter(life)) life.cash += life.home.deposit; markDeal(life); }
              moveInto(life, { tenure: "own", district: ph.district, type: ph.type, deposit: 0, yearlyRent: 0, propUid: p.uid, sinceYear: life.year, condition: "bad", tags: life.homeHistory.find((h) => h.district === ph.district && h.tenure === "parents")?.tags ?? [] }, "문틀에 내 키를 그은 연필 자국이 아직 있었다");
              life.flags.returnedChildhood = 1;
              return "어린 시절의 집으로 돌아왔습니다.";
            },
          },
          { label: "세를 준다", hint: (buyout ? `동생 몫 ${fmtMoney(buyout)}을(를) 내주고 월세를 받는다` : "월세 수입 · 집은 남긴다") + (tax ? ` · 상속세 ${fmtMoney(tax)}` : ""), cost: buyout + tax || undefined, autoWeight: 1, apply: (life) => { done(life); life.cash -= buyout + tax; mkProp(life, "rent"); if (living) { life.flags.forceMove = life.year; } return "그 집에 낯선 가족이 들어와 살게 됐습니다."; } },
          { label: "판다", hint: `내 몫 +${fmtMoney(Math.round(price * 0.97 * share - tax))}${share < 1 ? " (형제와 반씩)" : ""}${tax ? ` · 상속세 ${fmtMoney(tax)} 뺀 금액` : ""}`, autoWeight: 2, apply: (life) => { done(life); life.cash += Math.round(price * 0.97 * share - tax); if (living) life.flags.forceMove = life.year; return "마지막으로 빈 집을 한 바퀴 돌았습니다."; } },
        ],
      };
    },
  },
  {
    id: "force_move", forced: true,
    weight: (l) => (l.flags.forceMove && l.home.tenure === "parents" ? 1 : 0),
    build: (l, w, world) => {
      const offers = offersFor(l, world, ["same_town", "cheaper", "near_work", "buy"]).slice(0, 3);
      return {
        id: "force_move", tier: "life", sceneId: "evt_contract_message",
        title: "부모님 집을 비워야 합니다.",
        body: "어디로 갈까요.",
        options: offers.length ? offers.map((o) => moveOpt(l, world, o, "부모님 사진을 제일 먼저 꺼내 걸었다", 1, (life) => { life.flags.forceMove = 0; })) : [{ label: "공공임대를 신청한다", hint: "좁지만 싸다", apply: (life) => { life.flags.forceMove = 0; moveInto(life, { tenure: "monthly", district: "gwanak", type: "villa", deposit: 300, yearlyRent: 300, sinceYear: life.year, contractEnd: life.year + 2, condition: "normal", tags: ["엘리베이터 없음"] }, "공공임대 신청서를 세 번 고쳐 썼다"); return "공공임대로 옮겼습니다."; } }],
      };
    },
  },
  {
    id: "eldercare", forced: true,
    weight: (l) => (!l.care && l.age >= 80 && (l.health < 38 || l.age >= 88) ? 1 : 0),
    build: (l) => {
      const kid = l.family.kids.find((k) => k.independent) ?? l.family.kids[0];
      const opts: EventOption[] = [
        { label: "이 집에서 끝까지 산다", hint: "돌봄 비용 연 1,800만 · 익숙한 동네", cost: 1800, autoWeight: 2, apply: (life) => { life.care = "home"; life.mind = clamp(life.mind + 3); return "요양보호사가 일주일에 다섯 번 왔습니다. 창밖 풍경은 그대로였습니다."; } },
      ];
      if (kid) opts.push({ label: `${kid.name}의 집으로 들어간다`, hint: "곁 ↑ · 자녀에게 짐이 될까", autoWeight: 1, apply: (life) => {
        life.care = "kid";
        const cur = life.props.find((x) => x.uid === life.home.propUid);
        if (cur) { cur.mode = "rent"; cur.tenant = "젊은 부부"; }
        if (isRenter(life)) life.cash += life.home.deposit;
        moveInto(life, { tenure: "withkid", district: life.home.district, type: "apt84", deposit: 0, yearlyRent: 0, sinceYear: life.year, condition: "good", tags: ["남향"] }, "손주가 내 방 앞에 그림을 붙여 두었다");
        return `${kid.name}의 집 작은 방으로 옮겼습니다.`;
      } });
      opts.push({ label: "요양원으로 간다", hint: "연 2,400만 · 살던 집은 세를 준다", autoWeight: 1, apply: (life) => {
        life.care = "nursing";
        const cur = life.props.find((x) => x.uid === life.home.propUid);
        if (cur) { cur.mode = "rent"; cur.tenant = "젊은 부부"; }
        if (isRenter(life)) life.cash += life.home.deposit;
        moveInto(life, { tenure: "nursing", district: life.home.district, type: "officetel", deposit: 0, yearlyRent: 0, sinceYear: life.year, condition: "good", tags: [] }, "창가 침대, 같은 방 할머니가 사탕을 나눠 주었다");
        return "평생의 짐을 상자 두 개로 줄였습니다.";
      } });
      return {
        id: "eldercare", tier: "life", sceneId: "evt_eldercare",
        title: "혼자 지내기가 어려워졌습니다.",
        body: `${l.age}살. ${l.home.tags.includes("엘리베이터 없음") ? "계단이 산처럼 보입니다. " : ""}마지막 집을 정해야 합니다.`,
        options: opts,
      };
    },
  },
  {
    id: "jobhunt", forced: true,
    weight: (l) => (l.phase === "adult" && l.jobId === "jobless" ? 1 : 0),
    build: (l) => {
      const prev = l.jobHistory.filter((h) => h.jobId !== "jobless").slice(-1)[0];
      const prevJob = prev ? jobById(prev.jobId) : jobById("service");
      return {
        id: "jobhunt", tier: "life", sceneId: "evt_jobhunt",
        title: "평일 낮의 동네가 이렇게 조용한 줄 몰랐습니다.",
        body: `이력서를 보냈습니다. 하나는 ${districtName(pick(l.rng, WORK_HUBS))}, 하나는 우리 동네입니다.`,
        options: [
          { label: `다시 ${prevJob.name}(으)로`, hint: "소득 회복 · 일터는 업무지구", autoWeight: 3, apply: (life) => { if (chance(life.rng, 0.55 + life.learn / 200)) { changeJob(life, prevJob.id === "jobless" ? "service" : prevJob.id); life.workDistrict = pick(life.rng, WORK_HUBS); life.income = Math.round(life.income * 0.9); return "다시 출근하게 됐습니다."; } return "면접에서 떨어졌습니다."; } },
          { label: "동네에 작은 가게를 연다", hint: "자영업 · 출퇴근 15분 · 현금 −2,000만", cost: 2000, autoWeight: 1, apply: (life) => { life.cash -= 2000; changeJob(life, "self"); life.workDistrict = life.home.district; return `${districtName(life.home.district)} 골목에 작은 가게를 열었습니다.`; } },
        ],
      };
    },
  },
  {
    id: "retire", forced: true,
    weight: (l) => (working(l) && l.age >= jobById(l.jobId).retireAge && (l.age - jobById(l.jobId).retireAge) % 3 === 0 ? 1 : 0),
    build: (l) => ({
      id: "retire", tier: "life", sceneId: "evt_retire",
      title: `${l.age}살, 마지막 출근을 생각합니다.`,
      body: `${commuteOf(l)}분 출근길을 ${l.jobYears}년 다녔습니다.`,
      options: [
        { label: "은퇴한다", hint: "동네에서 보내는 시간 · 소득 → 연금", autoWeight: 2, apply: (life) => { changeJob(life, "retired"); life.workDistrict = null; life.mind = clamp(life.mind + 3); onRetire(life); return "마지막 출근길에 늘 지나던 빵집에 들렀습니다."; } },
        { label: "조금 더 일한다", hint: "소득 유지 · 건강 −", autoWeight: 1, apply: (life) => { life.income = Math.round(life.income * 0.7); return "직급을 내려놓고 몇 년 더 일하기로 했습니다."; } },
      ],
    }),
  },

  // ════════ 집에서 생기는 일 ════════
  {
    id: "landlord_sells",
    weight: (l) => (isRenter(l) && l.year - l.home.sinceYear >= 1 && (l.home.contractEnd ?? 0) > l.year ? 0.5 : 0),
    build: (l, w, world) => {
      const buyThis = makeOffer(l, w, l.home.district, l.home.type, "buy", "이 집");
      if (buyThis) { buyThis.condition = l.home.condition; buyThis.tags = l.home.tags; }
      const alt = offersFor(l, world, ["same_town", "cheaper"]).slice(0, 1);
      return {
        id: "landlord_sells", tier: "micro", sceneId: "evt_landlord_sells",
        title: "집주인이 집을 내놨다고 합니다.",
        body: "주말마다 낯선 사람들이 집을 보러 옵니다. 새 주인은 들어와 살지도 모릅니다.",
        options: [
          { label: "새 주인을 기다린다", hint: "계약은 지켜진다 · 마음 −", autoWeight: 2, apply: (life) => { life.mind = clamp(life.mind - 3); if (chance(life.rng, 0.4)) { life.home.contractEnd = life.year; return "새 주인이 직접 들어와 살겠다고 했습니다. 계약이 끝나면 나가야 합니다."; } return "새 주인은 그대로 세를 주겠다고 했습니다."; } },
          ...(buyThis ? [moveOpt(l, world, buyThis, "남의 집이던 이 집이 내 집이 됐다", 1)] : []),
          ...alt.map((o) => moveOpt(l, world, o, pick(l.rng, MEM_MOVE))),
        ],
      };
    },
  },
  {
    id: "first_home",
    weight: (l) => (isRenter(l) && l.age >= 28 && l.age <= 55 && l.year - (l.flags.firstHomeAsked ?? 0) >= 4 ? 1.1 : 0),
    build: (l, w, world) => {
      const offers = offersFor(l, world, ["buy"]);
      const cheap = offers.length ? [] : [];
      void cheap;
      const more = offersFor(l, world, ["buy"]).filter((o) => !offers.some((x) => x.district === o.district && x.type === o.type));
      const all = [...offers, ...more].slice(0, 2);
      return {
        id: "first_home", tier: "life", sceneId: "evt_model_house",
        title: "주말에 모델하우스에 다녀왔습니다.",
        body: all.length ? "모은 돈과 대출을 계산해 보니, 손이 닿는 집이 있습니다." : `계산기를 두드려 봤지만 아직은 멀어 보입니다. 지금 현금 ${fmtMoney(l.cash + back(l))}.`,
        options: [
          ...all.map((o) => moveOpt(l, world, o, "처음으로 벽에 못을 박아도 되는 집", 1)),
          { label: "아직은 남의 집에 산다", hint: "현금을 더 모은다", autoWeight: 2, apply: (life) => { life.flags.firstHomeAsked = life.year; return "청약 통장에 한 달 치를 더 넣었습니다."; } },
        ],
      };
    },
  },
  {
    id: "commute_long",
    weight: (l) => (commuteOf(l) >= 55 ? 1.4 : 0),
    build: (l, w, world) => {
      const c = commuteOf(l);
      const kid = kidsAt(l, 0, 12)[0];
      const offers = offersFor(l, world, ["near_work"]);
      return {
        id: "commute_long", tier: "life", sceneId: "evt_commute",
        title: `왕복 ${Math.round((c * 2) / 60 * 10) / 10}시간, 지하철에서 졸다 내릴 역을 지나쳤습니다.`,
        body: kid ? `${kid.name}이(가) 잠든 뒤에야 집에 들어갑니다. 주말에만 얼굴을 봅니다.` : `${districtName(l.home.district)}에서 ${districtName(l.workDistrict!)}까지 ${c}분.`,
        options: [
          ...offers.map((o) => moveOpt(l, world, o, "퇴근하고 저녁을 집에서 먹었다", 1)),
          { label: "버틴다", hint: "곁·건강 −", autoWeight: 2, apply: (life) => { life.gak = clamp(life.gak - 2); life.health = clamp(life.health - 1); return "지하철 앱의 '빠른 하차' 칸을 외웠습니다."; } },
        ],
      };
    },
  },
  {
    id: "room_short",
    weight: (l) => (l.phase === "adult" && l.home.tenure !== "parents" && householdSize(l) > PROP_TYPES[l.home.type].rooms ? 1.5 : 0),
    build: (l, w, world) => {
      const offers = offersFor(l, world, ["bigger", "buy"]);
      return {
        id: "room_short", tier: "life", sceneId: "evt_room_short",
        title: "방이 모자랍니다.",
        body: `${householdSize(l)}명이 방 ${PROP_TYPES[l.home.type].rooms}개에 삽니다. 장난감이 현관까지 나왔습니다.`,
        options: [
          ...offers.map((o) => moveOpt(l, world, o, "아이 방 문에 이름표를 붙였다", 1)),
          { label: "거실을 나눠 쓴다", hint: "마음 − · 돈은 아낀다", autoWeight: 2, apply: (life) => { life.mind = clamp(life.mind - 2); life.gak = clamp(life.gak + 1); return "책장을 세워 거실 한쪽을 방으로 만들었습니다."; } },
        ],
      };
    },
  },
  {
    id: "noise", auto: true,
    weight: (l) => (l.home.tags.includes("층간소음") && l.phase === "adult" ? 1.2 : 0),
    build: (l, w, world) => {
      const offers = offersFor(l, world, ["same_town"]);
      return {
        id: "noise", tier: "micro", sceneId: "evt_noise",
        title: "밤 열한 시, 윗집에서 쿵쿵 소리가 납니다.",
        body: "벌써 석 달째입니다.",
        options: [
          { label: "과일을 사 들고 올라간다", hint: "이웃이 될 수도, 싸움이 될 수도", autoWeight: 2, apply: (life) => { if (chance(life.rng, 0.55)) { life.home.tags = life.home.tags.filter((x) => x !== "층간소음"); life.gak = clamp(life.gak + 3); return "윗집 아이가 사과 편지를 써서 문에 붙였습니다."; } life.mind = clamp(life.mind - 3); return "문 앞에서 언성이 높아졌습니다. 엘리베이터가 불편해졌습니다."; } },
          { label: "귀마개를 산다", hint: "마음 −", autoWeight: 1, apply: (life) => { life.mind = clamp(life.mind - 2); return "귀마개 없이는 잠들지 못하게 됐습니다."; } },
          ...offers.map((o) => moveOpt(l, world, o, "처음으로 조용한 밤을 보냈다")),
        ],
      };
    },
  },
  {
    id: "mold", auto: true,
    weight: (l) => (l.phase === "adult" && l.season === 1 && (l.home.tags.includes("곰팡이") || l.home.condition === "bad") ? 2 : 0),
    build: (l) => ({
      id: "mold", tier: "micro", sceneId: "evt_mold",
      title: "장마가 끝나자 벽 모서리가 까맣게 변했습니다.",
      body: l.home.tenure === "own" ? "내 집이니 고쳐야 할 것도 내 몫입니다." : "집주인에게 말해 볼까요.",
      options: [
        l.home.tenure === "own"
          ? { label: "제대로 수리한다", hint: "현금 −600만 · 집 상태 ↑", cost: 600, autoWeight: 1, apply: (life) => { life.cash -= 600; life.home.condition = "normal"; life.home.tags = life.home.tags.filter((x) => x !== "곰팡이"); const p = life.props.find((x) => x.uid === life.home.propUid); if (p) p.condition = "normal"; return "벽지를 새로 바르니 집이 넓어 보였습니다."; } }
          : { label: "집주인에게 말한다", hint: "고쳐 줄 수도, 아닐 수도", autoWeight: 2, apply: (life) => { if (chance(life.rng, 0.5)) { life.home.tags = life.home.tags.filter((x) => x !== "곰팡이"); return "집주인이 방수 공사를 해 줬습니다."; } life.mind = clamp(life.mind - 2); return "\"원래 그래요\"라는 답장이 왔습니다."; } },
        { label: "제습기를 산다", hint: "현금 −50만 · 건강 지키기", cost: 50, autoWeight: 2, apply: (life) => { life.cash -= 50; life.health = clamp(life.health + 1); return "제습기 물통을 하루 두 번 비웠습니다."; } },
      ],
    }),
  },
  {
    id: "neighbor", auto: true,
    weight: (l) => (l.phase === "adult" && jeongOf(l) >= 3 && l.home.tenure !== "nursing" ? 1 : 0),
    build: (l) => ({
      id: "neighbor", tier: "district", sceneId: `evt_district_${l.home.district}`,
      title: "옆집 할머니가 김치를 한 통 주셨습니다.",
      body: `${districtName(l.home.district)}에 산 지 ${jeongOf(l)}년. 엘리베이터에서 만나는 얼굴이 대부분 익숙합니다.`,
      options: [
        { label: "반찬을 만들어 답례한다", hint: "곁 ↑ · 이웃", autoWeight: 2, apply: (life) => { life.gak = clamp(life.gak + 3); life.family.friends = Math.min(10, life.family.friends + 1); return "그 뒤로 택배를 서로 맡아 주게 됐습니다."; } },
        { label: "고맙다고 인사만 한다", hint: "곁 조금", autoWeight: 1, apply: (life) => { life.gak = clamp(life.gak + 1); return "빈 통을 깨끗이 씻어 돌려드렸습니다."; } },
      ],
    }),
  },
  {
    id: "regular_shop",
    weight: (l) => (l.phase === "adult" && jeongOf(l) >= 6 && !l.flags.shopAsked && l.age < 65 ? 0.8 : 0),
    build: (l) => ({
      id: "regular_shop", tier: "district", sceneId: "evt_regular_shop",
      title: "단골 빵집 사장님이 가게를 접는다고 합니다.",
      body: `${jeongOf(l)}년 동안 이름을 불러 주던 가게입니다. "누가 이어받으면 좋겠는데."`,
      options: [
        { label: "내가 가게를 이어받는다", hint: "자영업 · 일터가 동네로 · 현금 −3,000만", cost: 3000, autoWeight: 0.3, apply: (life) => { life.flags.shopAsked = 1; life.cash -= 3000; changeJob(life, "self"); life.workDistrict = life.home.district; return "새벽 다섯 시, 동네에서 제일 먼저 불을 켜게 됐습니다."; } },
        { label: "마지막 날 인사를 간다", hint: "곁 ↑ · 마음 −", autoWeight: 2, apply: (life) => { life.flags.shopAsked = 1; life.gak = clamp(life.gak + 2); life.mind = clamp(life.mind - 1); return "마지막 식빵을 품에 안고 돌아왔습니다."; } },
      ],
    }),
  },
  {
    id: "kid_school",
    weight: (l) => (kidsAt(l, 6, 12).length && l.home.district !== "gangnam" && !l.flags.schoolAsked ? 1.3 : 0),
    build: (l, w, world) => {
      const kid = kidsAt(l, 6, 12)[0];
      const o = makeOffer(l, w, "gangnam", "apt59", "jeonse", "학원가 근처 전세") ?? makeOffer(l, w, "gangnam", "officetel", "monthly", "학원가 근처 월세");
      return {
        id: "kid_school", tier: "life", sceneId: "evt_kid_school",
        title: "학부모 모임에서 '학군' 이야기가 나왔습니다.",
        body: `${kid.name}에게는 이 동네에 단짝이 있습니다. 놀이터에서 해가 질 때까지 놉니다.`,
        options: [
          ...(o ? [moveOpt(l, world, o, "아이가 한동안 옛 친구 이야기만 했다", 1, (life) => { life.flags.schoolAsked = 1; life.learn = clamp(life.learn + 1); life.gak = clamp(life.gak - 3); })] : []),
          { label: "이 동네에 남는다", hint: "아이의 친구 · 곁 ↑", autoWeight: 2, apply: (life) => { life.flags.schoolAsked = 1; life.gak = clamp(life.gak + 3); return `${kid.name}의 단짝이 생일 파티에 왔습니다.`; } },
        ],
      };
    },
  },
  {
    id: "redevelop",
    weight: (l) => (l.home.tenure === "own" && ["villa", "apt84", "apt59"].includes(l.home.type) && ["nowon", "eunpyeong", "gwanak", "seongsu", "mapo"].includes(l.home.district) && l.year - l.home.sinceYear >= 6 && !l.flags.redevelop ? 0.8 : 0),
    build: (l) => ({
      id: "redevelop", tier: "district", sceneId: "evt_redevelop",
      title: "단지에 '재건축 추진' 현수막이 붙었습니다.",
      body: "주민 회의에 동의서가 돌았습니다. 된다면 몇 년은 다른 데서 살아야 합니다.",
      options: [
        { label: "동의서에 서명한다", hint: "집값이 크게 오를 수도 · 몇 년 이사", autoWeight: 2, apply: (life) => {
          life.flags.redevelop = life.year;
          const p = life.props.find((x) => x.uid === life.home.propUid);
          if (p && chance(life.rng, 0.5)) { p.basePrice = Math.round(p.basePrice * 1.35); p.condition = "good"; return "몇 년 뒤 조합이 생겼고, 집값이 크게 뛰었습니다. 이삿짐은 아직입니다."; }
          return "조합은 몇 년째 다투기만 했습니다.";
        } },
        { label: "지금 이대로가 좋다", hint: "정 · 보금자리", autoWeight: 1, apply: (life) => { life.flags.redevelop = life.year; life.gak = clamp(life.gak + 1); return "오래된 놀이터가 그대로 남았습니다."; } },
      ],
    }),
  },
  {
    id: "price_up", auto: true,
    weight: (l, w) => (l.phase === "adult" && w.change > 0.06 && l.home.tenure !== "nursing" ? 1.6 : 0),
    build: (l, w, world) => {
      if (l.home.tenure === "own") {
        const p = l.props.find((x) => x.uid === l.home.propUid);
        const gain = p ? propValue(p, w) - p.boughtPrice : 0;
        return {
          id: "price_up", tier: "macro", sceneId: "evt_price_up",
          title: "우리 집 값이 또 올랐다는 뉴스.",
          body: `산 값보다 ${fmtMoney(gain)}. 그런데 팔면 우리는 어디서 살죠?`,
          options: [
            { label: "가족끼리 외식한다", hint: "곁 ↑ · 현금 −100만", cost: 100, autoWeight: 2, apply: (life) => { life.cash -= 100; life.gak = clamp(life.gak + 2); life.mind = clamp(life.mind + 2); return "아무 날도 아닌데 갈비를 먹었습니다."; } },
            { label: "모른 척한다", hint: "그냥 사는 집", autoWeight: 1, apply: () => "숫자는 숫자일 뿐이라고 생각했습니다." },
          ],
        };
      }
      const offers = offersFor(l, world, ["buy"]);
      return {
        id: "price_up", tier: "macro", sceneId: "evt_price_up",
        title: `서울 집값이 한 해 ${Math.round(w.change * 100)}% 올랐습니다.`,
        body: "친구는 2년 전에 산 집이 2억 올랐다고 했습니다. 집에 오는 길이 길게 느껴졌습니다.",
        options: [
          ...offers.map((o) => moveOpt(l, world, o, "더 늦기 전에, 라는 말을 백 번 했다", 0.6)),
          { label: "지금은 아니다", hint: "마음 −", autoWeight: 2, apply: (life) => { life.mind = clamp(life.mind - 3); return "부동산 앱을 지웠다가 다시 깔았습니다."; } },
        ],
      };
    },
  },
  {
    id: "price_down",
    weight: (l, w) => { const p = l.props.find((x) => x.uid === l.home.propUid); return p && propValue(p, w) < p.boughtPrice * 0.9 ? 1.4 : 0; },
    build: (l, w, world) => {
      const p = l.props.find((x) => x.uid === l.home.propUid)!;
      const loss = p.boughtPrice - propValue(p, w);
      const cheaper = offersFor(l, world, ["cheaper"]);
      return {
        id: "price_down", tier: "macro", sceneId: "evt_price_down",
        title: "산 값보다 집값이 떨어졌습니다.",
        body: `${fmtMoney(loss)}. 이자는 매달 그대로 나갑니다.`,
        options: [
          { label: "버틴다", hint: "이 집에 산다 · 마음 −", autoWeight: 3, apply: (life) => { life.mind = clamp(life.mind - 2); return "그래도 이 집에서 아이가 걸음마를 뗐습니다."; } },
          ...cheaper.map((o) => moveOpt(l, world, o, "손해를 보고 판 집 앞을 일부러 돌아서 다녔다", 0.4)),
        ],
      };
    },
  },
  {
    id: "empty_nest",
    weight: (l) => (l.age >= 55 && l.home.tenure === "own" && PROP_TYPES[l.home.type].rooms >= 3 && l.family.kids.length > 0 && l.family.kids.every((k) => k.independent) && !l.flags.nestAsked ? 1.2 : 0),
    build: (l, w, world) => {
      const offers = offersFor(l, world, ["smaller"]);
      return {
        id: "empty_nest", tier: "life", sceneId: "evt_empty_nest",
        title: "아이들이 떠난 방에 먼지가 쌓입니다.",
        body: "방 셋 중 둘은 문이 닫혀 있습니다.",
        options: [
          ...offers.map((o) => moveOpt(l, world, o, "줄인 짐 사이에서 아이들 일기장이 나왔다", 1, (life) => { life.flags.nestAsked = 1; })),
          { label: "손주들 올 방으로 남긴다", hint: "곁 ↑ · 관리비 그대로", autoWeight: 2, apply: (life) => { life.flags.nestAsked = 1; life.gak = clamp(life.gak + 2); return "작은 방에 이불을 한 채 더 사 두었습니다."; } },
        ],
      };
    },
  },
  {
    id: "stairs",
    weight: (l) => (l.age >= 70 && (l.home.tags.includes("엘리베이터 없음") || l.home.tags.includes("언덕")) && l.home.tenure !== "nursing" && !l.flags.stairsAsked ? 1.5 : 0),
    build: (l, w, world) => {
      const offers = offersFor(l, world, ["elevator"]);
      return {
        id: "stairs", tier: "life", sceneId: "evt_stairs",
        title: "장바구니를 들고 계단을 오르다 쉬어 갔습니다.",
        body: l.home.tags.includes("언덕") ? "젊을 땐 이 언덕이 운동이었는데." : "4층이 이렇게 높았던가.",
        options: [
          ...offers.map((o) => moveOpt(l, world, o, "엘리베이터 버튼을 누를 때마다 안도했다", 1, (life) => { life.flags.stairsAsked = 1; })),
          { label: "천천히 오르면 된다", hint: "건강 −", autoWeight: 1, apply: (life) => { life.flags.stairsAsked = 1; life.health = clamp(life.health - 3); return "계단 중간에 의자를 하나 놓았습니다."; } },
        ],
      };
    },
  },
  {
    id: "parents_near",
    weight: (l) => (l.phase === "adult" && l.family.parentsAlive > 0 && l.flags.parentAge >= 76 && l.home.district !== l.parentsHome.district && l.home.tenure !== "parents" && !l.flags.careDone ? 1.6 : 0),
    build: (l, w, world) => {
      const offers = offersFor(l, world, ["near_parents"]);
      const roomOk = PROP_TYPES[l.home.type].rooms > householdSize(l);
      return {
        id: "parents_near", tier: "life", sceneId: "evt_parents_care",
        title: "어머니가 계단에서 넘어지셨다는 전화를 받았습니다.",
        body: `부모님 집은 ${districtName(l.parentsHome.district)}, 여기서 한 시간입니다.`,
        options: [
          ...offers.map((o) => moveOpt(l, world, o, "저녁마다 부모님 집에 반찬을 들고 갔다", 1, (life) => { life.flags.careDone = 1; life.gak = clamp(life.gak + 4); })),
          ...(roomOk ? [{ label: "우리 집으로 모셔 온다", hint: "곁 ↑↑ · 방 하나를 내 드린다", autoWeight: 1, apply: (life: Life) => { life.flags.careDone = 1; life.flags.parentsWithMe = 1; life.gak = clamp(life.gak + 5); life.mind = clamp(life.mind - 1); return "작은 방에 부모님 짐이 들어왔습니다."; } } as EventOption] : []),
          { label: "매달 돈을 보낸다", hint: "현금 −600만 · 곁 −", cost: 600, autoWeight: 2, apply: (life) => { life.flags.careDone = 1; life.cash -= 600; life.gak = clamp(life.gak - 2); return "간병인을 구하고 매달 돈을 보냈습니다."; } },
        ],
      };
    },
  },
  {
    id: "marriage",
    weight: (l) => {
      const p = l.people.find((x) => x.role === "partner");
      if (l.phase !== "adult" || l.family.married || !p || l.age < 26 || l.age > 50) return 0;
      // 집 이야기(상견례)가 먼저다. 미루기로 했으면 2년은 기다린다
      const owns = l.props.some((x) => PROP_TYPES[x.type].livable);
      if (!owns && !l.flags.metParents) return 0;
      if (l.flags.delayWed && l.year - l.flags.delayWed < 2) return 0;
      const years = l.year - (l.flags.partnerSince ?? l.year);
      return years >= 2 && p.closeness >= 52 ? 2 + years * 0.3 : 0;
    },
    build: (l, w, world) => {
      const p = l.people.find((x) => x.role === "partner")!;
      const years = l.year - (l.flags.partnerSince ?? l.year);
      const fit = offersFor(l, world, ["same_town", "near_work", "buy"]).filter((o) => o.rooms >= 2 && l.cash - 1800 + back(l) >= o.cashNeeded).slice(0, 2);
      const here = PROP_TYPES[l.home.type].rooms >= 2 && l.home.tenure !== "parents";
      const wed = (life: Life, cost: number, big: boolean) => { life.cash -= cost; marry(life); life.flags.marriedYear = life.year; life.gak = clamp(life.gak + (big ? 12 : 9)); life.mind = clamp(life.mind + 6); if (big) { const par = life.people.find((x) => x.role === "parent"); if (par) par.closeness = clamp(par.closeness + 10); } storyStep(life, "love", "연애", `${life.age}살, ${life.family.spouseName}과(와) ${big ? "식을 올리고" : "스몰웨딩으로"} 결혼했다.`, true); };
      const opts: EventOption[] = [];
      const small = l.home.tenure === "parents" ? "부모님 집에서" : here ? "이 집에서" : `방 ${PROP_TYPES[l.home.type].rooms}개 이 집에서 좁게`;
      {
        opts.push({ label: `스몰웨딩, ${small} 시작한다`, hint: `현금 −1,800만 (예물·혼수·신혼여행) · 관계 ↑${here ? "" : " · 공간이 좁다"}`, cost: 1800, autoWeight: 2, apply: (life) => { wed(life, 1800, false); return `가까운 사람 서른 명 앞에서 반지를 나눴습니다. ${life.family.spouseName}의 칫솔이 내 칫솔 옆에 꽂혔습니다.`; } });
        opts.push({ label: "제대로 식을 올린다", hint: "현금 −4,500만 · 관계 ↑↑ · 부모님이 기뻐하신다", cost: 4500, autoWeight: 1, apply: (life) => { wed(life, 4500, true); return "하객 이백 명, 사진 촬영만 두 시간이었습니다."; } });
      }
      for (const o of fit) { const m = moveOpt(l, world, o, "신혼집 현관에 둘의 신발이 나란히 놓였다", 2, (life) => wed(life, 1800, false)); m.label = `스몰웨딩 + ${m.label}`; m.hint = "결혼 비용 −1,800만 · " + m.hint; m.cost = (m.cost ?? 0) + 1800; opts.push(m); }
      opts.push({ label: "혼인신고만 하고 식은 미룬다", hint: "돈이 들지 않는다 · 관계 ↑ · 부모님은 서운해하신다", autoWeight: 0.4, apply: (life) => { marry(life); life.flags.marriedYear = life.year; life.gak = clamp(life.gak + 6); life.mind = clamp(life.mind + 4); storyStep(life, "love", "연애", `${life.age}살, 식 없이 혼인신고만 하고 ${life.family.spouseName}과(와) 가족이 됐다.`, true); return "구청 민원실에서 서류 한 장으로 가족이 됐습니다."; } });
      opts.push({ label: "아직은 아니다", hint: "연인과 멀어질 수 있다", autoWeight: 0.5, apply: (life) => { p.closeness = clamp(p.closeness - 12); life.mind = clamp(life.mind - 2); return "조금 더 생각해 보자고 말했습니다. 대답이 짧았습니다."; } });
      return {
        id: "marriage", tier: "life", sceneId: "evt_marriage",
        title: `${years}년 만난 ${p.name}이(가) 결혼 이야기를 꺼냈습니다.`,
        body: `"우리, 어디서 살까?" ${l.home.tenure === "parents" ? "지금은 부모님 집에 살고 있습니다." : `지금 집은 방 ${PROP_TYPES[l.home.type].rooms}개.`}`,
        options: opts,
      };
    },
  },
  {
    id: "child",
    weight: (l) => (l.family.married && l.age >= 28 && l.age <= 43 && l.family.kids.length < 3 && l.year - (l.family.kids.slice(-1)[0]?.born ?? 0) >= 2 ? 2.5 - l.family.kids.length * 0.8 : 0),
    build: (l) => {
      const rooms = PROP_TYPES[l.home.type].rooms;
      const tight = householdSize(l) + 1 > rooms + 1;
      return {
        id: "child", tier: "life", sceneId: "evt_child",
        title: l.family.kids.length ? "둘째 이야기가 나왔습니다." : "아이를 가질까 이야기했습니다.",
        body: tight ? `지금 집에는 방이 ${rooms}개뿐입니다. 아기 침대를 어디에 둘까요.` : "작은 방을 아기 방으로 꾸미면 되겠다고 했습니다.",
        options: [
          { label: "아이를 갖는다", hint: tight ? "곁 ↑↑ · 집이 좁아진다" : "곁 ↑↑ · 지출 ↑", autoWeight: 2, apply: (life) => { haveKid(life); life.gak = clamp(life.gak + 10); life.health = clamp(life.health - 2); return `${life.family.kids.slice(-1)[0].name}이(가) 태어났습니다.`; } },
          { label: "넓은 집으로 옮긴 뒤에", hint: "미룬다", autoWeight: tight ? 2 : 0.5, apply: () => "조금 더 기다려 보기로 했습니다." },
        ],
      };
    },
  },
  {
    id: "job_move",
    weight: (l) => (working(l) && l.jobYears >= 3 && l.year - (l.flags.offerYear ?? 0) >= 6 && ["office", "dev", "pro", "tech", "public"].includes(l.jobId) ? 1 : 0),
    build: (l) => {
      const to = pick(l.rng, DISTRICTS.filter((d) => d.id !== l.workDistrict)).id;
      return {
        id: "job_move", tier: "life", sceneId: "evt_job_offer",
        title: `회사에서 ${districtName(to)} 사무소로 가라고 합니다.`,
        body: `급여는 오릅니다. 출퇴근은 ${commuteOf(l)}분에서 ${Math.max(10, require_commute(l.home.district, to))}분이 됩니다.`,
        options: [
          { label: "간다", hint: "소득 +12% · 출퇴근이 바뀐다", autoWeight: 1, apply: (life) => { life.flags.offerYear = life.year; life.workDistrict = to; life.income = Math.round(life.income * 1.12); life.learn = clamp(life.learn + 2); return `${districtName(to)}(으)로 출근하게 됐습니다.`; } },
          { label: "집 가까운 회사로 옮긴다", hint: "소득 −8% · 출퇴근이 짧아진다", autoWeight: 1, apply: (life) => { life.flags.offerYear = life.year; life.workDistrict = life.home.district; life.income = Math.round(life.income * 0.92); life.gak = clamp(life.gak + 2); return "걸어서 출근하는 회사로 옮겼습니다."; } },
        ],
      };
    },
  },
  {
    id: "help_kid",
    weight: (l, w) => (l.family.kids.some((k) => k.married) && netWorth(l, w) > 50000 && !l.flags.helpedKid ? 1.5 : 0),
    build: (l) => {
      const k = l.family.kids.find((x) => x.married)!;
      return {
        id: "help_kid", tier: "life", sceneId: "evt_help_kid",
        title: `${k.name}이(가) 신혼집 이야기를 조심스럽게 꺼냈습니다.`,
        body: "서울 집값은 당신이 처음 집을 구할 때보다 훨씬 높아졌습니다.",
        options: [
          { label: "1억을 보태 준다", hint: "현금 −1억 · 곁 ↑↑", cost: 10000, autoWeight: 1, apply: (life) => { life.flags.helpedKid = 1; life.cash -= 10000; life.gak = clamp(life.gak + 10); return `${k.name}의 신혼집 현관에 당신이 고른 신발장이 놓였습니다.`; } },
          { label: "각자의 힘으로", hint: "곁 −", autoWeight: 1, apply: (life) => { life.flags.helpedKid = 1; life.gak = clamp(life.gak - 4); return "\"우리도 그렇게 시작했어\"라고 말했습니다."; } },
        ],
      };
    },
  },
  {
    id: "grandkids", auto: true,
    weight: (l) => (l.family.kids.some((k) => k.kids > 0) && l.home.tenure !== "nursing" ? 1.2 : 0),
    build: (l) => {
      const rooms = PROP_TYPES[l.home.type].rooms;
      return {
        id: "grandkids", tier: "life", sceneId: "evt_grandkids",
        title: "명절에 손주들이 온다고 합니다.",
        body: rooms >= 3 ? "방이 넉넉해서 모두 하룻밤 자고 가기로 했습니다." : "방이 좁아서 저녁만 먹고 가기로 했습니다.",
        options: [
          { label: "음식을 잔뜩 준비한다", hint: "곁 ↑ · 건강 −", autoWeight: 2, apply: (life) => { life.gak = clamp(life.gak + (rooms >= 3 ? 7 : 4)); life.health = clamp(life.health - 1); return "냉장고가 반찬통으로 가득 찼다가, 하루 만에 비었습니다."; } },
          { label: "동네 식당에서 만난다", hint: "곁 ↑ · 현금 −100만", cost: 100, autoWeight: 1, apply: (life) => { life.gak = clamp(life.gak + 4); life.cash -= 100; return "단골 갈빗집 사장님이 손주들에게 사이다를 주셨습니다."; } },
        ],
      };
    },
  },
  {
    id: "tenant_call", auto: true,
    weight: (l) => (l.props.some((p) => p.mode === "rent") ? 0.9 : 0),
    build: (l) => {
      const p = l.props.find((x) => x.mode === "rent")!;
      return {
        id: "tenant_call", tier: "micro", sceneId: "evt_tenant_call",
        title: `${districtName(p.district)} 집 세입자에게서 전화가 왔습니다.`,
        body: `${p.tenant ?? "세입자"}입니다. "보일러가 안 돌아가요. 아기가 있어서요."`,
        options: [
          { label: "바로 고쳐 준다", hint: "현금 −300만 · 오래 살 세입자", cost: 300, autoWeight: 2, apply: (life) => { life.cash -= 300; return "세입자가 감사 문자와 함께 귤 한 상자를 보냈습니다."; } },
          { label: "다음 달에 고친다", hint: "세입자가 떠날 수도", autoWeight: 1, apply: (life) => { if (chance(life.rng, 0.4)) { p.mode = "vacant"; p.tenant = undefined; return "세입자가 계약 끝나자마자 나갔습니다. 집이 비었습니다."; } return "한 달 동안 전기장판으로 버텼다고 했습니다."; } },
        ],
      };
    },
  },
  {
    id: "study",
    weight: (l) => (working(l) && !l.studying && l.age >= 26 && l.age <= 45 && l.jobId !== "pro" && yeoyu(l).time >= 40 ? 0.6 + (yeoyu(l).time >= 60 ? 0.8 : 0) : 0),
    build: (l) => {
      const target = l.learn >= 60 ? "pro" : "dev";
      return {
        id: "study", tier: "life", sceneId: "evt_study",
        title: commuteOf(l) <= 30 ? "퇴근하고도 저녁이 깁니다." : "퇴근길 지하철에서 학원 광고를 봤습니다.",
        body: `${jobById(target).name}이(가) 되는 길은 2~3년의 밤을 요구합니다.`,
        options: [
          { label: "공부를 시작한다", hint: `배움 ↑ · 소득 −15% · 성공하면 ${jobById(target).name}`, autoWeight: 1, apply: (life) => { life.studying = { target, years: target === "pro" ? 3 : 2 }; return "책상 위에 두꺼운 책이 쌓이기 시작했습니다."; } },
          { label: "지금 일에 집중한다", hint: "변화 없음", autoWeight: 3, apply: () => "광고에서 눈을 돌렸습니다." },
        ],
      };
    },
  },
  {
    id: "pet", auto: true,
    weight: (l) => (l.phase === "adult" && !l.family.pet && l.age < 70 && l.home.tenure !== "parents" ? 0.4 + (l.family.married ? 0 : 0.4) : 0),
    build: (l) => ({
      id: "pet", tier: "micro", sceneId: "evt_pet",
      title: "단지 화단에서 작은 울음소리가 들렸습니다.",
      body: l.home.tenure === "own" ? "어미를 잃은 새끼 한 마리가 떨고 있습니다." : "어미를 잃은 새끼 한 마리. 계약서에 '반려동물 금지'가 있었던가요.",
      options: [
        { label: "데려온다", hint: "곁 ↑ · 지출 소폭 ↑", autoWeight: 1, apply: (life) => { const k = adoptPet(life); life.gak = clamp(life.gak + 6); life.mind = clamp(life.mind + 4); return `${k} 한 마리가 식구가 됐습니다.`; } },
        { label: "보호소에 연락한다", hint: "변화 없음", autoWeight: 2, apply: () => "보호소 직원이 와서 데려갔습니다." },
      ],
    }),
  },
  {
    id: "checkup",
    weight: (l) => (l.age >= 40 && l.health < 62 && l.home.tenure !== "nursing" && !l.scheduled.some((x) => x.id.startsWith("checkup")) ? 0.6 : 0),
    build: (l) => ({
      id: "checkup", tier: "micro", sceneId: "evt_checkup",
      title: "건강검진 결과지에 빨간 글씨가 몇 줄 있었습니다.",
      body: commuteOf(l) > 50 ? "의사는 \"출퇴근만 줄여도 좋아질 텐데요\"라고 말했습니다." : "의사는 \"좀 쉬세요\"라고 말했습니다.",
      options: [
        { label: "1년 쉬어 간다", hint: `건강 ↑↑ · 현금 −${fmtMoney(Math.round(l.income * 0.4))}`, cost: Math.round(l.income * 0.4), autoWeight: 2, apply: (life) => { life.health = clamp(life.health + 8); life.cash -= Math.round(life.income * 0.4); checkupStory.rest(life); return "아침마다 동네 산책로를 걸었습니다."; } },
        { label: "그냥 계속 일한다", hint: "건강 −", autoWeight: 1, apply: (life) => { life.health = clamp(life.health - 4); checkupStory.skip(life); return "결과지를 서랍에 넣었습니다."; } },
      ],
    }),
  },
  {
    id: "news", auto: true,
    weight: () => 0, // 뉴스는 봄마다 타임라인에 한 줄로 이미 나온다
    build: (_l, w) => ({
      id: "news", tier: "macro", sceneId: "evt_news_tv",
      title: "저녁 뉴스", body: w.news.join(" "),
      options: [
        { label: "지켜본다", hint: "변화 없음", autoWeight: 2, apply: () => "채널을 돌렸습니다." },
        { label: "주말에 발품을 판다", hint: "이번 계절 발품 +3", autoWeight: 1, apply: (life) => { life.legwork += 3; return "주말마다 부동산 사무실 문을 열었습니다."; } },
      ],
    }),
  },
];
DEFS.push(...STORY_DEFS, ...ADULT_DEFS, ...HOUSING_DEFS);

function require_commute(a: string, b: string) {
  const A = DISTRICTS.find((d) => d.id === a)!.pos, B = DISTRICTS.find((d) => d.id === b)!.pos;
  return a === b ? 15 : Math.round(20 + Math.hypot(A[0] - B[0], A[1] - B[1]) * 4.5);
}

/** 계절마다: 어린 시절엔 장면마다 하나, 어른이 되면 강제 이벤트는 반드시, 나머지는 확률 p */
export function drawEvent(life: Life, wy: WorldYear, p = 1): string | null {
  if (life.phase === "child") return CHILD[life.age] ? `child_${life.age}` : null;
  const seen = new Set(life.yearEvents);
  const neg = (d: EventDef) => !(life.noNegative && d.negative);
  const forced = DEFS.filter((d) => d.forced && !seen.has(d.id) && neg(d) && d.weight(life, wy) > 0);
  // 새해 결심은 봄의 첫 장면 (첫 출근이 먼저)
  const firstForced = forced.find((d) => d.id === "first_job") ?? forced.find((d) => d.id === "resolution") ?? forced[0];
  if (firstForced) return firstForced.id;
  // 예약된 뒷이야기: 그해가 되면 (봄이 아니어도) 먼저 나온다
  const due = life.scheduled.find((s) => s.year <= life.year);
  if (due) {
    life.scheduled = life.scheduled.filter((s) => s !== due);
    const d = DEFS.find((x) => x.id === due.id);
    if (d && d.weight(life, wy) > 0) {
      if (!neg(d)) { const st = life.stories.find((x) => x.id === storyOf(d.id) && !x.done); if (st) storyStep(life, st.id, st.title, "다행히 큰 탈 없이 지나갔다.", true); return null; }
      life.flags.dYear = (life.flags.dYear ?? 0) + 1;
      return d.id;
    }
    const open = life.stories.find((s) => s.id === storyOf(due.id) && !s.done);
    if (open) storyStep(life, open.id, open.title, "그 뒤로는 별일 없이 지나갔다.", true);
  }
  if (!chance(life.rng, p)) return null;
  // 선택을 요구하는 이야기는 한 해에 하나까지 (강제 고비는 따로). 사소한 일은 제한 없음
  const decidedThisYear = (life.flags.dYear ?? 0) >= 1;
  // 같은 이야기는 몇 해 쉬었다가 다시 (기본 3년)
  const cool = (d: EventDef) => life.year - (life.flags[`cd_${d.id}`] ?? -99) >= (COOLDOWN[d.id] ?? 3);
  const pool = DEFS.filter((d) => !d.forced && !d.scheduled && neg(d) && !seen.has(d.id) && cool(d) && (!decidedThisYear || d.auto) && d.weight(life, wy) > 0);
  if (!pool.length) return null;
  const lastId = life.flags.lastEvent ? DEFS[life.flags.lastEvent - 1]?.id : undefined;
  const ev = weighted(life.rng, pool, (d) => (d.id === lastId ? 0.1 : 1) * d.weight(life, wy) * (RES_BOOST[RES_CODES[(life.flags.resYear === life.year ? life.flags.res : 0) - 1]]?.[d.id] ?? 1));
  life.flags.lastEvent = DEFS.indexOf(ev) + 1;
  life.flags[`cd_${ev.id}`] = life.year;
  if (!ev.auto) life.flags.dYear = (life.flags.dYear ?? 0) + 1;
  return ev.id;
}
/** 새해 결심이 부르는 이야기 */
const RES_BOOST: Record<string, Record<string, number>> = {
  estate: { kkeul: 2, sell_timing: 2, first_home: 1.5, price_down: 1.3 },
  study: { study: 2.5, job_move: 1.5 },
  biz: { start_biz: 1.5, regular_shop: 1.5 },
  people: { dating: 1.6, local_chance: 1.8 },
  save: { car: 0.4, hobby: 0.4, vacation: 0.6 },
  exercise: { hobby: 1.4, vacation: 1.2 },
};
/** 뒷이야기 id → 줄거리 id */
const STORY_OF: Record<string, string> = { cheongyak: "house", checkup2: "checkup", checkup3: "checkup", lonely2: "lonely", kid_commute2: "kid_commute", local_chance2: "local_chance", friend_loan2: "friend_loan", retire_days: "retire", retire_days2: "retire" };
const storyOf = (id: string) => STORY_OF[id] ?? id;
const COOLDOWN: Record<string, number> = { resolution: 0, start_biz: 3, shop_promo: 2, kkeul: 2, sell_timing: 3, house_pressure: 3, meet_parents: 99, car: 4, hobby: 5, interior: 4, marriage: 2, dating: 2, vacation: 2, side_job: 4, side_job_end: 1, breakup: 2, lonely: 6, local_chance: 12, friend_loan: 8, kid_commute: 4, checkup: 8, study: 5, price_down: 5, first_home: 4, regular_shop: 8, job_move: 6, neighbor: 5, news: 1, grandkids: 3, price_up: 2, tenant_call: 3, mold: 2, commute_long: 3, room_short: 2, noise: 3, landlord_sells: 4 };

/** 사소한 일이면 바로 일어나게 하고 true. (타임라인에 한 줄) */
export function resolveAuto(id: string, life: Life, world: World): boolean {
  const def = DEFS.find((d) => d.id === id);
  if (!def?.auto) return false;
  const ev = buildEvent(id, life, world);
  const ok = ev.options.map((_, i) => i).filter((i) => !ev.options[i].offer && !optionLock(life, ev.options[i]));
  if (!ok.length) return true;
  const idx = weighted(life.rng, ok, (i) => ev.options[i].autoWeight ?? 1);
  const line = ev.options[idx].apply(life, wyNow(world, life));
  feed(life, "auto", `${ev.title} ${line}`);
  return true;
}

const cache = new Map<string, { seed: number; ev: GameEvent }>();
export function buildEvent(id: string, life: Life, world: World): GameEvent {
  const key = `${id}@${life.year}.${life.season}.${life.age}`;
  const cached = cache.get(key);
  if (cached && cached.seed === life.seed) return cached.ev;
  const wy = wyNow(world, life);
  let ev: GameEvent;
  if (id.startsWith("child_")) ev = CHILD[Number(id.slice(6))](life, wy, world);
  else ev = (DEFS.find((x) => x.id === id) ?? DEFS[DEFS.length - 1]).build(life, wy, world);
  cache.set(key, { seed: life.seed, ev });
  return ev;
}

export { sellQuiet, rollTags };
