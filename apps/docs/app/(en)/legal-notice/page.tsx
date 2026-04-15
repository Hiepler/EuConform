import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../../_components/LegalPage";
import { siteConfig } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "Legal Notice",
  description: "Legal notice for euconform.eu and the EuConform information site.",
};

export default function LegalNoticePage() {
  return (
    <LegalPage
      locale="en"
      title="Legal Notice"
      intro="Mandatory operator information pursuant to § 5 DDG for the EuConform information and project website."
      type="imprint"
    >
      <LegalSection title="Information pursuant to § 5 DDG">
        <p>
          {siteConfig.legal.controllerName}
          <br />
          {siteConfig.legal.street}
          <br />
          {siteConfig.legal.city}
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Email: {siteConfig.legal.email}</p>
      </LegalSection>

      <LegalSection title="Editorially responsible">
        <p>
          {siteConfig.legal.controllerName}
          <br />
          {siteConfig.legal.street}
          <br />
          {siteConfig.legal.city}
        </p>
      </LegalSection>

      <LegalSection title="Project context">
        <p>
          This website describes the open-source project <strong>EuConform</strong>, the EuConform
          approach to structured AI Act evidence, and the <strong>EuConform Evidence Format</strong>
          .
        </p>
        <p>
          The source code and technical documentation are provided via GitHub:
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

      <LegalSection title="Notice">
        <p>
          This website provides information about an open-source project and does not constitute
          legal advice.
        </p>
      </LegalSection>

      <p>
        Source:{" "}
        <a
          href="https://www.e-recht24.de"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          https://www.e-recht24.de
        </a>
      </p>
    </LegalPage>
  );
}
