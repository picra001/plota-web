"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { useUiLang } from "./localized-link";
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

const COPY = {
  ko: {
    badType: "PNG, JPG, WEBP 이미지만 올릴 수 있습니다.", tooBig: (mb: number) => `이미지는 ${mb}MB 이하여야 합니다.`,
    badClip: "애니메이션 클립은 Mixamo FBX 파일이어야 합니다.", clipBig: (n: string, mb: number) => `${n} 파일이 ${mb}MB 를 넘습니다.`,
    maxClips: (n: number) => `클립은 최대 ${n}개까지 고를 수 있습니다.`, failed: "문제가 생겼습니다. 다시 시도해 주세요.",
    s1: "01 / 그림", invite: "초대 코드", invitePh: "받은 코드를 입력하세요", drawing: "그림",
    drop: "PNG·JPG·WEBP 파일을 끌어다 놓거나 고르세요. 10MB 이하.", choose: "파일 고르기", chooseAgain: "다른 파일 고르기",
    s2: "02 / 애니메이션", clips: "넣을 동작", yours: "내 파일", remove: "빼기", addClip: "Mixamo FBX 클립 추가",
    mainClip: "메인 FBX에 넣을 동작", clipNote: (n: number) => `Mixamo 에서 FBX Binary · With Skin · 30fps 로 받아 주세요. 최대 ${n}개.`,
    s3: "03 / 보내기 전에", consent: "내가 권리를 가진 그림이며, 그림과 결과가 링크를 아는 누구나 볼 수 있는 페이지에 올라가는 데 동의합니다.",
    sending: "보내는 중…", send: "그림 보내기", offline: "지금은 작업실 PC가 꺼져 있습니다. 대기열에 올려 두면 켜지는 대로 처리합니다.",
    preview: "고른 그림", previewAlt: "고른 그림", ready: "보낼 준비 완료", empty: "그림 한 장이면 됩니다", time: "시작 후 약 4~10분 걸립니다.",
  },
  en: {
    badType: "Please choose a PNG, JPG, or WEBP image.", tooBig: (mb: number) => `The image is larger than ${mb} MB.`,
    badClip: "Animation clips must be FBX files from Mixamo.", clipBig: (n: string, mb: number) => `${n} is larger than ${mb} MB.`,
    maxClips: (n: number) => `You can request up to ${n} clips.`, failed: "Something went wrong. Please try again.",
    s1: "01 / DRAWING", invite: "Invite code", invitePh: "Enter the code you were given", drawing: "Drawing",
    drop: "Drop a PNG, JPG, or WEBP here, or choose a file. Up to 10 MB.", choose: "Choose a file", chooseAgain: "Choose another file",
    s2: "02 / ANIMATION", clips: "Clips to include", yours: "your file", remove: "Remove", addClip: "Add a Mixamo FBX clip",
    mainClip: "Clip to use in the main FBX", clipNote: (n: number) => `Download Mixamo clips as FBX Binary, With Skin, 30 fps. Up to ${n}.`,
    s3: "03 / BEFORE YOU SEND", consent: "I own this drawing and agree that it and the result are published on a page anyone with the link can open.",
    sending: "Sending…", send: "Send the drawing", offline: "The studio PC is offline. Your drawing will be queued and start when it is back.",
    preview: "YOUR DRAWING", previewAlt: "The drawing you selected", ready: "Ready to send", empty: "One drawing is all it takes", time: "Takes about four to ten minutes once it starts.",
  },
};

