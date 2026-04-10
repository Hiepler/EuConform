import { describe, expect, it } from "vitest";
import type { DetectorContext, ScanFile } from "../../src/evidence/types";
import { detectAiFrameworkSignals } from "../../src/scanner/detectors/ai-framework-detector";
import { detectAiProviderSignals } from "../../src/scanner/detectors/ai-provider-detector";
import { detectCompliance } from "../../src/scanner/detectors/compliance-detector";
import { detectConfig } from "../../src/scanner/detectors/config-detector";
import { detectFrameworks } from "../../src/scanner/detectors/framework-detector";
import { detectLocalInferenceSignals } from "../../src/scanner/detectors/local-inference-detector";
import { detectMarkdown } from "../../src/scanner/detectors/markdown-detector";
import { detectPackageJsonSignals } from "../../src/scanner/detectors/package-json-detector";
import { detectRagSignals } from "../../src/scanner/detectors/rag-detector";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeContext(
  file: Partial<ScanFile> & { content: string; relativePath: string }
): DetectorContext {
  const extension =
    file.extension ??
    (file.relativePath.split(".").pop() ? `.${file.relativePath.split(".").pop()}` : "");
  const provenance =
    file.provenance ??
    (extension === ".md" && !file.relativePath.includes("/") ? "root-docs" : "runtime");

  const scanFile = {
    relativePath: file.relativePath,
    absolutePath: `/test/${file.relativePath}`,
    extension,
    content: file.content,
    sizeBytes: file.content.length,
    provenance,
  };

  return {
    file: scanFile,
    lines: scanFile.content.split("\n"),
    allFiles: [],
  };
}

// ---------------------------------------------------------------------------
// package-json-detector
// ---------------------------------------------------------------------------

