import type { Locale } from "./i18n";

export const site = {
  name: "PLOTA.AI",
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
    title: "PLOTA.AI — 손으로 그린 2D를 3D 모델로",
    description:
      "PLOTA.AI는 사람이 그린 2D 이미지를 3D 모델로 변환합니다. 무료 웹 변환과 무료 로컬 설치 프로그램을 준비하고 있습니다.",
  },
  en: {
    title: "PLOTA.AI — From hand-drawn 2D to 3D",
    description:
      "PLOTA.AI turns hand-drawn 2D images into 3D models, with a free web workflow and a free local installer in development.",
  },
  ja: {
    title: "PLOTA.AI — 手描きの2Dを3Dモデルへ",
    description:
      "PLOTA.AIは手描きの2D画像を3Dモデルに変換します。無料のWeb版とローカルインストーラーを開発中です。",
  },
  zh: {
    title: "PLOTA.AI — 将手绘2D变为3D模型",
    description:
      "PLOTA.AI将手绘2D图像转换为3D模型，免费Web工作流与免费本地安装程序正在开发中。",
  },
  es: {
    title: "PLOTA.AI — De dibujos 2D a modelos 3D",
    description:
      "PLOTA.AI convierte imágenes 2D dibujadas a mano en modelos 3D, con una versión web y un instalador local gratuitos en desarrollo.",
  },
};

export function absoluteUrl(path = "/"): string {
  const base = site.url.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
