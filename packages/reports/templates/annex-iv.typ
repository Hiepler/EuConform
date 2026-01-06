// AImpact Annex IV (EU AI Act 2024/1689) – Typst template scaffold
// Input: JSON compatible with packages/reports/templates/annex-iv.json
//
// NOTE: This is a formatting template. It is not legal advice.

#let report = json("annex-iv-report.json")

#set page(margin: (top: 24mm, bottom: 24mm, left: 18mm, right: 18mm))
#set text(font: "Helvetica", size: 10pt)

#align(center)[
  = AImpact – Annex IV Technical Documentation (Scaffold)
  #text(size: 8pt, fill: gray)[report.meta.generatedAt]
]

#block[
  #text(weight: "bold")[Disclaimer]
  #text(size: 9pt)[report.meta.disclaimer]
]

== 1. Allgemeine Beschreibung
* Provider: #report.section1_generalDescription.provider.name
* System: #report.section1_generalDescription.system.name
* Intended purpose: #report.section1_generalDescription.system.intendedPurpose
* Risk level: #report.section1_generalDescription.system.riskLevel

== 2. Design-Spezifikationen
#report.section2_designSpecifications

== 3. Datenmanagement
#report.section3_dataManagement

== 4. Risikomanagement & Mitigation
#report.section4_riskManagementAndMitigation

== 5. Performance & Fairness-Metriken
#report.section5_performanceAndFairness

== 6. Human Oversight
#report.section6_humanOversight

== 7. Technische Dokumentation
#report.section7_technicalDocumentation


