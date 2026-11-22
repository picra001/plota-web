"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { useUiLang } from "./localized-link";
import {
  ANIMAL_CLIPS, ANIMAL_DEFAULT_CLIP, ANIMAL_TRIS_MAX, DEFAULT_CLIP, KIND_DEFAULTS, KINDS, LIBRARY_CLIPS, MAX_CHAR_FBX_BYTES, MAX_CLIPS, MAX_CLIP_BYTES, MAX_IMAGE_BYTES, OPTION_RANGES,
  OVERDARE_TRIS_LIMIT, MECH_TOP_SHARE, hasClips, hasTris, largestPartTris,
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

/** 동물 시트 입력(2026-11-22) 예시·프롬프트. 예시 = comfyui-docker ovdr_animal/refs/tiger_sheet_01.png (서빙 관통 시험에 쓴 그림).
 *  프롬프트는 시트 약속(같은 바닥선, 왼쪽부터 정면 → 비스듬한 정면 → 옆, 같은 선 자세, 그림자 없음)을 그대로 적은 것. */
const ANIMAL_SHEET_EXAMPLE = "/images/fbx/animal-sheet-example.png";
const ANIMAL_SHEET_EXAMPLE_PREVIEW = "/images/fbx/animal-sheet-example-preview.jpg";
const ANIMAL_SHEET_PROMPT = "Character turnaround sheet of a single [ANIMAL], low-poly stylized 3D game asset look. Three full-body standing views side by side on the same ground line, from left to right: front view, three-quarter front view, side view facing left. Identical neutral standing pose in every view: all four legs straight and planted on the ground, head facing straight ahead, tail relaxed. Same proportions, colors, and markings in every view. The views do not overlap. Plain flat light-beige background, even lighting, no cast shadows, no ground shadows, no text, no labels, no borders, no extra objects. Wide 3:2 image.";

const COPY = {
  ko: {
    badType: "PNG, JPG, WEBP 이미지만 올릴 수 있습니다.", tooBig: (mb: number) => `이미지는 ${mb}MB 이하여야 합니다.`,
    badClip: "애니메이션 클립은 Mixamo FBX 파일이어야 합니다.", clipBig: (n: string, mb: number) => `${n} 파일이 ${mb}MB 를 넘습니다.`,
    maxClips: (n: number) => `클립은 최대 ${n}개까지 고를 수 있습니다.`, failed: "문제가 생겼습니다. 다시 시도해 주세요.",
    s0: "01 / 무엇을 만들까요", kindLegend: "만들 것",
    kinds: {
      character: { name: "캐릭터", desc: "뼈대와 애니메이션이 들어간 두 발로 선 인물·캐릭터. Mixamo 동작을 붙입니다. 네발 동물은 '동물'을 고르세요.", tip: "캐릭터 한 명이 정면을 보고 팔을 몸에서 뗀 그림이 좋습니다." },
      static: { name: "정적 물체", desc: "나무, 테이블, 상자처럼 놓아두는 물체. 뼈대 없는 FBX 1개.", tip: "물체 하나만, 비스듬한 각도에서 형태가 잘 보이는 그림이 좋습니다." },
      mech: { name: "움직이는 장치", desc: "포탑처럼 윗부분이 회전축으로 따로 움직이는 장치. 받침·윗부분 FBX 2개.", tip: "측면이나 정면에서 받침과 윗부분의 경계가 수평으로 보이는 그림이 좋습니다." },
      ground: { name: "바닥", desc: "바닥 무늬 그림을 평평한 바닥 판 FBX로. 1분 안쪽.", tip: "위에서 내려다본 바닥 무늬 그림. 가운데 정사각형을 씁니다." },
      animal: { name: "동물", desc: "호랑이·개·사슴처럼 네 발로 선 동물. 뼈대를 넣고 걷기·뛰기·쓰러지기 같은 동작을 만들어 붙입니다.", tip: "한 마리가 네 다리를 모두 펴고 땅을 디딘 옆모습이나 비스듬한 옆모습 그림이 좋습니다. 다리를 접거나 든 그림은 그 다리가 접힌 채로 움직입니다. 새·물고기·뱀처럼 네발이 아닌 동물은 아직 안 됩니다." },
      anim: { name: "애니메이션 추가제작", desc: "여기서 받은 캐릭터 FBX에 빠뜨린 Mixamo 동작을 더 붙여 다시 받습니다. 리깅은 다시 하지 않아 1분 안쪽.", tip: "결과 페이지에서 받은 FBX(메인 또는 클립 FBX 아무거나)를 올리세요. 다른 곳에서 만든 FBX는 안 됩니다." },
    } as Record<Kind, { name: string; desc: string; tip: string }>,
    s1: "02 / 그림", invite: "초대 코드", invitePh: "받은 코드를 입력하세요", drawing: "그림",
    drop: "PNG·JPG·WEBP 파일을 끌어다 놓거나 고르세요. 10MB 이하.", choose: "파일 고르기", chooseAgain: "다른 파일 고르기",
    s1Fbx: "02 / 캐릭터 FBX", fbxLabel: "캐릭터 FBX", dropFbx: "이 사이트에서 받은 캐릭터 FBX를 끌어다 놓거나 고르세요. 60MB 이하.",
    badFbx: "FBX 파일만 올릴 수 있습니다.", fbxBig: (mb: number) => `캐릭터 FBX는 ${mb}MB 이하여야 합니다.`, needClip: "붙일 동작을 1개 이상 고르거나 올려 주세요.",
    s2Anim: "03 / 더 붙일 동작", sendFbx: "동작 붙이기", fbxReady: "보낼 준비 완료", allNote: "동작마다 FBX를 따로 받고, 2개 이상이면 모든 동작을 한 파일에 묶은 FBX도 받습니다.",
    s2: "03 / 애니메이션", clips: "넣을 동작", yours: "내 파일", remove: "빼기", addClip: "Mixamo FBX 클립 추가",
    mainClip: "메인 FBX에 넣을 동작", clipNote: (n: number) => `Mixamo 에서 FBX Binary · With Skin · 30fps 로 받아 주세요. 최대 ${n}개.`,
    s2opt: "03 / 크기와 설정",
    s2animal: "03 / 동작과 크기", animalClips: "넣을 동작", animalMain: "메인 FBX에 넣을 동작",
    animalClipNames: { Walk: "걷기", Run: "뛰기", Idle: "대기 (숨쉬기·꼬리)", Eat: "고개 숙여 먹기", Hit: "피격", Jump: "점프", Fall: "쓰러지기" } as Record<string, string>,
    animalNote: "동작은 Mixamo 클립이 아니라 뼈대에 맞춰 자동으로 만든 것입니다. 동작마다 FBX를 따로 받습니다. 몸에 비해 무리한 동작은 크기를 줄이거나 빼고 만듭니다.",
    animalWalkPct: "걷기 동작 크기", animalRunPct: "달리기 동작 크기",
    animalPctNote: "보폭, 발을 드는 높이, 몸통 움직임이 함께 커지거나 작아집니다. 100%가 기본입니다. 크게 잡아도 몸이 늘어나거나 발이 땅에 닿지 않으면, 그 동물이 낼 수 있는 가장 큰 크기로 자동으로 줄어듭니다. 다리가 굵고 짧은 동물은 크게 잡아도 달라지지 않을 수 있습니다.",
    animalGait: "발 접지 방식(IK)으로 동작 만들기",animalGaitNote: "켜면 걷기·달리기·대기·먹기에서 디딘 발이 미끄러지지 않고 몸통이 함께 움직입니다. 끄면 예전 방식(다리를 흔들기만 하는 동작)으로 만듭니다. 맞기·점프·쓰러지기는 어느 쪽이든 같습니다.",
    animalInput: "그림 형식",animalInputs: { single: "그림 한 장", sheet: "시트 (여러 각도를 한 장에)" } as Record<string, string>,
    animalSheetNote: "시트는 단색 배경에, 선 자세 그림을 같은 바닥선 위에 왼쪽부터 정면 → 비스듬한 정면 → 옆 순서로 그린 한 장입니다. 모든 칸이 네 다리를 펴고 디딘 같은 자세여야 합니다. 달리는 그림·얼굴 확대·제목·구분선은 있어도 자동으로 빠집니다. 바닥 그림자는 없는 편이 좋습니다. 3D 모양은 가운데(비스듬한 정면) 칸으로 만듭니다.",
    animalSheetExample: "예시 시트 받기 (호랑이)", animalSheetExampleAlt: "동물 시트 예시: 왼쪽부터 정면, 비스듬한 정면, 옆모습의 호랑이",
    animalSheetPrompt: "이미지 생성 프롬프트", animalSheetPromptNote: "[ANIMAL] 자리에 동물 이름을 영어로 넣어 이미지 생성 AI에 붙여 넣으세요. 그림체 부분은 바꿔도 됩니다.", animalSheetCopy: "프롬프트 복사", animalSheetCopied: "복사됨",
    animalHeight: "높이 (cm)", animalHeightNote: "스튜디오에 들어갔을 때 발에서 가장 높은 곳(뿔·귀 포함)까지. 기본 100cm.",
    warnAnimalTris: (v: number) => `동물은 삼각형 ${n(v)} 까지만 만듭니다. 더 큰 값이나 제한 없음을 골라도 ${n(v)} 으로 만듭니다.`,
    height: "높이 (cm)", heightNote: "스튜디오에 들어갔을 때의 전체 높이. 비워 두면 기본값.",
    charHeight: "키 (cm)", charHeightNote: "스튜디오에 들어갔을 때 머리 꼭대기까지의 키. 기본 170cm(사람 크기). 비워 두면 기본값.",
    mechHeight: "전체 높이 (cm)", split: "자르는 높이", splitNote: "오른쪽 그림의 선을 끌어 받침과 윗부분의 경계에 맞추세요. 윗부분은 이 높이를 회전축으로 돕니다.",
    splitValue: (p: number) => `위에서 ${p}%`, front: "그림 속 장치가 바라보는 쪽", fronts: { viewer: "나를 봄 (정면)", left: "왼쪽", right: "오른쪽" },
    size: "바닥 한 변 (cm)", sizeNote: "최대 2040cm. 넓은 바닥은 여러 장을 이어 붙이세요.", repeat: "무늬 반복 횟수", repeatNote: "타일 무늬면 4~8, 한 장 그림이면 1.",
    s3: (k: Kind) => (k === "character" ? "04 / 보내기 전에" : "04 / 보내기 전에"),
    consent: "그림과 결과가 링크를 아는 누구나 볼 수 있는 페이지에 올라가는 데 동의합니다.",
    sending: "보내는 중…", send: "그림 보내기", offline: "지금은 작업실 PC가 꺼져 있습니다. 대기열에 올려 두면 켜지는 대로 처리합니다.",
    previewAlt: "고른 그림", ready: "보낼 준비 완료",
    time: (k: Kind) => (k === "ground" || k === "anim" ? "시작 후 1분 안쪽입니다." : k === "mech" ? "부품 2개를 만들어 시작 후 약 10~15분 걸립니다." : "시작 후 약 4~10분 걸립니다."),
    splitHandle: "자르는 선 (위·아래 화살표로 움직임)",
    trisTitle: "메시 밀도", trisLimit: "삼각형 수 제한 (권장)", tris: (k: Kind) => (k === "mech" ? "제한 삼각형 수 (두 부품 합계)" : "제한 삼각형 수"),
    trisNote: (v: number) => `검증된 값 ${n(v)} · OVERDARE 권장 상한 ${n(OVERDARE_TRIS_LIMIT)} (FBX 1개당) · ${n(500)}~${n(50000)}, 슬라이더는 ${n(500)} 단위 · 옆 칸에 직접 입력 가능. 많을수록 형태는 매끈하지만 오래 걸리고 무거워집니다.`,
    trisReset: (v: number) => `검증된 값(${n(v)})으로 되돌리기`,
    trisMechSplit: (top: number, base: number) => `윗부분 ${n(top)} · 받침 ${n(base)} 으로 나눠 씁니다.`,
    warnTitle: "확인해 주세요",
    warnVerified: {
      character: (v: number) => `검증된 값(${n(v)})과 다릅니다. 뼈대·가중치·손가락·큰 머리 보정은 ${n(v)} 기준으로만 시험했습니다. 리깅이 실패하거나 동작이 어색해질 수 있고, 시간이 더 걸립니다.`,
      static: (v: number) => `검증된 값(${n(v)})과 다릅니다. 정적 물체는 ${n(v)} 기준으로만 시험했습니다. 형태는 매끈해질 수 있지만 시간이 더 걸리고 파일이 커집니다.`,
      mech: (v: number) => `검증된 값(합계 ${n(v)} = 윗부분 4,000 · 받침 3,000)과 다릅니다. 장치는 이 값으로만 시험했습니다. 두 부품의 이음새·회전축 위치는 그대로지만 시간이 더 걸립니다.`,
      ground: () => "",
      anim: () => "",
      animal: (v: number) => `검증된 값(${n(v)})과 다릅니다. 동물의 뼈대·가중치·동작은 ${n(v)} 기준으로만 시험했습니다. 리깅이 실패하거나 동작이 어색해질 수 있고, 시간이 더 걸립니다.`,
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
      animal: { name: "Animal", desc: "A four-legged animal such as a tiger, dog, or deer. It gets a skeleton and generated moves like walk, run, and fall.", tip: "One animal, seen from the side or at an angle, with all four legs straight and on the ground. A leg that is bent or lifted in the drawing stays bent while moving. Birds, fish, snakes and other non-four-legged animals are not supported yet." },
      anim: { name: "Add animations", desc: "Add the Mixamo clips you left out to a character FBX you got here, and download it again. No re-rigging, under a minute.", tip: "Upload an FBX from a result page (the main FBX or any clip FBX). FBX files made elsewhere will not work." },
    } as Record<Kind, { name: string; desc: string; tip: string }>,
    s1: "02 / DRAWING", invite: "Invite code", invitePh: "Enter the code you were given", drawing: "Drawing",
    drop: "Drop a PNG, JPG, or WEBP here, or choose a file. Up to 10 MB.", choose: "Choose a file", chooseAgain: "Choose another file",
    s1Fbx: "02 / CHARACTER FBX", fbxLabel: "Character FBX", dropFbx: "Drop a character FBX you downloaded here, or choose a file. Up to 60 MB.",
    badFbx: "Please choose an FBX file.", fbxBig: (mb: number) => `The character FBX must be ${mb} MB or less.`, needClip: "Pick or upload at least one clip to add.",
    s2Anim: "03 / CLIPS TO ADD", sendFbx: "Add the clips", fbxReady: "Ready to send", allNote: "Each clip comes as its own FBX. With two or more, you also get one FBX that holds every clip.",
    s2: "03 / ANIMATION", clips: "Clips to include", yours: "your file", remove: "Remove", addClip: "Add a Mixamo FBX clip",
    mainClip: "Clip to use in the main FBX", clipNote: (n: number) => `Download Mixamo clips as FBX Binary, With Skin, 30 fps. Up to ${n}.`,
    s2opt: "03 / SIZE AND SETTINGS",
    s2animal: "03 / MOVES AND SIZE", animalClips: "Moves to include", animalMain: "Move for the main FBX",
    animalClipNames: { Walk: "Walk", Run: "Run", Idle: "Idle (breathing, tail)", Eat: "Graze", Hit: "Hit reaction", Jump: "Jump", Fall: "Fall over" } as Record<string, string>,
    animalNote: "These moves are generated for the skeleton, not Mixamo clips. You get one FBX per move. A move that strains the body is toned down or left out.",
    animalWalkPct: "Walk size", animalRunPct: "Run size",
    animalPctNote: "Stride, foot lift, and body movement grow or shrink together. 100% is the default. If a larger size stretches the body or the feet cannot reach the ground, it is lowered automatically to the largest size that animal can do. For animals with thick, short legs, a larger setting may change nothing.",
    animalGait: "Build moves with planted feet (IK)",animalGaitNote: "When on, planted feet do not slide and the body moves with the legs in Walk, Run, Idle, and Eat. When off, moves are built the earlier way, with legs that only swing. Hit, Jump, and Fall are the same either way.",
    animalInput: "Drawing format",animalInputs: { single: "One drawing", sheet: "Sheet (several angles on one page)" } as Record<string, string>,
    animalSheetNote: "A sheet is one page on a plain background with standing views on the same ground line, left to right: front, three-quarter front, side. Every view must show the same pose with all four legs straight and on the ground. A running pose, a face close-up, titles, and divider lines are skipped automatically. It is better to leave out ground shadows. The 3D shape is built from the middle (three-quarter) view.",
    animalSheetExample: "Download the example sheet (tiger)", animalSheetExampleAlt: "Example animal sheet: a tiger in front, three-quarter front, and side views, left to right",
    animalSheetPrompt: "Image generation prompt", animalSheetPromptNote: "Replace [ANIMAL] with your animal and paste this into an image generator. You can change the art style part.", animalSheetCopy: "Copy prompt", animalSheetCopied: "Copied",
    animalHeight: "Height (cm)", animalHeightNote: "From the feet to the highest point (antlers and ears included) in the studio. Default 100 cm.",
    warnAnimalTris: (v: number) => `Animals are built with at most ${n(v)} triangles. A larger value or no limit is brought down to ${n(v)}.`,
    height: "Height (cm)", heightNote: "Total height in the studio. Leave empty for the default.",
    charHeight: "Character height (cm)", charHeightNote: "Height to the top of the head in the studio. Default 170 cm (human size). Leave empty for the default.",
    mechHeight: "Total height (cm)", split: "Split height", splitNote: "Drag the line on the drawing to the border between base and top. The top turns around this height.",
    splitValue: (p: number) => `${p}% from the top`, front: "Which way the mechanism faces in the drawing", fronts: { viewer: "Toward me (front)", left: "Left", right: "Right" },
    size: "Tile side (cm)", sizeNote: "Up to 2040 cm. Place several tiles for a large floor.", repeat: "Pattern repeats", repeatNote: "4 to 8 for a tiling pattern, 1 for a single picture.",
    s3: () => "04 / BEFORE YOU SEND",
    consent: "I agree that the drawing and the result are published on a page anyone with the link can open.",
    sending: "Sending…", send: "Send the drawing", offline: "The studio PC is offline. Your drawing will be queued and start when it is back.",
    previewAlt: "The drawing you selected", ready: "Ready to send",
    time: (k: Kind) => (k === "ground" || k === "anim" ? "Takes under a minute once it starts." : k === "mech" ? "Builds two parts, about 10 to 15 minutes once it starts." : "Takes about four to ten minutes once it starts."),
    splitHandle: "Split line (move with the up and down arrow keys)",
    trisTitle: "Mesh density", trisLimit: "Limit the triangle count (recommended)", tris: (k: Kind) => (k === "mech" ? "Triangle limit (both parts together)" : "Triangle limit"),
    trisNote: (v: number) => `Tested value ${n(v)} · OVERDARE recommended limit ${n(OVERDARE_TRIS_LIMIT)} per FBX · ${n(500)} to ${n(50000)}, the slider moves in steps of ${n(500)} · or type a number in the box. More triangles give smoother shapes but take longer and weigh more.`,
    trisReset: (v: number) => `Back to the tested value (${n(v)})`,
    trisMechSplit: (top: number, base: number) => `Split as top ${n(top)} and base ${n(base)}.`,
    warnTitle: "Before you send",
    warnVerified: {
      character: (v: number) => `This differs from the tested value (${n(v)}). Skeleton, skin weights, fingers and the big-head fix were only tested at ${n(v)}. Rigging may fail or motion may look off, and it takes longer.`,
      static: (v: number) => `This differs from the tested value (${n(v)}). Static objects were only tested at ${n(v)}. The shape may get smoother, but it takes longer and the file gets bigger.`,
      mech: (v: number) => `This differs from the tested value (${n(v)} in total: top 4,000, base 3,000). Mechanisms were only tested at that value. The seam and pivot stay the same, but it takes longer.`,
      ground: () => "",
      anim: () => "",
      animal: (v: number) => `This differs from the tested value (${n(v)}). Animal skeletons, weights, and moves were only tested at ${n(v)}. Rigging may fail or moves may look off, and it takes longer.`,
    } as Record<Kind, (v: number) => string>,
    warnLimit: (t: number) => `About ${n(t)} triangles in one FBX, over the OVERDARE recommended limit of ${n(OVERDARE_TRIS_LIMIT)}. The studio may refuse to import it.`,
    warnUnlimited: "No limit: the mesh TRELLIS builds is used as is, usually hundreds of thousands to millions of triangles (3.68 million and a 136 MB FBX for a sandbag test). It cannot go into OVERDARE as is, takes several times longer, and the 3D preview on the result page may not appear (the files can still be downloaded).",
    warnUnlimitedChar: "For characters, rigging at this size has crashed the GPU before. That stops the whole service, not just this job, until an operator restarts it.",
  },
};

/** 제한 삼각형 수 슬라이더 [최소, 최대, 단위] = API 범위(500~50,000). 슬라이더는 500 단위, 옆 숫자 칸은 범위 안 아무 정수. */
const TRIS_SLIDER = [500, 50000, 500] as const;

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
  const [animalClips, setAnimalClips] = useState<string[]>([ANIMAL_DEFAULT_CLIP]);      // 동물: 서버가 만드는 동작(1개 이상)
  const [animalMain, setAnimalMain] = useState<string>(ANIMAL_DEFAULT_CLIP);
  const [sheetCopied, setSheetCopied] = useState(false);
  async function copySheetPrompt() {
    try {
      await navigator.clipboard.writeText(ANIMAL_SHEET_PROMPT);
      setSheetCopied(true);
      setTimeout(() => setSheetCopied(false), 2000);
    } catch {
      setSheetCopied(false);
    }
  }
  const toggleAnimalClip = (id: string) => setAnimalClips(prev => {
    const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
    return next.length ? ANIMAL_CLIPS.filter(c => next.includes(c)) : prev;
  });
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
    if (k && (KINDS as string[]).includes(k)) {
      setKind(k as Kind);
      if (k === "anim") setClips([]);          // 애니 추가제작은 기본 클립을 미리 고르지 않는다
    }
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
    if (kind === "anim") {                      // 애니메이션 추가제작: 캐릭터 FBX
      if (!/\.fbx$/i.test(file.name)) { setError(t.badFbx); return; }
      if (file.size > MAX_CHAR_FBX_BYTES) { setError(t.fbxBig(MAX_CHAR_FBX_BYTES / 1024 / 1024)); return; }
      setImage(file);
      return;
    }
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
  const ready = Boolean(invite.trim() && image && consent && (!hasClips(kind) || allClips.length) && !busy);

  function cleanOptions(): KindOptions {
    const o = { ...opts[kind] };
    if (hasTris(kind)) {
      const def = KIND_DEFAULTS[kind].tris as number;
      o.tris = o.tris === "unlimited" ? "unlimited" : clampNum(Math.round(Number(o.tris) || def), OPTION_RANGES.tris);
    }
    if (o.height_cm !== undefined) o.height_cm = clampNum(Number(o.height_cm) || KIND_DEFAULTS[kind].height_cm!, OPTION_RANGES.height_cm);
    if (o.size_cm !== undefined) o.size_cm = clampNum(Number(o.size_cm) || 2000, OPTION_RANGES.size_cm);
    if (o.uv_repeat !== undefined) o.uv_repeat = clampNum(Math.round(Number(o.uv_repeat) || 1), OPTION_RANGES.uv_repeat);
    if (kind === "animal") {
      if (o.tris === "unlimited" || Number(o.tris) > ANIMAL_TRIS_MAX) o.tris = ANIMAL_TRIS_MAX;
      o.anims = animalClips.join(",");
      o.default = animalClips.includes(animalMain) ? animalMain : animalClips[0];
      if (o.input !== "sheet") delete o.input;      // 기본(그림 한 장)이면 보내지 않는다
      o.gait = o.gait === "legacy" ? "legacy" : "ik"; // 늘 보낸다(기본 = 발 접지)
      for (const [key, clip] of [["walk_pct", "Walk"], ["run_pct", "Run"]] as const) {
        const v = clampNum(Math.round(Number(o[key]) || 100), [50, 200]);
        if (v === 100 || !animalClips.includes(clip)) delete o[key]; else o[key] = v;   // 기본값·안 고른 동작이면 보내지 않는다
      }
    }
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

  const numberField = (id: string, label: string, note: string, k: Kind, key: "height_cm" | "size_cm" | "uv_repeat", range: readonly [number, number], step = 1) => (
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
      if (kind === "animal") trisWarnings.push(t.warnAnimalTris(ANIMAL_TRIS_MAX));
    } else if (trisNum !== null) {
      if (trisNum !== trisDef) trisWarnings.push(t.warnVerified[kind](trisDef));
      const part = largestPartTris(kind, trisNum);
      if (kind === "animal" && trisNum > ANIMAL_TRIS_MAX) trisWarnings.push(t.warnAnimalTris(ANIMAL_TRIS_MAX));
      else if (part !== null && part > OVERDARE_TRIS_LIMIT) trisWarnings.push(t.warnLimit(part));
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
          {/* 500 단위 슬라이더 + 직접 입력 칸. 눈금 = 검증값·OVERDARE 권장 상한. 입력 칸은 칸을 벗어날 때 범위 안 정수로 맞춘다 */}
          <div className="fbx-tris-row">
            <input id="opt-tris" type="range" min={TRIS_SLIDER[0]} max={TRIS_SLIDER[1]} step={TRIS_SLIDER[2]} list="tris-marks"
              value={trisNum ?? trisDef} aria-valuetext={n(trisNum ?? trisDef)}
              onChange={e => setOpt(kind, "tris", Number(e.target.value))} />
            <input className="fbx-input" type="number" inputMode="numeric" min={TRIS_SLIDER[0]} max={TRIS_SLIDER[1]} step={TRIS_SLIDER[2]}
              aria-label={t.tris(kind)} value={trisRaw ?? ""}
              onChange={e => setOpt(kind, "tris", e.target.value === "" ? undefined : Number(e.target.value))}
              onBlur={() => setOpt(kind, "tris", clampNum(Math.round(Number(trisRaw) || trisDef), [TRIS_SLIDER[0], TRIS_SLIDER[1]]))} />
          </div>
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
              <input type="radio" name="fbx-kind" value={k} checked={kind === k} onChange={() => {
                if ((k === "anim") !== (kind === "anim")) {
                  setImage(null);
                  setClips(k === "anim" ? [] : [DEFAULT_CLIP]);
                }
                setKind(k); setError(null);
              }} />
              <span><strong>{t.kinds[k].name}</strong><small>{t.kinds[k].desc}</small></span>
            </label>
          ))}
        </fieldset>

        <span className="eyebrow">{kind === "anim" ? t.s1Fbx : t.s1}</span>
        <label htmlFor="invite-code">{t.invite}</label>
        <input id="invite-code" className="fbx-input" value={invite} autoComplete="off" spellCheck={false}
          placeholder={t.invitePh} onChange={e => setInvite(e.target.value)} />

        <label htmlFor="drawing-file">{kind === "anim" ? t.fbxLabel : t.drawing}</label>
        <div className={dragging ? "fbx-dropzone dragging" : "fbx-dropzone"}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pickImage(e.dataTransfer.files[0]); }}>
          <input id="drawing-file" ref={imageInput} type="file" accept={kind === "anim" ? ".fbx" : "image/png,image/jpeg,image/webp"}
            onChange={e => { pickImage(e.target.files?.[0]); e.target.value = ""; }} />
          {image ? <p>{image.name} / {sizeText(image.size)}</p> : <p>{kind === "anim" ? t.dropFbx : t.drop}</p>}
          <button type="button" className="button outline" onClick={() => imageInput.current?.click()}>
            {image ? t.chooseAgain : t.choose}
          </button>
        </div>
        <p className="small-note">{t.kinds[kind].tip}</p>

        {hasClips(kind) ? (
          <>
            <span className="eyebrow">{kind === "anim" ? t.s2Anim : t.s2}</span>
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
            {kind === "anim" && <p className="small-note">{allClips.length ? t.allNote : t.needClip}</p>}
            {kind === "character" && numberField("opt-char-height", t.charHeight, t.charHeightNote, "character", "height_cm", OPTION_RANGES.height_cm)}
            {trisBlock}
          </>
        ) : (
          <>
            <span className="eyebrow">{kind === "animal" ? t.s2animal : t.s2opt}</span>
            {kind === "animal" && (
              <>
                <label htmlFor="opt-animal-input">{t.animalInput}</label>
                <select id="opt-animal-input" value={opts.animal.input ?? "single"} onChange={e => setOpt("animal", "input", e.target.value as KindOptions["input"])}>
                  {(["single", "sheet"] as const).map(v => <option key={v} value={v}>{t.animalInputs[v]}</option>)}
                </select>
                {opts.animal.input === "sheet" && (
                  <>
                    <p className="small-note">{t.animalSheetNote}</p>
                    <a href={ANIMAL_SHEET_EXAMPLE} download="animal-sheet-example.png">
                      <img src={ANIMAL_SHEET_EXAMPLE_PREVIEW} alt={t.animalSheetExampleAlt} style={{ width: "100%", height: "auto", border: "1px solid var(--line)", borderRadius: 3, marginTop: 10 }} />
                    </a>
                    <p className="small-note"><a className="text-link" href={ANIMAL_SHEET_EXAMPLE} download="animal-sheet-example.png">{t.animalSheetExample}</a></p>
                    <label htmlFor="animal-sheet-prompt">{t.animalSheetPrompt}</label>
                    <textarea id="animal-sheet-prompt" className="fbx-input" readOnly rows={7} value={ANIMAL_SHEET_PROMPT} onFocus={e => e.currentTarget.select()} style={{ width: "100%", fontSize: 12, lineHeight: 1.6, resize: "vertical" }} />
                    <p className="small-note">{t.animalSheetPromptNote}</p>
                    <button type="button" className="button outline" onClick={copySheetPrompt}>{sheetCopied ? t.animalSheetCopied : t.animalSheetCopy}</button>
                  </>
                )}
                <fieldset className="fbx-fieldset">
                  <legend>{t.animalClips}</legend>
                  {ANIMAL_CLIPS.map(id => (
                    <label key={id} className="fbx-check">
                      <input type="checkbox" checked={animalClips.includes(id)} onChange={() => toggleAnimalClip(id)} />
                      <span>{t.animalClipNames[id] ?? id}</span>
                    </label>
                  ))}
                </fieldset>
                {animalClips.length > 1 && (
                  <>
                    <label htmlFor="animal-main">{t.animalMain}</label>
                    <select id="animal-main" value={animalClips.includes(animalMain) ? animalMain : animalClips[0]} onChange={e => setAnimalMain(e.target.value)}>
                      {animalClips.map(id => <option key={id} value={id}>{t.animalClipNames[id] ?? id}</option>)}
                    </select>
                  </>
                )}
                <p className="small-note">{t.animalNote}</p>
                <label className="fbx-check">
                  <input type="checkbox" checked={opts.animal.gait !== "legacy"} onChange={e => setOpt("animal", "gait", e.target.checked ? "ik" : "legacy")} />
                  <span>{t.animalGait}</span>
                </label>
                <p className="small-note">{t.animalGaitNote}</p>
                {([["walk_pct", "Walk", t.animalWalkPct], ["run_pct", "Run", t.animalRunPct]] as const).filter(([, clip]) => animalClips.includes(clip)).map(([key, , label]) => (
                  <div key={key}>
                    <label htmlFor={`opt-animal-${key}`}>{label}: {opts.animal[key] ?? 100}%</label>
                    <input id={`opt-animal-${key}`} type="range" min={50} max={200} step={5} value={opts.animal[key] ?? 100}
                      onChange={e => setOpt("animal", key, Number(e.target.value))} />
                  </div>
                ))}
                {(animalClips.includes("Walk") || animalClips.includes("Run")) && <p className="small-note">{t.animalPctNote}</p>}
                {numberField("opt-animal-height", t.animalHeight, t.animalHeightNote, "animal", "height_cm", OPTION_RANGES.height_cm)}
              </>
            )}
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
          {busy ? t.sending : kind === "anim" ? t.sendFbx : t.send}
        </button>
        {online === false && <p className="small-note">{t.offline}</p>}
      </div>

      <div className="creation-preview">
        <p className="small-note">{t.time(kind)}</p>
        {kind === "anim" ? (
          <div className="fbx-placeholder" aria-hidden="true" />
        ) : imageUrl ? (
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
        <div>{image && <h3>{t.ready}</h3>}</div>
      </div>
    </div>
  );
}
