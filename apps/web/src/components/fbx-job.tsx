"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import Link, { useUiLang } from "./localized-link";
import type { UiLang } from "@/lib/i18n";
import {
  clipFiles, elapsed, fileLabel, getJob, inputImageUrl, jobToken, kindLabel, patchJob, stepLabel, KIND_DEFAULTS,
  FbxApiError, type Job,
} from "@/lib/fbx-api";
import { glbStats, type GlbStats } from "@/lib/glb-stats";

const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 8000;
const FAST_WINDOW_MS = 2 * 60 * 1000;

const COPY = {
  ko: {
    alt: (n: string) => `${n} 3D 모델`, character: "캐릭터", drawingAlt: "이 캐릭터의 원본 그림", sentAlt: "보낸 그림",
    download: (l: string) => `${l} 받기`, clip: (c: string) => `${c} 클립 받기`, alsoMain: " / 메인 FBX에도 들어 있음",
    title: "제목", titlePh: "캐릭터 이름", saving: "저장 중…", save: "제목 저장", saveFail: "제목을 저장하지 못했습니다.",
    titleNote: "제목은 이 그림을 보낸 브라우저에서만 바꿀 수 있습니다.",
    notFound: "결과가 없거나 내려진 결과입니다.", loadFail: "페이지를 불러오지 못했습니다.", loading: "불러오는 중…",
    nothing: "보여줄 결과가 없습니다", noJob: "결과가 선택되지 않았습니다", openLink: "받은 링크를 열거나 새 그림을 보내 주세요.", send: "그림 보내기",
    again: "전에 보낸 그림이라 이미 만들어진 결과를 보여 드립니다.",
    status: { done: "완료", failed: "중단됨", running: "진행 중", queued: "대기 중" }, yours: "내 캐릭터", copied: "링크 복사됨", copy: "링크 복사",
    ahead: (n: number) => `앞에 ${n}개가 있습니다.`, next: "다음 차례입니다.", offline: "작업실 PC가 꺼져 있습니다. 켜지면 바로 처리합니다.",
    autoRefresh: "이 페이지는 스스로 새로고침됩니다. 닫았다가 같은 링크로 다시 열어도 됩니다.",
    failed: "이 그림은 변환하지 못했습니다.", another: "다른 그림 보내기",
    facts: { kind: "종류", anim: "애니메이션", body: "체형", big: "큰 머리", standard: "보통", skeleton: "뼈대", template: "템플릿", auto: "자동", time: "처리 시간",
      height: "높이", size: "바닥 한 변", repeat: "무늬 반복", split: "자르는 높이", splitV: (p: number) => `위에서 ${p}%`,
      tris: "제한 삼각형 수", trisUnlimited: "제한 없음", trisTested: "검증값",
      asked: "요청", made: "만들어진 결과", realTris: "삼각형 수", realTrisMech: "삼각형 수 (두 파트 합)", realSize: "크기 (가로×깊이×높이)", realGround: "크기 (가로×세로)" },
    yoursKind: { character: "내 캐릭터", static: "내 물체", mech: "내 장치", ground: "내 바닥", anim: "동작을 더한 캐릭터" } as Record<string, string>,
    allNote: "모든 동작을 묶은 FBX 는 동작마다 테이크(애니메이션)가 하나씩 들어 있습니다. 스튜디오에서 여러 동작을 한 번에 가져오는지는 아직 확인 중입니다.",
    mechNote: "받침(고정)과 윗부분(움직임) FBX를 둘 다 받아 스튜디오에서 한 모델로 묶으세요. 윗부분의 원점이 회전축입니다.",
    footer: "링크를 아는 사람은 누구나 이 페이지를 열고 파일을 받을 수 있습니다.",
  },
  en: {
    alt: (n: string) => `${n} in 3D`, character: "The character", drawingAlt: "The drawing this character was built from", sentAlt: "The drawing that was sent",
    download: (l: string) => `Download ${l}`, clip: (c: string) => `Download ${c} clip`, alsoMain: " / also in the main FBX",
    title: "Title", titlePh: "Name this character", saving: "Saving…", save: "Save title", saveFail: "Could not save the title.",
    titleNote: "Only the browser that sent this drawing can rename it.",
    notFound: "This result does not exist, or it was taken down.", loadFail: "Could not load this page.", loading: "Loading…",
    nothing: "Nothing to show", noJob: "No result selected", openLink: "Open the link you were given, or send a new drawing.", send: "Send a drawing",
    again: "This drawing was sent before, so this is the result that already exists.",
    status: { done: "FINISHED", failed: "STOPPED", running: "IN PROGRESS", queued: "IN THE QUEUE" }, yours: "Your character", copied: "Link copied", copy: "Copy link",
    ahead: (n: number) => `${n} ahead of yours.`, next: "Yours is next.", offline: "The studio PC is offline. Processing starts as soon as it is back.",
    autoRefresh: "This page updates by itself. You can close it and open the same link later.",
    failed: "This drawing could not be converted.", another: "Try another drawing",
    facts: { kind: "Type", anim: "Animation", body: "Body type", big: "Big head", standard: "Standard", skeleton: "Skeleton", template: "Template", auto: "Auto", time: "Processing time",
      height: "Height", size: "Tile side", repeat: "Pattern repeats", split: "Split height", splitV: (p: number) => `${p}% from the top`,
      tris: "Triangle limit", trisUnlimited: "No limit", trisTested: "tested value",
      asked: "Requested", made: "What was made", realTris: "Triangles", realTrisMech: "Triangles (both parts)", realSize: "Size (W×D×H)", realGround: "Size (W×L)" },
    yoursKind: { character: "Your character", static: "Your object", mech: "Your mechanism", ground: "Your ground", anim: "Character with added clips" } as Record<string, string>,
    allNote: "The FBX with every clip has one take (animation) per clip. Whether the studio imports several clips at once is still being checked.",
    mechNote: "Download both the base (fixed) and the top (moving) FBX and group them as one model in the studio. The top's origin is its pivot.",
    footer: "Anyone with this link can open this page and download the files.",
  },
};

