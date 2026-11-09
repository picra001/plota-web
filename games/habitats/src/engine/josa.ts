// 한국어 조사 자동 보정: "관악을(를)" → "관악을", "마포을(를)" → "마포를"
const PAIRS: [RegExp, string, string][] = [
  [/을\(를\)/, "을", "를"],
  [/이\(가\)/, "이", "가"],
  [/은\(는\)/, "은", "는"],
  [/와\(과\)/, "과", "와"],
  [/\(으\)로/, "으로", "로"],
];
function hasBatchim(ch: string) {
  const c = ch.charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return /[0-9LMNRlmnr]$/.test(ch) ? true : false;
  return (c - 0xac00) % 28 !== 0;
}
function isRieul(ch: string) {
  const c = ch.charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 8;
}
export function fixJosa(s: string): string {
  return s.replace(/([^\s(])(을\(를\)|이\(가\)|은\(는\)|와\(과\)|\(으\)로)/g, (_m, prev: string, tok: string) => {
    const pair = PAIRS.find(([re]) => re.test(tok))!;
    const b = hasBatchim(prev);
    if (tok === "(으)로") return prev + (b && !isRieul(prev) ? "으로" : "로");
    return prev + (b ? pair[1] : pair[2]);
  });
}
