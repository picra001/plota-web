import { phrases } from "./mock-data";

/** Only public lesson content is available to agents; never browser progress. */
export function findChinesePhrases(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => key !== "query")) {
    return { error: "query만 포함한 객체를 입력하세요.", retryable: true as const };
  }
  const query = (input as { query?: unknown }).query;
  if (typeof query !== "string" || !query.trim() || query.length > 100) {
    return { error: "1~100자의 검색어를 입력하세요.", retryable: true as const };
  }
  const normalize = (text: string) => text.normalize("NFKC").toLowerCase();
  const search = normalize(query.trim());
  return { results: phrases.filter(phrase => normalize(`${phrase.chinese} ${phrase.pinyin} ${phrase.meaning} ${phrase.translation}`).includes(search)).map(({ choices: _choices, ...phrase }) => ({ ...phrase, path: "/ko/chinese/learn" })) };
}
