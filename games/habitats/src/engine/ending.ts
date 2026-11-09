// 엔딩 — "○○한 삶이었다" (§5.8)
import { PROP_TYPES } from "../data/seoul";
import { jobById } from "../data/jobs";
import { districtName, fmtMoney, netWorth } from "./life";
import { worldYear } from "./market";
import type { Life, World } from "./types";

export interface Ending {
  title: string;
  axes: { axis: string; piece: string; score: number }[];
  epilogue: string[];
  keys: { where: string; years: string; tenure: string; memory: string }[];
  cards: { job: string; years: string }[];
  realityLine: string;
  propertyRecord: string[];
  deathAge: number;
  startLine: string;
  /** 평생 행복(평균)과 가장 자주 모자랐던 것 */
  happy: number;
  lack: string;
  rich: string;
}

const TENURE_KO: Record<string, string> = { monthly: "월세", jeonse: "전세", own: "자가", parents: "부모님 집", nursing: "요양원", withkid: "자녀의 집" };

export function buildEnding(life: Life, world: World): Ending {
  const age = life.deathAge ?? life.age;
  const wy = worldYear(world, life.year);
  const log = life.log;
  const avg = (k: "mind" | "health" | "gak") => log.reduce((a, x) => a + x[k], 0) / Math.max(1, log.length);
  const grandkids = life.family.kids.reduce((a, k) => a + k.kids, 0);
  const maxPhoto = Math.max(1, ...log.map((x) => x.photo.length));
  const lastPhoto = log[log.length - 1]?.photo.length ?? 1;
  const stays = life.homeHistory.map((h) => (h.to ?? life.year) - h.from);
  const longest = Math.max(0, ...stays);
  const longestHome = life.homeHistory[stays.indexOf(longest)];
  const moves = life.homeHistory.length - 1;
  const jobChanges = life.jobHistory.filter((j) => !["jobless", "retired"].includes(j.jobId)).length;
  const keys = life.props.length;
  const everOwned = life.everOwned;

  // 축마다 (조각, 두드러짐 점수). 점수가 높은 두 조각을 고른다. 부동산 축도 같은 저울에 올린다.
  const axes: Ending["axes"] = [];
  // 장수
  if (age >= 95) axes.push({ axis: "장수", piece: "백 년 가까이 걸어온", score: 90 });
  else if (age >= 88) axes.push({ axis: "장수", piece: "오래 걸었던", score: 60 });
  else if (age < 65) axes.push({ axis: "장수", piece: "조금 일찍 길을 마친", score: 70 });
  // 곁
  if (grandkids >= 3 || maxPhoto >= 8) axes.push({ axis: "곁", piece: "북적였던", score: 70 + grandkids * 4 });
  else if (life.family.friends >= 7 && !life.family.married) axes.push({ axis: "곁", piece: "친구가 많았던", score: 65 });
  else if (avg("gak") < 30 || (maxPhoto >= 4 && lastPhoto <= 1)) axes.push({ axis: "곁", piece: maxPhoto >= 4 ? "사진 속 사람이 하나둘 줄어든" : "조용했던", score: 62 });
  else if (life.family.pet && !life.family.married) axes.push({ axis: "곁", piece: "작은 동물과 함께한", score: 50 });
  // 보금자리: 동네와의 정
  const jeongTop = Object.entries(life.jeong).sort((a, b) => b[1] - a[1])[0];
  if (jeongTop && jeongTop[1] >= 50) axes.push({ axis: "보금자리", piece: `${districtName(jeongTop[0])}을(를) 끝내 떠나지 않은`, score: 45 + jeongTop[1] * 0.3 });
  else if (jeongTop && jeongTop[1] >= 35) axes.push({ axis: "보금자리", piece: `${districtName(jeongTop[0])}에 오래 뿌리내린`, score: 47 });
  else if (moves >= 10) axes.push({ axis: "보금자리", piece: "늘 짐을 쌌던", score: 58 + moves });
  if (life.flags.returnedChildhood) axes.push({ axis: "보금자리", piece: "어린 시절의 집으로 돌아간", score: 88 });
  if (life.background === "빠듯한 집" && everOwned > 0) axes.push({ axis: "회복", piece: "반지하에서 시작해 볕 드는 집에 닿은", score: 64 });
  // 마지막 거처
  const lastT = life.homeHistory[life.homeHistory.length - 1]?.tenure;
  if (lastT === "nursing") axes.push({ axis: "마지막", piece: "요양원 창가에서 마지막 계절을 보낸", score: 62 });
  else if (lastT === "withkid") axes.push({ axis: "마지막", piece: "자식의 집에서 마지막을 맞은", score: 64 });
  else if (age >= 78) axes.push({ axis: "마지막", piece: "살던 집에서 마지막을 맞은", score: 56 });
  // 출퇴근
  const workYears = life.jobHistory.filter((j) => !["jobless", "retired", "landlord", "child"].includes(j.jobId)).reduce((a, j) => a + ((j.to ?? life.year) - j.from), 0);
  const avgC = workYears ? (life.flags.commuteSum ?? 0) / workYears : 0;
  if (avgC >= 60) axes.push({ axis: "일", piece: "출퇴근길에 청춘을 보낸", score: 58 + (avgC - 60) / 2 });
  else if (avgC > 0 && avgC <= 28) axes.push({ axis: "일", piece: "일터 가까이 살아 저녁이 있던", score: 56 });
  // 일
  if (jobChanges >= 3) axes.push({ axis: "일", piece: "여러 번 다시 시작한", score: 55 + jobChanges * 4 });
  if (life.jobHistory.some((j) => j.jobId === "self")) axes.push({ axis: "일", piece: "가게 불을 켜 본", score: 48 });
  // 회복
  if (life.lostHome && life.regained) axes.push({ axis: "회복", piece: "무너지고 다시 일어선", score: 88 });
  else if (life.lostHome) axes.push({ axis: "회복", piece: "한 번 크게 넘어졌던", score: 66 });
  // 행복과 결핍: 가장 자주 모자랐던 칸, 가장 자주 넉넉했던 칸
  const adultLog = log.filter((x) => x.money !== undefined);
  const lowCount: Record<string, number> = { money: 0, time: 0, body: 0, rel: 0 };
  const highCount: Record<string, number> = { money: 0, time: 0, body: 0, rel: 0 };
  for (const x of adultLog) {
    const v: Record<string, number> = { money: x.money!, time: x.time!, body: x.health, rel: x.gak };
    const ks = Object.keys(v).sort((a, b) => v[a] - v[b]);
    lowCount[ks[0]]++; highCount[ks[3]]++;
  }
  const lack = Object.keys(lowCount).sort((a, b) => lowCount[b] - lowCount[a])[0];
  const richK = Object.keys(highCount).sort((a, b) => highCount[b] - highCount[a])[0];
  const LACK: Record<string, string> = { money: "늘 돈이 빠듯했던", time: "늘 시간이 모자랐던", body: "몸이 먼저 지쳐 갔던", rel: "외로운 날이 많았던" };
  const RICH: Record<string, string> = { money: "돈 걱정은 덜했던", time: "저녁이 있었던", body: "끝까지 몸이 버텨 준", rel: "곁에 사람이 많았던" };
  const happy = adultLog.length ? Math.round(adultLog.reduce((a, x) => a + (x.happy ?? x.mind), 0) / adultLog.length) : Math.round(avg("mind"));
  if (adultLog.length >= 5) {
    axes.push({ axis: "결핍", piece: LACK[lack], score: 50 + (lowCount[lack] / adultLog.length) * 20 });
    axes.push({ axis: "넉넉", piece: RICH[richK], score: 46 + (highCount[richK] / adultLog.length) * 16 });
  }
  if (happy >= 66) axes.push({ axis: "행복", piece: "대체로 행복했던", score: 56 + (happy - 66) });
  else if (happy <= 38) axes.push({ axis: "행복", piece: "행복이 늘 조금 멀었던", score: 56 + (38 - happy) });
  // 부동산
  if (keys >= 10) axes.push({ axis: "부동산", piece: "도시의 지도에 많은 열쇠를 남긴", score: 70 + keys });
  else if (keys >= 4) axes.push({ axis: "부동산", piece: "열쇠 꾸러미가 무거웠던", score: 58 + keys });
  else if (everOwned === 1 && longest >= 15) axes.push({ axis: "부동산", piece: "작은 집 하나를 오래 지킨", score: 57 });
  else if (everOwned === 0) axes.push({ axis: "부동산", piece: "남의 집 열쇠로 살아 낸", score: 52 });
  if (!axes.length) axes.push({ axis: "기본", piece: "평범하고 단정했던", score: 40 });

  axes.sort((a, b) => b.score - a.score);
  const chosen: typeof axes = [];
  for (const a of axes) {
    if (chosen.length >= 2) break;
    if (chosen.some((c) => c.axis === a.axis)) continue;
    chosen.push(a);
  }
  const title = chosen.length === 2 ? `${chosen[1].piece}, ${chosen[0].piece} 삶이었다.` : `${chosen[0].piece} 삶이었다.`;

  const lastHome = life.homeHistory[life.homeHistory.length - 1];
  const finalPhoto = log[log.length - 1]?.photo ?? [life.name];
  const born = life.homeHistory[0];
  const epilogue = [
    born ? `${districtName(born.district)}의 ${PROP_TYPES[born.type].name}에서 태어난 아이는` : "",
    lastHome.tenure === "nursing" ? `${age}살, ${districtName(lastHome.district)}의 요양원에서 눈을 감았습니다.` : lastHome.tenure === "withkid" ? `${age}살, ${districtName(lastHome.district)}의 자녀 집 작은 방에서 눈을 감았습니다.` : `${age}살, ${districtName(lastHome.district)}의 ${PROP_TYPES[lastHome.type].name}에서 눈을 감았습니다.`,
    finalPhoto.length > 1 ? `마지막 연말 사진에는 ${finalPhoto.length}명이 함께 있었습니다.` : "마지막 연말 사진에는 혼자였습니다. 창밖으로 눈이 내렸습니다.",
    longestHome ? `가장 오래 산 집은 ${districtName(longestHome.district)} ${PROP_TYPES[longestHome.type].name}, ${longest}년이었습니다. "${longestHome.memory}"` : "",
  ].filter(Boolean);

  const keysList = life.homeHistory.map((h) => ({
    where: h.tenure === "nursing" ? `${districtName(h.district)} 요양원` : h.tenure === "withkid" ? `${districtName(h.district)} 자녀의 집` : `${districtName(h.district)} ${PROP_TYPES[h.type].name}`,
    years: `${h.from}–${h.to ?? life.year}`,
    tenure: TENURE_KO[h.tenure],
    memory: h.memory,
  }));
  const cards = life.jobHistory.map((j) => ({ job: jobById(j.jobId).card, years: `${j.from}–${j.to ?? life.year}` }));

  // 현실 비교 한 줄 [추론: 프로토타입은 고정 분포 근사]
  const similar = age >= 90 ? 14 : age >= 80 ? 48 : age >= 70 ? 26 : 12;
  const realityLine = `같은 해 서울에서 시작한 100명 중 약 ${similar}명이 ${age >= 90 ? "90살을 넘겨" : age >= 80 ? "80대까지" : age >= 70 ? "70대까지" : "70살 전에"} 살았습니다. 집을 한 채라도 가져 본 사람은 약 ${everOwned ? 56 : 44}명 [추론] 중 하나${everOwned ? "였습니다" : "가 아니었습니다"}.`;

  const nw = netWorth(life, wy);
  const propertyRecord = [
    `평생 가져 본 집·가게: ${everOwned}채 · 마지막까지 보유: ${keys}채`,
    ...life.props.map((p) => `· ${districtName(p.district)} ${PROP_TYPES[p.type].name} (${p.boughtYear}년 매수, ${p.mode === "live" ? "거주" : "임대"})`),
    `남긴 순자산: ${fmtMoney(nw)}`,
  ];

  return {
    title,
    axes: chosen,
    epilogue,
    keys: keysList,
    cards,
    realityLine,
    propertyRecord,
    deathAge: age,
    happy,
    lack: { money: "돈", time: "시간", body: "체력", rel: "관계" }[lack] ?? "",
    rich: { money: "돈", time: "시간", body: "체력", rel: "관계" }[richK] ?? "",
    startLine: `${life.birthYear}년 ${born ? districtName(born.district) : "서울"}에서 태어나, 집 ${life.homeHistory.length}곳을 거쳐, ${age}살에 ${lastHome.tenure === "nursing" ? "요양원" : districtName(lastHome.district)}에서.`,
  };
}
