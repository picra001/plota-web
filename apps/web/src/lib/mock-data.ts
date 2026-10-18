import type { UiLang } from "./i18n";

/** Editorial mock content. 문구는 한국어·영어 두 벌. */
export type AssetCategory = "characters" | "buildings" | "nature" | "props";
export const assetCategories: AssetCategory[] = ["characters", "buildings", "nature", "props"];
export const categoryLabel: Record<UiLang, Record<AssetCategory | "all", string>> = {
  ko: { all: "전체", characters: "캐릭터", buildings: "건물", nature: "자연", props: "소품" },
  en: { all: "All", characters: "Characters", buildings: "Buildings", nature: "Nature", props: "Props" },
};
export type Asset = {
  slug: string; category: AssetCategory; color: string; shape: "robot" | "tree" | "house" | "sword"; faces: string;
  text: Record<UiLang, { name: string; description: string }>;
};
export const assets: Asset[] = [
  { slug: "scout-bot", category: "characters", color: "#a5ba8a", shape: "robot", faces: "1.2k", text: {
    ko: { name: "정찰 로봇", description: "모험심만큼은 누구보다 큰 작은 탐험가." },
    en: { name: "Scout Bot", description: "A small explorer with a very big sense of adventure." } } },
  { slug: "mosswood-cabin", category: "buildings", color: "#d2ac84", shape: "house", faces: "840", text: {
    ko: { name: "이끼숲 오두막", description: "숲 가장자리의 조용한 쉼터." },
    en: { name: "Mosswood Cabin", description: "A quiet hideaway at the edge of the forest." } } },
  { slug: "cloud-pine", category: "nature", color: "#8ba894", shape: "tree", faces: "320", text: {
    ko: { name: "구름 소나무", description: "부드러운 모양과 작은 그늘." },
    en: { name: "Cloud Pine", description: "Soft shapes and a little shade." } } },
  { slug: "sunblade", category: "props", color: "#e6bd65", shape: "sword", faces: "460", text: {
    ko: { name: "햇빛 검", description: "뜻밖의 영웅을 위한 작고 빛나는 유물." },
    en: { name: "Sunblade", description: "A bright little relic for an unlikely hero." } } },
  { slug: "courier-bot", category: "characters", color: "#c6a1ad", shape: "robot", faces: "1.4k", text: {
    ko: { name: "배달 로봇", description: "어디든 찾아가는 친근한 동료." },
    en: { name: "Courier Bot", description: "A friendly companion that delivers anywhere." } } },
  { slug: "cedar-house", category: "buildings", color: "#9eafc4", shape: "house", faces: "920", text: {
    ko: { name: "삼나무 집", description: "작은 집 하나, 수많은 이야기." },
    en: { name: "Cedar House", description: "One small house. A thousand possible stories." } } },
];

