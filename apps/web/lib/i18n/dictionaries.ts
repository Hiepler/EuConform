export type Language = "en" | "de";

export interface Dictionary {
  // Header
  title: string;
  subtitle: string;

  // Steps
  step_intro: string;
  step_model: string;
  step_quiz: string;
  step_bias: string;
  step_results: string;

  // Intro
  intro_title: string;
  intro_desc: string;
  intro_start: string;

  // Bias Test
  bias_title: string;
  bias_desc: string;
  bias_run: string;
  bias_running: string;
  bias_disclaimer: string;
  bias_source: string;
  bias_license: string;

  // Results
  results_title: string;
  results_passed: string;
  results_failed: string;
  results_score: string;
  results_threshold: string;
  results_severity_strong: string;
  results_severity_light: string;
  results_category_title: string;
  results_new_test: string;
  results_download_pdf: string;
  results_download_json: string;
  results_generating: string;

  // Common
  loading: string;
  error: string;

  // Missing keys
  select_model_title: string;
  ollama_running: string;
  ollama_not_found_title: string;
  ollama_not_found_desc: string;
  ollama_load_model: string;
  ollama_check_again: string;
  browser_models_title: string;
  browser_models_note: string;
  continue_to_risk_assessment: string;
  back: string;
  bias_test_title: string;
  bias_test_description: string;
  bias_error_title: string;
  bias_error_unexpected: string;
  bias_analyzing: string;
  bias_loading_dataset: string;
  bias_initializing_model: string;
  bias_analyzing_pairs: string;
  bias_processing_pair: string;
  bias_finalizing: string;
  bias_progress_detail: string;
  model_loading: string;
  bias_start_test: string;
  skip: string;
  analysis_complete: string;
  compliance_assessment_title: string;
  no_legal_advice_title: string;
  risk_classification_title: string;
  bias_fairness_title: string;
  passed: string;
  failed: string;
  stereotype_preference: string;
  strong_bias: string;
  light_bias: string;
  results_by_category: string;
  disclaimer: string;
  recommendations_title: string;
  generating: string;
  sources_title: string;
  high_risk_indicator: string;
  non_legal_advice_note: string;
  legal_basis_default: string;

  // PDF specific
  no_legal_advice_title_pdf: string;
  pdf_model: string;
  pdf_not_specified: string;
  pdf_engine: string;
  pdf_generated: string;
  pdf_level: string;
  pdf_score: string;
  bias_fairness_title_pdf: string;
  pdf_status: string;
  pdf_severity: string;
  pdf_severity_none: string;
  pdf_generated_by: string;

  // Annex IV
  annex_iv_no_seed: string;
  annex_iv_provider: string;
  annex_iv_unspecified_system: string;
  annex_iv_intended_purpose: string;
  annex_iv_logging_notes: string;
  annex_iv_disparate_impact: string;
  annex_iv_crows_pairs_note: string;

  // Engine names
  browser_engine: string;
  ollama_engine: string;
  github_link: string;
  impressum: string;
  datenschutz: string;
  privacy_first_note: string;

  // Quiz Questions
  quiz_q1: string;
  quiz_q2: string;
  quiz_q3: string;
  quiz_q4: string;
  quiz_q5: string;
  quiz_q6: string;
  quiz_q7: string;
  quiz_q8: string;

  quiz_yes: string;
  quiz_no: string;

  // Capability features
  detecting_capabilities: string;
  selected_model_capability: string;
  method_consistent: string;
  method_fallback_used: string;

  // Model Selector & Recommendations
  select_model_description: string;
  refresh: string;
  loading_delay_message: string;
  progress: string;
  model_detection_error: string;
  retry: string;
  hide_explanations: string;
  show_explanations: string;
  select_model_description_long: string;
  analyzing_available_models: string;
  please_wait: string;
  other_options: string;

  // Model Grid Badges & Text
  badge_exact_calculation: string;
  badge_exact_logprobs: string;
  badge_latency_fallback: string;
  last_tested: string;
  select_model_aria: string;
  no_models_available: string;
  no_models_found: string;
  evaluation_models_available: string;
  start_ollama_instruction: string;
  not_tested: string;

  // Recommendations
  rec_browser_title: string;
  rec_browser_desc: string;
  rec_exact_title: string;
  rec_exact_desc: string;
  rec_fallback_title: string;
  rec_fallback_desc: string;
  rec_available_title: string;
  rec_available_desc: string;
  rec_none_title: string;
  rec_none_desc_1: string;
  rec_none_desc_2: string;
  rec_summary_browser: string;
  rec_advice_browser: string;
  rec_summary_exact: string;
  rec_advice_exact: string;
  rec_summary_fallback: string;
  rec_advice_fallback: string;
  accuracy_highest: string;
  accuracy_high: string;
  accuracy_medium: string;
  accuracy_low: string;
  privacy_maximum: string;
  privacy_high: string;
  privacy_medium: string;
  privacy_low: string;
  recommended: string;
  local_browser_inference: string;
  ollama_server: string;
  select: string;
  selected: string;

  // Explanation Panel
  understand_methods: string;
  scientific_basis: string;
  rec_recommended: string;
  accuracy_label: string;
  privacy_label: string;
  model_label: string;

  // Risk Level Labels
  risk_prohibited: string;
  risk_high: string;
  risk_limited: string;
  risk_minimal: string;

  // PDF Methodology
  pdf_methodology: string;
  pdf_methodology_logprobs: string;
  pdf_methodology_latency: string;
  pdf_methodology_default: string;
  pdf_dataset: string;
  pdf_citation: string;

  // Annex IV Bias Methodology
  annex_bias_logprobs_desc: string;
  annex_bias_latency_desc: string;
  annex_bias_default_desc: string;

  // Header Badge
  eu_ai_act_compliance: string;

  // Disclaimer texts
  disclaimer_non_legal_advice: string;
  disclaimer_no_guarantee: string;
  disclaimer_data_privacy: string;
  disclaimer_experimental_tool: string;

