"use client";

import {
  type AffectedAudience,
  DIGITAL_OMNIBUS_PROPOSALS,
  type DeadlinePhase,
  type DeadlineStatus,
  type RiskLevel,
  getAudiencesForRiskLevel,
  getDaysUntilDeadline,
  getTimelineForAudiences,
  getTimelineForRiskLevel,
} from "@euconform/core";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Info,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLanguage } from "../../lib/i18n/LanguageContext";

type DictionaryKey = Parameters<ReturnType<typeof useLanguage>["t"]>[0];

// ─── module-level constants ────────────────────────────────────────────────────

const DEFAULT_AUDIENCES: AffectedAudience[] = ["all"];

const STATUS_CONFIG: Record<
  DeadlineStatus,
  {
    dot: string;
    line: string;
    badge: string;
    card: string;
    icon: typeof CheckCircle2;
    iconColor: string;
  }
> = {
  past: {
    dot: "border-emerald-500 ring-4 ring-emerald-50 dark:ring-emerald-500/10",
    line: "bg-emerald-500/20",
    badge:
      "bg-emerald-50/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20 border",
    card: "border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md",
    icon: CheckCircle2,
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },
  imminent: {
    dot: "border-amber-500 ring-4 ring-amber-50 dark:ring-amber-500/10",
    line: "bg-slate-200 dark:bg-slate-800",
    badge:
      "bg-amber-50/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20 border",
    card: "border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md",
    icon: Zap,
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  upcoming: {
    dot: "border-blue-500 ring-4 ring-blue-50 dark:ring-blue-500/10",
    line: "bg-slate-200 dark:bg-slate-800",
    badge:
      "bg-blue-50/50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20 border",
    card: "border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md",
    icon: Clock,
    iconColor: "text-blue-500 dark:text-blue-400",
  },
  future: {
    dot: "border-slate-300 dark:border-slate-600 ring-4 ring-slate-50 dark:ring-slate-800/50",
    line: "bg-slate-200 dark:bg-slate-800",
    badge:
      "bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50 border",
    card: "border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md",
    icon: CalendarClock,
    iconColor: "text-slate-400 dark:text-slate-500",
  },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoDate: string, lang: "en" | "de"): string {
  return new Date(isoDate).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Returns true if any obligation in the phase applies to the given audiences. */
function phaseHasRelevantObligation(phase: DeadlinePhase, audiences: AffectedAudience[]): boolean {
  return phase.obligations.some((o) => o.audiences.some((a) => audiences.includes(a)));
}

// ─── sub-components ───────────────────────────────────────────────────────────

interface ObligationListProps {
  phase: DeadlinePhase & { status: DeadlineStatus };
  relevantAudiences: AffectedAudience[];
}

function ObligationList({ phase, relevantAudiences }: ObligationListProps) {
  const { t } = useLanguage();

  return (
    <ul className="mt-5 space-y-2.5 border-t border-slate-100 dark:border-slate-800/60 pt-5">
      {phase.obligations.map((obligation) => {
        const isRelevant = obligation.audiences.some((a) => relevantAudiences.includes(a));
        return (
          <li
            key={obligation.titleKey}
            className={`flex items-start gap-3 text-[13px] rounded-lg p-3 transition-colors border ${
              isRelevant
                ? "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-700/50"
                : "border-transparent text-slate-500 dark:text-slate-500 hover:bg-slate-50/30 dark:hover:bg-slate-800/20"
            }`}
          >
            <div className="mt-1 shrink-0">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isRelevant ? "bg-slate-400 dark:bg-slate-500" : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <span
                className={
                  isRelevant
                    ? "text-slate-700 dark:text-slate-300 font-medium"
                    : "text-slate-500 dark:text-slate-500"
                }
              >
                {t(obligation.titleKey as DictionaryKey)}
              </span>
              <span
                className={`ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                  isRelevant
                    ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"
                    : "bg-transparent border-slate-100 dark:border-slate-800 text-slate-400"
                }`}
              >
                {obligation.articleRef}
              </span>
              {obligation.maxPenalty && (
                <div className="mt-1.5 text-[11px] text-red-600/80 dark:text-red-400/80 font-medium">
                  {t("timeline_penalty_label")}: {obligation.maxPenalty}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface PhaseCardProps {
  phase: DeadlinePhase & { status: DeadlineStatus };
  relevantAudiences: AffectedAudience[];
  nowMs: number;
  isLast: boolean;
  isRelevantPhase: boolean;
}

function PhaseCard({ phase, relevantAudiences, nowMs, isLast, isRelevantPhase }: PhaseCardProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[phase.status];
  const Icon = cfg.icon;
  const days = getDaysUntilDeadline(phase.isoDate, nowMs);
  const absDays = Math.abs(days);
  const hasRelevant = phaseHasRelevantObligation(phase, relevantAudiences);

  return (
    <div className="flex gap-4 sm:gap-6 group">
      {/* Spine */}
      <div className="flex flex-col items-center">
        <div
          className={`w-3.5 h-3.5 rounded-full border-[2.5px] bg-white dark:bg-slate-900 flex-shrink-0 mt-[1.625rem] relative z-10 transition-colors ${cfg.dot}`}
        />
        {!isLast && <div className={`w-[2px] flex-1 min-h-[3rem] -mt-1 ${cfg.line}`} />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-6 relative z-0">
        <div
          className={`rounded-xl border bg-white dark:bg-slate-900 p-5 sm:p-6 transition-all duration-200 ${cfg.card} ${
            isRelevantPhase ? "ring-1 ring-slate-200 dark:ring-slate-700" : ""
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2.5">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.iconColor}`} />
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md ${cfg.badge}`}
                >
                  {t(`timeline_status_${phase.status}` as DictionaryKey)}
                </span>
                {isRelevantPhase && (
                  <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {t("timeline_relevant_badge")}
                  </span>
                )}
                {phase.proposed && (
                  <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50/50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20">
                    {t("timeline_proposed_badge")}
                  </span>
                )}
              </div>

              <h3 className="text-[15px] sm:text-base font-semibold text-slate-900 dark:text-white">
                {t(phase.titleKey as DictionaryKey)}
              </h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 sm:line-clamp-none">
                {t(phase.subtitleKey as DictionaryKey)}
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0 flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-0 mt-2 sm:mt-0 w-full sm:w-auto">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white sm:mb-0.5">
                {formatDate(phase.isoDate, language)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 sm:mb-1.5 flex-1 sm:flex-none text-right sm:text-auto">
                {days < 0
                  ? `${absDays} ${t("timeline_days_ago")}`
                  : `${absDays} ${t("timeline_days_left")}`}
              </div>
              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hidden sm:block">
                {phase.chapterRef}
              </div>
            </div>
          </div>

          {phase.obligations.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="mt-4 sm:mt-5 flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
              >
                {open ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                )}
                {open ? t("timeline_hide_obligations") : t("timeline_show_obligations")}
                {hasRelevant && !open && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 inline-block" />
                )}
              </button>
              {open && <ObligationList phase={phase} relevantAudiences={relevantAudiences} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export interface DeadlineTimelineProps {
  riskLevel?: RiskLevel;
  audiences?: AffectedAudience[];
  showOmnibus?: boolean;
}

export function DeadlineTimeline({
  riskLevel,
  audiences,
  showOmnibus = true,
}: DeadlineTimelineProps) {
  const { t, language } = useLanguage();
  const [omnibusOpen, setOmnibusOpen] = useState(false);

  const nowMs = useMemo(() => Date.now(), []);

  const relevantAudiences = useMemo<AffectedAudience[]>(
    () => audiences ?? (riskLevel ? getAudiencesForRiskLevel(riskLevel) : DEFAULT_AUDIENCES),
    [audiences, riskLevel]
  );

  const phasesWithStatus = useMemo(
    () =>
      audiences
        ? getTimelineForAudiences(audiences)
        : riskLevel
          ? getTimelineForRiskLevel(riskLevel)
          : getTimelineForAudiences(DEFAULT_AUDIENCES),
    [audiences, riskLevel]
  );

  const firstUpcomingIndex = phasesWithStatus.findIndex((p) => p.status !== "past");

  return (
    <section
      aria-label="EU AI Act Compliance Timeline"
      className="rounded-2xl bg-white dark:bg-[#1C1F26] border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-8 mb-6"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <CalendarClock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">
              {t("timeline_section_title")}
            </h2>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
            {t("timeline_section_subtitle")}
          </p>
        </div>
        <a
          href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 px-3 py-1.5 rounded-lg shadow-sm"
          aria-label="Open EU AI Act full text"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Reg. (EU) 2024/1689
        </a>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 flex-wrap mb-8 text-[12px] font-medium text-slate-600 dark:text-slate-400 pl-1">
        {(["past", "imminent", "upcoming", "future"] as DeadlineStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <span key={s} className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full border-[2px] ${cfg.dot.split(" ")[0]} bg-white dark:bg-slate-900`}
              />
              {t(`timeline_status_${s}` as DictionaryKey)}
            </span>
          );
        })}
        {riskLevel && (
          <span className="flex items-center gap-2 ml-auto text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
            {t("timeline_relevant_badge")}
          </span>
        )}
      </div>

      <div className="relative pl-1">
        {phasesWithStatus.map((phase, i) => (
          <div key={phase.id} className="relative">
            {i === firstUpcomingIndex && firstUpcomingIndex > 0 && (
              <div className="absolute top-0 -mt-2 left-0 w-full flex items-center gap-3 z-0 ml-[1.125rem]">
                <div className="w-8 sm:flex-1 h-[1px] bg-slate-200 dark:bg-slate-700/80" />
                <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-white dark:bg-[#1C1F26] px-2 rounded-md border border-slate-100 dark:border-slate-800">
                  {t("timeline_today_label")}
                </span>
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-700/80" />
              </div>
            )}

            <PhaseCard
              phase={phase}
              relevantAudiences={relevantAudiences}
              nowMs={nowMs}
              isLast={i === phasesWithStatus.length - 1 && !showOmnibus}
              isRelevantPhase={phaseHasRelevantObligation(phase, relevantAudiences) && !!riskLevel}
            />
          </div>
        ))}
      </div>

      {showOmnibus && (
        <div className="mt-2 sm:ml-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setOmnibusOpen((o) => !o)}
            className="w-full flex items-start gap-3 p-4 sm:p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mt-0.5">
              <Info className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white">
                  {t("timeline_omnibus_title")}
                </p>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-200/50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50">
                  {t("timeline_proposed_badge")}
                </span>
              </div>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {t("timeline_omnibus_desc")}
              </p>
            </div>
            <span className="shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors mt-2">
              {omnibusOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          </button>

          {omnibusOpen && (
            <div className="px-4 sm:px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="space-y-3">
                {DIGITAL_OMNIBUS_PROPOSALS.map((proposal) => {
                  const days = getDaysUntilDeadline(proposal.isoDate, nowMs);
                  return (
                    <div
                      key={proposal.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                      <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hidden sm:block">
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <div className="flex justify-between items-start sm:block">
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
                            {t(proposal.titleKey as DictionaryKey)}
                          </p>
                          <div className="text-right shrink-0 sm:hidden">
                            <div className="text-[13px] font-semibold text-slate-900 dark:text-white">
                              {formatDate(proposal.isoDate, language)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              ~{Math.round(days / 30)} mo
                            </div>
                          </div>
                        </div>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                          {t(proposal.subtitleKey as DictionaryKey)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 hidden sm:block">
                        <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-0.5">
                          {formatDate(proposal.isoDate, language)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ~{Math.round(days / 30)} mo
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-6 flex items-start gap-2 pt-5 border-t border-slate-100 dark:border-slate-800">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-[1px]" />
        <p className="text-[12px] text-slate-500 dark:text-slate-400">
          Source: Regulation (EU) 2024/1689, Art. 113 • Non-legal-advice
        </p>
      </div>
    </section>
  );
}
