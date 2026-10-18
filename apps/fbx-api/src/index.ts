/**
 * plota fbx-api — 아이 그림/이미지 1장 → OverDare 반입용 FBX 작업 큐
 *
 * 계획: ovdr/docs/fbx_web_service_plan_v2.md §6-2 (comfyui-docker 저장소)
 * 구조: 브라우저 → 이 Worker(D1 jobs) → 집 PC 워커가 바깥으로 폴링 → R2 → assets.plota.ai
 *
 * R2 키 배치
 *   priv/jobs/<id>/input.png            원본 입력 (공개 도메인 대신 이 Worker 가 중계)
 *   priv/jobs/<id>/clips/<name>.fbx     사용자가 올린 Mixamo 클립
 *   p/<id>/<name>                       산출물 (assets.plota.ai/p/<id>/... 로 공개)
 */

export interface Env {
	DB: D1Database;
	BUCKET: R2Bucket;
	// 시크릿
	WORKER_TOKEN: string;
	ADMIN_TOKEN: string;
	INVITE_CODES: string;
	// vars
	ASSETS_BASE: string;
	ALLOW_ORIGIN: string;
	QUEUE_MAX: string;
	WORKER_ONLINE_SEC: string;
	LEASE_LOST_SEC: string;
	INPUT_KEEP_DAYS: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_FBX_BYTES = 10 * 1024 * 1024;
const MAX_CLIPS = 4;
const CLIP_NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** 워커가 올릴 수 있는 산출물 이름 (4개 + 클립별 FBX + 장치 부품 FBX) */
const OUT_NAME_RE = /^(final\.fbx|preview\.glb|preview\.png|thumb\.webp|anims\/[A-Za-z0-9_-]{1,64}_ovdr\.fbx|parts\/(top|base)\.fbx)$/;

/**
 * 작업 종류 (2026-10-18). character = 기존 캐릭터(리깅+애니). 나머지는 본 없는 FBX.
 * 옵션 범위는 집 PC 워커(comfyui-docker ovdr/server/worker.py KIND_DEFAULTS·kind_options)와 같게 유지한다.
 */
const KINDS = ['character', 'static', 'mech', 'ground'] as const;
type Kind = (typeof KINDS)[number];
type OptSpec = { min?: number; max?: number; def: number | string; values?: string[]; also?: string[] };
/**
 * tris = 삼각형 수(메시 밀도, 2026-10-18). 기본값 = 종류별로 검증한 값. 500~50000 또는 'unlimited'(감폴리 안 함).
 * OVERDARE 상한은 FBX 1개당 30,000 — 넘겨도 받되 사이트가 경고한다. mech 는 두 파트 합계(윗부분 4 : 받침 3).
 */
const TRIS = (def: number): OptSpec => ({ min: 500, max: 50000, def, also: ['unlimited'] });
const KIND_OPTIONS: Record<Kind, Record<string, OptSpec>> = {
	character: { tris: TRIS(8000) },
	static: { height_cm: { min: 10, max: 2000, def: 120 }, tris: TRIS(2000) },
	mech: { height_cm: { min: 10, max: 2000, def: 200 }, split: { min: 0.05, max: 0.95, def: 0.5 }, front: { def: 'viewer', values: ['viewer', 'left', 'right'] }, tris: TRIS(7000) },
	ground: { size_cm: { min: 100, max: 2040, def: 2000 }, uv_repeat: { min: 1, max: 16, def: 1 } },
};

/** 종류별 옵션 정리 — 범위 밖 값은 오류, 빠진 값은 기본값. 키 순서를 고정해 중복 판정 문자열을 안정시킨다.
 *  캐릭터는 전부 기본값이면 null (옵션이 없던 기존 캐릭터 작업과 중복 판정이 이어지게). */
function parseKindOptions(kind: Kind, raw: string | null): { options: Record<string, number | string> | null; error?: string } {
	let given: Record<string, unknown> = {};
	if (raw && raw.trim()) {
		try {
			const v = JSON.parse(raw);
			if (typeof v !== 'object' || v === null || Array.isArray(v)) return { options: null, error: 'options 형식 오류' };
			given = v as Record<string, unknown>;
		} catch {
			return { options: null, error: 'options 가 JSON 이 아닙니다' };
		}
	}
	const out: Record<string, number | string> = {};
	for (const [k, spec] of Object.entries(KIND_OPTIONS[kind])) {
		const v = given[k];
		if (v === undefined || v === null || v === '') {
			out[k] = spec.def;
			continue;
		}
		if (spec.values) {
			if (!spec.values.includes(String(v))) return { options: null, error: `${k} 값은 ${spec.values.join('/')} 중 하나` };
			out[k] = String(v);
			continue;
		}
		if (spec.also?.includes(String(v))) {
			out[k] = String(v);
			continue;
		}
		const n = Number(v);
		if (!Number.isFinite(n) || n < (spec.min ?? -Infinity) || n > (spec.max ?? Infinity)) {
			return { options: null, error: `${k} 는 ${spec.min}~${spec.max} 사이${spec.also ? ` 또는 ${spec.also.join('/')}` : ''}` };
		}
		out[k] = k === 'tris' ? Math.round(n) : Math.round(n * 1000) / 1000;
	}
	if (kind === 'character' && Object.entries(KIND_OPTIONS.character).every(([k, spec]) => out[k] === spec.def)) return { options: null };
	return { options: out };
}

const CONTENT_TYPES: Record<string, string> = {
	fbx: 'application/octet-stream',
	glb: 'model/gltf-binary',
	png: 'image/png',
	webp: 'image/webp',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	json: 'application/json',
};

// ------------------------------------------------------------------ 공통

function ctFor(name: string): string {
	const ext = name.split('.').pop()!.toLowerCase();
	return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

function num(v: string | undefined, fallback: number): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
}

function corsHeaders(env: Env, req: Request): Record<string, string> {
	const origin = req.headers.get('Origin');
	const allow = (env.ALLOW_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
	const ok = origin && (allow.includes(origin) || allow.includes('*'));
	return {
		'Access-Control-Allow-Origin': ok ? origin! : allow[0] ?? 'https://plota.ai',
		'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
		'Access-Control-Allow-Headers': 'Authorization,Content-Type',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin',
	};
}

function json(body: unknown, init: ResponseInit = {}, extra: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(body), {
		...init,
		headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra, ...(init.headers as object) },
	});
}

