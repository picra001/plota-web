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
    title: dict.nav.devlog,
    description: dict.dev.desc,
    alternates: {
      canonical: `/${lang}/devlog`,
      languages: languageAlternates((l) => `/${l}/devlog`),
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
  const posts = nodes.filter((n): n is ContentTreeItem => n.type === "item");

  return (
    <>
      {folders.map((folder) => (
        <section
          key={folder.key}
          className={
            depth === 0
              ? "mt-12"
              : "mt-8 border-l border-paper-edge pl-[clamp(14px,2.5vw,26px)]"
          }
        >
          <h2 className="m-0 flex items-baseline gap-3">
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

      {posts.length > 0 && (
        <div className="mt-5 border-t border-paper-edge">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/${lang}/devlog/${p.slug}`}
              className="pl-row block w-full border-b border-paper-edge py-[26px] text-left"
            >
              <div className="flex flex-wrap items-baseline gap-3.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                <span className="text-vermilion">{p.badge}</span>
                <time dateTime={p.date}>{p.dateLabel}</time>
                <span>
                  · {p.readingMinutes}
                  {dict.ui.minRead}
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-3">
                <h3 className="pl-rowtitle m-0 flex-1 font-sans text-[clamp(19px,3vw,25px)] font-medium leading-[1.25] tracking-[-0.012em] text-ink transition-colors">
                  {p.title}
                </h3>
                <span className="pl-arrow font-mono text-base text-vermilion opacity-0 transition-all">
                  →
                </span>
              </div>
              <p className="mt-2 max-w-[62ch] font-sans text-[15px] leading-[1.55] text-ink-2">
                {p.summary}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default async function DevlogIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isLocale(langParam)) notFound();
  const lang = langParam as Locale;
  const dict = getDictionary(lang);
  const nodes = getContentTree("devlog", lang);

  return (
    <section className="mx-auto max-w-[920px] px-[clamp(20px,5vw,64px)] pb-[120px] pt-[clamp(40px,7vh,80px)]">
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
