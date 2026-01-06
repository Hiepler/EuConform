"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { ThemeToggle } from "../ThemeToggle";

/**
 * Props for the PageHeader component
 */
export interface PageHeaderProps {
  /** Whether to show the language toggle (default: true) */
  showLanguageToggle?: boolean;
  /** Whether to show the theme toggle (default: true) */
  showThemeToggle?: boolean;
}

/**
 * PageHeader displays the application header with logo, language toggle, and theme toggle.
 * Used consistently across all screens for branding and navigation.
 */
export function PageHeader({ showLanguageToggle = true, showThemeToggle = true }: PageHeaderProps) {
  const { t, language, setLanguage } = useLanguage();

  return (
    <header className="px-6 pt-6 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-serif font-bold">
          E
        </div>
        <span className="font-serif font-bold text-slate-deep dark:text-paper">{t("title")}</span>
      </div>
      <div className="flex items-center gap-4">
        {showLanguageToggle && (
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "de" : "en")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-white dark:hover:bg-black/40 transition-all"
          >
            <Globe className="w-4 h-4" />
            {language === "en" ? "EN" : "DE"}
          </button>
        )}
        {showThemeToggle && <ThemeToggle />}
      </div>
    </header>
  );
}
