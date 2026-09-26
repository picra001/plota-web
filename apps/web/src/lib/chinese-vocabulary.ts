export type Word = { id: string; hanzi: string; aliases: string[]; levels: number[]; senses: { pinyin: string; meaningKo: string; level: number }[]; sources: { source: string; page: number; number: number; level?: number }[] };
export type ThemeBook = { id: string; number: number; name: string; description: string; wordIds: string[] };
export type Deck = { themes: ThemeBook[]; schemaVersion: number; id: string; title: string; description: string; version: string; wordCount: number; words: Word[] };
// A new deck needs only a JSON file with this schema and a catalogue entry.
export const decks = [{ id: "hsk-1-4", title: "HSK 1–4급 통합 단어장", count: 1192, url: "/data/chinese/hsk-1-4.json", subtitle: "세 PDF · 1,200개 항목 · 중복 표제어 통합" }];
export type Scope = { deckId: string; level: number; offset: number; count: number; book?: string };
export const defaultScope: Scope = { deckId: "hsk-1-4", level: 0, offset: 0, count: 10 };
export function scopeFromSearch(search: string): Scope {
  const p = new URLSearchParams(search);
  const integer = (key: string, fallback: number, min: number, max: number) => { const s = p.get(key); const n = s === null ? fallback : Number(s); return Number.isInteger(n) && n >= min && n <= max ? n : fallback; };
  return { deckId: decks.some(d => d.id === p.get("deck")) ? p.get("deck")! : defaultScope.deckId, level: integer("level", 0, 0, 4), offset: integer("offset", 0, 0, 10000), count: integer("count", 10, 1, 20), ...(p.get("book") ? { book: p.get("book")!.slice(0,100) } : {}) };
}
export function scopeQuery(s: Scope) { return new URLSearchParams(s.book ? { deck: s.deckId, book: s.book } : { deck: s.deckId, level: String(s.level), offset: String(s.offset), count: String(s.count) }).toString(); }
export function resolveBook(deck: Deck, ref: unknown) { return deck.themes.find(b => b.id === ref || b.name === ref || String(b.number) === String(ref) || String(b.number).padStart(2, "0") === ref); }
export function bookWords(deck: Deck, book: ThemeBook) { const byId = new Map(deck.words.map(w => [w.id, w])); return book.wordIds.map(id => byId.get(id)!).filter(Boolean); }
export function poolFor(deck: Deck, scope: Scope) { if (scope.book) { const book = resolveBook(deck, scope.book); return book ? bookWords(deck, book) : []; } return deck.words.filter(w => scope.level === 0 || w.levels.includes(scope.level)); }
export function focusFor(deck: Deck, scope: Scope) { const pool = poolFor(deck, scope); if (scope.book) return pool; return pool.slice(Math.min(scope.offset, Math.max(0, pool.length - 1)), Math.min(scope.offset, Math.max(0, pool.length - 1)) + scope.count); }
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
  const book = scope.book ? resolveBook(deck, scope.book) : undefined;
  return { schemaVersion: 2, book: book ? { id: book.id, number: book.number, name: book.name, description: book.description, wordCount: focus.length } : null, deckId: deck.id, deckVersion: deck.version, scope,
    pageUrl: `${origin}/ko/chinese/conversation?${scopeQuery(scope)}`, vocabularyUrl: `${origin}${decks.find(d => d.id === deck.id)!.url}`,
    focusWords: focus.map(w => ({ id: w.id, hanzi: w.hanzi, pinyin: readings(w), meaningKo: gloss(w) })),
    supportVocabulary: { rule: "Only words in this deck at levels 1 through 4 may support the focus words. Do not introduce vocabulary outside this deck without explicit learner permission.", wordCount: deck.words.length },
    teachingRules: ["Teach a Korean-speaking learner. Explain in Korean.", "Use the named thematic book as the focus. Freely vary everyday situations, sentence patterns, tense, questions, negation, comparison and conditional forms. Do not follow a fixed script. Ask one short question per turn and wait.", "Chinese examples must use only deck vocabulary. Focus on the selected words; use easier deck words as support.", "Give pinyin and Korean meaning when correcting. Avoid advanced, specialist or unrelated vocabulary.", "Check every Chinese example with check_chinese_scope when tools are available. Unknown spans must be rewritten or explicitly approved by the learner.", "Vocabulary membership is a lexical aid, not a guarantee of grammar, meaning or teaching difficulty. Never claim an example was checked unless it was."] };
}
export function conversationPrompt(deck: Deck, scope: Scope, origin: string) {
  const c = conversationContext(deck, scope, origin);
  return `한국어 사용자를 위한 중국어 회화 선생님이 되어주세요.\n단어장: ${c.book ? `${c.book.number}번 ${c.book.name}` : deck.title}\n자료: ${c.vocabularyUrl}\n선택 범위: ${c.pageUrl}\n\n오늘 집중할 단어:\n${c.focusWords.map(w => `${w.hanzi} (${w.pinyin}): ${w.meaningKo}`).join("\n")}\n\n정해진 대본 없이 상황과 문장 패턴을 자유롭게 바꾸며 회화해 주세요. 의문문, 부정문, 시제, 비교, 조건문을 번갈아 연습하되 한 번에 한 질문만 해주세요. 설명·교정은 한국어, 중국어에는 병음을 달아주세요. 위 단어에 집중하고 보조 어휘는 이 JSON의 HSK 1–4급 단어만 사용하세요. 고급·전문 어휘를 임의로 추가하지 마세요. WebMCP 도구가 있다면 get_learning_scope에 단어장 이름이나 번호를 book으로 전달하고 check_chinese_scope로 예문을 확인하세요. 링크를 읽을 수 없다면 단어장 JSON 첨부를 요청하고, 읽거나 검증한 것처럼 말하지 마세요. 검사는 어휘 범위만 확인하며 문법·문맥 판단은 별도로 해주세요.`;
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
  const allowed = name === "search_vocabulary" ? ["query", "offset", "limit", "book"] : name === "check_chinese_scope" ? ["text", "book"] : name === "get_learning_scope" ? ["book"] : [];
  if (Object.keys(a).some(k => !allowed.includes(k))) return error("Unexpected argument.");
  if (a.book !== undefined && !((typeof a.book === "string" && a.book.length > 0 && a.book.length <= 100) || (typeof a.book === "number" && Number.isInteger(a.book)))) return error("book must be a name, ID or integer number.");
  const ref = a.book ?? scope.book;
  const book = ref !== undefined ? resolveBook(deck, ref) : undefined;
  if (name !== "list_vocabulary_decks" && ref !== undefined && !book) return { error: { code: "BOOK_NOT_FOUND", message: "Unknown book. Call list_vocabulary_decks for valid names and numbers.", retryable: true } };
  const selectedScope = book ? { ...scope, book: book.id } : scope;
  if (name === "list_vocabulary_decks") return { datasetId: deck.id, decks: deck.themes.map(b => ({ id: b.id, number: b.number, name: b.name, description: b.description, wordCount: b.wordIds.length, preview: bookWords(deck,b).slice(0,6).map(w=>w.hanzi), url: `${origin}${decks.find(d=>d.id===deck.id)!.url}`, conversationUrl: `${origin}/ko/chinese/conversation?${scopeQuery({...scope,book:b.id})}` })) };
  if (name === "get_learning_scope") return conversationContext(deck, selectedScope, origin);
  if (name === "search_vocabulary") {
    if (a.query !== undefined && (typeof a.query !== "string" || a.query.length > 100)) return error("query must be at most 100 characters.");
    const offset = a.offset ?? 0, limit = a.limit ?? 20;
    if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0 || typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 50) return error("offset must be nonnegative; limit must be 1–50.");
    const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const q = normalize(String(a.query ?? "").trim());
    const words = (a.book !== undefined && book ? bookWords(deck,book) : deck.words).filter(w => normalize(`${w.hanzi} ${w.aliases.join(" ")} ${readings(w)} ${gloss(w)}`).includes(q));
    return { deckId: deck.id, total: words.length, offset, words: words.slice(offset, offset + limit), nextOffset: offset + limit < words.length ? offset + limit : null };
  }
  if (name === "check_chinese_scope") { if (typeof a.text !== "string" || !a.text.trim() || a.text.length > 2000) return error("text must contain 1–2000 characters."); return { ...checkScope(a.text, deck), book: book ? { number: book.number, name: book.name } : null, focusWordsUsed: book ? bookWords(deck, book).filter(w => a.text!.toString().includes(w.hanzi)).map(w=>w.hanzi) : [] }; }
  return error("Unknown tool.");
}
const bookSchema = { oneOf: [{ type: "string", minLength: 1, maxLength: 100 }, { type: "integer", minimum: 1 }], description: "Theme book name (e.g. 음식과 식사), stable ID, or number returned by list_vocabulary_decks. Omit to use the page selection." };
export const vocabularyToolSpecs = [
  { name: "list_vocabulary_decks", description: "List all themed Chinese word books with stable numbers, Korean names, word counts, previews and conversation URLs. Use a name or number with get_learning_scope to start free-pattern conversation practice.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "get_learning_scope", description: "Read all words and flexible conversation rules for a book by name, number or ID, or the current page selection. Read-only; this does not change the page or expose scores.", inputSchema: { type: "object", properties: { book: bookSchema }, additionalProperties: false } },
  { name: "search_vocabulary", description: "Search the active public vocabulary deck by Hanzi, Korean or pinyin; empty query lists paginated words. Use only this deck to support the focus words.", inputSchema: { type: "object", properties: { book: { ...bookSchema, description: "Optional book name, number or ID to restrict search. Omit to search the entire HSK dataset for supporting vocabulary." }, query: { type: "string", maxLength: 100 }, offset: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 50 } }, additionalProperties: false } },
  { name: "check_chinese_scope", description: "Check a proposed Chinese example against the active deck vocabulary. Rewrite unknown Hanzi; lexical coverage does not certify grammar or compound meaning.", inputSchema: { type: "object", properties: { book: bookSchema, text: { type: "string", minLength: 1, maxLength: 2000 } }, required: ["text"], additionalProperties: false } },
];