export function FbxCreateApp() {
  const router = useRouter();
  const pathname = usePathname() || "/ko/fbx/create";
  const segment = pathname.split("/")[1];
  const lang = isLocale(segment) ? segment : "ko";
  const t = COPY[useUiLang()];

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
    if (!IMAGE_TYPES.includes(file.type)) { setError(t.badType); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError(t.tooBig(MAX_IMAGE_BYTES / 1024 / 1024)); return; }
    setImage(file);
  }

  function pickClip(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!/\.fbx$/i.test(file.name)) { setError(t.badClip); return; }
    if (file.size > MAX_CLIP_BYTES) { setError(t.clipBig(file.name, MAX_CLIP_BYTES / 1024 / 1024)); return; }
    const name = clipName(file.name);
    const total = new Set([...clips, ...uploads.map(u => u.name), name]).size;
    if (total > MAX_CLIPS) { setError(t.maxClips(MAX_CLIPS)); return; }
    setUploads(prev => [...prev.filter(u => u.name !== name), { name, file }]);
    setDefaultClip(prev => prev || name);
  }

  function toggleClip(name: string) {
    setClips(prev => {
      const next = prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name];
      if (next.length + uploads.length > MAX_CLIPS) { setError(t.maxClips(MAX_CLIPS)); return prev; }
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
      setError(e instanceof FbxApiError ? e.message : t.failed);
      setBusy(false);
    }
  }

  return (
    <div className="creation-demo">
      <div className="creation-controls">
        <span className="eyebrow">{t.s1}</span>

        <label htmlFor="invite-code">{t.invite}</label>
        <input id="invite-code" className="fbx-input" value={invite} autoComplete="off" spellCheck={false}
          placeholder={t.invitePh} onChange={e => setInvite(e.target.value)} />

        <label htmlFor="drawing-file">{t.drawing}</label>
        <div className={dragging ? "fbx-dropzone dragging" : "fbx-dropzone"}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pickImage(e.dataTransfer.files[0]); }}>
          <input id="drawing-file" ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp"
            onChange={e => pickImage(e.target.files?.[0])} />
          {image ? <p>{image.name} / {sizeText(image.size)}</p> : <p>{t.drop}</p>}
          <button type="button" className="button outline" onClick={() => imageInput.current?.click()}>
            {image ? t.chooseAgain : t.choose}
          </button>
        </div>

        <span className="eyebrow">{t.s2}</span>
        <fieldset className="fbx-fieldset">
          <legend>{t.clips}</legend>
          {LIBRARY_CLIPS.map(name => (
            <label key={name} className="fbx-check">
              <input type="checkbox" checked={clips.includes(name)} onChange={() => toggleClip(name)} />
              <span>{name}</span>
            </label>
          ))}
          {uploads.map(u => (
            <label key={u.name} className="fbx-check">
              <input type="checkbox" checked readOnly />
              <span>{u.name} / {t.yours}</span>
              <button type="button" className="text-link" onClick={() => setUploads(prev => prev.filter(x => x.name !== u.name))}>{t.remove}</button>
            </label>
          ))}
          <input ref={clipInput} type="file" accept=".fbx" hidden onChange={e => { pickClip(e.target.files?.[0]); if (clipInput.current) clipInput.current.value = ""; }} />
          <button type="button" className="button outline" onClick={() => clipInput.current?.click()}>{t.addClip}</button>
        </fieldset>
        {allClips.length > 1 && (
          <>
            <label htmlFor="default-clip">{t.mainClip}</label>
            <select id="default-clip" value={allClips.includes(defaultClip) ? defaultClip : allClips[0]} onChange={e => setDefaultClip(e.target.value)}>
              {allClips.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </>
        )}
        <p className="small-note">{t.clipNote(MAX_CLIPS)}</p>

        <span className="eyebrow">{t.s3}</span>
        <label className="fbx-check">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span>{t.consent}</span>
        </label>

        {error && <p className="fbx-error" role="alert">{error}</p>}
        <button className="button primary wide" disabled={!ready} onClick={submit}>
          {busy ? t.sending : t.send}
        </button>
        {online === false && <p className="small-note">{t.offline}</p>}
      </div>

      <div className="creation-preview">
        <span className="eyebrow">{t.preview}</span>
        {imageUrl
          ? <img className="fbx-drawing-preview" src={imageUrl} alt={t.previewAlt} />
          : <div className="fbx-placeholder" aria-hidden="true" />}
        <div>
          <h3>{image ? t.ready : t.empty}</h3>
          <p className="small-note">{t.time}</p>
        </div>
      </div>
    </div>
  );
}
