import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { locales, htmlLang, ogLocale, isLocale } from "@/lib/i18n";
import { site, siteMeta } from "@/lib/site";
import { languageAlternates } from "@/lib/seo";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "normal",
  variable: "--font-instrument-serif",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
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

// <html>/<body> 껍데기만 담당한다. 헤더·푸터는 (site) 그룹, 독립 화면은 (bare) 그룹.
export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html
      lang={htmlLang[lang]}
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
        {children}
      </body>
    </html>
  );
}
