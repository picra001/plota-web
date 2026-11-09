// 돈이 어디서 생기나: 나이대별 평균 소득·지출·이자·저축률·순자산 구성
import { generateWorld, worldYear } from "../src/engine/market";
import { createLife, netWorth, propValue } from "../src/engine/life";
import { autoYear } from "../src/engine/auto";
const N = Number(process.argv[2] ?? 150);
const B: Record<number, { inc: number; sp: number; int: number; rent: number; cash: number; eq: number; nw: number; own: number; loan: number; idx: number; n: number }> = {};
for (let i = 0; i < N; i++) {
  const w = generateWorld(1000 + i, 110); const l = createLife(5000 + i * 13, w, 4);
  while (l.alive && l.age < 80) {
    const rep = autoYear(l, w);
    if (!rep || l.phase !== "adult") continue;
    const a = Math.floor(rep.age / 10) * 10; const b = (B[a] ??= { inc: 0, sp: 0, int: 0, rent: 0, cash: 0, eq: 0, nw: 0, own: 0, loan: 0, idx: 0, n: 0 });
    const wy = worldYear(w, rep.year, 1);
    b.inc += rep.income; b.sp += rep.spend; b.int += rep.interest; b.rent += rep.rentIncome; b.cash += l.cash;
    b.eq += l.props.reduce((s, p) => s + propValue(p, wy) - p.loan, 0); b.loan += l.props.reduce((s, p) => s + p.loan, 0);
    b.nw += netWorth(l, wy); b.own += l.props.length ? 1 : 0; b.idx += wy.index; b.n++;
  }
}
const f = (v: number) => (v / 10000).toFixed(1) + "억";
console.log("나이 | 소득/년 | 지출/년 | 이자/년 | 저축률 | 현금 | 집 순가치 | 대출 | 순자산 | 자가 | 집값지수");
for (const [a, b] of Object.entries(B)) { const k = (x: number) => x / b.n; console.log(`${a}대 | ${Math.round(k(b.inc))} | ${Math.round(k(b.sp))} | ${Math.round(k(b.int))} | ${Math.round((1 - (k(b.sp) + k(b.int)) / k(b.inc + b.rent)) * 100)}% | ${f(k(b.cash))} | ${f(k(b.eq))} | ${f(k(b.loan))} | ${f(k(b.nw))} | ${Math.round(k(b.own) * 100)}% | ${k(b.idx).toFixed(2)}`); }
