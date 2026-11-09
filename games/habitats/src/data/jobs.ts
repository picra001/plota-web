// 직업 원형 — 서울 첫 직업 분포와 소득은 프로토타입용 [추론] 임시값. 금액 단위: 만원/년

export interface JobDef {
  id: string;
  name: string;
  /** 서울 25세 첫 직업 비중(가중치) [추론] */
  share: number;
  /** 첫해 연 소득 */
  income: number;
  /** 연 소득 상승률(경력) */
  growth: number;
  /** 해마다 소득 흔들림(표준편차 비율) */
  volatility: number;
  /** 해마다 실직·폐업 확률 */
  layoff: number;
  /** 건강 기본 소모(연) */
  healthDrain: number;
  /** 곁 기본 소모(연) — 바쁠수록 큼 */
  gakDrain: number;
  /** 정년(이 나이부터 은퇴 이벤트) */
  retireAge: number;
  /** 시작 질문 성향 태그 */
  tags: string[];
  /** 명함 한 줄 */
  card: string;
}

export const JOBS: JobDef[] = [
  { id: "office", name: "회사원", share: 30, income: 3800, growth: 0.04, volatility: 0.03, layoff: 0.02, healthDrain: 1.2, gakDrain: 0.8, retireAge: 58, tags: ["steady", "people"], card: "○○주식회사 사원" },
  { id: "service", name: "서비스·판매직", share: 20, income: 2900, growth: 0.025, volatility: 0.06, layoff: 0.05, healthDrain: 1.4, gakDrain: 0.6, retireAge: 62, tags: ["people"], card: "매장 스태프" },
  { id: "tech", name: "생산·기술직", share: 12, income: 3500, growth: 0.03, volatility: 0.04, layoff: 0.03, healthDrain: 1.8, gakDrain: 0.5, retireAge: 60, tags: ["hands"], card: "현장 기술자" },
  { id: "dev", name: "개발자", share: 9, income: 4800, growth: 0.06, volatility: 0.08, layoff: 0.04, healthDrain: 1.5, gakDrain: 1.0, retireAge: 55, tags: ["study", "risk"], card: "소프트웨어 엔지니어" },
  { id: "public", name: "공무원·교사", share: 9, income: 3300, growth: 0.03, volatility: 0.01, layoff: 0.002, healthDrain: 0.8, gakDrain: 0.3, retireAge: 62, tags: ["steady", "study"], card: "공직자" },
  { id: "pro", name: "전문직", share: 4, income: 6500, growth: 0.06, volatility: 0.05, layoff: 0.01, healthDrain: 2.0, gakDrain: 1.4, retireAge: 68, tags: ["study"], card: "전문 자격 보유자" },
  { id: "free", name: "프리랜서·예술", share: 8, income: 2400, growth: 0.03, volatility: 0.25, layoff: 0.0, healthDrain: 1.0, gakDrain: 0.4, retireAge: 99, tags: ["risk", "hands"], card: "프리랜서" },
  { id: "self", name: "자영업", share: 8, income: 3600, growth: 0.02, volatility: 0.2, layoff: 0.06, healthDrain: 1.9, gakDrain: 1.0, retireAge: 70, tags: ["risk", "people"], card: "가게 사장" },
];

/** 게임 중 바뀔 수 있는 직업(전직 결과) */
export const LATER_JOBS: JobDef[] = [
  { id: "landlord", name: "임대업", share: 0, income: 0, growth: 0, volatility: 0, layoff: 0, healthDrain: 0.6, gakDrain: 0.2, retireAge: 99, tags: [], card: "임대사업자" },
  { id: "retired", name: "은퇴", share: 0, income: 0, growth: 0, volatility: 0, layoff: 0, healthDrain: 0.3, gakDrain: -0.5, retireAge: 999, tags: [], card: "은퇴" },
  { id: "child", name: "학생", share: 0, income: 0, growth: 0, volatility: 0, layoff: 0, healthDrain: 0, gakDrain: 0, retireAge: 999, tags: [], card: "학생" },
  { id: "jobless", name: "구직 중", share: 0, income: 0, growth: 0, volatility: 0, layoff: 0, healthDrain: 0.5, gakDrain: 0, retireAge: 999, tags: [], card: "구직 중" },
];

export const ALL_JOBS = [...JOBS, ...LATER_JOBS];
export const jobById = (id: string) => ALL_JOBS.find((j) => j.id === id)!;

/** 시작 질문 (§3 시작: 몇 가지 선택 → 직업 결정) */
export interface StartQuestion {
  id: string;
  text: string;
  options: { label: string; tag: string; effect: Partial<Record<"learn" | "health" | "mind", number>> }[];
}

export const START_QUESTIONS: StartQuestion[] = [
  {
    id: "school",
    text: "학창 시절, 당신이 가장 오래 붙들고 있던 것은?",
    options: [
      { label: "문제집과 밤늦은 독서실", tag: "study", effect: { learn: 12, health: -4 } },
      { label: "운동장과 친구들", tag: "people", effect: { health: 8, mind: 4 } },
      { label: "무언가 만들고 고치는 일", tag: "hands", effect: { learn: 5, mind: 5 } },
    ],
  },
  {
    id: "twenty",
    text: "스무 살, 집을 나서며 바랐던 것은?",
    options: [
      { label: "흔들리지 않는 하루", tag: "steady", effect: { mind: 4 } },
      { label: "누구보다 빨리 올라가기", tag: "risk", effect: { learn: 4, mind: -2 } },
      { label: "좋은 사람들과 함께", tag: "people", effect: { mind: 6 } },
    ],
  },
  {
    id: "first",
    text: "첫 일자리를 고를 때 마지막으로 본 것은?",
    options: [
      { label: "월급과 승진", tag: "study", effect: {} },
      { label: "정년까지 다닐 수 있는지", tag: "steady", effect: {} },
      { label: "내가 좋아하는 일인지", tag: "risk", effect: { mind: 4 } },
    ],
  },
];

/** 가정 형편 — 무작위 (출발점, 고를 수 없음) [추론] */
export const FAMILY_BACKGROUNDS = [
  { id: "tight", label: "빠듯한 집", weight: 33, startCash: 0, parentHelp: 0, story: "부모님은 1997년 겨울에 가게를 접었고, 당신은 그 뒤로 이사를 네 번 했습니다." },
  { id: "middle", label: "보통의 집", weight: 55, startCash: 300, parentHelp: 3000, story: "부모님은 노원의 오래된 아파트에서 당신을 키웠습니다. 2008년에 산 그 집은 아직 대출이 남아 있습니다." },
  { id: "rich", label: "넉넉한 집", weight: 12, startCash: 3000, parentHelp: 15000, story: "부모님은 2000년대 초 강남에 집을 마련했습니다. 그 집값은 당신의 첫 월급보다 빨리 올랐습니다." },
];
