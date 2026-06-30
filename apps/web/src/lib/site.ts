export const site = {
  name: "Plota",
  title: "Plota — 만들고 기록하는 토이 프로젝트 허브",
  description:
    "Plota는 작은 토이 프로젝트들과 그 과정을 기록하는 블로그입니다. 개발, 실험, 배움을 자주 발행합니다.",
  // 배포 도메인이 정해지면 환경변수(NEXT_PUBLIC_SITE_URL)로 덮어쓴다.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://plota.dev",
  locale: "ko_KR",
  author: {
    name: "Plota",
    url: "https://github.com/picra001/plota-web",
  },
  // 헤더/푸터에 노출할 토이 프로젝트 목록 (추가될 때마다 여기에)
  projects: [] as { name: string; href: string; description: string }[],
} as const;

export function absoluteUrl(path = "/"): string {
  const base = site.url.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
