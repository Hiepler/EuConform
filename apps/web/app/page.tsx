"use client";

/**
 * EU AI Act Compliance Wizard - Main Page
 *
 * This page orchestrates the compliance wizard flow using extracted screen
 * components and the useComplianceWizard hook for state management.
 *
 * The wizard consists of 5 steps:
 * 1. Intro - Landing page with engine selection
 * 2. Model Select - Choose AI model for testing
 * 3. Quiz - Annex III risk assessment questionnaire
 * 4. Bias Test - CrowS-Pairs bias detection
 * 5. Results - Compliance report and export options
 */

import {
  BiasTestScreen,
  IntroScreen,
  ModelSelectScreen,
  QuizScreen,
  ResultsScreen,
} from "../components/screens";
import { useComplianceWizard } from "../lib/hooks";
import { LanguageProvider } from "../lib/i18n/LanguageContext";

/**
 * Main page component wrapped with LanguageProvider
 */
export default function Page() {
  return (
    <LanguageProvider>
      <ComplianceWizard />
    </LanguageProvider>
  );
}

/**
 * ComplianceWizard orchestrates the wizard flow using the useComplianceWizard hook
 * and renders the appropriate screen component based on the current step.
 */
function ComplianceWizard() {
  const wizard = useComplianceWizard();

  // Render the appropriate screen based on current step
  switch (wizard.step) {
    case "intro":
      return (
        <IntroScreen
          selectedEngine={wizard.selectedEngine}
          capabilities={wizard.capabilities}
          onEngineSelect={wizard.handleEngineSelect}
          setSelectedModel={wizard.setSelectedModel}
          setStep={wizard.setStep}
        />
      );

    case "model-select":
      return (
        <ModelSelectScreen
          selectedModel={wizard.selectedModel}
          selectedCapability={wizard.selectedCapability}
          selectedEngine={wizard.selectedEngine}
          error={wizard.error}
          onModelSelect={wizard.handleModelSelect}
          onBack={() => wizard.setStep("intro")}
          onContinue={wizard.handleStartQuiz}
        />
      );

    case "quiz":
      return (
        <QuizScreen
          currentQuestion={wizard.currentQuestion}
          totalQuestions={wizard.totalQuestions}
          answers={wizard.answers}
          selectedModel={wizard.selectedModel}
          onAnswer={wizard.handleAnswer}
          onBack={wizard.navigateBackToModelSelect}
          onNavigateBack={wizard.navigateToPreviousQuestion}
        />
      );

    case "bias-test":
      return (
        <BiasTestScreen
          isRunning={wizard.isRunningBiasTest}
          progress={wizard.biasProgress}
          currentStep={wizard.biasCurrentStep}
          modelLoadingStatus={wizard.modelLoadingStatus}
          error={wizard.error}
          selectedModel={wizard.selectedModel}
          onRunTest={wizard.handleRunBiasTest}
          onSkip={wizard.handleSkipBiasTest}
        />
      );

    case "results":
      // Only render results if we have an assessment
      if (!wizard.assessment) {
        return null;
      }
      return (
        <ResultsScreen
          assessment={wizard.assessment}
          biasResult={wizard.biasResult}
          selectedModel={wizard.selectedModel}
          selectedCapability={wizard.selectedCapability}
          isGeneratingPdf={wizard.isGeneratingPdf}
          onGeneratePdf={wizard.handleGeneratePdf}
          onDownloadJson={wizard.handleDownloadAnnexIvJson}
          onReset={wizard.resetAll}
        />
      );

    default:
      return null;
  }
}
