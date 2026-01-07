"use client";

import type { InferenceCapabilities } from "@euconform/core";
import { ArrowRight, Cpu, Github, Server, Shield } from "lucide-react";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import type { InferenceEngine, WizardStep } from "../../lib/types/wizard";
import { BackgroundElements, PageHeader } from "../shared";

/**
 * Props for the IntroScreen component
 */
export interface IntroScreenProps {
  /** Currently selected inference engine */
  selectedEngine: InferenceEngine;
  /** Detected inference capabilities */
  capabilities: InferenceCapabilities | null;
  /** Handler for engine selection and navigation */
  onEngineSelect: (engine: InferenceEngine) => void;
  /** Handler for setting selected model */
  setSelectedModel: (model: string) => void;
  /** Handler for navigating to a step */
  setStep: (step: WizardStep) => void;
}

/**
 * IntroScreen displays the landing page with hero section, engine selection,
 * and CTA to start the EU AI Act compliance assessment.
 */
export function IntroScreen({
  selectedEngine,
  capabilities,
  onEngineSelect,
  setSelectedModel,
  setStep,
}: IntroScreenProps) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen flex items-center justify-center relative">
      {/* Subtle EU Stars Background */}
      <BackgroundElements variant="intro" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <PageHeader />
      </div>

      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        {/* Institutional Badge */}
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 border border-border dark:border-border-dark rounded-full text-xs font-medium tracking-wide text-slate-600 dark:text-slate-400">
          <Shield className="w-3 h-3" />
          {t("eu_ai_act_compliance")}
        </div>

        {/* Serif Headline */}
        <h1 className="font-serif text-5xl sm:text-7xl font-bold text-slate-deep dark:text-paper mb-6 tracking-tight">
          {t("title")}
        </h1>

        <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 mb-4 font-light">
          {t("subtitle")}
        </p>

        <p className="text-base text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          {t("intro_desc")}
        </p>

        {/* Clean Toggle for Mode Selection */}
        <div className="mb-12 inline-flex items-center gap-0 border border-border dark:border-border-dark rounded-lg p-1 bg-white/50 dark:bg-slate-medium/50">
          <button
            type="button"
            onClick={() => {
              onEngineSelect("browser");
              setSelectedModel("Xenova/distilgpt2");
              setStep("model-select");
            }}
            className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
              selectedEngine === "browser"
                ? "bg-slate-deep dark:bg-paper text-paper dark:text-slate-deep"
                : "hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Cpu className="w-4 h-4 inline mr-2" />
            {t("browser_engine")}
          </button>
          <button
            type="button"
            onClick={() => {
              onEngineSelect("ollama");
              setStep("model-select");
            }}
            className={`px-6 py-3 rounded-md text-sm font-medium transition-all relative ${
              selectedEngine === "ollama"
                ? "bg-slate-deep dark:bg-paper text-paper dark:text-slate-deep"
                : "hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Server className="w-4 h-4 inline mr-2" />
            {t("ollama_engine")}
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full gold-bg text-white">
              ★
            </span>
          </button>
        </div>

        {/* Single CTA */}
        <button
          type="button"
          onClick={() => {
            if (selectedEngine === "browser") {
              setSelectedModel("Xenova/distilgpt2");
            } else if (selectedEngine === "ollama" && capabilities?.ollama.models?.[0]) {
              setSelectedModel(capabilities.ollama.models[0].name);
            }
            setStep("model-select");
          }}
          className="inline-flex items-center gap-2 px-8 py-4 border-2 border-slate-deep dark:border-paper text-slate-deep dark:text-paper font-medium rounded-lg hover:bg-slate-deep hover:text-paper dark:hover:bg-paper dark:hover:text-slate-deep transition-all duration-300"
        >
          {t("intro_start")}
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border dark:border-border-dark">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/Hiepler/EuConform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <Github className="w-4 h-4" />
                {t("github_link")}
              </a>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {t("privacy_first_note")}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
