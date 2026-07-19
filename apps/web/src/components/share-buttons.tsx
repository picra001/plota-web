"use client";

import { useState } from "react";

type Labels = { share: string; copy: string; copied: string };

export function ShareButtons({
  url,
  title,
  labels,
}: {
  url: string;
  title: string;
  labels: Labels;
}) {
  const [copied, setCopied] = useState(false);

  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    title
  )}&url=${encodeURIComponent(url)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url
  )}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 접근 불가 시 무시 */
    }
  }

  const base =
    "pl-ghost rounded-[3px] border border-paper-edge px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">
        {labels.share}
      </span>
      <a href={twitter} target="_blank" rel="noreferrer" className={base}>
        X
      </a>
      <a href={facebook} target="_blank" rel="noreferrer" className={base}>
        Facebook
      </a>
      <button type="button" onClick={copyLink} className={base}>
        {copied ? labels.copied : labels.copy}
      </button>
    </div>
  );
}
