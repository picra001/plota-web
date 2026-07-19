import type { Locale } from "./i18n";

type Motto = { pre: string; accent: string; post: string };
type HomeItem = { label: string; description: string };

export type Dictionary = {
  nav: { home: string; devlog: string; novel: string };
  home: {
    eyebrow: string;
    status: string;
    motto: Motto;
    sub: string;
    imageAlt: string;
    figureCaption: string;
    offers: [HomeItem, HomeItem];
    pipeline: [HomeItem, HomeItem, HomeItem];
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
      eyebrow: "PLOTA.AI · 2D TO 3D",
      status: "서비스 준비 중",
      motto: { pre: "그림을 ", accent: "3D", post: "로." },
      sub: "사람이 그린 2D 이미지를 3D 모델로 변환합니다. 브라우저에서 무료로 시작하거나, 무료 설치 프로그램으로 로컬 환경에 직접 구축하세요.",
      imageAlt:
        "종이에 그린 2D 로켓 스케치가 입체적인 3D 로켓으로 변환되는 모습",
      figureCaption: "Concept render · 2D sketch to 3D asset",
      offers: [
        {
          label: "Free web conversion",
          description:
            "설치 없이 이미지를 업로드하고 변환 결과를 확인하는 웹 워크플로.",
        },
        {
          label: "Free local package",
          description:
            "데이터를 외부로 보내지 않고 로컬 머신에 직접 구축하는 설치 프로그램.",
        },
      ],
      pipeline: [
        {
          label: "2D input",
          description:
            "직접 그린 캐릭터, 오브젝트, 콘셉트 이미지를 입력합니다.",
        },
        {
          label: "3D reconstruction",
          description: "이미지의 형태 정보를 분석해 3D 에셋으로 재구성합니다.",
        },
        {
          label: "Local workflow",
          description: "웹 또는 로컬 환경에 맞는 변환 파이프라인을 선택합니다.",
        },
      ],
    },
    dev: {
      eyebrow: "DEVLOG · 개발 로그",
      title: {
        pre: "콘텐츠와 기술",
        accent: "",
        post: ".",
      },
      desc: "AI는 콘텐츠를 어떻게 바꿀까요. 설레임으로 한걸음씩 나가봅니다.",
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
      footer: "© 2026 PLOTA.AI · FROM 2D TO 3D",
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
      eyebrow: "PLOTA.AI · 2D TO 3D",
      status: "In development",
      motto: { pre: "Draw in 2D. Build in ", accent: "3D", post: "." },
      sub: "Turn hand-drawn 2D images into 3D models. Start with a free browser workflow, or deploy the free installer directly in your local environment.",
      imageAlt:
        "A hand-drawn 2D rocket sketch transforming into a dimensional 3D rocket",
      figureCaption: "Concept render · 2D sketch to 3D asset",
      offers: [
        {
          label: "Free web conversion",
          description:
            "Upload an image and inspect the conversion without installing anything.",
        },
        {
          label: "Free local package",
          description:
            "Build the workflow on your own machine without sending data outside.",
        },
      ],
      pipeline: [
        {
          label: "2D input",
          description:
            "Supply a hand-drawn character, object, or concept image.",
        },
        {
          label: "3D reconstruction",
          description:
            "Shape information is analyzed and reconstructed as a 3D asset.",
        },
        {
          label: "Local workflow",
          description:
            "Choose a browser or local conversion pipeline for your environment.",
        },
      ],
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
      footer: "© 2026 PLOTA.AI · FROM 2D TO 3D",
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
      eyebrow: "PLOTA.AI · 2D TO 3D",
      status: "開発中",
      motto: { pre: "描いた絵を、", accent: "3D", post: "へ。" },
      sub: "人が描いた2D画像を3Dモデルに変換します。無料のブラウザ版、またはローカル環境に構築できる無料インストーラーを提供します。",
      imageAlt: "紙に描かれた2Dのロケットが立体的な3Dロケットへ変換される様子",
      figureCaption: "Concept render · 2D sketch to 3D asset",
      offers: [
        {
          label: "Free web conversion",
          description:
            "インストール不要で画像をアップロードし、変換結果を確認できます。",
        },
        {
          label: "Free local package",
          description: "データを外部に送らず、自分のマシンに直接構築できます。",
        },
      ],
      pipeline: [
        {
          label: "2D input",
          description:
            "手描きのキャラクター、物体、コンセプト画像を入力します。",
        },
        {
          label: "3D reconstruction",
          description: "画像の形状情報を解析し、3Dアセットとして再構成します。",
        },
        {
          label: "Local workflow",
          description: "ブラウザまたはローカルの変換パイプラインを選択します。",
        },
      ],
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
      footer: "© 2026 PLOTA.AI · FROM 2D TO 3D",
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
      eyebrow: "PLOTA.AI · 2D TO 3D",
      status: "开发中",
      motto: { pre: "让手绘走向", accent: "3D", post: "。" },
      sub: "将人手绘制的2D图像转换为3D模型。可免费使用浏览器工作流，也可通过免费安装程序直接部署到本地环境。",
      imageAlt: "纸上的2D火箭草图逐渐转换成立体的3D火箭",
      figureCaption: "Concept render · 2D sketch to 3D asset",
      offers: [
        {
          label: "Free web conversion",
          description: "无需安装，上传图像即可查看转换结果。",
        },
        {
          label: "Free local package",
          description: "无需将数据发送到外部，直接在自己的设备上部署。",
        },
      ],
      pipeline: [
        { label: "2D input", description: "输入手绘角色、物体或概念图像。" },
        {
          label: "3D reconstruction",
          description: "分析图像的形态信息，并重建为3D资产。",
        },
        {
          label: "Local workflow",
          description: "根据环境选择浏览器或本地转换管线。",
        },
      ],
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
      footer: "© 2026 PLOTA.AI · FROM 2D TO 3D",
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
      eyebrow: "PLOTA.AI · 2D TO 3D",
      status: "En desarrollo",
      motto: { pre: "Del dibujo al ", accent: "3D", post: "." },
      sub: "Convierte imágenes 2D dibujadas a mano en modelos 3D. Empieza gratis en el navegador o instala el paquete gratuito directamente en tu entorno local.",
      imageAlt: "Un boceto 2D de un cohete transformándose en un cohete 3D",
      figureCaption: "Concept render · 2D sketch to 3D asset",
      offers: [
        {
          label: "Free web conversion",
          description:
            "Sube una imagen y revisa la conversión sin instalar nada.",
        },
        {
          label: "Free local package",
          description:
            "Despliega el flujo en tu equipo sin enviar datos al exterior.",
        },
      ],
      pipeline: [
        {
          label: "2D input",
          description:
            "Introduce un personaje, objeto o concepto dibujado a mano.",
        },
        {
          label: "3D reconstruction",
          description:
            "La forma se analiza y se reconstruye como un recurso 3D.",
        },
        {
          label: "Local workflow",
          description: "Elige una canalización web o local según tu entorno.",
        },
      ],
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
      footer: "© 2026 PLOTA.AI · FROM 2D TO 3D",
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
