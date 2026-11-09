// 어른의 초반 선택 — 첫 직장 공고, 연애와 이별, 투잡, 휴가.
// 돈만이 아니라 시간·체력·스트레스를 맞바꾸는 선택들. 체력·지식·여유가 모자라면 고를 수 없다.
import { JOB_POSTS, postById, workDistrictOf, type JobPost } from "../data/work";
import { clamp, pick, weighted } from "./rng";
import type { EventOption, Life } from "./types";
import type { EventDef } from "./events";
import { changeJob, annualInterest, districtName, fmtMoney, luckChance, needLack, personalIncome, principalDue, spouseIncome, takePost } from "./life";
import { moveOpt } from "./events";
import { offersFor } from "./home";
import { commuteMin } from "../data/seoul";
import { working } from "./home";
import { makePerson, partnerOf, social, roleKo } from "./people";
import { storyStep } from "./stories";

const opt = (label: string, hint: string, apply: EventOption["apply"], extra: Partial<EventOption> = {}): EventOption => ({ label, hint, apply, autoWeight: 1, ...extra });
/** 실제 공고가 흔한 정도 [추론] */
const POST_SHARE: Record<string, number> = { sme: 3, bigco: 1, startup: 1.4, itbig: 0.6, civil: 1.2, teacher: 0.7, nurse: 0.8, store: 1.5, factory: 1.2, logimgr: 0.7, designer: 0.7, chef: 0.8, shop: 0.4 };
const tagsOf = (l: Life, p: JobPost) => p.tags.reduce((a, t) => a + (l.flags[`t_${t}`] ?? 0), 0);

function postOption(l: Life, p: JobPost): EventOption {
  const district = workDistrictOf(l, p);
  const commute = district === l.home.district ? 15 : commuteMin(l.home.district, district);
  const college = p.need?.college && l.flags.path !== 1;
  const passTxt = p.pass ? (p.pass + (l.luck - 50) / 120 + (l.learn - 50) / 100 >= 0.5 ? " · 합격 가능성 높음" : " · 합격 장담 못 함") : "";
  return {
    label: `${p.title} — ${p.where}`,
    hint: `연봉 ${fmtMoney(p.salary)} · 하루 ${p.hours}시간${p.shift ? ` (${p.shift === "night" ? "야간" : "3교대"})` : ""} · 출퇴근 ${commute}분 · 스트레스 ${"●".repeat(p.stress)}${"○".repeat(3 - p.stress)} · ${p.perk}${passTxt}`,
    need: p.need,
    lock: college ? "대학 졸업이 필요합니다" : undefined,
    luck: !!p.pass,
    cost: p.id === "shop" ? 2000 : undefined,
    autoWeight: 1 + tagsOf(l, p) * 0.5 + (p.pass ? -0.3 : 0),
    apply: (life) => {
      life.flags.firstJob = 1;
      if (p.id === "shop") life.cash -= 2000;
      if (p.pass && !luckChance(life, p.pass, { know: 1 })) {
        const back = postById(life.flags.path === 1 ? "sme" : "store")!;
        takePost(life, back);
        life.mind = clamp(life.mind - 3);
        storyStep(life, "first_job", "첫 직장", `${p.title}에 지원했다가 떨어졌다. ${back.title}(으)로 시작했다.`, true);
        return `${p.title} 불합격 문자를 받았습니다. 일주일 뒤 ${back.title}(으)로 첫 출근을 했습니다.`;
      }
      takePost(life, p);
      storyStep(life, "first_job", "첫 직장", `${p.title}(으)로 첫 출근. ${districtName(life.workDistrict!)}까지 ${commute}분.`, true);
      return `${districtName(life.workDistrict!)}의 ${p.where.split(" · ")[0]}, 첫 출근 날 사원증 사진이 어색하게 나왔습니다.`;
    },
  };
}

