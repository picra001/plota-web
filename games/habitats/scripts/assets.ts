// 이미지 자리 목록을 CSV로 뽑는다: npm run assets → public/assets/ASSET_LIST.csv
import { allAssetSlots } from "../src/data/assets";
import { writeFileSync } from "node:fs";
const rows = allAssetSlots();
const csv = ["asset_id,ratio,size,desc,file", ...rows.map((r) => `${r.id},${r.ratio},${r.size},"${r.desc}",public/assets/${r.id}.png`)].join("\n");
writeFileSync("public/assets/ASSET_LIST.csv", "﻿" + csv);
console.log(`${rows.length} slots → public/assets/ASSET_LIST.csv`);
