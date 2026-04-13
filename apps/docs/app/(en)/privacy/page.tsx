import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../../_components/LegalPage";
import { siteConfig } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy notice for euconform.eu and the EuConform information site.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      locale="en"
      title="Privacy Notice"
      intro="This site is intentionally lean: no cookies, no analytics, no marketing trackers. Even so, a normal website deployment usually still involves technical processing, especially through hosting infrastructure and server logs."
      type="privacy"
    >
      <LegalSection title="Controller">
        <p>{siteConfig.legal.controllerName}</p>
        <p>{siteConfig.legal.street}</p>
        <p>{siteConfig.legal.city}</p>
        <p>{siteConfig.legal.country}</p>
        <p>Email: {siteConfig.legal.email}</p>
      </LegalSection>

      <LegalSection title="Hosting">
        <p>
          This site is delivered through the following hosting provider:{" "}
          <strong>{siteConfig.legal.hostingProvider}</strong>.
        </p>
        <p>
          Before public launch, replace this placeholder with the actual provider, recipient
          categories, and any deployment-specific privacy information.
        </p>
      </LegalSection>

      <LegalSection title="No cookies, no analytics, no tracking">
        <p>
          At the current implementation level, this site does not use marketing or analytics
          cookies. It does not embed tracking scripts, analytics platforms, advertising technology,
          or profiling tools.
        </p>
        <p>
          It also does not currently rely on browser-side storage such as `localStorage` or
          `sessionStorage` for marketing or convenience purposes.
        </p>
      </LegalSection>

      <LegalSection title="Server logs">
        <p>
          When this site is accessed, the hosting provider will typically process technical access
          data such as IP address, timestamp, requested resource, user agent, and referrer.
        </p>
        <p>
          This processing is generally necessary to deliver the site securely, diagnose errors, and
          defend against misuse. The typical legal basis is Art. 6(1)(f) GDPR.
        </p>
      </LegalSection>

      <LegalSection title="External links">
        <p>
          This site links to third-party services such as GitHub. When you follow such a link, you
          leave this site. The respective third-party operator is responsible for any personal data
          processing on its own site.
        </p>
      </LegalSection>

      <LegalSection title="Fonts and technical assets">
        <p>
          Fonts used on this site are served locally. At the current implementation level, no fonts
          are fetched dynamically from Google Fonts or similar external CDNs.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Subject to the GDPR, you may have rights of access, rectification, erasure, restriction of
          processing, data portability, and objection.
        </p>
        <p>
          You also have the right to lodge a complaint with a competent data protection authority.
        </p>
      </LegalSection>

      <LegalSection title="Review before launch">
        <p>
          Before going live, this privacy notice should be completed with the real infrastructure,
          contact, and hosting information used for the public deployment.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
