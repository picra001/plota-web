"use client";

import Link from "next/link";
import { useState } from "react";
import { assets, type Asset } from "@/lib/mock-data";
import { AssetArt } from "./product-art";

export function AssetCard({ asset }: { asset: Asset }) {
  return <Link className="asset-card" href={`/en/fbx/assets/${asset.slug}`}><div className="asset-card-image" style={{ background: `${asset.color}26` }}><span className="art-corner">CONCEPT / FBX</span><AssetArt asset={asset} /><span className="round-arrow">↗</span></div><div className="asset-card-info"><div><h3>{asset.name}</h3><p>{asset.category}</p></div><span className="mini-tag">{asset.platform}</span></div></Link>;
}

export function AssetLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All assets");
  const [platform, setPlatform] = useState("All platforms");
  const filtered = assets.filter(a => (category === "All assets" || a.category === category) && (platform === "All platforms" || a.platform === platform) && `${a.name} ${a.category}`.toLowerCase().includes(query.toLowerCase()));
  return <><div className="library-controls"><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search assets" placeholder="Search your next building block…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Target platform" value={platform} onChange={e => setPlatform(e.target.value)}><option>All platforms</option><option>Roblox</option><option>OVERDARE</option></select></div><div className="filter-row" aria-label="Asset categories">{["All assets", "Characters", "Buildings", "Nature", "Props"].map(c => <button key={c} aria-pressed={category === c} className={category === c ? "filter active" : "filter"} onClick={() => setCategory(c)}>{c}</button>)}<span aria-live="polite">{filtered.length} concepts</span></div><div className="asset-grid">{filtered.map(a => <AssetCard key={a.slug} asset={a} />)}</div>{!filtered.length && <div className="empty-state"><h3>No matching assets yet.</h3><p>Try another category or a shorter search.</p><button className="button outline" onClick={() => { setQuery(""); setCategory("All assets"); setPlatform("All platforms"); }}>Clear filters</button></div>}</>;
}

export function CreationDemo() {
  const [platform, setPlatform] = useState("Roblox");
  const [prompt, setPrompt] = useState("A friendly little robot for a forest adventure");
  const [preview, setPreview] = useState(false);
  return <div className="creation-demo"><div className="creation-controls"><span className="eyebrow">01 / THE IDEA</span><h2>What will you make?</h2><label htmlFor="concept-prompt">Describe your asset</label><textarea id="concept-prompt" maxLength={500} value={prompt} onChange={e => { setPrompt(e.target.value); setPreview(false); }} rows={4} /><label htmlFor="platform">Target platform</label><select id="platform" value={platform} onChange={e => { setPlatform(e.target.value); setPreview(false); }}><option>Roblox</option><option>OVERDARE</option></select><button className="button primary" disabled={!prompt.trim()} onClick={() => setPreview(true)}>Explore sample result <span>↗</span></button><p className="small-note">Interactive preview. This shows a preset concept; no AI generation or upload takes place.</p></div><div className="creation-preview"><span className="eyebrow">02 / {preview ? "SAMPLE RESULT" : "A LITTLE POSSIBILITY"}</span><AssetArt asset={assets[0]} /><div aria-live="polite">{preview ? <><h3>Your {platform} concept preview</h3><p className="prompt-quote">“{prompt}”</p><Link href="/en/fbx/assets/scout-bot" className="text-link">Explore the sample asset ↗</Link></> : <><h3>From a small idea to a bigger world.</h3><p>Try the demo to see how the workflow will feel.</p></>}</div></div></div>;
}
