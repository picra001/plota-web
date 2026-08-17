import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { ContentShell } from "@/components/content-shell";

export default async function NovelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <ContentShell lang={lang as Locale} section="novel">
      {children}
    </ContentShell>
  );
}
