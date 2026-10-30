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
  QuizScreen,
  ResultsScreen,
  ScanViewerScreen,
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
          setStep={wizard.setStep}
          onStart={wizard.handleStartQuiz}
          onSelectGpaiRole={wizard.handleSelectGpaiRole}
          selectedModel={wizard.selectedModel}
          onModelChange={wizard.setSelectedModel}
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
          onBack={wizard.navigateBackToIntro}
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
          onBack={wizard.navigateBackToIntro}
          onNavigateBack={wizard.navigateToPreviousGpaiQuestion}
        />
      );

    case "bias-test":
      return <BiasTestScreen onSkip={wizard.handleSkipBiasTest} />;

    case "results": {
      const isGpaiPath = wizard.userRole === "gpai-provider";
      if (isGpaiPath && !wizard.gpaiAssessment) return null;
      if (!isGpaiPath && !wizard.assessment) return null;
      return (
        <ResultsScreen
          assessment={wizard.assessment}
          gpaiAssessment={wizard.gpaiAssessment}
          userRole={wizard.userRole}
          selectedModel={wizard.selectedModel}
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