export const ADULT_DEFS: EventDef[] = [
  // 스물다섯, 공고를 고른다 (강제)
  {
    id: "first_job", forced: true,
    weight: (l) => (l.phase === "adult" && !l.flags.firstJob ? 1 : 0),
    build: (l) => {
      const eligible = JOB_POSTS.filter((p) => !needLack(l, p.need) && !(p.need?.college && l.flags.path !== 1));
      const locked = JOB_POSTS.filter((p) => !eligible.includes(p));
      const picks: JobPost[] = [];
      const pool = [...eligible];
      while (picks.length < 4 && pool.length) {
        const p = weighted(l.rng, pool, (x) => (POST_SHARE[x.id] ?? 1) * (1 + tagsOf(l, x) * 0.4) + (l.flags.path === 2 && ["factory", "logimgr", "store", "chef"].includes(x.id) ? 1.5 : 0) + (l.flags.path === 3 && ["designer", "shop", "chef"].includes(x.id) ? 1.5 : 0));
        picks.push(p); pool.splice(pool.indexOf(p), 1);
      }
      // 손이 닿지 않는 자리 하나도 보여 준다
      const dream = locked.length ? pick(l.rng, locked) : null;
      return {
        id: "first_job", tier: "life", sceneId: "evt_first_job",
        title: "스물다섯, 합격 문자를 기다립니다.",
        body: `채용 공고를 몇 장 추렸습니다. 집은 ${districtName(l.home.district)}. 연봉, 퇴근 시간, 출퇴근 거리가 다 다릅니다.`,
        options: [...picks.map((p) => postOption(l, p)), ...(dream ? [postOption(l, dream)] : [])],
      };
    },
  },

  // 연애
  {
    id: "dating",
    weight: (l) => (l.phase === "adult" && !l.family.married && !partnerOf(l) && l.age >= 25 && l.age <= 44 ? 1.4 + (l.gak < 45 ? 0.4 : 0) - (l.age > 38 ? 0.6 : 0) : 0),
    build: (l) => {
      const friend = social(l).sort((a, b) => b.closeness - a.closeness)[0];
      const via = weighted(l.rng, ["work", "friend", "club"] as const, (k) => (k === "work" ? (working(l) ? 1 : 0) : k === "friend" ? (friend ? 1.2 : 0) : l.flags.f_club ? 1 : 0.3));
      const intro = via === "work" ? "옆 팀 사람과 야근 끝에 같이 저녁을 먹었습니다." : via === "friend" ? `${roleKo(friend!)} ${friend!.name}이(가) 소개팅을 주선했습니다.` : "모임에서 자주 옆자리에 앉는 사람이 있습니다.";
      const district = via === "work" && l.workDistrict ? l.workDistrict : via === "friend" && friend ? friend.district : l.home.district;
      return {
        id: "dating", tier: "life", sceneId: "evt_dating",
        title: "주말에 만나자는 연락이 왔습니다.",
        body: intro + ` 그 사람은 ${districtName(district)}에 삽니다.`,
        options: [
          opt("만나 본다", "데이트비 연 300만 · 행복 ↑ · 스트레스가 덜하다 · 시간이 든다", (life) => {
            const p = makePerson(life, "partner", district, { closeness: 55 });
            life.people.push(p); life.flags.partnerSince = life.year;
            life.mind = clamp(life.mind + 5);
            storyStep(life, "love", "연애", `${life.age}살, ${p.name}을(를) 만나기 시작했다.`);
            return `${p.name}과(와) 두 번째 약속을 잡았습니다.`;
          }, { need: { freeH: 1.5, health: 35 }, autoWeight: 2 }),
          opt("한 번 보고 정한다", "현금 −10만 · 운이 따르면", (life) => {
            life.cash -= 10;
            if (luckChance(life, 0.45)) {
              const p = makePerson(life, "partner", district, { closeness: 48 });
              life.people.push(p); life.flags.partnerSince = life.year;
              storyStep(life, "love", "연애", `${life.age}살, 망설이다 만난 ${p.name}과(와) 사귀게 됐다.`);
              return "헤어지기 아쉬워 한 정거장을 더 걸었습니다.";
            }
            return "좋은 사람이었지만, 거기까지였습니다.";
          }, { need: { freeH: 1 }, luck: true }),
          opt("지금은 일이 먼저다", "지식 +", (life) => { life.learn = clamp(life.learn + 1); return "답장을 미루다 타이밍을 놓쳤습니다."; }),
        ],
      };
    },
  },
  {
    id: "breakup", negative: true,
    weight: (l) => { const p = partnerOf(l); return p && p.closeness < 32 ? 3 : 0; },
    build: (l) => {
      const p = partnerOf(l)!;
      const busy = l.flags.sideH ? "투잡" : (l.work?.hours ?? 9) >= 11 ? "야근" : "거리";
      return {
        id: "breakup", tier: "life", sceneId: "evt_breakup",
        title: `${p.name}이(가) "우리 요즘 얼굴 본 지 얼마나 됐지?"라고 물었습니다.`,
        body: busy === "투잡" ? "퇴근 뒤 두 번째 일 때문에 주말에도 만나지 못했습니다." : busy === "야근" ? "약속을 세 번 연달아 미뤘습니다." : `${districtName(p.district)}까지 오가는 데만 한나절이 걸립니다.`,
        options: [
          ...(l.flags.sideH ? [opt("투잡을 그만둔다", "부수입 사라짐 · 관계 회복", (life) => { life.flags.sideH = 0; life.flags.side = 0; p.closeness = clamp(p.closeness + 25); storyStep(life, "love", "연애", "투잡을 그만두고 주말을 되찾았다."); return "토요일 아침, 오랜만에 늦잠을 같이 잤습니다."; }, { autoWeight: 2 })] : []),
          opt("주말만큼은 비운다", "소득 −5% · 관계 회복", (life) => { life.income = Math.round(life.income * 0.95); p.closeness = clamp(p.closeness + 18); storyStep(life, "love", "연애", "야근을 줄이고 주말을 비웠다."); return "회사 메신저 알림을 주말엔 껐습니다."; }, { need: { health: 30 }, autoWeight: 1.5 }),
          opt("헤어진다", "행복 −− · 시간이 돌아온다", (life) => { life.people = life.people.filter((x) => x !== p); life.mind = clamp(life.mind - 7); storyStep(life, "love", "연애", `${life.age}살, ${p.name}과(와) 헤어졌다.`, true); return "같이 찍은 사진을 한참 넘겨 보다 껐습니다."; }),
        ],
      };
    },
  },

  // 투잡
  {
    id: "side_job",
    weight: (l) => (working(l) && !l.flags.sideH && l.age >= 25 && l.age <= 52 && l.jobId !== "self" ? (l.cash < 3000 ? 1.2 : 0.4) + (l.props.some((p) => p.loan > 0) ? 0.4 : 0) : 0),
    build: (l) => ({
      id: "side_job", tier: "life", sceneId: "evt_side_job",
      title: "동료가 퇴근 후 부업 이야기를 꺼냈습니다.",
      body: `"한 달에 몇십만 원이라도 더 들어오면 다르더라." 통장 잔고는 ${fmtMoney(l.cash)}.`,
      options: [
        opt("퇴근 후 배달을 한다", "연 +900만 · 하루 2.5시간 · 체력 −− · 스트레스 ↑", (life) => { life.flags.side = 900; life.flags.sideH = 2.5; life.flags.sideFrom = life.year; return "헬멧을 현관 신발장 위에 올려 두었습니다."; }, { need: { health: 55, freeH: 2.5 }, autoWeight: 1 }),
        opt("주말에 외주·강의를 한다", "연 +700만 · 하루 1.5시간 · 지식 +", (life) => { life.flags.side = 700; life.flags.sideH = 1.5; life.flags.sideFrom = life.year; life.learn = clamp(life.learn + 1); return "일요일 오후가 노트북 앞에서 지나갔습니다."; }, { need: { learn: 65, freeH: 2 }, autoWeight: 1 }),
        opt("저녁은 내 시간으로 둔다", "변화 없음", () => "퇴근길에 공원을 한 바퀴 돌았습니다.", { autoWeight: 2 }),
      ],
    }),
  },
  {
    id: "side_job_end",
    weight: (l) => (l.flags.sideH ? (l.health < 48 ? 3 : l.year - (l.flags.sideFrom ?? l.year) >= 3 ? 0.8 : 0) : 0),
    build: (l) => ({
      id: "side_job_end", tier: "life", sceneId: "evt_side_job",
      title: l.health < 48 ? "아침에 일어나는데 허리가 펴지지 않았습니다." : `부업을 한 지 ${l.year - (l.flags.sideFrom ?? l.year)}년이 됐습니다.`,
      body: `두 번째 일로 모은 돈은 해마다 ${fmtMoney(l.flags.side ?? 0)}. 하루 ${l.flags.sideH}시간을 썼습니다.`,
      options: [
        opt("그만둔다", "부수입 사라짐 · 시간이 돌아온다", (life) => { life.flags.side = 0; life.flags.sideH = 0; life.health = clamp(life.health + 2); return "부업 앱을 지웠습니다."; }, { autoWeight: 2 }),
        opt("조금 더 한다", "체력 −", (life) => { life.health = clamp(life.health - 2); return "파스를 붙이고 다시 나갔습니다."; }, { need: { health: 45 } }),
      ],
    }),
  },

  // 휴가
  {
    id: "vacation",
    weight: (l) => (l.phase === "adult" && l.age >= 26 && l.age <= 74 && l.home.tenure !== "nursing" ? 0.7 : 0),
    build: (l) => {
      const p = partnerOf(l);
      const who = l.family.married ? `${l.family.spouseName}${l.family.kids.length ? "와 아이들" : ""}` : p ? p.name : "혼자";
      const trip = 350 + (l.family.married ? 250 : 0) + l.family.kids.filter((k) => !k.independent).length * 150;
      return {
        id: "vacation", tier: "micro", sceneId: "evt_vacation",
        title: "올해 휴가를 어디로 갈까요.",
        body: `${who === "혼자" ? "혼자 가는 휴가" : `${who}과(와) 함께`}. 연차는 닷새 남았습니다.`,
        options: [
          opt("해외로 떠난다", `현금 −${fmtMoney(trip)} · 행복 ↑ · 운 + · 함께한 사람과 가까워진다`, (life) => {
            life.cash -= trip; life.mind = clamp(life.mind + 5); life.luck = clamp(life.luck + 2);
            if (p) p.closeness = clamp(p.closeness + 10); if (life.family.married) life.gak = clamp(life.gak + 3);
            return pick(life.rng, ["낯선 시장에서 길을 잃고 웃었습니다.", "바다를 보며 아무 생각도 하지 않았습니다.", "호텔 조식을 세 번이나 가져다 먹었습니다."]);
          }, { cost: trip, need: { health: 45 }, autoWeight: 1 }),
          opt("가까운 바다에 1박 2일", "현금 −60만 · 행복 +", (life) => { life.cash -= 60; life.mind = clamp(life.mind + 2); if (p) p.closeness = clamp(p.closeness + 4); return "휴게소 호두과자를 나눠 먹었습니다."; }, { cost: 60, autoWeight: 2 }),
          opt("집에서 쉰다", "체력 +", (life) => { life.health = clamp(life.health + 1); return "커튼을 치고 하루 종일 잤습니다."; }, { autoWeight: 1.5 }),
        ],
      };
    },
  },

  // 행복을 사는 큰돈: 차 · 취미 · 집 고치기
  {
    id: "car",
    weight: (l) => (l.phase === "adult" && l.age >= 27 && l.age <= 68 && (!l.flags.carYear || l.year - l.flags.carYear >= 10) && l.home.tenure !== "nursing" ? 0.5 + (l.family.kids.length ? 0.6 : 0) + (l.cash > 5000 ? 0.4 : 0) : 0),
    build: (l) => ({
      id: "car", tier: "micro", sceneId: "evt_car",
      title: l.flags.carYear ? `${l.year - l.flags.carYear}년 탄 차가 자꾸 서비스센터에 갑니다.` : l.family.kids.length ? "카시트를 들고 택시를 잡다가 생각했습니다." : "동기들 주차장 이야기에 끼지 못했습니다.",
      body: `통장 잔고 ${fmtMoney(l.cash)}. 차가 생기면 주말이 달라지지만, 돈은 해마다 나갑니다.`,
      options: [
        opt("새 차를 할부로 산다", "선수금 −1,200만 · 5년간 연 900만(할부·보험·기름) · 행복 ↑", (life) => { life.cash -= 1200; life.flags.carYear = life.year; life.flags.carCost = 900; life.flags.carLoanUntil = life.year + 5; life.mind = clamp(life.mind + 5); if (life.family.married) life.gak = clamp(life.gak + 2); return "새 차 냄새가 빠질 때까지 일부러 멀리 돌아 다녔습니다."; }, { cost: 1200, autoWeight: 1 }),
        opt("중고차를 산다", "현금 −1,500만 · 연 350만 · 행복 +", (life) => { life.cash -= 1500; life.flags.carYear = life.year; life.flags.carCost = 350; life.mind = clamp(life.mind + 2); return "앞 주인이 두고 간 방향제가 아직 매달려 있었습니다."; }, { cost: 1500, autoWeight: 1.2 }),
        opt("대중교통으로 버틴다", "변화 없음", (life) => { if (life.flags.carYear) { life.flags.carCost = 0; life.flags.carYear = 0; } return "교통카드를 충전했습니다."; }, { autoWeight: 1.2 }),
      ],
    }),
  },
  {
    id: "hobby",
    weight: (l) => (l.phase === "adult" && l.age >= 28 && l.age <= 66 && !l.flags.hobbyCost && l.home.tenure !== "nursing" ? 0.5 + (l.mind < 55 ? 0.4 : 0) : 0),
    build: (l) => ({
      id: "hobby", tier: "micro", sceneId: "evt_hobby",
      title: "주말이 다 똑같이 지나갑니다.",
      body: `${commuteOrHome(l)} 무언가 하나쯤 내 것이 있으면 좋겠습니다.`,
      options: [
        opt("골프를 배운다", "가입 −600만 · 연 500만 · 사람 ↑ · 접대도 된다", (life) => { life.cash -= 600; life.flags.hobbyCost = 500; life.gak = clamp(life.gak + 3); life.mind = clamp(life.mind + 3); return "첫 라운딩, 공보다 잔디를 더 많이 팠습니다."; }, { cost: 600, need: { freeH: 1.5 } }),
        opt("캠핑을 시작한다", "장비 −400만 · 연 200만 · 가족·친구와 가까워진다", (life) => { life.cash -= 400; life.flags.hobbyCost = 200; life.gak = clamp(life.gak + 4); life.mind = clamp(life.mind + 3); return "타프를 처음 치는 데 두 시간이 걸렸습니다."; }, { cost: 400, need: { freeH: 1.5, health: 40 }, autoWeight: 1.2 }),
        opt("PT를 끊는다", "연 300만 · 체력 ↑", (life) => { life.flags.hobbyCost = 300; life.health = clamp(life.health + 4); life.mind = clamp(life.mind + 1); return "트레이너가 '회원님'이라고 불렀습니다."; }, { need: { freeH: 1 }, autoWeight: 1.2 }),
        opt("돈 안 드는 산책으로 충분하다", "변화 없음", () => "동네 공원을 한 바퀴 더 돌았습니다.", { autoWeight: 1.5 }),
      ],
    }),
  },
  {
    id: "interior",
    weight: (l) => (l.home.tenure === "own" && l.year - l.home.sinceYear >= 3 && (!l.flags.interiorYear || l.year - l.flags.interiorYear >= 12) ? (l.home.condition === "bad" ? 1.5 : 0.6) : 0),
    build: (l) => ({
      id: "interior", tier: "micro", sceneId: "evt_interior",
      title: l.home.condition === "bad" ? "욕실 타일이 또 떨어졌습니다." : "이웃집 인테리어 공사 소리가 한 달째입니다.",
      body: "우리 집도 고칠까. 내 집이니까 할 수 있는 일입니다.",
      options: [
        opt("전체 리모델링", "현금 −3,500만 · 집 상태 좋음 · 행복 ↑ · 시세 조금 ↑", (life) => { life.cash -= 3500; life.home.condition = "good"; const p = life.props.find((x) => x.uid === life.home.propUid); if (p) p.condition = "good"; life.flags.interiorYear = life.year; life.mind = clamp(life.mind + 5); return "두 달 동안 원룸에 살다 돌아오니 다른 집 같았습니다."; }, { cost: 3500 }),
        opt("부엌과 욕실만", "현금 −1,200만 · 행복 +", (life) => { life.cash -= 1200; if (life.home.condition === "bad") { life.home.condition = "normal"; const p = life.props.find((x) => x.uid === life.home.propUid); if (p) p.condition = "normal"; } life.flags.interiorYear = life.year; life.mind = clamp(life.mind + 2); return "새 수전에서 물이 시원하게 나왔습니다."; }, { cost: 1200, autoWeight: 1.5 }),
        opt("그냥 산다", "변화 없음", (life) => { life.flags.interiorYear = life.year; return "떨어진 타일을 실리콘으로 붙였습니다."; }),
      ],
    }),
  },

  // 대출 이자가 숨통을 조일 때 (금리 급등 · 집값 하락)
  {
    id: "interest_burden", forced: true,
    weight: (l, w) => {
      if (!l.props.some((p) => p.loan > 0) || l.year - (l.flags.burdenYear ?? 0) < 3) return 0;
      const inc = Math.max(1200, personalIncome(l) + spouseIncome(l));
      const pay = annualInterest(l, w) + principalDue(l);
      return pay / inc > 0.4 ? 1 : 0;
    },
    build: (l, w, world) => {
      const inc = Math.max(1200, personalIncome(l) + spouseIncome(l));
      const pay = annualInterest(l, w) + principalDue(l);
      const cheaper = l.home.tenure === "own" ? offersFor(l, world, ["cheaper", "smaller"]).filter((o) => o.tenure !== "buy").slice(0, 1) : [];
      return {
        id: "interest_burden", tier: "macro", sceneId: "evt_interest",
        title: `대출 상환이 월급의 ${Math.round((pay / inc) * 100)}%를 가져갑니다.`,
        body: `금리 ${(w.rate * 100 + 1.2).toFixed(1)}%. 이자와 원금으로 한 달 ${fmtMoney(Math.round(pay / 12))}가 나갑니다.`,
        options: [
          opt("허리띠를 졸라맨다", "2년간 소비 −40% · 행복 −", (life) => { life.flags.burdenYear = life.year; life.flags.frugalUntil = life.year + 2; life.mind = clamp(life.mind - 4); return "외식 앱을 지우고 도시락을 쌌습니다."; }, { autoWeight: 2 }),
          ...cheaper.map((o) => { const m = moveOpt(l, world, o, "집을 팔던 날, 빈 거실에 한참 앉아 있었다", 1, (life) => { life.flags.burdenYear = life.year; life.mind = clamp(life.mind - 3); }); m.label = `집을 팔고 ${m.label}`; return m; }),
          opt("버틴다", "마이너스 통장 · 스트레스", (life) => { life.flags.burdenYear = life.year; life.mind = clamp(life.mind - 2); return "이자 문자가 올 때마다 숨을 참았습니다."; }),
        ],
      };
    },
  },

  // ════ 새해 결심 (해마다 봄, 고정) ════
  {
    id: "resolution", forced: true,
    weight: (l) => (l.phase === "adult" && l.season === 0 && l.flags.firstJob && l.flags.resYear !== l.year && l.age <= 85 && l.home.tenure !== "nursing" ? 1 : 0),
    build: (l) => {
      const pool: EventOption[] = [
        opt("소비를 줄여 절약해 본다", "올해 소비 −25% · 행복 조금 −", (life) => setRes(life, "save", -1, "가계부 앱을 깔고 첫 줄을 적었습니다."), { autoWeight: l.cash < 0 ? 3 : 1.5 }),
        ...(working(l) && l.jobId !== "self" && l.age <= 60 ? [opt("창업 준비를 해 본다", "가게 일 경험 ↑ · 창업 기회가 열린다 · 운이 걸린 일에 +", (life) => setRes(life, "biz", 0, "퇴근 뒤 창업 강의를 신청했습니다."), { autoWeight: 0.6 })] : []),
        opt("운동을 시작한다", "체력 ↑ · 연 200만", (life) => setRes(life, "exercise", 1, "운동화를 새로 샀습니다."), { need: { freeH: 1 }, autoWeight: 1.2 }),
        ...(l.age <= 60 ? [opt("자격증 공부를 한다", "지식 ↑ · 연 150만 · 공부·합격 고비가 자주", (life) => setRes(life, "study", 0, "책상 위에 문제집을 올려 두었습니다."), { need: { freeH: 1.5 }, autoWeight: 0.8 })] : []),
        opt("사람을 챙긴다", "관계 ↑ · 곁의 사람과 가까워진다", (life) => setRes(life, "people", 1, "연락이 뜸했던 이름들에게 새해 인사를 보냈습니다."), { autoWeight: 1 }),
        ...(l.age <= 70 ? [opt("부동산 공부를 한다", "계절마다 발품 +2 · 매수·매도 고비가 자주 · 운이 걸린 일에 +", (life) => setRes(life, "estate", 0, "주말 임장 계획을 달력에 적었습니다."), { autoWeight: 0.8 })] : []),
      ];
      // 네 개만 눈에 띈다 + '결심 없이'
      const shown: EventOption[] = [];
      const rest = [...pool];
      while (shown.length < 4 && rest.length) { const o = weighted(l.rng, rest, (x) => x.autoWeight ?? 1); shown.push(o); rest.splice(rest.indexOf(o), 1); }
      return {
        id: "resolution", tier: "life", sceneId: "evt_new_year",
        title: `${l.year}년 새해, 올해의 결심을 적습니다.`,
        body: `${l.age}살. 지난해 결심은 ${l.flags.resYear === l.year - 1 ? (l.flags.resBroken ? "흐지부지됐습니다" : "지켰습니다") : "없었습니다"}. 스트레스가 크거나 여유가 없으면 결심은 오래가지 못합니다.`,
        options: [...shown, opt("결심 없이 지낸다", "변화 없음", (life) => { life.flags.res = 0; life.flags.resYear = life.year; return "달력만 새로 걸었습니다."; }, { autoWeight: 0.8 })],
      };
    },
  },

  // ════ 창업 기회 (창업 준비를 했으면 열린다) ════
  {
    id: "start_biz",
    weight: (l) => (working(l) && l.jobId !== "self" && (l.flags.bizPrep ?? 0) >= 1 && l.age <= 58 ? 1 + (l.flags.bizPrep ?? 0) * 0.5 : 0),
    build: (l) => {
      const stake = 3000;
      return {
        id: "start_biz", tier: "life", sceneId: "evt_friend_startup",
        title: `${districtName(l.home.district)} 골목에 괜찮은 가게 자리가 났습니다.`,
        body: `창업 준비 ${l.flags.bizPrep}년째. 보증금과 인테리어에 ${fmtMoney(stake)}. 회사를 그만둬야 합니다.`,
        options: [
          opt("퇴사하고 가게를 연다", `현금 −${fmtMoney(stake)} · 🎲 준비한 만큼, 운이 따르면`, (life) => {
            life.cash -= stake;
            const ok = luckChance(life, 0.38, { biz: 1, know: 0.2 });
            changeJob(life, "self"); life.workDistrict = life.home.district;
            if (ok) { life.income = Math.round(life.income * 1.35); storyStep(life, "biz", "내 가게", `${life.age}살, ${districtName(life.home.district)}에 가게를 열었다. 첫해부터 단골이 생겼다.`); return "개업 한 달 만에 단골이 생겼습니다. 매출이 회사 월급을 넘었습니다."; }
            life.income = Math.round(life.income * 0.6); life.mind = clamp(life.mind - 4); storyStep(life, "biz", "내 가게", `${life.age}살, 가게를 열었지만 손님이 없었다.`); return "오픈 첫 주, 손님보다 지나가는 사람이 더 많았습니다.";
          }, { cost: stake, luck: true, need: { biz: 2 } }),
          opt("아직은 회사에 남는다", "준비는 계속된다", () => "가게 자리 사진을 휴대폰에 저장해 두었습니다.", { autoWeight: 2 }),
        ],
      };
    },
  },

  // ════ 내 가게 홍보 (자영업, 운이 걸린 일) ════
  {
    id: "shop_promo",
    weight: (l) => (l.jobId === "self" && l.home.tenure !== "nursing" ? 1.1 : 0),
    build: (l) => ({
      id: "shop_promo", tier: "micro", sceneId: "evt_regular_shop",
      title: "가게 매출이 몇 달째 제자리입니다.",
      body: `${districtName(l.workDistrict ?? l.home.district)} 골목. 손님을 더 불러올 방법이 필요합니다.`,
      options: [
        opt("전단지를 뿌려 홍보해 본다", "현금 −30만 · 🎲 잘되면 매출 +8%", (life) => { life.cash -= 30; if (luckChance(life, 0.42, { biz: 1 })) { life.income = Math.round(life.income * 1.08); return "전단지를 들고 온 손님이 줄을 섰습니다. 매출이 8% 올랐습니다."; } return "전단지는 대부분 아파트 분리수거함으로 갔습니다."; }, { cost: 30, luck: true, autoWeight: 1.5 }),
        opt("SNS 광고를 한다", "현금 −300만 · 🎲 잘되면 매출 +18%", (life) => { life.cash -= 300; if (luckChance(life, 0.35, { biz: 1, know: 0.4 })) { life.income = Math.round(life.income * 1.18); return "릴스 하나가 터졌습니다. 주말마다 줄이 섰습니다."; } return "광고비만 나가고 조회수는 오르지 않았습니다."; }, { cost: 300, luck: true }),
        opt("신메뉴를 개발한다", "가게 일 경험 ↑ · 체력 −", (life) => { life.flags.bizExp = (life.flags.bizExp ?? 0) + 1; life.health = clamp(life.health - 1); return "밤마다 주방에서 새 메뉴를 시험했습니다."; }),
        opt("버틴다", "변화 없음", () => "셔터를 평소보다 한 시간 늦게 내렸습니다.", { autoWeight: 1.2 }),
      ],
    }),
  },
];

function commuteOrHome(l: Life) { return working(l) ? "출근하고, 퇴근하고, 주말엔 잔다." : "하루가 길다."; }

/** 새해 결심을 적는다 */
function setRes(l: Life, code: "save" | "biz" | "exercise" | "study" | "people" | "estate", mind: number, line: string) {
  l.flags.res = ["save", "biz", "exercise", "study", "people", "estate"].indexOf(code) + 1;
  l.flags.resYear = l.year; l.flags.resBroken = 0;
  l.mind = clamp(l.mind + mind);
  return line;
}
