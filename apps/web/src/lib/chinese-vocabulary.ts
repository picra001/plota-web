export type Word = { id: string; hanzi: string; aliases: string[]; levels: number[]; senses: { pinyin: string; meaningKo: string; level: number }[]; sources: { source: string; page: number; number: number; level?: number }[] };
export type Deck = { schemaVersion: number; id: string; title: string; description: string; version: string; wordCount: number; words: Word[] };
// A new deck needs only a JSON file with this schema and a catalogue entry.
export const decks = [{ id: "hsk-1-4", title: "HSK 1–4급 통합 단어장", count: 1192, url: "/data/chinese/hsk-1-4.json", subtitle: "세 PDF · 1,200개 항목 · 중복 표제어 통합" }];
export type Scope = { deckId: string; level: number; offset: number; count: number };
export const defaultScope: Scope = { deckId: "hsk-1-4", level: 0, offset: 0, count: 10 };
export function scopeFromSearch(search: string): Scope {
  const p = new URLSearchParams(search);
  const integer = (key: string, fallback: number, min: number, max: number) => { const s = p.get(key); const n = s === null ? fallback : Number(s); return Number.isInteger(n) && n >= min && n <= max ? n : fallback; };
  return { deckId: decks.some(d => d.id === p.get("deck")) ? p.get("deck")! : defaultScope.deckId, level: integer("level", 0, 0, 4), offset: integer("offset", 0, 0, 10000), count: integer("count", 10, 1, 20) };
}
export function scopeQuery(s: Scope) { return new URLSearchParams({ deck: s.deckId, level: String(s.level), offset: String(s.offset), count: String(s.count) }).toString(); }
export function poolFor(deck: Deck, scope: Scope) { return deck.words.filter(w => scope.level === 0 || w.levels.includes(scope.level)); }
export function focusFor(deck: Deck, scope: Scope) { const pool = poolFor(deck, scope); return pool.slice(Math.min(scope.offset, Math.max(0, pool.length - 1)), Math.min(scope.offset, Math.max(0, pool.length - 1)) + scope.count); }
export function gloss(word: Word) { return [...new Set(word.senses.map(s => s.meaningKo.replace(/\[[^\]]+\]\s*/g, "").replace(/^(명|동|형|부|수|양|대|개|접|조|감|의)\s+/, "")))].join(" / "); }
export function readings(word: Word) { return [...new Set(word.senses.map(s => s.pinyin))].join(" · "); }
export function shuffled<T>(items: T[], random: () => number = Math.random) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function choicesFor(word: Word, deck: Deck) {
  const answer = gloss(word);
  const distractors = [...new Set(shuffled(deck.words.filter(w => w.id !== word.id)).map(gloss))].filter(g => g !== answer && !g.includes(answer) && !answer.includes(g));
  return shuffled([answer, ...distractors.slice(0, 3)]);
}
export function conversationContext(deck: Deck, scope: Scope, origin: string) {
  const focus = focusFor(deck, scope);
  return { schemaVersion: 1, deckId: deck.id, deckVersion: deck.version, scope,
    pageUrl: `${origin}/ko/chinese/conversation?${scopeQuery(scope)}`, vocabularyUrl: `${origin}${decks.find(d => d.id === deck.id)!.url}`,
    focusWords: focus.map(w => ({ id: w.id, hanzi: w.hanzi, pinyin: readings(w), meaningKo: gloss(w) })),
    supportVocabulary: { rule: "Only words in this deck at levels 1 through 4 may support the focus words. Do not introduce vocabulary outside this deck without explicit learner permission.", wordCount: deck.words.length },
    teachingRules: ["Teach a Korean-speaking learner. Explain in Korean.", "Start a short everyday role-play using the focus words; ask one question per turn and wait.", "Chinese examples must use only deck vocabulary. Focus on the selected words; use easier deck words as support.", "Give pinyin and Korean meaning when correcting. Avoid advanced, specialist or unrelated vocabulary.", "Check every Chinese example with check_chinese_scope when tools are available. Unknown spans must be rewritten or explicitly approved by the learner.", "Vocabulary membership is a lexical aid, not a guarantee of grammar, meaning or teaching difficulty. Never claim an example was checked unless it was."] };
}
export function conversationPrompt(deck: Deck, scope: Scope, origin: string) {
  const c = conversationContext(deck, scope, origin);
  return `한국어 사용자를 위한 중국어 회화 선생님이 되어주세요.\n단어장: ${deck.title}\n자료: ${c.vocabularyUrl}\n선택 범위: ${c.pageUrl}\n\n오늘 집중할 단어:\n${c.focusWords.map(w => `${w.hanzi} (${w.pinyin}): ${w.meaningKo}`).join("\n")}\n\n짧은 일상 역할극으로 한 번에 한 질문만 해주세요. 설명·교정은 한국어, 중국어에는 병음을 달아주세요. 위 단어에 집중하고 보조 어휘는 이 JSON의 HSK 1–4급 단어만 사용하세요. 고급·전문 어휘를 임의로 추가하지 마세요. WebMCP 도구가 있다면 get_learning_scope를 읽고 check_chinese_scope로 예문을 확인하세요. 링크를 읽을 수 없다면 단어장 JSON 첨부를 요청하고, 읽거나 검증한 것처럼 말하지 마세요. 검사는 어휘 범위만 확인하며 문법·문맥 판단은 별도로 해주세요.`;
}
/** Dynamic programming avoids a greedy split rejecting otherwise valid segmentation. */
export function checkScope(text: string, deck: Deck) {
  const lexicon = new Set(deck.words.flatMap(w => [w.hanzi, ...w.aliases].flatMap(h => h.match(/[\p{Script=Han}]+/gu) ?? [])));
  const max = Math.max(...[...lexicon].map(w => w.length));
  const unknown: string[] = [];
  for (const run of text.match(/[\p{Script=Han}]+/gu) ?? []) {
    const cost = new Array<number>(run.length + 1).fill(Infinity); const previous: { start: number; known: boolean }[] = []; cost[0] = 0;
    for (let i = 0; i < run.length; i++) {
      if (cost[i] + 1 < cost[i + 1]) { cost[i + 1] = cost[i] + 1; previous[i + 1] = { start: i, known: false }; }
      for (let j = i + 1; j <= Math.min(run.length, i + max); j++) if (lexicon.has(run.slice(i, j)) && cost[i] < cost[j]) { cost[j] = cost[i]; previous[j] = { start: i, known: true }; }
    }
    let end = run.length; const missing: string[] = [];
    while (end > 0) { const step = previous[end]; if (!step.known) missing.unshift(run.slice(step.start, end)); end = step.start; }
    if (missing.length) unknown.push(missing.join(""));
  }
  return { withinVocabulary: unknown.length === 0, unknownHanzi: [...new Set(unknown)], checkedText: text, limitation: "Lexical segmentation only. Compound meanings, grammar and non-Hanzi text are not evaluated; proper names and inflections may need review." };
}
export function runVocabularyTool(name: string, input: unknown, deck: Deck, scope: Scope, origin: string): unknown {
  const error = (message: string) => ({ error: { code: "INVALID_ARGUMENT", message, retryable: true } });
  if (!input || typeof input !== "object" || Array.isArray(input)) return error("Expected an object.");
  const a = input as Record<string, unknown>;
  const allowed = name === "search_vocabulary" ? ["query", "offset", "limit"] : name === "check_chinese_scope" ? ["text"] : [];
  if (Object.keys(a).some(k => !allowed.includes(k))) return error("Unexpected argument.");
  if (name === "list_vocabulary_decks") return { decks: decks.map(d => ({ ...d, url: `${origin}${d.url}` })) };
  if (name === "get_learning_scope") return conversationContext(deck, scope, origin);
  if (name === "search_vocabulary") {
    if (a.query !== undefined && (typeof a.query !== "string" || a.query.length > 100)) return error("query must be at most 100 characters.");
    const offset = a.offset ?? 0, limit = a.limit ?? 20;
    if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0 || typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 50) return error("offset must be nonnegative; limit must be 1–50.");
    const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const q = normalize(String(a.query ?? "").trim());
    const words = deck.words.filter(w => normalize(`${w.hanzi} ${w.aliases.join(" ")} ${readings(w)} ${gloss(w)}`).includes(q));
    return { deckId: deck.id, total: words.length, offset, words: words.slice(offset, offset + limit), nextOffset: offset + limit < words.length ? offset + limit : null };
  }
  if (name === "check_chinese_scope") { if (typeof a.text !== "string" || !a.text.trim() || a.text.length > 2000) return error("text must contain 1–2000 characters."); return checkScope(a.text, deck); }
  return error("Unknown tool.");
}
export const vocabularyToolSpecs = [
  { name: "list_vocabulary_decks", description: "List public Chinese vocabulary decks and their static JSON URLs.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "get_learning_scope", description: "Read the explicitly selected vocabulary range and Korean conversation teaching rules. Read before tutoring; no private progress is exposed.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "search_vocabulary", description: "Search the active public vocabulary deck by Hanzi, Korean or pinyin; empty query lists paginated words. Use only this deck to support the focus words.", inputSchema: { type: "object", properties: { query: { type: "string", maxLength: 100 }, offset: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 50 } }, additionalProperties: false } },
  { name: "check_chinese_scope", description: "Check a proposed Chinese example against the active deck vocabulary. Rewrite unknown Hanzi; lexical coverage does not certify grammar or compound meaning.", inputSchema: { type: "object", properties: { text: { type: "string", minLength: 1, maxLength: 2000 } }, required: ["text"], additionalProperties: false } },
];
