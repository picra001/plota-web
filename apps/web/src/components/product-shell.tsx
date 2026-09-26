"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProductShell({ kind, children }: { kind: "fbx" | "webtoon" | "chinese"; children: React.ReactNode }) {
  const pathname = usePathname();
  const chinese = kind === "chinese";
  const root = chinese ? "/ko/chinese" : `/en/${kind}`;
  const links = chinese ? [["首页", "홈", root], ["学", "학습", `${root}/learn`], ["习", "복습", `${root}/review`], ["话", "회화", `${root}/conversation`], ["设", "설정", `${root}/settings`]] : kind === "fbx" ? [["", "Create", `${root}/create`], ["", "Asset library", `${root}/assets`], ["", "Guides", `${root}/guide`]] : [["", "All series", root], ["", "Latest episodes", `${root}#latest`]];
  const active = (href: string) => href === root ? pathname === root : !href.includes("#") && pathname.startsWith(href);
  return <div className={`product-site ${kind}-site`} lang={chinese ? "ko" : "en"}>
    <a href="#main-content" className="skip-link">{chinese ? "본문으로 건너뛰기" : "Skip to content"}</a>
    <header className="product-header"><Link href={root} className="product-logo">{chinese ? <><span className="logo-seal">好</span>한마디<span className="logo-sub">CHINESE</span></> : <><span className="plota-word">PLOTA<span className="brand-dot">.</span></span><span className="logo-sub">{kind === "fbx" ? "FBX STUDIO" : "STORIES"}</span></>}</Link>{!chinese && <nav aria-label="Service navigation">{links.map(([, label, href]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>{label}</Link>)}</nav>}<span className="header-edition">{chinese ? "매일 조금씩" : kind === "fbx" ? "MADE FOR YOUR NEXT WORLD" : "A LITTLE ESCAPE"}</span></header>
    <main id="main-content">{children}</main>
    {chinese ? <nav className="learning-nav" aria-label="학습 메뉴">{links.map(([icon, label, href]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav> : <footer className="product-footer"><span>PLOTA {kind === "fbx" ? "FBX Studio" : "Stories"} <span className="muted">/ An independent project.</span></span><span>{kind === "fbx" ? "Concept collection · Preview edition" : "Original short stories · Preview edition"}</span></footer>}
  </div>;
}
