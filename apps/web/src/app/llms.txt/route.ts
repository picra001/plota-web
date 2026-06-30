import { getAllPosts } from "@/lib/posts";
import { site, absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

// llms.txt — 생성형 AI/답변형 엔진(GEO)이 사이트 핵심 콘텐츠를 이해하기 쉽게 요약 제공.
export function GET() {
  const posts = getAllPosts();

  const postLines = posts
    .map(
      (post) =>
        `- [${post.title}](${absoluteUrl(`/blog/${post.slug}`)}): ${post.description}`
    )
    .join("\n");

  const body = `# ${site.name}

> ${site.description}

## Blog
${postLines || "- (아직 발행된 글이 없습니다)"}

## Links
- 블로그 목록: ${absoluteUrl("/blog")}
- RSS: ${absoluteUrl("/feed.xml")}
- Sitemap: ${absoluteUrl("/sitemap.xml")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