describe("package-json-detector", () => {
  it("detects AI provider and framework signals from package.json", () => {
    const ctx = makeContext({
      relativePath: "package.json",
      extension: ".json",
      content: JSON.stringify({
        dependencies: {
          openai: "^4.0.0",
          next: "^14.0.0",
        },
      }),
    });

    const signals = detectPackageJsonSignals(ctx);

    const categories = signals.map((s) => s.category);
    expect(categories).toContain("ai-provider");
    expect(categories).toContain("framework");

    const openaiSignal = signals.find((s) => s.category === "ai-provider");
    expect(openaiSignal).toBeDefined();
    expect(openaiSignal?.confidence).toBe("high");
  });

  it("returns empty for non-package files", () => {
    const ctx = makeContext({
      relativePath: "src/index.ts",
      extension: ".ts",
      content: '{ "openai": "^4.0.0" }',
    });

    expect(detectPackageJsonSignals(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ai-provider-detector
// ---------------------------------------------------------------------------

describe("ai-provider-detector", () => {
  it("detects OpenAI import in TypeScript", () => {
    const ctx = makeContext({
      relativePath: "src/ai.ts",
      extension: ".ts",
      content: 'import OpenAI from "openai";\n\nconst client = new OpenAI();',
    });

    const signals = detectAiProviderSignals(ctx);

    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals[0]?.category).toBe("ai-provider");
    expect(signals[0]?.id).toBe("ai-provider-openai");
  });

  it("ignores non-source files", () => {
    const ctx = makeContext({
      relativePath: "README.md",
      extension: ".md",
      content: 'import OpenAI from "openai";',
    });

    expect(detectAiProviderSignals(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ai-framework-detector
// ---------------------------------------------------------------------------

describe("ai-framework-detector", () => {
  it("detects LangChain import", () => {
    const ctx = makeContext({
      relativePath: "src/chain.ts",
      extension: ".ts",
      content: 'import { ChatOpenAI } from "langchain/chat_models";\n',
    });

    const signals = detectAiFrameworkSignals(ctx);

    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals[0]?.category).toBe("ai-framework");
    expect(signals[0]?.id).toContain("langchain");
  });
});

// ---------------------------------------------------------------------------
// local-inference-detector
// ---------------------------------------------------------------------------

describe("local-inference-detector", () => {
  it("detects Ollama localhost URL", () => {
    const ctx = makeContext({
      relativePath: "src/llm.ts",
      extension: ".ts",
      content: 'new Ollama({ host: "http://localhost:11434" })',
    });

    const signals = detectLocalInferenceSignals(ctx);

    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals.some((s) => s.category === "local-inference")).toBe(true);
    // localhost:11434 is a high-confidence signal
    const ollamaSignal = signals.find((s) => s.id.includes("ollama-api"));
    expect(ollamaSignal).toBeDefined();
    expect(ollamaSignal?.confidence).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// rag-detector
// ---------------------------------------------------------------------------

describe("rag-detector", () => {
  it("detects ChromaDB import", () => {
    const ctx = makeContext({
      relativePath: "src/rag.ts",
      extension: ".ts",
      content: 'import { ChromaClient } from "chromadb";\n\nconst chroma = new ChromaClient();',
    });

    const signals = detectRagSignals(ctx);

    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals.some((s) => s.category === "rag")).toBe(true);
    const chromaSignal = signals.find((s) => s.id === "rag-chromadb");
    expect(chromaSignal).toBeDefined();
    expect(chromaSignal?.confidence).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// framework-detector
// ---------------------------------------------------------------------------

describe("framework-detector", () => {
  it("detects Next.js from config file", () => {
    const ctx = makeContext({
      relativePath: "next.config.ts",
      extension: ".ts",
      content: "export default { reactStrictMode: true };",
    });

    const signals = detectFrameworks(ctx);

    expect(signals.length).toBeGreaterThanOrEqual(1);
    const nextSignal = signals.find((s) => s.id === "framework-nextjs");
    expect(nextSignal).toBeDefined();
    expect(nextSignal?.category).toBe("framework");
    expect(nextSignal?.confidence).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// compliance-detector
// ---------------------------------------------------------------------------

describe("compliance-detector", () => {
  it("detects AI disclosure text and logging library", () => {
    const ctx = makeContext({
      relativePath: "app/page.tsx",
      extension: ".tsx",
      content: [
        'import pino from "pino";',
        "const logger = pino();",
        '// This response was "generated by AI"',
        'logger.info({ action: "ai-response" }, "done");',
      ].join("\n"),
    });

    const signals = detectCompliance(ctx);

    const categories = signals.map((s) => s.category);
    expect(categories).toContain("compliance-disclosure");
    expect(categories).toContain("compliance-logging");
  });
});

// ---------------------------------------------------------------------------
// config-detector
// ---------------------------------------------------------------------------

describe("config-detector", () => {
  it("detects AI provider from .env.example", () => {
    const ctx = makeContext({
      relativePath: ".env.example",
      extension: "",
      content: "OPENAI_API_KEY=\nDATABASE_URL=postgres://localhost/db\n",
    });

    const signals = detectConfig(ctx);

    expect(signals.length).toBeGreaterThanOrEqual(1);
    const openaiSignal = signals.find((s) => s.category === "ai-provider");
    expect(openaiSignal).toBeDefined();
    expect(openaiSignal?.confidence).toBe("high");
    // Ensure the value is not leaked — only the key name
    expect(openaiSignal?.evidence[0]?.snippet).not.toContain("=");
  });
});

// ---------------------------------------------------------------------------
// markdown-detector
// ---------------------------------------------------------------------------

describe("markdown-detector", () => {
  it("detects AI disclosure in README", () => {
    const ctx = makeContext({
      relativePath: "README.md",
      extension: ".md",
      content: "# My App\n\nThis app uses artificial intelligence to generate responses.\n",
    });

    const signals = detectMarkdown(ctx);

    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals.some((s) => s.category === "compliance-disclosure")).toBe(true);
  });

  it("ignores non-markdown files", () => {
    const ctx = makeContext({
      relativePath: "src/index.ts",
      extension: ".ts",
      content: "This app uses artificial intelligence",
    });

    expect(detectMarkdown(ctx)).toHaveLength(0);
  });
});
