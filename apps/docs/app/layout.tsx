import "@euconform/ui/styles.css";
import "./globals.css";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EuConform — Offline-First AI Act Evidence Engine",
  description:
    "Open-source scanner, CLI, and web viewer for EU AI Act compliance evidence. Home of the EuConform Evidence Format (ECEF).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Geist Sans, system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
