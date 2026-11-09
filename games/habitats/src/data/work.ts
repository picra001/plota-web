// 일의 세부 — 알바와 첫 직장 공고. 급여·근무 시간·위치·스트레스가 다르다. 금액: 만원 [추론]
import type { Life } from "../engine/types";

export interface Need { health?: number; learn?: number; freeH?: number; biz?: number }

export interface PartTime {
  id: string;
  name: string;
  /** 일하는 곳 */
  place: string;
  /** 주당 시간 */
  hoursWeek: number;
  /** 월 급여 */
  monthly: number;
  /** 연간 체력 소모 */
  healthCost: number;
  /** 스트레스 0~3 */
  stress: number;
  need?: Need;
  /** 해마다 얻는 것 */
  gain: { learn?: number; rel?: number; biz?: number; luck?: number };
  note: string;
}

export const PARTTIMES: PartTime[] = [
  { id: "cafe", name: "카페", place: "동네", hoursWeek: 14, monthly: 60, healthCost: 0.3, stress: 1, gain: { rel: 1, biz: 0.4 }, note: "주말 오픈 · 단골 얼굴을 외운다" },
  { id: "conv", name: "편의점 야간", place: "동네", hoursWeek: 24, monthly: 100, healthCost: 1.8, stress: 1, gain: { biz: 0.3 }, note: "밤 10시~아침 6시 · 잠이 깨진다" },
  { id: "tutor", name: "과외", place: "학원가", hoursWeek: 8, monthly: 90, healthCost: 0.1, stress: 1, need: { learn: 62 }, gain: { learn: 1 }, note: "시급은 제일 높다 · 공부를 잘해야 구한다" },
  { id: "logis", name: "물류 상하차", place: "외곽 물류센터", hoursWeek: 16, monthly: 125, healthCost: 2.5, stress: 2, need: { health: 58 }, gain: {}, note: "하룻밤에 몇 톤 · 체력이 버텨야 한다" },
  { id: "dining", name: "고깃집 서빙", place: "번화가", hoursWeek: 18, monthly: 85, healthCost: 1, stress: 2, gain: { rel: 1, biz: 0.8 }, note: "사장님 어깨너머로 장사를 배운다" },
  { id: "academy", name: "학원 조교", place: "학원가", hoursWeek: 12, monthly: 65, healthCost: 0.2, stress: 1, need: { learn: 52 }, gain: { learn: 0.6 }, note: "채점과 질문 받기 · 공부와 이어진다" },
];
export const ptById = (id: string) => PARTTIMES.find((p) => p.id === id)!;

export interface JobPost {
  id: string;
  /** 직함 */
  title: string;
  /** 회사·현장 한 줄 */
  where: string;
  /** 직업 원형(jobs.ts) */
  base: string;
  /** 일터 동네. "home" = 집 근처 */
  district: string;
  /** 첫해 연봉 */
  salary: number;
  /** 하루 근무(야근 포함) */
  hours: number;
  /** 스트레스 0~3 */
  stress: number;
  /** 교대·야간 */
  shift?: "night" | "3교대";
  need?: Need & { college?: boolean };
  /** 합격이 운에 걸린 정도: 기본 합격 확률 (없으면 바로 합격) */
  pass?: number;
  /** 직업 원형보다 빠른/느린 승급, 실직 */
  growth?: number;
  layoff?: number;
  /** 첫 직업을 고를 때 끌리는 성향 */
  tags: string[];
  perk: string;
}

