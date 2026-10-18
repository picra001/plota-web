// fbx-api 클라이언트 — 그림 1장을 접수하고 진행 상태·결과 파일을 읽는다.
// 서버: apps/fbx-api (Cloudflare Worker + D1 + R2). 엔드포인트 표는 apps/fbx-api/README.md.
// 주소는 빌드 시 NEXT_PUBLIC_FBX_API_URL 로 바꾼다(로컬 wrangler dev: http://127.0.0.1:8787).

import type { UiLang } from "./i18n";

export const FBX_API_BASE = (process.env.NEXT_PUBLIC_FBX_API_URL || "https://fbx-api.plota.ai").replace(/\/$/, "");

/** 작업실 PC `serve_data/anims/` 에 올려둔 클립. 클립을 추가하면 이 목록도 함께 늘린다. */
export const LIBRARY_CLIPS = ["Walking", "Salute"];
export const DEFAULT_CLIP = "Walking";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_CLIP_BYTES = 10 * 1024 * 1024;
export const MAX_CLIPS = 4;

export type JobStatus = "queued" | "running" | "done" | "failed";

export type Job = {
  id: string;
  status: JobStatus;
  step: string | null;
  progress: number;
  queue_position: number | null;
  worker_online: boolean;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  title: string | null;
  public: boolean;
  input_url: string;
  files: Record<string, string>;
  anim_request: { anims?: string[]; default?: string } | null;
  anim_default: string | null;
  body_type: string | null;
  skeleton_src: string | null;
  error_public: string | null;
};

export type SubmitResult = Job & { owner_token?: string; duplicate?: boolean };

export class FbxApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "error", status = 0) {
    super(message);
    this.name = "FbxApiError";
    this.code = code;
    this.status = status;
  }
}

/** 브라우저 주소의 언어로 고른다(ko 외에는 영어). */
function offlineMessage(): string {
  const ko = typeof window !== "undefined" && window.location.pathname.startsWith("/ko");
  return ko ? "제작 서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해 주세요." : "Could not reach the creation service. Check your connection and try again.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(FBX_API_BASE + path, { ...init, cache: "no-store" });
  } catch {
    throw new FbxApiError(offlineMessage(), "offline");
  }
  const text = await res.text();
  let body: Record<string, unknown> = {};
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }
  if (!res.ok) {
    const message = typeof body.message === "string" ? body.message : `Request failed (${res.status}).`;
    const code = typeof body.error === "string" ? body.error : "error";
    throw new FbxApiError(message, code, res.status);
  }
  return body as T;
}

export type SubmitInput = {
  invite: string;
  image: File;
  /** 라이브러리 클립 이름. 비면 서버 기본값(Walking) */
  clips: string[];
  defaultClip?: string;
  /** 사용자가 올린 Mixamo FBX. 이름이 클립 이름이 된다 */
  uploads?: { name: string; file: File }[];
  isPublic: boolean;
};

export async function submitJob(input: SubmitInput): Promise<SubmitResult> {
  const form = new FormData();
  form.set("invite", input.invite.trim());
  form.set("consent", "1");
  form.set("public", input.isPublic ? "1" : "0");
  form.set("image", input.image, input.image.name || "drawing.png");
  const names = [...input.clips];
  for (const u of input.uploads ?? []) if (!names.includes(u.name)) names.push(u.name);
  if (names.length) {
    const spec: { anims: string[]; default?: string } = { anims: names };
    const want = input.defaultClip && names.includes(input.defaultClip) ? input.defaultClip : names[0];
    if (want) spec.default = want;
    form.set("anims", JSON.stringify(spec));
  }
  for (const u of input.uploads ?? []) form.set(`clip_${u.name}`, u.file, `${u.name}.fbx`);
  return request<SubmitResult>("/jobs", { method: "POST", body: form });
}

export async function getJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${encodeURIComponent(id)}`);
}

export async function patchJob(id: string, token: string, patch: { title?: string; public?: boolean }): Promise<Job> {
  return request<Job>(`/jobs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

/** 완료·공개 작업 목록(최근 완료 순). 다음 쪽은 next_cursor 로. 서버 60초 캐시. */
export async function listPublicJobs(cursor?: number | null, limit = 12): Promise<{ items: Job[]; next_cursor: number | null }> {
  const q = new URLSearchParams({ public: "1", limit: String(limit) });
  if (cursor) q.set("cursor", String(cursor));
  return request<{ items: Job[]; next_cursor: number | null }>(`/jobs?${q}`);
}

