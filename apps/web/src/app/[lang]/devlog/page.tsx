import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import { getDevlogList } from "@/lib/content";
import { languageAlternates } from "@/lib/seo";

export function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Metadata {
  if (!isLocale(params.lang)) return {};
  const dict = getDictionary(params.lang);
  return {
    title: dict.nav.devlog,
    description: dict.dev.desc,
    alternates: {
      canonical: `/${params.lang}/devlog`,
      languages: languageAlternates((l) => `/${l}/devlog`),
    },
  };
}

export default function DevlogIndexPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const dict = getDictionary(lang);
  const posts = getDevlogList(lang);

  return (
    <section className="mx-auto max-w-[980px] px-[clamp(20px,5vw,64px)] pb-[120px] pt-[clamp(48px,8vh,88px)]">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        {dict.dev.eyebrow}
      </span>
      <h1 className="m-0 mt-3.5 font-sans text-[clamp(34px,5.5vw,52px)] font-medium leading-[1.06] tracking-[-0.015em]">
        {dict.dev.title.pre}
        <em className="font-display font-normal italic text-vermilion">
          {dict.dev.title.accent}
        </em>
        {dict.dev.title.post}
      </h1>
      <p className="mt-[18px] max-w-[52ch] font-sans text-base leading-[1.55] text-ink-2">
        {dict.dev.desc}
      </p>

      {posts.length === 0 ? (
        <p className="mt-12 border border-dashed border-paper-edge p-8 text-center text-ink-3">
          {dict.ui.empty}
        </p>
      ) : (
        <div className="mt-12 border-t border-paper-edge">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/${lang}/devlog/${p.slug}`}
              className="pl-row block w-full border-b border-paper-edge py-[26px] text-left"
            >
              <div className="flex flex-wrap items-baseline gap-3.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                <span className="text-vermilion">{p.tag}</span>
                <span>{p.dateLabel}</span>
                <span>· {p.readingMinutes}{dict.ui.minRead}</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-3">
                <h2 className="pl-rowtitle m-0 flex-1 font-sans text-[clamp(20px,3.2vw,27px)] font-medium leading-[1.25] tracking-[-0.012em] text-ink transition-colors">
                  {p.title}
                </h2>
                <span className="pl-arrow font-mono text-base text-vermilion opacity-0 transition-all">
                  →
                </span>
              </div>
              <p className="mt-2 max-w-[62ch] font-sans text-[15px] leading-[1.55] text-ink-2">
                {p.description}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
