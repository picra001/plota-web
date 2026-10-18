"use client";

import { useCallback, useEffect, useState } from "react";
import Link, { useUiLang } from "./localized-link";
import { FbxApiError, forgetJob, getJob, inputImageUrl, listPublicJobs, myJobIds, type Job } from "@/lib/fbx-api";

const MY_LIMIT = 12;

const COPY = {
  ko: {
    status: { queued: "대기 중", running: "진행 중", done: "완료", failed: "중단됨" }, untitled: "이름 없는 캐릭터",
    mine: "내 작품", sendMore: "새 그림 보내기", community: "모두의 작품", loadFail: "목록을 불러오지 못했습니다.",
    empty: "아직 공개된 작품이 없습니다.", loading: "불러오는 중…", more: "더 보기", date: "ko-KR",
  },
  en: {
    status: { queued: "In the queue", running: "In progress", done: "Finished", failed: "Stopped" }, untitled: "Untitled character",
    mine: "Your creations", sendMore: "Send another drawing", community: "Community creations", loadFail: "Could not load the creations.",
    empty: "Nothing shared yet.", loading: "Loading…", more: "Show more", date: "en",
  },
};

function jobImage(job: Job): string {
  return job.files["thumb.webp"] || job.files["preview.png"] || inputImageUrl(job.id);
}

function JobCard({ job, showStatus }: { job: Job; showStatus?: boolean }) {
  const t = COPY[useUiLang()];
  const [broken, setBroken] = useState(false);
  const date = new Date(job.finished_at || job.created_at).toLocaleDateString(t.date, { month: "short", day: "numeric" });
  return (
    <Link className="asset-card" href={`/ko/fbx/job?id=${encodeURIComponent(job.id)}`}>
      <div className="asset-card-image fbx-card-image">
        <span className="art-corner">{job.status === "done" ? "FBX" : "DRAWING"}</span>
        {broken
          ? <div className="fbx-card-thumb" aria-hidden="true" />
          : <img className="fbx-card-thumb" src={jobImage(job)} alt="" loading="lazy" onError={() => setBroken(true)} />}
      </div>
      <div className="asset-card-info">
        <div><h3>{job.title || t.untitled}</h3><p>{date}</p></div>
        {showStatus && <span className="mini-tag">{t.status[job.status]}</span>}
      </div>
    </Link>
  );
}

/** 이 브라우저에서 접수한 작업(편집 키가 있는 것). 비공개 작업도 여기에는 보인다. */
function MyCreations() {
  const t = COPY[useUiLang()];
  const [jobs, setJobs] = useState<Job[] | null>(null);
  useEffect(() => {
    const ids = myJobIds();
    if (!ids.length) { setJobs([]); return; }
    let alive = true;
    Promise.all(ids.map(async id => {
      try {
        return await getJob(id);
      } catch (e) {
        if (e instanceof FbxApiError && e.status === 404) forgetJob(id);
        return null;
      }
    })).then(list => {
      if (!alive) return;
      setJobs(list.filter((j): j is Job => Boolean(j)).sort((a, b) => b.created_at - a.created_at).slice(0, MY_LIMIT));
    });
    return () => { alive = false; };
  }, []);
  if (!jobs || !jobs.length) return null;
  return (
    <section className="section-block">
      <div className="section-heading">
        <h2>{t.mine}</h2>
        <Link className="text-link" href="/ko/fbx/create">{t.sendMore}</Link>
      </div>
      <div className="asset-grid">{jobs.map(j => <JobCard key={j.id} job={j} showStatus />)}</div>
    </section>
  );
}

/** 완료되어 공개된 작업 전체. */
function CommunityCreations() {
  const t = COPY[useUiLang()];
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);

  const load = useCallback(async (from: number | null) => {
    setLoading(true);
    try {
      const page = await listPublicJobs(from);
      setJobs(prev => {
        const seen = new Set(prev.map(j => j.id));
        return [...prev, ...page.items.filter(j => !seen.has(j.id))];
      });
      setCursor(page.next_cursor);
      setFailed(null);
    } catch (e) {
      setFailed(e instanceof FbxApiError ? e.message : "");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(null); }, [load]);

  return (
    <section className="section-block">
      <div className="section-heading"><h2>{t.community}</h2></div>
      {failed !== null && <p className="fbx-error" role="alert">{failed || t.loadFail}</p>}
      {jobs.length > 0 && <div className="asset-grid">{jobs.map(j => <JobCard key={j.id} job={j} />)}</div>}
      {!loading && failed === null && !jobs.length && <div className="empty-state"><p>{t.empty}</p></div>}
      {loading && <p className="small-note" aria-live="polite">{t.loading}</p>}
      {!loading && cursor && <button className="button outline fbx-more" onClick={() => load(cursor)}>{t.more}</button>}
    </section>
  );
}

export function FbxGallery() {
  return <><MyCreations /><CommunityCreations /></>;
}