const isFinal = (job: Job | null) => job?.status === "done" || job?.status === "failed";

/** model-viewer 는 자체 호스팅 ES 모듈(public/vendor/README.md). 결과가 있을 때만 불러온다. */
function useModelViewer(enabled: boolean) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled || ready || failed) return;
    let alive = true;
    window.customElements.whenDefined("model-viewer").then(() => { if (alive) setReady(true); }).catch(() => undefined);
    if (!document.querySelector("script[data-model-viewer]")) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "/vendor/model-viewer.min.js";
      script.dataset.modelViewer = "1";
      script.onerror = () => { if (alive) setFailed(true); };
      document.head.appendChild(script);
    }
    return () => { alive = false; };
  }, [enabled, ready, failed]);
  return { ready, failed };
}

function Progress({ job, lang }: { job: Job; lang: UiLang }) {
  const pct = Math.max(3, Math.min(100, job.progress || 0));
  return (
    <div className="fbx-progress">
      <div className="fbx-progress-track"><div className="fbx-progress-fill" style={{ width: `${pct}%` }} /></div>
      <p aria-live="polite">{stepLabel(job, lang)} / {pct}%</p>
    </div>
  );
}

function Viewer({ job }: { job: Job }) {
  const t = COPY[useUiLang()];
  const glb = job.files["preview.glb"];
  const png = job.files["preview.png"];
  const { ready, failed } = useModelViewer(Boolean(glb));
  const [broken, setBroken] = useState(false);            // GLB 를 못 읽으면 이미지로 내려간다
  // 리스너는 ref 콜백에서 붙인다 — useEffect 로는 GLB 가 바로 404 날 때 error 를 놓친다.
  // poster(preview.png) 덕분에 이 이벤트를 놓쳐도 빈 화면이 아니라 원본 그림이 보인다.
  const host = useCallback((el: HTMLElement | null) => {
    el?.addEventListener("error", () => setBroken(true), { once: true });
  }, []);
  if (glb && ready && !failed && !broken) {
    return createElement("model-viewer", {
      ref: host,
      src: glb,
      alt: t.alt(job.title || t.character),
      className: "fbx-viewer",
      "camera-controls": true,
      "auto-rotate": true,
      "touch-action": "pan-y",
      "shadow-intensity": "1",
      poster: png,
    });
  }
  if (png) return <img className="fbx-drawing-preview" src={png} alt={t.drawingAlt} />;
  return <div className="fbx-placeholder" aria-hidden="true" />;
}

