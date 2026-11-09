// 서울 데이터 — 모든 수치는 프로토타입용 [추론] 임시값. 기획 확정 후 공식 통계로 교체.
// 금액 단위: 만원

export interface District {
  id: string;
  name: string;
  /** 2026년 기준 아파트 84㎡ 대표가 [추론] */
  apt84: number;
  /** 동네 성격 한 줄 */
  vibe: string;
  /** 연 가격 변동 민감도(1 = 서울 평균) */
  beta: number;
  /** 출퇴근 부담 0~3 (도심 업무지구 기준) */
  commute: number;
  /** 지도상 위치(km 격자, 출퇴근 시간 계산용) [추론] */
  pos: [number, number];
}

export const DISTRICTS: District[] = [
  { id: "gangnam", name: "강남", apt84: 300000, vibe: "학원가 불빛이 늦게까지 꺼지지 않는 동네", beta: 1.3, commute: 1, pos: [8, 2] },
  { id: "mapo", name: "마포", apt84: 170000, vibe: "한강 바람과 오래된 골목이 섞인 동네", beta: 1.1, commute: 1, pos: [2, 5] },
  { id: "seongsu", name: "성수", apt84: 180000, vibe: "공장 벽돌 사이로 카페가 생겨나는 동네", beta: 1.2, commute: 1, pos: [8, 5] },
  { id: "eunpyeong", name: "은평", apt84: 90000, vibe: "산이 가깝고 아이들 소리가 많은 동네", beta: 0.9, commute: 2, pos: [1, 9] },
  { id: "nowon", name: "노원", apt84: 80000, vibe: "베란다마다 이불이 널린 큰 아파트 단지", beta: 0.9, commute: 3, pos: [9, 11] },
  { id: "gwanak", name: "관악", apt84: 85000, vibe: "언덕 위 원룸과 고시원이 빼곡한 동네", beta: 0.8, commute: 2, pos: [4, 0] },
];

export type PropType = "apt84" | "apt59" | "villa" | "officetel" | "shop";

export interface PropTypeDef {
  id: PropType;
  name: string;
  /** 아파트84 대비 가격 비율 */
  priceRatio: number;
  /** 연 임대수익률(월세 기준) [추론] */
  rentYield: number;
  /** 전세가율 [추론] */
  jeonseRatio: number;
  /** 거주 가능 여부 */
  livable: boolean;
  /** 거주 시 방 수(곁·손주 방문에 영향) */
  rooms: number;
  /** 가격 변동 민감도 */
  beta: number;
}

export const PROP_TYPES: Record<PropType, PropTypeDef> = {
  apt84: { id: "apt84", name: "아파트 84㎡", priceRatio: 1, rentYield: 0.022, jeonseRatio: 0.55, livable: true, rooms: 3, beta: 1 },
  apt59: { id: "apt59", name: "아파트 59㎡", priceRatio: 0.78, rentYield: 0.025, jeonseRatio: 0.58, livable: true, rooms: 2, beta: 1 },
  villa: { id: "villa", name: "빌라 2층", priceRatio: 0.3, rentYield: 0.035, jeonseRatio: 0.75, livable: true, rooms: 2, beta: 0.5 },
  officetel: { id: "officetel", name: "오피스텔 원룸", priceRatio: 0.2, rentYield: 0.045, jeonseRatio: 0.8, livable: true, rooms: 1, beta: 0.4 },
  shop: { id: "shop", name: "1층 상가", priceRatio: 0.55, rentYield: 0.042, jeonseRatio: 0, livable: false, rooms: 0, beta: 0.8 },
};

/** 2026년 기준 대출·세금 정책 [추론: 2025~2026 수도권 규제 기조를 단순화] */
export const POLICY_2026 = {
  ltvNoHome: 0.7, // 무주택(생애최초 포함) LTV
  ltvOneHome: 0.4, // 1주택 추가 매수
  ltvMulti: 0.0, // 2주택 이상 추가 매수(주담대 불가)
  loanCap: 60000, // 수도권 주담대 한도 6억
  dsr: 0.4, // 총부채원리금상환비율 한도
  acqTax: [0.02, 0.08, 0.12], // 1채 / 2채째 / 3채째 이상 취득세 [추론]
  rate: 0.04, // 주담대 금리 출발점
};

/** 나라 성격 프로필 — 미래 생성 규칙 (§5.2.2) [추론] */
export const KOREA_PROFILE = {
  trend: 0.036, // 장기 추세 (모든 금액은 2026년 돈 가치 기준 = 실질)
  cycleAmp: 0.07,
  cyclePeriod: [7, 11] as [number, number],
  noise: 0.035,
  policyFreq: 0.35, // 해마다 정책 이벤트가 일어날 확률 (규제·완화가 자주 바뀜)
  crisisFreq: 0.03,
  rateMean: 0.035,
  rateVol: 0.007,
  rateSpikeFreq: 0.05, // 금리 급등 (해마다)
  boomFreq: 0.08, // 금리가 낮을 때 과열이 시작될 확률 (해마다)
  e0: 84, // 기대수명 [추론]
};

/** 월세 거주 비용: 매가 × 이 비율 / 년 [추론] */
export const MONTHLY_RENT_RATIO = 0.03;

export const START_YEAR = 2026;
export const START_AGE = 25;

/** 출퇴근 시간(분) [추론]: 같은 동네 15분, 1km마다 약 4.5분 */
export function commuteMin(a: string, b: string): number {
  if (a === b) return 15;
  const A = DISTRICTS.find((d) => d.id === a)!.pos, B = DISTRICTS.find((d) => d.id === b)!.pos;
  return Math.round(20 + Math.hypot(A[0] - B[0], A[1] - B[1]) * 4.5);
}

/** 집의 성격 태그 — 몇 개 안 되게. 효과는 life.ts의 연말 계산과 feed 문장에 쓰인다 */
export const HOME_TAGS = ["남향", "북향", "층간소음", "곰팡이", "역세권", "언덕", "엘리베이터 없음", "공원 앞", "큰길가", "반지하"] as const;
export type HomeTag = (typeof HOME_TAGS)[number];

/** 일터가 있는 동네 [추론]: 회사원·개발자·전문직은 업무지구, 서비스·자영업은 사는 동네 근처 */
export const WORK_HUBS = ["gangnam", "mapo", "seongsu"];

/** 어린 시절 장면이 멈추는 나이 */
/** 어린 시절 멈추는 나이: 19 진로 · 20 돈 버는 방식 · 21 여행 · 22 첫 연애 · 23 독립 */
export const CHILD_STOPS = [0, 4, 7, 10, 13, 16, 19, 20, 21, 22, 23];
export const BIRTH_YEAR = 2001;
