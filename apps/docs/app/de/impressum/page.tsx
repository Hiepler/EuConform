import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../../_components/LegalPage";
import { siteConfig } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum für euconform.eu und die EuConform-Informationsseite.",
};

export default function ImprintPage() {
  return (
    <LegalPage
      locale="de"
      title="Impressum"
      intro="Pflichtangaben für die Informations- und Projektseite von EuConform. Bitte ersetze die markierten Platzhalter vor einer öffentlichen Veröffentlichung."
      type="imprint"
    >
      <LegalSection title="Angaben gemäß § 5 DDG">
        <p>{siteConfig.legal.controllerName}</p>
        <p>{siteConfig.legal.street}</p>
        <p>{siteConfig.legal.city}</p>
        <p>{siteConfig.legal.country}</p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>E-Mail: {siteConfig.legal.email}</p>
      </LegalSection>

      <LegalSection title="Verantwortlich nach § 18 Abs. 2 MStV">
        <p>{siteConfig.legal.controllerName}</p>
        <p>{siteConfig.legal.street}</p>
        <p>{siteConfig.legal.city}</p>
        <p>{siteConfig.legal.country}</p>
      </LegalSection>

      <LegalSection title="Projektbezug">
        <p>
          Diese Seite beschreibt das Open-Source-Projekt <strong>EuConform</strong>, den
          EuConform-Ansatz zu strukturierter AI-Act-Evidence sowie das{" "}
          <strong>EuConform Evidence Format</strong>.
        </p>
        <p>
          Der Quellcode und die technische Dokumentation werden über GitHub bereitgestellt:
          <br />
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            {siteConfig.githubUrl}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Hinweis">
        <p>
          Diese Website dient der Information über ein Open-Source-Projekt und stellt keine
          Rechtsberatung dar.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
