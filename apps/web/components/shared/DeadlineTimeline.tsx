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
    glow: string;
  }
> = {
  past: {
    dot: "bg-emerald-500 ring-emerald-500/30",
    line: "bg-emerald-400/40",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    card: "border-emerald-200 dark:border-emerald-800/40",
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    glow: "",
  },
  imminent: {
    dot: "bg-amber-500 ring-amber-400/50 animate-pulse",
    line: "bg-amber-400/40",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    card: "border-amber-300 dark:border-amber-700/50 shadow-amber-100 dark:shadow-amber-900/20 shadow-sm",
    icon: Zap,
    iconColor: "text-amber-500",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.15)]",
  },
  upcoming: {
    dot: "bg-blue-500 ring-blue-400/30",
    line: "bg-blue-400/30",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    card: "border-blue-200 dark:border-blue-800/40",
    icon: Clock,
    iconColor: "text-blue-500",
    glow: "",
  },
  future: {
    dot: "bg-slate-400 dark:bg-slate-600 ring-slate-300/30",
    line: "bg-slate-300/40 dark:bg-slate-600/30",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    card: "border-slate-200 dark:border-slate-700/40",
    icon: CalendarClock,
    iconColor: "text-slate-400",
    glow: "",
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
    <ul className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-700/50 pt-4">
      {phase.obligations.map((obligation) => {
        const isRelevant = obligation.audiences.some((a) => relevantAudiences.includes(a));
        return (
          <li
            key={obligation.titleKey}
            className={`flex items-start gap-2.5 text-xs rounded-md px-3 py-2 transition-colors ${
              isRelevant
                ? "bg-gold/5 dark:bg-gold/10 border border-gold/20"
                : "text-slate-500 dark:text-slate-500"
            }`}
          >
            <span
              className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${
                isRelevant ? "bg-gold" : "bg-slate-300 dark:bg-slate-600"
              }`}
            />
            <div className="flex-1 min-w-0">
              <span
                className={
                  isRelevant
                    ? "text-slate-800 dark:text-slate-200 font-medium"
                    : "text-slate-500 dark:text-slate-500"
                }
              >
                {t(obligation.titleKey as DictionaryKey)}
              </span>
              <span
                className={`ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                  isRelevant
                    ? "bg-gold/15 text-gold dark:text-gold-light"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {obligation.articleRef}
              </span>
              {obligation.maxPenalty && (
                <div className="mt-1 text-[10px] text-red-500 dark:text-red-400 font-medium">
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
    <div className="flex gap-4">
      {/* Spine */}
      <div className="flex flex-col items-center">
        <div
          className={`w-4 h-4 rounded-full ring-4 ring-offset-2 ring-offset-paper dark:ring-offset-slate-deep flex-shrink-0 mt-1 ${cfg.dot}`}
        />
        {!isLast && <div className={`w-0.5 flex-1 mt-2 min-h-[2rem] ${cfg.line}`} />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-8">
        <div
          className={`rounded-xl border bg-white dark:bg-slate-medium p-5 transition-all duration-200 ${cfg.card} ${cfg.glow} ${
            isRelevantPhase ? "ring-1 ring-gold/30" : ""
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Icon className={`w-4 h-4 shrink-0 ${cfg.iconColor}`} />
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}
                >
                  {t(`timeline_status_${phase.status}` as DictionaryKey)}
                </span>
                {isRelevantPhase && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/10 text-gold dark:text-gold-light border border-gold/30">
                    {t("timeline_relevant_badge")}
                  </span>
                )}
                {phase.proposed && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-700/40">
                    {t("timeline_proposed_badge")}
                  </span>
                )}
              </div>

              <h3 className="font-serif text-base font-bold text-slate-deep dark:text-paper">
                {t(phase.titleKey as DictionaryKey)}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t(phase.subtitleKey as DictionaryKey)}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-slate-deep dark:text-paper font-mono">
                {formatDate(phase.isoDate, language)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {days < 0
                  ? `${absDays} ${t("timeline_days_ago")}`
                  : `${absDays} ${t("timeline_days_left")}`}
              </div>
              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                {phase.chapterRef}
              </div>
            </div>
          </div>

          {phase.obligations.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-gold dark:hover:text-gold-light transition-colors group"
              >
                {open ? (
                  <ChevronUp className="w-3.5 h-3.5 group-hover:text-gold" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 group-hover:text-gold" />
                )}
                {open ? t("timeline_hide_obligations") : t("timeline_show_obligations")}
                {hasRelevant && !open && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-gold inline-block" />
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
      className="border border-border dark:border-border-dark rounded-xl bg-white dark:bg-slate-medium p-8 mb-6"
    >
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-5 h-5 gold-accent" />
            <h2 className="font-serif text-xl font-bold text-slate-deep dark:text-paper">
              {t("timeline_section_title")}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
            {t("timeline_section_subtitle")}
          </p>
        </div>
        <a
          href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-gold dark:text-slate-400 dark:hover:text-gold-light transition-colors"
          aria-label="Open EU AI Act full text"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Reg. (EU) 2024/1689
        </a>
      </div>

      <div className="flex items-center gap-4 flex-wrap mb-6 text-[11px] text-slate-500 dark:text-slate-400">
        {(["past", "imminent", "upcoming", "future"] as DeadlineStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-transparent ${cfg.dot.replace("animate-pulse", "")}`}
              />
              {t(`timeline_status_${s}` as DictionaryKey)}
            </span>
          );
        })}
        {riskLevel && (
          <span className="flex items-center gap-1.5 ml-auto">
            <span className="w-2 h-2 rounded-full bg-gold" />
            {t("timeline_relevant_badge")}
          </span>
        )}
      </div>

      <div className="relative">
        {phasesWithStatus.map((phase, i) => (
          <div key={phase.id}>
            {i === firstUpcomingIndex && firstUpcomingIndex > 0 && (
              <div className="flex items-center gap-3 mb-4 ml-8">
                <div className="flex-1 h-px bg-gold/40 dark:bg-gold/30" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold dark:text-gold-light flex items-center gap-1.5 px-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                  {t("timeline_today_label")}
                </span>
                <div className="flex-1 h-px bg-gold/40 dark:bg-gold/30" />
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
        <div className="mt-2 rounded-xl border border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-900/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setOmnibusOpen((o) => !o)}
            className="w-full flex items-start gap-3 p-4 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
          >
            <Info className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                  {t("timeline_omnibus_title")}
                </p>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300">
                  {t("timeline_proposed_badge")}
                </span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 line-clamp-2">
                {t("timeline_omnibus_desc")}
              </p>
            </div>
            <span className="shrink-0 text-purple-400">
              {omnibusOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          </button>

          {omnibusOpen && (
            <div className="px-4 pb-4 border-t border-purple-200 dark:border-purple-800/40 pt-4">
              <div className="space-y-3">
                {DIGITAL_OMNIBUS_PROPOSALS.map((proposal) => {
                  const days = getDaysUntilDeadline(proposal.isoDate, nowMs);
                  return (
                    <div
                      key={proposal.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-slate-800/30 border border-purple-100 dark:border-purple-800/30"
                    >
                      <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {t(proposal.titleKey as DictionaryKey)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {t(proposal.subtitleKey as DictionaryKey)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">
                          {formatDate(proposal.isoDate, language)}
                        </div>
                        <div className="text-[10px] text-slate-400">~{Math.round(days / 30)}mo</div>
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
      <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 flex items-start gap-1.5">
        <Info className="w-3 h-3 shrink-0 mt-0.5" />
        Source: Regulation (EU) 2024/1689, Art. 113 • Non-legal-advice
      </p>
    </section>
  );
}
