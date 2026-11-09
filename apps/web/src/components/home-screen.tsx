import Link from "@/components/localized-link";
import { featuredGame, homeApps, type HomeApp } from "@/lib/home-apps";
import type { UiLang } from "@/lib/i18n";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Glyph({ name }: { name: HomeApp["glyph"] }) {
  switch (name) {
    case "habitats": return <svg viewBox="0 0 32 32" aria-hidden="true"><path {...S} d="M6 15 16 7l10 8v10H6z" /><path {...S} d="M13 25v-6h6v6" /><path {...S} d="M21 9.5V6h3v6" /></svg>;
    case "fbx-create": return <svg viewBox="0 0 32 32" aria-hidden="true"><circle {...S} cx="16" cy="9" r="3.2" /><path {...S} d="M16 12.5v8M10 15.5l6 2 6-2M12 27l4-6.5 4 6.5" /></svg>;
    case "fbx-assets": return <svg viewBox="0 0 32 32" aria-hidden="true"><path {...S} d="M16 5l10 5.5v11L16 27 6 21.5v-11z" /><path {...S} d="M6 10.5 16 16l10-5.5M16 16v11" /></svg>;
    case "chinese": return <svg viewBox="0 0 32 32" aria-hidden="true"><text x="16" y="22" textAnchor="middle" fontSize="16" fill="currentColor" lang="zh-Hans">你</text></svg>;
    case "webtoon": return <svg viewBox="0 0 32 32" aria-hidden="true"><rect {...S} x="7" y="5" width="18" height="22" rx="2" /><path {...S} d="M7 13h18M7 20h18M16 13v7" /></svg>;
    case "devlog": return <svg viewBox="0 0 32 32" aria-hidden="true"><path {...S} d="M9 6h11l4 4v16H9z" /><path {...S} d="M13 14h8M13 18h8M13 22h5" /></svg>;
    case "lab": return <svg viewBox="0 0 32 32" aria-hidden="true"><path {...S} d="M13 5h6M14 5v8l-6 11a2 2 0 0 0 1.8 3h12.4a2 2 0 0 0 1.8-3l-6-11V5" /><path {...S} d="M11 20h10" /></svg>;
  }
}

function AppIcon({ app, lang }: { app: HomeApp; lang: UiLang }) {
  const inner = <><span className="home-icon" style={{ background: app.color }}><Glyph name={app.glyph} /></span><span className="home-app-name">{app.name[lang]}</span></>;
  return app.external
    ? <a className="home-app" href={app.href}>{inner}</a>
    : <Link className="home-app" href={app.href}>{inner}</Link>;
}

export function HomeScreen({ lang }: { lang: UiLang }) {
  const t = featuredGame.text[lang];
  return (
    <div className="home-screen" lang={lang}>
      <div className="home-device">
        <a className="home-widget" href={featuredGame.href}>
          <span className="home-widget-label">{t.label}</span>
          <strong>{featuredGame.name}</strong>
          <span className="home-widget-note">{t.note}</span>
          <span className="home-widget-play">{t.play}</span>
        </a>
        <nav className="home-grid" aria-label={lang === "ko" ? "앱" : "Apps"}>
          {homeApps.map(app => <AppIcon key={app.id} app={app} lang={lang} />)}
        </nav>
      </div>
    </div>
  );
}
