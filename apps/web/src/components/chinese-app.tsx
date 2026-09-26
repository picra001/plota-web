"use client";
import Link from "./localized-link";
import { useEffect, useState } from "react";
import { bookWords, checkScope, choicesFor, conversationContext, conversationPrompt, decks, defaultScope, focusFor, gloss, readings, resolveBook, runVocabularyTool, scopeFromSearch, scopeQuery, shuffled, vocabularyToolSpecs, type Deck, type Scope, type ThemeBook, type Word } from "@/lib/chinese-vocabulary";

type Quiz = { words: Word[]; index: number; choices: string[]; answer: string | null; score: number; finished: boolean };
function newQuiz(words: Word[], deck: Deck): Quiz {
  const ordered = shuffled(words);
  return { words: ordered, index: 0, choices: choicesFor(ordered[0], deck), answer: null, score: 0, finished: false };
}
function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ChineseApp({ screen }: { screen: string }) {
  const [scope, setScope] = useState<Scope>(defaultScope);
  const [hydrated, setHydrated] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState("");
  const [mcp, setMcp] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [pinyin, setPinyin] = useState(true);
  const [example, setExample] = useState("");
  const [check, setCheck] = useState<ReturnType<typeof checkScope> | null>(null);
  useEffect(() => {
    const sync = () => setScope(scopeFromSearch(location.search)); sync(); setHydrated(true);
    addEventListener("popstate", sync); return () => removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController(); setDeck(null); setLoadError(false);
    const info = decks.find(d => d.id === scope.deckId)!;
    fetch(info.url, { signal: controller.signal }).then(r => { if (!r.ok) throw Error("deck"); return r.json(); }).then((d: Deck) => {
      if (d.id !== info.id || d.schemaVersion !== 1 || d.words.length !== d.wordCount || !d.themes?.length) throw Error("schema"); setDeck(d);
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [scope.deckId, hydrated]);
  useEffect(() => {
    if (screen !== "learn" || !deck) return;
    const b = scope.book ? resolveBook(deck, scope.book) : undefined;
    setQuiz(b ? newQuiz(bookWords(deck, b), deck) : null);
  }, [deck, scope.book, screen]);
  useEffect(() => {
    if (!deck) return;
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    setMcp(false); if (!context) return;
    const controller = new AbortController();
    try { Promise.all(vocabularyToolSpecs.map(spec => context.registerTool({ ...spec, annotations: { readOnlyHint: true }, execute: (input: unknown) => JSON.stringify(runVocabularyTool(spec.name, input, deck, scope, location.origin)) }, { signal: controller.signal }))).then(() => { if (!controller.signal.aborted) setMcp(true); }).catch(() => { controller.abort(); setMcp(false); }); } catch { controller.abort(); }
    return () => controller.abort();
  }, [deck, scope]);
  useEffect(() => () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); }, []);
  function selectBook(b?: ThemeBook) {
    const next = { ...defaultScope, deckId: scope.deckId, ...(b ? { book: b.id } : {}) };
    setScope(next); setPage(0); setCheck(null); setExample("");
    history.replaceState(null, "", `${location.pathname}?${scopeQuery(next)}`);
  }
  function speak(text: string) {
    if (!("speechSynthesis" in window)) { setNotice("이 브라우저는 음성 읽기를 지원하지 않습니다."); return; }
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "zh-CN"; u.rate = 0.8;
    u.onerror = () => setNotice("기기의 중국어 음성 설정을 확인해주세요."); speechSynthesis.speak(u);
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice("복사했습니다."); } catch { setNotice("자동 복사가 제한됩니다. 요청문을 선택해서 복사해주세요."); }
  }
  function choose(answer: string) { setQuiz(q => !q || q.answer !== null ? q : { ...q, answer, score: q.score + (answer === gloss(q.words[q.index]) ? 1 : 0) }); }
  function nextQuestion() {
    if (!deck) return;
    setQuiz(q => !q || q.answer === null ? q : q.index + 1 === q.words.length ? { ...q, finished: true } : { ...q, index: q.index + 1, choices: choicesFor(q.words[q.index + 1], deck), answer: null });
  }
  const book = deck && scope.book ? resolveBook(deck, scope.book) : undefined;
  const focus = deck ? focusFor(deck, scope) : [];
  const question = quiz?.words[quiz.index];
  const prompt = deck && hydrated ? conversationPrompt(deck, scope, location.origin) : "";
  const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const matches = (s: string) => normalize(s).includes(normalize(query.trim()));
  const filteredBooks = deck?.themes.filter(b => matches(`${b.number} ${b.name} ${b.description} ${bookWords(deck,b).map(w=>`${w.hanzi} ${gloss(w)}`).join(" ")}`)) ?? [];
  const dictionary = (book ? focus : deck?.words ?? []).filter(w => matches(`${w.hanzi} ${readings(w)} ${gloss(w)}`));
  const bookSelector = deck && <label className="vocab-search">단어장<select aria-label="회화 단어장" value={book?.id ?? ""} onChange={e => selectBook(resolveBook(deck,e.target.value))}><option value="">단어장 선택</option>{deck.themes.map(b => <option key={b.id} value={b.id}>{String(b.number).padStart(2,"0")}. {b.name} ({b.wordIds.length}개)</option>)}</select></label>;
  const wordsTable = (words: Word[]) => <div className="book-words">{words.map(w => <div key={w.id}><strong lang="zh-Hans">{w.hanzi}</strong><span>{readings(w)}</span><span>{gloss(w)}</span></div>)}</div>;

  return <div className={`learning-app vocabulary-app${screen === "learn" && quiz && !quiz.finished ? " quiz-active" : ""}`}>
    {notice && <p role="status" className="notice">{notice}</p>}
    {!screen && <><h1>중국어 학습</h1><div className="deck-feature"><h2>HSK 1–4급 단어장</h2><p>1,192개 단어를 생활 주제로 나눴습니다. 단어장별로 퀴즈를 풀거나 AI와 회화 연습을 할 수 있습니다.</p><Link className="button primary wide" href="/ko/chinese/learn">단어장 선택하고 퀴즈 시작</Link><Link className="text-link" href="/ko/chinese/conversation">단어장으로 AI 회화하기</Link></div><Link className="text-link" href="/ko/chinese/vocabulary">전체 단어 사전</Link><p className="small-note">점수는 이번 퀴즈에서만 표시하며 학습 이력은 저장하지 않습니다. 제공된 기존 HSK 자료 기준입니다.</p></>}
    {screen && !deck && <div className="empty-state" role="status"><h1>{screen === "conversation" ? "AI 회화" : "HSK 단어장"}</h1>{loadError ? <><p>단어장을 불러오지 못했습니다.</p><button className="button outline" onClick={() => location.reload()}>다시 불러오기</button></> : <p>단어장을 불러오는 중입니다.</p>}</div>}
    {deck && scope.book && !book && <p role="alert" className="notice">해당 단어장을 찾을 수 없습니다. <button onClick={() => selectBook()}>목록 보기</button></p>}
    {deck && screen === "learn" && (!quiz ? <>
      <h1>단어장 목록</h1><p className="muted">{deck.themes.length}개 테마 / {deck.wordCount.toLocaleString()}개 단어</p>
      <label className="vocab-search">단어장 찾기<input value={query} onChange={e => setQuery(e.target.value)} placeholder="단어장 이름, 번호 또는 단어" /></label>
      <div className="theme-book-list">{filteredBooks.map(b => <article className="theme-book" key={b.id}>
        <button className="theme-book-start" onClick={() => selectBook(b)} aria-label={`${b.number}번 ${b.name} 퀴즈 시작`}><span className="book-number">{String(b.number).padStart(2,"0")}</span><span><strong>{b.name}</strong><small>{b.description}</small></span><span className="book-size">{b.wordIds.length}문제</span></button>
        <p className="book-preview" lang="zh-Hans">{bookWords(deck,b).slice(0,8).map(w=>w.hanzi).join(" / ")}</p>
        <div className="book-secondary"><details><summary>포함 단어 {b.wordIds.length}개 보기</summary>{wordsTable(bookWords(deck,b))}</details><Link className="text-link" href={`/ko/chinese/conversation?${scopeQuery({...defaultScope,book:b.id})}`}>AI 회화</Link></div>
      </article>)}</div>{!filteredBooks.length && <p className="empty-state">검색 결과가 없습니다.</p>}
    </> : quiz.finished ? <div className="lesson-complete"><h1>퀴즈 결과</h1><p>{book?.number}번 {book?.name}</p><p className="quiz-score">{quiz.score}<span> / {quiz.words.length}</span></p><p>정답률 {Math.round(quiz.score / quiz.words.length * 100)}%</p><button className="button primary wide" onClick={() => setQuiz(newQuiz(quiz.words,deck))}>같은 단어장 다시 풀기</button><button className="button outline wide" onClick={() => selectBook()}>단어장 목록</button><Link className="text-link" href={`/ko/chinese/conversation?${scopeQuery(scope)}`}>이 단어장으로 AI 회화하기</Link></div> : question && <>
      <div className="quiz-mode-heading"><strong>{book?.number}번 {book?.name}</strong><button className="quiz-exit" aria-label="퀴즈 종료하고 단어장 목록으로" title="퀴즈 종료" onClick={() => selectBook()}>x</button></div><div className="quiz-progress-label">{quiz.index + 1} / {quiz.words.length}</div><progress aria-label="퀴즈 진행" value={quiz.index + (quiz.answer !== null ? 1 : 0)} max={quiz.words.length} /><h1 className="lesson-title">어떤 뜻일까요?</h1>
      <div className="quiz-card"><button className="sound-button" onClick={() => speak(question.hanzi)}>발음 듣기</button><div className="hanzi" lang="zh-Hans">{question.hanzi}</div>{pinyin && <p className="pinyin">{readings(question)}</p>}</div><label className="quiz-pinyin"><input type="checkbox" checked={pinyin} onChange={e=>setPinyin(e.target.checked)} />병음 보기</label>
      <div className="answer-options">{quiz.choices.map((o,i)=><button key={o} disabled={quiz.answer !== null} className={quiz.answer !== null && o === gloss(question) ? "correct" : quiz.answer === o ? "incorrect" : ""} onClick={()=>choose(o)}><span>{i+1}</span>{o}</button>)}</div><div className="answer-feedback" aria-live="polite">{quiz.answer !== null && <><strong>{quiz.answer === gloss(question) ? "정답입니다." : "정답을 확인해주세요."}</strong><p>{gloss(question)}</p></>}</div><button className="button primary wide" disabled={quiz.answer === null} onClick={nextQuestion}>{quiz.index + 1 === quiz.words.length ? "결과 보기" : "다음 단어"}</button>
    </>)}
    {deck && screen === "vocabulary" && <><h1>단어 사전</h1>{bookSelector}<label className="vocab-search">단어 검색<input value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="중국어, 병음 또는 한국어" /></label><p className="muted">{dictionary.length}개 단어</p>{dictionary.slice(page*20,(page+1)*20).map(w=><article className="vocab-word" key={w.id}><strong lang="zh-Hans">{w.hanzi}</strong><p className="pinyin">{readings(w)}</p><p>{gloss(w)}</p><button className="text-link" onClick={()=>speak(w.hanzi)}>발음 듣기</button><details><summary>원본 발음과 출처</summary>{w.senses.map((s,i)=><p key={i}>{s.pinyin} / {s.meaningKo}</p>)}{w.sources.map((s,i)=><small key={i}>{s.source} / PDF {s.page}쪽 / 항목 {s.number}<br /></small>)}</details></article>)}{!dictionary.length && <p>검색 결과가 없습니다.</p>}<div className="vocab-actions"><button disabled={!page} onClick={()=>setPage(page-1)}>이전</button><span>{page+1} / {Math.max(1,Math.ceil(dictionary.length/20))}</span><button disabled={(page+1)*20>=dictionary.length} onClick={()=>setPage(page+1)}>다음</button></div></>}
    {deck && screen === "conversation" && <><h1>AI 회화</h1><p className="muted">단어장 이름이나 번호로 AI에게 회화 연습을 요청하세요. 같은 단어로 상황과 문장 패턴을 바꾸며 대화할 수 있습니다.</p>{bookSelector}
      {book ? <><div className="scope-summary"><strong>{book.number}번 {book.name}</strong><p>{book.description} / {focus.length}개 단어</p></div><details><summary>회화에 사용할 단어 보기</summary>{wordsTable(focus)}</details><div className="mcp-status"><strong>{mcp ? "WebMCP 도구 준비됨" : "요청문으로 회화 시작"}</strong><p>예: “{book.number}번 {book.name} 단어장으로 대화하자. 질문과 문장 패턴을 다양하게 바꿔줘.”</p></div><div className="vocab-button-stack"><button className="button primary wide" onClick={()=>void copy(prompt)}>AI 회화 요청문 복사</button><button className="button outline wide" onClick={()=>void copy(conversationContext(deck,scope,location.origin).pageUrl)}>단어장 회화 링크 복사</button><button className="text-link" onClick={()=>download(conversationContext(deck,scope,location.origin),`${book.id}-conversation.json`)}>회화 단어장 JSON 내려받기</button></div><details className="conversation-prompt"><summary>AI에게 전달할 요청문 보기</summary><textarea aria-label="AI 회화 요청문" readOnly value={prompt} rows={12} /></details></> : <p className="scope-summary">{mcp ? "WebMCP에서 단어장 목록을 조회하고 이름이나 번호로 바로 선택할 수 있습니다." : "위 목록에서 회화에 사용할 단어장을 선택하세요."}</p>}
      <div className="scope-checker"><h2>예문 어휘 검사</h2><textarea aria-label="범위 검사할 중국어" placeholder="我喜欢学习中文。" value={example} maxLength={2000} onChange={e=>{setExample(e.target.value);setCheck(null);}} /><button className="button outline" disabled={!example.trim()} onClick={()=>setCheck(checkScope(example,deck))}>단어 범위 검사</button>{check && <p role="status">{check.withinVocabulary ? "HSK 통합 단어장 어휘로 분리할 수 있습니다." : `단어장에서 확인되지 않은 글자: ${check.unknownHanzi.join(" / ")}`}</p>}<p className="small-note">집중 어휘는 선택한 단어장, 보조 어휘는 전체 HSK 1–4급 자료를 사용합니다. 검사는 어휘 분리 기준이며 문법과 복합어 의미까지 보장하지 않습니다.</p></div><div className="connection-note"><h3>연결 방법</h3><p>WebMCP 지원 브라우저의 AI 에이전트는 이 페이지에서 단어장을 읽을 수 있습니다. 일반 ChatGPT에서는 요청문을 붙여넣고 필요한 경우 단어장 JSON을 첨부하세요. 이 정적 페이지는 원격 MCP 서버 주소가 아닙니다.</p></div>
    </>}
    {deck && screen === "review" && <><h1>단어장 다시 풀기</h1><p>누적 학습 이력은 저장하지 않습니다. 원하는 단어장을 골라 다시 풀어보세요.</p><Link className="button primary" href="/ko/chinese/learn">단어장 목록</Link></>}
    {deck && screen === "settings" && <><h1>학습 안내</h1><p>단어장을 누르면 해당 단어 전체로 퀴즈를 시작합니다. 문제 순서는 매번 달라집니다.</p><p>점수와 병음 표시 설정은 현재 화면에서만 사용합니다. 쿠키나 localStorage에 학습 이력을 저장하지 않습니다.</p><a className="text-link" href={decks.find(d=>d.id===deck.id)!.url} download>전체 단어장 JSON 내려받기</a></>}
  </div>;
}
