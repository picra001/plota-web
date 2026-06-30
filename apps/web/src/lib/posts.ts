import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type PostFrontmatter = {
  title: string;
  description: string;
  date: string;
  slug: string;
  tags?: string[];
  thumbnail?: string;
  draft?: boolean;
};

export type Post = PostFrontmatter & {
  content: string;
  readingMinutes: number;
};

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function estimateReadingMinutes(content: string): number {
  // 한글/영문 혼합 기준 대략치: 분당 약 400자
  const chars = content.replace(/\s/g, "").length;
  return Math.max(1, Math.round(chars / 400));
}

function readPostFile(fileName: string): Post | null {
  const fullPath = path.join(POSTS_DIR, fileName);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);
  const slug = (data.slug as string) ?? fileName.replace(/\.mdx?$/, "");

  const fm: PostFrontmatter = {
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    slug,
    tags: data.tags ?? [],
    thumbnail: data.thumbnail,
    draft: Boolean(data.draft),
  };

  if (fm.draft && process.env.NODE_ENV === "production") return null;

  return {
    ...fm,
    content,
    readingMinutes: estimateReadingMinutes(content),
  };
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map(readPostFile)
    .filter((p): p is Post => p !== null)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getPostBySlug(slug: string): Post | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}
