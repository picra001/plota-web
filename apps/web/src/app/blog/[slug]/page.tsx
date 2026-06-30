import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllSlugs, getPostBySlug } from "@/lib/posts";
import { site, absoluteUrl } from "@/lib/site";
import { ShareButtons } from "@/components/share-buttons";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return {};

  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: [site.author.name],
      images: post.thumbnail ? [{ url: post.thumbnail }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const url = absoluteUrl(`/blog/${post.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "ko-KR",
    author: { "@type": "Person", name: site.author.name, url: site.author.url },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.tags?.join(", "),
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="text-sm font-medium text-brand hover:underline"
      >
        ← 블로그
      </Link>

      <header className="mt-6 mb-10 border-b border-slate-200 pb-8">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-slate-600">{post.description}</p>
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString("ko-KR")}
          </time>
          <span>·</span>
          <span>{post.readingMinutes}분 읽기</span>
        </div>
      </header>

      <div className="prose">
        <MDXRemote source={post.content} />
      </div>

      <footer className="mt-12 border-t border-slate-200 pt-8">
        <ShareButtons url={url} title={post.title} />
      </footer>
    </article>
  );
}
