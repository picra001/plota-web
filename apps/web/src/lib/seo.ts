import { locales, defaultLocale, htmlLang, type Locale } from "./i18n";
import { absoluteUrl } from "./site";

/** 같은 페이지의 언어별 URL(hreflang) 맵을 생성한다. */
export function languageAlternates(
  pathFor: (locale: Locale) => string
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[htmlLang[l]] = absoluteUrl(pathFor(l));
  }
  languages["x-default"] = absoluteUrl(pathFor(defaultLocale));
  return languages;
}
