// 이미지 자리(asset ID) 목록. public/assets/{id}.png 를 넣으면 화면에 자동으로 채워진다.
// ID 규칙은 art-pipeline 작업계획서의 시트 ID와 맞춰 쓰면 된다.
import { DISTRICTS, PROP_TYPES } from "./seoul";
import { JOBS, LATER_JOBS } from "./jobs";

export interface AssetSlot { id: string; ratio: string; size: string; desc: string }

export const EVENT_SCENES = [
  "evt_child_playground", "evt_child_move", "evt_child_sibling", "evt_child_room", "evt_child_teen", "evt_child_flood", "evt_child_study", "evt_child_twenty", "evt_child_leave", "evt_child_parttime", "evt_child_backpack", "evt_child_romance", "evt_first_job", "evt_dating", "evt_breakup", "evt_side_job", "evt_vacation", "evt_car", "evt_hobby", "evt_interior", "evt_interest", "evt_kkeul", "evt_sell", "evt_meet_parents", "evt_house_pressure", "evt_new_year",
  "evt_inherit", "evt_eldercare", "evt_landlord_sells", "evt_model_house", "evt_commute", "evt_room_short", "evt_noise", "evt_mold", "evt_regular_shop", "evt_kid_school",
  "evt_redevelop", "evt_price_up", "evt_price_down", "evt_empty_nest", "evt_stairs", "evt_tenant_call",
  "evt_contract_message", "evt_jobhunt", "evt_retire", "evt_landlord", "evt_marriage", "evt_child",
  "evt_job_offer", "evt_study", "evt_parents_care", "evt_friend_startup", "evt_pet", "evt_checkup", "evt_hospital", "evt_lonely", "evt_kid_commute", "evt_grandparents", "evt_friend_call", "evt_retire_days",
  "evt_help_kid", "evt_grandkids", "evt_downsize", "evt_news_tv", "evt_quiet",
  ...DISTRICTS.map((d) => `evt_district_${d.id}`),
];

export const homeSceneId = (type: string, district: string, tenure: string) =>
  tenure === "nursing" ? "home_nursing" : tenure === "withkid" ? "home_withkid" : tenure === "parents" ? `home_parents_${type}_${district}` : `home_${type}_${district}`;
export const exteriorId = (type: string, district: string) => `ext_${type}_${district}`;
export const photoId = (n: number) => `photo_family_${Math.min(12, Math.max(1, n))}`;

export function allAssetSlots(): AssetSlot[] {
  const out: AssetSlot[] = [
    { id: "ui_title", ratio: "4:5", size: "640x800", desc: "타이틀 화면 — 서울 야경, 창문 불빛" },
    { id: "ui_q_school", ratio: "16:10", size: "640x400", desc: "시작 질문 1 — 학창 시절(교실·운동장)" },
    { id: "ui_q_twenty", ratio: "16:10", size: "640x400", desc: "시작 질문 2 — 스무 살, 집을 나서는 현관" },
    { id: "ui_q_first", ratio: "16:10", size: "640x400", desc: "시작 질문 3 — 첫 출근길 지하철" },
    { id: "ui_city_seoul", ratio: "16:10", size: "640x400", desc: "시작 소개 — 서울 전경" },
    { id: "map_seoul", ratio: "4:3", size: "640x480", desc: "도시 지도 — 도트 타일맵(구 6개 영역)" },
    { id: "ending_bg", ratio: "4:5", size: "640x800", desc: "엔딩 배경 — 노을 진 창가" },
    { id: "home_nursing", ratio: "16:10", size: "640x400", desc: "요양원 창가 침대" },
    { id: "home_withkid", ratio: "16:10", size: "640x400", desc: "자녀 집의 작은 방" },
    ...[["villa", "gwanak"], ["villa", "eunpyeong"], ["apt84", "nowon"], ["apt59", "mapo"], ["apt84", "gangnam"]].map(([t, d]) => ({ id: `home_parents_${t}_${d}`, ratio: "16:10", size: "640x400", desc: `어린 시절 집 — ${d} ${t} (부모님 집, 아이 시점)` })),
  ];
  for (const d of DISTRICTS)
    for (const t of Object.values(PROP_TYPES)) {
      if (t.livable) out.push({ id: `home_${t.id}_${d.id}`, ratio: "16:10", size: "640x400", desc: `${d.name} ${t.name} 실내 — 창밖으로 ${d.name} 풍경` });
      out.push({ id: `ext_${t.id}_${d.id}`, ratio: "1:1", size: "256x256", desc: `${d.name} ${t.name} 외관(매물 썸네일)` });
    }
  for (const s of ["spring", "summer", "autumn", "winter"]) out.push({ id: `season_${s}`, ratio: "1:1", size: "128x128", desc: `계절 배지 — ${s}` });
  for (const e of EVENT_SCENES) out.push({ id: e, ratio: "1:1", size: "256x256", desc: `이벤트 장면 ${e}` });
  for (let n = 1; n <= 12; n++) out.push({ id: `photo_family_${n}`, ratio: "4:3", size: "480x360", desc: `연말 가족사진 — ${n}명${n === 12 ? " 이상" : ""}` });
  for (const j of [...JOBS, ...LATER_JOBS]) out.push({ id: `job_${j.id}`, ratio: "1:1", size: "128x128", desc: `직업 아이콘 — ${j.name}` });
  return out;
}