export const JOB_POSTS: JobPost[] = [
  { id: "bigco", title: "대기업 사무직", where: "강남 본사 · 공채", base: "office", district: "gangnam", salary: 4900, hours: 11, stress: 3, need: { learn: 72, college: true }, pass: 0.4, tags: ["steady", "study"], perk: "연봉·복지 최고 · 야근과 회식" },
  { id: "sme", title: "중소기업 사무직", where: "마포 오피스 · 수시 채용", base: "office", district: "mapo", salary: 3200, hours: 9.5, stress: 1, need: { learn: 45 }, tags: ["steady", "people"], perk: "칼퇴는 되는데 연봉이 더디다" },
  { id: "startup", title: "스타트업 개발자", where: "성수 공유오피스", base: "dev", district: "seongsu", salary: 4000, hours: 11.5, stress: 2, need: { learn: 62 }, growth: 0.08, layoff: 0.07, tags: ["study", "risk"], perk: "스톡옵션 · 회사가 망할 수도" },
  { id: "itbig", title: "IT 대기업 개발자", where: "강남 테크타워", base: "dev", district: "gangnam", salary: 5600, hours: 10.5, stress: 2, need: { learn: 80 }, pass: 0.35, tags: ["study"], perk: "업계 최고 대우 · 들어가기가 바늘구멍" },
  { id: "civil", title: "구청 공무원", where: "집 근처 구청 · 공채 시험", base: "public", district: "home", salary: 3000, hours: 8.5, stress: 1, need: { learn: 66 }, pass: 0.3, layoff: 0.002, tags: ["steady", "study"], perk: "정시 퇴근 · 평생 직장 · 박봉" },
  { id: "teacher", title: "중학교 교사", where: "노원 공립중 · 임용", base: "public", district: "nowon", salary: 3300, hours: 9, stress: 2, need: { learn: 72, college: true }, pass: 0.3, tags: ["study", "people"], perk: "방학이 있다 · 민원이 있다" },
  { id: "nurse", title: "대학병원 간호사", where: "은평 대학병원", base: "pro", district: "eunpyeong", salary: 4200, hours: 10, stress: 3, shift: "3교대", need: { learn: 60, health: 55, college: true }, tags: ["people", "study"], perk: "어디서든 일할 수 있다 · 3교대" },
  { id: "store", title: "프랜차이즈 매장 매니저", where: "관악 역세권 매장", base: "service", district: "gwanak", salary: 2900, hours: 10, stress: 2, tags: ["people"], perk: "가게 운영을 배운다 · 주말 근무" },
  { id: "factory", title: "생산 기술직", where: "노원 공장 · 현장", base: "tech", district: "nowon", salary: 3700, hours: 9.5, stress: 1, need: { health: 50 }, tags: ["hands"], perk: "기술이 쌓인다 · 몸이 고되다" },
  { id: "logimgr", title: "물류센터 야간 관리자", where: "은평 물류센터", base: "tech", district: "eunpyeong", salary: 3900, hours: 10, stress: 2, shift: "night", need: { health: 55 }, tags: ["hands", "steady"], perk: "야간 수당 · 낮과 밤이 바뀐다" },
  { id: "designer", title: "프리랜서 디자이너", where: "집 작업실", base: "free", district: "home", salary: 2500, hours: 8, stress: 2, need: { learn: 50 }, tags: ["risk", "hands"], perk: "출퇴근 없음 · 수입이 들쭉날쭉" },
  { id: "chef", title: "식당 주방 보조", where: "성수 핫플 식당", base: "service", district: "seongsu", salary: 2700, hours: 11, stress: 2, need: { health: 48 }, tags: ["hands", "people"], perk: "언젠가 내 가게 · 지금은 설거지" },
  { id: "shop", title: "동네 가게 창업", where: "우리 동네 골목", base: "self", district: "home", salary: 3400, hours: 12, stress: 3, need: { biz: 2 }, tags: ["risk", "people"], perk: "내 가게 · 현금 2,000만 · 쉬는 날 없음" },
];
export const postById = (id: string) => JOB_POSTS.find((p) => p.id === id);

/** 같은 직업 원형의 기본 근무 시간 (공고가 없을 때) */
export const BASE_HOURS: Record<string, number> = { office: 10, dev: 10.5, pro: 11, service: 10, tech: 9.5, public: 9.2, self: 12, free: 9.5 };
export const BASE_STRESS: Record<string, number> = { office: 2, dev: 2, pro: 3, service: 2, tech: 1, public: 1, self: 3, free: 2, landlord: 0, retired: 0, jobless: 2, child: 0 };

export const workDistrictOf = (l: Life, p: JobPost) => (p.district === "home" ? l.home.district : p.district);
