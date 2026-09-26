import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary, type Dictionary } from "@/lib/dictionary";
import {
  getContentTree,
  type ContentTreeFolder,
  type ContentTreeItem,
  type ContentTreeNode,
} from "@/lib/content";
import { languageAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    title: dict.nav.novel,
    description: dict.nov.desc,
    alternates: {
      canonical: `/${lang}/novel`,
      languages: languageAlternates((l) => `/${l}/novel`),
    },
  };
}

function TreeGroup({
  nodes,
  depth,
  lang,
  dict,
}: {
  nodes: ContentTreeNode[];
  depth: number;
  lang: Locale;
  dict: Dictionary;
}) {
  const folders = nodes.filter((n): n is ContentTreeFolder => n.type === "folder");
  const novels = nodes.filter((n): n is ContentTreeItem => n.type === "item");

  return (
    <>
      {folders.map((folder) => (
        <section
          key={folder.key}
          className={
            depth === 0
              ? "mt-12"
              : "mt-9 border-l border-paper-edge pl-[clamp(14px,2.5vw,26px)]"
          }
        >
          <h2 className="m-0 flex items-baseline gap-3 border-b border-paper-edge pb-3">
            <span
              className={
                depth === 0
                  ? "font-sans text-[19px] font-semibold tracking-[-0.01em] text-ink"
                  : "font-sans text-[15px] font-semibold text-ink-2"
              }
            >
              {folder.icon ? `${folder.icon} ` : ""}
              {folder.title}
            </span>
            <span className="font-mono text-[10px] tracking-[0.12em] text-ink-4">
              {folder.count}
            </span>
          </h2>
          <TreeGroup
            nodes={folder.children}
            depth={depth + 1}
            lang={lang}
            dict={dict}
          />
        </section>
      ))}

      {novels.length > 0 && (
        <div className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-[clamp(20px,3vw,34px)]">
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
                  {n.badge}
                </span>
                <span
                  className="absolute right-3 top-3 rounded-full border px-[7px] py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
                  style={{
                    color:
                      n.status === "DRAFT" ? "var(--ink-3)" : "var(--vermilion)",
                  }}
                >
                  {n.status === "DRAFT" ? dict.ui.statusDraft : dict.ui.statusLive}
                </span>
              </div>
              <h3 className="pl-covertitle m-0 mt-4 font-display text-[25px] font-normal leading-[1.1] text-ink transition-colors">
                {n.title}
              </h3>
              <p className="mt-2 font-sans text-sm leading-[1.5] text-ink-2">
                {n.summary}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default async function NovelIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isLocale(langParam)) notFound();
  const lang = langParam as Locale;
  const dict = getDictionary(lang);
  const nodes = getContentTree("novel", lang);

  return (
    <section className="mx-auto max-w-[1080px] px-[clamp(20px,5vw,64px)] pb-[120px] pt-[clamp(40px,7vh,80px)]">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        {dict.nov.eyebrow}
      </span>
      <h1 className="m-0 mt-3.5 font-sans text-[clamp(34px,5.5vw,52px)] font-medium leading-[1.06] tracking-[-0.015em]">
        {dict.nov.title.pre}
        <span className="font-display font-normal text-vermilion">
          {dict.nov.title.accent}
        </span>
        {dict.nov.title.post}
      </h1>
      <p className="mt-[18px] max-w-[52ch] font-sans text-base leading-[1.55] text-ink-2">
        {dict.nov.desc}
      </p>

      {nodes.length === 0 ? (
        <p className="mt-12 border border-dashed border-paper-edge p-8 text-center text-ink-3">
          {dict.ui.empty}
        </p>
      ) : (
        <TreeGroup nodes={nodes} depth={0} lang={lang} dict={dict} />
      )}
    </section>
  );
}
