"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

export type WebMcpContentItem = {
  type: "devlog" | "novel";
  title: string;
  summary: string;
  url: string;
  date: string;
  tag?: string;
  episode?: string;
};

type FindContentInput = {
  query?: unknown;
  contentType?: unknown;
  limit?: unknown;
};

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: { readOnlyHint: true };
      execute: (input: unknown) => string;
    },
    options?: { signal?: AbortSignal }
  ) => void | Promise<void>;
};

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase();
}

function parseInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("input must be an object.");
  }

  const values = input as FindContentInput;
  if (typeof values.query !== "string" || !values.query.trim()) {
    throw new Error("query must be a non-empty string.");
  }

  const contentType = values.contentType ?? "all";
  if (!["all", "devlog", "novel"].includes(String(contentType))) {
    throw new Error("contentType must be all, devlog, or novel.");
  }

  const limit = values.limit ?? 5;
  if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > 10) {
    throw new Error("limit must be an integer between 1 and 10.");
  }

  const normalizedQuery = normalize(values.query.trim());
  return {
    originalQuery: values.query.trim(),
    query: normalizedQuery,
    terms: normalizedQuery.split(/\s+/).filter(Boolean),
    contentType: contentType as "all" | WebMcpContentItem["type"],
    limit: Number(limit),
  };
}

export function WebMcpContentTools({
  locale,
  items,
}: {
  locale: Locale;
  items: WebMcpContentItem[];
}) {
  useEffect(() => {
    const modelContext = (
      document as Document & { modelContext?: ModelContext }
    ).modelContext;
    if (!modelContext) return;

    const controller = new AbortController();

    const registration = modelContext.registerTool(
      {
        name: "find_content",
        description:
          "Find published PLOTA devlog posts or visual novels in the current page language. Use this when the user wants content about a topic.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Topic or phrase to find in titles, summaries, and tags.",
            },
            contentType: {
              type: "string",
              enum: ["all", "devlog", "novel"],
              description: "Optional content type filter. Defaults to all.",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 10,
              description: "Maximum number of results. Defaults to 5.",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: (input) => {
          const { originalQuery, query, terms, contentType, limit } =
            parseInput(input);
          const results = items
            .filter((item) => contentType === "all" || item.type === contentType)
            .map((item) => {
              const title = normalize(item.title);
              const summary = normalize(item.summary);
              const tag = normalize(item.tag ?? "");
              const score =
                (title.includes(query) ? 4 : 0) +
                terms.reduce(
                  (total, term) =>
                    total +
                    (title.includes(term) ? 3 : 0) +
                    (summary.includes(term) ? 2 : 0) +
                    (tag.includes(term) ? 1 : 0),
                  0
                );
              return { item, score };
            })
            .filter(({ score }) => score > 0)
            .sort(
              (a, b) =>
                b.score - a.score ||
                Date.parse(b.item.date) - Date.parse(a.item.date)
            )
            .slice(0, limit)
            .map(({ item }) => item);

          return JSON.stringify({
            locale,
            query: originalQuery,
            count: results.length,
            results,
          });
        },
      },
      { signal: controller.signal }
    );

    void Promise.resolve(registration).catch((error: unknown) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("WebMCP tool registration failed.", error);
      }
    });

    return () => controller.abort();
  }, [items, locale]);

  return null;
}
