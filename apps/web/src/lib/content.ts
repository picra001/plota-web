import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { load as loadYaml } from "js-yaml";
import { defaultLocale, locales, type Locale } from "./i18n";

const CONTENT_DIR = path.join(process.cwd(), "content");

/** 섹션 = URL 세그먼트, 값 = content/ 아래 디렉터리 */
const SECTION_DIR = {
  devlog: path.join(CONTENT_DIR, "devlog"),
  novel: path.join(CONTENT_DIR, "novels"),
} as const;

export type Section = keyof typeof SECTION_DIR;

const isProd = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// 계층 구조 규약
//
//   content/devlog/<폴더>/<폴더>/<slug>/{meta.yml, ko.md, en.md, ...}
//
//   - {locale}.md 를 하나라도 가진 디렉터리는 "글", 아니면 "폴더"로 본다.
//   - 폴더 깊이에는 제한이 없고, 폴더 메타는 _folder.yml 에 둔다.
//   - slug 는 섹션 안에서 유일해야 한다. URL 은 폴더 경로를 포함하지 않는다.
// ---------------------------------------------------------------------------

type FolderMeta = {
  order?: number;
  icon?: string;
  title?: Partial<Record<Locale, string>>;
};

/** 정렬 시 order 미지정 항목을 뒤로 보내기 위한 기본값 */
const NO_ORDER = 1_000_000;

function isPostDir(dir: string): boolean {
  return locales.some((lc) => fs.existsSync(path.join(dir, `${lc}.md`)));
}

function childDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("_"))
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

function readFolderMeta(dir: string): FolderMeta {
  const file = path.join(dir, "_folder.yml");
  if (!fs.existsSync(file)) return {};
  return (loadYaml(fs.readFileSync(file, "utf-8")) as FolderMeta) ?? {};
}

