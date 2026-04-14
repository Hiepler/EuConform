"use client";

import { useCallback, useEffect, useState } from "react";
import type { Messages } from "../lib/i18n";
import type { Locale } from "../lib/siteConfig";
import { ButtonLink } from "./ButtonLink";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function MobileMenu({
  messages,
  locale,
  ecefHref,
  githubUrl,
}: {
  messages: Messages;
  locale: Locale;
  ecefHref: string;
  githubUrl: string;
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, close]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navItems = [
    { href: "#eucef", label: messages.header.nav.ecef },
    { href: "#principles", label: messages.header.nav.principles },
    { href: "#reference-projects", label: messages.header.nav.references },
  ];

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        aria-label={open ? messages.header.nav.close : messages.header.nav.openMenu}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/60 bg-white/80 backdrop-blur md:hidden"
      >
        <div className="flex w-4 flex-col items-center gap-[4.5px]">
          <span
            className={`block h-[1.5px] w-4 rounded-full bg-slate-800 transition-all duration-300 ${
              open ? "translate-y-[6px] rotate-45" : ""
            }`}
          />
          <span
            className={`block h-[1.5px] w-4 rounded-full bg-slate-800 transition-all duration-300 ${
              open ? "opacity-0 scale-0" : ""
            }`}
          />
          <span
            className={`block h-[1.5px] w-4 rounded-full bg-slate-800 transition-all duration-300 ${
              open ? "-translate-y-[6px] -rotate-45" : ""
            }`}
          />
        </div>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[51] bg-slate-950/20 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
        onKeyDown={(e) => e.key === "Escape" && close()}
        role="presentation"
      />

      {/* Menu panel — fully hidden when closed via visibility + opacity */}
      <div
        className={`fixed inset-x-0 top-0 z-[52] md:hidden transition-[opacity,transform,visibility] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-[105%] opacity-0"
        }`}
      >
        <div className="mx-3 mt-3 overflow-hidden rounded-3xl border border-slate-300/50 bg-[rgba(253,251,246,0.97)] shadow-[0_24px_80px_-16px_rgba(20,29,44,0.28)] backdrop-blur-2xl backdrop-saturate-150">
          {/* Spacer for the header bar behind */}
          <div className="h-16" />

          <div className="px-6 pb-8">
            <nav className="flex flex-col gap-0.5">
              {navItems.map((item, i) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={`rounded-2xl px-4 py-3.5 text-[15px] font-medium text-slate-800 transition-all hover:bg-slate-100/60 ${
                    open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                  }`}
                  style={{
                    transitionDelay: open ? `${80 + i * 50}ms` : "0ms",
                    transitionDuration: "400ms",
                    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div
              className={`mt-5 border-t border-slate-200/60 pt-5 transition-all ${
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
              style={{
                transitionDelay: open ? "230ms" : "0ms",
                transitionDuration: "400ms",
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <div className="flex flex-col gap-3">
                <ButtonLink href={ecefHref} secondary>
                  {messages.header.readSpec}
                </ButtonLink>
                <ButtonLink href={githubUrl} external>
                  {messages.header.viewGithub}
                </ButtonLink>
              </div>
            </div>

            <div
              className={`mt-5 flex items-center justify-center border-t border-slate-200/60 pt-5 transition-all ${
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
              style={{
                transitionDelay: open ? "300ms" : "0ms",
                transitionDuration: "400ms",
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <LocaleSwitcher
                currentLocale={locale}
                labels={{ en: messages.localeSwitcher.en, de: messages.localeSwitcher.de }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
