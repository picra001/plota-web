import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, htmlLang, ogLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import {
  getBreadcrumb,
  getNovelPost,
  getNovelSlugs,
  getSiblings,
} from "@/lib/content";
import { site, absoluteUrl } from "@/lib/site";
import { languageAlternates } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getNovelSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const novel = getNovelPost(lang, slug);
  if (!novel) return {};

  const path = `/${lang}/novel/${novel.slug}`;
  return {
    title: novel.title,
    description: novel.logline,
    alternates: {
      canonical: path,
      languages: languageAlternates((l) => `/${l}/novel/${novel.slug}`),
    },
    openGraph: {
      type: "article",
      locale: ogLocale[lang],
      url: absoluteUrl(path),
      title: novel.title,
      description: novel.logline,
      publishedTime: novel.date,
      images: novel.cover ? [{ url: novel.cover }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: novel.title,
      description: novel.logline,
    },
  };
}

export default async function NovelPostPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: langParam, slug } = await params;
  if (!isLocale(langParam)) notFound();
  const lang = langParam as Locale;
  const dict = getDictionary(lang);
  const novel = getNovelPost(lang, slug);
  if (!novel) notFound();

  const trail = getBreadcrumb("novel", lang, novel.slug);
  const { prev, next } = getSiblings("novel", lang, novel.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: novel.title,
    abstract: novel.logline,
    datePublished: novel.date,
    inLanguage: htmlLang[lang],
    author: { "@type": "Organization", name: site.name, url: site.url },
    image: novel.cover ? absoluteUrl(novel.cover) : undefined,
  };

  return (
    <article className="mx-auto max-w-[720px] px-[clamp(16px,4vw,40px)] pb-[120px] pt-[clamp(36px,6vh,64px)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label={dict.ui.contents}
        className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3"
      >
        <Link href={`/${lang}/novel`} className="pl-ghost transition-colors">
          {dict.nav.novel}
        </Link>
        {trail.map((folder) => (
          <span key={folder.key} className="flex items-center gap-1.5">
            <span aria-hidden className="text-ink-4">
              /
            </span>
            <span>{folder.title}</span>
          </span>
        ))}
      </nav>

      <div className="mt-[26px] font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        EP {novel.ep} · {novel.status === "LIVE" ? dict.ui.statusLive : dict.ui.statusDraft}
      </div>
      <h1 className="m-0 mt-2.5 font-display text-[clamp(38px,7vw,58px)] font-normal italic leading-[1.04]">
        {novel.title}
      </h1>
      <p className="mt-4 max-w-[46ch] font-sans text-[17px] leading-[1.6] text-ink-2">
        {novel.logline}
      </p>

      <div className="mt-11 flex flex-col gap-5">
        {novel.panels.map((pn) => {
          const accent = pn.tone === "accent";
          return (
            <figure key={pn.n} className="m-0">
              <div
                className="relative flex aspect-[4/3] items-end overflow-hidden border-[1.5px] border-ink p-[18px]"
                style={{ background: accent ? "var(--vermilion)" : "var(--paper-2)" }}
              >
                <span
                  className="absolute left-3.5 top-3 font-mono text-[10px] tracking-[0.14em]"
                  style={{ color: accent ? "rgba(244,239,228,0.8)" : "var(--ink-3)" }}
                >
                  {pn.n}
                </span>
                {pn.image && (
                  <div className="absolute inset-x-4 inset-y-[30px] bottom-14 flex items-center justify-center opacity-50">
                    <img
                      src={pn.image}
                      alt=""
                      className="h-[80%] w-[64%] object-contain"
                    />
                  </div>
                )}
                <span
                  className="relative max-w-[30ch] leading-[1.3]"
                  style={{
                    color: accent ? "#F4EFE4" : "var(--ink)",
                    fontFamily: accent ? "var(--font-display)" : "var(--font-sans)",
                    fontStyle: accent ? "italic" : "normal",
                    fontSize: accent ? "21px" : "14px",
                  }}
                >
                  {pn.caption}
                </span>
              </div>
            </figure>
          );
        })}
      </div>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-[7px]">
          {novel.panels.map((pn) => (
            <span
              key={pn.n}
              className="h-1.5 w-1.5 rounded-full bg-ink opacity-25"
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {prev && (
            <Link
              href={`/${lang}/novel/${prev.slug}`}
              className="pl-btn-sec inline-flex items-center gap-2 rounded-[3px] border-[1.5px] border-ink px-[16px] py-[10px] font-sans text-sm font-medium text-ink transition-all"
            >
              <span className="font-mono">←</span> {dict.ui.prev}
            </Link>
          )}
          <Link
            href={next ? `/${lang}/novel/${next.slug}` : `/${lang}/novel`}
            className="pl-btn-pri inline-flex items-center gap-2 rounded-[3px] border-[1.5px] border-transparent bg-vermilion px-[18px] py-[11px] font-sans text-sm font-medium text-[#F4EFE4] transition-all"
          >
            {next ? dict.ui.next : dict.ui.back} <span className="font-mono">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
