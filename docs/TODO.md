# Plota 작업 현황 & TODO

> 목적: 로컬에서 사이트를 완성도 있게 다듬기 위한 작업 목록.
> 우선순위 원칙(= 프로젝트 목표): **① SEO → ② GEO → ③ 서버 비용 최소화** (`ARCHITECTURE.md` 참고)
> 진행 기록은 [`PROGRESS.md`](./PROGRESS.md).

범례: `[ ]` 할 일 · `[~]` 진행중/부분완료 · `[x]` 완료 · 🔴 높음 · 🟡 보통 · 🟢 낮음

---

## 0. 이미 된 것 (기반)

- [x] 모노레포 + Next.js(App Router) + Tailwind
- [x] **PLOTA 디자인 적용** — 종이/먹/베르밀리온 토큰, 다크/라이트 테마 토글(no-flash), 헤더·푸터, hover/진입 애니메이션
- [x] **다국어(i18n) 5개 언어**(ko·en·ja·zh·es) — `app/[lang]` 라우팅, `/` → `/ko` 리다이렉트, 헤더 언어 전환
- [x] **에디터 없는 마크다운 글쓰기 구조** — `content/devlog`·`content/novels` 폴더 + `{lang}.md`(번역 없으면 ko 폴백)
- [x] **Devlog**(블로그) 목록/상세 — 마크다운 본문 렌더
- [x] **Novel**(컷툰 패널) 목록/상세
- [x] 폰트 — `next/font`(Geist·Geist Mono·Instrument Serif) + Pretendard(한글, CDN)
- [x] SEO 기본: 페이지별 메타데이터, OG/Twitter, JSON-LD(WebSite/Article/CreativeWork), canonical
- [x] **hreflang/x-default** — 페이지 `<link rel=alternate>` + sitemap 대체 링크
- [x] sitemap.xml(전 언어×전 글) / robots.txt / RSS(feed.xml) / llms.txt 자동 생성
- [x] 공유 버튼(X·페이스북·링크 복사) — 다국어 라벨
- [x] 정적 생성(SSG) 빌드 검증(52페이지 prerender)

> ⚠️ 변경점: 기존 `/blog` + 단일언어 MDX 구조 → `/[lang]/devlog` + `/[lang]/novel` 다국어 구조로 교체됨.
> 샘플 글/이미지는 디자인 원본 콘텐츠 + 모티프 SVG 플레이스홀더로 채워져 있음(실제 콘텐츠로 교체 필요).

---

## 1. SEO (최우선) 🔴

- [ ] 🔴 **`NEXT_PUBLIC_SITE_URL`을 실제 배포 URL로 설정** — 현재 sitemap/RSS/OG에 기본값 `plota.dev`가 박힘.
- [ ] 🔴 **동적 OG 이미지 생성** (`opengraph-image` / `@vercel/og`) — 글 제목·언어가 들어간 카드 자동 생성.
- [ ] 🔴 **Google Search Console / Naver 서치어드바이저 등록** + 사이트맵 제출, 소유권 인증.
- [~] 🟡 시맨틱 마크업 — `<article>`·`<time>`·`<nav>`·h1→h2 계층 적용됨. `<time dateTime>` 등 세부 점검 남음.
- [ ] 🟡 태그/카테고리 페이지(`/[lang]/devlog/tags/{tag}`) — 내부 링크·주제성 강화.
- [ ] 🟡 글 본문 자동 **목차(TOC)** + 헤딩 앵커 링크.
- [ ] 🟡 관련 글 / 이전·다음 글(에피소드) 링크 — 내부 링크 + 체류시간.
- [ ] 🟡 빵부스러기(BreadcrumbList) JSON-LD.
- [ ] 🟢 **다국어 404** — 잘못된 언어(`/fr` 등) 대응 localized not-found.
- [ ] 🟢 이미지 `next/image` 전환(LCP/용량) — 현재 `<img>` 사용.

## 2. GEO (생성형 엔진 최적화) 🟡

- [~] 🟢 llms.txt — Devlog/Novel 섹션 요약 제공됨. 주제별 요약 등 품질 개선 여지.
- [ ] 🟡 글 상단 "요약(TL;DR)" 블록 — 인용되기 좋은 자족적 문단.
- [ ] 🟡 FAQ 구조화 데이터(FAQPage JSON-LD) — frontmatter 지원.
- [ ] 🟢 AI 크롤러 허용 상태 점검(GPTBot/PerplexityBot 등) — robots 현재 전체 허용.

## 3. 디자인 마감 🟡

- [x] 디자인 시스템(컬러/타이포/간격 토큰) + 다크모드
- [x] 본문(prose) 가독성 — 한글 웹폰트, 줄간격, figure/figcaption
- [x] 헤더/푸터 + 언어/테마 토글
- [x] 목록(Devlog row / Novel cover) · 상세 디자인
- [x] 랜딩 히어로
- [ ] 🟡 favicon / OG 기본 이미지 / 테마 컬러(브랜딩) — 아직 미추가(`apps/web/public` 비어 있음, 이미지 폴더만 존재).
- [~] 🟡 모바일 헤더 — 현재 flex-wrap으로 접힘. 좁은 화면용 메뉴(드로어/햄버거) 검토.
- [ ] 🟡 코드블록 **신택스 하이라이팅**(rehype-pretty-code / shiki) — 현재 단색 pre.
- [ ] 🟢 로딩/빈 상태/스켈레톤, 마이크로 인터랙션.

