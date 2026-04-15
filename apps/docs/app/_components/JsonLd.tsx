import { siteConfig } from "../lib/siteConfig";
import type { Locale } from "../lib/siteConfig";

interface JsonLdProps {
  locale: Locale;
}

/**
 * Renders JSON-LD structured data for SEO and AI discoverability.
 *
 * Includes:
 * - WebSite schema (site-level identity + search)
 * - SoftwareApplication schema (EuConform as a product)
 * - Organization schema (operator info)
 * - BreadcrumbList schema (navigation context)
 */
export function JsonLd({ locale }: JsonLdProps) {
  const isDE = locale === "de";
  const baseUrl = siteConfig.url;
  const pageUrl = isDE ? `${baseUrl}/de` : baseUrl;

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: siteConfig.name,
    description: isDE
      ? "EuConform ist eine offline-first Evidence-Engine für europäische KI-Systeme. Offene Spezifikation für AI-Act-Evidence."
      : "EuConform is an offline-first evidence engine for European AI systems. Open specification for AI Act evidence.",
    inLanguage: isDE ? "de-DE" : "en-US",
    publisher: {
      "@id": `${baseUrl}/#organization`,
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: siteConfig.name,
    url: baseUrl,
    contactPoint: {
      "@type": "ContactPoint",
      email: siteConfig.legal.email,
      contactType: "customer support",
      availableLanguage: ["German", "English"],
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.legal.street,
      addressLocality: "Gelsenkirchen",
      postalCode: "45894",
      addressCountry: "DE",
    },
    sameAs: [siteConfig.githubUrl],
    founder: {
      "@type": "Person",
      name: siteConfig.legal.controllerName,
    },
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${baseUrl}/#software`,
    name: "EuConform",
    description: isDE
      ? "Open-Source Evidence-Engine für europäische KI-Compliance. Erzeugt strukturierte, verifizierbare Evidence-Bundles für den EU AI Act."
      : "Open-source evidence engine for European AI compliance. Generates structured, verifiable evidence bundles for the EU AI Act.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    url: baseUrl,
    downloadUrl: siteConfig.githubUrl,
    softwareVersion: "1.0",
    license: "https://opensource.org/licenses/MIT",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    author: {
      "@id": `${baseUrl}/#organization`,
    },
    featureList: isDE
      ? [
          "Offline-first Evidence-Erzeugung",
          "AI-Act-Compliance-Scans",
          "Verifizierbare Evidence-Bundles (SHA-256)",
          "Offene Spezifikation (EuConform Evidence Format)",
          "CLI-Scanner für Codebases",
        ]
      : [
          "Offline-first evidence generation",
          "AI Act compliance scans",
          "Verifiable evidence bundles (SHA-256)",
          "Open specification (EuConform Evidence Format)",
          "CLI scanner for codebases",
        ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: isDE ? "Startseite" : "Home",
        item: pageUrl,
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}/#webpage`,
    url: pageUrl,
    name: isDE
      ? "EuConform — Offene Infrastruktur für AI-Act-Evidence"
      : "EuConform — Open Infrastructure for AI Act Evidence",
    description: isDE
      ? "EuConform ist eine offline-first Evidence-Engine für europäische KI-Systeme. Entdecke das EuConform Evidence Format, Referenzprojekte und den Scan-to-Verify-Workflow."
      : "EuConform is an offline-first evidence engine for European AI systems. Explore the EuConform Evidence Format, reference projects, and the scan-to-verify workflow.",
    inLanguage: isDE ? "de-DE" : "en-US",
    isPartOf: {
      "@id": `${baseUrl}/#website`,
    },
    about: {
      "@id": `${baseUrl}/#software`,
    },
    breadcrumb: {
      "@id": `${pageUrl}/#breadcrumb`,
    },
  };

  // Combine all schemas into a single @graph for cleaner output
  const graphSchema = {
    "@context": "https://schema.org",
    "@graph": [
      // Strip individual @context since we have a top-level one
      { ...websiteSchema, "@context": undefined },
      { ...organizationSchema, "@context": undefined },
      { ...softwareSchema, "@context": undefined },
      { ...breadcrumbSchema, "@context": undefined, "@id": `${pageUrl}/#breadcrumb` },
      { ...webPageSchema, "@context": undefined },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires dangerouslySetInnerHTML
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graphSchema, null, 0),
      }}
    />
  );
}
