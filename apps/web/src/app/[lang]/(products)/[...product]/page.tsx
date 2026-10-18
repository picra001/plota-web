import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assets, stories, productPaths } from "@/lib/mock-data";
import { isLocale, uiLang, type UiLang } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { ProductShell } from "@/components/product-shell";
import { ChineseApp } from "@/components/chinese-app";
import { FbxHome, FbxCreate, FbxJob, FbxLibrary, AssetDetail, FbxGuide, WebtoonHome, WebtoonSeries, WebtoonReader } from "@/components/product-pages";

export const dynamicParams = false;
export function generateStaticParams() { return productPaths.map(path => ({ product: path.split("/") })); }
type Props = { params: Promise<{ lang: string; product: string[] }> };

const TITLES: Record<UiLang, Record<string, string>> = {
  ko: { fbx: "그림 한 장을 3D 캐릭터로", "fbx/create": "만들기", "fbx/job": "결과", "fbx/assets": "에셋", "fbx/guide": "사용 설명서", webtoon: "웹툰" },
  en: { fbx: "One drawing to a 3D character", "fbx/create": "Create", "fbx/job": "Your result", "fbx/assets": "Assets", "fbx/guide": "Guide", webtoon: "Webtoons" },
};
const CHINESE_TITLES: Record<string, string> = { chinese: "한마디 - 매일 조금씩 중국어", "chinese/learn": "테마별 단어장 퀴즈", "chinese/review": "단어장 다시 풀기", "chinese/settings": "학습 설정", "chinese/conversation": "단어 범위로 AI 회화하기", "chinese/vocabulary": "HSK 1–4급 단어 사전" };
const DESCRIPTIONS: Record<UiLang, { fbx: string; webtoon: string }> = {
  ko: { fbx: "그림 한 장으로 뼈대와 애니메이션이 들어간 3D 캐릭터 FBX를 만듭니다.", webtoon: "잠깐 쉬어 가는 PLOTA 오리지널 웹툰." },
  en: { fbx: "Turn one drawing into a rigged, animated 3D character FBX.", webtoon: "Original PLOTA webtoons for the quiet moments." },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: locale, product } = await params;
  const lang = uiLang(locale);
  const path = product.join("/");
  const chinese = product[0] === "chinese";
  const asset = product[1] === "assets" ? assets.find(a => a.slug === product[2]) : undefined;
  const story = product[0] === "webtoon" ? stories.find(s => s.slug === product[1]) : undefined;
  const episode = story?.episodes.find(e => e.slug === product[2]);
  const title = chinese ? CHINESE_TITLES[path] ?? "PLOTA"
    : episode ? `${episode.text[lang].title} / ${story!.text[lang].title}`
    : asset?.text[lang].name ?? story?.text[lang].title ?? TITLES[lang][path] ?? "PLOTA";
  const description = chinese ? "세 PDF를 합친 HSK 1–4급 단어장. 단어 퀴즈와 복습, 단어장 이름과 번호로 시작하는 WebMCP 회화 학습."
    : asset?.text[lang].description ?? story?.text[lang].description ?? DESCRIPTIONS[lang][product[0] === "webtoon" ? "webtoon" : "fbx"];
  // 제품 페이지는 한국어(기본)·영어 두 벌. 중국어 학습은 한국어 전용.
  const canonLang = chinese ? "ko" : lang;
  const canonical = `/${canonLang}/${path}`;
  if (path === "fbx/job") return { title, description, robots: { index: false, follow: false } };   // 작업별 결과 페이지는 색인하지 않는다
  const languages = chinese
    ? { ko: absoluteUrl(canonical), "x-default": absoluteUrl(canonical) }
    : { ko: absoluteUrl(`/ko/${path}`), en: absoluteUrl(`/en/${path}`), "x-default": absoluteUrl(`/ko/${path}`) };
  return { title, description, alternates: { canonical, languages }, openGraph: { title, description, url: canonical, type: "website", locale: canonLang === "ko" ? "ko_KR" : "en_US" }, twitter: { card: "summary", title, description } };
}

export default async function ProductPage({ params }: Props) {
  const { lang: locale, product } = await params;
  if (!isLocale(locale) || !productPaths.includes(product.join("/"))) notFound();
  const lang = uiLang(locale);
  const [kind, section, slug] = product;
  let page: React.ReactNode;
  if (kind === "fbx") {
    if (!section) page = <FbxHome lang={lang} />;
    else if (section === "create") page = <FbxCreate lang={lang} />;
    else if (section === "job") page = <FbxJob />;
    else if (section === "guide") page = <FbxGuide lang={lang} />;
    else if (!slug) page = <FbxLibrary lang={lang} />;
    else { const asset = assets.find(a => a.slug === slug); if (!asset) notFound(); page = <AssetDetail asset={asset} lang={lang} />; }
  } else if (kind === "webtoon") {
    if (!section) page = <WebtoonHome lang={lang} />;
    else { const story = stories.find(s => s.slug === section); if (!story) notFound(); if (!slug) page = <WebtoonSeries story={story} lang={lang} />; else { const episode = story.episodes.find(e => e.slug === slug); if (!episode) notFound(); page = <WebtoonReader story={story} episode={episode} lang={lang} />; } }
  } else page = <ChineseApp key={section ?? "home"} screen={section ?? ""} />;
  const htmlLang = kind === "chinese" ? "ko" : lang;
  const canonical = absoluteUrl(`/${htmlLang}/${product.join("/")}`);
  const schema = { "@context": "https://schema.org", "@type": "WebPage", url: canonical, name: kind === "chinese" ? "한마디 Chinese" : kind === "fbx" ? "PLOTA FBX Studio" : "PLOTA Stories", inLanguage: htmlLang };
  return <ProductShell kind={kind as "fbx" | "webtoon" | "chinese"}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />{page}</ProductShell>;
}
