"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContentTreeNode } from "@/lib/content";

type SidebarLabels = {
  contents: string;
  close: string;
};

type Props = {
  section: "devlog" | "novel";
  /** 예: /ko/devlog */
  basePath: string;
  /** 사이드바 상단에 표시할 섹션 이름 */
  sectionLabel: string;
  nodes: ContentTreeNode[];
  labels: SidebarLabels;
};

/** 활성 글을 감싸는 모든 폴더 키를 상위 → 하위 순서로 찾는다. */
function ancestorKeys(
  nodes: ContentTreeNode[],
  slug: string,
  trail: string[] = []
): string[] | null {
  for (const node of nodes) {
    if (node.type === "item") {
      if (node.slug === slug) return trail;
      continue;
    }
    const found = ancestorKeys(node.children, slug, [...trail, node.key]);
    if (found) return found;
  }
  return null;
}

function storageKey(section: string) {
  return `plota-tree-${section}`;
}

export function ContentSidebar({
  section,
  basePath,
  sectionLabel,
  nodes,
  labels,
}: Props) {
  const pathname = usePathname() || basePath;
  const activeSlug = pathname.startsWith(`${basePath}/`)
    ? pathname.slice(basePath.length + 1).split("/")[0]
    : null;
  const isIndexActive = pathname === basePath;

  // 서버 렌더와 동일해야 하므로 props/경로만으로 결정되는 값이어야 한다.
  // 최상위 폴더는 기본으로 펼치고, 활성 글의 조상은 항상 펼친다.
  const defaultOpen = useMemo(() => {
    const state: Record<string, boolean> = {};
    for (const node of nodes) {
      if (node.type === "folder") state[node.key] = true;
    }
    return state;
  }, [nodes]);

  const forcedOpen = useMemo(() => {
    const state: Record<string, boolean> = {};
    if (activeSlug) {
      for (const key of ancestorKeys(nodes, activeSlug) ?? []) state[key] = true;
    }
    return state;
  }, [nodes, activeSlug]);

  const [open, setOpen] = useState<Record<string, boolean>>({
    ...defaultOpen,
    ...forcedOpen,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 저장된 접힘 상태를 불러오되, 현재 글의 경로는 항상 펼쳐 둔다.
  useEffect(() => {
    let stored: Record<string, boolean> = {};
    try {
      stored = JSON.parse(localStorage.getItem(storageKey(section)) ?? "{}");
    } catch {
      stored = {};
    }
    setOpen({ ...defaultOpen, ...stored, ...forcedOpen });
  }, [section, defaultOpen, forcedOpen]);

  const toggle = useCallback(
    (key: string) => {
      setOpen((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        try {
          localStorage.setItem(storageKey(section), JSON.stringify(next));
        } catch {
          /* 저장 실패는 무시한다 */
        }
        return next;
      });
    },
    [section]
  );

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function renderNodes(list: ContentTreeNode[], depth: number) {
    return list.map((node) => {
      const pad = 10 + depth * 13;

      if (node.type === "item") {
        const active = node.slug === activeSlug;
        return (
          <Link
            key={node.slug}
            href={`${basePath}/${node.slug}`}
            aria-current={active ? "page" : undefined}
            className="pl-tree-row block rounded-[3px] py-[5px] pr-2.5 font-sans text-[13px] leading-[1.45] transition-colors"
            style={{
              paddingLeft: pad + 17,
              background: active ? "var(--paper-3)" : undefined,
              color: active ? "var(--vermilion)" : "var(--ink-2)",
              fontWeight: active ? 600 : 400,
            }}
          >
            <span className="line-clamp-2">{node.title}</span>
          </Link>
        );
      }

      const expanded = open[node.key] ?? false;
      return (
        <div key={node.key}>
          <button
            type="button"
            onClick={() => toggle(node.key)}
            aria-expanded={expanded}
            className="pl-tree-row flex w-full items-center gap-1.5 rounded-[3px] py-[5px] pr-2.5 text-left font-sans text-[13px] font-medium leading-[1.45] text-ink transition-colors"
            style={{ paddingLeft: pad }}
          >
            <span
              aria-hidden
              className="inline-block w-3 shrink-0 font-mono text-[9px] text-ink-3 transition-transform"
              style={{ transform: expanded ? "rotate(90deg)" : "none" }}
            >
              ▶
            </span>
            {node.icon && <span aria-hidden>{node.icon}</span>}
            <span className="min-w-0 flex-1 truncate">{node.title}</span>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink-4">
              {node.count}
            </span>
          </button>
          {expanded && (
            <div className="relative">
              <span
                aria-hidden
                className="absolute inset-y-0 w-px bg-paper-edge"
                style={{ left: pad + 5 }}
              />
              {renderNodes(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  const panel = (
    <nav aria-label={labels.contents} className="px-3 py-6">
      <div className="px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {labels.contents}
      </div>
      <Link
        href={basePath}
        aria-current={isIndexActive ? "page" : undefined}
        className="pl-tree-row mt-2 block rounded-[3px] px-2.5 py-[6px] font-sans text-[13px] font-semibold transition-colors"
        style={{
          background: isIndexActive ? "var(--paper-3)" : undefined,
          color: isIndexActive ? "var(--vermilion)" : "var(--ink)",
        }}
      >
        {sectionLabel}
      </Link>
      <div className="mt-1.5">{renderNodes(nodes, 0)}</div>
    </nav>
  );

  return (
    <>
      <aside className="sticky top-[var(--header-h)] hidden h-[calc(100vh-var(--header-h))] w-[272px] shrink-0 overflow-y-auto border-r border-paper-edge lg:block">
        {panel}
      </aside>

      <div className="sticky top-[var(--header-h)] z-30 border-b border-paper-edge bg-paper px-[clamp(20px,5vw,64px)] py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2"
        >
          <span aria-hidden className="text-[13px] leading-none">
            ☰
          </span>
          {labels.contents}
        </button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[rgba(26,23,20,0.45)]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[320px] flex-col overflow-y-auto border-r border-paper-edge bg-paper">
            <div className="flex justify-end border-b border-paper-edge px-3 py-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={labels.close}
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-2"
              >
                <span aria-hidden className="font-mono text-sm leading-none">
                  ✕
                </span>
              </button>
            </div>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}