function err(status: number, code: string, message: string, extra: Record<string, string> = {}): Response {
	return json({ error: code, message }, { status }, extra);
}

async function sha256Hex(buf: ArrayBuffer | Uint8Array): Promise<string> {
	const src: ArrayBuffer = buf instanceof Uint8Array ? (buf.slice().buffer as ArrayBuffer) : buf;
	const digest = await crypto.subtle.digest('SHA-256', src);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Text(s: string): Promise<string> {
	return sha256Hex(new TextEncoder().encode(s));
}

function randomToken(): string {
	const b = new Uint8Array(32);
	crypto.getRandomValues(b);
	return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** 상수 시간 비교 — 토큰 길이가 달라도 길이만 노출된다. */
function tokenEq(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/** FormData 값에서 파일만 — 값이 string|File 이라 instanceof 를 바로 못 쓴다. */
function asFile(v: File | string | null): File | null {
	return v !== null && typeof v !== 'string' ? v : null;
}

function bearer(req: Request): string {
	const h = req.headers.get('Authorization') || '';
	return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

function isWorker(req: Request, env: Env): boolean {
	return Boolean(env.WORKER_TOKEN) && tokenEq(bearer(req), env.WORKER_TOKEN);
}

function isAdmin(req: Request, env: Env): boolean {
	return Boolean(env.ADMIN_TOKEN) && tokenEq(bearer(req), env.ADMIN_TOKEN);
}

// ------------------------------------------------------------------ 입력 검증

function startsWithAscii(buf: Uint8Array, text: string, at = 0): boolean {
	if (buf.length < at + text.length) return false;
	for (let i = 0; i < text.length; i++) if (buf[at + i] !== text.charCodeAt(i)) return false;
	return true;
}

function containsAscii(buf: Uint8Array, text: string, limit = 1024): boolean {
	const end = Math.min(buf.length, limit) - text.length;
	for (let i = 0; i <= end; i++) if (startsWithAscii(buf, text, i)) return true;
	return false;
}

/** 확장자를 믿지 않고 선두 바이트로 판별. → 'png' | 'jpg' | 'webp' | null */
function imageKind(head: Uint8Array): 'png' | 'jpg' | 'webp' | null {
	if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'png';
	if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpg';
	if (startsWithAscii(head, 'RIFF') && startsWithAscii(head, 'WEBP', 8)) return 'webp';
	return null;
}

/** Mixamo 등에서 받은 FBX 인지 — 바이너리 서명 또는 ASCII 헤더. */
function looksLikeFbx(head: Uint8Array): boolean {
	return startsWithAscii(head, 'Kaydara FBX Binary') || containsAscii(head, 'FBXHeaderExtension');
}

/** 요청서 = inbox json 과 같은 형식. {"anims":[...],"default":"..."} 외는 버린다. */
function parseAnimSpec(raw: string | null): { spec: { anims: string[]; default?: string } | null; error?: string } {
	if (!raw || !raw.trim()) return { spec: null };
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { spec: null, error: 'anims 가 JSON 이 아닙니다' };
	}
	if (typeof parsed !== 'object' || parsed === null) return { spec: null, error: 'anims 형식 오류' };
	const o = parsed as Record<string, unknown>;
	const list = Array.isArray(o.anims) ? o.anims : [];
	const names: string[] = [];
	for (const x of list) {
		const s = String(x);
		if (!CLIP_NAME_RE.test(s)) return { spec: null, error: `클립 이름 형식 오류: ${s.slice(0, 32)}` };
		if (!names.includes(s)) names.push(s);
	}
	if (names.length > MAX_CLIPS) return { spec: null, error: `클립은 최대 ${MAX_CLIPS}개` };
	const def = o.default === undefined || o.default === null ? undefined : String(o.default);
	if (def !== undefined && !CLIP_NAME_RE.test(def)) return { spec: null, error: '기본 클립 이름 형식 오류' };
	if (def !== undefined && !names.includes(def)) names.unshift(def);
	if (!names.length && def === undefined) return { spec: null };
	return { spec: { anims: names, ...(def !== undefined ? { default: def } : {}) } };
}

// ------------------------------------------------------------------ D1 행 ↔ 응답

interface JobRow {
	id: string;
	status: string;
	step: string | null;
	progress: number | null;
	created_at: number;
	started_at: number | null;
	finished_at: number | null;
	heartbeat_at: number | null;
	owner_token_hash: string;
	input_sha256: string;
	input_name: string | null;
	public: number;
	hidden: number;
	title: string | null;
	seed_used: number | null;
	wrap_used: number | null;
	skeleton_src: string | null;
	body_type: string | null;
	anim_default: string | null;
	worker_job_id: string | null;
	anim_spec: string | null;
	upload_clips: string | null;
	files: string | null;
	kind: string | null;
	options: string | null;
	error_public: string | null;
	error_private: string | null;
	log_tail: string | null;
}

function parseList(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v.map(String) : [];
	} catch {
		return [];
	}
}

function parseObj(raw: string | null): Record<string, unknown> | null {
	if (!raw) return null;
	try {
		const v = JSON.parse(raw);
		return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

/** upload_clips 컬럼 [{"name","bytes"}] → 이름 목록 */
function uploadClipNames(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const v = JSON.parse(raw);
		if (!Array.isArray(v)) return [];
		return v.map((x) => String((x as { name?: unknown }).name ?? '')).filter(Boolean);
	} catch {
		return [];
	}
}

function fileUrls(env: Env, row: JobRow): Record<string, string> {
	const out: Record<string, string> = {};
	for (const name of parseList(row.files)) out[name] = `${env.ASSETS_BASE}/p/${row.id}/${name}`;
	return out;
}

async function workerOnline(env: Env): Promise<boolean> {
	const r = await env.DB.prepare("SELECT v FROM worker WHERE k='last_seen'").first<{ v: string }>();
	if (!r) return false;
	return Date.now() - Number(r.v) < num(env.WORKER_ONLINE_SEC, 90) * 1000;
}

async function queuePosition(env: Env, row: JobRow): Promise<number | null> {
	if (row.status !== 'queued') return null;
	const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status='queued' AND created_at <= ?")
		.bind(row.created_at)
		.first<{ n: number }>();
	return r ? Number(r.n) : null;
}

async function publicView(env: Env, row: JobRow) {
	let animSpec: unknown = null;
	try {
		animSpec = row.anim_spec ? JSON.parse(row.anim_spec) : null;
	} catch {
		animSpec = null;
	}
	return {
		id: row.id,
		status: row.status,
		step: row.step,
		progress: row.progress ?? 0,
		queue_position: await queuePosition(env, row),
		worker_online: await workerOnline(env),
		created_at: row.created_at,
		started_at: row.started_at,
		finished_at: row.finished_at,
		title: row.title,
		public: Boolean(row.public),
		input_url: `/jobs/${row.id}/input.png`,
		files: fileUrls(env, row),
		kind: row.kind || 'character',
		options: parseObj(row.options),
		anim_request: animSpec,
		anim_default: row.anim_default,
		body_type: row.body_type,
		skeleton_src: row.skeleton_src,
		error_public: row.error_public,
	};
}

async function getJob(env: Env, id: string): Promise<JobRow | null> {
	return env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first<JobRow>();
}

// ------------------------------------------------------------------ 접수 POST /jobs

async function createJob(req: Request, env: Env): Promise<Response> {
	let form: FormData;
	try {
		form = await req.formData();
	} catch {
		return err(400, 'bad_request', 'multipart/form-data 로 보내주세요');
	}

	const invite = String(form.get('invite') ?? '').trim();
	const codes = (env.INVITE_CODES || '').split(',').map((s) => s.trim()).filter(Boolean);
	if (!codes.length) return err(503, 'not_configured', '초대코드가 설정되지 않았습니다');
	if (!codes.some((c) => tokenEq(c, invite))) return err(403, 'bad_invite', '초대코드가 올바르지 않습니다');

	if (String(form.get('consent') ?? '') !== '1') {
		return err(400, 'no_consent', '공개 게시 동의(consent=1)가 필요합니다');
	}

	const image = asFile(form.get('image'));
	if (!image) return err(400, 'no_image', 'image 파일이 없습니다');
	if (image.size > MAX_IMAGE_BYTES) return err(413, 'image_too_large', `이미지는 ${MAX_IMAGE_BYTES / 1024 / 1024}MB 이하`);
	const imageBytes = new Uint8Array(await image.arrayBuffer());
	if (!imageKind(imageBytes.subarray(0, 16))) return err(415, 'bad_image', 'PNG·JPG·WEBP 만 받습니다');

	// 작업 종류·옵션 (2026-10-18). 캐릭터가 아니면 애니메이션 요청·클립은 받지 않는다.
	const kindRaw = String(form.get('kind') ?? 'character').trim() || 'character';
	if (!(KINDS as readonly string[]).includes(kindRaw)) return err(400, 'bad_kind', `kind 는 ${KINDS.join('/')} 중 하나`);
	const kind = kindRaw as Kind;
	const opt = parseKindOptions(kind, typeof form.get('options') === 'string' ? (form.get('options') as string) : null);
	if (opt.error) return err(400, 'bad_options', opt.error);
	const optionsText = opt.options ? JSON.stringify(opt.options) : null;

	// 요청서(inbox json 과 동일 형식)
	const parsed = parseAnimSpec(kind === 'character' && typeof form.get('anims') === 'string' ? (form.get('anims') as string) : null);
	if (parsed.error) return err(400, 'bad_anims', parsed.error);

	// 사용자 업로드 클립: clip_<이름> 필드. 이름은 요청서의 클립 이름과 맞춰야 한다.
	const uploads: { name: string; bytes: Uint8Array }[] = [];
	for (const [key, value] of form.entries()) {
		const clip = asFile(value);
		if (!key.startsWith('clip_') || !clip || kind !== 'character') continue;
		const name = key.slice(5);
		if (!CLIP_NAME_RE.test(name)) return err(400, 'bad_clip_name', `클립 이름 형식 오류: ${name.slice(0, 32)}`);
		if (clip.size > MAX_FBX_BYTES) return err(413, 'clip_too_large', `클립 FBX 는 ${MAX_FBX_BYTES / 1024 / 1024}MB 이하`);
		const b = new Uint8Array(await clip.arrayBuffer());
		if (!looksLikeFbx(b)) return err(415, 'bad_clip', `${name}: FBX 파일이 아닙니다`);
		uploads.push({ name, bytes: b });
		if (uploads.length > MAX_CLIPS) return err(400, 'too_many_clips', `클립은 최대 ${MAX_CLIPS}개`);
	}

	// 업로드한 클립은 요청서에 없어도 쓰도록 목록에 넣는다 (워커가 첨부로 인식)
	const spec = parsed.spec ?? { anims: [] as string[] };
	for (const u of uploads) if (!spec.anims.includes(u.name)) spec.anims.push(u.name);

	// 중복 제거 — 같은 이미지·같은 종류·같은 옵션이면 기존 작업을 돌려준다.
	// 실패한 작업과 숨긴 작업은 제외: 그러면 같은 그림을 다시 넣어 재시도할 수 있다(크래시 재시도를 안 하므로 더 중요하다).
	const sha = await sha256Hex(imageBytes);
	const dup = await env.DB.prepare(
		"SELECT id, status FROM jobs WHERE input_sha256 = ? AND COALESCE(kind,'character') = ? AND COALESCE(options,'') = ? AND hidden = 0 AND status IN ('queued','running','done') ORDER BY created_at DESC LIMIT 1"
	)
		.bind(sha, kind, optionsText ?? '')
		.first<{ id: string; status: string }>();
	if (dup) return json({ id: dup.id, status: dup.status, duplicate: true });

	const queueMax = num(env.QUEUE_MAX, 5);
	const q = await env.DB.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status IN ('queued','running')").first<{ n: number }>();
	if (q && Number(q.n) >= queueMax) return err(429, 'queue_full', `대기열이 가득 찼습니다(${queueMax}). 잠시 후 다시 시도해 주세요`);

	const id = crypto.randomUUID();
	const ownerToken = randomToken();
	const now = Date.now();

	await env.BUCKET.put(`priv/jobs/${id}/input.png`, imageBytes, { httpMetadata: { contentType: 'image/png' } });
	const uploadMeta: { name: string; bytes: number }[] = [];
	for (const u of uploads) {
		await env.BUCKET.put(`priv/jobs/${id}/clips/${u.name}.fbx`, u.bytes, {
			httpMetadata: { contentType: 'application/octet-stream' },
		});
		uploadMeta.push({ name: u.name, bytes: u.bytes.byteLength });
	}

	await env.DB.prepare(
		`INSERT INTO jobs (id, status, step, progress, created_at, owner_token_hash, input_sha256, input_name,
                       public, hidden, anim_spec, upload_clips, kind, options)
     VALUES (?, 'queued', NULL, 0, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
	)
		.bind(
			id,
			now,
			await sha256Text(ownerToken),
			sha,
			image.name ? image.name.slice(0, 200) : null,
			String(form.get('public') ?? '1') === '0' ? 0 : 1,
			spec.anims.length || spec.default ? JSON.stringify(spec) : null,
			uploadMeta.length ? JSON.stringify(uploadMeta) : null,
			kind,
			optionsText
		)
		.run();

	const row = await getJob(env, id);
	return json({ id, owner_token: ownerToken, ...(row ? await publicView(env, row) : {}) }, { status: 201 });
}

// ------------------------------------------------------------------ 집 PC 워커용

async function touchWorker(env: Env): Promise<void> {
	await env.DB.prepare("INSERT INTO worker (k, v) VALUES ('last_seen', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v")
		.bind(String(Date.now()))
		.run();
}

/** 가장 오래된 queued 1건을 running 으로 — UPDATE 의 changes 로 경합을 막는다. */
async function claim(env: Env): Promise<Response> {
	await touchWorker(env);
	for (let attempt = 0; attempt < 3; attempt++) {
		const cand = await env.DB.prepare("SELECT id FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1").first<{ id: string }>();
		if (!cand) return json({ job: null });
		const now = Date.now();
		const upd = await env.DB.prepare(
			"UPDATE jobs SET status='running', started_at=?, heartbeat_at=?, step='claim', progress=0 WHERE id=? AND status='queued'"
		)
			.bind(now, now, cand.id)
			.run();
		if (upd.meta.changes !== 1) continue; // 다른 폴링이 먼저 가져갔다 → 다음 후보
		const row = await getJob(env, cand.id);
		if (!row) continue;
		let spec: unknown = null;
		try {
			spec = row.anim_spec ? JSON.parse(row.anim_spec) : null;
		} catch {
			spec = null;
		}
		return json({
			job: {
				id: row.id,
				input_sha256: row.input_sha256,
				input_name: row.input_name,
				anim_spec: spec,
				upload_clips: row.upload_clips ? JSON.parse(row.upload_clips) : [],
				kind: row.kind || 'character',
				options: parseObj(row.options) ?? {},
				created_at: row.created_at,
			},
		});
	}
	return json({ job: null });
}

async function sendInput(env: Env, id: string): Promise<Response> {
	const obj = await env.BUCKET.get(`priv/jobs/${id}/input.png`);
	if (!obj) return err(404, 'not_found', '입력 이미지가 없습니다');
	return new Response(obj.body, { headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } });
}

async function sendClip(env: Env, id: string, name: string): Promise<Response> {
	if (!CLIP_NAME_RE.test(name)) return err(400, 'bad_clip_name', '클립 이름 형식 오류');
	const obj = await env.BUCKET.get(`priv/jobs/${id}/clips/${name}.fbx`);
	if (!obj) return err(404, 'not_found', '클립이 없습니다');
	return new Response(obj.body, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } });
}

async function reportProgress(req: Request, env: Env, id: string): Promise<Response> {
	await touchWorker(env);
	const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
	const row = await getJob(env, id);
	if (!row) return err(404, 'not_found', '작업이 없습니다');
	const step = body.step === undefined || body.step === null ? row.step : String(body.step).slice(0, 40);
	const progress = Math.max(0, Math.min(100, Math.round(num(String(body.progress ?? row.progress ?? 0), 0))));
	const logTail = body.log_tail === undefined || body.log_tail === null ? row.log_tail : String(body.log_tail).slice(-2000);
	await env.DB.prepare('UPDATE jobs SET step=?, progress=?, log_tail=?, heartbeat_at=? WHERE id=?')
		.bind(step, progress, logTail, Date.now(), id)
		.run();
	// 운영자가 중단시킨 작업이면 워커가 즉시 멈출 수 있게 알려준다
	return json({ ok: true, cancelled: row.status !== 'running' && row.status !== 'queued', status: row.status });
}

/**
 * 큰 산출물(삼각형 '제한 없음' 등)은 R2 multipart 로 나눠 받는다 (2026-10-18). Worker 요청 본문 상한이 100MB 라서.
 * ?action=create → upload_id / ?action=part&upload_id=&part=N (PUT, 본문 = 조각) / ?action=complete (POST {parts:[{part,etag}]}) / ?action=abort
 */
async function multipartFile(req: Request, env: Env, id: string, name: string, url: URL): Promise<Response> {
	if (!OUT_NAME_RE.test(name)) return err(400, 'bad_name', `허용되지 않는 산출물 이름: ${name.slice(0, 80)}`);
	const row = await getJob(env, id);
	if (!row) return err(404, 'not_found', '작업이 없습니다');
	const key = `p/${id}/${name}`;
	const action = url.searchParams.get('action');
	if (action === 'create' && req.method === 'POST') {
		const mpu = await env.BUCKET.createMultipartUpload(key, {
			httpMetadata: { contentType: ctFor(name), cacheControl: 'public, max-age=31536000, immutable' },
		});
		return json({ ok: true, upload_id: mpu.uploadId });
	}
	const uploadId = url.searchParams.get('upload_id') ?? '';
	if (!uploadId) return err(400, 'no_upload_id', 'upload_id 가 필요합니다');
	const mpu = env.BUCKET.resumeMultipartUpload(key, uploadId);
	if (action === 'part' && req.method === 'PUT') {
		const n = Number(url.searchParams.get('part'));
		if (!Number.isInteger(n) || n < 1 || n > 10000) return err(400, 'bad_part', 'part 는 1~10000');
		if (!req.body) return err(400, 'no_body', '본문이 없습니다');
		const part = await mpu.uploadPart(n, req.body);
		await env.DB.prepare('UPDATE jobs SET heartbeat_at=? WHERE id=?').bind(Date.now(), id).run();
		return json({ ok: true, part: part.partNumber, etag: part.etag });
	}
	if (action === 'complete' && req.method === 'POST') {
		const body = (await req.json().catch(() => ({}))) as { parts?: { part?: unknown; etag?: unknown }[] };
		const parts = (body.parts ?? []).map((p) => ({ partNumber: Number(p.part), etag: String(p.etag ?? '') }));
		if (!parts.length || parts.some((p) => !Number.isInteger(p.partNumber) || !p.etag)) return err(400, 'bad_parts', 'parts 형식 오류');
		await mpu.complete(parts);
		const files = await addFile(env, id, name);
		return json({ ok: true, name, url: `${env.ASSETS_BASE}/p/${id}/${name}`, files });
	}
	if (action === 'abort' && req.method === 'POST') {
		await mpu.abort();
		return json({ ok: true });
	}
	return err(400, 'bad_action', 'action 은 create/part/complete/abort');
}

/** 산출물 목록에 이름을 더한다(이미 있으면 그대로). */
async function addFile(env: Env, id: string, name: string): Promise<string[]> {
	const row = await getJob(env, id);
	const files = parseList(row?.files ?? null);
	if (!files.includes(name)) files.push(name);
	await env.DB.prepare('UPDATE jobs SET files=?, heartbeat_at=? WHERE id=?').bind(JSON.stringify(files), Date.now(), id).run();
	return files;
}

async function putFile(req: Request, env: Env, id: string, name: string): Promise<Response> {
	if (!OUT_NAME_RE.test(name)) return err(400, 'bad_name', `허용되지 않는 산출물 이름: ${name.slice(0, 80)}`);
	const row = await getJob(env, id);
	if (!row) return err(404, 'not_found', '작업이 없습니다');
	if (!req.body) return err(400, 'no_body', '본문이 없습니다');
	await env.BUCKET.put(`p/${id}/${name}`, req.body, {
		httpMetadata: { contentType: ctFor(name), cacheControl: 'public, max-age=31536000, immutable' },
	});
	const files = parseList(row.files);
	if (!files.includes(name)) files.push(name);
	await env.DB.prepare('UPDATE jobs SET files=?, heartbeat_at=? WHERE id=?').bind(JSON.stringify(files), Date.now(), id).run();
	return json({ ok: true, name, url: `${env.ASSETS_BASE}/p/${id}/${name}`, files });
}

async function finish(req: Request, env: Env, id: string): Promise<Response> {
	await touchWorker(env);
	const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
	const row = await getJob(env, id);
	if (!row) return err(404, 'not_found', '작업이 없습니다');

	const ok = b.ok === true;
	const crash = b.comfy_crash === true;
	let errorPublic: string | null = b.error_public === undefined || b.error_public === null ? null : String(b.error_public).slice(0, 300);
	if (!ok && !errorPublic) {
		errorPublic = crash
			? '처리 중 생성 서버가 재시작되었습니다. 같은 이미지로 다시 접수해 주세요.'
			: '변환에 실패했습니다. 다른 이미지로 다시 시도해 주세요.';
	}
	const files = Array.isArray(b.files) ? b.files.map(String).filter((n) => OUT_NAME_RE.test(n)) : parseList(row.files);
	const toInt = (v: unknown): number | null => {
		if (v === undefined || v === null || v === '') return null;
		const n = Number(v);
		return Number.isFinite(n) ? Math.trunc(n) : null;
	};

	await env.DB.prepare(
		`UPDATE jobs SET status=?, step=?, progress=?, finished_at=?, heartbeat_at=?,
                     seed_used=?, wrap_used=?, skeleton_src=?, body_type=?, anim_default=?, worker_job_id=?,
                     files=?, error_public=?, error_private=?, log_tail=? WHERE id=?`
	)
		.bind(
			ok ? 'done' : 'failed',
			ok ? 'done' : 'failed',
			ok ? 100 : (row.progress ?? 0),
			Date.now(),
			Date.now(),
			toInt(b.seed_used),
			b.wrap_used === undefined || b.wrap_used === null ? null : b.wrap_used ? 1 : 0,
			b.skeleton_src ? String(b.skeleton_src).slice(0, 40) : null,
			b.body_type ? String(b.body_type).slice(0, 40) : null,
			b.anim_default ? String(b.anim_default).slice(0, 80) : null,
			b.worker_job_id ? String(b.worker_job_id).slice(0, 80) : null,
			JSON.stringify(files),
			errorPublic,
			b.error_private ? String(b.error_private).slice(0, 4000) : null,
			b.log_tail ? String(b.log_tail).slice(-2000) : row.log_tail,
			id
		)
		.run();

	// 성공했으면 입력 이미지는 결과 페이지용으로 남기고, 업로드 클립은 산출물에 반영됐으므로 지운다
	if (ok) {
		for (const name of uploadClipNames(row.upload_clips)) {
			await env.BUCKET.delete(`priv/jobs/${id}/clips/${name}.fbx`);
		}
	}
	return json({ ok: true, status: ok ? 'done' : 'failed' });
}

// ------------------------------------------------------------------ 운영자

async function admin(req: Request, env: Env, id: string): Promise<Response> {
	const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
	const row = await getJob(env, id);
	if (!row) return err(404, 'not_found', '작업이 없습니다');
	if (b.hidden !== undefined) {
		await env.DB.prepare('UPDATE jobs SET hidden=? WHERE id=?').bind(b.hidden ? 1 : 0, id).run();
	}
	if (b.delete_input === true) {
		await env.BUCKET.delete(`priv/jobs/${id}/input.png`);
	}
	if (b.requeue === true) {
		await env.DB.prepare(
			"UPDATE jobs SET status='queued', step=NULL, progress=0, started_at=NULL, finished_at=NULL, heartbeat_at=NULL, error_public=NULL, error_private=NULL WHERE id=?"
		)
			.bind(id)
			.run();
	}
	if (b.delete === true) {
		const listed = await env.BUCKET.list({ prefix: `p/${id}/` });
		for (const o of listed.objects) await env.BUCKET.delete(o.key);
		await env.BUCKET.delete(`priv/jobs/${id}/input.png`);
		await env.DB.prepare('DELETE FROM jobs WHERE id=?').bind(id).run();
		return json({ ok: true, deleted: true });
	}
	const after = await getJob(env, id);
	return json({ ok: true, job: after ? await publicView(env, after) : null });
}

// ------------------------------------------------------------------ 갤러리 (P4 준비, 지금도 동작)

async function gallery(env: Env, url: URL): Promise<Response> {
	const limit = Math.max(1, Math.min(48, num(url.searchParams.get('limit') ?? undefined, 24)));
	const cursor = num(url.searchParams.get('cursor') ?? undefined, 0);
	const rows = await env.DB.prepare(
		`SELECT * FROM jobs WHERE status='done' AND public=1 AND hidden=0 AND finished_at < ?
     ORDER BY finished_at DESC LIMIT ?`
	)
		.bind(cursor > 0 ? cursor : Number.MAX_SAFE_INTEGER, limit)
		.all<JobRow>();
	const items = await Promise.all((rows.results ?? []).map((r) => publicView(env, r)));
	const last = items.length === limit ? (rows.results ?? [])[items.length - 1].finished_at : null;
	return json({ items, next_cursor: last }, {}, { 'cache-control': 'public, max-age=60' });
}

// ------------------------------------------------------------------ 라우터

async function route(req: Request, env: Env): Promise<Response> {
	const url = new URL(req.url);
	const seg = url.pathname.split('/').filter(Boolean); // ["jobs","<id>"] 등
	const m = req.method;

	if (!seg.length) return json({ service: 'plota fbx-api', ok: true });
	if (seg[0] === 'health' && m === 'GET') {
		return json({ ok: true, worker_online: await workerOnline(env), now: Date.now() });
	}

	// ---- 집 PC 워커 (Bearer WORKER_TOKEN)
	if (seg[0] === 'worker') {
		if (!isWorker(req, env)) return err(401, 'unauthorized', '워커 토큰이 필요합니다');
		if (seg[1] === 'claim' && m === 'POST') return claim(env);
		if (seg[1] === 'ping' && m === 'POST') {
			await touchWorker(env);
			return json({ ok: true });
		}
		if (seg[1] === 'jobs' && seg[2]) {
			const id = seg[2];
			if (seg[3] === 'input' && m === 'GET') return sendInput(env, id);
			if (seg[3] === 'clips' && seg[4] && m === 'GET') return sendClip(env, id, seg[4]);
			if (seg[3] === 'progress' && m === 'POST') return reportProgress(req, env, id);
			if (seg[3] === 'files' && seg.length >= 5 && m === 'PUT') return putFile(req, env, id, seg.slice(4).join('/'));
			if (seg[3] === 'mpu' && seg.length >= 5) return multipartFile(req, env, id, seg.slice(4).join('/'), url);
			if (seg[3] === 'finish' && m === 'POST') return finish(req, env, id);
		}
		return err(404, 'not_found', '없는 워커 엔드포인트');
	}

	// ---- 운영자 (Bearer ADMIN_TOKEN)
	if (seg[0] === 'admin') {
		if (!isAdmin(req, env)) return err(401, 'unauthorized', '운영자 토큰이 필요합니다');
		if (seg[1] === 'jobs' && seg[2] && m === 'POST') return admin(req, env, seg[2]);
		if (seg[1] === 'jobs' && m === 'GET') {
			const rows = await env.DB.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50').all<JobRow>();
			return json({
				items: (rows.results ?? []).map((r) => ({
					id: r.id,
					status: r.status,
					step: r.step,
					progress: r.progress,
					hidden: Boolean(r.hidden),
					created_at: r.created_at,
					body_type: r.body_type,
					skeleton_src: r.skeleton_src,
					seed_used: r.seed_used,
					error_public: r.error_public,
					error_private: r.error_private,
				})),
			});
		}
		return err(404, 'not_found', '없는 운영 엔드포인트');
	}

	// ---- 브라우저
	if (seg[0] === 'jobs') {
		if (seg.length === 1 && m === 'POST') return createJob(req, env);
		if (seg.length === 1 && m === 'GET') return gallery(env, url);

		const id = seg[1];
		if (!id) return err(404, 'not_found', '작업 id 가 없습니다');
		const row = await getJob(env, id);
		if (!row || row.hidden) return err(404, 'not_found', '작업이 없습니다');

		if (seg[2] === 'input.png' && m === 'GET') return sendInput(env, id);
		if (seg.length === 2 && m === 'GET') return json(await publicView(env, row));
		if (seg.length === 2 && m === 'PATCH') {
			const given = bearer(req);
			if (!given || (await sha256Text(given)) !== row.owner_token_hash) {
				return err(403, 'forbidden', '이 작업을 수정할 권한이 없습니다');
			}
			const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
			const title = b.title === undefined ? row.title : String(b.title).slice(0, 120);
			const pub = b.public === undefined ? row.public : b.public ? 1 : 0;
			await env.DB.prepare('UPDATE jobs SET title=?, public=? WHERE id=?').bind(title, pub, id).run();
			const after = await getJob(env, id);
			return json(after ? await publicView(env, after) : {});
		}
	}

	return err(404, 'not_found', '없는 경로');
}

// ------------------------------------------------------------------ cron

async function sweep(env: Env): Promise<void> {
	const now = Date.now();
	const leaseMs = num(env.LEASE_LOST_SEC, 900) * 1000;

	// 1. heartbeat 끊긴 running → failed (워커 또는 PC 가 사라진 경우)
	const lost = await env.DB.prepare("SELECT id FROM jobs WHERE status='running' AND COALESCE(heartbeat_at, started_at, created_at) < ?")
		.bind(now - leaseMs)
		.all<{ id: string }>();
	for (const r of lost.results ?? []) {
		await env.DB.prepare(
			"UPDATE jobs SET status='failed', step='failed', finished_at=?, error_public=?, error_private=? WHERE id=? AND status='running'"
		)
			.bind(now, '처리 중 연결이 끊겼습니다. 다시 접수해 주세요.', 'worker lost (heartbeat timeout)', r.id)
			.run();
	}

	// 2. 실패한 지 오래된 작업의 입력·클립 삭제 (D1 행은 통계용으로 남긴다)
	const keepMs = num(env.INPUT_KEEP_DAYS, 7) * 86400 * 1000;
	const old = await env.DB.prepare("SELECT id FROM jobs WHERE status='failed' AND finished_at < ? LIMIT 50")
		.bind(now - keepMs)
		.all<{ id: string }>();
	for (const r of old.results ?? []) {
		const listed = await env.BUCKET.list({ prefix: `priv/jobs/${r.id}/` });
		for (const o of listed.objects) await env.BUCKET.delete(o.key);
	}
}

// ------------------------------------------------------------------ 진입점

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const cors = corsHeaders(env, req);
		if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
		try {
			const res = await route(req, env);
			const headers = new Headers(res.headers);
			for (const [k, v] of Object.entries(cors)) headers.set(k, v);
			return new Response(res.body, { status: res.status, headers });
		} catch (e) {
			const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
			console.error('unhandled', msg);
			return json({ error: 'internal', message: '서버 오류' }, { status: 500 }, cors);
		}
	},

	async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(sweep(env));
	},
} satisfies ExportedHandler<Env>;
