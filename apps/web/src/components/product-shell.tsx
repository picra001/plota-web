import { SiteFrame } from "./site-frame";

export function ProductShell({ kind, children }: { kind: "fbx" | "webtoon" | "chinese"; children: React.ReactNode }) {
  return <SiteFrame kind={kind}>{children}</SiteFrame>;
}
