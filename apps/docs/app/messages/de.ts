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
      biasCheck: "Bias-Check",
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
  biasCheck: {
    eyebrow: "Bias-Testing",
    title: "Die Open-Source Bias-Testing-Pipeline für den AI Act.",
    body: "EuConform enthält eine CrowS-Pairs Bias-Testing-Pipeline, die vollständig offline läuft. Messe soziale Verzerrungen in Sprachmodellen mit Log-Probability-Scoring — kein proprietäres Tool, keine Cloud-Abhängigkeit, auditierbare Ergebnisse.",
    cards: [
      {
        title: "CrowS-Pairs",
        body: "Wissenschaftlich fundierte Methodik (Nangia et al., 2020) zur Messung stereotyper Verzerrungen in Sprachmodellen.",
      },
      {
        title: "~100 deutsche Paare",
        body: "Kulturell adaptiert für den deutschen und europäischen Kontext — eine Lücke schließend, die US-zentrische Benchmarks offen lassen.",
      },
      {
        title: "Log-Probability-Scoring",
        body: "Gold-Standard-Metrik, die Token-Wahrscheinlichkeiten zwischen stereotypen und anti-stereotypen Sätzen vergleicht.",
      },
    ],
    cta: "Mehr über Bias-Testing erfahren",
  },
  biasCheckPage: {
    meta: {
      title: "Bias-Testing — EuConform",
      description:
        "Messe soziale Verzerrungen in Sprachmodellen mit CrowS-Pairs — offline, Open Source und gebaut für den EU AI Act. Log-Probability-Scoring, deutsch-adaptierte Paare und auditierbare Evidenz.",
    },
    hero: {
      eyebrow: "Bias-Testing",
      headline: "Bias-Testing für europäische KI-Systeme.",
      body: "Die einzige Open-Source Bias-Testing-Pipeline mit kulturell adaptierten europäischen Satzpaaren. Basierend auf CrowS-Pairs (Nangia et al., 2020) mit ~100 deutsch-adaptierten Paaren zu Gender, Religion, Nationalität und sozioökonomischer Verzerrung. Läuft lokal auf deiner Infrastruktur — keine Cloud-Abhängigkeit, auditierbare AI-Act-Evidenz.",
    },
    methodology: {
      eyebrow: "So funktioniert es",
      headline: "CrowS-Pairs-Methodik",
      body: "CrowS-Pairs (Nangia et al., 2020) misst soziale Verzerrungen, indem verglichen wird, wie ein Sprachmodell stereotype vs. anti-stereotype Satzpaare bewertet. EuConform berechnet die mittlere Log-Probability-Differenz über alle Paare und erzeugt einen einzelnen, interpretierbaren Bias-Score.",
      metric: "Score = mean(logprob_stereo − logprob_anti)",
      thresholds: [
        { label: "> 0,1", description: "Leichte Verzerrung" },
        { label: "> 0,3", description: "Starke Verzerrung" },
      ],
      methods: [
        {
          method: "Log-Probability",
          indicator: "Gold-Standard",
          description:
            "Direkter Token-Wahrscheinlichkeitsvergleich über Browser-Inferenz oder Ollama mit logprobs-Unterstützung.",
        },
        {
          method: "Latenz-Fallback",
          indicator: "Approximation",
          description:
            "Timing-basierte Heuristik für Ollama-Instanzen ohne logprobs-Unterstützung.",
        },
      ],
    },
    germanAdaptation: {
      eyebrow: "Europäischer Kontext",
      headline: "~100 Paare für die deutsche Kultur adaptiert",
      body: "Der originale CrowS-Pairs-Datensatz spiegelt US-zentrische Stereotypen wider. EuConform enthält ~100 Satzpaare, die für den deutschen und europäischen kulturellen Kontext adaptiert wurden — mit Kategorien zu Gender, Religion, Nationalität und sozioökonomischen Verzerrungen, die für EU-Deployment-Szenarien relevant sind.",
      highlight:
        "Kein anderes Open-Source Bias-Testing-Tool bietet kulturell adaptierte europäische Satzpaare.",
    },
    integration: {
      eyebrow: "Compliance-Integration",
      headline: "Von Bias-Scores zu auditierbarer Evidenz",
      body: "Bias-Testergebnisse sind keine isolierten Metriken — sie fließen in den EuConform-Evidence-Stack und verbinden messbare Bias-Daten mit AI-Act-Pflichten.",
      items: [
        {
          title: "AI BOM",
          description:
            "Das biasEvaluation-Capability-Flag im AIBOM-Schema erfasst, ob Bias-Testing durchgeführt wurde und verifizierbar ist.",
        },
        {
          title: "Report",
          description:
            "Bias-Methodik, Scores und Schwellenwerte erscheinen im Compliance-Report mit vollständiger Rückverfolgbarkeit zum Testlauf.",
        },
        {
          title: "CI Gate",
          description:
            "CI-Schwellenwerte können Pipelines fehlschlagen lassen, wenn Bias-Scores akzeptable Levels überschreiten — Durchsetzung vor dem Deployment.",
        },
      ],
      aiActNote:
        "AI Act Artikel 10 verlangt von Anbietern, Trainingsdaten auf Verzerrungen zu untersuchen. Artikel 15 fordert Genauigkeits- und Robustheitstests. Ohne strukturierte Bias-Evidenz entstehen Audit-Lücken, die sich nachträglich nur schwer schließen lassen. EuConform macht Bias-Testing von Anfang an auditierbar.",
    },
    exampleOutput: {
      eyebrow: "Was du bekommst",
      headline: "Strukturierte Bias-Evidenz in deinem Compliance-Report",
      body: "Bias-Testergebnisse werden als strukturiertes JSON in deinem EuConform-Report erfasst — maschinenlesbar, diffbar und bereit für Auditoren.",
      json: `{
  "biasTesting": {
    "status": "assessed",
    "confidence": "medium",
    "evidence": [
      "CrowS-Pairs bias evaluation performed",
      "Score: 0.08 (below light-bias threshold)",
      "Method: log-probability (gold standard)",
      "Dataset: 100 German-adapted pairs"
    ],
    "biasMethodology": {
      "method": "logprobs_exact",
      "dataset": "crows_pairs_de",
      "score": 0.08,
      "threshold": 0.1
    }
  }
}`,
    },
    ethics: {
      eyebrow: "Ethik-Erklärung",
      body: "Die Stereotypen-Paare im CrowS-Pairs-Datensatz werden ausschließlich zur wissenschaftlichen Evaluation verwendet und spiegeln nicht die Meinung der Entwickler wider. Einzelne Paare werden in der Benutzeroberfläche nicht angezeigt, um die Verstärkung schädlicher Stereotypen zu vermeiden — es werden nur aggregierte Metriken dargestellt.",
      citation:
        "Nangia, N., Vania, C., Bhalerao, R., & Bowman, S. R. (2020). CrowS-Pairs: A Challenge Dataset for Measuring Social Biases in Masked Language Models.",
      license: "Datensatz lizenziert unter CC BY-SA 4.0.",
    },
    cta: {
      eyebrow: "Selbst ausprobieren",
      headline: "Zwei Wege für Bias-Testing",
      body: "Nutze das CLI für headless- und CI-Workflows oder die Web-App für einen interaktiven Compliance-Wizard. Beide verwenden dieselbe CrowS-Pairs-Engine und produzieren auditierbare Ergebnisse.",
      engines: [
        {
          title: "CLI + Ollama",
          description:
            "Bias-Tests direkt vom Terminal gegen jedes lokale Ollama-Modell ausführen. Ergebnisse als strukturiertes JSON und Markdown — bereit für CI-Pipelines und Evidence-Bundles.",
        },
        {
          title: "Web-App",
          description:
            "Interaktiver Compliance-Wizard mit Browser-basierter Inferenz (Transformers.js) oder Ollama. Ergebnisse fließen in PDF-Exporte und Annex-IV-JSON-Reports.",
        },
      ],
      cliCommand: `# Standalone Bias-Test
euconform bias llama3.2 --lang de

# Oder integriert in einen Scan
euconform scan ./your-project --bias --model llama3.2`,
      links: {
        webapp: "Web-App öffnen",
        spec: "Spec lesen",
        github: "GitHub öffnen",
      },
    },
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
      biasCheck: "Bias-Check",
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
