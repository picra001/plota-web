export const locales = ["ko", "en", "ja", "zh", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

/** 제품 페이지(FBX·웹툰·허브) 문구는 한국어·영어 두 벌. ja·zh·es 는 영어를 보여준다. */
export type UiLang = "ko" | "en";
export function uiLang(locale: string | undefined): UiLang {
  return locale === "ko" ? "ko" : "en";
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const localeName: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  es: "Español",
};

export const localeShort: Record<Locale, string> = {
  ko: "KO",
  en: "EN",
  ja: "JA",
  zh: "ZH",
  es: "ES",
};

/** <html lang> / hreflang 값 */
export const htmlLang: Record<Locale, string> = {
  ko: "ko",
  en: "en",
  ja: "ja",
  zh: "zh-Hans",
  es: "es",
};

/** Open Graph locale 값 */
export const ogLocale: Record<Locale, string> = {
  ko: "ko_KR",
  en: "en_US",
  ja: "ja_JP",
  zh: "zh_CN",
  es: "es_ES",
};
