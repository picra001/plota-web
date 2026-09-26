import { SiteFrame } from "@/components/site-frame";
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
