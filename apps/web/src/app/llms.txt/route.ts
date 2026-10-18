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
          `- [${n.text.ko.title}](${absoluteUrl(`/ko/webtoon/${n.slug}`)}): ${n.text.ko.description}`
      )
      .join("\n") || "- (아직 발행된 이야기가 없습니다)";

  const body = `# ${site.name}

> ${siteMeta[lang].description}

PLOTA is an independent studio. The hub, FBX Studio, and webtoons are in Korean (default, /ko) and English (/en). Lab and the Mandarin learning app use Korean. FBX Studio turns one drawing into a rigged, animated FBX (invite only). Chinese quiz scores are session-only; no learning history is persisted.

## Products
- [FBX Studio](${absoluteUrl("/ko/fbx")}): One drawing to a rigged, animated 3D character FBX.
- [Assets](${absoluteUrl("/ko/fbx/assets")}): Shared results and a small concept collection.
- [Guide](${absoluteUrl("/ko/fbx/guide")}): How to pick a drawing, send it, and use the result.
- [Webtoons](${absoluteUrl("/ko/webtoon")}): Original series and illustrated storyboard episodes.
- [한마디 Chinese](${absoluteUrl("/ko/chinese")}): HSK 1–4 vocabulary quizzes and scoped conversation for Korean speakers. Real vocabulary transcribed from three supplied PDFs.
- [Lab](${absoluteUrl("/ko/lab")}): Small independent experiments.

## Chinese vocabulary and agent access
- [Vocabulary JSON](${absoluteUrl("/data/chinese/hsk-1-4.json")}): One static source of truth; 1,200 source entries, 1,192 unique headwords. Includes pinyin, Korean senses, source page references and source hashes.
- [Conversation scope](${absoluteUrl("/ko/chinese/conversation")}): Select one of 19 theme books with ?deck=hsk-1-4&book=hsk-theme-03. Book number or Korean name also works. All words in that book are focus words; the entire HSK dataset supplies support vocabulary.
- [Agent protocol](${absoluteUrl("/data/chinese/agent-guide.md")}): Tool contract and fallback instructions.
- Browser WebMCP tools: list_vocabulary_decks, get_learning_scope, search_vocabulary, check_chinese_scope. Read-only public content; no private history.
- Call list_vocabulary_decks for names and numbers, then get_learning_scope({book: 3}) or get_learning_scope({book: "음식과 식사"}). Vary sentence patterns, tense, questions, negation, comparison and situations freely without a fixed script. Read the active scope before tutoring. Use focus words and easier support words from this deck only. Explain in Korean, one question per turn. Check Chinese examples; rewrite unknown words or ask the learner before extending scope.
- A static website URL is not a ChatGPT remote MCP server endpoint. Without browser WebMCP use the JSON and copied prompt. Do not claim access or validation if unavailable.

## Devlog (개발 로그)
${devLines}

## Webtoons
${novLines}

## Links
- Devlog: ${absoluteUrl(`/${lang}/devlog`)}
- Webtoon: ${absoluteUrl("/ko/webtoon")}
- RSS: ${absoluteUrl("/feed.xml")}
- Sitemap: ${absoluteUrl("/sitemap.xml")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
