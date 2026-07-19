import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";

export default function HomePage({ params }: { params: { lang: string } }) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const { home } = getDictionary(lang);

  return (
    <section className="pl-stagger mx-auto max-w-[1180px] px-[clamp(20px,5vw,64px)] pb-[clamp(56px,9vh,120px)] pt-[clamp(72px,13vh,160px)]">
      <span className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        <span className="h-px w-6 bg-ink-3" />
        {home.eyebrow}
      </span>

      <h1 className="m-0 mt-[22px] max-w-[14ch] font-display text-[clamp(48px,9.5vw,118px)] font-normal italic leading-[1.0] tracking-[-0.02em]">
        {home.motto.pre}
        <span className="inline-block translate-x-2.5 text-vermilion">
          {home.motto.accent}
        </span>
        {home.motto.post}
      </h1>

      <p className="mt-[34px] max-w-[34ch] font-sans text-[clamp(17px,2.2vw,22px)] leading-[1.5] text-ink-2">
        {home.sub}
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={`/${lang}/novel`}
          className="pl-btn-pri inline-flex items-center gap-2.5 rounded-[3px] border-[1.5px] border-transparent bg-vermilion px-[22px] py-[13px] font-sans text-sm font-medium text-[#F4EFE4] transition-all"
        >
          {home.ctaNovel} <span className="font-mono">→</span>
        </Link>
        <Link
          href={`/${lang}/devlog`}
          className="pl-btn-sec rounded-[3px] border-[1.5px] border-ink bg-transparent px-[22px] py-[13px] font-sans text-sm font-medium text-ink transition-all"
        >
          {home.ctaDevlog}
        </Link>
      </div>

      <div className="mt-16 flex flex-wrap items-center gap-[18px] font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
        <span>{home.stats[0]}</span>
        <span className="h-1 w-1 self-center rounded-full bg-vermilion" />
        <span>{home.stats[1]}</span>
        <span className="h-1 w-1 self-center rounded-full bg-vermilion" />
        <span>{home.stats[2]}</span>
      </div>
    </section>
  );
}
