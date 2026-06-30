"use client";

import { useState } from "react";

export function ShareButtons({ url, title }: { url: string; title: string }) {
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
      // 클립보드 접근 불가 시 무시
    }
  }

  const base =
    "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold text-slate-900">공유하기</span>
      <a href={twitter} target="_blank" rel="noreferrer" className={base}>
        X(트위터)
      </a>
      <a href={facebook} target="_blank" rel="noreferrer" className={base}>
        페이스북
      </a>
      <button type="button" onClick={copyLink} className={base}>
        {copied ? "복사됨!" : "링크 복사"}
      </button>
    </div>
  );
}
