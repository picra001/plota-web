import type { UiLang } from "@/lib/i18n";

/**
 * plota.ai/home 홈 화면에 놓이는 앱 아이콘 목록.
 * 새 페이지·게임을 만들면 여기에 한 줄 추가한다. 순서가 곧 화면 순서다.
 * - external: Next.js 라우트가 아닌 정적 파일(웹게임)이면 true. 일반 <a> 로 연다.
 * - glyph: home-screen.tsx 의 아이콘 모양 이름.
 */
export type HomeApp = {
  id: string;
  href: string;
  name: Record<UiLang, string>;
  glyph: "habitats" | "fbx-create" | "fbx-assets" | "chinese" | "webtoon" | "devlog" | "lab";
  color: string;
  external?: boolean;
};

/** 큰 위젯으로 맨 위에 보여 줄 메인 게임. games/set-main.mjs 로 정한 게임과 맞춘다. */
export const featuredGame = {
  href: "/games/habitats",
  name: "Habitats",
  text: {
    ko: { label: "메인 게임", play: "바로 플레이", note: "집을 따라 사는 한 사람의 일생" },
    en: { label: "Main game", play: "Play now", note: "A life told through the homes you live in" },
  },
};

export const homeApps: HomeApp[] = [
  { id: "habitats", href: "/games/habitats", name: { ko: "Habitats", en: "Habitats" }, glyph: "habitats", color: "#34533d", external: true },
  { id: "fbx-create", href: "/ko/fbx/create", name: { ko: "FBX 만들기", en: "FBX Create" }, glyph: "fbx-create", color: "#b8743a" },
  { id: "fbx-assets", href: "/ko/fbx/assets", name: { ko: "FBX 에셋", en: "FBX Assets" }, glyph: "fbx-assets", color: "#8a6a3f" },
  { id: "chinese", href: "/ko/chinese", name: { ko: "한마디 중국어", en: "Chinese" }, glyph: "chinese", color: "#b2453a" },
  { id: "webtoon", href: "/ko/webtoon", name: { ko: "웹툰", en: "Webtoons" }, glyph: "webtoon", color: "#4b6a8e" },
  { id: "devlog", href: "/ko/devlog", name: { ko: "개발 기록", en: "Journal" }, glyph: "devlog", color: "#5a5f57" },
  { id: "lab", href: "/ko/lab", name: { ko: "실험실", en: "Lab" }, glyph: "lab", color: "#6f7f4a" },
];
