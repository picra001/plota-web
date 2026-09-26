"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { isLocale } from "@/lib/i18n";

/** Keep the selected interface language while navigating within a service. */
export default function LocalizedLink({ href, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const locale = pathname?.split("/")[1];
  const currentService = pathname?.split("/")[2];
  const targetService = typeof href === "string" ? href.split("/")[2] : undefined;
  const next = typeof href === "string" && locale && isLocale(locale) && currentService === targetService
    ? href.replace(/^\/(ko|en|ja|zh|es)(?=\/|$)/, `/${locale}`) : href;
  return <Link href={next} {...props} />;
}
