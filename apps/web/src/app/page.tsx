import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/site";

export default function HomePage() {
  const posts = getAllPosts().slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="py-20 sm:py-28">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand">
          Build &amp; Write
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          작은 프로젝트를 만들고,
          <br />
          그 과정을 기록합니다.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          {site.description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/blog"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            블로그 둘러보기
          </Link>
          <a
            href={site.author.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* 최신 글 */}
      <section className="py-8">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-slate-900">최신 글</h2>
          <Link href="/blog" className="text-sm font-medium text-brand hover:underline">
            전체 보기 →
          </Link>
        </div>

        {posts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
            아직 발행된 글이 없습니다. 첫 글을{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              content/posts
            </code>{" "}
            에 작성해 보세요.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {posts.map((post) => (
              <li key={post.slug} className="py-5">
                <Link href={`/blog/${post.slug}`} className="group block">
                  <time className="text-sm text-slate-500" dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("ko-KR")}
                  </time>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900 group-hover:text-brand">
                    {post.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-slate-600">
                    {post.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 토이 프로젝트 */}
      <section className="py-12">
        <h2 className="mb-6 text-2xl font-bold text-slate-900">토이 프로젝트</h2>
        {site.projects.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
            곧 공개됩니다. 이 자리에 토이 프로젝트들이 추가될 예정입니다.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {site.projects.map((p) => (
              <a
                key={p.href}
                href={p.href}
                className="rounded-xl border border-slate-200 p-5 transition hover:border-brand hover:shadow-sm"
              >
                <h3 className="font-semibold text-slate-900">{p.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{p.description}</p>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
