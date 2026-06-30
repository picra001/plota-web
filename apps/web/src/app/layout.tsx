import type { Metadata } from "next";
import Link from "next/link";
import { site, absoluteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.author.name, url: site.author.url }],
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: `${site.name} RSS` }],
    },
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
          {site.name}
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/blog" className="hover:text-slate-900">
            블로그
          </Link>
          <a
            href={site.author.url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-900"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-slate-200">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name}. 만들고 기록합니다.
        </p>
        <Link href="/feed.xml" className="hover:text-slate-900">
          RSS 구독
        </Link>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: "ko-KR",
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
  };

  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
