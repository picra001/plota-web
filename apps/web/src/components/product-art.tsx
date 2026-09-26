import type { Asset } from "@/lib/mock-data";

/** Small original vector illustrations: lightweight and independent of external image services. */
export function AssetArt({ asset, className = "" }: { asset: Pick<Asset, "shape" | "color" | "name">; className?: string }) {
  const c = asset.color;
  return <svg className={`asset-art ${className}`} viewBox="0 0 400 330" role="img" aria-label={`${asset.name} concept illustration`}>
    <ellipse cx="200" cy="282" rx="108" ry="16" fill="#202a23" opacity=".10" />
    <g stroke="#344036" strokeWidth="2" strokeLinejoin="round">
      {asset.shape === "robot" && <>
        <path d="M158 217v49l-27 13 52 2 10-18v-44M216 219v47l-8 13 51 2-12-18v-46" fill="#566453" />
        <path d="m143 139-31 19-13 66 24 9 24-62m110-30 27 19 17 62-24 12-27-58" fill={c} />
        <path d="m149 132 52-18 55 24v86l-57 20-52-22z" fill={c} />
        <path d="m201 114 55 24v86l-57 20z" fill="#000" opacity=".12" stroke="none" />
        <path d="m146 58 53-19 61 23v65l-59 20-56-22z" fill={c} />
        <path d="m155 75 91 3v35l-42 16-49-15z" fill="#303d35" />
        <path d="M176 92v8m48-8v8" stroke="#edecd4" strokeWidth="8" strokeLinecap="round" />
        <path d="M199 38V22" /><circle cx="199" cy="18" r="6" fill="#f2c263" />
        <path d="m169 171 49 5v20l-23 7-26-8z" fill="#f1e8cf" />
        <circle cx="231" cy="156" r="4" fill="#f0b66d" />
      </>}
      {asset.shape === "house" && <>
        <path d="m97 158 101-52 109 55v98l-105 32-105-44z" fill={c} />
        <path d="m202 178 105-17v98l-105 32z" fill="#000" opacity=".16" stroke="none" />
        <path d="m76 158 105-105 145 105-117 40z" fill="#5a6f60" />
        <path d="m181 53 28 145 117-40z" fill="#3b5349" />
        <path d="m133 198 33 11v62l-33-14z" fill="#4f5040" />
        <path d="m227 206 43-13v34l-43 13z" fill="#ead79b" /><path d="m248 200 1 33M229 221l38-12" />
        <path d="m250 107 1-56 24-7 18 10v80" fill="#ba8971" /><path d="m251 51 24 10 18-7M275 61v64" />
      </>}
      {asset.shape === "tree" && <>
        <path d="m186 185-4 87 22 12 18-11-10-88z" fill="#9b7954" />
        <path d="m200 70-86 139 87 40 96-39z" fill={c} />
        <path d="m200 39-73 127 75 35 81-36z" fill={c} />
        <path d="m200 39 2 162 81-36zM202 201l-1 48 96-39-27-44" fill="#000" opacity=".12" stroke="none" />
        <path d="m200 22-47 83 49 23 52-24z" fill={c} />
      </>}
      {asset.shape === "sword" && <g transform="rotate(28 200 165)">
        <path d="m202 28-30 49v120l30 25 30-25V77z" fill="#dce3dc" /><path d="M202 28v194l30-25V77z" fill="#a2b1b2" />
        <path d="m150 196 51 15 50-15 9 18-58 19-63-18z" fill={c} />
        <path d="M189 230h25v52h-25z" fill="#745e49" /><path d="m189 240 25 8m-25 4 25 8m-25 4 25 8" /><path d="m181 282 21 17 23-17-11-9h-25z" fill={c} />
      </g>}
    </g>
  </svg>;
}

export function StoryArt({ variant = 0, title, className = "" }: { variant?: number; title: string; className?: string }) {
  const sky = ["#a3aec7", "#adbca1", "#d8ab90"][variant % 3];
  return <svg className={`story-art ${className}`} viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" role="img" aria-label={title}>
    <rect width="400" height="520" fill={sky} /><circle cx="300" cy="108" r="51" fill="#f3e9c9" />
    <path d="M0 280 50 180 95 258 161 160 220 278 315 170 400 264v256H0" fill="#64767c" opacity=".4" />
    {variant % 3 === 0 ? <>
      <path d="m0 281 400-37v167L0 448z" fill="#354453" /><path d="m0 311 400-33v25L0 337z" fill="#d6b982" />
      {[20, 108, 196, 284].map(x => <path key={x} d={`m${x} 348 65-6v47l-65 8z`} fill="#e5c995" />)}
      <path d="m0 465 400-38m-400 58 400-33" stroke="#333c46" strokeWidth="8" />
    </> : variant % 3 === 1 ? <>
      <path d="m54 295 146-126 147 126v183H54z" fill="#e9e7c9" opacity=".4" stroke="#405e4b" strokeWidth="7" />
      <path d="M200 169v310M55 295h292M99 258v220m202-219v219" stroke="#567760" strokeWidth="4" />
      {[102, 169, 249, 304].map((x, i) => <g key={x}><path d={`M${x} 475v-${80 + i * 13}`} stroke="#415b43" strokeWidth="5" /><ellipse cx={x-15} cy={420-i*12} rx="25" ry="12" fill="#577850" transform={`rotate(30 ${x-15} ${420-i*12})`} /><ellipse cx={x+12} cy={400-i*12} rx="25" ry="12" fill="#749063" transform={`rotate(-30 ${x+12} ${400-i*12})`} /></g>)}
    </> : <>
      <path d="M52 234h298v259H52z" fill="#906551" /><path d="m29 235 52-76h240l50 76z" fill="#4e655b" />
      <path d="M74 274h103v140H74zM211 274h107v219H211z" fill="#efd399" /><path d="M74 340h103M125 274v140M265 274v219" stroke="#765642" strokeWidth="7" />
      <path d="M104 240h194v32H104z" fill="#f1e3c0" /><text x="200" y="261" textAnchor="middle" fontFamily="serif" fontSize="19" fill="#4a4d3b">MIRO’S</text>
    </>}
    <path d="M0 500q160-25 400 0v20H0z" fill="#313f40" />
    <circle cx="224" cy="419" r="13" fill="#293c41" /><path d="m214 431-12 48h42l-12-48zM214 478l-3 25m22-25 5 25" fill="#c26650" stroke="#293c41" strokeWidth="7" />
    <path d="M28 32h45M28 32v45m344 366v45h-45" fill="none" stroke="#fff" opacity=".6" />
  </svg>;
}
