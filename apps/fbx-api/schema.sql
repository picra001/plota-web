-- plota fbx-api D1 스키마 (계획 §6-3 + P2 결정 반영)
-- 적용: pnpm --filter @plota/fbx-api db:apply      (로컬: db:apply:local)
-- 재적용 안전(IF NOT EXISTS). 컬럼 추가 시에는 ALTER TABLE 을 아래 §마이그레이션에 덧붙인다.

CREATE TABLE IF NOT EXISTS jobs (
  id               TEXT PRIMARY KEY,          -- crypto.randomUUID()
  status           TEXT NOT NULL,             -- queued|running|done|failed
  step             TEXT,                      -- 3d|rig|finalize|convert|anim|upload
  progress         INTEGER DEFAULT 0,

  created_at       INTEGER NOT NULL,          -- epoch ms
  started_at       INTEGER,
  finished_at      INTEGER,
  heartbeat_at     INTEGER,                   -- 워커가 progress 를 보낼 때마다 갱신

  owner_token_hash TEXT NOT NULL,             -- sha256(owner_token)
  input_sha256     TEXT NOT NULL,             -- 중복 제거 키
  input_name       TEXT,                      -- 원본 파일 이름(표시용)

  public           INTEGER DEFAULT 1,
  hidden           INTEGER DEFAULT 0,
  title            TEXT,
  views            INTEGER DEFAULT 0,
  downloads        INTEGER DEFAULT 0,

  -- 워커가 finish 에 돌려주는 결과값
  seed_used        INTEGER,
  wrap_used        INTEGER,
  skeleton_src     TEXT,                      -- unirig|template
  body_type        TEXT,                      -- normal|bighead
  anim_default     TEXT,                      -- final.fbx 에 들어간 클립 이름
  worker_job_id    TEXT,                      -- 집 PC 로컬 job id (serve_data/jobs/<id>)

  -- 요청·산출물
  anim_spec        TEXT,                      -- inbox json 그대로: {"anims":[...],"default":"..."}
  upload_clips     TEXT,                      -- [{"name":"Jump","bytes":1234567}] 사용자 업로드 FBX
  files            TEXT,                      -- 업로드 끝난 R2 파일 이름 목록 ["final.fbx",...]

  error_public     TEXT,
  error_private    TEXT,
  log_tail         TEXT
);

CREATE INDEX IF NOT EXISTS jobs_queue   ON jobs(status, created_at);
CREATE INDEX IF NOT EXISTS jobs_dedup   ON jobs(input_sha256);
CREATE INDEX IF NOT EXISTS jobs_gallery ON jobs(public, hidden, finished_at);

-- 워커 생존 표시 등 단일 값 보관
CREATE TABLE IF NOT EXISTS worker (k TEXT PRIMARY KEY, v TEXT);

-- ---------------------------------------------------------------- 마이그레이션
-- 기존 배포에 컬럼을 더할 때만 주석을 풀어 1회 실행한다.
-- ALTER TABLE jobs ADD COLUMN anim_spec TEXT;
