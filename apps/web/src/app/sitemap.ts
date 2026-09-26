import type { MetadataRoute } from "next";
import { getAllRoutes } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import { locales, defaultLocale, htmlLang } from "@/lib/i18n";
import { productPaths } from "@/lib/mock-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const journal = getAllRoutes().filter((r) => r.path.includes("/devlog")).map((r) => {
    const neutral = r.path.replace(`/${r.locale}`, ""); // 언어 제외 경로
    const languages: Record<string, string> = {};
    for (const l of locales) {
      languages[htmlLang[l]] = absoluteUrl(`/${l}${neutral}`);
    }
    languages["x-default"] = absoluteUrl(`/${defaultLocale}${neutral}`);
    return {
      url: absoluteUrl(r.path),
      lastModified: r.lastModified ? new Date(r.lastModified) : undefined,
      changeFrequency: "weekly" as const,
      priority: neutral === "" ? 1 : 0.7,
      alternates: { languages },
    };
  });
  const current = ["/en", "/ko/lab", ...productPaths.map(p => `/${p.startsWith("chinese") ? "ko" : "en"}/${p}`)];
  return [...current.map(url => ({ url: absoluteUrl(url), changeFrequency: "weekly" as const, priority: url === "/en" ? 1 : 0.7 })), ...journal];
}
