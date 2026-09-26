import Link from "next/link";
import type { Locale } from "@/lib/i18n";

/** Legacy entry point. Active layouts use SiteFrame. */
export function SiteHeader({ locale, nav }: { locale: Locale; nav: { generate: string; devlog: string; novel: string; lab: string } }) {
  return <header className="site-masthead"><div className="site-frame-inner site-header-row"><Link className="site-wordmark" href={`/${locale}`}>PLOTA</Link><nav className="site-navigation"><Link href={`/${locale}/fbx`}>{nav.generate}</Link><Link href={`/${locale}/devlog`}>{nav.devlog}</Link><Link href={`/${locale}/webtoon`}>{nav.novel}</Link><Link href={`/${locale}/lab`}>{nav.lab}</Link></nav></div></header>;
}
