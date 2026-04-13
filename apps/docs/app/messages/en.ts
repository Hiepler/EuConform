export const en = {
  meta: {
    title: "EuConform — Open Infrastructure for AI Act Evidence",
    description:
      "EuConform is an offline-first evidence engine for European AI systems. Explore the EuConform Evidence Format, reference projects, and the scan-to-verify workflow.",
    ogAlt: "EuConform — Open Infrastructure for AI Act Evidence",
  },
  header: {
    brandTag: "Evidence infrastructure",
    nav: {
      ecef: "Spec",
      principles: "Principles",
      references: "Reference projects",
    },
    readSpec: "Read the spec",
    viewGithub: "View on GitHub",
  },
  hero: {
    eyebrow: "Open specification for AI Act evidence",
    headline: "European AI compliance deserves infrastructure, not black boxes.",
    body: "EuConform builds structured evidence for European AI systems. Scan a real codebase, verify the bundle, and inspect the same artifacts in the browser. The EuConform format is the open specification that makes those artifacts portable, machine-readable, and verifiable.",
    primaryCta: "Explore the specification",
    secondaryCta: "Try the builder flow",
  },
  pillars: [
    "Offline-first evidence for local and sensitive AI systems",
    "Open specification instead of compliance black boxes",
    "Integrity-aware bundles that can be verified before handoff",
  ],
  whyExists: {
    eyebrow: "Why this exists",
    headline:
      "PDFs, screenshots, and proprietary dashboards are a weak foundation for AI Act evidence.",
    body: "We think AI compliance work should be inspectable, versionable, and shareable across tools. EuConform is built for teams that run local models, sensitive workflows, or European deployments and want technical evidence that stays legible outside of one vendor UI.",
  },
  vision: {
    eyebrow: "Mission",
    title: "Built in Europe, for the teams the AI Act actually touches.",
    body: "EuConform exists because serious AI governance should not be locked behind enterprise consulting contracts. We are building open, inspectable evidence infrastructure so European teams of any size can meet the AI Act with clarity instead of fear — and so independent auditors, regulators, and communities can verify what was actually built.",
    cards: [
      {
        title: "For European teams",
        body: "Sovereign evidence that stays on your infrastructure. No telemetry, no vendor lock-in, no data leaving the systems under review.",
      },
      {
        title: "For the long tail",
        body: "Startups, public sector, Mittelstand — the AI Act applies to you too. The EuConform format is designed to be adoptable without a Big-Four compliance budget.",
      },
      {
        title: "For the ecosystem",
        body: "An open spec means other tools, auditors, and researchers can build on top. Evidence should travel across vendors, not be owned by one.",
      },
    ],
  },
  process: {
    eyebrow: "How it works",
    title: "A builder workflow, not a brochure workflow.",
    body: "EuConform is organized around one path: scan implementation evidence, verify the artifact set, then review it in context. The result is a protocol for structured AI evidence, not a polished spreadsheet hidden behind a marketing page.",
    steps: [
      {
        step: "01",
        title: "Scan a real codebase",
        description:
          "Generate structured artifacts from implementation evidence instead of relying on questionnaires alone.",
      },
      {
        step: "02",
        title: "Verify the bundle",
        description:
          "Check hashes, schemas, and metadata consistency before handing evidence to CI, auditors, or collaborators.",
      },
      {
        step: "03",
        title: "Review in context",
        description:
          "Inspect the same artifacts in the browser and continue with human classification where legal interpretation still matters.",
      },
    ],
  },
  ecef: {
    eyebrow: "The Format",
    title: "A protocol stack for AI Act evidence, not just an AI BOM.",
    body: "AI BOM matters, but it is only one layer. The EuConform format ties inventory, compliance evidence, CI enforcement, and integrity-aware transport into one format family that can move between scanners, pipelines, viewers, and downstream tools.",
    layers: [
      {
        eyebrow: "Inventory",
        title: "AI BOM",
        schema: "euconform.aibom.v1",
        accent: "bg-[#d7e0f0] text-[#17345c]",
        description:
          "Maps models, runtimes, providers, retrieval layers, and technical capabilities into one machine-readable AI inventory.",
        bullets: [
          "components, sources, and runtime hints",
          "capability flags for bias evaluation, exports, logging, and incidents",
        ],
      },
      {
        eyebrow: "Evidence",
        title: "Report",
        schema: "euconform.report.v1",
        accent: "bg-[#ece2d3] text-[#593827]",
        description:
          "Turns scanner findings into compliance signals, gaps, open questions, and prioritized recommendations for human review.",
        bullets: ["7 compliance areas", "gaps, confidence levels, and assessment hints"],
      },
      {
        eyebrow: "Gate",
        title: "CI",
        schema: "euconform.ci.v1",
        accent: "bg-[#dfe8db] text-[#23442a]",
        description:
          "Adds a lightweight enforcement layer so repositories can fail or warn on evidence thresholds in automation.",
        bullets: ["gap counts and thresholds", "builder-friendly CI summaries"],
      },
      {
        eyebrow: "Transport",
        title: "Bundle",
        schema: "euconform.bundle.v1",
        accent: "bg-[#e3dff2] text-[#39275f]",
        description:
          "Packages artifact sets into a verifiable manifest with SHA-256 hashes so evidence stays portable and integrity-aware.",
        bullets: ["manifest plus ZIP wrapper", "hashes and metadata consistency checks"],
      },
    ],
  },
  aiAct: {
    eyebrow: "AI Act context",
    title: "What the AI Act asks for — and where the EuConform format plugs in.",
    body: "The EU AI Act stages obligations across several years and distinguishes between Providers, Deployers, Importers, and Distributors. Most of those obligations eventually need technical evidence: inventories, documentation, logs, incident records, and proof of oversight. The EuConform format focuses on the parts that can be generated from code, configuration, and runtime signals — so the human interpretation can start from something concrete.",
    roles: [
      {
        role: "Provider",
        description:
          "Develops or places an AI system on the EU market under its own name. Bears most of the documentation, risk-management, and conformity obligations.",
        ecef: "AI BOM + Report carry the inventory and implementation evidence. Bundle makes handoff to notified bodies verifiable.",
      },
      {
        role: "Deployer",
        description:
          "Uses an AI system under its own authority — e.g. a company integrating a third-party model. Responsible for oversight, record-keeping, and use-context disclosure.",
        ecef: "Report flags transparency, logging, and oversight signals. CI enforces evidence thresholds in internal pipelines.",
      },
      {
        role: "Importer / Distributor",
        description:
          "Places AI systems from outside the EU onto the market or makes them available. Must verify that providers have documented the system adequately.",
        ecef: "Verifiable Bundle with SHA-256 integrity lets partners audit what was actually shipped, without trusting a PDF.",
      },
    ],
    disclaimer:
      "the EuConform format does not replace legal advice. It structures technical evidence so that humans — engineering, compliance, legal — can review AI systems with less guesswork.",
  },
  principles: {
    eyebrow: "Principles",
    title: "Open-source evidence infrastructure needs an explicit point of view.",
    body: "EuConform is not trying to automate legal judgment away. It tries to make technical evidence clearer, more portable, and harder to fake. That distinction matters for trust, especially in Europe.",
    pullQuote:
      "Human review should be strengthened by evidence, not replaced by a confident dashboard.",
    items: [
      {
        title: "Machine-readable over PDF-first",
        body: "Evidence should be versioned, diffable, and inspectable by tools before it turns into a document for humans.",
      },
      {
        title: "Open by construction",
        body: "the EuConform format is an open specification, not a walled garden. Artifacts are meant to travel beyond one product.",
      },
      {
        title: "Human review stays in the loop",
        body: "EuConform produces technical evidence, not automated legal verdicts. Ambiguity remains visible instead of being hidden.",
      },
    ],
  },
  goldenPath: {
    eyebrow: "Try the format",
    title: "A clear golden path for OSS builders and early adopters.",
    body: "The shortest serious path today is to run the CLI locally, generate a bundle, verify it, and inspect the artifacts in the viewer. No cloud account and no hidden pipeline required.",
    whatLabel: "What this demonstrates",
    what: [
      "Real codebase scan instead of synthetic example JSON.",
      "Bundle generation plus integrity verification.",
      "Direct bridge into the EuConform web viewer.",
    ],
    nextLabel: "Where to go next",
    readSpec: "Read the spec",
    cliDocs: "Open CLI docs",
  },
  referenceProjects: {
    eyebrow: "Reference projects",
    title: "Small enough to understand, real enough to prove the workflow.",
    body: "These examples are not decorative demos. They exist to prove that the EuConform format is usable outside the EuConform internals and to give builders a fast path into `scan → verify → view`.",
    exampleLabel: "Example",
    sourceCta: "View source project",
    bundleCta: "Open canonical bundle",
    projects: [
      {
        title: "Ollama Chatbot",
        description:
          "Local inference, disclosure hooks, export flows, and verify-ready bundles for a compact but realistic chat surface.",
        sourceHref: "https://github.com/Hiepler/EuConform/tree/main/examples/ollama-chatbot",
        bundleHref: "/schemas/spec/examples/local-ollama/euconform.bundle.json",
      },
      {
        title: "RAG Assistant",
        description:
          "Retrieval workflows, vector storage, and local inference in a project that demonstrates how the EuConform format handles AI systems with memory.",
        sourceHref: "https://github.com/Hiepler/EuConform/tree/main/examples/rag-assistant",
        bundleHref: "/schemas/spec/examples/rag/euconform.bundle.json",
      },
    ],
  },
  footer: {
    eyebrow: "EuConform",
    tagline: "Open infrastructure for AI Act evidence.",
    body: "Offline-first by design. Structured for human review. Built to help European teams exchange AI evidence without surrendering it to opaque vendor silos.",
    trustNote: "No cookies. No analytics. No tracking.",
    links: {
      ecef: "Spec",
      examples: "Examples",
      github: "GitHub",
      legalNotice: "Legal Notice",
      privacy: "Privacy",
    },
  },
  localeSwitcher: {
    label: "Language",
    en: "EN",
    de: "DE",
  },
  assembly: {
    badge: "EuConform Assembly",
    verifiedLabel: "verified",
    okLabel: "ok",
    cards: {
      report: ["7 compliance areas", "5 gaps", "4 open questions"],
      aibom: ["3 inference modes", "components + capabilities", "inventory layer"],
      ci: ["fail thresholds", "top gaps", "automation-friendly"],
      bundle: ["sha256 hashes", "transport manifest", "verify-ready"],
    },
  },
};
