import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assets, stories, productPaths } from "@/lib/mock-data";
import { isLocale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { ProductShell } from "@/components/product-shell";
import { ChineseApp } from "@/components/chinese-app";
import { FbxHome, FbxCreate, FbxLibrary, AssetDetail, FbxGuide, WebtoonHome, WebtoonSeries, WebtoonReader } from "@/components/product-pages";

export const dynamicParams = false;
export function generateStaticParams() { return productPaths.map(path => ({ product: path.split("/") })); }
type Props = { params: Promise<{ lang: string; product: string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product } = await params;
  const path = product.join("/");
  const chinese = product[0] === "chinese";
  const asset = product[1] === "assets" ? assets.find(a => a.slug === product[2]) : undefined;
  const story = product[0] === "webtoon" ? stories.find(s => s.slug === product[1]) : undefined;
  const episode = story?.episodes.find(e => e.slug === product[2]);
  const titles: Record<string,string> = { fbx: "Small ideas. Big playgrounds.", "fbx/create": "Create your next idea", "fbx/assets": "The asset library", "fbx/guide": "Creator field guides", "fbx/guide/roblox": "Roblox workflow preview", "fbx/guide/overdare": "OVERDARE workflow preview", webtoon: "A little pause. Another world.", chinese: "한마디 - 매일 조금씩 중국어", "chinese/learn": "테마별 단어장 퀴즈", "chinese/review": "단어장 다시 풀기", "chinese/settings": "학습 설정", "chinese/conversation": "단어 범위로 AI 회화하기", "chinese/vocabulary": "HSK 1–4급 단어 사전" };
  const title = episode ? `${episode.title} / ${story?.title}` : asset?.name ?? story?.title ?? titles[path] ?? "PLOTA";
  const description = chinese ? "세 PDF를 합친 HSK 1–4급 단어장. 단어 퀴즈와 복습, 단어장 이름과 번호로 시작하는 WebMCP 회화 학습." : asset?.description ?? story?.description ?? (product[0] === "fbx" ? "Explore AI-assisted FBX creation concepts and an original asset collection for Roblox and OVERDARE creators." : "Original illustrated stories, one small chapter at a time.");
  const canonical = `/${chinese ? "ko" : "en"}/${path}`;
  return { title, description, alternates: { canonical, languages: { [chinese ? "ko" : "en"]: absoluteUrl(canonical), "x-default": absoluteUrl(canonical) } }, openGraph: { title, description, url: canonical, type: "website", locale: chinese ? "ko_KR" : "en_US" }, twitter: { card: "summary", title, description } };
}
export default async function ProductPage({ params }: Props) {
  const { lang, product } = await params;
  if (!isLocale(lang) || !productPaths.includes(product.join("/"))) notFound();
  const [kind, section, slug] = product;
  let page: React.ReactNode;
  if (kind === "fbx") {
    if (!section) page = <FbxHome />;
    else if (section === "create") page = <FbxCreate />;
    else if (section === "guide") page = <FbxGuide platform={slug} />;
    else if (!slug) page = <FbxLibrary />;
    else { const asset = assets.find(a => a.slug === slug); if (!asset) notFound(); page = <AssetDetail asset={asset} />; }
  } else if (kind === "webtoon") {
    if (!section) page = <WebtoonHome />;
    else { const story = stories.find(s => s.slug === section); if (!story) notFound(); if (!slug) page = <WebtoonSeries story={story} />; else { const episode = story.episodes.find(e => e.slug === slug); if (!episode) notFound(); page = <WebtoonReader story={story} episode={episode} />; } }
  } else page = <ChineseApp key={section ?? "home"} screen={section ?? ""} />;
  const canonical = absoluteUrl(`/${kind === "chinese" ? "ko" : "en"}/${product.join("/")}`);
  const schema = { "@context": "https://schema.org", "@type": "WebPage", url: canonical, name: kind === "chinese" ? "한마디 Chinese" : kind === "fbx" ? "PLOTA FBX Studio" : "PLOTA Stories", inLanguage: kind === "chinese" ? "ko" : "en" };
  return <ProductShell kind={kind as "fbx" | "webtoon" | "chinese"}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />{page}</ProductShell>;
}
