import Link from "next/link";
import { notFound } from "next/navigation";
import { htmlLang, isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import { getDevlogList, getNovelList } from "@/lib/content";
import { site, siteMeta, absoluteUrl } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import {
  WebMcpContentTools,
  type WebMcpContentItem,
} from "@/components/webmcp-content-tools";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isLocale(langParam)) notFound();
  const lang = langParam as Locale;
  const dict = getDictionary(lang);
  const webMcpContent: WebMcpContentItem[] = [
    ...getDevlogList(lang).map((post) => ({
      type: "devlog" as const,
      title: post.title,
      summary: post.description,
      url: absoluteUrl(`/${lang}/devlog/${post.slug}`),
      date: post.date,
      tag: post.tag,
    })),
    ...getNovelList(lang).map((novel) => ({
      type: "novel" as const,
      title: novel.title,
      summary: novel.logline,
      url: absoluteUrl(`/${lang}/novel/${novel.slug}`),
      date: novel.date,
      episode: novel.ep,
    })),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: siteMeta[lang].description,
    inLanguage: htmlLang[lang],
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader locale={lang} nav={dict.nav} />
      <WebMcpContentTools locale={lang} items={webMcpContent} />

      <main className="flex-1">{children}</main>

      <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-paper-edge px-[clamp(20px,5vw,64px)] py-10">
        <Link
          href={`/${lang}`}
          className="font-sans text-base font-bold tracking-[-0.01em] text-ink"
        >
          PLOT<span className="text-vermilion">A</span>
          <span className="font-mono text-[9px] tracking-normal text-ink-3">.AI</span>
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          {dict.ui.footer}
        </div>
      </footer>
    </>
  );
}
