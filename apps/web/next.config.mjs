/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Markdown 원문(devlog 등)은 서버 번들에도 함께 넣는다(lib/content.ts 의 turbopackIgnore 와 짝).
  outputFileTracingIncludes: { "/*": ["./content/**/*"] },
  // 분리 배포: BE(NestJS)가 별도 호스팅(Railway 등)에 떠 있을 때,
  // API_URL 환경변수가 설정되면 /api/* 요청을 BE로 프록시한다.
  // 한 도메인(example.com/api/*)으로 묶여 SEO 권위가 분산되지 않는다.
  // API_URL 미설정 시(예: 블로그만 배포) 이 rewrite는 비활성화된다.
  // 루트(/) 접속은 기본 언어로 보낸다. (필요 시 추후 Accept-Language 기반 미들웨어로 교체)
  async redirects() {
    return [
      // 예전 허브(첫 페이지)는 없앴다. 언어 루트는 홈 화면으로 보낸다.
      { source: "/ko", destination: "/home", permanent: false },
      { source: "/:lang(en|ja|zh|es)", destination: "/:lang/home", permanent: false },
      { source: "/games", destination: "/home", permanent: false },
      { source: "/fbx/:path*", destination: "/ko/fbx/:path*", permanent: false },
      { source: "/webtoon/:path*", destination: "/ko/webtoon/:path*", permanent: false },
      // 컨셉 에셋 상세 페이지는 없앴다
      { source: "/:lang(en|ko|ja|zh|es)/fbx/assets/:slug", destination: "/:lang/fbx/assets", permanent: true },
      // 플랫폼별 가이드(roblox/overdare)는 하나로 합쳤다
      { source: "/:lang(en|ko|ja|zh|es)/fbx/guide/:platform", destination: "/:lang/fbx/guide", permanent: true },
      { source: "/chinese/:path*", destination: "/ko/chinese/:path*", permanent: false },
      { source: "/lab", destination: "/ko/lab", permanent: false },
      { source: "/:lang(en|ko|ja|zh|es)/novel", destination: "/:lang/webtoon", permanent: true },
      { source: "/:lang(en|ko|ja|zh|es)/novel/:slug", destination: "/:lang/webtoon/:slug", permanent: true },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.API_URL;
    // 루트(/)는 메인 게임이다. public/index.html(= games/set-main.mjs 로 복사한 게임 화면)을
    // Cloudflare 에셋이 Worker 보다 먼저 내준다. 아래 rewrite 는 next dev/start 에서도 같게 보이도록 둔 것.
    const beforeFiles = [
      { source: "/", destination: "/index.html" },
      { source: "/games/:game", destination: "/games/:game/index.html" },
      { source: "/home", destination: "/ko/home" },
    ];
    const afterFiles = apiUrl
      ? [{ source: "/api/:path*", destination: `${apiUrl.replace(/\/$/, "")}/:path*` }]
      : [];
    return { beforeFiles, afterFiles, fallback: [] };
  },
};

export default nextConfig;
