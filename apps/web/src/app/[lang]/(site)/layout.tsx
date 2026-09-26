import Link from "next/link";
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="hub-site"><a className="skip-link" href="#hub-main">Skip to content</a><header className="hub-header"><Link className="hub-brand" href="/en">PLOTA<span className="brand-dot">.</span></Link><nav aria-label="Studio navigation"><Link href="/en/devlog">Journal</Link><Link href="/ko/lab">Lab ↗</Link></nav></header><main id="hub-main" className="legacy-content">{children}</main><footer className="hub-footer"><span>PLOTA · Independent ideas, made real.</span><span>A small studio. Many possibilities. / 2026</span></footer></div>;
}