function folderTitle(meta: FolderMeta, dirName: string, locale: Locale): string {
  return meta.title?.[locale] ?? meta.title?.[defaultLocale] ?? dirName;
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
// 디렉터리 탐색
// ---------------------------------------------------------------------------

type ContentEntry = {
  slug: string;
  dir: string;
  /** 조상 폴더 키(상위 → 하위). 예: ["engineering", "engineering/pipeline"] */
  folderKeys: string[];
};

function collectEntries(section: Section): ContentEntry[] {
  const entries: ContentEntry[] = [];
  const seen = new Set<string>();

  function walk(dir: string, relPath: string, folderKeys: string[]) {
    for (const name of childDirs(dir)) {
      const child = path.join(dir, name);
      const rel = relPath ? `${relPath}/${name}` : name;

      if (!isPostDir(child)) {
        walk(child, rel, [...folderKeys, rel]);
        continue;
      }
      if (seen.has(name)) {
        if (!isProd) {
          console.warn(`[content] 중복 slug "${name}" — ${rel} 은(는) 무시됩니다.`);
        }
        continue;
      }
      seen.add(name);
      entries.push({ slug: name, dir: child, folderKeys });
    }
  }

  walk(SECTION_DIR[section], "", []);
  return entries;
}

function findEntry(section: Section, slug: string): ContentEntry | null {
  return collectEntries(section).find((e) => e.slug === slug) ?? null;
}

function isPublished(dir: string): boolean {
  return !(isProd && readMeta(dir).draft);
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

function loadDevlog(entry: ContentEntry, locale: Locale): DevlogPost | null {
  const meta = readMeta(entry.dir);
  if (isProd && meta.draft) return null;

  const file = readLocaleFile(entry.dir, locale);
  if (!file) return null;

  const fm = file.data;
  const date = toISO(meta.date);
  const cover = meta.cover
    ? `/images/devlog/${entry.slug}/${meta.cover as string}`
    : undefined;

  return {
    slug: entry.slug,
    date,
    dateLabel: formatDate(date),
    tag: (meta.tag as string) ?? "DEVLOG",
    title: (fm.title as string) ?? entry.slug,
    description: (fm.description as string) ?? "",
    readingMinutes: readingMinutes(file.content),
    cover,
    content: file.content,
  };
}

export function getDevlogSlugs(): string[] {
  return collectEntries("devlog")
    .filter((e) => isPublished(e.dir))
    .map((e) => e.slug);
}

export function getDevlogList(locale: Locale): DevlogSummary[] {
  return collectEntries("devlog")
    .map((entry) => loadDevlog(entry, locale))
    .filter((p): p is DevlogPost => p !== null)
    .map(({ content: _content, ...summary }) => summary)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getDevlogPost(locale: Locale, slug: string): DevlogPost | null {
  const entry = findEntry("devlog", slug);
  return entry ? loadDevlog(entry, locale) : null;
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

function loadNovel(entry: ContentEntry, locale: Locale): NovelPost | null {
  const meta = readMeta(entry.dir);
  if (isProd && meta.draft) return null;

  const file = readLocaleFile(entry.dir, locale);
  if (!file) return null;

  const fm = file.data;
  const date = toISO(meta.date);
  const panelMeta = (meta.panels as PanelMeta[]) ?? [];
  const captions = (fm.captions as string[]) ?? [];

  const panels: NovelPanel[] = panelMeta.map((pm, i) => ({
    n: String(i + 1).padStart(2, "0"),
    image: pm.image ? `/images/novels/${entry.slug}/${pm.image}` : undefined,
    tone: pm.tone === "accent" ? "accent" : "plain",
    caption: captions[i] ?? "",
  }));

  return {
    slug: entry.slug,
    ep: (meta.ep as string) ?? "001",
    status: meta.status === "DRAFT" ? "DRAFT" : "LIVE",
    date,
    title: (fm.title as string) ?? entry.slug,
    logline: (fm.logline as string) ?? "",
    cover: meta.cover
      ? `/images/novels/${entry.slug}/${meta.cover as string}`
      : undefined,
    panels,
  };
}

export function getNovelSlugs(): string[] {
  return collectEntries("novel")
    .filter((e) => isPublished(e.dir))
    .map((e) => e.slug);
}

export function getNovelList(locale: Locale): NovelSummary[] {
  return collectEntries("novel")
    .map((entry) => loadNovel(entry, locale))
    .filter((n): n is NovelPost => n !== null)
    .map(({ panels: _panels, ...summary }) => summary)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getNovelPost(locale: Locale, slug: string): NovelPost | null {
  const entry = findEntry("novel", slug);
  return entry ? loadNovel(entry, locale) : null;
}

// ---------------------------------------------------------------------------
// 사이드바/목록용 트리
// ---------------------------------------------------------------------------

export type ContentTreeItem = {
  type: "item";
  slug: string;
  title: string;
  /** devlog = 한 줄 요약, novel = 로그라인 */
  summary: string;
  date: string;
  dateLabel: string;
  /** devlog = 태그, novel = EP 번호 */
  badge: string;
  readingMinutes?: number;
  cover?: string;
  status?: "LIVE" | "DRAFT";
};

export type ContentTreeFolder = {
  type: "folder";
  key: string;
  title: string;
  icon?: string;
  /** 하위 전체(중첩 포함) 글 수 */
  count: number;
  children: ContentTreeNode[];
};

export type ContentTreeNode = ContentTreeFolder | ContentTreeItem;

function toTreeItem(
  section: Section,
  entry: ContentEntry,
  locale: Locale
): ContentTreeItem | null {
  if (section === "devlog") {
    const post = loadDevlog(entry, locale);
    if (!post) return null;
    return {
      type: "item",
      slug: post.slug,
      title: post.title,
      summary: post.description,
      date: post.date,
      dateLabel: post.dateLabel,
      badge: post.tag,
      readingMinutes: post.readingMinutes,
      cover: post.cover,
    };
  }

  const novel = loadNovel(entry, locale);
  if (!novel) return null;
  return {
    type: "item",
    slug: novel.slug,
    title: novel.title,
    summary: novel.logline,
    date: novel.date,
    dateLabel: formatDate(novel.date),
    badge: `EP ${novel.ep}`,
    cover: novel.cover,
    status: novel.status,
  };
}

function countItems(nodes: ContentTreeNode[]): number {
  return nodes.reduce(
    (total, node) => total + (node.type === "item" ? 1 : node.count),
    0
  );
}

function buildTree(
  section: Section,
  dir: string,
  relPath: string,
  locale: Locale
): ContentTreeNode[] {
  const folders: { node: ContentTreeFolder; order: number; name: string }[] = [];
  const items: { node: ContentTreeItem; order: number }[] = [];

  for (const name of childDirs(dir)) {
    const child = path.join(dir, name);
    const rel = relPath ? `${relPath}/${name}` : name;

    if (isPostDir(child)) {
      const node = toTreeItem(section, { slug: name, dir: child, folderKeys: [] }, locale);
      if (!node) continue;
      const order = readMeta(child).order;
      items.push({ node, order: typeof order === "number" ? order : NO_ORDER });
      continue;
    }

    const children = buildTree(section, child, rel, locale);
    const count = countItems(children);
    if (count === 0) continue;

    const meta = readFolderMeta(child);
    folders.push({
      node: {
        type: "folder",
        key: rel,
        title: folderTitle(meta, name, locale),
        icon: meta.icon,
        count,
        children,
      },
      order: meta.order ?? NO_ORDER,
      name,
    });
  }

  folders.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  items.sort(
    (a, b) =>
      a.order - b.order || +new Date(b.node.date) - +new Date(a.node.date)
  );

  // 노션처럼 폴더를 먼저, 그 아래 낱개 글을 둔다.
  return [...folders.map((f) => f.node), ...items.map((i) => i.node)];
}

export function getContentTree(section: Section, locale: Locale): ContentTreeNode[] {
  return buildTree(section, SECTION_DIR[section], "", locale);
}

/** 글의 조상 폴더를 상위 → 하위 순서로 반환한다. */
export function getBreadcrumb(
  section: Section,
  locale: Locale,
  slug: string
): { key: string; title: string }[] {
  const entry = findEntry(section, slug);
  if (!entry) return [];

  return entry.folderKeys.map((key) => {
    const dir = path.join(SECTION_DIR[section], ...key.split("/"));
    const name = key.split("/").pop() as string;
    return { key, title: folderTitle(readFolderMeta(dir), name, locale) };
  });
}

function flattenTree(nodes: ContentTreeNode[]): ContentTreeItem[] {
  return nodes.flatMap((node) =>
    node.type === "item" ? [node] : flattenTree(node.children)
  );
}

/** 트리 표시 순서 기준의 이전/다음 글 */
export function getSiblings(
  section: Section,
  locale: Locale,
  slug: string
): { prev?: ContentTreeItem; next?: ContentTreeItem } {
  const flat = flattenTree(getContentTree(section, locale));
  const index = flat.findIndex((item) => item.slug === slug);
  if (index === -1) return {};
  return { prev: flat[index - 1], next: flat[index + 1] };
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
  const devlogEntries = collectEntries("devlog");
  const novelEntries = collectEntries("novel");

  for (const locale of locales) {
    routes.push({ path: `/${locale}`, locale });
    routes.push({ path: `/${locale}/devlog`, locale });
    routes.push({ path: `/${locale}/novel`, locale });

    for (const entry of devlogEntries) {
      const post = loadDevlog(entry, locale);
      if (post) {
        routes.push({
          path: `/${locale}/devlog/${post.slug}`,
          locale,
          lastModified: post.date,
        });
      }
    }
    for (const entry of novelEntries) {
      const novel = loadNovel(entry, locale);
      if (novel) {
        routes.push({
          path: `/${locale}/novel/${novel.slug}`,
          locale,
          lastModified: novel.date,
        });
      }
    }
  }
  return routes;
}
