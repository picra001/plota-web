import type { PropType } from "../data/seoul";
import type { Rng } from "./rng";

export interface WorldYear {
  year: number;
  /** 서울 가격지수 (2026 = 1) */
  index: number;
  /** 그해 가격 변동률 */
  change: number;
  rate: number;
  ltvNoHome: number;
  ltvOneHome: number;
  ltvMulti: number;
  loanCap: number;
  acqTax: number[];
  /** 그해 뉴스 (정책·매크로) */
  news: string[];
  /** 동네별 추가 변동(누적 배수) */
  districtMul: Record<string, number>;
  /** 시장 국면 */
  regime?: "normal" | "boom" | "bust";
}

export interface World {
  seed: number;
  years: WorldYear[];
}

export type Tenure = "monthly" | "jeonse" | "own" | "parents" | "nursing" | "withkid";

export interface Property {
  uid: string;
  district: string;
  type: PropType;
  /** 매수 당시 기준가(2026 지수 1 기준으로 환산한 기본가) */
  basePrice: number;
  boughtYear: number;
  boughtPrice: number;
  loan: number;
  /** 숨은 상태: 발품으로 드러남 */
  condition: "good" | "normal" | "bad";
  mode: "live" | "rent" | "vacant";
  /** 임대 중 임차인 이름(간단) */
  tenant?: string;
  /** 세 놓는 방식: 월세(수입) / 전세(보증금을 받아 두고 수입 없음 = 갭) */
  lease?: "monthly" | "jeonse";
  /** 세입자에게 돌려줘야 할 전세 보증금 */
  dep?: number;
  /** 전세 계약 만료 연도 (2년마다 다시 계약) */
  leaseEnd?: number;
}

export interface Listing {
  uid: string;
  district: string;
  type: PropType;
  basePrice: number;
  /** 시세 대비 호가 배율 */
  askMul: number;
  condition: "good" | "normal" | "bad";
  revealed: boolean;
  note: string;
}

export interface Home {
  tenure: Tenure;
  district: string;
  type: PropType;
  /** 전세 보증금 or 월세 연간 비용 */
  deposit: number;
  yearlyRent: number;
  /** 자가라면 보유 부동산 uid */
  propUid?: string;
  sinceYear: number;
  /** 다음 계약 만료 연도(임차일 때) */
  contractEnd?: number;
  condition: "good" | "normal" | "bad";
  /** 집의 성격 (남향, 층간소음, 역세권 …) */
  tags: string[];
}

export interface HomeRecord {
  district: string;
  type: PropType;
  tenure: Tenure;
  from: number;
  to?: number;
  memory: string;
  tags?: string[];
}

export interface Family {
  married: boolean;
  spouseName?: string;
  kids: { name: string; born: number; married: boolean; kids: number; independent: boolean }[];
  parentsAlive: number; // 0~2
  friends: number; // 0~10
  pet: boolean;
}

export interface YearLog {
  year: number;
  age: number;
  learn: number;
  health: number;
  mind: number;
  wealth: number; // 곳간 점수
  netWorth: number;
  gak: number;
  /** 돈·시간 점수(그해 연말 기준), 행복 */
  money?: number;
  time?: number;
  freeH?: number;
  happy?: number;
  photo: string[]; // 연말 가족사진 속 사람들
  photoPlace: string;
  headline: string;
}

export type Focus = "work" | "people" | "rest" | "home" | "save";

