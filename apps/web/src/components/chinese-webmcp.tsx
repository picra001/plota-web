"use client";
import { useEffect, useRef, useState } from "react";
import { bookWords, runVocabularyTool, vocabularyToolSpecs, type Deck, type Scope } from "@/lib/chinese-vocabulary";

type Tool = { name: string; origin?: string };
type Context = {
  registerTool(tool: unknown, options: { signal: AbortSignal }): void | Promise<void>;
  getTools?: () => Promise<Tool[]>;
  executeTool?: (tool: Tool, input: unknown, options: { signal: AbortSignal }) => Promise<string | null>;
};
const contextForPage = () => (document as Document & { modelContext?: Context }).modelContext;
const errorText = (e: unknown) => e instanceof Error ? `${e.name}: ${e.message}` : String(e);

export function useChineseWebMcp(deck: Deck | null, scope: Scope) {
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const diagnosticRun = useRef<AbortController | null>(null);
  const [status, setStatus] = useState("단어장 로딩 중");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [lastCall, setLastCall] = useState("");
  const [report, setReport] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!deck) return;
    const controller = new AbortController();
    setReady(false); setError(""); setReport([]); setLastCall("");
    const context = contextForPage();
    if (!context || typeof context.registerTool !== "function") {
      setStatus("WebMCP API 사용 불가");
      setError("이 페이지에서 document.modelContext.registerTool을 사용할 수 없습니다. 브라우저 버전, 실험 기능 또는 오리진 트라이얼 활성화를 확인하세요.");
      return;
    }
    setStatus("WebMCP 도구 등록 중");
    void (async () => {
      try {
        for (const spec of vocabularyToolSpecs) {
          if (controller.signal.aborted) return;
          await context.registerTool({ ...spec, annotations: { readOnlyHint: true }, execute: (input: unknown) => {
            const result = runVocabularyTool(spec.name, input, deck, currentScope.current, location.origin);
            if (!diagnosticRun.current && !controller.signal.aborted) setLastCall(`${spec.name} / ${new Date().toLocaleTimeString("ko-KR")} / ${JSON.stringify(result).includes('"error":') ? "입력 오류" : "응답 반환"}`);
            return JSON.stringify(result);
          } }, { signal: controller.signal });
        }
        if (!controller.signal.aborted) { setReady(true); setStatus("WebMCP 도구 4개 등록됨"); }
      } catch (e) {
        if (controller.signal.aborted) return;
        controller.abort(); setStatus("WebMCP 등록 실패"); setError(errorText(e));
      }
    })();
    return () => { controller.abort(); diagnosticRun.current?.abort(); diagnosticRun.current = null; };
  }, [deck]);

  async function diagnose() {
    if (!deck || !ready || diagnosticRun.current) return;
    const controller = new AbortController(); diagnosticRun.current = controller;
    setRunning(true); setReport([]);
    const lines: string[] = [];
    const add = (line: string) => { lines.push(line); setReport([...lines]); };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const context = contextForPage();
      if (!context?.getTools || !context.executeTool) throw Error("등록 API는 있지만 getTools/executeTool이 없습니다. 이 브라우저는 페이지 자체 진단 API를 지원하지 않습니다. 등록 실패와는 별개입니다.");
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error("진단이 15초 내 완료되지 않았습니다.")); }, 15000); });
      await Promise.race([timeout, (async () => {
        const tools = (await context.getTools!()).filter(t => !t.origin || t.origin === location.origin);
        let legacyArguments = false;
        const call = async (name: string, input: unknown) => {
          if (controller.signal.aborted) throw Error("진단 취소됨");
          const tool = tools.find(t => t.name === name);
          if (!tool) throw Error(`도구 조회 실패: ${name}`);
          let raw: string | null;
          try {
            raw = await context.executeTool!(tool, legacyArguments ? JSON.stringify(input) : input, { signal: controller.signal });
          } catch (e) {
            // Older Chrome accepts a JSON string; retry only its argument parsing
            // failure, and only these known read-only diagnostic calls.
            if (legacyArguments || !errorText(e).includes("Failed to parse input arguments") || controller.signal.aborted) throw e;
            legacyArguments = true;
            add("이전 Chrome 실행 API 감지: JSON 문자열 인수로 진단합니다.");
            raw = await context.executeTool!(tool, JSON.stringify(input), { signal: controller.signal });
          }
          if (controller.signal.aborted) throw Error("진단 취소됨");
          if (typeof raw !== "string") throw Error(`${name}: JSON 문자열 응답이 없습니다.`);
          const result = JSON.parse(raw);
          if (result.error) throw Error(`${name}: ${JSON.stringify(result.error)}`);
          return result;
        };
        for (const spec of vocabularyToolSpecs) if (!tools.some(t => t.name === spec.name)) throw Error(`등록 도구 누락: ${spec.name}`);
        add(`조회 성공: ${vocabularyToolSpecs.map(t => t.name).join(", ")}`);
        const catalog = await call("list_vocabulary_decks", {});
        if (catalog.decks?.length !== deck.themes.length) throw Error("단어장 목록 개수 불일치");
        add(`목록 호출 성공: ${catalog.decks.length}개 단어장`);
        const first = deck.themes.find(b => b.number === 1)!;
        const numbered = await call("get_learning_scope", { book: 1 });
        const named = await call("get_learning_scope", { book: first.name });
        const expected = bookWords(deck, first).map(w => w.id);
        if (numbered.book?.number !== 1 || JSON.stringify(numbered.focusWords?.map((w: {id: string}) => w.id)) !== JSON.stringify(expected) || JSON.stringify(named.focusWords) !== JSON.stringify(numbered.focusWords)) throw Error("1번 단어장의 번호/이름/전체 단어 응답 불일치");
        add(`번호·이름 호출 성공: 1번 ${first.name}, ${expected.length}개 단어 일치`);
        const search = await call("search_vocabulary", { book: 1, query: "爸爸" });
        if (!search.words?.some((w: {hanzi: string}) => w.hanzi === "爸爸")) throw Error("단어 검색 결과 불일치");
        const check = await call("check_chinese_scope", { book: 1, text: "我爱爸爸。" });
        if (check.withinVocabulary !== true) throw Error("예문 검사 결과 불일치");
        add("검색·예문 검사 호출 성공");
        add("페이지 자체 진단 통과. 외부 AI 연결 성공을 뜻하지는 않습니다.");
      })()]);
    } catch (e) { add(`진단 미완료: ${errorText(e)}`); }
    finally { clearTimeout(timer); controller.abort(); diagnosticRun.current = null; setRunning(false); }
  }

  return { ready, panel: <details className="webmcp-diagnostics"><summary>WebMCP 연결 진단</summary><p role="status">{status}</p>{error && <p role="alert">{error}</p>}<p>페이지 자체 진단은 브라우저의 getTools와 executeTool을 사용합니다. 화면 분석이나 단어장 함수 직접 호출로 대체하지 않습니다.</p><button className="button outline" disabled={!ready || running} onClick={() => void diagnose()}>{running ? "진단 중" : "WebMCP 자체 진단 실행"}</button><ul aria-live="polite">{report.map((line,i) => <li key={i}>{line}</li>)}</ul><p>자체 진단 외 최근 도구 호출: {lastCall || "아직 없음"}</p><p className="small-note">호출자의 AI 여부는 식별할 수 없습니다. 호출 기록은 현재 페이지 메모리에만 표시됩니다.</p></details> };
}