export async function getHealth(): Promise<{ ok: boolean; worker_online: boolean }> {
	return request<{ ok: boolean; worker_online: boolean }>("/health");
}

export function inputImageUrl(id: string): string {
  return `${FBX_API_BASE}/jobs/${encodeURIComponent(id)}/input.png`;
}

// ---------------------------------------------------------------- 브라우저 보관
// owner_token 은 이 브라우저에만 둔다(계정이 없으므로). 지워지면 제목 편집 권한만 사라진다.

const TOKEN_KEY = "plota-fbx-tokens-v1";
const INVITE_KEY = "plota-fbx-invite-v1";

function readTokens(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberJob(id: string, token: string): void {
  try {
    const all = readTokens();
    all[id] = token;
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(all));
  } catch {
    /* 저장 불가 환경에서는 제목 편집만 불가 */
  }
}

export function jobToken(id: string): string | null {
  return readTokens()[id] ?? null;
}

export function myJobIds(): string[] {
  return Object.keys(readTokens());
}

/** 서버에서 지워진(404) 작업은 목록에서 뺀다. 편집 키만 사라지고 다른 것은 영향 없음. */
export function forgetJob(id: string): void {
  try {
    const all = readTokens();
    delete all[id];
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(all));
  } catch {
    /* 무시 */
  }
}

export function rememberInvite(code: string): void {
  try {
    window.localStorage.setItem(INVITE_KEY, code);
  } catch {
    /* 무시 */
  }
}

export function savedInvite(): string {
  try {
    return window.localStorage.getItem(INVITE_KEY) || "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------- 표시용

/** 워커 단계 이름 → 화면 문구. 워커 쪽 step 값은 ovdr/server/README.md §7. */
const STEP_LABELS: Record<UiLang, Record<string, string>> = {
  ko: {
    claim: "시작하는 중", input: "그림 준비 중", build: "3D 모양 만드는 중", mesh_check: "메시 점검 중", rerig: "뼈대 맞추는 중",
    finalize: "엔진용으로 정리 중", convert: "축 변환 중", anim: "애니메이션 붙이는 중", upload: "파일 올리는 중", done: "완료", failed: "중단됨",
  },
  en: {
    claim: "Getting started", input: "Preparing your drawing", build: "Building the 3D shape", mesh_check: "Checking the mesh", rerig: "Fitting the skeleton",
    finalize: "Preparing it for the engine", convert: "Converting the axes", anim: "Adding the animation", upload: "Uploading your files", done: "Finished", failed: "Stopped",
  },
};

export function stepLabel(job: Pick<Job, "status" | "step">, lang: UiLang): string {
  if (job.status === "queued") return lang === "ko" ? "차례를 기다리는 중" : "Waiting for the studio PC";
  return (job.step && STEP_LABELS[lang][job.step]) || (lang === "ko" ? "처리 중" : "Working on it");
}

/** 결과 파일 이름 → 내려받기 버튼 문구. anims/<클립>_ovdr.fbx 는 클립 이름으로. */
export function fileLabel(name: string, lang: UiLang): string {
  const ko = lang === "ko";
  if (name === "final.fbx") return ko ? "FBX" : "FBX";
  if (name === "preview.glb") return ko ? "GLB 미리보기" : "GLB preview";
  if (name === "preview.png") return ko ? "원본 그림" : "Source image";
  if (name === "thumb.webp") return ko ? "썸네일" : "Thumbnail";
  const clip = /^anims\/(.+)_ovdr\.fbx$/.exec(name);
  if (clip) return ko ? `${clip[1]} 클립 (FBX)` : `${clip[1]} clip (FBX)`;
  return name;
}

export function clipFiles(files: Record<string, string>): { name: string; clip: string; url: string }[] {
  return Object.entries(files)
    .map(([name, url]) => ({ name, url, clip: (/^anims\/(.+)_ovdr\.fbx$/.exec(name) || [])[1] }))
    .filter((f): f is { name: string; clip: string; url: string } => Boolean(f.clip))
    .sort((a, b) => a.clip.localeCompare(b.clip));
}

export function elapsed(from: number, to: number): string {
  const s = Math.max(0, Math.round((to - from) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}