function Downloads({ job }: { job: Job }) {
  const lang = useUiLang();
  const t = COPY[lang];
  const main = job.files["final.fbx"];
  // final.fbx 에 들어간 클립을 맨 위로
  const clips = [...clipFiles(job.files)].sort((a, b) => Number(b.clip === job.anim_default) - Number(a.clip === job.anim_default));
  const glb = job.files["preview.glb"];
  const parts = (["parts/base.fbx", "parts/top.fbx"] as const).filter(n => job.files[n]);
  const all = job.files["all_anims.fbx"];
  return (
    <div className="fbx-downloads">
      {main && <a className="button primary wide" href={main} download>{t.download(fileLabel("final.fbx", lang))}</a>}
      {parts.map((n, i) => (
        <a key={n} className={i === 0 ? "button primary wide" : "button outline wide"} href={job.files[n]} download>{t.download(fileLabel(n, lang))}</a>
      ))}
      {parts.length > 0 && <p className="small-note">{t.mechNote}</p>}
      {clips.length > 1 && clips.map(c => (
        <a key={c.name} className="button outline wide" href={c.url} download>
          {t.clip(c.clip)}{c.clip === job.anim_default ? t.alsoMain : ""}
        </a>
      ))}
      {all && <a className="button outline wide" href={all} download>{t.download(fileLabel("all_anims.fbx", lang))}</a>}
      {all && <p className="small-note">{t.allNote}</p>}
      {glb && <a className="button outline wide" href={glb} download>{t.download(fileLabel("preview.glb", lang))}</a>}
    </div>
  );
}

function TitleEditor({ job, token, onSaved }: { job: Job; token: string; onSaved: (job: Job) => void }) {
  const t = COPY[useUiLang()];
  const [value, setValue] = useState(job.title || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setSaving(true);
    setError(null);
    try {
      onSaved(await patchJob(job.id, token, { title: value.trim() }));
    } catch (e) {
      setError(e instanceof FbxApiError ? e.message : t.saveFail);
    }
    setSaving(false);
  }
  return (
    <div className="fbx-title-edit">
      <label htmlFor="job-title">{t.title}</label>
      <div className="fbx-title-row">
        <input id="job-title" className="fbx-input" maxLength={120} value={value} placeholder={t.titlePh}
          onChange={e => setValue(e.target.value)} />
        <button className="button outline" onClick={save} disabled={saving || value.trim() === (job.title || "")}>
          {saving ? t.saving : t.save}
        </button>
      </div>
      {error && <p className="fbx-error" role="alert">{error}</p>}
      <p className="small-note">{t.titleNote}</p>
    </div>
  );
}

