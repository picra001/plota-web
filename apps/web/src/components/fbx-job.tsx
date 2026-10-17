"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import Link from "./localized-link";
import {
  clipFiles, elapsed, fileLabel, getJob, inputImageUrl, jobToken, patchJob, stepLabel,
  FbxApiError, type Job,
} from "@/lib/fbx-api";

const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 8000;
const FAST_WINDOW_MS = 2 * 60 * 1000;

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

function Progress({ job }: { job: Job }) {
  const pct = Math.max(3, Math.min(100, job.progress || 0));
  return (
    <div className="fbx-progress">
      <div className="fbx-progress-track"><div className="fbx-progress-fill" style={{ width: `${pct}%` }} /></div>
      <p aria-live="polite">{stepLabel(job)} / {pct}%</p>
    </div>
  );
}

function Viewer({ job }: { job: Job }) {
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
      alt: `${job.title || "The character"} in 3D`,
      className: "fbx-viewer",
      "camera-controls": true,
      "auto-rotate": true,
      "touch-action": "pan-y",
      "shadow-intensity": "1",
      poster: png,
    });
  }
  if (png) return <img className="fbx-drawing-preview" src={png} alt="The drawing this character was built from" />;
  return <div className="fbx-placeholder" aria-hidden="true" />;
}

function Downloads({ job }: { job: Job }) {
  const main = job.files["final.fbx"];
  // final.fbx 에 들어간 클립을 맨 위로
  const clips = [...clipFiles(job.files)].sort((a, b) => Number(b.clip === job.anim_default) - Number(a.clip === job.anim_default));
  const glb = job.files["preview.glb"];
  return (
    <div className="fbx-downloads">
      {main && <a className="button primary wide" href={main} download>Download {fileLabel("final.fbx")}</a>}
      {clips.length > 1 && clips.map(c => (
        <a key={c.name} className="button outline wide" href={c.url} download>
          Download {c.clip} clip{c.clip === job.anim_default ? " / also in the main FBX" : ""}
        </a>
      ))}
      {glb && <a className="button outline wide" href={glb} download>Download {fileLabel("preview.glb")}</a>}
      <p className="small-note">
        The main FBX holds the mesh, the skeleton, and one animation. In OVERDARE use the Home tab Import button,
        set Scale Unit to Meter, and leave Import Only as Model off.
      </p>
    </div>
  );
}

function TitleEditor({ job, token, onSaved }: { job: Job; token: string; onSaved: (job: Job) => void }) {
  const [value, setValue] = useState(job.title || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setSaving(true);
    setError(null);
    try {
      onSaved(await patchJob(job.id, token, { title: value.trim() }));
    } catch (e) {
      setError(e instanceof FbxApiError ? e.message : "Could not save the title.");
    }
    setSaving(false);
  }
  return (
    <div className="fbx-title-edit">
      <label htmlFor="job-title">Title</label>
      <div className="fbx-title-row">
        <input id="job-title" className="fbx-input" maxLength={120} value={value} placeholder="Name this character"
          onChange={e => setValue(e.target.value)} />
        <button className="button outline" onClick={save} disabled={saving || value.trim() === (job.title || "")}>
          {saving ? "Saving…" : "Save title"}
        </button>
      </div>
      {error && <p className="fbx-error" role="alert">{error}</p>}
      <p className="small-note">Only this browser can rename this result. The edit key is kept here, not in an account.</p>
    </div>
  );
}

export function FbxJobView() {
  const [id, setId] = useState<string | null>(null);
  const [again, setAgain] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const jobRef = useRef<Job | null>(null);

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
      if (e instanceof FbxApiError && e.status === 404) setError("This result does not exist, or it was taken down.");
      else setError(e instanceof FbxApiError ? e.message : "Could not load this page.");
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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!loaded) return <div className="fbx-job-empty"><p aria-live="polite">Loading…</p></div>;

  if (!id || error || !job) {
    return (
      <div className="fbx-job-empty">
        <h1>{id ? "Nothing to show" : "No result selected"}</h1>
        <p>{error || "Open the link you were given, or send a drawing to start a new one."}</p>
        <Link className="button primary" href="/en/fbx/create">Send a drawing</Link>
      </div>
    );
  }

  const waiting = job.status === "queued" || job.status === "running";
  const facts: [string, string][] = [];
  if (job.anim_default) facts.push(["Animation", job.anim_default]);
  if (job.body_type) facts.push(["Body type", job.body_type === "bighead" ? "Big head" : "Standard"]);
  if (job.skeleton_src) facts.push(["Skeleton", job.skeleton_src === "template" ? "Template rig" : "Auto rig"]);
  if (job.started_at && job.finished_at) facts.push(["Processing time", elapsed(job.started_at, job.finished_at)]);

  return (
    <div className="fbx-job">
      {again && <p className="notice">This drawing was sent before, so this is the result that already exists.</p>}

      <div className="fbx-job-head">
        <div>
          <p className="eyebrow">
            {job.status === "done" ? "FINISHED" : job.status === "failed" ? "STOPPED" : job.status === "running" ? "IN PROGRESS" : "IN THE QUEUE"}
          </p>
          <h1>{job.title || "Your character"}</h1>
        </div>
        <button className="button outline" onClick={copyLink}>{copied ? "Link copied" : "Copy link"}</button>
      </div>

      <div className="fbx-job-body">
        <div className="fbx-job-stage">
          {job.status === "done"
            ? <Viewer job={job} />
            : <img className="fbx-drawing-preview" src={inputImageUrl(job.id)} alt="The drawing that was sent" />}
        </div>

        <div className="fbx-job-side">
          {waiting && (
            <>
              <Progress job={job} />
              {job.status === "queued" && (
                <p>{job.queue_position && job.queue_position > 1 ? `${job.queue_position} drawings are ahead of yours.` : "Yours is next."}</p>
              )}
              {!job.worker_online && <p className="notice">The studio PC is offline. Processing starts as soon as it is back.</p>}
              <p className="small-note">This page updates by itself. You can close it and open the same link later.</p>
            </>
          )}

          {job.status === "done" && <Downloads job={job} />}

          {job.status === "failed" && (
            <div className="fbx-failed">
              <p>{job.error_public || "This drawing could not be converted."}</p>
              <Link className="button primary" href="/en/fbx/create">Try another drawing</Link>
              <p className="small-note">
                One character facing forward, arms away from the body, plain background works best.
                Drawings with several characters or a busy background often fail.
              </p>
            </div>
          )}

          {facts.length > 0 && (
            <div className="asset-specs">
              {facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          )}
        </div>
      </div>

      {token && <TitleEditor job={job} token={token} onSaved={setJob} />}

      <p className="small-note">
        Anyone with this link can open this page and download the files. Processing runs on a single studio PC.
        To take a result down, write to <a href="mailto:picra001@gmail.com">picra001@gmail.com</a> with the link.
      </p>
    </div>
  );
}