type StoryText = { title: string; genre: string; subtitle: string; description: string };
type EpisodeText = { title: string; lines: string[] };
export type Story = { slug: string; color: string; text: Record<UiLang, StoryText>; episodes: { slug: string; text: Record<UiLang, EpisodeText> }[] };
export const stories: Story[] = [
  { slug: "last-train", color: "#9baac4", text: {
    ko: { title: "마지막 열차", genre: "잔잔한 판타지", subtitle: "여기와 집 사이 어딘가.", description: "매일 밤, 이제는 없는 역에 열차가 들어온다. 오늘 밤, 미나에게 표가 생겼다." },
    en: { title: "The Last Train", genre: "Quiet fantasy", subtitle: "Somewhere between here and home.", description: "Every night, a train arrives at a station that no longer exists. Tonight, Mina has a ticket." } },
    episodes: [
      { slug: "01", text: {
        ko: { title: "0번 승강장", lines: ["마지막 열차는 시간표에 없었다.", "그런데 매일 밤 12시 3분이면 승강장 불이 켜졌다.", "미나는 이 역을 백 번도 넘게 지나쳤다.", "오늘 밤, 누군가 그녀의 이름이 적힌 표를 두고 갔다.", "‘이 열차는 어디로 가요?’", "‘당신이 두고 온 곳으로.’"] },
        en: { title: "Platform zero", lines: ["The last train was never on the timetable.", "But every night, at 12:03, the platform lights came on.", "Mina had walked past this station a hundred times.", "Tonight, someone had left a ticket with her name on it.", "‘Where does this train go?’", "‘Somewhere you left behind.’"] } } },
      { slug: "02", text: {
        ko: { title: "창가 자리", lines: ["객차에서는 비와 오래된 책 냄새가 났다.", "창밖의 도시는 종이처럼 접혀 들어갔다.", "맞은편 자리에 낯익은 빨간 우산이 놓여 있었다.", "일곱 살 때 잃어버린 우산이었다.", "‘잃어버린 건 언젠가 여기로 와요.’ 차장이 말했다.", "몇 년 만에 처음으로, 미나는 지나가는 세상을 바라보았다."] },
        en: { title: "A window seat", lines: ["The carriage smelled of rain and old books.", "Outside, the city folded itself into paper.", "On the opposite seat sat a familiar red umbrella.", "Mina remembered losing it when she was seven.", "‘Lost things always find a way here,’ said the conductor.", "For the first time in years, she watched the world go by."] } } },
    ] },
  { slug: "glass-garden", color: "#a9b39c", text: {
    ko: { title: "유리 정원", genre: "일상 속 경이", subtitle: "작은 것도 자랄 길을 찾는다.", description: "계절이 없는 도시에서, 어린 정원사가 봄을 기억하는 씨앗을 찾는다." },
    en: { title: "The Glass Garden", genre: "Slice of wonder", subtitle: "Even small things find a way to grow.", description: "In a city without seasons, a young gardener discovers a seed that remembers spring." } },
    episodes: [
      { slug: "01", text: {
        ko: { title: "첫 번째 씨앗", lines: ["이곳에선 아주 오랫동안 아무것도 자라지 않았다.", "그러다 유리에 금이 하나 갔다.", "그 안에 믿기 힘들 만큼 작은 무언가가 있었다.", "그녀는 물 한 컵을 가져다주었다.", "아침이 되자 도시에 첫 잎이 돋았다.", "그리고 잠시, 모두가 걸음을 멈추고 바라보았다."] },
        en: { title: "The first seed", lines: ["Nothing had grown here for a very long time.", "Then a crack appeared in the glass.", "Inside it was something impossibly small.", "She brought it a cup of water.", "By morning, the city had its first leaf.", "And for a moment, everyone stopped to look."] } } },
    ] },
  { slug: "miros-shop", color: "#cc9a80", text: {
    ko: { title: "미로의 작은 가게", genre: "일상의 마법", subtitle: "늦게까지 엽니다. 잃어버린 무엇이든.", description: "손에 쥘 수 없는 것을 고치는 작은 가게. 잊힌 꿈, 못다 한 작별, 그리고 가끔은 부서진 마음." },
    en: { title: "Miro’s Little Shop", genre: "Everyday magic", subtitle: "Open late. For whatever you’ve lost.", description: "A tiny shop repairs things you cannot hold: forgotten dreams, unfinished goodbyes, and the occasional broken heart." } },
    episodes: [
      { slug: "01", text: {
        ko: { title: "손님 한 명 더", lines: ["미로가 막 문을 닫으려던 참이었다.", "종이 한 번 울리고, 손님이 빗속에서 들어왔다.", "‘용기를 잃어버린 것 같아요.’", "미로는 작은 파란 컵을 계산대에 올려놓았다.", "‘그럼 따뜻한 것부터 시작해요.’", "밖에서는 비가 속삭임처럼 잦아들었다."] },
        en: { title: "One more customer", lines: ["Miro was just about to close.", "The bell rang once. A customer stepped out of the rain.", "‘I think I’ve lost my courage.’", "Miro set a small blue cup on the counter.", "‘Then let’s start with something warm.’", "Outside, the rain softened to a whisper."] } } },
    ] },
];
export const phrases = [
  { id: "hello", chinese: "你好", pinyin: "Nǐ hǎo", meaning: "안녕하세요", example: "你好，很高兴认识你。", translation: "안녕하세요, 만나서 반가워요.", choices: ["안녕하세요", "감사합니다", "괜찮아요"] },
  { id: "thanks", chinese: "谢谢", pinyin: "Xièxie", meaning: "감사합니다", example: "谢谢你的帮助。", translation: "도와주셔서 감사합니다.", choices: ["미안합니다", "감사합니다", "안녕히 가세요"] },
  { id: "goodbye", chinese: "再见", pinyin: "Zàijiàn", meaning: "다음에 만나요", example: "明天见，再见！", translation: "내일 봐요, 안녕!", choices: ["좋은 아침이에요", "천만에요", "다음에 만나요"] },
  { id: "please", chinese: "请", pinyin: "Qǐng", meaning: "부탁합니다 / ~하세요", example: "请坐。", translation: "앉으세요.", choices: ["부탁합니다 / ~하세요", "맛있어요", "모르겠어요"] },
];
export const productPaths = ["fbx", "fbx/create", "fbx/job", "fbx/assets", "fbx/guide", ...assets.map(a => `fbx/assets/${a.slug}`), "webtoon", ...stories.flatMap(s => [`webtoon/${s.slug}`, ...s.episodes.map(e => `webtoon/${s.slug}/${e.slug}`)]), "chinese", "chinese/learn", "chinese/review", "chinese/settings", "chinese/conversation", "chinese/vocabulary"];