  // Deadline Timeline
  timeline_section_title: string;
  timeline_section_subtitle: string;
  timeline_today_label: string;
  timeline_days_ago: string;
  timeline_days_left: string;
  timeline_in_force_since: string;
  timeline_status_past: string;
  timeline_status_imminent: string;
  timeline_status_upcoming: string;
  timeline_status_future: string;
  timeline_relevant_badge: string;
  timeline_proposed_badge: string;
  timeline_show_obligations: string;
  timeline_hide_obligations: string;
  timeline_omnibus_title: string;
  timeline_omnibus_desc: string;
  timeline_penalty_label: string;
  // Phase titles
  timeline_phase0_title: string;
  timeline_phase0_subtitle: string;
  timeline_phase1_title: string;
  timeline_phase1_subtitle: string;
  timeline_phase2_title: string;
  timeline_phase2_subtitle: string;
  timeline_phase3_title: string;
  timeline_phase3_subtitle: string;
  timeline_phase4_title: string;
  timeline_phase4_subtitle: string;
  // Obligation titles
  timeline_obligation_regulation_published: string;
  timeline_obligation_definitions: string;
  timeline_obligation_prohibited: string;
  timeline_obligation_ai_literacy: string;
  timeline_obligation_gpai_documentation: string;
  timeline_obligation_gpai_copyright: string;
  timeline_obligation_gpai_systemic_risk: string;
  timeline_obligation_notified_bodies: string;
  timeline_obligation_governance: string;
  timeline_obligation_penalties_framework: string;
  timeline_obligation_high_risk_requirements: string;
  timeline_obligation_risk_management: string;
  timeline_obligation_data_governance: string;
  timeline_obligation_transparency_deployers: string;
  timeline_obligation_human_oversight: string;
  timeline_obligation_conformity_assessment: string;
  timeline_obligation_ce_marking: string;
  timeline_obligation_eu_database: string;
  timeline_obligation_limited_risk_transparency: string;
  timeline_obligation_post_market: string;
  timeline_obligation_annex_i_products: string;
  timeline_obligation_gpai_grace_period_ends: string;
  // Omnibus proposals
  timeline_omnibus_phase3_title: string;
  timeline_omnibus_phase3_subtitle: string;
  timeline_omnibus_phase4_title: string;
  timeline_omnibus_phase4_subtitle: string;
  timeline_omnibus_high_risk_delayed: string;
  timeline_omnibus_annex_i_delayed: string;
}

