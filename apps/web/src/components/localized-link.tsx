"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { isLocale, uiLang, type UiLang } from "@/lib/i18n";

const LOCALE_PREFIX = /^\/(ko|en|ja|zh|es)(?=\/|$)/;

/** Keep the selected interface language while navigating. 한마디 Chinese 는 한국어 전용이라 주소를 그대로 둔다. */
export default function LocalizedLink({ href, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const locale = pathname?.split("/")[1];
  const targetService = typeof href === "string" ? href.split("/")[2] : undefined;
  const next = typeof href === "string" && locale && isLocale(locale) && targetService !== "chinese"
    ? href.replace(LOCALE_PREFIX, `/${locale}`) : href;
  return <Link href={next} {...props} />;
}

/** 주소의 언어로 화면 문구 언어를 정한다(ko 외에는 영어). */
export function useUiLang(): UiLang {
  return uiLang(usePathname()?.split("/")[1]);
}
