"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLocale, localeName, locales } from "@/lib/i18n";

const labels = {
  ko: { home: "홈", journal: "개발 기록", lab: "실험실", create: "제작", assets: "에셋", guides: "가이드", series: "전체 작품", latest: "최신 회차", learn: "학습", review: "복습", conversation: "회화", settings: "설정", language: "언어", skip: "본문으로 건너뛰기" },
  en: { home: "Home", journal: "Journal", lab: "Lab", create: "Create", assets: "Assets", guides: "Guides", series: "All series", latest: "Latest episodes", learn: "Learn", review: "Review", conversation: "Conversation", settings: "Settings", language: "Language", skip: "Skip to content" },
  ja: { home: "ホーム", journal: "開発記録", lab: "ラボ", create: "制作", assets: "アセット", guides: "ガイド", series: "作品一覧", latest: "最新話", learn: "学習", review: "復習", conversation: "会話", settings: "設定", language: "言語", skip: "本文へ移動" },
  zh: { home: "首页", journal: "开发日志", lab: "实验室", create: "创作", assets: "素材", guides: "指南", series: "全部作品", latest: "最新章节", learn: "学习", review: "复习", conversation: "会话", settings: "设置", language: "语言", skip: "跳转到正文" },
  es: { home: "Inicio", journal: "Diario", lab: "Laboratorio", create: "Crear", assets: "Recursos", guides: "Guías", series: "Todas las series", latest: "Últimos episodios", learn: "Aprender", review: "Repasar", conversation: "Conversación", settings: "Ajustes", language: "Idioma", skip: "Ir al contenido" },
};

export function SiteFrame({ kind = "hub", children }: { kind?: "hub" | "fbx" | "webtoon" | "chinese"; children: React.ReactNode }) {
  const pathname = usePathname() || "/en";
  const segment = pathname.split("/")[1];
  const locale = isLocale(segment) ? segment : "en";
  const t = labels[locale];
  const root = kind === "hub" ? `/${locale}` : `/${locale}/${kind}`;
  const links = kind === "hub" ? [[t.home, root], [t.journal, `${root}/devlog`], [t.lab, `${root}/lab`]] : kind === "fbx" ? [[t.home, root], [t.create, `${root}/create`], [t.assets, `${root}/assets`], [t.guides, `${root}/guide`]] : kind === "webtoon" ? [[t.series, root], [t.latest, `${root}#latest`]] : [[t.home, root], [t.learn, `${root}/learn`], [({ko:"단어 사전",en:"Dictionary",ja:"単語辞典",zh:"词典",es:"Diccionario"})[locale], `${root}/vocabulary`], [t.conversation, `${root}/conversation`], [t.settings, `${root}/settings`]];
  const title = kind === "hub" ? "STUDIO" : kind === "fbx" ? "FBX STUDIO" : kind === "webtoon" ? "STORIES" : "CHINESE";
  const active = (href: string) => href === root ? pathname === root : !href.includes("#") && pathname.startsWith(href);
  return <div className={kind === "hub" ? "hub-site site-frame" : `product-site ${kind}-site site-frame`}>
    <a href="#main-content" className="skip-link">{t.skip}</a>
    <header className="site-masthead"><div className="site-frame-inner site-header-row"><Link className="site-wordmark" href={root}>PLOTA<span>{title}</span></Link><nav className="site-navigation" aria-label={t.home}>{links.map(([label, href]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>{label}</Link>)}</nav></div></header>
    <main id="main-content" className={kind === "hub" ? "legacy-content" : undefined}>{children}</main>
    <footer className="site-footer"><div className="site-frame-inner"><div className="site-footer-top"><div><Link href={root} className="site-wordmark">PLOTA<span>{title}</span></Link></div></div><div className="site-footer-bottom"><span>PLOTA 2026</span><nav className="footer-languages" aria-label={t.language}><span>{t.language}</span>{locales.map(l => <Link key={l} href={pathname.replace(/^\/(ko|en|ja|zh|es)(?=\/|$)/, `/${l}`)} hrefLang={l} lang={l} aria-current={l === locale ? "page" : undefined} onClick={e => { e.preventDefault(); window.location.assign(pathname.replace(/^\/(ko|en|ja|zh|es)(?=\/|$)/, `/${l}`) + window.location.search + window.location.hash); }}>{localeName[l]}</Link>)}</nav></div></div></footer>
  </div>;
}
