import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { isLocale, htmlLang, ogLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import {
  getBreadcrumb,
  getDevlogPost,
  getDevlogSlugs,
  getSiblings,
} from "@/lib/content";
import { site, absoluteUrl } from "@/lib/site";
import { languageAlternates } from "@/lib/seo";
import { ShareButtons } from "@/components/share-buttons";

export const dynamicParams = false;

export function generateStaticParams() {
  return getDevlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const post = getDevlogPost(lang, slug);
  if (!post) return {};

  const path = `/${lang}/devlog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: path,
      languages: languageAlternates((l) => `/${l}/devlog/${post.slug}`),
    },
    openGraph: {
      type: "article",
      locale: ogLocale[lang],
      url: absoluteUrl(path),
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: [site.author.name],
      images: post.cover ? [{ url: post.cover }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function DevlogPostPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: langParam, slug } = await params;
  if (!isLocale(langParam)) notFound();
  const lang = langParam as Locale;
  const dict = getDictionary(lang);
  const post = getDevlogPost(lang, slug);
  if (!post) notFound();

  const trail = getBreadcrumb("devlog", lang, post.slug);
  const { prev, next } = getSiblings("devlog", lang, post.slug);

  const url = absoluteUrl(`/${lang}/devlog/${post.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: htmlLang[lang],
    author: { "@type": "Person", name: site.author.name, url: site.author.url },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: post.cover ? absoluteUrl(post.cover) : undefined,
  };

  return (
    <article className="mx-auto max-w-[680px] px-[clamp(20px,5vw,40px)] pb-[120px] pt-[clamp(36px,6vh,64px)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label={dict.ui.contents}
        className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3"
      >
        <Link href={`/${lang}/devlog`} className="pl-ghost transition-colors">
          {dict.nav.devlog}
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

      <div className="mt-[30px] flex flex-wrap items-baseline gap-3.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
        <span className="text-vermilion">{post.tag}</span>
        <time dateTime={post.date}>{post.dateLabel}</time>
        <span>· {post.readingMinutes}{dict.ui.minRead}</span>
      </div>

      <h1 className="m-0 mt-4 font-sans text-[clamp(30px,5.5vw,46px)] font-semibold leading-[1.12] tracking-[-0.018em]">
        {post.title}
      </h1>

      <div className="prose mt-10">
        <MDXRemote source={post.content} />
      </div>

      {(prev || next) && (
        <nav className="mt-14 grid gap-3 border-t border-paper-edge pt-7 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/${lang}/devlog/${prev.slug}`}
              className="pl-row block border border-paper-edge p-4 text-left"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                ← {dict.ui.prev}
              </span>
              <span className="pl-rowtitle mt-1.5 block font-sans text-[15px] font-medium leading-[1.35] text-ink transition-colors">
                {prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/${lang}/devlog/${next.slug}`}
              className="pl-row block border border-paper-edge p-4 text-right sm:col-start-2"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                {dict.ui.next} →
              </span>
              <span className="pl-rowtitle mt-1.5 block font-sans text-[15px] font-medium leading-[1.35] text-ink transition-colors">
                {next.title}
              </span>
            </Link>
          )}
        </nav>
      )}

      <div className="mt-12 border-t border-paper-edge pt-7 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
        {dict.ui.foot}
      </div>

      <footer className="mt-7">
        <ShareButtons
          url={url}
          title={post.title}
          labels={{
            share: dict.ui.share,
            copy: dict.ui.copyLink,
            copied: dict.ui.copied,
          }}
        />
      </footer>
    </article>
  );
}
