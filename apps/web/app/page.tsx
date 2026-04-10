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
  GpaiQuizScreen,
  IntroScreen,
  ModelSelectScreen,
  QuizScreen,
  ResultsScreen,
  ScanViewerScreen,
} from "../components/screens";
import { useCustomTestSuite } from "../lib/contexts/CustomTestSuiteContext";
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
  const { testCases: customTestCases } = useCustomTestSuite();
  const wizard = useComplianceWizard(customTestCases);

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
          onSelectGpaiRole={wizard.handleSelectGpaiRole}
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
          onBack={wizard.navigateBackToIntro}
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

    case "gpai-quiz":
      return (
        <GpaiQuizScreen
          currentQuestion={wizard.gpaiCurrentQuestion}
          totalQuestions={wizard.gpaiTotalQuestions}
          answers={wizard.gpaiAnswers}
          onAnswer={wizard.handleGpaiAnswer}
          onBack={wizard.navigateGpaiBack}
          onNavigateBack={wizard.navigateToPreviousGpaiQuestion}
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

    case "results": {
      const isGpaiPath = wizard.userRole === "gpai-provider";
      if (isGpaiPath && !wizard.gpaiAssessment) return null;
      if (!isGpaiPath && !wizard.assessment) return null;
      return (
        <ResultsScreen
          assessment={wizard.assessment}
          gpaiAssessment={wizard.gpaiAssessment}
          userRole={wizard.userRole}
          biasResult={wizard.biasResult}
          selectedModel={wizard.selectedModel}
          selectedCapability={wizard.selectedCapability}
          isGeneratingPdf={wizard.isGeneratingPdf}
          onGeneratePdf={wizard.handleGeneratePdf}
          onDownloadJson={wizard.handleDownloadAnnexIvJson}
          onReset={wizard.resetAll}
        />
      );
    }

    case "scan-viewer":
      return (
        <ScanViewerScreen
          onNavigateToWizard={() => wizard.setStep("intro")}
          onBack={() => wizard.setStep("intro")}
        />
      );

    default:
      return null;
  }
}
