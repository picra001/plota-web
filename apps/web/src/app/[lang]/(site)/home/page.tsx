import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { absoluteUrl } from "@/lib/site";
import { uiLang } from "@/lib/i18n";

type Props = { params: Promise<{ lang: string }> };

const META = {
  ko: { title: "PLOTA 홈", description: "plota.ai 의 게임과 서비스를 한 화면에서 엽니다." },
  en: { title: "PLOTA Home", description: "Open every game and service on plota.ai from one screen." },
};

// 한국어 주소는 /home (next.config.mjs 에서 /ko/home 으로 rewrite).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = uiLang((await params).lang);
  const t = META[lang];
  const url = lang === "ko" ? "/home" : "/en/home";
  return { title: t.title, description: t.description, alternates: { canonical: url, languages: { ko: absoluteUrl("/home"), en: absoluteUrl("/en/home"), "x-default": absoluteUrl("/home") } }, openGraph: { title: t.title, description: t.description, url, locale: lang === "ko" ? "ko_KR" : "en_US" } };
}

export default async function HomePage({ params }: Props) {
  return <HomeScreen lang={uiLang((await params).lang)} />;
}