export interface Life {
  version: 7;
  /** 어린 시절(프롤로그) / 어른 */
  phase: "child" | "adult";
  birthYear: number;
  /** 일터가 있는 동네 (없으면 null) */
  workDistrict: string | null;
  /** 동네와의 정: 그 동네에서 산 햇수 */
  jeong: Record<string, number>;
  /** 부모님이 사는 동네와 집 */
  parentsHome: { district: string; type: PropType; owned: boolean };
  /** 마지막 거처 선택 */
  care?: "home" | "kid" | "nursing";
  /** 비교 인물 (동기·친구·형제) */
  peers?: unknown;
  /** 곁의 사람들 (최대 8명) */
  people: Person[];
  /** 이어지는 이야기 (줄거리) */
  stories: Story[];
  /** 몇 해 뒤 이어질 이야기 */
  scheduled: { year: number; id: string; note?: string }[];
  /** 지금 하는 일의 세부 (공고에서 고른 직장) */
  work?: { post?: string; title: string; hours: number; stress: number; shift?: string; growth?: number; layoff?: number };
  /** 스무 살 무렵 알바 */
  parttime?: string[];
  /** 설정: 부정적 일 빼기 */
  noNegative?: boolean;
  seed: number;
  rng: Rng;
  name: string;
  year: number;
  age: number;
  alive: boolean;
  deathAge?: number;
  background: string;
  parentsStory: string;
  // 보이는 스탯
  learn: number;
  /** 운 (숨김): 경험·인연이 쌓는다. 성공이 걸린 일에 쓰인다 */
  luck: number;
  health: number;
  mind: number;
  // 곳간 = 현금 + 부동산 - 대출 (+ 전세보증금)
  cash: number;
  // 간접 스탯
  gak: number;
  // 직업
  jobId: string;
  jobYears: number;
  income: number;
  jobHistory: { jobId: string; from: number; to?: number }[];
  studying?: { target: string; years: number };
  // 집
  home: Home;
  homeHistory: HomeRecord[];
  props: Property[];
  listings: Listing[];
  legwork: number; // 올해 남은 발품
  everOwned: number;
  lostHome: boolean;
  regained: boolean;
  // 가족
  family: Family;
  // 올해
  focus: Focus | null;
  /** 지금 계절 0=봄 1=여름 2=가을 3=겨울 (빠른 모드에선 0 하나) */
  season: number;
  /** 한 해에 멈추는 횟수: 4(계절 모드, 기본) 또는 1(빠른 모드) */
  perYear: number;
  /** 올해 이미 나온 이야기 */
  yearEvents: string[];
  pendingEventId: string | null;
  eventChoice: number | null;
  log: YearLog[];
  story: string[]; // 올해 쌓인 문장
  feed: FeedItem[]; // 타임라인
  lastReport?: YearReport;
  flags: Record<string, number>;
  message?: string;
}

export interface Person {
  id: string;
  role: "parent" | "sibling" | "friend" | "classmate" | "coworker" | "neighbor" | "parentFriend" | "club" | "partner";
  name: string;
  label?: string;
  district: string;
  closeness: number;
  trust: number;
  ambition: number;
  wealth: "tight" | "middle" | "rich";
  since: number;
  gone?: boolean;
  news?: { year: number; text: string; kind: "home" | "marry" | "kid" | "job" | "move" | "loss"; district?: string }[];
}

export interface Story {
  id: string;
  title: string;
  /** 단계별 한 줄 (연도와 함께) */
  steps: { year: number; age: number; text: string }[];
  done?: boolean;
}

export interface FeedItem {
  y: number; s: number; age: number;
  k: "season" | "event" | "action" | "yearend" | "milestone" | "news" | "death" | "money" | "rent" | "peer" | "stat" | "routine" | "hunt" | "auto";
  t: string;
  img?: string;
  sub?: string;
  /** 연말: 사진 인원, 스탯 변화(배움·건강·마음·곳간), 순자산 */
  photo?: number; d?: number[]; nw?: number; lines?: string[];
}

export interface YearReport {
  year: number;
  age: number;
  lines: string[];
  delta: { learn: number; health: number; mind: number; wealth: number };
  income: number;
  spend: number;
  rentIncome: number;
  interest: number;
  netWorth: number;
  died: boolean;
}

export interface EventOption {
  label: string;
  hint: string;
  /** 고르려면 필요한 현금(만원). 모자라면 고를 수 없다 */
  cost?: number;
  /** 이사·매수로 이어지는 선택지면 그 집 */
  offer?: HomeOffer;
  /** 결과가 운에 걸린 선택지 (🎲) */
  luck?: boolean;
  /** 고를 수 없는 이유 (조건 미달 등, 미리 정해진 것) */
  lock?: string;
  /** 고르려면 필요한 체력·지식·여유 시간 */
  need?: { health?: number; learn?: number; freeH?: number; biz?: number };
  /** 이번 계절의 부동산 일(1회)을 쓰는 선택지 */
  deal?: boolean;
  /** 엔진이 적용 */
  apply: (life: Life, w: WorldYear) => string;
  /** 자동 플레이 가중치 */
  autoWeight?: number;
}

/** 이야기 속에서 제안되는 집 하나 */
export interface HomeOffer {
  district: string;
  type: PropType;
  tenure: "monthly" | "jeonse" | "buy";
  base: number;
  price: number;
  deposit: number;
  yearlyRent: number;
  loan: number;
  cashNeeded: number;
  condition: "good" | "normal" | "bad";
  tags: string[];
  commute: number;
  rooms: number;
  label: string;
}

export interface GameEvent {
  id: string;
  tier: "micro" | "district" | "macro" | "life";
  title: string;
  body: string;
  sceneId: string;
  options: EventOption[];
}
