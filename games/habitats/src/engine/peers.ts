// 비교 층 — 같은 시간을 사는 사람들. 가끔 소식이 온다. 대도시의 팍팍함은 대부분 '상대적'이다.
import { DISTRICTS, PROP_TYPES } from "../data/seoul";
import { chance, int, pick, weighted } from "./rng";
import type { Life } from "./types";
import { feed } from "./feed";

export interface Peer { name: string; rel: string; district: string; news: { year: number; text: string; kind: "home" | "marry" | "kid" | "job" | "move" | "loss" }[] }

const PEER_NAMES = ["민서", "하준", "소율", "건우", "다은", "우진", "채원", "현우"];

export function makePeers(l: Life): Peer[] {
  const r = l.rng;
  const rels = ["대학 동기", "동네 친구", l.flags.sibling ? "동생" : "사촌"];
  const used = new Set([l.name]);
  return rels.map((rel) => {
    let name = pick(r, PEER_NAMES);
    while (used.has(name)) name = pick(r, PEER_NAMES);
    used.add(name);
    const news: Peer["news"] = [];
    let district = pick(r, DISTRICTS).id;
    const y = (age: number) => l.birthYear + age + (rel === "동생" ? 3 : 0);
    if (chance(r, 0.65)) { const a = int(r, 28, 37); news.push({ year: y(a), text: `${rel} ${name}이(가) 결혼했다. 신혼집은 ${pick(r, DISTRICTS).name}의 전세.`, kind: "marry" }); }
    if (chance(r, 0.55)) {
      const a = int(r, 31, 46);
      const d = weighted(r, DISTRICTS, (x) => (x.apt84 > 150000 ? 0.6 : 1.2));
      const t = pick(r, ["apt59", "apt84", "villa"] as const);
      news.push({ year: y(a), text: `${rel} ${name}이(가) ${d.name}에 ${PROP_TYPES[t].name}을(를) 샀다. ${a}살.`, kind: "home" });
      district = d.id;
    }
    const special = weighted(r, ["none", "emigrate", "startup", "exec", "rural", "loss"], (k) => ({ none: 4, emigrate: 0.8, startup: 1.2, exec: 0.8, rural: 0.6, loss: 0.6 } as Record<string, number>)[k]);
    const a = int(r, 33, 55);
    if (special === "emigrate") news.push({ year: y(a), text: `${rel} ${name}이(가) 가족과 함께 해외로 이민을 갔다. 공항에서 마지막으로 통화했다.`, kind: "move" });
    if (special === "startup") news.push({ year: y(a), text: `${rel} ${name}이(가) 회사를 그만두고 가게를 열었다. ${chance(r, 0.5) ? "개업식에 화환을 보냈다." : "2년 뒤 문을 닫았다는 소식을 들었다."}`, kind: "job" });
    if (special === "exec") news.push({ year: y(a), text: `${rel} ${name}이(가) 임원이 됐다고 한다. 단톡방이 축하로 가득 찼다.`, kind: "job" });
    if (special === "rural") news.push({ year: y(a), text: `${rel} ${name}이(가) 서울 집을 팔고 지방 소도시로 내려갔다. "마당이 생겼어."`, kind: "move" });
    if (special === "loss") news.push({ year: y(a + 5), text: `${rel} ${name}의 부고를 받았다. 너무 이른 나이였다.`, kind: "loss" });
    return { name, rel, district, news: news.sort((x, z) => x.year - z.year) };
  });
}

/** 서울 나이대별 '집을 가진 사람' 비율 [추론: 대략값, 확정 후 통계청 자료로 교체] */
const OWN_RATE: Record<number, number> = { 30: 14, 35: 28, 40: 40, 45: 48, 50: 54, 55: 58, 60: 60 };

/** 해마다 봄에: 비교 소식과 통계 한 줄 */
export function peerNews(l: Life) {
  const peers = (l as Life & { peers?: Peer[] }).peers ?? [];
  const owns = l.props.some((p) => p.mode === "live") || l.home.tenure === "own";
  for (const p of peers) for (const n of p.news) {
    if (n.year !== l.year) continue;
    feed(l, "peer", n.text);
    if (n.kind === "home" && !owns) { l.mind = Math.max(0, l.mind - 2); feed(l, "peer", "축하한다고 답장을 보내고, 한참 휴대폰을 내려놓지 못했다."); }
    if (n.kind === "loss") { l.mind = Math.max(0, l.mind - 4); }
    if (n.kind === "move") l.gak = Math.max(0, l.gak - 1);
  }
  const rate = OWN_RATE[l.age];
  if (rate !== undefined) feed(l, "stat", `서울의 ${l.age}살 중 자기 집에 사는 사람은 약 ${rate}% [추론]. 당신은 그 ${owns ? "안" : "밖"}에 있다.`);
}
