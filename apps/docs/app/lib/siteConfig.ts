function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

const locales = ["en", "de"] as const;

export type Locale = (typeof locales)[number];

export const siteConfig = {
  url: "https://euconform.eu",
  name: "EuConform",
  defaultLocale: "en" as Locale,
  locales,
  githubUrl: "https://github.com/Hiepler/EuConform",
  twitter: "@euconform",
  legal: {
    controllerName: env("LEGAL_CONTROLLER_NAME", "[LEGAL_CONTROLLER_NAME]"),
    street: env("LEGAL_STREET", "[LEGAL_STREET]"),
    city: env("LEGAL_CITY", "[LEGAL_CITY]"),
    country: env("LEGAL_COUNTRY", "[LEGAL_COUNTRY]"),
    email: env("LEGAL_EMAIL", "[LEGAL_EMAIL]"),
    hostingProvider: env("LEGAL_HOSTING_PROVIDER", "[LEGAL_HOSTING_PROVIDER]"),
  },
};

export function legalNoticePath(locale: Locale): string {
  return locale === "de" ? "/de/impressum" : "/legal-notice";
}

export function privacyPath(locale: Locale): string {
  return locale === "de" ? "/de/datenschutz" : "/privacy";
}
