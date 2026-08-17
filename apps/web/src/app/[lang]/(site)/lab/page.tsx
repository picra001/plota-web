import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import { languageAlternates } from "@/lib/seo";

// path 가 있으면 링크, 없으면 준비 중 버튼으로 렌더한다
const services: { id: string; name: string; path?: string }[] = [
  { id: "off", name: "OFF.", path: "/lab/off" },
  { id: "generate-fbx", name: "Generate FBX" },
  { id: "image-to-mesh", name: "Image to Mesh" },
  { id: "auto-rigging", name: "Auto Rigging" },
  { id: "texture-upscale", name: "Texture Upscale" },
  { id: "sketch-cleanup", name: "Sketch Cleanup" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    title: dict.nav.lab,
    description: dict.lab.desc,
    alternates: {
      canonical: `/${lang}/lab`,
      languages: languageAlternates((l) => `/${l}/lab`),
    },
  };
}

export default async function LabPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isLocale(langParam)) notFound();
  const lang = langParam as Locale;
  const dict = getDictionary(lang);

  return (
    <section className="mx-auto max-w-[1080px] px-[clamp(20px,5vw,64px)] pb-[120px] pt-[clamp(40px,7vh,80px)]">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        {dict.lab.eyebrow}
      </span>
      <h1 className="m-0 mt-3.5 font-sans text-[clamp(34px,5.5vw,52px)] font-medium leading-[1.06] tracking-[-0.015em]">
        {dict.lab.title.pre}
        <em className="font-display font-normal italic text-vermilion">
          {dict.lab.title.accent}
        </em>
        {dict.lab.title.post}
      </h1>
      <p className="mt-[18px] max-w-[52ch] font-sans text-base leading-[1.55] text-ink-2">
        {dict.lab.desc}
      </p>

      <ul className="mt-12 flex max-w-[680px] list-none flex-col gap-3 p-0">
        {services.map((s) => {
          const label = (
            <span className="font-sans text-[17px] font-medium leading-tight">
              {s.name}
            </span>
          );
          const cls =
            "pl-btn-sec flex w-full items-center justify-between gap-5 rounded-sm border border-paper-edge bg-paper-2 px-5 py-4 text-left transition-colors";

          return (
            <li key={s.id}>
              {s.path ? (
                <Link href={`/${lang}${s.path}`} className={cls}>
                  {label}
                  <span className="shrink-0 font-mono text-[12px] opacity-70">
                    →
                  </span>
                </Link>
              ) : (
                <button type="button" className={cls}>
                  {label}
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
                    {dict.lab.soon}
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
