import type { Metadata } from "next";
import Link from "@/components/localized-link";
import { AssetArt, StoryArt } from "@/components/product-art";
import { assets } from "@/lib/mock-data";
import { absoluteUrl } from "@/lib/site";
import { uiLang, type UiLang } from "@/lib/i18n";

type Props = { params: Promise<{ lang: string }> };

const HUB: Record<UiLang, { title: string; description: string; label: string; fbx: string; fbxLink: string; webtoon: string; webtoonLink: string; chinese: string; chineseLink: string }> = {
  ko: { title: "PLOTA - 작은 스튜디오", description: "그림으로 만드는 3D 캐릭터, 오리지널 웹툰, 작은 학습 도구.", label: "프로젝트", fbx: "그림 한 장을 움직이는 3D 캐릭터로.", fbxLink: "만들러 가기", webtoon: "잠깐 쉬어 가는 오리지널 웹툰.", webtoonLink: "읽으러 가기", chinese: "매일 조금씩, 한국어로 배우는 중국어.", chineseLink: "시작하기" },
  en: { title: "PLOTA - A small studio", description: "3D characters from drawings, original webtoons, and small learning tools.", label: "Our projects", fbx: "Turn one drawing into a moving 3D character.", fbxLink: "Start creating", webtoon: "Original webtoons for the quiet moments.", webtoonLink: "Start reading", chinese: "A little Mandarin every day, for Korean speakers.", chineseLink: "Get started" },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = uiLang((await params).lang);
  const t = HUB[lang];
  return { title: t.title, description: t.description, alternates: { canonical: `/${lang}`, languages: { ko: absoluteUrl("/ko"), en: absoluteUrl("/en"), "x-default": absoluteUrl("/ko") } }, openGraph: { title: t.title, description: t.description, url: `/${lang}`, locale: lang === "ko" ? "ko_KR" : "en_US" } };
}

export default async function HomePage({ params }: Props) {
  const lang = uiLang((await params).lang);
  const t = HUB[lang];
  return <div className="hub-body" lang={lang}><section className="hub-hero"><h1>PLOTA</h1></section><section className="project-grid" aria-label={t.label}><Link className="project-card" href="/ko/fbx"><div className="project-meta"><span>01 / CREATE</span></div><div className="project-visual"><AssetArt asset={assets[0]} /></div><h2>FBX Studio</h2><p>{t.fbx}</p><span className="text-link">{t.fbxLink}</span></Link><Link className="project-card" href="/ko/webtoon"><div className="project-meta"><span>02 / READ</span></div><div className="project-visual"><StoryArt title="" /></div><h2>PLOTA Stories</h2><p>{t.webtoon}</p><span className="text-link">{t.webtoonLink}</span></Link><Link className="project-card" href="/ko/chinese"><div className="project-meta"><span>03 / LEARN</span></div><div className="project-visual chinese-visual"><strong lang="zh-Hans">你好。</strong><span>Nǐ hǎo</span></div><h2>한마디 Chinese</h2><p>{t.chinese}</p><span className="text-link">{t.chineseLink}</span></Link></section></div>;
}
