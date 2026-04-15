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
      intro="The following information gives you an overview of what happens to your personal data when you visit this website and what rights you have."
      type="privacy"
    >
      <LegalSection title="1. Privacy at a glance">
        <h3 className="font-semibold text-slate-900">General information</h3>
        <p>
          The following notes provide a simple overview of what happens to your personal data when
          you visit this website. Personal data is any data that can be used to identify you
          personally. Detailed information on the subject of data protection can be found in our
          privacy policy below.
        </p>
        <h3 className="font-semibold text-slate-900">Data collection on this website</h3>
        <p>
          <strong>Who is responsible for data collection on this website?</strong>
          <br />
          Data processing on this website is carried out by the website operator. You can find the
          operator&rsquo;s contact details in the section &ldquo;Information about the responsible
          party&rdquo; of this privacy policy.
        </p>
        <p>
          <strong>How do we collect your data?</strong>
          <br />
          Your data is collected, on the one hand, by you providing it to us. This may, for example,
          be data you enter into a contact form.
        </p>
        <p>
          Other data is collected automatically or after your consent when you visit the website by
          our IT systems. This is mainly technical data (e.g., internet browser, operating system,
          or time the page was accessed). This data is collected automatically as soon as you enter
          this website.
        </p>
        <p>
          <strong>What do we use your data for?</strong>
          <br />
          Part of the data is collected to ensure error-free provision of the website. Other data
          may be used to analyse your user behaviour. If contracts can be concluded or initiated via
          the website, the transmitted data is also processed for contract offers, orders, or other
          order requests.
        </p>
        <p>
          <strong>What rights do you have regarding your data?</strong>
          <br />
          You have the right at any time to receive information free of charge about the origin,
          recipients, and purpose of your stored personal data. You also have the right to request
          the correction or deletion of this data. If you have given consent to data processing, you
          can revoke this consent at any time for the future. You also have the right to request the
          restriction of the processing of your personal data under certain circumstances.
          Furthermore, you have the right to lodge a complaint with the competent supervisory
          authority.
        </p>
        <p>
          You can contact us at any time regarding this and other questions on the subject of data
          protection.
        </p>
      </LegalSection>

      <LegalSection title="2. Hosting">
        <p>We host the content of our website with the following provider:</p>
        <h3 className="font-semibold text-slate-900">Hetzner</h3>
        <p>
          The provider is {siteConfig.legal.hostingProvider}, Industriestr. 25, 91710 Gunzenhausen,
          Germany (hereinafter Hetzner).
        </p>
        <p>
          For details, please refer to Hetzner&rsquo;s privacy policy:{" "}
          <a
            href="https://www.hetzner.com/de/legal/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            https://www.hetzner.com/de/legal/privacy-policy/
          </a>
          .
        </p>
        <p>
          The use of Hetzner is based on Art. 6(1)(f) GDPR. We have a legitimate interest in the
          most reliable presentation of our website possible. Insofar as corresponding consent has
          been requested, processing is carried out exclusively on the basis of Art. 6(1)(a) GDPR
          and § 25(1) TDDDG, insofar as the consent includes the storage of cookies or access to
          information on the user&rsquo;s device (e.g., device fingerprinting) within the meaning of
          the TDDDG. The consent is revocable at any time.
        </p>
      </LegalSection>

      <LegalSection title="3. General information and mandatory information">
        <h3 className="font-semibold text-slate-900">Data protection</h3>
        <p>
          The operators of these pages take the protection of your personal data very seriously. We
          treat your personal data confidentially and in accordance with statutory data protection
          regulations and this privacy policy.
        </p>
        <p>
          When you use this website, various personal data is collected. Personal data is data by
          which you can be personally identified. This privacy policy explains what data we collect
          and what we use it for. It also explains how and for what purpose this is done.
        </p>
        <p>
          We point out that data transmission on the internet (e.g., when communicating by email)
          may have security gaps. Complete protection of data against access by third parties is not
          possible.
        </p>

        <h3 className="font-semibold text-slate-900">Information about the responsible party</h3>
        <p>The party responsible for data processing on this website is:</p>
        <p>
          {siteConfig.legal.controllerName}
          <br />
          {siteConfig.legal.street}
          <br />
          {siteConfig.legal.city}
        </p>
        <p>Email: {siteConfig.legal.email}</p>
        <p>
          The responsible party is the natural or legal person who, alone or jointly with others,
          decides on the purposes and means of the processing of personal data (e.g., names, email
          addresses, etc.).
        </p>

        <h3 className="font-semibold text-slate-900">Storage duration</h3>
        <p>
          Unless a more specific storage period is stated within this privacy policy, your personal
          data will remain with us until the purpose for the data processing ceases to apply. If you
          assert a legitimate request for deletion or revoke your consent to data processing, your
          data will be deleted unless we have other legally permissible reasons for storing your
          personal data (e.g., retention periods under tax or commercial law); in the latter case,
          deletion takes place after these reasons cease to apply.
        </p>

        <h3 className="font-semibold text-slate-900">
          General information on the legal bases for data processing on this website
        </h3>
        <p>
          If you have consented to data processing, we process your personal data on the basis of
          Art. 6(1)(a) GDPR or Art. 9(2)(a) GDPR, where special categories of data within the
          meaning of Art. 9(1) GDPR are processed. In the case of express consent to the transfer of
          personal data to third countries, the data processing is also based on Art. 49(1)(a) GDPR.
          If you have consented to the storage of cookies or access to information on your device
          (e.g., via device fingerprinting), the data processing is additionally based on § 25(1)
          TDDDG. The consent is revocable at any time. If your data is required for the performance
          of a contract or for the implementation of pre-contractual measures, we process your data
          on the basis of Art. 6(1)(b) GDPR. Furthermore, we process your data where this is
          required to fulfil a legal obligation on the basis of Art. 6(1)(c) GDPR. Data processing
          may also be carried out on the basis of our legitimate interest pursuant to Art. 6(1)(f)
          GDPR. Information on the relevant legal bases in each individual case is provided in the
          following paragraphs of this privacy policy.
        </p>

        <h3 className="font-semibold text-slate-900">Recipients of personal data</h3>
        <p>
          Within the scope of our business activities, we work with various external bodies. In some
          cases, the transmission of personal data to these external bodies is also required. We
          only pass on personal data to external bodies if this is necessary for the performance of
          a contract, if we are legally obliged to do so (e.g., transfer of data to tax
          authorities), if we have a legitimate interest under Art. 6(1)(f) GDPR in the
          transmission, or if another legal basis permits the transfer of data. When using order
          processors, we only pass on personal data of our customers on the basis of a valid order
          processing contract. In the case of joint processing, a joint processing agreement is
          concluded.
        </p>

        <h3 className="font-semibold text-slate-900">
          Revocation of your consent to data processing
        </h3>
        <p>
          Many data processing operations are only possible with your express consent. You can
          revoke any consent you have already given at any time. The lawfulness of the data
          processing carried out until the revocation remains unaffected by the revocation.
        </p>

        <h3 className="font-semibold text-slate-900">
          Right to object to the collection of data in special cases and to direct marketing (Art.
          21 GDPR)
        </h3>
        <p>
          IF DATA PROCESSING IS CARRIED OUT ON THE BASIS OF ART. 6(1)(E) OR (F) GDPR, YOU HAVE THE
          RIGHT AT ANY TIME TO OBJECT TO THE PROCESSING OF YOUR PERSONAL DATA ON GROUNDS RELATING TO
          YOUR PARTICULAR SITUATION; THIS ALSO APPLIES TO PROFILING BASED ON THESE PROVISIONS. THE
          RESPECTIVE LEGAL BASIS ON WHICH PROCESSING IS BASED CAN BE FOUND IN THIS PRIVACY POLICY.
          IF YOU OBJECT, WE WILL NO LONGER PROCESS YOUR PERSONAL DATA CONCERNED UNLESS WE CAN
          DEMONSTRATE COMPELLING LEGITIMATE GROUNDS FOR THE PROCESSING THAT OVERRIDE YOUR INTERESTS,
          RIGHTS, AND FREEDOMS, OR THE PROCESSING SERVES TO ASSERT, EXERCISE, OR DEFEND LEGAL CLAIMS
          (OBJECTION UNDER ART. 21(1) GDPR).
        </p>
        <p>
          IF YOUR PERSONAL DATA IS PROCESSED FOR DIRECT MARKETING PURPOSES, YOU HAVE THE RIGHT TO
          OBJECT AT ANY TIME TO THE PROCESSING OF PERSONAL DATA CONCERNING YOU FOR THE PURPOSE OF
          SUCH MARKETING; THIS ALSO APPLIES TO PROFILING INSOFAR AS IT IS ASSOCIATED WITH SUCH
          DIRECT MARKETING. IF YOU OBJECT, YOUR PERSONAL DATA WILL NO LONGER BE USED FOR DIRECT
          MARKETING PURPOSES (OBJECTION UNDER ART. 21(2) GDPR).
        </p>

        <h3 className="font-semibold text-slate-900">
          Right to lodge a complaint with the competent supervisory authority
        </h3>
        <p>
          In the event of breaches of the GDPR, data subjects have the right to lodge a complaint
          with a supervisory authority, in particular in the Member State of their habitual
          residence, their place of work, or the place of the alleged infringement. The right to
          lodge a complaint exists without prejudice to any other administrative or judicial remedy.
        </p>

        <h3 className="font-semibold text-slate-900">Right to data portability</h3>
        <p>
          You have the right to have data that we process automatically on the basis of your consent
          or in fulfilment of a contract handed over to you or to a third party in a common,
          machine-readable format. If you request the direct transfer of the data to another
          controller, this will only be done to the extent that it is technically feasible.
        </p>

        <h3 className="font-semibold text-slate-900">Information, correction, and deletion</h3>
        <p>
          Within the framework of the applicable statutory provisions, you have the right at any
          time to free information about your stored personal data, its origin, and recipients, as
          well as the purpose of the data processing and, if applicable, the right to correction or
          deletion of this data. You can contact us at any time regarding this and other questions
          on the subject of personal data.
        </p>

        <h3 className="font-semibold text-slate-900">Right to restriction of processing</h3>
        <p>
          You have the right to request the restriction of the processing of your personal data. You
          can contact us at any time regarding this. The right to restriction of processing exists
          in the following cases:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            If you dispute the accuracy of your personal data stored by us, we generally need time
            to verify this. For the duration of the verification, you have the right to request the
            restriction of the processing of your personal data.
          </li>
          <li>
            If the processing of your personal data happened/is happening unlawfully, you can
            request the restriction of data processing instead of deletion.
          </li>
          <li>
            If we no longer need your personal data, but you need it to exercise, defend, or assert
            legal claims, you have the right to request the restriction of the processing of your
            personal data instead of deletion.
          </li>
          <li>
            If you have lodged an objection under Art. 21(1) GDPR, a balancing of your and our
            interests must be carried out. As long as it has not yet been determined whose interests
            prevail, you have the right to request the restriction of the processing of your
            personal data.
          </li>
        </ul>
        <p>
          If you have restricted the processing of your personal data, this data may — apart from
          being stored — only be processed with your consent or for the assertion, exercise, or
          defence of legal claims, or to protect the rights of another natural or legal person, or
          for reasons of an important public interest of the European Union or of a Member State.
        </p>

        <h3 className="font-semibold text-slate-900">SSL/TLS encryption</h3>
        <p>
          For security reasons and to protect the transmission of confidential content, such as
          orders or enquiries that you send to us as the site operator, this page uses SSL or TLS
          encryption. You can recognise an encrypted connection by the fact that the browser&rsquo;s
          address bar changes from &ldquo;http://&rdquo; to &ldquo;https://&rdquo; and by the lock
          symbol in your browser line.
        </p>
        <p>
          When SSL or TLS encryption is activated, the data you transmit to us cannot be read by
          third parties.
        </p>
      </LegalSection>

      <LegalSection title="4. Data collection on this website">
        <h3 className="font-semibold text-slate-900">Enquiry by email, phone, or fax</h3>
        <p>
          If you contact us by email, phone, or fax, your enquiry, including all personal data
          resulting from it (name, enquiry), will be stored and processed by us for the purpose of
          handling your request. We do not share this data without your consent.
        </p>
        <p>
          The processing of this data is based on Art. 6(1)(b) GDPR, provided that your enquiry is
          related to the performance of a contract or is necessary for the implementation of
          pre-contractual measures. In all other cases, processing is based on our legitimate
          interest in the effective handling of the enquiries addressed to us (Art. 6(1)(f) GDPR) or
          on your consent (Art. 6(1)(a) GDPR), if this has been requested; the consent is revocable
          at any time.
        </p>
        <p>
          The data you send to us via contact enquiries will remain with us until you request us to
          delete it, revoke your consent to storage, or the purpose for data storage no longer
          applies (e.g., after your request has been processed). Mandatory statutory provisions — in
          particular statutory retention periods — remain unaffected.
        </p>
      </LegalSection>

      <LegalSection title="5. Additional notes on the operation of this website">
        <h3 className="font-semibold text-slate-900">No cookies, no analytics, no tracking</h3>
        <p>
          At the current implementation level, this website does not use marketing or analytics
          cookies. It does not embed tracking scripts, analytics services, or external advertising
          or profiling tools.
        </p>
        <p>
          Likewise, at the current implementation level, no client-side mechanisms such as
          localStorage, sessionStorage, or similar browser storage are used for marketing or
          convenience purposes.
        </p>

        <h3 className="font-semibold text-slate-900">Server log files</h3>
        <p>
          When this website is accessed, the hosting provider generally processes technical access
          data such as IP address, date and time of the request, requested resource, user agent, and
          referrer.
        </p>
        <p>
          The processing is carried out to securely provide the website, for error analysis, and to
          defend against misuse. The legal basis is Art. 6(1)(f) GDPR.
        </p>

        <h3 className="font-semibold text-slate-900">External links</h3>
        <p>
          This website links to, among other things, GitHub. When you follow such a link, you leave
          this website. The respective operators are responsible for the processing of personal data
          on the linked pages.
        </p>

        <h3 className="font-semibold text-slate-900">Fonts and technical assets</h3>
        <p>
          The fonts used on this page are served locally. At the current implementation level, no
          fonts are loaded dynamically from Google Fonts or comparable external CDN services.
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
