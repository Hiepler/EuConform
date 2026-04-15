import { de } from "../messages/de";
import { en } from "../messages/en";
import { type Locale, siteConfig } from "./siteConfig";

export type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = {
  en,
  de,
};

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[siteConfig.defaultLocale];
}

export function isLocale(value: string): value is Locale {
  return (siteConfig.locales as readonly string[]).includes(value);
}

/**
 * Returns the public path for a given locale.
 * Default locale (en) lives at "/" — other locales at "/{locale}".
 */
export function localePath(locale: Locale, subpath = ""): string {
  const suffix = subpath.startsWith("/") ? subpath : subpath ? `/${subpath}` : "";
  if (locale === siteConfig.defaultLocale) {
    return suffix || "/";
  }
  return `/${locale}${suffix}`;
}
