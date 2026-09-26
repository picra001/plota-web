/** Editorial mock content. Platform labels are intended targets, not compatibility certification. */
export type Asset = { slug: string; name: string; category: string; platform: string; color: string; shape: "robot" | "tree" | "house" | "sword"; description: string; faces: string };
export const assets: Asset[] = [
  { slug: "scout-bot", name: "Scout Bot", category: "Characters", platform: "Roblox", color: "#a5ba8a", shape: "robot", description: "A small explorer with a very big sense of adventure. A character concept for your next world.", faces: "1.2k" },
  { slug: "mosswood-cabin", name: "Mosswood Cabin", category: "Buildings", platform: "OVERDARE", color: "#d2ac84", shape: "house", description: "A quiet hideaway at the edge of the forest. Start building a place that feels like home.", faces: "840" },
  { slug: "cloud-pine", name: "Cloud Pine", category: "Nature", platform: "Roblox", color: "#8ba894", shape: "tree", description: "Soft shapes, a little shade, and room for a new adventure. A stylized environment concept.", faces: "320" },
  { slug: "sunblade", name: "Sunblade", category: "Props", platform: "OVERDARE", color: "#e6bd65", shape: "sword", description: "A bright little relic for an unlikely hero. A playful fantasy prop concept.", faces: "460" },
  { slug: "courier-bot", name: "Courier Bot", category: "Characters", platform: "OVERDARE", color: "#c6a1ad", shape: "robot", description: "Special delivery, wherever your world takes you. A companion concept with a friendly silhouette.", faces: "1.4k" },
  { slug: "cedar-house", name: "Cedar House", category: "Buildings", platform: "Roblox", color: "#9eafc4", shape: "house", description: "One small house. A thousand possible stories. A modular village concept.", faces: "920" },
];
export type Story = { slug: string; title: string; genre: string; color: string; subtitle: string; description: string; episodes: { slug: string; title: string; lines: string[] }[] };
export const stories: Story[] = [
  { slug: "last-train", title: "The Last Train", genre: "Quiet fantasy", color: "#9baac4", subtitle: "Somewhere between here and home.", description: "Every night, a train arrives at a station that no longer exists. Tonight, Mina has a ticket.", episodes: [
    { slug: "01", title: "Platform zero", lines: ["The last train was never on the timetable.", "But every night, at 12:03, the platform lights came on.", "Mina had walked past this station a hundred times.", "Tonight, someone had left a ticket with her name on it.", "‘Where does this train go?’", "‘Somewhere you left behind.’"] },
    { slug: "02", title: "A window seat", lines: ["The carriage smelled of rain and old books.", "Outside, the city folded itself into paper.", "On the opposite seat sat a familiar red umbrella.", "Mina remembered losing it when she was seven.", "‘Lost things always find a way here,’ said the conductor.", "For the first time in years, she watched the world go by."] },
  ] },
  { slug: "glass-garden", title: "The Glass Garden", genre: "Slice of wonder", color: "#a9b39c", subtitle: "Even small things find a way to grow.", description: "In a city without seasons, a young gardener discovers a seed that remembers spring.", episodes: [
    { slug: "01", title: "The first seed", lines: ["Nothing had grown here for a very long time.", "Then a crack appeared in the glass.", "Inside it was something impossibly small.", "She brought it a cup of water.", "By morning, the city had its first leaf.", "And for a moment, everyone stopped to look."] },
  ] },
  { slug: "miros-shop", title: "Miro’s Little Shop", genre: "Everyday magic", color: "#cc9a80", subtitle: "Open late. For whatever you’ve lost.", description: "A tiny shop repairs things you cannot hold: forgotten dreams, unfinished goodbyes, and the occasional broken heart.", episodes: [
    { slug: "01", title: "One more customer", lines: ["Miro was just about to close.", "The bell rang once. A customer stepped out of the rain.", "‘I think I’ve lost my courage.’", "Miro set a small blue cup on the counter.", "‘Then let’s start with something warm.’", "Outside, the rain softened to a whisper."] },
  ] },
];
export const phrases = [
  { id: "hello", chinese: "你好", pinyin: "Nǐ hǎo", meaning: "안녕하세요", example: "你好，很高兴认识你。", translation: "안녕하세요, 만나서 반가워요.", choices: ["안녕하세요", "감사합니다", "괜찮아요"] },
  { id: "thanks", chinese: "谢谢", pinyin: "Xièxie", meaning: "감사합니다", example: "谢谢你的帮助。", translation: "도와주셔서 감사합니다.", choices: ["미안합니다", "감사합니다", "안녕히 가세요"] },
  { id: "goodbye", chinese: "再见", pinyin: "Zàijiàn", meaning: "다음에 만나요", example: "明天见，再见！", translation: "내일 봐요, 안녕!", choices: ["좋은 아침이에요", "천만에요", "다음에 만나요"] },
  { id: "please", chinese: "请", pinyin: "Qǐng", meaning: "부탁합니다 / ~하세요", example: "请坐。", translation: "앉으세요.", choices: ["부탁합니다 / ~하세요", "맛있어요", "모르겠어요"] },
];
export const productPaths = ["fbx", "fbx/create", "fbx/assets", "fbx/guide", "fbx/guide/roblox", "fbx/guide/overdare", ...assets.map(a => `fbx/assets/${a.slug}`), "webtoon", ...stories.flatMap(s => [`webtoon/${s.slug}`, ...s.episodes.map(e => `webtoon/${s.slug}/${e.slug}`)]), "chinese", "chinese/learn", "chinese/review", "chinese/settings", "chinese/conversation", "chinese/vocabulary"];
