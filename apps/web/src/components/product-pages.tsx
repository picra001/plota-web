import Link from "./localized-link";
import { heroArt, stories, type Story } from "@/lib/mock-data";
import type { UiLang } from "@/lib/i18n";
import { AssetArt, StoryArt } from "./product-art";
import { FbxCreateApp } from "./fbx-create";
import { FbxJobView } from "./fbx-job";
import { FbxGallery } from "./fbx-gallery";
import { FbxGuideView } from "./fbx-guide";

// 서버 컴포넌트는 lang 을 받는다. 링크는 /ko/... 로 적고 LocalizedLink 가 현재 언어로 바꾼다.

const HOME = {
  ko: { lede: "그림 한 장을 움직이는 3D 캐릭터로.", create: "만들기", assets: "에셋 보기", note: "그림 한 장", steps: [["그림", "정면을 보고 선 캐릭터 한 명."], ["3D · 뼈대", "모양을 만들고 뼈대를 넣습니다."], ["FBX", "애니메이션까지 담긴 파일 하나."]], guideTitle: "처음이라면", guideText: "좋은 그림 고르는 법과 결과 쓰는 법.", guide: "가이드 보기" },
  en: { lede: "Turn one drawing into a moving 3D character.", create: "Create", assets: "Browse assets", note: "one drawing", steps: [["Drawing", "One character, facing forward."], ["3D · Skeleton", "We build the shape and fit a skeleton."], ["FBX", "One file, animation included."]], guideTitle: "New here?", guideText: "How to pick a drawing and use the result.", guide: "Read the guide" },
};

export function FbxHome({ lang }: { lang: UiLang }) {
  const t = HOME[lang];
  return <div className="product-container"><section className="fbx-hero"><div className="hero-copy"><h1>FBX Studio</h1><p className="hero-description">{t.lede}</p><div className="button-row"><Link className="button primary" href="/ko/fbx/create">{t.create}</Link><Link className="button outline" href="/ko/fbx/assets">{t.assets}</Link></div></div><div className="hero-workbench"><div className="workbench-top"><span>FBX STUDIO</span><span>001</span></div><div className="workbench-grid"><div className="sketch-note"><span>01</span><svg viewBox="0 0 120 130" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2"><path d="m28 23 62-2 4 43-68-1zm8 44 47 3 4 41-53-2zM50 37v7m25-7v7M48 53h27M35 111l-2 15m48-15 4 15M30 72l-12 26m71-23 15 23" /></g></svg><span>{t.note}</span></div><AssetArt asset={heroArt} className="hero-bot" /></div><div className="workbench-bottom"><span>SKETCH  SHAPE  PLAY</span></div></div></section><section className="feature-band">{t.steps.map(([title, text], i) => <div key={title}><span>0{i + 1}</span><strong>{title}</strong><p>{text}</p></div>)}</section><section className="callout"><div><h2>{t.guideTitle}</h2><p>{t.guideText}</p></div><Link className="button outline" href="/ko/fbx/guide">{t.guide}</Link></section></div>;
}

export function FbxCreate({ lang }: { lang: UiLang }) {
  const t = lang === "ko" ? { eyebrow: "초대 전용", title: "만들기", text: "그림 한 장을 보내면 애니메이션이 들어간 FBX를 돌려드립니다." } : { eyebrow: "INVITE ONLY", title: "Create", text: "Send one drawing and get an animated FBX back." };
  return <div className="product-container"><div className="page-heading"><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p>{t.text}</p></div><FbxCreateApp /></div>;
}

export function FbxJob() { return <div className="product-container"><FbxJobView /></div>; }

export function FbxLibrary({ lang }: { lang: UiLang }) {
  return <div className="product-container"><div className="page-heading"><h1>{lang === "ko" ? "에셋" : "Assets"}</h1></div><FbxGallery /></div>;
}

export function FbxGuide({ lang }: { lang: UiLang }) { return <FbxGuideView lang={lang} />; }

// ------------------------------------------------------------------ 웹툰

const WT = {
  ko: { eyebrow: "PLOTA 오리지널", title: "웹툰", all: "전체 작품", latest: "최신 회차", episodes: (n: number) => `${n}화`, enter: "보러 가기", read: "읽기", allStories: "전체 작품", first: "첫 화 보기", chapters: "회차", episode: (s: string) => `${Number(s)}화`, thanks: "읽어 주셔서 고마워요.", prev: "이전 화", next: "다음 화", backSeries: "작품으로", cover: "표지", scene: (n: number) => `장면 ${n}` },
  en: { eyebrow: "PLOTA ORIGINALS", title: "Webtoons", all: "All series", latest: "Latest episodes", episodes: (n: number) => `${n} ${n === 1 ? "EPISODE" : "EPISODES"}`, enter: "Read the story", read: "Read", allStories: "All stories", first: "Read the first episode", chapters: "Episodes", episode: (s: string) => `EPISODE ${s}`, thanks: "Thanks for reading.", prev: "Previous episode", next: "Next episode", backSeries: "Back to the series", cover: "cover", scene: (n: number) => `scene ${n}` },
};

