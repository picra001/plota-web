// 밸런스 시뮬레이션: npm run sim  (자동 vs 숙련 봇, §17.6)
import { generateWorld } from "../src/engine/market";
import { createLife, netWorth, ownedCount } from "../src/engine/life";
import { autoToEnd, type AutoMode } from "../src/engine/auto";
import { buildEnding } from "../src/engine/ending";
import { worldYear } from "../src/engine/market";

declare const process: { argv: string[] };
const N = Number(process.argv[2] ?? 1500);
function run(mode: AutoMode) {
  const ages: number[] = []; let owned = 0, landlord = 0, rich = 0, long = 0, lost = 0;
  const titles = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const world = generateWorld(1000 + i, 110);
    const life = createLife(5000 + i, world);
    autoToEnd(life, world, mode);
    const e = buildEnding(life, world);
    ages.push(e.deathAge);
    if (life.everOwned) owned++;
    if (ownedCount(life) + life.props.filter(p=>p.type==="shop").length >= 5) landlord++;
    if (netWorth(life, worldYear(world, life.year)) > 300000) rich++;
    if (e.deathAge >= 95) long++;
    if (life.lostHome) lost++;
    const k = e.axes.map(a=>a.axis).join("+"); titles.set(k, (titles.get(k) ?? 0) + 1);
  }
  ages.sort((a,b)=>a-b);
  const pct = (x:number)=> (100*x/N).toFixed(1)+"%";
  console.log(`\n[${mode}] N=${N}`);
  console.log(`수명 중앙값 ${ages[N>>1]}, 평균 ${(ages.reduce((a,b)=>a+b,0)/N).toFixed(1)}`);
  console.log(`집 가져 본 비율 ${pct(owned)} · 5채 이상 ${pct(landlord)} · 순자산 30억+ ${pct(rich)} · 95세+ ${pct(long)} · 경매 경험 ${pct(lost)}`);
  console.log("칭호 축 상위:", [...titles.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`${k} ${pct(v)}`).join(" | "));
}
run("auto"); run("skilled");
