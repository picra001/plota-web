import type { Locale } from "./i18n";

export const site = {
  name: "PLOTA",
  // 배포 도메인이 정해지면 환경변수(NEXT_PUBLIC_SITE_URL)로 덮어쓴다.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://plota.dev",
  author: {
    name: "PLOTA",
    url: "https://github.com/picra001/plota-web",
  },
} as const;

/** 언어별 사이트 타이틀 / 설명 (메타데이터·OG·JSON-LD 공용) */
export const siteMeta: Record<Locale, { title: string; description: string }> = {
  ko: {
    title: "PLOTA — 누구나 작가가 될 수 있다",
    description:
      "PLOTA는 다섯 언어로 발행하는 읽기 전용 출판 플랫폼입니다. 만드는 과정을 담은 Devlog와 컷툰으로 읽는 Novel.",
  },
  en: {
    title: "PLOTA — Anyone can become a writer",
    description:
      "PLOTA is a read-only publishing space in five languages. A Devlog of the making, and Novels told in cut-toon panels.",
  },
  ja: {
    title: "PLOTA — 誰もが作家になれる",
    description:
      "PLOTA は5言語で発行する閲覧専用の出版プラットフォーム。つくる過程の Devlog と、カット漫画で読む Novel。",
  },
  zh: {
    title: "PLOTA — 人人都能成为作家",
    description:
      "PLOTA 是一个以五种语言发布的只读出版平台。记录创作过程的 Devlog，与用条漫讲述的 Novel。",
  },
  es: {
    title: "PLOTA — Cualquiera puede ser escritor",
    description:
      "PLOTA es un espacio de publicación de solo lectura en cinco idiomas. Un Devlog del proceso y Novelas en viñetas.",
  },
};

export function absoluteUrl(path = "/"): string {
  const base = site.url.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
