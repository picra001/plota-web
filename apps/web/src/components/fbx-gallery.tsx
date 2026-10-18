"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "./localized-link";
import { FbxApiError, forgetJob, getJob, inputImageUrl, listPublicJobs, myJobIds, type Job } from "@/lib/fbx-api";

const MY_LIMIT = 12;

const STATUS_TAG: Record<Job["status"], string> = { queued: "In the queue", running: "In progress", done: "Finished", failed: "Stopped" };

function jobImage(job: Job): string {
  return job.files["thumb.webp"] || job.files["preview.png"] || inputImageUrl(job.id);
}

function JobCard({ job, showStatus }: { job: Job; showStatus?: boolean }) {
  const [broken, setBroken] = useState(false);
  const date = new Date(job.finished_at || job.created_at).toLocaleDateString("en", { month: "short", day: "numeric" });
  return (
    <Link className="asset-card" href={`/en/fbx/job?id=${encodeURIComponent(job.id)}`}>
      <div className="asset-card-image fbx-card-image">
        <span className="art-corner">{job.status === "done" ? "RIGGED / FBX" : "DRAWING"}</span>
        {broken
          ? <div className="fbx-card-thumb" aria-hidden="true" />
          : <img className="fbx-card-thumb" src={jobImage(job)} alt="" loading="lazy" onError={() => setBroken(true)} />}
      </div>
      <div className="asset-card-info">
        <div><h3>{job.title || "Untitled character"}</h3><p>{date}</p></div>
        <span className="mini-tag">{showStatus ? STATUS_TAG[job.status] : "OVERDARE"}</span>
      </div>
    </Link>
  );
}

/** 이 브라우저에서 접수한 작업(편집 키가 있는 것). 비공개 작업도 여기에는 보인다. */
function MyCreations() {
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
        <div><p className="eyebrow">FROM THIS BROWSER</p><h2>Your creations</h2></div>
        <Link className="text-link" href="/en/fbx/create">Send another drawing</Link>
      </div>
      <div className="asset-grid">{jobs.map(j => <JobCard key={j.id} job={j} showStatus />)}</div>
    </section>
  );
}

/** 완료되어 공개된 작업 전체. */
function CommunityCreations() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (from: number | null) => {
    setLoading(true);
    try {
      const page = await listPublicJobs(from);
      setJobs(prev => {
        const seen = new Set(prev.map(j => j.id));
        return [...prev, ...page.items.filter(j => !seen.has(j.id))];
      });
      setCursor(page.next_cursor);
      setError(null);
    } catch (e) {
      setError(e instanceof FbxApiError ? e.message : "Could not load the creations.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(null); }, [load]);

  return (
    <section className="section-block">
      <div className="section-heading">
        <div><p className="eyebrow">MADE WITH FBX STUDIO</p><h2>Community creations</h2></div>
      </div>
      {error && <p className="fbx-error" role="alert">{error}</p>}
      {jobs.length > 0 && <div className="asset-grid">{jobs.map(j => <JobCard key={j.id} job={j} />)}</div>}
      {!loading && !error && !jobs.length && (
        <div className="empty-state"><h3>Nothing shared yet.</h3><p>Finished characters that are left public show up here.</p></div>
      )}
      {loading && <p className="small-note" aria-live="polite">Loading…</p>}
      {!loading && cursor && <button className="button outline fbx-more" onClick={() => load(cursor)}>Show more</button>}
    </section>
  );
}

export function FbxGallery() {
  return <><MyCreations /><CommunityCreations /></>;
}
