import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 일반 검색엔진 + AI/생성형 엔진 크롤러 모두 허용 (SEO & GEO)
      { userAgent: "*", allow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
