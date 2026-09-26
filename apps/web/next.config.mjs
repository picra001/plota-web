/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 분리 배포: BE(NestJS)가 별도 호스팅(Railway 등)에 떠 있을 때,
  // API_URL 환경변수가 설정되면 /api/* 요청을 BE로 프록시한다.
  // 한 도메인(example.com/api/*)으로 묶여 SEO 권위가 분산되지 않는다.
  // API_URL 미설정 시(예: 블로그만 배포) 이 rewrite는 비활성화된다.
  // 루트(/) 접속은 기본 언어로 보낸다. (필요 시 추후 Accept-Language 기반 미들웨어로 교체)
  async redirects() {
    return [
      { source: "/", destination: "/en", permanent: false },
      { source: "/fbx/:path*", destination: "/en/fbx/:path*", permanent: false },
      { source: "/webtoon/:path*", destination: "/en/webtoon/:path*", permanent: false },
      { source: "/chinese/:path*", destination: "/ko/chinese/:path*", permanent: false },
      { source: "/lab", destination: "/ko/lab", permanent: false },
      { source: "/:lang(en|ko|ja|zh|es)/novel", destination: "/en/webtoon", permanent: true },
      { source: "/:lang(en|ko|ja|zh|es)/novel/:slug", destination: "/en/webtoon/:slug", permanent: true },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.API_URL;
    if (!apiUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
