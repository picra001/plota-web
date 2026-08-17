import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isLocale(langParam)) notFound();
  const lang = langParam as Locale;
  const { home } = getDictionary(lang);

  return (
    <section className="mx-auto max-w-[1280px] px-[clamp(20px,5vw,64px)] pb-[clamp(64px,9vh,112px)] pt-[clamp(44px,8vh,96px)]">
      <div className="pl-stagger grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.86fr)] lg:gap-[clamp(48px,7vw,96px)]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              <span className="h-px w-6 bg-ink-3" />
              {home.eyebrow}
            </span>
            <span className="rounded-full border border-vermilion px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-vermilion">
              {home.status}
            </span>
          </div>

          <h1 className="m-0 mt-6 max-w-[10ch] font-display text-[clamp(54px,8vw,104px)] font-normal italic leading-[0.96] tracking-[-0.025em]">
            {home.motto.pre}
            <span className="text-vermilion">{home.motto.accent}</span>
            {home.motto.post}
          </h1>

          <p className="mt-8 max-w-[42ch] font-sans text-[clamp(17px,1.8vw,21px)] leading-[1.6] text-ink-2">
            {home.sub}
          </p>

          <div className="mt-9 grid max-w-[620px] gap-3 sm:grid-cols-2">
            {home.offers.map((offer) => (
              <div
                key={offer.label}
                className="border border-paper-edge bg-paper-2 px-4 py-4"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.13em] text-vermilion">
                  {offer.label}
                </div>
                <p className="mb-0 mt-2 text-sm leading-6 text-ink-2">
                  {offer.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <figure className="relative m-0 overflow-hidden border border-ink bg-black">
          <Image
            src="/images/2d-to-3d-visual.png"
            alt={home.imageAlt}
            width={1000}
            height={1000}
            priority
            className="h-auto w-full"
          />
          <figcaption className="absolute bottom-0 left-0 border-r border-t border-white/20 bg-black/80 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm">
            {home.figureCaption}
          </figcaption>
        </figure>
      </div>

      <div className="mt-[clamp(48px,7vw,84px)] grid border-y border-paper-edge md:grid-cols-3">
        {home.pipeline.map((step, index) => (
          <div
            key={step.label}
            className="border-b border-paper-edge px-5 py-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
          >
            <span className="font-mono text-[10px] text-vermilion">
              0{index + 1}
            </span>
            <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink">
              {step.label}
            </div>
            <p className="mb-0 mt-2 text-sm leading-6 text-ink-3">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
