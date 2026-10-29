"use client";

/**
 * Bias Evidence viewer.
 *
 * The web app does not measure bias (that needs a local model and a real
 * sentence log-probability engine: `euconform bias --engine transformers`).
 * This page imports the resulting `euconform.bias.v2` artifacts instead —
 * one for a report view, two for a comparison — and validates them locally.
 */

import { useRouter } from "next/navigation";
import { BiasEvidenceScreen } from "../../components/screens";
import { LanguageProvider } from "../../lib/i18n/LanguageContext";

export default function BiasEvidencePage() {
  const router = useRouter();

  return (
    <LanguageProvider>
      <BiasEvidenceScreen onBack={() => router.push("/")} />
    </LanguageProvider>
  );
}
