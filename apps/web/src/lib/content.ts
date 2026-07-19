import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { load as loadYaml } from "js-yaml";
import { defaultLocale, locales, type Locale } from "./i18n";

const CONTENT_DIR = path.join(process.cwd(), "content");
const DEVLOG_DIR = path.join(CONTENT_DIR, "devlog");
const NOVEL_DIR = path.join(CONTENT_DIR, "novels");

const isProd = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// 공통 헬퍼
// ---------------------------------------------------------------------------

function listSlugs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/** {slug}/{locale}.md 를 읽되, 없으면 기본 언어(ko)로 폴백한다. */
function readLocaleFile(dir: string, locale: Locale) {
  const tryOrder = [locale, defaultLocale];
  for (const lc of tryOrder) {
    const file = path.join(dir, `${lc}.md`);
    if (fs.existsSync(file)) {
      const parsed = matter(fs.readFileSync(file, "utf-8"));
      return { ...parsed, usedLocale: lc as Locale };
    }
  }
  return null;
}

function readMeta(dir: string): Record<string, unknown> {
  const file = path.join(dir, "meta.yml");
  if (!fs.existsSync(file)) return {};
  return (loadYaml(fs.readFileSync(file, "utf-8")) as Record<string, unknown>) ?? {};
}

function toISO(value: unknown): string {
  if (!value) return new Date().toISOString();
  return new Date(value as string).toISOString();
}

/** 2026.06.28 형태(언어 중립) */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function readingMinutes(content: string): number {
  const chars = content.replace(/\s/g, "").length;
  return Math.max(1, Math.round(chars / 400));
}

// ---------------------------------------------------------------------------
// Devlog
// ---------------------------------------------------------------------------

export type DevlogSummary = {
  slug: string;
  date: string; // ISO
  dateLabel: string;
  tag: string;
  title: string;
  description: string;
  readingMinutes: number;
  cover?: string;
};

export type DevlogPost = DevlogSummary & { content: string };

function loadDevlog(slug: string, locale: Locale): DevlogPost | null {
  const dir = path.join(DEVLOG_DIR, slug);
  const meta = readMeta(dir);
  if (isProd && meta.draft) return null;

  const file = readLocaleFile(dir, locale);
  if (!file) return null;

  const fm = file.data;
  const date = toISO(meta.date);
  const cover = meta.cover
    ? `/images/devlog/${slug}/${meta.cover as string}`
    : undefined;

  return {
    slug,
    date,
    dateLabel: formatDate(date),
    tag: (meta.tag as string) ?? "DEVLOG",
    title: (fm.title as string) ?? slug,
    description: (fm.description as string) ?? "",
    readingMinutes: readingMinutes(file.content),
    cover,
    content: file.content,
  };
}

export function getDevlogSlugs(): string[] {
  return listSlugs(DEVLOG_DIR).filter((slug) => {
    if (!isProd) return true;
    return !readMeta(path.join(DEVLOG_DIR, slug)).draft;
  });
}

export function getDevlogList(locale: Locale): DevlogSummary[] {
  return getDevlogSlugs()
    .map((slug) => loadDevlog(slug, locale))
    .filter((p): p is DevlogPost => p !== null)
    .map(({ content: _content, ...summary }) => summary)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getDevlogPost(locale: Locale, slug: string): DevlogPost | null {
  if (isProd && readMeta(path.join(DEVLOG_DIR, slug)).draft) return null;
  return loadDevlog(slug, locale);
}

// ---------------------------------------------------------------------------
// Novel (컷툰)
// ---------------------------------------------------------------------------

export type PanelTone = "plain" | "accent";

export type NovelPanel = {
  n: string;
  image?: string;
  tone: PanelTone;
  caption: string;
};

export type NovelSummary = {
  slug: string;
  ep: string;
  status: "LIVE" | "DRAFT";
  date: string;
  title: string;
  logline: string;
  cover?: string;
};

export type NovelPost = NovelSummary & { panels: NovelPanel[] };

type PanelMeta = { image?: string; tone?: PanelTone };

function loadNovel(slug: string, locale: Locale): NovelPost | null {
  const dir = path.join(NOVEL_DIR, slug);
  const meta = readMeta(dir);
  if (isProd && meta.draft) return null;

  const file = readLocaleFile(dir, locale);
  if (!file) return null;

  const fm = file.data;
  const date = toISO(meta.date);
  const panelMeta = (meta.panels as PanelMeta[]) ?? [];
  const captions = (fm.captions as string[]) ?? [];

  const panels: NovelPanel[] = panelMeta.map((pm, i) => ({
    n: String(i + 1).padStart(2, "0"),
    image: pm.image ? `/images/novels/${slug}/${pm.image}` : undefined,
    tone: pm.tone === "accent" ? "accent" : "plain",
    caption: captions[i] ?? "",
  }));

  return {
    slug,
    ep: (meta.ep as string) ?? "001",
    status: meta.status === "DRAFT" ? "DRAFT" : "LIVE",
    date,
    title: (fm.title as string) ?? slug,
    logline: (fm.logline as string) ?? "",
    cover: meta.cover ? `/images/novels/${slug}/${meta.cover as string}` : undefined,
    panels,
  };
}

export function getNovelSlugs(): string[] {
  return listSlugs(NOVEL_DIR).filter((slug) => {
    if (!isProd) return true;
    return !readMeta(path.join(NOVEL_DIR, slug)).draft;
  });
}

export function getNovelList(locale: Locale): NovelSummary[] {
  return getNovelSlugs()
    .map((slug) => loadNovel(slug, locale))
    .filter((n): n is NovelPost => n !== null)
    .map(({ panels: _panels, ...summary }) => summary)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getNovelPost(locale: Locale, slug: string): NovelPost | null {
  if (isProd && readMeta(path.join(NOVEL_DIR, slug)).draft) return null;
  return loadNovel(slug, locale);
}

// ---------------------------------------------------------------------------
// SEO 산출물 공용: 모든 언어 × 모든 글의 경로
// ---------------------------------------------------------------------------

export function getAllRoutes(): {
  path: string;
  locale: Locale;
  lastModified?: string;
}[] {
  const routes: { path: string; locale: Locale; lastModified?: string }[] = [];
  for (const locale of locales) {
    routes.push({ path: `/${locale}`, locale });
    routes.push({ path: `/${locale}/devlog`, locale });
    routes.push({ path: `/${locale}/novel`, locale });
    for (const slug of getDevlogSlugs()) {
      const post = loadDevlog(slug, locale);
      if (post) {
        routes.push({
          path: `/${locale}/devlog/${slug}`,
          locale,
          lastModified: post.date,
        });
      }
    }
    for (const slug of getNovelSlugs()) {
      const novel = loadNovel(slug, locale);
      if (novel) {
        routes.push({
          path: `/${locale}/novel/${slug}`,
          locale,
          lastModified: novel.date,
        });
      }
    }
  }
  return routes;
}