export function FbxJobView() {
  const lang = useUiLang();
  const t = COPY[lang];
  const [id, setId] = useState<string | null>(null);
  const [again, setAgain] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const jobRef = useRef<Job | null>(null);
  const [stats, setStats] = useState<GlbStats | null>(null);

  // 주소의 id 와 이 브라우저의 편집 키는 렌더가 아니라 마운트 후에 읽는다(정적 생성 호환)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const jobId = q.get("id");
    setId(jobId);
    setAgain(q.get("again") === "1");
    setToken(jobId ? jobToken(jobId) : null);
    if (!jobId) setLoaded(true);
  }, []);

  const load = useCallback(async (jobId: string): Promise<Job | null> => {
    try {
      const next = await getJob(jobId);
      jobRef.current = next;
      setJob(next);
      setError(null);
      return next;
    } catch (e) {
      if (e instanceof FbxApiError && e.status === 404) setError(t.notFound);
      else setError(e instanceof FbxApiError ? e.message : t.loadFail);
      return null;
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const tick = async () => {
      const next = await load(id);
      if (!alive || isFinal(next)) return;                     // 끝난 작업은 더 보지 않는다
      timer = setTimeout(tick, Date.now() - started < FAST_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS);
    };
    void tick();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !isFinal(jobRef.current)) void load(id);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, load]);

  // 실제로 만들어진 값은 preview.glb 머리에서 잰다. 못 읽으면(50MB 넘어 안 올린 경우 등) 그 줄만 뺀다.
  const glbUrl = job?.status === "done" ? job.files["preview.glb"] : undefined;
  useEffect(() => {
    if (!glbUrl) return;
    let alive = true;
    glbStats(glbUrl).then(s => { if (alive) setStats(s); }).catch(() => undefined);
    return () => { alive = false; };
  }, [glbUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!loaded) return <div className="fbx-job-empty"><p aria-live="polite">{t.loading}</p></div>;

  if (!id || error || !job) {
    return (
      <div className="fbx-job-empty">
        <h1>{id ? t.nothing : t.noJob}</h1>
        <p>{error || t.openLink}</p>
        <Link className="button primary" href="/ko/fbx/create">{t.send}</Link>
      </div>
    );
  }

  const waiting = job.status === "queued" || job.status === "running";
  const facts: [string, string][] = [];
  if (job.kind && job.kind !== "character") {
    facts.push([t.facts.kind, kindLabel(job.kind, lang)]);
    const o = job.options || {};
    if (o.height_cm) facts.push([t.facts.height, `${Number(o.height_cm).toLocaleString("en-US")} cm`]);
    if (o.split) facts.push([t.facts.split, t.facts.splitV(Math.round(o.split * 100))]);
    if (o.size_cm) facts.push([t.facts.size, `${Number(o.size_cm).toLocaleString("en-US")} cm`]);
    if (o.uv_repeat && o.uv_repeat > 1) facts.push([t.facts.repeat, `${o.uv_repeat}×${o.uv_repeat}`]);
  }
  {
    // 삼각형 수: 옵션이 없으면(기존 작업·캐릭터 기본) 검증값
    const kind = job.kind ?? "character";
    const def = KIND_DEFAULTS[kind]?.tris;      // anim 은 삼각형 옵션이 없다(입력 FBX 그대로)
    const tr = job.options?.tris ?? def;
    if (tr !== undefined) facts.push([t.facts.tris, tr === "unlimited" ? t.facts.trisUnlimited : `${Number(tr).toLocaleString("en-US")}${tr === def ? ` (${t.facts.trisTested})` : ""}`]);
  }
  if (job.anim_default) facts.push([t.facts.anim, job.anim_default]);

  const made: [string, string][] = [];
  if (stats) {
    const kind = job.kind ?? "character";
    const cm = (m: number) => Math.round(m * 100).toLocaleString("en-US");
    made.push([kind === "mech" ? t.facts.realTrisMech : t.facts.realTris, stats.tris.toLocaleString("en-US")]);
    const [w, h, d] = stats.size;                                // 캐릭터는 정규화된 메시라 크기를 쓰지 않는다
    if (kind === "ground") made.push([t.facts.realGround, `${cm(w)} × ${cm(d)} cm`]);
    else if (kind !== "character") made.push([t.facts.realSize, `${cm(w)} × ${cm(d)} × ${cm(h)} cm`]);
  }
  if (job.body_type) made.push([t.facts.body, job.body_type === "bighead" ? t.facts.big : t.facts.standard]);
  if (job.skeleton_src) made.push([t.facts.skeleton, job.skeleton_src === "template" ? t.facts.template : t.facts.auto]);
  if (job.started_at && job.finished_at) made.push([t.facts.time, elapsed(job.started_at, job.finished_at)]);

  return (
    <div className="fbx-job">
      {again && <p className="notice">{t.again}</p>}

      <div className="fbx-job-head">
        <div>
          <p className="eyebrow">
            {t.status[job.status]}
          </p>
          <h1>{job.title || t.yoursKind[job.kind ?? "character"] || t.yours}</h1>
        </div>
        <button className="button outline" onClick={copyLink}>{copied ? t.copied : t.copy}</button>
      </div>

      <div className="fbx-job-body">
        <div className="fbx-job-stage">
          {job.status === "done"
            ? <Viewer job={job} />
            : job.input_url === null
              ? <div className="fbx-placeholder" aria-hidden="true" />
              : <img className="fbx-drawing-preview" src={inputImageUrl(job.id)} alt={t.sentAlt} />}
        </div>

        <div className="fbx-job-side">
          {waiting && (
            <>
              <Progress job={job} lang={lang} />
              {job.status === "queued" && (
                <p>{job.queue_position && job.queue_position > 1 ? t.ahead(job.queue_position - 1) : t.next}</p>
              )}
              {!job.worker_online && <p className="notice">{t.offline}</p>}
              <p className="small-note">{t.autoRefresh}</p>
            </>
          )}

          {job.status === "done" && <Downloads job={job} />}

          {job.status === "failed" && (
            <div className="fbx-failed">
              <p>{job.error_public || t.failed}</p>
              <Link className="button primary" href="/ko/fbx/create">{t.another}</Link>
            </div>
          )}

          {([[t.facts.asked, facts], [t.facts.made, made]] as const).map(([title, rows]) => rows.length > 0 && (
            <div key={title} className="asset-specs">
              <p className="asset-specs-title">{title}</p>
              {rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          ))}
        </div>
      </div>

      {token && <TitleEditor job={job} token={token} onSaved={setJob} />}

      <p className="small-note">{t.footer}</p>
    </div>
  );
}
