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
      intro="Mandatory operator information for the EuConform information and project website. Replace the marked placeholder fields before publishing the site publicly."
      type="imprint"
    >
      <LegalSection title="Provider information">
        <p>{siteConfig.legal.controllerName}</p>
        <p>{siteConfig.legal.street}</p>
        <p>{siteConfig.legal.city}</p>
        <p>{siteConfig.legal.country}</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Email: {siteConfig.legal.email}</p>
      </LegalSection>

      <LegalSection title="Responsible for content">
        <p>{siteConfig.legal.controllerName}</p>
        <p>{siteConfig.legal.street}</p>
        <p>{siteConfig.legal.city}</p>
        <p>{siteConfig.legal.country}</p>
      </LegalSection>

      <LegalSection title="Project context">
        <p>
          This website presents the open-source project <strong>EuConform</strong>, its approach to
          structured AI Act evidence, and the <strong>EuConform Evidence Format</strong>.
        </p>
        <p>
          Source code and technical documentation are published on GitHub:
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
          This website is intended to provide information about an open-source project and does not
          constitute legal advice.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
