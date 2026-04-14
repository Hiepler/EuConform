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
      <LegalSection title="Provider information pursuant to § 5 DDG">
        <p>{siteConfig.legal.controllerName}</p>
        <p>{siteConfig.legal.street}</p>
        <p>{siteConfig.legal.city}</p>
        <p>{siteConfig.legal.country}</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Email: {siteConfig.legal.email}</p>
      </LegalSection>

      <LegalSection title="Responsible for content pursuant to § 18 (2) MStV">
        <p>{siteConfig.legal.controllerName}</p>
        <p>{siteConfig.legal.street}</p>
        <p>{siteConfig.legal.city}</p>
        <p>{siteConfig.legal.country}</p>
      </LegalSection>

      <LegalSection title="Liability for content">
        <p>
          As a service provider, I am responsible for my own content on these pages in accordance
          with § 7 (1) DDG and general legislation. However, pursuant to §§ 8 to 10 DDG, I am not
          obligated to monitor transmitted or stored third-party information or to investigate
          circumstances that indicate illegal activity.
        </p>
        <p>
          Obligations to remove or block the use of information under general law remain unaffected.
          However, liability in this regard is only possible from the time of knowledge of a
          specific infringement. Upon becoming aware of corresponding infringements, I will remove
          this content immediately.
        </p>
      </LegalSection>

      <LegalSection title="Liability for links">
        <p>
          This website contains links to external third-party websites over whose content I have no
          influence. Therefore, I cannot accept any liability for this third-party content. The
          respective provider or operator of the linked pages is always responsible for their
          content.
        </p>
        <p>
          The linked pages were checked for possible legal violations at the time of linking.
          Illegal content was not recognisable at the time of linking. However, permanent monitoring
          of the content of the linked pages is unreasonable without concrete indications of a legal
          violation. Upon becoming aware of legal violations, I will remove such links immediately.
        </p>
      </LegalSection>

      <LegalSection title="Copyright">
        <p>
          The content and works created by the site operator on these pages are subject to German
          copyright law. Duplication, processing, distribution, and any form of commercialisation
          beyond the scope of copyright law require the written consent of the respective author or
          creator.
        </p>
        <p>
          The source code of the EuConform project is published under an open-source licence on{" "}
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            GitHub
          </a>
          . The applicable licence can be found in the repository.
        </p>
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
        <p className="mt-4 text-xs text-slate-500">Last updated: April 2026</p>
      </LegalSection>
    </LegalPage>
  );
}
