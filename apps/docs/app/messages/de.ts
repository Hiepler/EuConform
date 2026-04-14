import type { Messages } from "../lib/i18n";

export const de: Messages = {
  meta: {
    title: "EuConform — Offene Infrastruktur für AI-Act-Evidence",
    description:
      "EuConform ist eine offline-first Evidence-Engine für europäische KI-Systeme. Entdecke das EuConform Evidence Format, Referenzprojekte und den Scan-to-Verify-Workflow.",
    ogAlt: "EuConform — Offene Infrastruktur für AI-Act-Evidence",
  },
  header: {
    brandTag: "Evidence-Infrastruktur",
    nav: {
      ecef: "Spec",
      principles: "Prinzipien",
      references: "Referenzprojekte",
      close: "Menü schließen",
      openMenu: "Menü öffnen",
    },
    readSpec: "Spec lesen",
    viewGithub: "GitHub öffnen",
  },
  hero: {
    eyebrow: "Offene Spezifikation für AI-Act-Evidence",
    headline: "Offene Infrastruktur für europäische KI-Compliance.",
    body: "EuConform erzeugt strukturierte, überprüfbare Evidence für europäische KI-Systeme. Scanne eine echte Codebase, verifiziere das Bundle und inspiziere dieselben Artefakte im Browser. Das EuConform-Format ist die offene Spezifikation hinter diesem Workflow.",
    primaryCta: "Spezifikation ansehen",
    secondaryCta: "Builder-Flow ausprobieren",
  },
  pillars: [
    "Offline-first Evidence für lokale und sensible KI-Systeme",
    "Offene Spezifikation statt Compliance-Black-Boxes",
    "Integritätsgesicherte Bundles, die vor der Übergabe verifiziert werden können",
  ],
  whyExists: {
    eyebrow: "Warum es das gibt",
    headline:
      "PDFs, Screenshots und proprietäre Dashboards sind ein schwaches Fundament für AI-Act-Evidence.",
    body: "KI-Compliance sollte inspizierbar, versionierbar und zwischen Tools teilbar sein. EuConform ist für Teams gebaut, die lokale Modelle, sensible Workflows oder europäische Deployments betreiben und technische Evidence brauchen, die außerhalb einer einzigen Vendor-UI lesbar bleibt.",
  },
  vision: {
    eyebrow: "Mission",
    title: "Gebaut in Europa, für die Teams, die der AI Act tatsächlich betrifft.",
    body: "EuConform existiert, weil ernsthafte KI-Governance nicht hinter Enterprise-Beraterverträgen verschlossen sein sollte. Wir bauen offene, inspizierbare Evidence-Infrastruktur, damit europäische Teams jeder Größe den AI Act mit Klarheit statt Angst erfüllen können — und damit unabhängige Auditoren, Regulatoren und Communities überprüfen können, was tatsächlich gebaut wurde.",
    cards: [
      {
        title: "Für europäische Teams",
        body: "Souveräne Evidence, die in deiner Infrastruktur bleibt. Keine Telemetrie, kein Vendor-Lock-in, keine Daten, die das geprüfte System verlassen.",
      },
      {
        title: "Für den Long Tail",
        body: "Startups, öffentlicher Sektor, Mittelstand — der AI Act gilt auch für euch. Das EuConform-Format ist so entworfen, dass es ohne Big-Four-Compliance-Budget adoptierbar ist.",
      },
      {
        title: "Für das Ökosystem",
        body: "Eine offene Spec bedeutet, dass andere Tools, Auditoren und Forschende darauf aufbauen können. Evidence sollte zwischen Anbietern reisen, nicht einem gehören.",
      },
    ],
  },
  process: {
    eyebrow: "So funktioniert es",
    title: "Ein Builder-Workflow, kein Hochglanz-Workflow.",
    body: "EuConform ist um einen klaren Pfad organisiert: Implementierungs-Evidence scannen, das Artefakt-Set verifizieren, im Kontext reviewen. Das Ergebnis ist ein Protokoll für strukturierte KI-Evidence — keine polierte Tabelle hinter einer Marketing-Seite.",
    steps: [
      {
        step: "01",
        title: "Echten Codebase scannen",
        description:
          "Strukturierte Artefakte aus Implementierungs-Evidence erzeugen, statt sich auf Fragebögen zu verlassen.",
      },
      {
        step: "02",
        title: "Bundle verifizieren",
        description:
          "Hashes, Schemata und Metadaten-Konsistenz prüfen, bevor Evidence an CI, Auditoren oder Partner übergeben wird.",
      },
      {
        step: "03",
        title: "Im Kontext reviewen",
        description:
          "Dieselben Artefakte im Browser inspizieren und dort weiterarbeiten, wo rechtliche Interpretation menschliche Einordnung braucht.",
      },
    ],
  },
  ecef: {
    eyebrow: "Das Format",
    title: "Ein Protokoll-Stack für AI-Act-Evidence — nicht nur eine AI BOM.",
    body: "AI BOM ist wichtig, aber nur eine Schicht. Das EuConform-Format verbindet Inventory, Compliance-Evidence, CI-Enforcement und integritätsgesicherten Transport zu einer Format-Familie, die zwischen Scannern, Pipelines, Viewern und nachgelagerten Tools reisen kann.",
    layers: [
      {
        eyebrow: "Inventory",
        title: "AI BOM",
        schema: "euconform.aibom.v1",
        accent: "bg-[#d7e0f0] text-[#17345c]",
        description:
          "Bildet Modelle, Runtimes, Provider, Retrieval-Schichten und technische Fähigkeiten in einem maschinenlesbaren KI-Inventar ab.",
        bullets: [
          "Komponenten, Quellen und Runtime-Hinweise",
          "Capability-Flags für Bias-Evaluation, Exports, Logging und Incidents",
        ],
      },
      {
        eyebrow: "Evidence",
        title: "Report",
        schema: "euconform.report.v1",
        accent: "bg-[#ece2d3] text-[#593827]",
        description:
          "Überführt Scanner-Ergebnisse in Compliance-Signale, Lücken, offene Fragen und priorisierte Empfehlungen für menschliches Review.",
        bullets: ["7 Compliance-Bereiche", "Lücken, Konfidenzstufen und Bewertungs-Hinweise"],
      },
      {
        eyebrow: "Gate",
        title: "CI",
        schema: "euconform.ci.v1",
        accent: "bg-[#dfe8db] text-[#23442a]",
        description:
          "Fügt eine leichte Enforcement-Schicht hinzu, damit Repositories bei Evidence-Schwellen in der Automation fehlschlagen oder warnen können.",
        bullets: ["Gap-Counts und Schwellen", "Builder-freundliche CI-Zusammenfassungen"],
      },
      {
        eyebrow: "Transport",
        title: "Bundle",
        schema: "euconform.bundle.v1",
        accent: "bg-[#e3dff2] text-[#39275f]",
        description:
          "Verpackt Artefakt-Sets in ein verifizierbares Manifest mit SHA-256-Hashes, damit Evidence portabel und integritätsgesichert bleibt.",
        bullets: ["Manifest plus ZIP-Wrapper", "Hash- und Metadaten-Konsistenzprüfungen"],
      },
    ],
  },
  aiAct: {
    eyebrow: "AI-Act-Kontext",
    title: "Was der AI Act verlangt — und wo das EuConform-Format einsetzt.",
    body: "Der EU AI Act staffelt Pflichten über mehrere Jahre und unterscheidet zwischen Providern, Deployern, Importeuren und Distributoren. Die meisten dieser Pflichten brauchen irgendwann technische Evidence: Inventare, Dokumentation, Logs, Incident-Records, Nachweise über Aufsicht. Das EuConform-Format fokussiert die Teile, die aus Code, Konfiguration und Runtime-Signalen erzeugt werden können — damit die menschliche Einordnung von etwas Konkretem ausgehen kann.",
    roles: [
      {
        role: "Provider",
        description:
          "Entwickelt oder bringt ein KI-System unter eigenem Namen auf den EU-Markt. Trägt die meisten Dokumentations-, Risikomanagement- und Konformitätspflichten.",
        ecef: "AI BOM + Report tragen Inventar und Implementierungs-Evidence. Das Bundle macht die Übergabe an benannte Stellen verifizierbar.",
      },
      {
        role: "Deployer",
        description:
          "Nutzt ein KI-System unter eigener Verantwortung — z. B. ein Unternehmen, das ein Drittanbietermodell integriert. Verantwortlich für Aufsicht, Record-Keeping und Offenlegung im Nutzungskontext.",
        ecef: "Der Report markiert Transparenz-, Logging- und Aufsichts-Signale. CI erzwingt Evidence-Schwellen in internen Pipelines.",
      },
      {
        role: "Importeur / Distributor",
        description:
          "Bringt KI-Systeme aus Drittländern in der EU in Verkehr oder macht sie verfügbar. Muss verifizieren, dass Provider das System angemessen dokumentiert haben.",
        ecef: "Ein verifizierbares Bundle mit SHA-256-Integrität lässt Partner auditieren, was tatsächlich ausgeliefert wurde — ohne einem PDF vertrauen zu müssen.",
      },
    ],
    disclaimer:
      "das EuConform-Format ersetzt keine Rechtsberatung. Es strukturiert technische Evidence, damit Menschen — Engineering, Compliance, Legal — KI-Systeme mit weniger Rätselraten reviewen können.",
  },
  principles: {
    eyebrow: "Prinzipien",
    title: "Open-Source-Evidence-Infrastruktur braucht einen expliziten Standpunkt.",
    body: "EuConform versucht nicht, rechtliche Bewertung wegzuautomatisieren. Es macht technische Evidence klarer, portabler und schwerer zu fälschen. Diese Unterscheidung ist wichtig für Vertrauen — gerade in Europa.",
    pullQuote:
      "Menschliches Review sollte durch Evidence gestärkt werden — nicht durch ein selbstbewusstes Dashboard ersetzt.",
    items: [
      {
        title: "Maschinenlesbar statt PDF-first",
        body: "Evidence sollte versioniert, diffbar und von Tools inspizierbar sein, bevor sie zu einem Dokument für Menschen wird.",
      },
      {
        title: "Offen by Construction",
        body: "Das EuConform-Format ist eine offene Spezifikation, kein Walled Garden. Artefakte sollen über ein Produkt hinaus reisen können.",
      },
      {
        title: "Menschliches Review bleibt im Loop",
        body: "EuConform erzeugt technische Evidence, keine automatisierten rechtlichen Urteile. Mehrdeutigkeit bleibt sichtbar, statt versteckt zu werden.",
      },
    ],
  },
  goldenPath: {
    eyebrow: "Format ausprobieren",
    title: "Ein klarer Golden Path für OSS-Builder und Early Adopters.",
    body: "Der kürzeste seriöse Weg heute: CLI lokal ausführen, Bundle erzeugen, verifizieren, Artefakte im Viewer inspizieren. Kein Cloud-Account, keine versteckte Pipeline nötig.",
    whatLabel: "Was das demonstriert",
    what: [
      "Echter Codebase-Scan statt synthetischem Beispiel-JSON.",
      "Bundle-Generierung plus Integritätsprüfung.",
      "Direkter Anschluss an den EuConform-Web-Viewer.",
    ],
    nextLabel: "Wohin als nächstes",
    readSpec: "Spec lesen",
    cliDocs: "CLI-Docs öffnen",
  },
  referenceProjects: {
    eyebrow: "Referenzprojekte",
    title: "Klein genug zum Verstehen, echt genug, um den Workflow zu belegen.",
    body: "Diese Beispiele sind keine dekorativen Demos. Sie belegen, dass das EuConform-Format außerhalb der EuConform-Internals nutzbar ist, und geben Buildern einen schnellen Einstieg in `scan → verify → view`.",
    exampleLabel: "Beispiel",
    sourceCta: "Quellprojekt ansehen",
    bundleCta: "Kanonisches Bundle öffnen",
    projects: [
      {
        title: "Ollama Chatbot",
        description:
          "Lokale Inferenz, Disclosure-Hooks, Export-Flows und verify-ready Bundles für eine kompakte, realistische Chat-Oberfläche.",
        sourceHref: "https://github.com/Hiepler/EuConform/tree/main/examples/ollama-chatbot",
        bundleHref: "/schemas/spec/examples/local-ollama/euconform.bundle.json",
      },
      {
        title: "RAG Assistant",
        description:
          "Retrieval-Workflows, Vector-Storage und lokale Inferenz in einem Projekt, das zeigt, wie das EuConform-Format KI-Systeme mit Gedächtnis handhabt.",
        sourceHref: "https://github.com/Hiepler/EuConform/tree/main/examples/rag-assistant",
        bundleHref: "/schemas/spec/examples/rag/euconform.bundle.json",
      },
    ],
  },
  footer: {
    eyebrow: "EuConform",
    tagline: "Offene Infrastruktur für AI-Act-Evidence.",
    body: "Offline-first by Design. Strukturiert für menschliches Review. Gebaut, um europäischen Teams den Austausch von KI-Evidence zu ermöglichen, ohne sie an undurchsichtige Vendor-Silos abzugeben.",
    trustNote: "Keine Cookies. Kein Analytics. Kein Tracking.",
    links: {
      ecef: "Spec",
      examples: "Beispiele",
      github: "GitHub",
      legalNotice: "Impressum",
      privacy: "Datenschutz",
    },
  },
  localeSwitcher: {
    label: "Sprache",
    en: "EN",
    de: "DE",
  },
  assembly: {
    badge: "EuConform Assembly",
    verifiedLabel: "verifiziert",
    okLabel: "ok",
    cards: {
      report: ["7 Compliance-Bereiche", "5 Lücken", "4 offene Fragen"],
      aibom: ["3 Inferenz-Modi", "Komponenten + Capabilities", "Inventory-Layer"],
      ci: ["Fail-Schwellen", "Top-Lücken", "Automation-freundlich"],
      bundle: ["SHA256-Hashes", "Transport-Manifest", "Verify-ready"],
    },
  },
};
