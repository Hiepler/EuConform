"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Locale, siteConfig } from "../lib/siteConfig";

export function LocaleSwitcher({
  currentLocale,
  labels,
}: {
  currentLocale: Locale;
  labels: { en: string; de: string };
}) {
  const pathname = usePathname() ?? "/";

  function hrefFor(target: Locale): string {
    // Strip leading locale segment if present
    const segments = pathname.split("/").filter(Boolean);
    const first = segments[0];
    const isLocaleSegment = first && (siteConfig.locales as readonly string[]).includes(first);
    const rest = isLocaleSegment ? segments.slice(1) : segments;
    const subpath = rest.length ? `/${rest.join("/")}` : "";

    if (target === siteConfig.defaultLocale) {
      return subpath || "/";
    }
    return `/${target}${subpath}`;
  }

  return (
    <nav
      aria-label="Language switcher"
      className="inline-flex items-center rounded-full border border-slate-300/80 bg-white/74 p-0.5 text-[11px] font-medium tracking-[0.22em] text-slate-600 backdrop-blur"
    >
      {(siteConfig.locales as readonly Locale[]).map((loc) => {
        const active = loc === currentLocale;
        return (
          <Link
            key={loc}
            href={hrefFor(loc)}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-full bg-[#17345c] px-3 py-1 text-white"
                : "rounded-full px-3 py-1 transition hover:text-slate-950"
            }
          >
            {labels[loc]}
          </Link>
        );
      })}
    </nav>
  );
}
