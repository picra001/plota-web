import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { locales, htmlLang, ogLocale, isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import { site, siteMeta } from "@/lib/site";
import { languageAlternates } from "@/lib/seo";
import { SiteHeader } from "@/components/site-header";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Metadata {
  if (!isLocale(params.lang)) return {};
  const lang = params.lang;
  const meta = siteMeta[lang];

  return {
    title: { default: meta.title, template: `%s · ${site.name}` },
    description: meta.description,
    alternates: {
      canonical: `/${lang}`,
      languages: languageAlternates((l) => `/${l}`),
      types: {
        "application/rss+xml": [{ url: "/feed.xml", title: `${site.name} RSS` }],
      },
    },
    openGraph: {
      type: "website",
      locale: ogLocale[lang],
      url: `/${lang}`,
      siteName: site.name,
      title: meta.title,
      description: meta.description,
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}

const NO_FLASH_THEME = `(function(){try{var t=localStorage.getItem('plota-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'paper';}document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'');}catch(e){}})();`;

export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const dict = getDictionary(lang);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: siteMeta[lang].description,
    inLanguage: htmlLang[lang],
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };

  return (
    <html
      lang={htmlLang[lang]}
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <SiteHeader locale={lang} nav={dict.nav} />

        <main className="flex-1">{children}</main>

        <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-paper-edge px-[clamp(20px,5vw,64px)] py-10">
          <Link
            href={`/${lang}`}
            className="font-sans text-base font-bold tracking-[-0.01em] text-ink"
          >
            PLOT<span className="text-vermilion">A</span>
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            {dict.ui.footer}
          </div>
        </footer>
      </body>
    </html>
  );
}
