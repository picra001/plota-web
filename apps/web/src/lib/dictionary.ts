import type { Locale } from "./i18n";

type Motto = { pre: string; accent: string; post: string };

export type Dictionary = {
  nav: { home: string; devlog: string; novel: string };
  home: {
    eyebrow: string;
    motto: Motto;
    sub: string;
    ctaNovel: string;
    ctaDevlog: string;
    stats: [string, string, string];
  };
  dev: { eyebrow: string; title: Motto; desc: string };
  nov: { eyebrow: string; title: Motto; desc: string };
  ui: {
    back: string;
    next: string;
    minRead: string;
    foot: string;
    footer: string;
    empty: string;
    latest: string;
    viewAll: string;
    statusLive: string;
    statusDraft: string;
    share: string;
    copyLink: string;
    copied: string;
  };
};

export const dictionary: Record<Locale, Dictionary> = {
  ko: {
    nav: { home: "홈", devlog: "Devlog", novel: "Novel" },
    home: {
      eyebrow: "PLOTA · 작가 플랫폼",
      motto: { pre: "누구나 ", accent: "작가", post: "가 될 수 있다." },
      sub: "Devlog와 Novel. 우리가 만드는 과정과, 우리가 쓰는 이야기.",
      ctaNovel: "이야기 읽기",
      ctaDevlog: "개발 로그 보기",
      stats: ["5개 언어", "매주 발행", "읽기 전용 · 깨끗한 모바일"],
    },
    dev: {
      eyebrow: "DEVLOG · 개발 로그",
      title: { pre: "우리가 만드는 ", accent: "과정", post: "." },
      desc: "기능을 더하기 전에, 왜 그렇게 만들었는지부터 기록합니다. 결정과 그 이유.",
    },
    nov: {
      eyebrow: "NOVEL · 비주얼 노벨",
      title: { pre: "한 컷씩, ", accent: "이야기", post: "." },
      desc: "컷툰으로 읽는 짧은 소설. 모바일에서 위로 넘기며 한 편을 끝까지.",
    },
    ui: {
      back: "목록으로",
      next: "다음 편",
      minRead: "분 분량",
      foot: "이 글은 5개 언어로 제공됩니다. 헤더에서 언어를 바꿔 보세요.",
      footer: "© 2026 PLOTA · 누구나 작가가 될 수 있다",
      empty: "아직 발행된 글이 없습니다.",
      latest: "최신 글",
      viewAll: "전체 보기",
      statusLive: "LIVE",
      statusDraft: "DRAFT",
      share: "공유하기",
      copyLink: "링크 복사",
      copied: "복사됨!",
    },
  },
  en: {
    nav: { home: "Home", devlog: "Devlog", novel: "Novel" },
    home: {
      eyebrow: "PLOTA · A HOME FOR WRITERS",
      motto: { pre: "Anyone can become a ", accent: "writer", post: "." },
      sub: "Devlog and Novel — the making, and the stories we write.",
      ctaNovel: "Read the stories",
      ctaDevlog: "Read the devlog",
      stats: ["5 LANGUAGES", "WEEKLY", "READ-ONLY · MOBILE-CLEAN"],
    },
    dev: {
      eyebrow: "DEVLOG · ENGINEERING NOTES",
      title: { pre: "The ", accent: "making", post: ", in public." },
      desc: "Before the features, the reasons. Decisions, and why we made them.",
    },
    nov: {
      eyebrow: "NOVEL · VISUAL NOVELS",
      title: { pre: "Frame by ", accent: "frame", post: "." },
      desc: "Short fiction told in cut-toon panels. Swipe up on mobile, one episode end to end.",
    },
    ui: {
      back: "Back to list",
      next: "Next episode",
      minRead: " min read",
      foot: "This post is available in 5 languages. Switch from the header.",
      footer: "© 2026 PLOTA · ANYONE CAN BE A WRITER",
      empty: "No posts published yet.",
      latest: "Latest",
      viewAll: "View all",
      statusLive: "LIVE",
      statusDraft: "DRAFT",
      share: "Share",
      copyLink: "Copy link",
      copied: "Copied!",
    },
  },
  ja: {
    nav: { home: "ホーム", devlog: "Devlog", novel: "Novel" },
    home: {
      eyebrow: "PLOTA · 作家のための場所",
      motto: { pre: "誰もが", accent: "作家", post: "になれる。" },
      sub: "Devlog と Novel。つくる過程と、つむぐ物語。",
      ctaNovel: "物語を読む",
      ctaDevlog: "開発ログを見る",
      stats: ["5言語対応", "毎週更新", "閲覧専用 · モバイル最適"],
    },
    dev: {
      eyebrow: "DEVLOG · 開発ログ",
      title: { pre: "つくる", accent: "過程", post: "を、そのまま。" },
      desc: "機能の前に、その理由を残します。決定と、その背景。",
    },
    nov: {
      eyebrow: "NOVEL · ビジュアルノベル",
      title: { pre: "一コマずつ、", accent: "物語", post: "。" },
      desc: "カット漫画で読む短い物語。スマホで上にスワイプ、一話を最後まで。",
    },
    ui: {
      back: "一覧へ",
      next: "次の話へ",
      minRead: "分で読了",
      foot: "この記事は5言語で読めます。ヘッダーから切り替えてください。",
      footer: "© 2026 PLOTA · 誰もが作家になれる",
      empty: "まだ記事がありません。",
      latest: "最新の記事",
      viewAll: "すべて見る",
      statusLive: "LIVE",
      statusDraft: "DRAFT",
      share: "シェア",
      copyLink: "リンクをコピー",
      copied: "コピーしました!",
    },
  },
  zh: {
    nav: { home: "首页", devlog: "开发日志", novel: "小说" },
    home: {
      eyebrow: "PLOTA · 写作者的平台",
      motto: { pre: "人人都能成为", accent: "作家", post: "。" },
      sub: "Devlog 与 Novel。创作的过程，与我们书写的故事。",
      ctaNovel: "阅读故事",
      ctaDevlog: "查看开发日志",
      stats: ["支持五种语言", "每周更新", "只读 · 移动端清爽"],
    },
    dev: {
      eyebrow: "DEVLOG · 开发日志",
      title: { pre: "我们", accent: "构建", post: "的过程。" },
      desc: "在功能之前，先记录原因。每个决定，与它的理由。",
    },
    nov: {
      eyebrow: "NOVEL · 视觉小说",
      title: { pre: "一格一格，", accent: "讲故事", post: "。" },
      desc: "用条漫格子讲述的短篇。手机上向上滑动，一口气读完一话。",
    },
    ui: {
      back: "返回列表",
      next: "下一话",
      minRead: "分钟阅读",
      foot: "本文提供五种语言版本，可在顶部切换。",
      footer: "© 2026 PLOTA · 人人都能成为作家",
      empty: "暂无已发布的文章。",
      latest: "最新",
      viewAll: "查看全部",
      statusLive: "LIVE",
      statusDraft: "DRAFT",
      share: "分享",
      copyLink: "复制链接",
      copied: "已复制!",
    },
  },
  es: {
    nav: { home: "Inicio", devlog: "Devlog", novel: "Novel" },
    home: {
      eyebrow: "PLOTA · UNA CASA PARA AUTORES",
      motto: { pre: "Cualquiera puede ser ", accent: "escritor", post: "." },
      sub: "Devlog y Novel: el proceso y las historias que escribimos.",
      ctaNovel: "Leer las historias",
      ctaDevlog: "Ver el devlog",
      stats: ["5 IDIOMAS", "SEMANAL", "SOLO LECTURA · MÓVIL"],
    },
    dev: {
      eyebrow: "DEVLOG · NOTAS DE DESARROLLO",
      title: { pre: "El ", accent: "proceso", post: ", en público." },
      desc: "Antes de las funciones, las razones. Decisiones y por qué las tomamos.",
    },
    nov: {
      eyebrow: "NOVEL · NOVELAS VISUALES",
      title: { pre: "Viñeta a ", accent: "viñeta", post: "." },
      desc: "Ficción breve contada en viñetas. Desliza en el móvil, un episodio de principio a fin.",
    },
    ui: {
      back: "Volver a la lista",
      next: "Siguiente episodio",
      minRead: " min de lectura",
      foot: "Este texto está en 5 idiomas. Cámbialo en la cabecera.",
      footer: "© 2026 PLOTA · CUALQUIERA PUEDE ESCRIBIR",
      empty: "Aún no hay publicaciones.",
      latest: "Lo último",
      viewAll: "Ver todo",
      statusLive: "LIVE",
      statusDraft: "DRAFT",
      share: "Compartir",
      copyLink: "Copiar enlace",
      copied: "¡Copiado!",
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionary[locale];
}
