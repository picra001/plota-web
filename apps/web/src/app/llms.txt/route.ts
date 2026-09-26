import { getDevlogList } from "@/lib/content";
import { site, siteMeta, absoluteUrl } from "@/lib/site";
import { defaultLocale } from "@/lib/i18n";
import { stories } from "@/lib/mock-data";

export const dynamic = "force-static";

// llms.txt — 생성형 AI/답변형 엔진(GEO)이 사이트 핵심 콘텐츠를 이해하기 쉽게 요약 제공.
export function GET() {
  const lang = defaultLocale;
  const devlog = getDevlogList(lang);

  const devLines =
    devlog
      .map(
        (p) =>
          `- [${p.title}](${absoluteUrl(`/${lang}/devlog/${p.slug}`)}): ${p.description}`
      )
      .join("\n") || "- (아직 발행된 글이 없습니다)";

  const novLines =
    stories
      .map(
        (n) =>
          `- [${n.title}](${absoluteUrl(`/en/webtoon/${n.slug}`)}): ${n.description}`
      )
      .join("\n") || "- (아직 발행된 이야기가 없습니다)";

  const body = `# ${site.name}

> ${siteMeta[lang].description}

PLOTA is an independent studio. The hub, FBX Studio, and original webtoons use English. Lab and the Mandarin learning app use Korean. All new product content is a preview; AI generation and FBX file downloads are not available yet. SVG concept artwork can be downloaded. Learning progress stays in the browser.

## Products
- [FBX Studio](${absoluteUrl("/en/fbx")}): AI-assisted creation workflow preview for Roblox and OVERDARE.
- [Asset library](${absoluteUrl("/en/fbx/assets")}): Original concept illustrations, not validated 3D models.
- [Webtoons](${absoluteUrl("/en/webtoon")}): Original series and illustrated storyboard episodes.
- [한마디 Chinese](${absoluteUrl("/ko/chinese")}): HSK 1–4 vocabulary quizzes and scoped conversation for Korean speakers. Real vocabulary transcribed from three supplied PDFs.
- [Lab](${absoluteUrl("/ko/lab")}): Small independent experiments.

## Chinese vocabulary and agent access
- [Vocabulary JSON](${absoluteUrl("/data/chinese/hsk-1-4.json")}): One static source of truth; 1,200 source entries, 1,192 unique headwords. Includes pinyin, Korean senses, source page references and source hashes.
- [Conversation scope](${absoluteUrl("/ko/chinese/conversation")}): Query parameters deck=hsk-1-4, level=0..4 (0 means all), offset=0-based, count=1..20. Focus words are the selected level's ordered slice. Support vocabulary is the entire selected deck.
- [Agent protocol](${absoluteUrl("/data/chinese/agent-guide.md")}): Tool contract and fallback instructions.
- Browser WebMCP tools: list_vocabulary_decks, get_learning_scope, search_vocabulary, check_chinese_scope. Read-only public content; no private history.
- Read the active scope before tutoring. Use focus words and easier support words from this deck only. Explain in Korean, one question per turn. Check Chinese examples; rewrite unknown words or ask the learner before extending scope.
- A static website URL is not a ChatGPT remote MCP server endpoint. Without browser WebMCP use the JSON and copied prompt. Do not claim access or validation if unavailable.

## Devlog (개발 로그)
${devLines}

## Webtoons
${novLines}

## Links
- Devlog: ${absoluteUrl(`/${lang}/devlog`)}
- Webtoon: ${absoluteUrl("/en/webtoon")}
- RSS: ${absoluteUrl("/feed.xml")}
- Sitemap: ${absoluteUrl("/sitemap.xml")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
