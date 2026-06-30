import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "블로그",
  description: "개발, 실험, 배움을 기록한 글 목록입니다.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          블로그
        </h1>
        <p className="mt-2 text-slate-600">
          개발, 실험, 배움을 기록합니다. 총 {posts.length}개의 글.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          아직 발행된 글이 없습니다.
        </p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group block">
                <time className="text-sm text-slate-500" dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("ko-KR")} ·{" "}
                  {post.readingMinutes}분
                </time>
                <h2 className="mt-1 text-xl font-bold text-slate-900 group-hover:text-brand">
                  {post.title}
                </h2>
                <p className="mt-1 text-slate-600">{post.description}</p>
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
