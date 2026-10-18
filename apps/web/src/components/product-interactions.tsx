"use client";

import Link, { useUiLang } from "./localized-link";
import { useState } from "react";
import { assets, assetCategories, categoryLabel, type Asset, type AssetCategory } from "@/lib/mock-data";
import { AssetArt } from "./product-art";

export function AssetCard({ asset }: { asset: Asset }) {
  const lang = useUiLang();
  const t = asset.text[lang];
  return <Link className="asset-card" href={`/ko/fbx/assets/${asset.slug}`}><div className="asset-card-image" style={{ background: `${asset.color}26` }}><span className="art-corner">CONCEPT</span><AssetArt asset={asset} label={t.name} /></div><div className="asset-card-info"><div><h3>{t.name}</h3><p>{categoryLabel[lang][asset.category]}</p></div></div></Link>;
}

export function AssetLibrary() {
  const lang = useUiLang();
  const [category, setCategory] = useState<AssetCategory | "all">("all");
  const filtered = assets.filter(a => category === "all" || a.category === category);
  return <><div className="filter-row" aria-label={lang === "ko" ? "분류" : "Categories"}>{(["all", ...assetCategories] as const).map(c => <button key={c} aria-pressed={category === c} className={category === c ? "filter active" : "filter"} onClick={() => setCategory(c)}>{categoryLabel[lang][c]}</button>)}</div><div className="asset-grid">{filtered.map(a => <AssetCard key={a.slug} asset={a} />)}</div></>;
}
