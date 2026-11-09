// 타임라인 — 레퍼런스 게임처럼 삶이 한 줄씩 쌓인다. (문장은 지금은 느낌 확인용, v6에서 보강)
import { DISTRICTS, PROP_TYPES, commuteMin } from "../data/seoul";
import { pick } from "./rng";
import type { FeedItem, Life } from "./types";

const MAX_FEED = 1600;

export function feed(life: Life, k: FeedItem["k"], t: string, extra: Partial<FeedItem> = {}) {
  life.feed.push({ y: life.year, s: life.season, age: life.age, k, t, ...extra });
  if (life.feed.length > MAX_FEED) life.feed.splice(0, life.feed.length - MAX_FEED);
}

const SEASON: string[][] = [
  ["단지 앞 벚꽃이 피었습니다.", "새 학기가 시작됐습니다. 학원 버스가 다시 다닙니다.", "베란다 창을 처음으로 활짝 열었습니다.", "이사 트럭이 골목에 자주 서 있었습니다.", "미세먼지가 심한 날이 이어졌습니다."],
  ["장마가 길었습니다. 벽 모서리를 자꾸 확인했습니다.", "에어컨 실외기 소리가 골목을 채웠습니다.", "휴가철이라 부동산 사무실이 한산했습니다.", "열대야에 잠을 설쳤습니다.", "한강에서 치킨을 먹었습니다."],
  ["가을 이사철, 현관문에 전단지가 끼워져 있었습니다.", "하늘이 높아졌습니다. 주말마다 동네를 걸었습니다.", "추석 연휴, 고향 가는 길이 막혔습니다.", "은행잎이 보도블록을 덮었습니다.", "관리비 고지서에 난방비 항목이 다시 생겼습니다."],
  ["첫눈이 왔습니다.", "연말 모임이 이어졌습니다.", "창문에 성에가 끼는 아침이 많아졌습니다.", "보일러를 켜는 날이 늘었습니다.", "올해도 달력이 한 장 남았습니다."],
];

