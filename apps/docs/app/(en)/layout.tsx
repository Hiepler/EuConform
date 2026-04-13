import "@euconform/ui/styles.css";
import "../globals.css";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import type { Metadata } from "next";
import { siteConfig } from "../lib/siteConfig";
import { en } from "../messages/en";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: en.meta.title,
    template: `%s — ${siteConfig.name}`,
  },
  description: en.meta.description,
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      de: "/de",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteConfig.name,
    title: en.meta.title,
    description: en.meta.description,
    locale: "en_US",
    alternateLocale: ["de_DE"],
  },
  twitter: {
    card: "summary_large_image",
    title: en.meta.title,
    description: en.meta.description,
    creator: siteConfig.twitter,
  },
};

export default function EnRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Geist Sans, system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
