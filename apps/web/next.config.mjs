/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 분리 배포: BE(NestJS)가 별도 호스팅(Railway 등)에 떠 있을 때,
  // API_URL 환경변수가 설정되면 /api/* 요청을 BE로 프록시한다.
  // 한 도메인(example.com/api/*)으로 묶여 SEO 권위가 분산되지 않는다.
  // API_URL 미설정 시(예: 블로그만 배포) 이 rewrite는 비활성화된다.
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
