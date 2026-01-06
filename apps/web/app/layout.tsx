import "@euconform/ui/styles.css";
import "./globals.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
import type { Metadata } from "next";
import { ThemeProvider } from "../components/theme-provider";

export const metadata: Metadata = {
  title: "EuConform – EU AI Act Compliance Checker",
  description:
    "Free, open-source AI compliance tool for the EU AI Act. Classify risk levels, test for bias, and generate compliance reports – 100% offline, GDPR-by-design.",
  keywords: [
    "EU AI Act",
    "AI compliance",
    "responsible AI",
    "fairness",
    "bias detection",
    "open source",
  ],
  authors: [{ name: "EuConform Contributors" }],
  openGraph: {
    title: "EuConform – EU AI Act Compliance Checker",
    description: "Free, open-source AI compliance tool for the EU AI Act",
    type: "website",
    locale: "en_EU",
    siteName: "EuConform",
  },
  twitter: {
    card: "summary_large_image",
    title: "EuConform – EU AI Act Compliance Checker",
    description: "Free, open-source AI compliance tool for the EU AI Act",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-paper dark:bg-slate-deep font-sans antialiased"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
