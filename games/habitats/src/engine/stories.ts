// 이어지는 이야기 — 스탯·사람·이전 선택이 조건이 되고, 몇 해 뒤 다음 장면으로 이어진다.
// 무거운 장면은 negative: true. 설정에서 '부정적 일'을 끄면 나오지 않거나 순한 결말로 바뀐다.
import { chance, clamp, int, pick, weighted } from "./rng";
import type { EventOption, Life, Person } from "./types";
import type { EventDef } from "./events";
import { moveOpt } from "./events";
import { districtName, fmtMoney, luckChance } from "./life";
import { commuteOf, offersFor, working } from "./home";
import { makePerson, roleKo, social, isNear } from "./people";
import { feed } from "./feed";

// ───────── 도우미 ─────────
export function storyStep(l: Life, id: string, title: string, text: string, done = false) {
  let s = l.stories.find((x) => x.id === id && !x.done);
  if (!s) { s = { id, title, steps: [] }; l.stories.push(s); }
  s.steps.push({ year: l.year, age: l.age, text });
  if (done) s.done = true;
}
export const storyOpen = (l: Life, id: string) => l.stories.some((x) => x.id === id && !x.done);
export function schedule(l: Life, id: string, inYears: number) {
  l.scheduled.push({ year: l.year + inYears, id });
}
/** 사람 하나를 flag 슬롯에 기억 (id 해시) */
function remember(l: Life, slot: string, p: Person) { l.flags[`${slot}_n`] = hash(p.id); }
function recall(l: Life, slot: string): Person | undefined { const h = l.flags[`${slot}_n`]; return l.people.find((p) => hash(p.id) === h); }
function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

const opt = (label: string, hint: string, apply: EventOption["apply"], extra: Partial<EventOption> = {}): EventOption => ({ label, hint, apply, autoWeight: 1, ...extra });

// ───────── ③ 미룬 검진 ─────────
const CHECKUP_ID = "checkup";
export const checkupStory = {
  rest: (l: Life) => storyStep(l, CHECKUP_ID, "건강검진", `${l.age}살 검진 결과를 보고 1년을 쉬어 갔다.`, true),
  skip: (l: Life) => { storyStep(l, CHECKUP_ID, "미룬 검진", "빨간 글씨가 적힌 결과지를 서랍에 넣었다."); schedule(l, "checkup2", int(l.rng, 2, 3)); },
};