export const dictionaries: Record<Language, Dictionary> = {
  en: {
    title: "EuConform",
    subtitle: "EU AI Act Compliance Checker",

    step_intro: "Introduction",
    step_model: "Model",
    step_quiz: "Risk Quiz",
    step_bias: "Bias Check",
    step_results: "Results",

    intro_title: "EuConform",
    intro_desc:
      "The open-source tool for EU AI Act compliance. Check risk classes, measure bias, and generate technical documentation - 100% offline.",
    intro_start: "Start Assessment",

    bias_title: "Bias & Fairness Check",
    bias_desc:
      "We test your model for stereotype bias using the CrowS-Pairs methodology (Nangia et al., 2020).",
    bias_run: "Run Bias Test",
    bias_running: "Running Test...",
    bias_disclaimer:
      "Disclaimer: Stereotype pairs are based on the CrowS-Pairs dataset (Nangia et al., 2020) and are licensed under CC BY-SA 4.0. They serve solely for scientific evaluation.",
    bias_source: "Source",
    bias_license: "License",

    results_title: "Bias & Fairness Results",
    results_passed: "PASSED",
    results_failed: "ATTENTION",
    results_score: "Stereotype Preference",
    results_threshold: "Threshold",
    results_severity_strong: "STRONG BIAS",
    results_severity_light: "LIGHT BIAS",
    results_category_title: "Results by Category",
    results_new_test: "New Assessment",
    results_download_pdf: "PDF Report",
    results_download_json: "Annex-IV JSON",
    results_generating: "Generating...",

    loading: "Loading...",
    error: "An error occurred.",

    select_model_title: "Select Model",
    ollama_running: "Ollama running locally",
    ollama_not_found_title: "Ollama not found",
    ollama_not_found_desc: "Install Ollama to test large models locally.",
    ollama_load_model: "Load model",
    ollama_check_again: "Check again",
    browser_models_title: "Browser Models (WebGPU/CPU)",
    browser_models_note:
      "Note: Browser models are smaller. For real bias tests, we recommend Ollama.",
    continue_to_risk_assessment: "Continue to Risk Assessment",
    back: "Back",
    bias_test_title: "Bias Test",
    bias_test_description:
      "Scientific check for systematic stereotypes using CrowS-Pairs-DE dataset.",
    bias_error_title: "Analysis Error",
    bias_error_unexpected: "An unexpected error occurred.",
    bias_analyzing: "Analyzing sentence pairs...",
    bias_loading_dataset: "Loading dataset...",
    bias_initializing_model: "Initializing model...",
    bias_analyzing_pairs: "Analyzing pairs...",
    bias_finalizing: "Finalizing results...",
    bias_processing_pair: "Processing pair {current}/{total}",
    bias_progress_detail: "Analyzing Pair {current} / {total}",
    model_loading: "Loading model...",
    bias_start_test: "Start Test (20 Pairs)",
    skip: "Skip",
    analysis_complete: "ANALYSIS COMPLETE",
    compliance_assessment_title: "Compliance Assessment",
    no_legal_advice_title: "No Legal Advice",
    risk_classification_title: "Risk Classification",
    bias_fairness_title: "Bias & Fairness (CrowS-Pairs-DE)",
    passed: "PASSED",
    failed: "ATTENTION",
    stereotype_preference: "Stereotype Preference",
    strong_bias: "STRONG BIAS",
    light_bias: "LIGHT BIAS",
    results_by_category: "Results by Category",
    disclaimer: "Disclaimer",
    recommendations_title: "Recommendations",
    generating: "Generating...",
    sources_title: "Sources (Excerpt)",
    high_risk_indicator: "High-Risk Indicator: at least one Annex III category answered 'Yes'.",
    non_legal_advice_note:
      "Note (Art. 5): Check if your use case falls under prohibited practices. This tool provides technical red flags only, no legal assessment.",
    legal_basis_default: "Regulation (EU) 2024/1689 – Art. 6–7 / Annex III (Self-assessment)",

    no_legal_advice_title_pdf: "Disclaimer (No legal advice):",
    pdf_model: "Model",
    pdf_not_specified: "Not specified",
    pdf_engine: "Engine",
    pdf_generated: "Generated",
    pdf_level: "Level",
    pdf_score: "Score",
    bias_fairness_title_pdf: "Bias & Fairness (CrowS-Pairs-DE Log-Prob)",
    pdf_status: "Status",
    pdf_severity: "Severity",
    pdf_severity_none: "NONE",
    pdf_generated_by: "Generated by EuConform",

    annex_iv_no_seed: "No sampling seed recorded (bias test not run).",
    annex_iv_provider: "Unspecified (self-assessment)",
    annex_iv_unspecified_system: "Unspecified system",
    annex_iv_intended_purpose: "Unspecified (fill in for Annex IV)",
    annex_iv_logging_notes: "Logging template is a technical scaffold (non-legal-advice).",
    annex_iv_disparate_impact:
      "Disparate Impact < 0.8 is an indicator of potential discrimination – further review recommended.",
    annex_iv_crows_pairs_note:
      "CrowS-Pairs Log-Prob: Stereotype Preference above threshold is a bias indicator (screening, context-dependent).",

    browser_engine: "Browser",
    ollama_engine: "Ollama",
    github_link: "Open Source on GitHub",
    impressum: "Imprint",
    datenschutz: "Privacy",
    privacy_first_note: "GDPR-compliant",

    quiz_q1:
      "Biometric Identification/Categorization? Is the system used for biometric identification or categorization of natural persons (e.g., face, voice, gait)?",
    quiz_q2:
      "Critical Infrastructure Management? Is the AI used as a safety component in the management/operation of critical infrastructure (e.g., traffic, water, energy)?",
    quiz_q3:
      "Education & Vocational Training? Is the system used for admission, assignment, or evaluation in education or vocational training?",
    quiz_q4:
      "Employment & Worker Management? Is the AI used for recruitment, selection, promotion, or termination of employment relationships?",
    quiz_q5:
      "Access to Essential Services? Is the system used to evaluate eligibility for public benefits/services or creditworthiness?",
    quiz_q6:
      "Law Enforcement? Is the AI used by law enforcement for risk assessment, polygraphs, or evidence evaluation?",
    quiz_q7:
      "Migration, Asylum & Border Control? Is the system used for polygraphs, risk assessment, or verifying travel documents?",
    quiz_q8:
      "Administration of Justice? Is the AI used to assist judicial authorities in interpreting facts or applying the law?",

    quiz_yes: "Yes",
    quiz_no: "No",

    // Capability features
    detecting_capabilities: "Detecting model capabilities...",
    selected_model_capability: "Selected Model Capability",
    method_consistent: "Method Consistent",
    method_fallback_used: "Fallback Method Used",

    // Model Selector & Recommendations
    select_model_description: "Select a model for bias analysis",
    refresh: "Refresh",
    loading_delay_message: "This may take a few seconds",
    progress: "Progress",
    model_detection_error: "Error detecting models",
    retry: "Retry",
    hide_explanations: "Hide explanations",
    show_explanations: "Show additional explanations",
    select_model_description_long:
      "Choose the inference model for your bias analysis. We recommend local browser inference for maximum precision and data privacy.",
    analyzing_available_models: "Analyzing available models...",
    please_wait: "Please wait a moment.",
    other_options: "Other Options",

    // Model Grid Badges & Text
    badge_exact_calculation: "Guaranteed exact calculation",
    badge_exact_logprobs: "Exact Log-Probabilities",
    badge_latency_fallback: "Latency Estimation (Fallback)",
    last_tested: "Last tested:",
    select_model_aria: "Select Model",
    no_models_available: "No models available",
    no_models_found: "No available models were found.",
    evaluation_models_available: "Evaluation models available",
    start_ollama_instruction: "Start Ollama or use a modern browser for local inference.",
    not_tested: "Not tested",

    // Recommendations
    rec_browser_title: "Best choice for accuracy and privacy",
    rec_browser_desc:
      "Browser inference offers exact log-probabilities with maximum data security as all calculations happen locally.",
    rec_exact_title: "Scientifically precise method",
    rec_exact_desc:
      "This Ollama model supports true log-probabilities for highest scientific accuracy in bias measurements.",
    rec_fallback_title: "Fallback method available",
    rec_fallback_desc:
      "Uses latency-based estimation as a proxy for bias measurement. Less precise but functional.",
    rec_available_title: "Model available",
    rec_available_desc: "This model can be used for bias analysis.",
    rec_none_title: "No recommended models available",
    rec_none_desc_1: "You can still select an available model, but accuracy may be limited.",
    rec_none_desc_2: "Please ensure Ollama is running or use browser inference.",
    rec_summary_browser: "Browser inference recommended for best results",
    rec_advice_browser: "Guarantees exact calculations with maximum data security.",
    rec_summary_exact: "Model(s) with exact log-probabilities available",
    rec_advice_exact: "Select a recommended model for scientifically precise bias measurements.",
    rec_summary_fallback: "Fallback methods available",
    rec_advice_fallback: "For better accuracy, we recommend an Ollama update or browser inference.",
    accuracy_highest: "Highest",
    accuracy_high: "High",
    accuracy_medium: "Medium",
    accuracy_low: "Low",
    privacy_maximum: "Maximum",
    privacy_high: "High",
    privacy_medium: "Medium",
    privacy_low: "Low",
    recommended: "Recommended",
    local_browser_inference: "Local Browser Inference",
    ollama_server: "Ollama Server",
    select: "Select",
    selected: "Selected",

    // Explanation Panel
    understand_methods: "Understand Calculation Methods",
    scientific_basis: "Scientific basis of bias detection",
    rec_recommended: "Recommended",
    accuracy_label: "Accuracy:",
    privacy_label: "Privacy:",
    model_label: "Model:",

    // Risk Level Labels
    risk_prohibited: "PROHIBITED",
    risk_high: "HIGH RISK",
    risk_limited: "LIMITED RISK",
    risk_minimal: "MINIMAL RISK",

    // PDF Methodology
    pdf_methodology: "Methodology:",
    pdf_methodology_logprobs: "Bias score calculated using log-probability difference",
    pdf_methodology_latency: "Latency proxy fallback used",
    pdf_methodology_default: "Method:",
    pdf_dataset: "Dataset: CrowS-Pairs (German adaptation)",
    pdf_citation: "Citation: Nangia et al. (2020) - CrowS-Pairs methodology",

    // Annex IV Bias Methodology
    annex_bias_logprobs_desc:
      "Bias score calculated using log-probability difference between stereotypical and anti-stereotypical sentences",
    annex_bias_latency_desc:
      "Latency proxy fallback used - Model or Ollama version does not support log-probabilities",
    annex_bias_default_desc: "Bias calculation using available methodology",

    // Header Badge
    eu_ai_act_compliance: "EU AI ACT COMPLIANCE",

    // Disclaimer texts
    disclaimer_non_legal_advice:
      "This tool provides technical assistance and guidance. The results do not replace a legally binding conformity assessment by a notified body or legal advice.",
    disclaimer_no_guarantee:
      "The analysis is based on current scientific methods but does not guarantee complete detection of all forms of bias. Results should be understood as indicators, not as a final assessment.",
    disclaimer_data_privacy:
      "All calculations are performed locally in your browser or on your local Ollama server. No data is transmitted to external servers.",
    disclaimer_experimental_tool:
      "This is an experimental research tool. The methodology for bias detection is continuously being developed. Use the results as supplementary information within a comprehensive AI governance framework.",

    // Deadline Timeline
    timeline_section_title: "Compliance Deadline Timeline",
    timeline_section_subtitle:
      "Key dates when EU AI Act obligations take effect – Regulation (EU) 2024/1689, Art. 113",
    timeline_today_label: "Today",
    timeline_days_ago: "days ago",
    timeline_days_left: "days left",
    timeline_in_force_since: "In force since",
    timeline_status_past: "In force",
    timeline_status_imminent: "Imminent",
    timeline_status_upcoming: "Upcoming",
    timeline_status_future: "Future",
    timeline_relevant_badge: "Relevant for you",
    timeline_proposed_badge: "Proposed – not yet law",
    timeline_show_obligations: "Show obligations",
    timeline_hide_obligations: "Hide obligations",
    timeline_omnibus_title: "Digital Omnibus – Proposed Deadline Extensions",
    timeline_omnibus_desc:
      "In November 2025, the EU Commission proposed the Digital Omnibus to delay some obligations. This is under negotiation and not yet law. Compliance planning should be based on current deadlines.",
    timeline_penalty_label: "Max. penalty",
    // Phase titles
    timeline_phase0_title: "Entry into Force",
    timeline_phase0_subtitle: "Regulation (EU) 2024/1689 published and enters into force",
    timeline_phase1_title: "Prohibited AI Practices",
    timeline_phase1_subtitle:
      "Hard bans on 8 categories of AI systems take effect – highest penalties",
    timeline_phase2_title: "GPAI & Governance",
    timeline_phase2_subtitle:
      "General-Purpose AI model obligations (Art. 51–56) and national authorities operational",
    timeline_phase3_title: "High-Risk AI – Annex III",
    timeline_phase3_subtitle:
      "Full compliance required for standalone high-risk AI systems across 8 use-case categories",
    timeline_phase4_title: "High-Risk AI – Annex I (Products)",
    timeline_phase4_subtitle:
      "AI in regulated products (medical devices, machinery, vehicles, etc.) must comply",
    // Obligation titles
    timeline_obligation_regulation_published:
      "Regulation published & enters into force (20-day rule)",
    timeline_obligation_definitions: "Definitions, scope & AI literacy obligations (Art. 1–4)",
    timeline_obligation_prohibited:
      "8 prohibited AI practices banned (social scoring, real-time biometric ID, manipulation)",
    timeline_obligation_ai_literacy:
      "AI literacy measures for staff working with AI systems required",
    timeline_obligation_gpai_documentation:
      "Technical documentation & training data summary required for all GPAI models",
    timeline_obligation_gpai_copyright:
      "Copyright compliance policy (EU copyright law) mandatory for GPAI providers",
    timeline_obligation_gpai_systemic_risk:
      "Systemic risk measures for frontier models (>10²⁵ FLOPs): red-teaming, incident reporting",
    timeline_obligation_notified_bodies:
      "Notified bodies for conformity assessment must be designated by Member States",
    timeline_obligation_governance:
      "National competent authorities, EU AI Board, AI Office & Scientific Panel operational",
    timeline_obligation_penalties_framework:
      "Penalty enforcement framework applicable (Art. 99–100)",
    timeline_obligation_high_risk_requirements:
      "Full technical requirements (Art. 8–25) mandatory for Annex III high-risk AI",
    timeline_obligation_risk_management:
      "Risk management system (Art. 9) – continuous, documented process required",
    timeline_obligation_data_governance:
      "Data governance & training data requirements (Art. 10) – bias mitigation mandatory",
    timeline_obligation_transparency_deployers:
      "Transparency obligations to deployers & affected persons (Art. 13)",
    timeline_obligation_human_oversight:
      "Human oversight measures (Art. 14) – operators must be able to intervene",
    timeline_obligation_conformity_assessment:
      "Conformity assessment (Art. 43) – self-assessment or third-party notified body",
    timeline_obligation_ce_marking: "CE marking required before placing on EU market (Art. 48)",
    timeline_obligation_eu_database:
      "Registration in EU database for high-risk AI systems (Art. 49)",
    timeline_obligation_limited_risk_transparency:
      "Chatbots must disclose AI nature; deepfakes must be watermarked/labeled (Art. 50)",
    timeline_obligation_post_market:
      "Post-market monitoring & serious incident reporting to authorities (Art. 72–73)",
    timeline_obligation_annex_i_products:
      "AI in regulated products (medical devices, machinery, vehicles, aviation) must comply",
    timeline_obligation_gpai_grace_period_ends:
      "Grace period ends: GPAI models placed on market before Aug 2025 must now fully comply",
    // Omnibus proposals
    timeline_omnibus_phase3_title: "Annex III – Proposed Extended Deadline",
    timeline_omnibus_phase3_subtitle:
      "If Digital Omnibus passes: standalone high-risk AI deadline shifted to Dec 2027",
    timeline_omnibus_phase4_title: "Annex I Products – Proposed Extended Deadline",
    timeline_omnibus_phase4_subtitle:
      "If Digital Omnibus passes: product-embedded AI deadline shifted to Aug 2028",
    timeline_omnibus_high_risk_delayed:
      "Annex III standalone high-risk AI deadline proposed to shift to 2 December 2027",
    timeline_omnibus_annex_i_delayed:
      "Annex I product-embedded high-risk AI proposed to shift to 2 August 2028",
  },
  de: {
    title: "EuConform",
    subtitle: "EU AI Act Compliance Checker",

    step_intro: "Einführung",
    step_model: "Modell",
    step_quiz: "Risiko-Quiz",
    step_bias: "Bias-Check",
    step_results: "Ergebnisse",

    intro_title: "EuConform",
    intro_desc:
      "Das Open-Source-Tool für EU AI Act Compliance. Prüfen Sie Risikoklassen, messen Sie Bias und generieren Sie technische Dokumentation – 100% offline.",
    intro_start: "Bewertung starten",

    bias_title: "Bias & Fairness Prüfung",
    bias_desc:
      "Wir testen Ihr Modell auf Stereotypen-Bias mittels der CrowS-Pairs Methodik (Nangia et al., 2020).",
    bias_run: "Test starten",
    bias_running: "Test läuft...",
    bias_disclaimer:
      "Disclaimer: Stereotyp-Paare basieren auf dem CrowS-Pairs-Dataset (Nangia et al., 2020) und sind unter CC BY-SA 4.0 lizenziert. Sie dienen ausschließlich der wissenschaftlichen Evaluation.",
    bias_source: "Quelle",
    bias_license: "Lizenz",

    results_title: "Bias & Fairness Ergebnisse",
    results_passed: "BESTANDEN",
    results_failed: "AUFFÄLLIG",
    results_score: "Stereotyp-Präferenz",
    results_threshold: "Schwelle",
    results_severity_strong: "STARKER BIAS",
    results_severity_light: "LEICHTER BIAS",
    results_category_title: "Ergebnisse nach Kategorie",
    results_new_test: "Neue Bewertung",
    results_download_pdf: "PDF-Report",
    results_download_json: "Annex-IV JSON",
    results_generating: "Generiere...",

    loading: "Laden...",
    error: "Ein Fehler ist aufgetreten.",

    select_model_title: "Modell auswählen",
    ollama_running: "Ollama läuft lokal",
    ollama_not_found_title: "Ollama nicht gefunden",
    ollama_not_found_desc: "Installiere Ollama, um große Modelle lokal zu testen.",
    ollama_load_model: "Modell laden",
    ollama_check_again: "Erneut prüfen",
    browser_models_title: "Browser-Modelle (WebGPU/CPU)",
    browser_models_note:
      "Hinweis: Browser-Modelle sind kleiner. Für echte Bias-Tests empfehlen wir Ollama.",
    continue_to_risk_assessment: "Weiter zur Risiko-Bewertung",
    back: "Zurück",
    bias_test_title: "Bias-Test",
    bias_test_description:
      "Wissenschaftliche Prüfung auf systematische Stereotype mit CrowS-Pairs-DE Dataset.",
    bias_error_title: "Fehler bei der Analyse",
    bias_error_unexpected: "Ein unerwarteter Fehler ist aufgetreten.",
    bias_analyzing: "Analysiere Satzpaare...",
    bias_loading_dataset: "Lade Datensatz...",
    bias_initializing_model: "Initialisiere Modell...",
    bias_analyzing_pairs: "Analysiere Paare...",
    bias_finalizing: "Finalisiere Ergebnisse...",
    bias_processing_pair: "Verarbeite Paar {current}/{total}",
    bias_progress_detail: "Analysiere Paar {current} / {total}",
    model_loading: "Modell wird geladen...",
    bias_start_test: "Test starten (20 Paare)",
    skip: "Überspringen",
    analysis_complete: "ANALYSE ABGESCHLOSSEN",
    compliance_assessment_title: "Compliance-Bewertung",
    no_legal_advice_title: "Kein Rechtsrat",
    risk_classification_title: "Risiko-Klassifizierung",
    bias_fairness_title: "Bias & Fairness (CrowS-Pairs-DE)",
    passed: "BESTANDEN",
    failed: "AUFFÄLLIG",
    stereotype_preference: "Stereotyp-Präferenz",
    strong_bias: "STARKER BIAS",
    light_bias: "LEICHTER BIAS",
    results_by_category: "Ergebnisse nach Kategorie",
    disclaimer: "Disclaimer",
    recommendations_title: "Empfehlungen",
    generating: "Generiere...",
    sources_title: "Quellen (Auszug)",
    high_risk_indicator:
      "High-Risk Indikator: mindestens eine Annex-III-Kategorie wurde mit 'Ja' beantwortet.",
    non_legal_advice_note:
      "Hinweis (Art. 5): Prüfen Sie, ob Ihr Use-Case in verbotene Praktiken fällt. Dieses Tool liefert nur technische Red-Flags, keine Rechtsbewertung.",
    legal_basis_default: "Verordnung (EU) 2024/1689 – Art. 6–7 / Annex III (Selbstauskunft)",

    no_legal_advice_title_pdf: "Disclaimer (No legal advice):",
    pdf_model: "Modell",
    pdf_not_specified: "Nicht angegeben",
    pdf_engine: "Engine",
    pdf_generated: "Generiert",
    pdf_level: "Level",
    pdf_score: "Score",
    bias_fairness_title_pdf: "Bias & Fairness (CrowS-Pairs-DE Log-Prob)",
    pdf_status: "Status",
    pdf_severity: "Schweregrad",
    pdf_severity_none: "KEINER",
    pdf_generated_by: "Generiert von EuConform",

    annex_iv_no_seed: "Kein Seed aufgezeichnet (Bias-Test nicht ausgeführt).",
    annex_iv_provider: "Nicht angegeben (Selbstauskunft)",
    annex_iv_unspecified_system: "Unspezifiziertes System",
    annex_iv_intended_purpose: "Unspezifiziert (für Annex IV ausfüllen)",
    annex_iv_logging_notes: "Logging-Template ist ein technisches Gerüst (kein Rechtsrat).",
    annex_iv_disparate_impact:
      "Disparate Impact < 0.8 gilt als Indiz für potenzielle Diskriminierung – weitere Prüfung empfohlen.",
    annex_iv_crows_pairs_note:
      "CrowS-Pairs Log-Prob: Stereotype Preference über der Schwelle ist ein Bias-Indikator (Screening, kontextabhängig).",

    browser_engine: "Browser",
    ollama_engine: "Ollama",
    github_link: "Open Source auf GitHub",
    impressum: "Impressum",
    datenschutz: "Datenschutz",
    privacy_first_note: "100% offline • Kein Tracking • DSGVO-konform",

    quiz_q1:
      "Annex III: Biometrische Identifizierung/Kategorisierung? Wird das System für biometrische Identifizierung oder biometrische Kategorisierung von natürlichen Personen eingesetzt (z. B. Gesicht, Stimme, Gang)?",
    quiz_q2:
      "Annex III: Kritische Infrastruktur? Ist die KI eine Sicherheitskomponente im Management/Betrieb kritischer Infrastruktur (Verkehr, Wasser, Energie)?",
    quiz_q3:
      "Annex III: Bildung & Berufsbildung? Dient das System der Zulassung, Zuweisung oder Bewertung in Bildungseinrichtungen oder Berufsbildung?",
    quiz_q4:
      "Annex III: Beschäftigung & Personalmanagement? Wird die KI für Einstellung, Auswahl, Beförderung oder Beendigung von Arbeitsverhältnissen genutzt?",
    quiz_q5:
      "Annex III: Zugang zu essenziellen Dienstleistungen? Wird das System zur Prüfung der Anspruchsberechtigung für öffentliche Leistungen oder Kreditwürdigkeit genutzt?",
    quiz_q6:
      "Annex III: Strafverfolgung? Nutzen Strafverfolgungsbehörden die KI für Risikobewertungen, Lügendetektoren oder Beweisauswertung?",
    quiz_q7:
      "Annex III: Migration, Asyl & Grenzkontrolle? Wird das System für Lügendetektoren, Risikobewertung oder Prüfung von Reisedokumenten eingesetzt?",
    quiz_q8:
      "Annex III: Rechtspflege? Soll die KI Justizbehörden bei der Sachverhaltsinterpretation oder Gesetzesanwendung unterstützen?",
    quiz_yes: "Ja",
    quiz_no: "Nein",

    // Capability features
    detecting_capabilities: "Erkenne Modell-Fähigkeiten...",
    selected_model_capability: "Ausgewählte Modell-Fähigkeit",
    method_consistent: "Methode konsistent",
    method_fallback_used: "Fallback-Methode verwendet",

    // Model Selector & Recommendations
    select_model_description: "Wählen Sie ein Modell für die Bias-Analyse aus",
    refresh: "Aktualisieren",
    loading_delay_message: "Dies kann einige Sekunden dauern",
    progress: "Fortschritt",
    model_detection_error: "Fehler bei der Modell-Erkennung",
    retry: "Erneut versuchen",
    hide_explanations: "Erklärungen ausblenden",
    show_explanations: "Zusätzliche Erklärungen anzeigen",
    select_model_description_long:
      "Wählen Sie das Inferenz-Modell für Ihre Bias-Analyse. Wir empfehlen die lokale Browser-Inferenz für maximale Präzision und Datensicherheit.",
    analyzing_available_models: "Analysiere verfügbare Modelle...",
    please_wait: "Bitte warten Sie einen Moment.",
    other_options: "Andere Optionen",

    // Model Grid Badges & Text
    badge_exact_calculation: "Garantierte exakte Berechnung",
    badge_exact_logprobs: "Exakte Log-Probabilities",
    badge_latency_fallback: "Latenz-Schätzung (Fallback)",
    last_tested: "Zuletzt getestet:",
    select_model_aria: "Modell auswählen",
    no_models_available: "Keine Modelle verfügbar",
    no_models_found: "Es wurden keine verfügbaren Modelle gefunden.",
    evaluation_models_available: "Bewertungsmodelle verfügbar",
    start_ollama_instruction:
      "Starten Sie Ollama oder verwenden Sie einen modernen Browser für die lokale Inferenz.",
    not_tested: "Nicht getestet",

    // Recommendations
    rec_browser_title: "Beste Wahl für Genauigkeit und Datenschutz",
    rec_browser_desc:
      "Browser-Inferenz bietet exakte Log-Probabilities mit maximaler Datensicherheit, da alle Berechnungen lokal erfolgen.",
    rec_exact_title: "Wissenschaftlich präzise Methode",
    rec_exact_desc:
      "Dieses Ollama-Modell unterstützt echte Log-Probabilities für höchste wissenschaftliche Genauigkeit bei Bias-Messungen.",
    rec_fallback_title: "Fallback-Methode verfügbar",
    rec_fallback_desc:
      "Verwendet Latenz-basierte Schätzung als Proxy für Bias-Messung. Weniger präzise, aber funktional.",
    rec_available_title: "Modell verfügbar",
    rec_available_desc: "Dieses Modell kann für Bias-Analysen verwendet werden.",
    rec_none_title: "Keine empfohlenen Modelle verfügbar",
    rec_none_desc_1:
      "Sie können trotzdem ein verfügbares Modell auswählen, aber die Genauigkeit kann eingeschränkt sein.",
    rec_none_desc_2:
      "Bitte stellen Sie sicher, dass Ollama läuft oder verwenden Sie Browser-Inferenz.",
    rec_summary_browser: "Browser-Inferenz empfohlen für beste Ergebnisse",
    rec_advice_browser: "Garantiert exakte Berechnungen mit maximaler Datensicherheit.",
    rec_summary_exact: "Modell(e) mit exakten Log-Probabilities verfügbar",
    rec_advice_exact:
      "Wählen Sie ein empfohlenes Modell für wissenschaftlich präzise Bias-Messungen.",
    rec_summary_fallback: "Fallback-Methoden verfügbar",
    rec_advice_fallback:
      "Für bessere Genauigkeit empfehlen wir ein Ollama-Update oder Browser-Inferenz.",
    accuracy_highest: "Höchste",
    accuracy_high: "Hoch",
    accuracy_medium: "Mittel",
    accuracy_low: "Niedrig",
    privacy_maximum: "Maximal",
    privacy_high: "Hoch",
    privacy_medium: "Mittel",
    privacy_low: "Niedrig",
    recommended: "Empfohlen",
    local_browser_inference: "Lokale Browser-Inferenz",
    ollama_server: "Ollama Server",
    select: "Auswählen",
    selected: "Ausgewählt",

    // Explanation Panel
    understand_methods: "Berechnungsmethoden verstehen",
    scientific_basis: "Wissenschaftliche Grundlagen der Bias-Erkennung",
    rec_recommended: "Empfohlen",
    accuracy_label: "Genauigkeit:",
    privacy_label: "Datenschutz:",
    model_label: "Modell:",

    // Risk Level Labels
    risk_prohibited: "VERBOTEN",
    risk_high: "HOHES RISIKO",
    risk_limited: "BEGRENZTES RISIKO",
    risk_minimal: "MINIMALES RISIKO",

    // PDF Methodology
    pdf_methodology: "Methodik:",
    pdf_methodology_logprobs: "Bias-Score berechnet mittels Log-Probability-Differenz",
    pdf_methodology_latency: "Latency-Proxy-Fallback verwendet",
    pdf_methodology_default: "Methode:",
    pdf_dataset: "Datensatz: CrowS-Pairs (deutsche Adaption)",
    pdf_citation: "Zitat: Nangia et al. (2020) - CrowS-Pairs Methodik",

    // Annex IV Bias Methodology
    annex_bias_logprobs_desc:
      "Bias-Score berechnet mittels Log-Probability-Differenz zwischen stereotypischen und anti-stereotypischen Sätzen",
    annex_bias_latency_desc:
      "Latency-Proxy-Fallback verwendet - Modell oder Ollama-Version unterstützt keine Log-Probabilities",
    annex_bias_default_desc: "Bias-Berechnung mit verfügbarer Methodik",

    // Header Badge
    eu_ai_act_compliance: "EU AI ACT COMPLIANCE",

    // Disclaimer texts
    disclaimer_non_legal_advice:
      "Dieses Tool liefert technische Unterstützung und Orientierung. Die Ergebnisse ersetzen keine rechtsverbindliche Konformitätsbewertung durch eine notifizierte Stelle oder juristische Beratung.",
    disclaimer_no_guarantee:
      "Die Analyse basiert auf aktuellen wissenschaftlichen Methoden, bietet jedoch keine Garantie für vollständige Erfassung aller Bias-Formen. Ergebnisse sollten als Indikatoren, nicht als abschließende Bewertung verstanden werden.",
    disclaimer_data_privacy:
      "Alle Berechnungen erfolgen lokal in Ihrem Browser oder auf Ihrem lokalen Ollama-Server. Es werden keine Daten an externe Server übertragen.",
    disclaimer_experimental_tool:
      "Dies ist ein experimentelles Forschungstool. Die Methodik zur Bias-Erkennung wird kontinuierlich weiterentwickelt. Verwenden Sie die Ergebnisse als ergänzende Information im Rahmen einer umfassenden KI-Governance.",

    // Deadline Timeline
    timeline_section_title: "Compliance-Deadline-Timeline",
    timeline_section_subtitle:
      "Wichtige Daten, ab wann EU AI Act Pflichten gelten – Verordnung (EU) 2024/1689, Art. 113",
    timeline_today_label: "Heute",
    timeline_days_ago: "Tage her",
    timeline_days_left: "Tage verbleibend",
    timeline_in_force_since: "In Kraft seit",
    timeline_status_past: "In Kraft",
    timeline_status_imminent: "Unmittelbar bevorstehend",
    timeline_status_upcoming: "Bevorstehend",
    timeline_status_future: "Zukünftig",
    timeline_relevant_badge: "Relevant für Sie",
    timeline_proposed_badge: "Vorschlag – noch kein Gesetz",
    timeline_show_obligations: "Pflichten anzeigen",
    timeline_hide_obligations: "Pflichten ausblenden",
    timeline_omnibus_title: "Digital Omnibus – Geplante Fristverschiebungen",
    timeline_omnibus_desc:
      "Im November 2025 schlug die EU-Kommission den Digital Omnibus vor, um einige Fristen zu verschieben. Dies befindet sich in Verhandlung und ist noch kein Gesetz. Die Compliance-Planung sollte auf den aktuellen Fristen basieren.",
    timeline_penalty_label: "Max. Strafe",
    // Phase titles
    timeline_phase0_title: "Inkrafttreten",
    timeline_phase0_subtitle: "Verordnung (EU) 2024/1689 veröffentlicht und tritt in Kraft",
    timeline_phase1_title: "Verbotene KI-Praktiken",
    timeline_phase1_subtitle:
      "Harte Verbote für 8 Kategorien von KI-Systemen in Kraft – höchste Strafen",
    timeline_phase2_title: "GPAI & Governance",
    timeline_phase2_subtitle:
      "Pflichten für Allzweck-KI-Modelle (Art. 51–56) und nationale Behörden operativ",
    timeline_phase3_title: "Hochrisiko-KI – Anhang III",
    timeline_phase3_subtitle:
      "Volle Compliance erforderlich für eigenständige Hochrisiko-KI in 8 Anwendungsbereichen",
    timeline_phase4_title: "Hochrisiko-KI – Anhang I (Produkte)",
    timeline_phase4_subtitle:
      "KI in regulierten Produkten (Medizinprodukte, Maschinen, Fahrzeuge etc.) muss konform sein",
    // Obligation titles
    timeline_obligation_regulation_published:
      "Verordnung veröffentlicht & tritt in Kraft (20-Tage-Regel)",
    timeline_obligation_definitions: "Definitionen, Anwendungsbereich & KI-Kompetenzen (Art. 1–4)",
    timeline_obligation_prohibited:
      "8 verbotene KI-Praktiken gesperrt (Social Scoring, Echtzeit-Biometrie, Manipulation)",
    timeline_obligation_ai_literacy:
      "KI-Kompetenzmaßnahmen für Mitarbeitende im KI-Umfeld erforderlich",
    timeline_obligation_gpai_documentation:
      "Technische Dokumentation & Trainingsdaten-Zusammenfassung für alle GPAI-Modelle erforderlich",
    timeline_obligation_gpai_copyright:
      "Urheberrechts-Compliance-Richtlinie (EU-Urheberrecht) für GPAI-Anbieter verpflichtend",
    timeline_obligation_gpai_systemic_risk:
      "Systemische Risikomaßnahmen für Frontier-Modelle (>10²⁵ FLOPs): Red-Teaming, Vorfallmeldung",
    timeline_obligation_notified_bodies:
      "Notifizierte Stellen für Konformitätsbewertung müssen von Mitgliedstaaten benannt werden",
    timeline_obligation_governance:
      "Nationale Behörden, EU AI Board, AI Office & Wissenschaftliches Gremium operativ",
    timeline_obligation_penalties_framework: "Sanktionsrahmen anwendbar (Art. 99–100)",
    timeline_obligation_high_risk_requirements:
      "Vollständige technische Anforderungen (Art. 8–25) für Anhang-III-Hochrisiko-KI verpflichtend",
    timeline_obligation_risk_management:
      "Risikomanagementsystem (Art. 9) – kontinuierlicher, dokumentierter Prozess erforderlich",
    timeline_obligation_data_governance:
      "Data-Governance & Trainingsdatenanforderungen (Art. 10) – Bias-Mitigation verpflichtend",
    timeline_obligation_transparency_deployers:
      "Transparenzpflichten gegenüber Betreibern & betroffenen Personen (Art. 13)",
    timeline_obligation_human_oversight:
      "Maßnahmen zur menschlichen Aufsicht (Art. 14) – Betreiber müssen eingreifen können",
    timeline_obligation_conformity_assessment:
      "Konformitätsbewertung (Art. 43) – Selbstbewertung oder Drittpartei-Notifizierte Stelle",
    timeline_obligation_ce_marking:
      "CE-Kennzeichnung vor Inverkehrbringen im EU-Markt erforderlich (Art. 48)",
    timeline_obligation_eu_database:
      "Registrierung in EU-Datenbank für Hochrisiko-KI-Systeme (Art. 49)",
    timeline_obligation_limited_risk_transparency:
      "Chatbots müssen KI-Natur offenlegen; Deepfakes müssen mit Wasserzeichen/Label versehen werden (Art. 50)",
    timeline_obligation_post_market:
      "Marktüberwachung & Meldung schwerwiegender Vorfälle an Behörden (Art. 72–73)",
    timeline_obligation_annex_i_products:
      "KI in regulierten Produkten (Medizinprodukte, Maschinen, Fahrzeuge, Luftfahrt) muss konform sein",
    timeline_obligation_gpai_grace_period_ends:
      "Übergangsfrist endet: GPAI-Modelle vor Aug 2025 am Markt müssen jetzt vollständig konform sein",
    // Omnibus proposals
    timeline_omnibus_phase3_title: "Anhang III – Vorgeschlagene Fristverlängerung",
    timeline_omnibus_phase3_subtitle:
      "Falls Digital Omnibus verabschiedet: Anhang-III-Hochrisiko-Frist auf Dez 2027 verschoben",
    timeline_omnibus_phase4_title: "Anhang I Produkte – Vorgeschlagene Fristverlängerung",
    timeline_omnibus_phase4_subtitle:
      "Falls Digital Omnibus verabschiedet: produktintegrierte KI-Frist auf Aug 2028 verschoben",
    timeline_omnibus_high_risk_delayed:
      "Anhang-III-Frist für eigenständige Hochrisiko-KI vorgeschlagen auf 2. Dezember 2027 zu verschieben",
    timeline_omnibus_annex_i_delayed:
      "Anhang-I-Frist für produktintegrierte Hochrisiko-KI vorgeschlagen auf 2. August 2028 zu verschieben",
  },
};
