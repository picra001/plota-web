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
  // 허브·FBX·웹툰은 한국어(기본)·영어 두 벌, 중국어 학습·실험실은 한국어 전용
  const bilingual = (path: string) => ({ ko: absoluteUrl(`/ko${path}`), en: absoluteUrl(`/en${path}`), "x-default": absoluteUrl(`/ko${path}`) });
  const pages = ["", ...productPaths.filter(p => p !== "fbx/job" && !p.startsWith("chinese")).map(p => `/${p}`)].flatMap(path => (["ko", "en"] as const).map(l => ({
    url: absoluteUrl(`/${l}${path}`), changeFrequency: "weekly" as const, priority: path === "" && l === "ko" ? 1 : 0.7, alternates: { languages: bilingual(path) },
  })));
  const koOnly = ["/ko/lab", ...productPaths.filter(p => p.startsWith("chinese")).map(p => `/ko/${p}`)].map(url => ({ url: absoluteUrl(url), changeFrequency: "weekly" as const, priority: 0.7 }));
  return [...pages, ...koOnly, ...journal];
}
