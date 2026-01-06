"use client";

/**
 * Props for the BackgroundElements component
 */
export interface BackgroundElementsProps {
  /** Visual variant for different screen styles */
  variant?: "intro" | "quiz" | "minimal";
}

/**
 * BackgroundElements renders decorative EU stars animation and gradient backgrounds.
 * Provides consistent visual styling across different screens.
 */
export function BackgroundElements({ variant = "intro" }: BackgroundElementsProps) {
  if (variant === "minimal") {
    return (
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-slate-200/20 dark:bg-slate-700/20 rounded-full blur-3xl" />
      </div>
    );
  }

  if (variant === "quiz") {
    return (
      <div className="absolute inset-0 -z-10">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        {/* Large blur elements */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-slate-900/10 dark:bg-white/5 blur-3xl" />
        {/* EU Stars */}
        <div className="absolute top-1/4 left-1/3 w-2 h-2 rounded-full bg-gold/20 animate-gentle-float" />
        <div
          className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-gold/10 animate-gentle-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full bg-gold/15 animate-gentle-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-1/4 right-1/3 w-2 h-2 rounded-full bg-gold/10 animate-gentle-float"
          style={{ animationDelay: "3s" }}
        />
      </div>
    );
  }

  // Default "intro" variant
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-2 h-2 rounded-full bg-gold/20 animate-gentle-float" />
      <div
        className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-gold/10 animate-gentle-float"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full bg-gold/15 animate-gentle-float"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute bottom-1/4 right-1/3 w-2 h-2 rounded-full bg-gold/10 animate-gentle-float"
        style={{ animationDelay: "3s" }}
      />
    </div>
  );
}
