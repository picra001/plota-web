"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { locales, localeName, localeShort, type Locale } from "@/lib/i18n";

type NavLabels = { home: string; devlog: string; novel: string };

export function SiteHeader({
  locale,
  nav,
}: {
  locale: Locale;
  nav: NavLabels;
}) {
  const pathname = usePathname() || `/${locale}`;
  const [langOpen, setLangOpen] = useState(false);
  const [theme, setTheme] = useState<"paper" | "dark">("paper");

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "paper";
    setTheme(current);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "paper" : "dark";
    setTheme(next);
    document.documentElement.setAttribute(
      "data-theme",
      next === "dark" ? "dark" : ""
    );
    try {
      localStorage.setItem("plota-theme", next);
    } catch {
      /* 무시 */
    }
  }

  // 현재 경로의 첫 세그먼트(언어)만 교체해 같은 페이지의 다른 언어로 이동
  function localizedPath(target: Locale): string {
    const parts = pathname.split("/");
    parts[1] = target;
    return parts.join("/") || `/${target}`;
  }

  const base = `/${locale}`;
  const isHome = pathname === base;
  const isDevlog = pathname.startsWith(`${base}/devlog`);
  const isNovel = pathname.startsWith(`${base}/novel`);

  const items: { label: string; href: string; active: boolean }[] = [
    { label: nav.home, href: base, active: isHome },
    { label: nav.devlog, href: `${base}/devlog`, active: isDevlog },
    { label: nav.novel, href: `${base}/novel`, active: isNovel },
  ];

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-4 border-b border-paper-edge bg-paper px-[clamp(20px,5vw,64px)] py-4">
      <Link
        href={base}
        aria-label="PLOTA home"
        className="font-sans text-[22px] font-bold leading-none tracking-[-0.01em] text-ink"
      >
        PLOT<span className="text-vermilion">A</span>
        <span className="font-mono text-[10px] tracking-normal text-ink-3">.AI</span>
      </Link>

      <nav className="ml-2 flex flex-1 gap-[22px]">
        {items.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="pl-navlink border-b-[1.5px] py-1.5 font-mono text-[11px] uppercase tracking-[0.13em] transition-colors"
            style={{
              color: n.active ? "var(--ink)" : "var(--ink-3)",
              borderColor: n.active ? "var(--vermilion)" : "transparent",
            }}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLangOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-paper-edge px-2.5 py-1.5 font-mono text-[11px] tracking-[0.1em] text-ink-2"
        >
          {localeShort[locale]} <span className="text-[9px] opacity-70">▾</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-sm border border-paper-edge text-ink-2"
        >
          <span className="font-mono text-[13px] leading-none">
            {theme === "dark" ? "\u263C" : "\u263E"}
          </span>
        </button>

        {langOpen && (
          <>
            <div
              onClick={() => setLangOpen(false)}
              className="fixed inset-0 z-30"
            />
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[160px] overflow-hidden rounded border border-paper-edge bg-paper shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
              {locales.map((l) => (
                <Link
                  key={l}
                  href={localizedPath(l)}
                  onClick={() => setLangOpen(false)}
                  className="pl-langopt flex w-full items-center justify-between gap-3 border-b border-paper-edge px-3.5 py-2.5 text-left font-sans text-[13px] text-ink last:border-b-0"
                  style={l === locale ? { background: "var(--paper-3)" } : undefined}
                >
                  <span>{localeName[l]}</span>
                  <span className="font-mono text-[10px] tracking-[0.1em] text-ink-3">
                    {localeShort[l]}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