// ───────── 이야기 정의 ─────────
export const STORY_DEFS: EventDef[] = [
  // ③ 미룬 검진 — 2단계
  {
    id: "checkup2", scheduled: true, negative: true,
    weight: (l) => (l.home.tenure !== "nursing" ? 1 : 0),
    build: (l) => {
      const bill = Math.round(800 + (60 - Math.min(60, l.health)) * 40);
      return {
        id: "checkup2", tier: "life", sceneId: "evt_hospital",
        title: "새벽에 가슴이 답답해 응급실에 갔습니다.",
        body: `몇 해 전 서랍에 넣어 둔 결과지가 떠올랐습니다. 의사는 수술을 권했습니다. 병원비 ${fmtMoney(bill)}.`,
        options: [
          opt("수술을 받고 몇 달 쉰다", `체력 ↑ · 현금 −${fmtMoney(bill)} · 소득 −25%(올해)`, (life) => {
            life.cash -= bill; life.cash -= Math.round(life.income * 0.25); life.health = clamp(life.health + 10);
            storyStep(life, CHECKUP_ID, "미룬 검진", `응급실에 실려 가 수술을 받았다. ${fmtMoney(bill)}이 들었다.`, true);
            return "회복실 창밖으로 처음 보는 동네가 보였습니다.";
          }, { autoWeight: 2 }),
          opt("약으로 버티며 계속 일한다", "체력 −− · 행복 −", (life) => {
            life.cash -= Math.round(bill * 0.2); life.health = clamp(life.health - 8); life.mind = clamp(life.mind - 4);
            storyStep(life, CHECKUP_ID, "미룬 검진", "약봉지를 들고 다음 날 출근했다.");
            schedule(life, "checkup3", 3);
            return "약봉지를 가방 안쪽 주머니에 넣었습니다.";
          }),
        ],
      };
    },
  },
  {
    id: "checkup3", scheduled: true, negative: true,
    weight: () => 1,
    build: () => ({
      id: "checkup3", tier: "life", sceneId: "evt_hospital",
      title: "이번엔 출근길 지하철에서 쓰러졌습니다.",
      body: "더는 미룰 수 없었습니다.",
      options: [
        opt("일을 쉬고 치료에 전념한다", "체력 ↑ · 소득 −50%(올해) · 현금 −2,000만", (life) => {
          life.cash -= 2000 + Math.round(life.income * 0.5); life.health = clamp(life.health + 6); life.mind = clamp(life.mind - 3);
          storyStep(life, CHECKUP_ID, "미룬 검진", "지하철에서 쓰러진 뒤에야 일을 멈췄다.", true);
          return "한동안 출근 대신 병원에 다녔습니다.";
        }),
      ],
    }),
  },

  // ④ 외로운 도시
  {
    id: "lonely",
    weight: (l) => (l.age >= 27 && l.age <= 72 && (l.gak < 42 || social(l).filter((p) => p.closeness >= 40).length <= 1) && !l.family.married && !storyOpen(l, "lonely") && l.home.tenure !== "nursing" ? 2 : 0),
    build: (l) => ({
      id: "lonely", tier: "life", sceneId: "evt_lonely",
      title: "주말 내내 아무와도 말하지 않았습니다.",
      body: `${districtName(l.home.district)}에 산 지 ${l.jeong[l.home.district] ?? 0}년. 휴대폰 연락처는 많은데 부를 사람이 떠오르지 않습니다.`,
      options: [
        opt("동네 모임에 나가 본다", "여유 시간 −2시간/주 · 새 사람을 만날 수도", (life) => {
          life.flags.f_club = 1; life.luck = clamp(life.luck + 2);
          storyStep(life, "lonely", "외로운 도시", "말 한마디 없던 주말 끝에 동네 모임에 나갔다.");
          if (life.people.length < 8 && luckChance(life, 0.6)) {
            const p = makePerson(life, "club", life.home.district, { closeness: 50 });
            life.people.push(p);
            storyStep(life, "lonely", "외로운 도시", `모임에서 ${p.name}을(를) 만났다.`, true);
            life.gak = clamp(life.gak + 4);
            return `어색하게 앉아 있던 자리에서 ${p.name}이(가) 먼저 말을 걸었습니다.`;
          }
          schedule(life, "lonely2", 2);
          return "두 번 나가고 그만뒀습니다. 다들 이미 친해 보였습니다.";
        }, { autoWeight: 2, luck: true }),
        opt("상담을 받아 본다", "현금 −240만/년 · 행복 ↑", (life) => {
          life.flags.f_counsel = 2; life.mind = clamp(life.mind + 5);
          storyStep(life, "lonely", "외로운 도시", "처음으로 상담실 문을 두드렸다.", true);
          return "상담실 창가에 작은 화분이 있었습니다.";
        }, { cost: 240 }),
        opt("그냥 지낸다", "변화 없음", (life) => {
          storyStep(life, "lonely", "외로운 도시", "그냥 지내기로 했다.");
          schedule(life, "lonely2", 2);
          return "넷플릭스 다음 화가 자동으로 재생됐습니다.";
        }),
      ],
    }),
  },
  {
    id: "lonely2", scheduled: true, negative: true,
    weight: (l) => (l.gak < 45 ? 1 : 0),
    build: (l) => ({
      id: "lonely2", tier: "life", sceneId: "evt_hospital",
      title: "잠이 오지 않는 밤이 몇 달째입니다.",
      body: "병원에서 \"스트레스성\"이라는 말을 들었습니다. 병원비가 조금씩 나갑니다.",
      options: [
        opt("치료를 받으며 사람을 다시 만나 본다", "현금 −300만 · 행복 ↑ · 체력 ↑", (life) => {
          life.cash -= 300; life.mind = clamp(life.mind + 4); life.health = clamp(life.health + 2); life.flags.f_club = 1;
          storyStep(life, "lonely", "외로운 도시", "불면으로 병원에 다니며, 오래 연락 못 한 친구에게 전화했다.", true);
          const old = social(life).sort((a, b) => b.closeness - a.closeness)[0];
          if (old) old.closeness = clamp(old.closeness + 15);
          return old ? `${old.name}이(가) "왜 이제 연락했어"라며 웃었습니다.` : "약을 받아 들고 공원을 한 바퀴 걸었습니다.";
        }, { autoWeight: 2 }),
        opt("버틴다", "체력 − · 행복 −", (life) => {
          life.health = clamp(life.health - 5); life.mind = clamp(life.mind - 5);
          storyStep(life, "lonely", "외로운 도시", "불면을 그냥 버텼다.", true);
          return "새벽 네 시, 창밖 편의점 불빛만 켜져 있었습니다.";
        }),
      ],
    }),
  },

  // ⑤ 육아와 출퇴근
  {
    id: "kid_commute",
    weight: (l) => (l.family.kids.some((k) => l.year - k.born <= 6) && commuteOf(l) >= 35 && working(l) && !storyOpen(l, "kid_commute") && !l.flags.kidCommuteDone ? 4 : 0),
    build: (l, _w, world) => {
      const near = offersFor(l, world, ["near_parents", "near_work"]);
      const kid = l.family.kids.find((k) => l.year - k.born <= 6)!;
      const helper = 900;
      const opts: EventOption[] = [];
      for (const o of near.slice(0, 1)) opts.push(moveOpt(l, world, o, "이삿날 아이가 새 방 벽에 크레용으로 집을 그렸다", 1.5, (life) => {
        life.flags.kidCommuteDone = 1;
        storyStep(life, "kid_commute", "육아와 출퇴근", `${kid.name}의 등원 때문에 ${districtName(o.district)}(으)로 이사했다.`);
        schedule(life, "kid_commute2", 3); life.flags.kc = 1;
      }));
      if (l.family.married && l.flags.spouseIncome) opts.push(opt(`${l.family.spouseName}이(가) 일을 줄인다`, "배우자 소득 −50% · 관계 ↑", (life) => {
        life.flags.spouseCut = 1; life.flags.kidCommuteDone = 1; life.gak = clamp(life.gak + 4);
        storyStep(life, "kid_commute", "육아와 출퇴근", `${life.family.spouseName}이(가) 일을 반으로 줄였다.`);
        schedule(life, "kid_commute2", 3); life.flags.kc = 2;
        return "저녁 식탁에 셋이 같이 앉는 날이 늘었습니다.";
      }, { autoWeight: 1.5 }));
      opts.push(opt("등하원 도우미를 쓴다", `현금 −${fmtMoney(helper)}/년 · 지금 집 그대로`, (life) => {
        life.flags.helperCost = helper; life.flags.kidCommuteDone = 1;
        storyStep(life, "kid_commute", "육아와 출퇴근", "등하원 도우미를 구했다.");
        schedule(life, "kid_commute2", 3); life.flags.kc = 3;
        return "현관 비밀번호를 한 사람에게 더 알려 줬습니다.";
      }, { cost: Math.round(helper / 4) }));
      return {
        id: "kid_commute", tier: "life", sceneId: "evt_kid_commute",
        title: `${kid.name}의 어린이집 하원 시간에 또 늦었습니다.`,
        body: `출근 ${commuteOf(l)}분. 선생님이 혼자 남은 ${kid.name}과(와) 현관에서 기다리고 있었습니다.`,
        options: opts,
      };
    },
  },
  {
    id: "kid_commute2", scheduled: true,
    weight: () => 1,
    build: (l) => {
      const kc = l.flags.kc ?? 3;
      const kid = l.family.kids[l.family.kids.length - 1];
      if (kc === 1) return {
        id: "kid_commute2", tier: "life", sceneId: "evt_grandparents",
        title: `${kid?.name ?? "아이"}이(가) 할머니 집에서 저녁을 먹고 옵니다.`,
        body: "부모님이 늙어 가는 게 보이지만, 손주 덕에 웃는 일이 많아졌습니다.",
        options: [opt("고맙다고 말한다", "관계 ↑", (life) => {
          life.gak = clamp(life.gak + 5); const p = life.people.find((x) => x.role === "parent"); if (p) p.closeness = clamp(p.closeness + 15);
          storyStep(life, "kid_commute", "육아와 출퇴근", "아이가 할머니 집에서 자랐다. 부모님과 가까워졌다.", true);
          return "어머니가 반찬통을 하나 더 챙겨 주셨습니다.";
        })],
      };
      if (kc === 2) return {
        id: "kid_commute2", tier: "life", sceneId: "evt_kid_school",
        title: `${kid?.name ?? "아이"}이(가) 초등학교에 들어갔습니다.`,
        body: `${l.family.spouseName}이(가) 다시 일을 늘릴지 고민합니다. 3년의 공백이 이력서에 남았습니다.`,
        options: [
          opt("다시 일을 늘린다", "배우자 소득 회복(−10%) · 관계 −", (life) => {
            life.flags.spouseCut = 0; life.flags.spouseIncome = Math.round((life.flags.spouseIncome ?? 0) * 0.9); life.gak = clamp(life.gak - 2);
            storyStep(life, "kid_commute", "육아와 출퇴근", `${life.family.spouseName}이(가) 3년 만에 다시 풀타임으로 돌아갔다. 연봉은 조금 깎였다.`, true);
            return "출근 첫날 아침, 둘이 같이 현관을 나섰습니다.";
          }, { autoWeight: 2 }),
          opt("지금처럼 지낸다", "배우자 소득 −50% 유지 · 여유 ↑", (life) => {
            life.mind = clamp(life.mind + 2);
            storyStep(life, "kid_commute", "육아와 출퇴근", `${life.family.spouseName}은(는) 일을 줄인 채 지내기로 했다.`, true);
            return "학교 앞에서 기다리는 사람이 늘 있었습니다.";
          }),
        ],
      };
      return {
        id: "kid_commute2", tier: "life", sceneId: "evt_kid_school",
        title: `도우미 선생님이 그만두게 됐습니다.`,
        body: `3년 동안 ${kid?.name ?? "아이"}의 하원을 맡아 준 분입니다. 아이가 많이 울었습니다.`,
        options: [opt("손편지와 선물을 드린다", "현금 −50만 · 행복 −", (life) => {
          life.cash -= 50; life.flags.helperCost = 0; life.mind = clamp(life.mind - 2);
          storyStep(life, "kid_commute", "육아와 출퇴근", "3년 함께한 도우미 선생님과 작별했다. 그동안 출퇴근 거리는 그대로였다.", true);
          return "아이가 그린 그림을 봉투에 같이 넣었습니다.";
        })],
      };
    },
  },

  // ⑦ 동네가 주는 기회 — 오래 산 동네의 가까운 사람이 소식을 가져온다
  {
    id: "local_chance",
    weight: (l) => {
      if ((l.jeong[l.home.district] ?? 0) < 5 || l.age > 68 || storyOpen(l, "local_chance")) return 0;
      return social(l).some((p) => isNear(l, p) && p.closeness >= 55) ? 0.4 : 0;
    },
    build: (l, _w, world) => {
      const p = weighted(l.rng, social(l).filter((x) => isNear(l, x) && x.closeness >= 55), (x) => x.closeness);
      remember(l, "lc", p);
      const who = `${roleKo(p)} ${p.name}`;
      const opts: EventOption[] = [];
      if (l.home.tenure !== "own") {
        const o = offersFor(l, world, ["buy", "same_town"]).find((x) => x.tenure === "buy" && x.district === l.home.district);
        if (o) {
          const cut = Math.round(o.price * 0.07);
          const deal = { ...o, price: o.price - cut, cashNeeded: Math.max(0, o.cashNeeded - cut), label: `${o.label} 급매` };
          opts.push(moveOpt(l, world, deal, "급매로 산 집, 등기부를 몇 번이나 다시 읽었다", 2, (life) => {
            storyStep(life, "local_chance", "동네가 주는 기회", `${who}이(가) 알려 준 급매로 ${districtName(o.district)}에 집을 샀다. 시세보다 ${fmtMoney(cut)} 쌌다.`, true);
            const q = recall(life, "lc"); if (q) q.closeness = clamp(q.closeness + 10);
          }));
        }
      }
      if (!opts.length || chance(l.rng, 0.4)) {
        const stake = Math.round(Math.max(1500, Math.min(4000, l.cash * 0.3)) / 100) * 100;
        opts.push(opt(`${p.name}와(과) 같이 작은 가게를 낸다`, `현금 −${fmtMoney(stake)} · 2년 뒤 결과`, (life) => {
          life.cash -= stake; life.flags.lcStake = stake;
          storyStep(life, "local_chance", "동네가 주는 기회", `${who}와(과) 동네에 가게를 냈다. ${fmtMoney(stake)}을(를) 넣었다.`);
          schedule(life, "local_chance2", 2);
          return "간판 글씨체를 고르느라 밤을 새웠습니다.";
        }, { cost: stake, luck: true }));
      }
      opts.push(opt("고맙지만 사양한다", "변화 없음", (life) => {
        storyStep(life, "local_chance", "동네가 주는 기회", `${who}의 제안을 사양했다.`, true);
        return "다음에 밥 한번 사겠다고 했습니다.";
      }));
      return {
        id: "local_chance", tier: "district", sceneId: `evt_district_${l.home.district}`,
        title: `${who}이(가) 귀띔을 해 줬습니다.`,
        body: `${districtName(l.home.district)}에서 ${l.jeong[l.home.district]}년. 동네 사람만 아는 소식이 들려옵니다.${p.wealth === "rich" ? " 그 사람은 이런 일에 밝은 편입니다." : ""}`,
        options: opts,
      };
    },
  },
  {
    id: "local_chance2", scheduled: true,
    weight: () => 1,
    build: (l) => {
      const p = recall(l, "lc");
      const stake = l.flags.lcStake ?? 2000;
      const ok = luckChance(l, 0.35 + (p ? (p.trust - 50) / 200 + (p.ambition - 50) / 300 : 0), { know: 0.3, biz: 1 });
      const soft = l.noNegative;
      if (ok || soft) {
        const back = Math.round(stake * (ok ? 1.8 : 1));
        return {
          id: "local_chance2", tier: "district", sceneId: "evt_regular_shop",
          title: ok ? "가게에 단골이 생겼습니다." : "가게를 정리하기로 했습니다.",
          body: ok ? "주말이면 줄이 섭니다. 동업자가 지분을 사겠다고 합니다." : "크게 남지도 잃지도 않았습니다.",
          options: [opt(ok ? "지분을 넘긴다" : "정리한다", `현금 +${fmtMoney(back)}`, (life) => {
            life.cash += back; if (p) p.closeness = clamp(p.closeness + 10); life.mind = clamp(life.mind + (ok ? 4 : 0));
            storyStep(life, "local_chance", "동네가 주는 기회", ok ? `가게가 자리를 잡았다. 지분을 넘기고 ${fmtMoney(back)}을(를) 받았다.` : "가게를 정리했다. 넣은 돈은 돌려받았다.", true);
            return ok ? "개업 2주년 떡을 돌렸습니다." : "마지막 날 간판을 같이 내렸습니다.";
          })],
        };
      }
      return {
        id: "local_chance2", tier: "district", sceneId: "evt_regular_shop",
        title: "가게 매출이 몇 달째 바닥입니다.",
        body: `${p ? p.name + "은(는)" : "동업자는"} 돈을 조금만 더 넣으면 살릴 수 있다고 합니다.`,
        options: [
          opt("더 넣는다", `현금 −${fmtMoney(Math.round(stake / 2))} · 반반`, (life) => {
            life.cash -= Math.round(stake / 2);
            if (chance(life.rng, 0.4)) { life.cash += stake * 2; storyStep(life, "local_chance", "동네가 주는 기회", "돈을 더 넣었고, 가게가 기적처럼 살아났다.", true); return "배달 앱 리뷰 하나가 터졌습니다."; }
            if (p) { p.closeness = clamp(p.closeness - 30); }
            life.mind = clamp(life.mind - 6);
            storyStep(life, "local_chance", "동네가 주는 기회", `돈을 더 넣었지만 가게는 문을 닫았다. ${p?.name ?? "동업자"}와(과)도 멀어졌다.`, true);
            return "권리금도 못 받고 가게를 넘겼습니다.";
          }, { cost: Math.round(stake / 2) }),
          opt("손을 뗀다", "넣은 돈은 잃는다 · 관계 −", (life) => {
            if (p) p.closeness = clamp(p.closeness - 15);
            life.mind = clamp(life.mind - 3);
            storyStep(life, "local_chance", "동네가 주는 기회", `가게에서 손을 뗐다. ${fmtMoney(stake)}은(는) 돌아오지 않았다.`, true);
            return "그 골목으로는 한동안 다니지 않았습니다.";
          }, { autoWeight: 2 }),
        ],
      };
    },
  },

  // 친구의 부탁 — 가까움이 위험이 되기도 한다
  {
    id: "friend_loan", negative: true,
    weight: (l) => (l.cash > 3000 && l.age >= 30 && l.age <= 65 && !storyOpen(l, "friend_loan") && social(l).some((p) => p.closeness >= 60 && p.wealth !== "rich") ? 0.7 : 0),
    build: (l) => {
      const p = weighted(l.rng, social(l).filter((x) => x.closeness >= 60 && x.wealth !== "rich"), (x) => x.closeness);
      remember(l, "fl", p);
      const amt = Math.round(Math.min(5000, l.cash * 0.3) / 100) * 100;
      return {
        id: "friend_loan", tier: "life", sceneId: "evt_friend_call",
        title: `${roleKo(p)} ${p.name}에게서 밤늦게 전화가 왔습니다.`,
        body: `"${fmtMoney(amt)}만 빌려줄 수 있을까. 1년이면 갚을게." ${p.ambition > 60 ? "새로 시작한 일이 있다고 했습니다." : "집 계약금이 모자라다고 했습니다."}`,
        options: [
          opt("빌려준다", `현금 −${fmtMoney(amt)} · 돌려받을 수도`, (life) => {
            life.cash -= amt; life.flags.flAmt = amt; p.closeness = clamp(p.closeness + 8);
            storyStep(life, "friend_loan", "친구의 부탁", `${p.name}에게 ${fmtMoney(amt)}을(를) 빌려줬다.`);
            schedule(life, "friend_loan2", 2);
            return "이체 버튼을 누르고 한참 화면을 봤습니다.";
          }, { cost: amt }),
          opt("절반만 빌려준다", `현금 −${fmtMoney(Math.round(amt / 2))}`, (life) => {
            life.cash -= Math.round(amt / 2); life.flags.flAmt = Math.round(amt / 2);
            storyStep(life, "friend_loan", "친구의 부탁", `${p.name}에게 부탁받은 돈의 절반인 ${fmtMoney(Math.round(amt / 2))}을(를) 빌려줬다.`);
            schedule(life, "friend_loan2", 2);
            return "\"이것밖에 안 돼서 미안\"이라고 덧붙였습니다.";
          }, { cost: Math.round(amt / 2), autoWeight: 2 }),
          opt("거절한다", "관계 −", (life) => {
            p.closeness = clamp(p.closeness - 20);
            storyStep(life, "friend_loan", "친구의 부탁", `${p.name}의 부탁을 거절했다. 연락이 줄었다.`, true);
            return "\"그래, 알겠어\" 하고 전화가 끊겼습니다.";
          }, { autoWeight: 1.5 }),
        ],
      };
    },
  },
  {
    id: "friend_loan2", scheduled: true,
    weight: () => 1,
    build: (l) => {
      const p = recall(l, "fl");
      const amt = l.flags.flAmt ?? 1000;
      const repaid = l.noNegative || (p ? luckChance(l, 0.25 + p.trust / 130) : false);
      if (repaid) return {
        id: "friend_loan2", tier: "life", sceneId: "evt_friend_call",
        title: `${p?.name ?? "친구"}이(가) 돈을 갚았습니다.`,
        body: "봉투에 이자라며 조금 더 넣었습니다.",
        options: [opt("고맙다고 한다", `현금 +${fmtMoney(Math.round(amt * 1.05))} · 관계 ↑`, (life) => {
          life.cash += Math.round(amt * 1.05); if (p) p.closeness = clamp(p.closeness + 10); life.gak = clamp(life.gak + 3);
          storyStep(life, "friend_loan", "친구의 부탁", `${p?.name ?? "친구"}이(가) 약속대로 돈을 갚았다. 더 가까워졌다.`, true);
          return "그날 저녁은 그 친구가 샀습니다.";
        })],
      };
      return {
        id: "friend_loan2", tier: "life", sceneId: "evt_friend_call",
        title: `${p?.name ?? "친구"}과(와) 연락이 닿지 않습니다.`,
        body: `약속한 1년이 지났습니다. ${fmtMoney(amt)}.`,
        options: [
          opt("잊기로 한다", "현금은 돌아오지 않는다 · 행복 −", (life) => {
            life.mind = clamp(life.mind - 4); if (p) p.gone = true;
            storyStep(life, "friend_loan", "친구의 부탁", `${p?.name ?? "친구"}은(는) 끝내 갚지 않았다. 잊기로 했다.`, true);
            life.people = life.people.filter((x) => !x.gone);
            return "단톡방에서 조용히 나왔습니다.";
          }, { autoWeight: 2 }),
          opt("찾아가서 받아 낸다", "절반 회수 · 관계 끝", (life) => {
            life.cash += Math.round(amt / 2); life.mind = clamp(life.mind - 2); if (p) p.gone = true;
            storyStep(life, "friend_loan", "친구의 부탁", `${p?.name ?? "친구"}을(를) 찾아가 절반을 받아 냈다. 다시는 보지 않았다.`, true);
            life.people = life.people.filter((x) => !x.gone);
            return "현관 앞에서 오래 서 있었습니다.";
          }),
        ],
      };
    },
  },

  // ⑫ 은퇴 후의 시간 — 시간은 많은데 할 일이 없다
  {
    id: "retire_days", scheduled: true,
    weight: (l) => (l.jobId === "retired" && l.home.tenure !== "nursing" ? 1 : 0),
    build: (l) => {
      const grandkids = l.family.kids.reduce((a, k) => a + k.kids, 0);
      const jeong = l.jeong[l.home.district] ?? 0;
      const opts: EventOption[] = [
        opt("동네 복지관에서 봉사를 한다", `관계 ↑${jeong >= 8 ? "↑ (아는 얼굴이 많다)" : ""} · 할 일이 생긴다`, (life) => {
          life.flags.f_retireAct = 1; life.gak = clamp(life.gak + (jeong >= 8 ? 6 : 3));
          if (life.people.length < 8) life.people.push(makePerson(life, "club", life.home.district, { closeness: 50 }));
          storyStep(life, "retire", "은퇴 후의 시간", `복지관 봉사를 시작했다.${jeong >= 8 ? " 아는 얼굴이 많았다." : ""}`, true);
          return "점심 배식 줄에서 이름을 불러 주는 사람이 생겼습니다.";
        }, { autoWeight: 2 }),
        opt("소일거리 일을 구한다", "연 600만 · 체력 −", (life) => {
          life.flags.f_retireAct = 1; life.flags.sideJob = 600; life.health = clamp(life.health - 2);
          storyStep(life, "retire", "은퇴 후의 시간", "아파트 경비 일을 구했다.", true);
          return "새벽 다섯 시에 다시 알람을 맞췄습니다.";
        }),
      ];
      if (grandkids > 0) opts.unshift(opt("손주를 봐 준다", "관계 ↑↑ · 체력 −", (life) => {
        life.flags.f_retireAct = 1; life.gak = clamp(life.gak + 8); life.health = clamp(life.health - 2);
        storyStep(life, "retire", "은퇴 후의 시간", "손주 등하원을 맡았다.", true);
        return "놀이터 벤치가 내 자리가 됐습니다.";
      }, { autoWeight: 3 }));
      opts.push(opt("집에서 쉰다", "변화 없음", (life) => {
        storyStep(life, "retire", "은퇴 후의 시간", "집에서 쉬기로 했다.");
        schedule(life, "retire_days2", 2);
        return "리모컨이 손에서 떨어지지 않았습니다.";
      }));
      return {
        id: "retire_days", tier: "life", sceneId: "evt_retire_days",
        title: "은퇴하고 1년, 하루가 깁니다.",
        body: `알람 없이 눈을 뜹니다. ${districtName(l.home.district)}의 낮 풍경을 이렇게 오래 본 건 처음입니다.`,
        options: opts,
      };
    },
  },
  {
    id: "retire_days2", scheduled: true, negative: true,
    weight: (l) => (l.home.tenure !== "nursing" && !l.flags.f_retireAct ? 1 : 0),
    build: () => ({
      id: "retire_days2", tier: "life", sceneId: "evt_retire_days",
      title: "며칠째 현관문을 열지 않았습니다.",
      body: "TV 소리만 집 안을 채웁니다. 자녀가 전화로 목소리가 왜 그러냐고 묻습니다.",
      options: [
        opt("노인 대학에 등록한다", "현금 −100만 · 관계 ↑ · 행복 ↑", (life) => {
          life.cash -= 100; life.flags.f_retireAct = 1; life.gak = clamp(life.gak + 4); life.mind = clamp(life.mind + 4);
          storyStep(life, "retire", "은퇴 후의 시간", "며칠씩 집 밖에 안 나가다, 노인 대학에 등록했다.", true);
          return "서예반 첫 시간, 붓을 잡은 손이 떨렸습니다.";
        }, { autoWeight: 2 }),
        opt("그대로 지낸다", "행복 − · 체력 −", (life) => {
          life.mind = clamp(life.mind - 6); life.health = clamp(life.health - 3);
          storyStep(life, "retire", "은퇴 후의 시간", "집 안에서 하루가 지나갔다. 그런 날이 이어졌다.", true);
          return "달력을 넘기는 걸 자주 잊었습니다.";
        }),
      ],
    }),
  },
];

