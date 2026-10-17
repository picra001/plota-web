"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import {
  DEFAULT_CLIP, LIBRARY_CLIPS, MAX_CLIPS, MAX_CLIP_BYTES, MAX_IMAGE_BYTES,
  FbxApiError, getHealth, rememberInvite, rememberJob, savedInvite, submitJob,
} from "@/lib/fbx-api";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function clipName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "");
  return stem.replace(/[^A-Za-z0-9_-]/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "Clip";
}

function sizeText(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FbxCreateApp() {
  const router = useRouter();
  const pathname = usePathname() || "/en/fbx/create";
  const segment = pathname.split("/")[1];
  const lang = isLocale(segment) ? segment : "en";

  const [invite, setInvite] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [clips, setClips] = useState<string[]>([DEFAULT_CLIP]);
  const [defaultClip, setDefaultClip] = useState(DEFAULT_CLIP);
  const [uploads, setUploads] = useState<{ name: string; file: File }[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const clipInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("invite");
    setInvite(code || savedInvite());
  }, []);

  useEffect(() => {
    let alive = true;
    getHealth().then(h => { if (alive) setOnline(h.worker_online); }).catch(() => { if (alive) setOnline(null); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!image) { setImageUrl(null); return; }
    const url = URL.createObjectURL(image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function pickImage(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { setError("Please choose a PNG, JPG, or WEBP image."); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError(`The image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`); return; }
    setImage(file);
  }

  function pickClip(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!/\.fbx$/i.test(file.name)) { setError("Animation clips must be FBX files from Mixamo."); return; }
    if (file.size > MAX_CLIP_BYTES) { setError(`${file.name} is larger than ${MAX_CLIP_BYTES / 1024 / 1024} MB.`); return; }
    const name = clipName(file.name);
    const total = new Set([...clips, ...uploads.map(u => u.name), name]).size;
    if (total > MAX_CLIPS) { setError(`You can request up to ${MAX_CLIPS} clips.`); return; }
    setUploads(prev => [...prev.filter(u => u.name !== name), { name, file }]);
    setDefaultClip(prev => prev || name);
  }

  function toggleClip(name: string) {
    setClips(prev => {
      const next = prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name];
      if (next.length + uploads.length > MAX_CLIPS) { setError(`You can request up to ${MAX_CLIPS} clips.`); return prev; }
      setError(null);
      return next;
    });
  }

  const allClips = [...clips, ...uploads.map(u => u.name)];
  const ready = Boolean(invite.trim() && image && consent && allClips.length && !busy);

  async function submit() {
    if (!image || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitJob({
        invite,
        image,
        clips,
        defaultClip: allClips.includes(defaultClip) ? defaultClip : allClips[0],
        uploads,
        isPublic: true,
      });
      rememberInvite(invite.trim());
      if (result.owner_token) rememberJob(result.id, result.owner_token);
      router.push(`/${lang}/fbx/job?id=${encodeURIComponent(result.id)}${result.duplicate ? "&again=1" : ""}`);
    } catch (e) {
      setError(e instanceof FbxApiError ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="creation-demo">
      <div className="creation-controls">
        <span className="eyebrow">01 / YOUR DRAWING</span>
        <h2>Send a drawing</h2>

        <label htmlFor="invite-code">Invite code</label>
        <input id="invite-code" className="fbx-input" value={invite} autoComplete="off" spellCheck={false}
          placeholder="Enter the code you were given" onChange={e => setInvite(e.target.value)} />

        <label htmlFor="drawing-file">Drawing</label>
        <div className={dragging ? "fbx-dropzone dragging" : "fbx-dropzone"}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pickImage(e.dataTransfer.files[0]); }}>
          <input id="drawing-file" ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp"
            onChange={e => pickImage(e.target.files?.[0])} />
          {image ? <p>{image.name} / {sizeText(image.size)}</p> : <p>Drop a PNG, JPG, or WEBP here, or choose a file. Up to 10 MB.</p>}
          <button type="button" className="button outline" onClick={() => imageInput.current?.click()}>
            {image ? "Choose another file" : "Choose a file"}
          </button>
        </div>
        <p className="small-note">One character per drawing, facing forward, arms away from the body. A plain background works best.</p>

        <span className="eyebrow">02 / ANIMATION</span>
        <fieldset className="fbx-fieldset">
          <legend>Clips to include</legend>
          {LIBRARY_CLIPS.map(name => (
            <label key={name} className="fbx-check">
              <input type="checkbox" checked={clips.includes(name)} onChange={() => toggleClip(name)} />
              <span>{name}</span>
            </label>
          ))}
          {uploads.map(u => (
            <label key={u.name} className="fbx-check">
              <input type="checkbox" checked readOnly />
              <span>{u.name} / your file</span>
              <button type="button" className="text-link" onClick={() => setUploads(prev => prev.filter(x => x.name !== u.name))}>Remove</button>
            </label>
          ))}
          <input ref={clipInput} type="file" accept=".fbx" hidden onChange={e => { pickClip(e.target.files?.[0]); if (clipInput.current) clipInput.current.value = ""; }} />
          <button type="button" className="button outline" onClick={() => clipInput.current?.click()}>Add a Mixamo FBX clip</button>
        </fieldset>
        {allClips.length > 1 && (
          <>
            <label htmlFor="default-clip">Clip to use in the main FBX</label>
            <select id="default-clip" value={allClips.includes(defaultClip) ? defaultClip : allClips[0]} onChange={e => setDefaultClip(e.target.value)}>
              {allClips.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </>
        )}
        <p className="small-note">Download Mixamo clips as FBX Binary, With Skin, 30 fps. Up to {MAX_CLIPS} clips per drawing.</p>

        <span className="eyebrow">03 / BEFORE YOU SEND</span>
        <label className="fbx-check">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span>I own this drawing and agree that it and the result are published on a page anyone with the link can open.</span>
        </label>

        {error && <p className="fbx-error" role="alert">{error}</p>}
        <button className="button primary wide" disabled={!ready} onClick={submit}>
          {busy ? "Sending…" : "Send the drawing"}
        </button>
        {online === false && <p className="small-note">The studio PC is offline right now. Your drawing is queued and starts as soon as it is back.</p>}
      </div>

      <div className="creation-preview">
        <span className="eyebrow">{image ? "YOUR DRAWING" : "WHAT YOU GET"}</span>
        {imageUrl
          ? <img className="fbx-drawing-preview" src={imageUrl} alt="The drawing you selected" />
          : <div className="fbx-placeholder" aria-hidden="true" />}
        <div>
          <h3>{image ? "Ready to send" : "A rigged FBX, from one drawing"}</h3>
          <p>
            {image
              ? "The studio PC builds a 3D mesh, fits a skeleton, applies the animation, and returns the files. One drawing takes about four to ten minutes once it starts."
              : "You get a single rigged FBX with mesh, skeleton, and animation, a GLB you can turn around in the browser, and a clip FBX for every animation you asked for."}
          </p>
          <p className="small-note">Processing runs on one PC with one GPU, so drawings are handled one at a time.</p>
        </div>
      </div>
    </div>
  );
}
