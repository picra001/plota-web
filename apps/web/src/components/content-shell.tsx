import { getContentTree, type Section } from "@/lib/content";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { ContentSidebar } from "./content-sidebar";

/** devlog / novel 섹션 공통 셸 - 왼쪽 계층 트리 + 본문 */
export function ContentShell({
  lang,
  section,
  children,
}: {
  lang: Locale;
  section: Section;
  children: React.ReactNode;
}) {
  const dict = getDictionary(lang);
  const nodes = getContentTree(section, lang);

  return (
    <div className="mx-auto flex w-full max-w-[1264px] flex-col lg:flex-row">
      <ContentSidebar
        section={section}
        basePath={`/${lang}/${section}`}
        sectionLabel={section === "devlog" ? dict.nav.devlog : dict.nav.novel}
        nodes={nodes}
        labels={{ contents: dict.ui.contents, close: dict.ui.closeContents }}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