function StoryCard({ story, lang, featured = false }: { story: Story; lang: UiLang; featured?: boolean }) {
  const i = stories.indexOf(story); const s = story.text[lang]; const w = WT[lang];
  return <Link href={`/ko/webtoon/${story.slug}`} className={`story-card ${featured ? "featured" : ""}`}><div className="story-cover"><StoryArt variant={i} title={`${s.title} ${w.cover}`} /><span className="story-cover-number">0{i + 1}</span><span className="story-cover-title">{s.title}</span></div><div className="story-card-copy"><span className="eyebrow">{s.genre} / {w.episodes(story.episodes.length)}</span><h3>{s.title}</h3><p>{s.subtitle}</p><span className="text-link">{w.enter}</span></div></Link>;
}

export function WebtoonHome({ lang }: { lang: UiLang }) {
  const w = WT[lang];
  return <div className="product-container"><div className="stories-intro"><p className="eyebrow">{w.eyebrow}</p><h1>{w.title}</h1></div><StoryCard story={stories[0]} lang={lang} featured /><section className="section-block"><div className="section-heading"><h2>{w.all}</h2></div><div className="stories-grid">{stories.map(s => <StoryCard key={s.slug} story={s} lang={lang} />)}</div></section><section id="latest" className="section-block"><div className="section-heading"><h2>{w.latest}</h2></div>{stories.map((s, i) => { const ep = s.episodes[s.episodes.length - 1]; return <Link className="episode-list-row" key={s.slug} href={`/ko/webtoon/${s.slug}/${ep.slug}`}><span className="episode-index">0{i + 1}</span><div><span className="eyebrow">{s.text[lang].title}</span><h3>{ep.text[lang].title}</h3></div><span>{w.read}</span></Link>; })}</section></div>;
}

export function WebtoonSeries({ story, lang }: { story: Story; lang: UiLang }) {
  const s = story.text[lang]; const w = WT[lang];
  return <div className="product-container"><Link className="back-link" href="/ko/webtoon">← {w.allStories}</Link><section className="series-hero"><div className="series-cover"><StoryArt variant={stories.indexOf(story)} title={`${s.title} ${w.cover}`} /></div><div><p className="eyebrow">{s.genre}</p><h1>{s.title}</h1><p className="hero-description">{s.description}</p><Link className="button primary" href={`/ko/webtoon/${story.slug}/${story.episodes[0].slug}`}>{w.first}</Link></div></section><section className="episode-section"><div className="section-heading"><h2>{w.chapters}</h2><span>{w.episodes(story.episodes.length)}</span></div>{story.episodes.map(e => <Link className="episode-list-row" href={`/ko/webtoon/${story.slug}/${e.slug}`} key={e.slug}><span className="episode-index">{e.slug}</span><div><span className="eyebrow">{w.episode(e.slug)}</span><h3>{e.text[lang].title}</h3></div><span>{w.read}</span></Link>)}</section></div>;
}

export function WebtoonReader({ story, episode, lang }: { story: Story; episode: Story["episodes"][number]; lang: UiLang }) {
  const idx = story.episodes.indexOf(episode); const s = story.text[lang]; const e = episode.text[lang]; const w = WT[lang];
  return <article className="reader"><header className="reader-heading"><Link className="back-link" href={`/ko/webtoon/${story.slug}`}>← {s.title}</Link><p className="eyebrow">{w.episode(episode.slug)}</p><h1>{e.title}</h1></header><div className="comic-strip">{e.lines.map((line, i) => <section className={`comic-panel panel-${i % 3}`} key={line}><StoryArt variant={stories.indexOf(story)} title={`${s.title}, ${w.scene(i + 1)}`} /><div className="comic-caption"><span>{String(i + 1).padStart(2, "0")}</span><p>{line}</p></div></section>)}</div><footer className="reader-end"><h2>{w.thanks}</h2><div className="button-row">{idx > 0 && <Link className="button outline" href={`/ko/webtoon/${story.slug}/${story.episodes[idx - 1].slug}`}>← {w.prev}</Link>}{idx < story.episodes.length - 1 ? <Link className="button primary" href={`/ko/webtoon/${story.slug}/${story.episodes[idx + 1].slug}`}>{w.next} →</Link> : <Link className="button primary" href={`/ko/webtoon/${story.slug}`}>{w.backSeries}</Link>}</div></footer></article>;
}
