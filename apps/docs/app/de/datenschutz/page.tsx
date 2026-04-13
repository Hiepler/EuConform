import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../../_components/LegalPage";
import { siteConfig } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzhinweise für euconform.eu und die EuConform-Informationsseite.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      locale="de"
      title="Datenschutzhinweise"
      intro="Diese Seite ist bewusst schlank aufgebaut: keine Cookies, kein Analytics, keine Marketing-Tracker. Trotzdem fallen bei einer normalen Auslieferung einer Website in der Regel technische Verarbeitungen an, insbesondere durch Hosting und Server-Logs."
      type="privacy"
    >
      <LegalSection title="Verantwortlicher">
        <p>{siteConfig.legal.controllerName}</p>
        <p>{siteConfig.legal.street}</p>
        <p>{siteConfig.legal.city}</p>
        <p>{siteConfig.legal.country}</p>
        <p>E-Mail: {siteConfig.legal.email}</p>
      </LegalSection>

      <LegalSection title="Hosting">
        <p>
          Diese Website wird über folgenden Hosting-Anbieter ausgeliefert:{" "}
          <strong>{siteConfig.legal.hostingProvider}</strong>.
        </p>
        <p>
          Bitte ergänze hier vor Veröffentlichung den konkreten Anbieter, die Empfängerkategorien
          und gegebenenfalls die datenschutzrechtlichen Zusatzinformationen deines Deployments.
        </p>
      </LegalSection>

      <LegalSection title="Keine Cookies, kein Analytics, kein Tracking">
        <p>
          Diese Website setzt nach aktuellem Stand keine Marketing- oder Analyse-Cookies. Es werden
          keine Tracking-Skripte, keine Analytics-Dienste und keine externen Werbe- oder
          Profiling-Tools eingebunden.
        </p>
        <p>
          Ebenfalls werden nach aktuellem Stand keine clientseitigen Mechanismen wie `localStorage`,
          `sessionStorage` oder ähnliche Browser-Speicher für Marketing- oder Komfortzwecke
          eingesetzt.
        </p>
      </LegalSection>

      <LegalSection title="Server-Logfiles">
        <p>
          Beim Aufruf dieser Website verarbeitet der Hosting-Anbieter in der Regel technische
          Zugriffsdaten, etwa IP-Adresse, Datum und Uhrzeit der Anfrage, angefragte Ressource,
          User-Agent und Referrer.
        </p>
        <p>
          Die Verarbeitung erfolgt zur sicheren Bereitstellung der Website, zur Fehleranalyse und
          zur Abwehr von Missbrauch. Rechtsgrundlage ist in der Regel Art. 6 Abs. 1 lit. f DSGVO.
        </p>
      </LegalSection>

      <LegalSection title="Externe Links">
        <p>
          Diese Website verlinkt unter anderem auf GitHub. Wenn du einem solchen Link folgst,
          verlässt du diese Website. Für die Verarbeitung personenbezogener Daten auf den verlinkten
          Seiten sind die jeweiligen Betreiber verantwortlich.
        </p>
      </LegalSection>

      <LegalSection title="Schriftarten und technische Assets">
        <p>
          Die auf dieser Seite verwendeten Schriftarten werden lokal ausgeliefert. Nach aktuellem
          Stand werden keine Schriftarten dynamisch von Google Fonts oder vergleichbaren externen
          CDN-Diensten nachgeladen.
        </p>
      </LegalSection>

      <LegalSection title="Deine Rechte">
        <p>
          Dir stehen nach Maßgabe der DSGVO insbesondere Rechte auf Auskunft, Berichtigung,
          Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen die
          Verarbeitung zu.
        </p>
        <p>
          Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
        </p>
      </LegalSection>

      <LegalSection title="Stand und Aktualisierung">
        <p>
          Diese Datenschutzhinweise sollten vor dem Go-live mit den tatsächlichen
          Infrastrukturangaben, Kontaktinformationen und Hosting-Details vervollständigt werden.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
