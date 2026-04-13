export const siteConfig = {
  url: "https://euconform.eu",
  name: "EuConform",
  defaultLocale: "en",
  locales: ["en", "de"],
  githubUrl: "https://github.com/Hiepler/EuConform",
  twitter: "@euconform",
  legal: {
    controllerName: "Benedikt Hiepler",
    street: "[Street and number / Straße und Hausnummer ergänzen]",
    city: "[Postal code and city / PLZ und Ort ergänzen]",
    country: "Germany",
    email: "[Email address ergänzen]",
    hostingProvider: "[Hosting provider ergänzen]",
    placeholderNotice:
      "Replace the marked placeholder fields before public deployment. The current values are structure-only, not publish-ready legal information.",
  },
} as const;

export type Locale = (typeof siteConfig.locales)[number];

export function legalNoticePath(locale: Locale): string {
  return locale === "de" ? "/de/impressum" : "/legal-notice";
}

export function privacyPath(locale: Locale): string {
  return locale === "de" ? "/de/datenschutz" : "/privacy";
}