/** 계절 한 줄: 계절 풍경 + 이 집·이 동네에서 나온 작은 사실 */
export function seasonLine(life: Life): string {
  const r = life.rng;
  const h = life.home;
  const tags = h.tags ?? [];
  const d = DISTRICTS.find((x) => x.id === h.district)!;
  const jeong = life.jeong[h.district] ?? 0;
  if (life.phase === "child") {
    const a = life.age;
    const pool = [
      a < 7 ? `${d.name}의 골목이 세상의 전부였습니다.` : `${d.name}의 학교까지 걸어서 다녔습니다.`,
      tags.includes("반지하") ? "창문 높이로 지나가는 사람들의 발이 보였습니다." : "베란다에서 내려다보면 놀이터가 보였습니다.",
      tags.includes("층간소음") ? "윗집 발소리에 엄마가 천장을 올려다봤습니다." : "저녁마다 같은 시간에 밥 짓는 냄새가 났습니다.",
      tags.includes("남향") ? "겨울에도 거실 바닥이 따뜻했습니다." : "겨울이면 창문에 뽁뽁이를 붙였습니다.",
      tags.includes("공원 앞") ? "공원에서 자전거를 배웠습니다." : "단지 앞 문방구에서 불량식품을 샀습니다.",
    ];
    const seen = new Set(life.feed.map((f) => f.t));
    const fresh = pool.filter((x) => !seen.has(x));
    return pick(r, fresh.length ? fresh : pool);
  }
  const s = life.perYear === 1 ? 3 : life.season;
  const pool: string[] = [...SEASON[s]];
  const c = life.workDistrict && !["retired", "jobless", "landlord"].includes(life.jobId) ? commuteMin(h.district, life.workDistrict) - (tags.includes("역세권") ? 8 : 0) : 0;
  if (h.tenure === "nursing") return pick(r, ["요양원 창가에서 계절이 바뀌는 걸 봤습니다.", "같은 방 할머니와 화투를 쳤습니다.", "주말이면 면회실 문 쪽을 자꾸 보게 됩니다.", "옛 동네 이야기를 간병인에게 또 했습니다."]);
  if (c >= 60) pool.push("출근길 지하철에서 서서 졸았습니다.", "막차를 놓쳐 택시비가 아까웠습니다.");
  if (c > 0 && c <= 25) pool.push("퇴근하고도 해가 남아 동네를 걸었습니다.", "점심을 집에 와서 먹은 날도 있었습니다.");
  if (jeong >= 3) pool.push(`${d.name}에 산 지 ${jeong}년, 단골 가게가 생겼습니다.`);
  if (jeong >= 8) pool.push("시장 아주머니가 이름을 불러 주었습니다.", "동네 산책길의 나무들이 하나하나 익숙합니다.");
  if (jeong <= 1) pool.push("아직 동네 지리가 낯섭니다. 마트 가는 길을 두 번 헤맸습니다.");
  if (tags.includes("남향")) pool.push("오후 내내 거실에 볕이 길게 들어왔습니다.");
  if (tags.includes("북향") && s === 3) pool.push("북향 방은 한낮에도 불을 켜야 했습니다.");
  if (tags.includes("층간소음")) pool.push("윗집 발소리에 잠을 설쳤습니다.");
  if (tags.includes("곰팡이") && s === 1) pool.push("벽 모서리 얼룩이 조금 더 커졌습니다.");
  if (tags.includes("공원 앞")) pool.push("공원 벤치에서 커피를 마셨습니다.");
  if (tags.includes("큰길가")) pool.push("밤새 버스 지나가는 소리가 들렸습니다.");
  if (tags.includes("언덕")) pool.push("언덕길을 오르며 숨을 골랐습니다.");
  if (tags.includes("엘리베이터 없음") && life.age >= 60) pool.push("생수 묶음을 들고 계단을 오르다 쉬었습니다.");
  if (PROP_TYPES[h.type].rooms === 1) pool.push("좁은 방에 빨래 건조대를 펼치면 지나갈 곳이 없었습니다.");
  if (h.tenure === "own") pool.push("내 집 벽에 처음으로 액자를 걸었습니다.", "관리비 고지서를 보며 한숨 쉬었다가 웃었습니다.");
  if (h.tenure === "parents") pool.push("엄마가 차려 준 아침을 먹고 나갔습니다.", "어릴 때 쓰던 책상에서 아직 일기를 씁니다.");
  if (h.tenure === "withkid") pool.push("손주가 등교하며 손을 흔들었습니다.");
  if (life.family.pet) pool.push("반려동물이 창가에서 햇볕을 쬐었습니다.");
  for (const k of life.family.kids) {
    const a = life.year - k.born;
    if (a === 8 && s === 0) return `${k.name}이(가) ${d.name}의 초등학교에 입학했습니다.`;
    if (a === 20 && s === 0) return `${k.name}이(가) 스무 살이 됐습니다.`;
    if (a >= 1 && a <= 6) pool.push(`${k.name}이(가) 거실을 뛰어다녔습니다.`);
    if (a >= 7 && a <= 12 && jeong >= 3) pool.push(`${k.name}이(가) 동네 친구를 데리고 왔습니다.`);
    if (a >= 14 && a <= 18) pool.push(`${k.name}의 방문이 닫혀 있는 날이 많아졌습니다.`);
  }
  if (life.props.some((p) => p.mode === "rent")) pool.push("세 준 집 관리비 정산 문자가 왔습니다.");
  if (life.gak < 30) pool.push("주말 내내 아무와도 말하지 않았습니다.", "휴대폰 연락처를 넘기다 그냥 내려놓았습니다.", "편의점 직원과 나눈 인사가 오늘 한 말의 전부였습니다.");
  if (life.gak >= 75) pool.push("주말마다 누군가와 밥을 먹었습니다.", "단톡방 알림이 끊이지 않았습니다.");
  const recent = new Set(life.feed.slice(-12).map((f) => f.t));
  const fresh = pool.filter((x) => !recent.has(x));
  return pick(r, fresh.length ? fresh : pool);
}

/** 나이 고비 */
export function milestone(life: Life): string | null {
  const a = life.age;
  const m: Record<number, string> = { 30: "서른이 됐습니다.", 40: "마흔이 됐습니다. 건강검진 항목이 늘었습니다.", 50: "쉰이 됐습니다.", 60: "환갑입니다.", 70: "일흔이 됐습니다.", 80: "여든이 됐습니다.", 90: "아흔이 됐습니다.", 100: "백 살이 됐습니다." };
  return m[a] ?? null;
}
