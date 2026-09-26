import type { Metadata } from "next";
import { site, siteMeta } from "@/lib/site";
import { defaultLocale } from "@/lib/i18n";
import "./globals.css";
import "./products.css";
import "./chinese.css";

// 실제 <html>/<body> 와 헤더·푸터는 app/[lang]/layout.tsx 에서 렌더한다.
// (App Router i18n 패턴: 루트 레이아웃은 통과만 시킨다.)
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: siteMeta[defaultLocale].title,
    template: `%s · ${site.name}`,
  },
  description: siteMeta[defaultLocale].description,
  applicationName: site.name,
  authors: [{ name: site.author.name, url: site.author.url }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
