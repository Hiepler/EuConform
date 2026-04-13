import "@euconform/ui/styles.css";
import "../globals.css";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import type { Metadata } from "next";
import { siteConfig } from "../lib/siteConfig";
import { de } from "../messages/de";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: de.meta.title,
    template: `%s — ${siteConfig.name}`,
  },
  description: de.meta.description,
  alternates: {
    canonical: "/de",
    languages: {
      en: "/",
      de: "/de",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    url: "/de",
    siteName: siteConfig.name,
    title: de.meta.title,
    description: de.meta.description,
    locale: "de_DE",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: de.meta.title,
    description: de.meta.description,
    creator: siteConfig.twitter,
  },
};

export default function DeRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: "Geist Sans, system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
