import type { MetadataRoute } from "next";
import { getAllRoutes } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import { locales, defaultLocale, htmlLang } from "@/lib/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  return getAllRoutes().map((r) => {
    const neutral = r.path.replace(`/${r.locale}`, ""); // 언어 제외 경로
    const languages: Record<string, string> = {};
    for (const l of locales) {
      languages[htmlLang[l]] = absoluteUrl(`/${l}${neutral}`);
    }
    languages["x-default"] = absoluteUrl(`/${defaultLocale}${neutral}`);
    return {
      url: absoluteUrl(r.path),
      lastModified: r.lastModified ? new Date(r.lastModified) : undefined,
      changeFrequency: "weekly",
      priority: neutral === "" ? 1 : 0.7,
      alternates: { languages },
    };
  });
}