export const STORY_IDS = new Set(STORY_DEFS.map((d) => d.id));

/** 은퇴하면 1년 뒤 '하루가 길다' */
export function onRetire(l: Life) {
  storyStep(l, "retire", "은퇴 후의 시간", `${l.age}살에 은퇴했다.`);
  schedule(l, "retire_days", 1);
}

/** 해마다: 경조사·병원 같은 돈 이야기 한 줄 */
export function yearlyCosts(l: Life): number {
  let cost = 0;
  const lines: string[] = [];
  const close = social(l).filter((p) => p.closeness >= 45).length + (l.people.some((p) => p.role === "sibling") ? 1 : 0);
  if (close && l.age < 80) {
    const n = Math.min(close, int(l.rng, 0, Math.ceil(close * 0.8)));
    if (n > 0) { const c = n * pick(l.rng, [10, 20, 30, 50]); cost += c; lines.push(`경조사 ${n}번 ${fmtMoney(c)}`); }
  }
  if (l.health < 50) { const c = Math.round((50 - l.health) * 18 + (l.age >= 65 ? 150 : 0)); cost += c; lines.push(`병원비 ${fmtMoney(c)}`); }
  if (l.flags.f_counsel) { cost += 240; l.flags.f_counsel--; lines.push("상담 240만"); }
  if (l.flags.helperCost) { cost += l.flags.helperCost; lines.push(`등하원 도우미 ${fmtMoney(l.flags.helperCost)}`); if (l.family.kids.every((k) => l.year - k.born > 9)) l.flags.helperCost = 0; }
  if (l.flags.sideJob) { cost -= l.flags.sideJob; if (l.age >= 75) l.flags.sideJob = 0; }
  if (l.flags.side) cost -= l.flags.side;
  if (l.family.married && l.age < 70) { cost += 250; lines.push("명절·양가 250만"); }
  if (l.flags.carLoanUntil && l.year >= l.flags.carLoanUntil) { l.flags.carCost = 350; l.flags.carLoanUntil = 0; }
  if (l.age >= 75) { l.flags.carCost = 0; l.flags.hobbyCost = 0; }
  if (l.people.some((p) => p.role === "partner")) { cost += 300; lines.push("데이트 300만"); }
  l.cash -= cost;
  if (lines.length) feed(l, "money", `올해 나간 돈: ${lines.join(" · ")}`);
  return cost;
}

