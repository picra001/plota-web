# Chinese theme books and WebMCP

The site is static. All words and theme memberships live in `/data/chinese/hsk-1-4.json` (schemaVersion 1). The `themes` array contains 19 editorial books, each with a stable `id`, `number`, Korean `name`, `description` and ordered `wordIds`. All 1,192 headwords occur in exactly one theme. Words retain their multiple readings, Korean meanings, HSK levels and PDF sources. These are supplied legacy HSK 1–4 lists, not a claim about newer official HSK specifications.

## Start conversation by name or number

1. `list_vocabulary_decks({})` lists the 19 books with numbers, names, counts, previews and links.
2. `get_learning_scope({book: 3})` or `get_learning_scope({book: "음식과 식사"})` returns every focus word in the food book and teaching rules. The stable ID `hsk-theme-03` also works.
3. Conduct flexible conversation, changing situations and sentence patterns (questions, negation, tense, comparisons, conditions) instead of reading a fixed script. Ask one short question and wait for the learner. Explain and correct in Korean, with pinyin when useful.
4. Concentrate on book words. Supporting vocabulary may come from the complete HSK 1–4 dataset; avoid unrelated advanced vocabulary. Use `check_chinese_scope({book: 3, text: "我喜欢吃包子。"})` before presenting Chinese examples. Rewrite unknown vocabulary or ask the learner before expanding the range.

A request for a book is read-only: it does not change the browser page, save results, or remember a hidden selection. Pass `book` again on subsequent calls if different from the visible page selection.

## Tool contract

All tools return JSON strings. Invalid arguments return `error: {code, message, retryable}`. Unknown book names/numbers return BOOK_NOT_FOUND; list valid books instead of silently choosing another one.

| Tool | Arguments | Result |
|---|---|---|
| list_vocabulary_decks | `{}` | All theme books |
| get_learning_scope | `{book?: string or integer}` | Chosen book, focus words, teaching rules and public URLs; omit book to use the page selection |
| search_vocabulary | `{book?: string or integer, query?: string, offset?: integer, limit?: integer}` | Search the supplied book, or the whole dataset when book is omitted. Query max 100; limit 1–50. |
| check_chinese_scope | `{book?: string or integer, text: string}` | HSK dataset lexical coverage, unknown Hanzi, and simple focus-word matches. Text 1–2000 characters. |

The lexical checker is based on dynamic-programming segmentation and does not guarantee grammar, compound meaning or difficulty. Focus-word matches are string matches, not semantic comprehension.

## URLs and browser lifecycle

`/ko/chinese/learn` shows the book list. Selecting a row starts a quiz over every word in that book, shuffled once per attempt. `/ko/chinese/learn?book=3` starts that book directly. `/ko/chinese/conversation?deck=hsk-1-4&book=hsk-theme-03` shares the full focus book. Names and numbers are also accepted in the book query. Legacy level/offset/count scope URLs are still readable by tools for compatibility; new UI uses books.

Tools register with `document.modelContext.registerTool` and unregister through AbortSignal on unmount or selection change. Agents should refresh tool handles when registration changes. No quiz scores, saved words or personal history are exposed. The new UI neither reads nor writes the old localStorage progress keys. Scores live only in the current quiz and are lost on reload.

## Client compatibility

A compatible browser agent can invoke JavaScript tools without a backend. An ordinary ChatGPT remote MCP connection expects an MCP server endpoint, not this page URL. Fallback: copy the conversation request and attach the book JSON or complete dataset. Do not pretend to read an inaccessible URL or to have run a check.

- https://developer.chrome.com/docs/ai/webmcp/imperative-api
- https://developers.openai.com/plugins/deploy/connect-chatgpt
