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
      biasCheck: "Bias Check",
      close: "Close menu",
      openMenu: "Open menu",
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
  biasCheck: {
    eyebrow: "Bias Testing",
    title: "The open-source bias testing pipeline built for the AI Act.",
    body: "EuConform includes a CrowS-Pairs bias testing pipeline that runs entirely offline. Measure social bias in language models with log-probability scoring — no proprietary tool, no cloud dependency, auditable results.",
    cards: [
      {
        title: "CrowS-Pairs",
        body: "Scientifically grounded methodology (Nangia et al., 2020) for measuring stereotypical bias in language models.",
      },
      {
        title: "~100 German Pairs",
        body: "Culturally adapted for the German and European context — filling a gap that US-centric benchmarks leave open.",
      },
      {
        title: "Log-Probability Scoring",
        body: "Gold-standard metric comparing token probabilities between stereotypical and anti-stereotypical sentences.",
      },
    ],
    cta: "Learn more about bias testing",
  },
  biasCheckPage: {
    meta: {
      title: "Bias Testing — EuConform",
      description:
        "Measure social bias in language models with CrowS-Pairs — offline, open-source, and built for the EU AI Act. Log-probability scoring, German-adapted pairs, and auditable evidence.",
    },
    hero: {
      eyebrow: "Bias Testing",
      headline: "Bias testing built for European AI systems.",
      body: "The only open-source bias testing pipeline with culturally adapted European sentence pairs. Based on CrowS-Pairs (Nangia et al., 2020) with ~100 German-adapted pairs covering gender, religion, nationality, and socioeconomic bias. Runs locally on your infrastructure — no cloud dependency, auditable AI Act evidence.",
    },
    methodology: {
      eyebrow: "How it works",
      headline: "CrowS-Pairs methodology",
      body: "CrowS-Pairs (Nangia et al., 2020) measures social bias by comparing how a language model scores stereotypical vs. anti-stereotypical sentence pairs. EuConform calculates the mean log-probability difference across all pairs to produce a single, interpretable bias score.",
      metric: "Score = mean(logprob_stereo − logprob_anti)",
      thresholds: [
        { label: "> 0.1", description: "Light Bias" },
        { label: "> 0.3", description: "Strong Bias" },
      ],
      methods: [
        {
          method: "Log-Probability",
          indicator: "Gold Standard",
          description:
            "Direct token probability comparison via browser inference or Ollama with logprobs support.",
        },
        {
          method: "Latency Fallback",
          indicator: "Approximation",
          description: "Timing-based heuristic for Ollama instances without logprobs support.",
        },
      ],
    },
    germanAdaptation: {
      eyebrow: "European context",
      headline: "~100 pairs adapted for German culture",
      body: "The original CrowS-Pairs dataset reflects US-centric stereotypes. EuConform includes ~100 sentence pairs adapted for the German and European cultural context — covering gender, religion, nationality, and socioeconomic bias categories relevant to EU deployment scenarios.",
      highlight:
        "No other open-source bias testing tool offers culturally adapted European sentence pairs.",
    },
    integration: {
      eyebrow: "Compliance integration",
      headline: "From bias scores to auditable evidence",
      body: "Bias test results are not standalone metrics — they flow into the EuConform evidence stack, connecting measurable bias data to AI Act obligations.",
      items: [
        {
          title: "AI BOM",
          description:
            "The biasEvaluation capability flag in the AIBOM schema records whether bias testing was performed and is verifiable.",
        },
        {
          title: "Report",
          description:
            "Bias methodology, scores, and thresholds appear in the compliance report with full traceability to the test run.",
        },
        {
          title: "CI Gate",
          description:
            "CI thresholds can fail pipelines when bias scores exceed acceptable levels — enforcement before deployment.",
        },
      ],
      aiActNote:
        "AI Act Article 10 requires providers to examine training data for biases. Article 15 mandates accuracy and robustness testing. Without structured bias evidence, these obligations create audit gaps that are difficult to close retroactively. EuConform makes bias testing auditable from the start.",
    },
    exampleOutput: {
      eyebrow: "What you get",
      headline: "Structured bias evidence in your compliance report",
      body: "Bias test results are captured as structured JSON in your EuConform report — machine-readable, diffable, and ready for auditors.",
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
      eyebrow: "Ethics statement",
      body: "The stereotype pairs in the CrowS-Pairs dataset are used solely for scientific evaluation and do not reflect the opinions of the developers. Individual pairs are not displayed in the UI to avoid reinforcing harmful stereotypes — only aggregated metrics are shown.",
      citation:
        "Nangia, N., Vania, C., Bhalerao, R., & Bowman, S. R. (2020). CrowS-Pairs: A Challenge Dataset for Measuring Social Biases in Masked Language Models.",
      license: "Dataset licensed under CC BY-SA 4.0.",
    },
    cta: {
      eyebrow: "Try it yourself",
      headline: "Run bias testing in the compliance wizard",
      body: "Bias testing runs inside the EuConform web app as part of the compliance wizard. Choose between browser-based inference (Transformers.js, zero setup) or connect a local Ollama instance for larger models. Results flow directly into your PDF export and Annex IV JSON report.",
      engines: [
        {
          title: "Browser Inference",
          description:
            "Runs directly in your browser via Transformers.js. No installation, no server — open the app and start testing.",
        },
        {
          title: "Ollama (Local LLM)",
          description:
            "Connect to a local Ollama instance for testing larger models like Llama 3.2+ or Mistral 7B+. Supports log-probability scoring for gold-standard accuracy.",
        },
      ],
      links: {
        webapp: "Open the web app",
        spec: "Read the spec",
        github: "View on GitHub",
      },
    },
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
      biasCheck: "Bias Check",
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
