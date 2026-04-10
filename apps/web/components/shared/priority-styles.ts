export const PRIORITY_STYLES: Record<
  "critical" | "high" | "medium" | "low",
  { badge: string; border: string; dot: string; iconBase: string }
> = {
  critical: {
    badge:
      "bg-red-50/50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200/50 dark:border-red-500/20",
    border:
      "border-red-100 dark:border-red-900/40 hover:border-red-200 dark:hover:border-red-600/50",
    dot: "bg-red-500 border-red-200 dark:border-red-600",
    iconBase: "text-red-500 dark:text-red-400",
  },
  high: {
    badge:
      "bg-amber-50/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20",
    border:
      "border-amber-100 dark:border-amber-900/40 hover:border-amber-200 dark:hover:border-amber-600/50",
    dot: "bg-amber-500 border-amber-200 dark:border-amber-600",
    iconBase: "text-amber-500 dark:text-amber-400",
  },
  medium: {
    badge:
      "bg-blue-50/50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20",
    border:
      "border-blue-100 dark:border-blue-900/40 hover:border-blue-200 dark:hover:border-blue-600/50",
    dot: "bg-blue-500 border-blue-200 dark:border-blue-600",
    iconBase: "text-blue-500 dark:text-blue-400",
  },
  low: {
    badge:
      "bg-slate-50/50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200/50 dark:border-slate-500/20",
    border:
      "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
    dot: "bg-slate-400 border-slate-200 dark:border-slate-600",
    iconBase: "text-slate-500 dark:text-slate-400",
  },
};
