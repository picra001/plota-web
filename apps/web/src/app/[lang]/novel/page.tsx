import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import { getNovelList } from "@/lib/content";
import { languageAlternates } from "@/lib/seo";

export function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Metadata {
  if (!isLocale(params.lang)) return {};
  const dict = getDictionary(params.lang);
  return {
    title: dict.nav.novel,
    description: dict.nov.desc,
    alternates: {
      canonical: `/${params.lang}/novel`,
      languages: languageAlternates((l) => `/${l}/novel`),
    },
  };
}

export default function NovelIndexPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const dict = getDictionary(lang);
  const novels = getNovelList(lang);

  return (
    <section className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,64px)] pb-[120px] pt-[clamp(48px,8vh,88px)]">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        {dict.nov.eyebrow}
      </span>
      <h1 className="m-0 mt-3.5 font-sans text-[clamp(34px,5.5vw,52px)] font-medium leading-[1.06] tracking-[-0.015em]">
        {dict.nov.title.pre}
        <em className="font-display font-normal italic text-vermilion">
          {dict.nov.title.accent}
        </em>
        {dict.nov.title.post}
      </h1>
      <p className="mt-[18px] max-w-[52ch] font-sans text-base leading-[1.55] text-ink-2">
        {dict.nov.desc}
      </p>

      {novels.length === 0 ? (
        <p className="mt-12 border border-dashed border-paper-edge p-8 text-center text-ink-3">
          {dict.ui.empty}
        </p>
      ) : (
        <div className="mt-12 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[clamp(20px,3vw,36px)]">
          {novels.map((n) => (
            <Link
              key={n.slug}
              href={`/${lang}/novel/${n.slug}`}
              className="pl-cover block text-left"
            >
              <div className="pl-coverframe relative flex aspect-[3/4] items-center justify-center overflow-hidden border-[1.5px] border-ink bg-paper-2 transition-colors">
                {n.cover && (
                  <img
                    src={n.cover}
                    alt=""
                    className="h-[62%] w-[62%] object-contain opacity-60"
                  />
                )}
                <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                  EP {n.ep}
                </span>
                <span
                  className="absolute right-3 top-3 rounded-full border px-[7px] py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
                  style={{
                    color:
                      n.status === "LIVE" ? "var(--vermilion)" : "var(--ink-3)",
                  }}
                >
                  {n.status === "LIVE" ? dict.ui.statusLive : dict.ui.statusDraft}
                </span>
              </div>
              <h2 className="pl-covertitle m-0 mt-4 font-display text-[25px] font-normal italic leading-[1.1] text-ink transition-colors">
                {n.title}
              </h2>
              <p className="mt-2 font-sans text-sm leading-[1.5] text-ink-2">
                {n.logline}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