## 4. 콘텐츠 페이지/기능 (글쓰기 외) 🟡

- [ ] 🔴 **About(소개) 페이지** — 저자/사이트 정체성(E-E-A-T 신뢰 신호), 다국어.
- [ ] 🟡 **클라이언트 검색**(정적 인덱스 기반, 서버 불필요) — 언어별.
- [ ] 🟡 태그 인덱스 / 아카이브(연도별).
- [ ] 🟡 페이지네이션(글 많아질 때).
- [ ] 🟢 Novel 모바일 **세로 스와이프/스냅** 인터랙션.
- [ ] 🟢 조회수/좋아요(서버리스 또는 외부 무료 서비스).
- [ ] 🟢 댓글 — Giscus(GitHub Discussions, 서버 0대) 검토.

## 5. 사이트 신뢰 (E-E-A-T) 🟡

- [ ] 🔴 저자 정보/프로필(About + Person/Organization JSON-LD).
- [ ] 🟡 개인정보처리방침 / 연락처 / 라이선스 표기.
- [ ] 🟡 글 작성일·수정일 표기 — 발행일 있음, 수정일(dateModified 분리) 검토.
- [~] 🟢 일관된 브랜드(로고/OG/파비콘) — 로고 적용됨, OG/파비콘 자산 추가 필요.

## 6. 공유 (외부 유입) 🟡

- [ ] 🟡 공유 버튼에 **Reddit / LinkedIn / 카카오톡 / 스레드** 추가.
- [ ] 🟡 OG 태그가 각 플랫폼에서 카드로 잘 뜨는지 검증(특히 OG 이미지).
- [ ] 🟢 "링크 복사" UX(토스트), Web Share API(모바일 네이티브 공유).

## 7. 모바일 / 반응형 / 접근성 🟡

- [~] 🔴 **모바일 레이아웃 점검** — clamp 기반 반응형 적용됨. 헤더/이미지/코드블록 가로 스크롤 실제 점검 필요.
- [ ] 🟡 터치 타깃 크기, 폰트 스케일, 안전영역(safe-area).
- [ ] 🟡 접근성(a11y) — 대비(특히 다크모드), 포커스 링, aria, 키보드 내비.
- [ ] 🟢 실제 기기/뷰포트 테스트, Lighthouse 모바일 점수.

## 8. 성능 / 품질 (Core Web Vitals) 🟡

- [x] 폰트 최적화(`next/font`) — Geist 계열 로컬 번들.
- [ ] 🟡 Pretendard CDN `@import` → `next/font/local` 또는 preconnect로 CLS/요청 최적화 검토.
- [ ] 🟡 Lighthouse / PageSpeed로 LCP·CLS·INP 측정 및 개선.
- [ ] 🟢 분석 도구(Vercel Analytics 무료 또는 Plausible) 도입.
- [ ] 🟢 번들 점검.

## 9. 운영 / DX 🟢

- [ ] 🟡 환경변수 정리(`NEXT_PUBLIC_SITE_URL` 등) + `.env.example`.
- [ ] 🟡 Vercel 재배포 — `/blog` → `/[lang]` 구조 변경 반영(기존 URL 리다이렉트 검토).
- [ ] 🟢 작업용 `develop` 브랜치 → Preview 확인 후 main 머지 플로우.
- [ ] 🟢 lint/format(eslint/prettier) 정리, CI(빌드 체크).
- [x] 글 작성 가이드/규약 — `README.md`에 devlog/novel·이미지 위치 규칙 문서화.

## 10. 콘텐츠 🟢

- [ ] 🔴 **샘플 → 실제 콘텐츠 교체** — devlog 3편·novel 3편이 디자인 데모 텍스트, 이미지는 모티프 플레이스홀더.
- [ ] 🟡 발행 캘린더/주제 백로그(정기 발행이 SEO 핵심).
- [ ] 🟢 카테고리/태그 체계 정의.
- [ ] 🟢 번역 워크플로 — 언어별 `{lang}.md` 작성/검수 프로세스.

---

## 추천 진행 순서 (로컬 개발 단계)

1. **샘플 → 실제 콘텐츠 교체 + 실제 이미지**(10·3) → 데모 티 제거
2. **About 페이지 + 신뢰 요소**(4·5) → E-E-A-T 기반
3. **코드 하이라이팅·TOC·관련글 등 본문/내부 링크**(1·3) → 가독성 + SEO 구조
4. **동적 OG 이미지 + 공유 확장(Reddit 등)**(1·6) → 외부 유입
5. **모바일 메뉴·접근성·성능 점검**(7·8) → 마감 품질
6. 배포 시 **`NEXT_PUBLIC_SITE_URL`·Search Console·재배포**(1·9) 마무리
