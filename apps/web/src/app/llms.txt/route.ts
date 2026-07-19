import { getDevlogList, getNovelList } from "@/lib/content";
import { site, siteMeta, absoluteUrl } from "@/lib/site";
import { defaultLocale } from "@/lib/i18n";

export const dynamic = "force-static";

// llms.txt — 생성형 AI/답변형 엔진(GEO)이 사이트 핵심 콘텐츠를 이해하기 쉽게 요약 제공.
export function GET() {
  const lang = defaultLocale;
  const devlog = getDevlogList(lang);
  const novels = getNovelList(lang);

  const devLines =
    devlog
      .map(
        (p) =>
          `- [${p.title}](${absoluteUrl(`/${lang}/devlog/${p.slug}`)}): ${p.description}`
      )
      .join("\n") || "- (아직 발행된 글이 없습니다)";

  const novLines =
    novels
      .map(
        (n) =>
          `- [${n.title}](${absoluteUrl(`/${lang}/novel/${n.slug}`)}): ${n.logline}`
      )
      .join("\n") || "- (아직 발행된 이야기가 없습니다)";

  const body = `# ${site.name}

> ${siteMeta[lang].description}

이 사이트는 5개 언어(ko, en, ja, zh, es)로 제공되며, 에디터 없이 마크다운 파일로 발행하는 읽기 전용 출판 플랫폼입니다.

## Devlog (개발 로그)
${devLines}

## Novel (비주얼 노벨)
${novLines}

## Links
- Devlog: ${absoluteUrl(`/${lang}/devlog`)}
- Novel: ${absoluteUrl(`/${lang}/novel`)}
- RSS: ${absoluteUrl("/feed.xml")}
- Sitemap: ${absoluteUrl("/sitemap.xml")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
