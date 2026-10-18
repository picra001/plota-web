"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { useUiLang } from "./localized-link";
import {
  DEFAULT_CLIP, KIND_DEFAULTS, KINDS, LIBRARY_CLIPS, MAX_CLIPS, MAX_CLIP_BYTES, MAX_IMAGE_BYTES, OPTION_RANGES,
  OVERDARE_TRIS_LIMIT, MECH_TOP_SHARE, hasTris, largestPartTris,
  FbxApiError, getHealth, rememberInvite, rememberJob, savedInvite, submitJob,
  type Kind, type KindOptions,
} from "@/lib/fbx-api";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function clipName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "");
  return stem.replace(/[^A-Za-z0-9_-]/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "Clip";
}

function sizeText(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const COPY = {
  ko: {
    badType: "PNG, JPG, WEBP 이미지만 올릴 수 있습니다.", tooBig: (mb: number) => `이미지는 ${mb}MB 이하여야 합니다.`,
    badClip: "애니메이션 클립은 Mixamo FBX 파일이어야 합니다.", clipBig: (n: string, mb: number) => `${n} 파일이 ${mb}MB 를 넘습니다.`,
    maxClips: (n: number) => `클립은 최대 ${n}개까지 고를 수 있습니다.`, failed: "문제가 생겼습니다. 다시 시도해 주세요.",
    s0: "01 / 무엇을 만들까요", kindLegend: "만들 것",
    kinds: {
      character: { name: "캐릭터", desc: "뼈대와 애니메이션이 들어간 인물·동물. Mixamo 동작을 붙입니다.", tip: "캐릭터 한 명이 정면을 보고 팔을 몸에서 뗀 그림이 좋습니다." },
      static: { name: "정적 물체", desc: "나무, 테이블, 상자처럼 놓아두는 물체. 뼈대 없는 FBX 1개.", tip: "물체 하나만, 비스듬한 각도에서 형태가 잘 보이는 그림이 좋습니다." },
      mech: { name: "움직이는 장치", desc: "포탑처럼 윗부분이 회전축으로 따로 움직이는 장치. 받침·윗부분 FBX 2개.", tip: "측면이나 정면에서 받침과 윗부분의 경계가 수평으로 보이는 그림이 좋습니다." },
      ground: { name: "바닥", desc: "바닥 무늬 그림을 평평한 바닥 판 FBX로. 1분 안쪽.", tip: "위에서 내려다본 바닥 무늬 그림. 가운데 정사각형을 씁니다." },
    } as Record<Kind, { name: string; desc: string; tip: string }>,
    s1: "02 / 그림", invite: "초대 코드", invitePh: "받은 코드를 입력하세요", drawing: "그림",
    drop: "PNG·JPG·WEBP 파일을 끌어다 놓거나 고르세요. 10MB 이하.", choose: "파일 고르기", chooseAgain: "다른 파일 고르기",
    s2: "03 / 애니메이션", clips: "넣을 동작", yours: "내 파일", remove: "빼기", addClip: "Mixamo FBX 클립 추가",
    mainClip: "메인 FBX에 넣을 동작", clipNote: (n: number) => `Mixamo 에서 FBX Binary · With Skin · 30fps 로 받아 주세요. 최대 ${n}개.`,
    s2opt: "03 / 크기와 설정",
    height: "높이 (cm)", heightNote: "스튜디오에 들어갔을 때의 전체 높이. 비워 두면 기본값.",
    mechHeight: "전체 높이 (cm)", split: "자르는 높이", splitNote: "오른쪽 그림의 선을 끌어 받침과 윗부분의 경계에 맞추세요. 윗부분은 이 높이를 회전축으로 돕니다.",
    splitValue: (p: number) => `위에서 ${p}%`, front: "그림 속 장치가 바라보는 쪽", fronts: { viewer: "나를 봄 (정면)", left: "왼쪽", right: "오른쪽" },
    size: "바닥 한 변 (cm)", sizeNote: "최대 2040cm. 넓은 바닥은 여러 장을 이어 붙이세요.", repeat: "무늬 반복 횟수", repeatNote: "타일 무늬면 4~8, 한 장 그림이면 1.",
    s3: (k: Kind) => (k === "character" ? "04 / 보내기 전에" : "04 / 보내기 전에"),
    consent: "내가 권리를 가진 그림이며, 그림과 결과가 링크를 아는 누구나 볼 수 있는 페이지에 올라가는 데 동의합니다.",
    sending: "보내는 중…", send: "그림 보내기", offline: "지금은 작업실 PC가 꺼져 있습니다. 대기열에 올려 두면 켜지는 대로 처리합니다.",
    preview: "고른 그림", previewAlt: "고른 그림", ready: "보낼 준비 완료", empty: "그림 한 장이면 됩니다",
    time: (k: Kind) => (k === "ground" ? "시작 후 1분 안쪽입니다." : k === "mech" ? "부품 2개를 만들어 시작 후 약 10~15분 걸립니다." : "시작 후 약 4~10분 걸립니다."),
    splitHandle: "자르는 선 (위·아래 화살표로 움직임)",
    trisTitle: "메시 밀도", trisLimit: "삼각형 수 제한 (권장)", tris: (k: Kind) => (k === "mech" ? "제한 삼각형 수 (두 부품 합계)" : "제한 삼각형 수"),
    trisNote: (v: number) => `검증된 값 ${n(v)} · OVERDARE 권장 상한 ${n(OVERDARE_TRIS_LIMIT)} (FBX 1개당) · ${n(1000)} 단위로 최대 ${n(50000)}. 많을수록 형태는 매끈하지만 오래 걸리고 무거워집니다.`,
    trisReset: (v: number) => `검증된 값(${n(v)})으로 되돌리기`,
    trisMechSplit: (top: number, base: number) => `윗부분 ${n(top)} · 받침 ${n(base)} 으로 나눠 씁니다.`,
    warnTitle: "확인해 주세요",
    warnVerified: {
      character: (v: number) => `검증된 값(${n(v)})과 다릅니다. 뼈대·가중치·손가락·큰 머리 보정은 ${n(v)} 기준으로만 시험했습니다. 리깅이 실패하거나 동작이 어색해질 수 있고, 시간이 더 걸립니다.`,
      static: (v: number) => `검증된 값(${n(v)})과 다릅니다. 정적 물체는 ${n(v)} 기준으로만 시험했습니다. 형태는 매끈해질 수 있지만 시간이 더 걸리고 파일이 커집니다.`,
      mech: (v: number) => `검증된 값(합계 ${n(v)} = 윗부분 4,000 · 받침 3,000)과 다릅니다. 장치는 이 값으로만 시험했습니다. 두 부품의 이음새·회전축 위치는 그대로지만 시간이 더 걸립니다.`,
      ground: () => "",
    } as Record<Kind, (v: number) => string>,
    warnLimit: (t: number) => `FBX 1개에 삼각형 약 ${n(t)}개 — OVERDARE 권장 상한 ${n(OVERDARE_TRIS_LIMIT)} 을 넘습니다. 스튜디오에서 Import 가 막힐 수 있습니다.`,
    warnUnlimited: "제한 없음: TRELLIS 가 만든 메시를 줄이지 않고 그대로 씁니다(보통 수십만~수백만 삼각형 — 모래주머니 시험에서 368만 개, FBX 136MB). OVERDARE 에는 그대로 넣을 수 없고, 시간이 몇 배로 늘며, 결과 페이지의 3D 미리보기는 나오지 않을 수 있습니다(파일은 내려받을 수 있음).",
    warnUnlimitedChar: "캐릭터는 이 크기에서 리깅이 GPU 오류로 멈춘 기록이 있습니다. 그러면 이 작업만이 아니라 서비스 전체가 멈추고, 관리자가 다시 켜야 합니다.",
  },
  en: {
    badType: "Please choose a PNG, JPG, or WEBP image.", tooBig: (mb: number) => `The image is larger than ${mb} MB.`,
    badClip: "Animation clips must be FBX files from Mixamo.", clipBig: (n: string, mb: number) => `${n} is larger than ${mb} MB.`,
    maxClips: (n: number) => `You can request up to ${n} clips.`, failed: "Something went wrong. Please try again.",
    s0: "01 / WHAT TO MAKE", kindLegend: "Type",
    kinds: {
      character: { name: "Character", desc: "A person or creature with a skeleton and animation. Mixamo clips are added.", tip: "One character facing forward, arms away from the body." },
      static: { name: "Static object", desc: "Something that stays put: a tree, a table, a crate. One FBX, no skeleton.", tip: "One object, drawn from an angle that shows its shape." },
      mech: { name: "Mechanism", desc: "A turret or anything whose top turns on a pivot. Two FBX files: base and top.", tip: "A side or front view where the line between base and top is level." },
      ground: { name: "Ground", desc: "A floor pattern turned into a flat ground tile FBX. Under a minute.", tip: "A top-down floor pattern. The center square is used." },
    } as Record<Kind, { name: string; desc: string; tip: string }>,
    s1: "02 / DRAWING", invite: "Invite code", invitePh: "Enter the code you were given", drawing: "Drawing",
    drop: "Drop a PNG, JPG, or WEBP here, or choose a file. Up to 10 MB.", choose: "Choose a file", chooseAgain: "Choose another file",
    s2: "03 / ANIMATION", clips: "Clips to include", yours: "your file", remove: "Remove", addClip: "Add a Mixamo FBX clip",
    mainClip: "Clip to use in the main FBX", clipNote: (n: number) => `Download Mixamo clips as FBX Binary, With Skin, 30 fps. Up to ${n}.`,
    s2opt: "03 / SIZE AND SETTINGS",
    height: "Height (cm)", heightNote: "Total height in the studio. Leave empty for the default.",
    mechHeight: "Total height (cm)", split: "Split height", splitNote: "Drag the line on the drawing to the border between base and top. The top turns around this height.",
    splitValue: (p: number) => `${p}% from the top`, front: "Which way the mechanism faces in the drawing", fronts: { viewer: "Toward me (front)", left: "Left", right: "Right" },
    size: "Tile side (cm)", sizeNote: "Up to 2040 cm. Place several tiles for a large floor.", repeat: "Pattern repeats", repeatNote: "4 to 8 for a tiling pattern, 1 for a single picture.",
    s3: () => "04 / BEFORE YOU SEND",
    consent: "I own this drawing and agree that it and the result are published on a page anyone with the link can open.",
    sending: "Sending…", send: "Send the drawing", offline: "The studio PC is offline. Your drawing will be queued and start when it is back.",
    preview: "YOUR DRAWING", previewAlt: "The drawing you selected", ready: "Ready to send", empty: "One drawing is all it takes",
    time: (k: Kind) => (k === "ground" ? "Takes under a minute once it starts." : k === "mech" ? "Builds two parts, about 10 to 15 minutes once it starts." : "Takes about four to ten minutes once it starts."),
    splitHandle: "Split line (move with the up and down arrow keys)",
    trisTitle: "Mesh density", trisLimit: "Limit the triangle count (recommended)", tris: (k: Kind) => (k === "mech" ? "Triangle limit (both parts together)" : "Triangle limit"),
    trisNote: (v: number) => `Tested value ${n(v)} · OVERDARE recommended limit ${n(OVERDARE_TRIS_LIMIT)} per FBX · steps of ${n(1000)} up to ${n(50000)}. More triangles give smoother shapes but take longer and weigh more.`,
    trisReset: (v: number) => `Back to the tested value (${n(v)})`,
    trisMechSplit: (top: number, base: number) => `Split as top ${n(top)} and base ${n(base)}.`,
    warnTitle: "Before you send",
    warnVerified: {
      character: (v: number) => `This differs from the tested value (${n(v)}). Skeleton, skin weights, fingers and the big-head fix were only tested at ${n(v)}. Rigging may fail or motion may look off, and it takes longer.`,
      static: (v: number) => `This differs from the tested value (${n(v)}). Static objects were only tested at ${n(v)}. The shape may get smoother, but it takes longer and the file gets bigger.`,
      mech: (v: number) => `This differs from the tested value (${n(v)} in total: top 4,000, base 3,000). Mechanisms were only tested at that value. The seam and pivot stay the same, but it takes longer.`,
      ground: () => "",
    } as Record<Kind, (v: number) => string>,
    warnLimit: (t: number) => `About ${n(t)} triangles in one FBX, over the OVERDARE recommended limit of ${n(OVERDARE_TRIS_LIMIT)}. The studio may refuse to import it.`,
    warnUnlimited: "No limit: the mesh TRELLIS builds is used as is, usually hundreds of thousands to millions of triangles (3.68 million and a 136 MB FBX for a sandbag test). It cannot go into OVERDARE as is, takes several times longer, and the 3D preview on the result page may not appear (the files can still be downloaded).",
    warnUnlimitedChar: "For characters, rigging at this size has crashed the GPU before. That stops the whole service, not just this job, until an operator restarts it.",
  },
};

/** 제한 삼각형 수 슬라이더 [최소, 최대, 단위]. API 는 500~50,000 을 받지만 사이트는 1,000 단위로 고른다. */
const TRIS_SLIDER = [1000, 50000, 1000] as const;

function n(v: number): string {
  return Math.round(v).toLocaleString("en-US");
}

function clampNum(v: number, [lo, hi]: readonly [number, number]): number {
  return Math.min(hi, Math.max(lo, v));
}

export function FbxCreateApp() {
  const router = useRouter();
  const pathname = usePathname() || "/ko/fbx/create";
  const segment = pathname.split("/")[1];
  const lang = isLocale(segment) ? segment : "ko";
  const t = COPY[useUiLang()];

  const [kind, setKind] = useState<Kind>("character");
  const [opts, setOpts] = useState<Record<Kind, KindOptions>>({ ...KIND_DEFAULTS });
  const [invite, setInvite] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [clips, setClips] = useState<string[]>([DEFAULT_CLIP]);
  const [defaultClip, setDefaultClip] = useState(DEFAULT_CLIP);
  const [uploads, setUploads] = useState<{ name: string; file: File }[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const clipInput = useRef<HTMLInputElement>(null);
  const splitBox = useRef<HTMLDivElement>(null);
  const splitDrag = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setInvite(q.get("invite") || savedInvite());
    const k = q.get("kind");
    if (k && (KINDS as string[]).includes(k)) setKind(k as Kind);
  }, []);

  useEffect(() => {
    let alive = true;
    getHealth().then(h => { if (alive) setOnline(h.worker_online); }).catch(() => { if (alive) setOnline(null); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!image) { setImageUrl(null); return; }
    const url = URL.createObjectURL(image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function setOpt(k: Kind, key: keyof KindOptions, value: KindOptions[keyof KindOptions]) {
    setOpts(prev => ({ ...prev, [k]: { ...prev[k], [key]: value } }));
  }

  function pickImage(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { setError(t.badType); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError(t.tooBig(MAX_IMAGE_BYTES / 1024 / 1024)); return; }
    setImage(file);
  }

  function pickClip(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!/\.fbx$/i.test(file.name)) { setError(t.badClip); return; }
    if (file.size > MAX_CLIP_BYTES) { setError(t.clipBig(file.name, MAX_CLIP_BYTES / 1024 / 1024)); return; }
    const name = clipName(file.name);
    const total = new Set([...clips, ...uploads.map(u => u.name), name]).size;
    if (total > MAX_CLIPS) { setError(t.maxClips(MAX_CLIPS)); return; }
    setUploads(prev => [...prev.filter(u => u.name !== name), { name, file }]);
    setDefaultClip(prev => prev || name);
  }

  function toggleClip(name: string) {
    setClips(prev => {
      const next = prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name];
      if (next.length + uploads.length > MAX_CLIPS) { setError(t.maxClips(MAX_CLIPS)); return prev; }
      setError(null);
      return next;
    });
  }

  // 장치(mech): 그림 위 가로선 = 자르는 높이 (그림 높이 대비 0.05~0.95)
  function splitFromPointer(clientY: number) {
    const box = splitBox.current?.getBoundingClientRect();
    if (!box || box.height <= 0) return;
    setOpt("mech", "split", Math.round(clampNum((clientY - box.top) / box.height, [0.05, 0.95]) * 1000) / 1000);
  }

  const split = opts.mech.split ?? 0.5;
  const allClips = [...clips, ...uploads.map(u => u.name)];
  const ready = Boolean(invite.trim() && image && consent && (kind !== "character" || allClips.length) && !busy);

  function cleanOptions(): KindOptions {
    const o = { ...opts[kind] };
    if (hasTris(kind)) {
      const def = KIND_DEFAULTS[kind].tris as number;
      o.tris = o.tris === "unlimited" ? "unlimited" : clampNum(Math.round(Number(o.tris) || def), OPTION_RANGES.tris);
    }
    if (o.height_cm !== undefined) o.height_cm = clampNum(Number(o.height_cm) || KIND_DEFAULTS[kind].height_cm!, OPTION_RANGES.height_cm);
    if (o.size_cm !== undefined) o.size_cm = clampNum(Number(o.size_cm) || 2000, OPTION_RANGES.size_cm);
    if (o.uv_repeat !== undefined) o.uv_repeat = clampNum(Math.round(Number(o.uv_repeat) || 1), OPTION_RANGES.uv_repeat);
    return o;
  }

  async function submit() {
    if (!image || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitJob({
        invite,
        image,
        kind,
        options: cleanOptions(),
        clips,
        defaultClip: allClips.includes(defaultClip) ? defaultClip : allClips[0],
        uploads,
        isPublic: true,
      });
      rememberInvite(invite.trim());
      if (result.owner_token) rememberJob(result.id, result.owner_token);
      router.push(`/${lang}/fbx/job?id=${encodeURIComponent(result.id)}${result.duplicate ? "&again=1" : ""}`);
    } catch (e) {
      setError(e instanceof FbxApiError ? e.message : t.failed);
      setBusy(false);
    }
  }

  const numberField = (id: string, label: string, note: string, k: Exclude<Kind, "character">, key: "height_cm" | "size_cm" | "uv_repeat", range: readonly [number, number], step = 1) => (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="fbx-input" type="number" inputMode="decimal" min={range[0]} max={range[1]} step={step}
        value={opts[k][key] ?? ""} onChange={e => setOpt(k, key, e.target.value === "" ? undefined : Number(e.target.value))} />
      <p className="small-note">{note}</p>
    </>
  );

  // 삼각형 수: 기본 = 종류별 검증값. 체크 해제 = 제한 없음. 검증값과 다르거나 OVERDARE 상한을 넘으면 경고.
  const trisDef = (KIND_DEFAULTS[kind].tris as number | undefined) ?? 0;
  const trisRaw = opts[kind].tris;
  const unlimited = trisRaw === "unlimited";
  const trisNum = unlimited ? null : clampNum(Math.round(Number(trisRaw) || trisDef), OPTION_RANGES.tris);
  const trisWarnings: string[] = [];
  if (hasTris(kind)) {
    if (unlimited) {
      trisWarnings.push(t.warnUnlimited);
      if (kind === "character") trisWarnings.push(t.warnUnlimitedChar);
    } else if (trisNum !== null) {
      if (trisNum !== trisDef) trisWarnings.push(t.warnVerified[kind](trisDef));
      const part = largestPartTris(kind, trisNum);
      if (part !== null && part > OVERDARE_TRIS_LIMIT) trisWarnings.push(t.warnLimit(part));
    }
  }
  const trisBlock = hasTris(kind) && (
    <>
      <span className="eyebrow fbx-sub-eyebrow">{t.trisTitle}</span>
      <label className="fbx-check">
        <input type="checkbox" checked={!unlimited}
          onChange={e => setOpt(kind, "tris", e.target.checked ? trisDef : "unlimited")} />
        <span>{t.trisLimit}</span>
      </label>
      {!unlimited && (
        <>
          <label htmlFor="opt-tris">{t.tris(kind)}: <strong>{n(trisNum ?? trisDef)}</strong></label>
          {/* 1,000 단위 슬라이더. 눈금 = 검증값·OVERDARE 권장 상한 */}
          <input id="opt-tris" type="range" min={TRIS_SLIDER[0]} max={TRIS_SLIDER[1]} step={TRIS_SLIDER[2]} list="tris-marks"
            value={trisNum ?? trisDef} aria-valuetext={n(trisNum ?? trisDef)}
            onChange={e => setOpt(kind, "tris", Number(e.target.value))} />
          <datalist id="tris-marks">
            <option value={trisDef} />
            <option value={OVERDARE_TRIS_LIMIT} />
          </datalist>
          {kind === "mech" && trisNum !== null && (
            <p className="small-note">{t.trisMechSplit(Math.round(trisNum * MECH_TOP_SHARE), trisNum - Math.round(trisNum * MECH_TOP_SHARE))}</p>
          )}
        </>
      )}
      <p className="small-note">
        {t.trisNote(trisDef)}{" "}
        {trisRaw !== trisDef && (
          <button type="button" className="text-link" onClick={() => setOpt(kind, "tris", trisDef)}>{t.trisReset(trisDef)}</button>
        )}
      </p>
      {trisWarnings.length > 0 && (
        <div className="fbx-warn" role="note">
          <strong>{t.warnTitle}</strong>
          {trisWarnings.map(w => <p key={w}>{w}</p>)}
        </div>
      )}
    </>
  );

  return (
    <div className="creation-demo">
      <div className="creation-controls">
        <span className="eyebrow">{t.s0}</span>
        <fieldset className="fbx-fieldset fbx-kinds">
          <legend>{t.kindLegend}</legend>
          {KINDS.map(k => (
            <label key={k} className={kind === k ? "fbx-kind active" : "fbx-kind"}>
              <input type="radio" name="fbx-kind" value={k} checked={kind === k} onChange={() => { setKind(k); setError(null); }} />
              <span><strong>{t.kinds[k].name}</strong><small>{t.kinds[k].desc}</small></span>
            </label>
          ))}
        </fieldset>

        <span className="eyebrow">{t.s1}</span>
        <label htmlFor="invite-code">{t.invite}</label>
        <input id="invite-code" className="fbx-input" value={invite} autoComplete="off" spellCheck={false}
          placeholder={t.invitePh} onChange={e => setInvite(e.target.value)} />

        <label htmlFor="drawing-file">{t.drawing}</label>
        <div className={dragging ? "fbx-dropzone dragging" : "fbx-dropzone"}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pickImage(e.dataTransfer.files[0]); }}>
          <input id="drawing-file" ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp"
            onChange={e => pickImage(e.target.files?.[0])} />
          {image ? <p>{image.name} / {sizeText(image.size)}</p> : <p>{t.drop}</p>}
          <button type="button" className="button outline" onClick={() => imageInput.current?.click()}>
            {image ? t.chooseAgain : t.choose}
          </button>
        </div>
        <p className="small-note">{t.kinds[kind].tip}</p>

        {kind === "character" ? (
          <>
            <span className="eyebrow">{t.s2}</span>
            <fieldset className="fbx-fieldset">
              <legend>{t.clips}</legend>
              {LIBRARY_CLIPS.map(name => (
                <label key={name} className="fbx-check">
                  <input type="checkbox" checked={clips.includes(name)} onChange={() => toggleClip(name)} />
                  <span>{name}</span>
                </label>
              ))}
              {uploads.map(u => (
                <label key={u.name} className="fbx-check">
                  <input type="checkbox" checked readOnly />
                  <span>{u.name} / {t.yours}</span>
                  <button type="button" className="text-link" onClick={() => setUploads(prev => prev.filter(x => x.name !== u.name))}>{t.remove}</button>
                </label>
              ))}
              <input ref={clipInput} type="file" accept=".fbx" hidden onChange={e => { pickClip(e.target.files?.[0]); if (clipInput.current) clipInput.current.value = ""; }} />
              <button type="button" className="button outline" onClick={() => clipInput.current?.click()}>{t.addClip}</button>
            </fieldset>
            {allClips.length > 1 && (
              <>
                <label htmlFor="default-clip">{t.mainClip}</label>
                <select id="default-clip" value={allClips.includes(defaultClip) ? defaultClip : allClips[0]} onChange={e => setDefaultClip(e.target.value)}>
                  {allClips.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </>
            )}
            <p className="small-note">{t.clipNote(MAX_CLIPS)}</p>
            {trisBlock}
          </>
        ) : (
          <>
            <span className="eyebrow">{t.s2opt}</span>
            {kind === "static" && numberField("opt-height", t.height, t.heightNote, "static", "height_cm", OPTION_RANGES.height_cm)}
            {kind === "mech" && (
              <>
                {numberField("opt-mech-height", t.mechHeight, t.heightNote, "mech", "height_cm", OPTION_RANGES.height_cm)}
                <label htmlFor="opt-split">{t.split}: {t.splitValue(Math.round(split * 100))}</label>
                <input id="opt-split" type="range" min={0.05} max={0.95} step={0.005} value={split}
                  onChange={e => setOpt("mech", "split", Number(e.target.value))} />
                <p className="small-note">{t.splitNote}</p>
                <label htmlFor="opt-front">{t.front}</label>
                <select id="opt-front" value={opts.mech.front ?? "viewer"} onChange={e => setOpt("mech", "front", e.target.value as KindOptions["front"])}>
                  {(["viewer", "left", "right"] as const).map(f => <option key={f} value={f}>{t.fronts[f]}</option>)}
                </select>
              </>
            )}
            {kind === "ground" && (
              <>
                {numberField("opt-size", t.size, t.sizeNote, "ground", "size_cm", OPTION_RANGES.size_cm, 10)}
                {numberField("opt-repeat", t.repeat, t.repeatNote, "ground", "uv_repeat", OPTION_RANGES.uv_repeat)}
              </>
            )}
            {trisBlock}
          </>
        )}

        <span className="eyebrow">{t.s3(kind)}</span>
        <label className="fbx-check">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span>{t.consent}</span>
        </label>

        {error && <p className="fbx-error" role="alert">{error}</p>}
        <button className="button primary wide" disabled={!ready} onClick={submit}>
          {busy ? t.sending : t.send}
        </button>
        {online === false && <p className="small-note">{t.offline}</p>}
      </div>

      <div className="creation-preview">
        <span className="eyebrow">{t.preview}</span>
        {imageUrl ? (
          kind === "mech" ? (
            <div className="fbx-split-wrap" ref={splitBox}
              onPointerDown={e => { splitDrag.current = true; (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); splitFromPointer(e.clientY); }}
              onPointerMove={e => { if (splitDrag.current) splitFromPointer(e.clientY); }}
              onPointerUp={() => { splitDrag.current = false; }}
              onPointerCancel={() => { splitDrag.current = false; }}>
              <img className="fbx-split-image" src={imageUrl} alt={t.previewAlt} draggable={false} />
              <div className="fbx-split-shade top" style={{ height: `${split * 100}%` }} aria-hidden="true" />
              <div className="fbx-split-line" style={{ top: `${split * 100}%` }} role="slider" tabIndex={0}
                aria-label={t.splitHandle} aria-valuemin={5} aria-valuemax={95} aria-valuenow={Math.round(split * 100)}
                onKeyDown={e => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpt("mech", "split", clampNum(split + (e.key === "ArrowUp" ? -0.01 : 0.01), [0.05, 0.95]));
                  }
                }}>
                <span>{t.splitValue(Math.round(split * 100))}</span>
              </div>
            </div>
          ) : <img className="fbx-drawing-preview" src={imageUrl} alt={t.previewAlt} />
        ) : <div className="fbx-placeholder" aria-hidden="true" />}
        <div>
          <h3>{image ? t.ready : t.empty}</h3>
          <p className="small-note">{t.time(kind)}</p>
        </div>
      </div>
    </div>
  );
}
