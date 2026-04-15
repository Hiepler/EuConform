import type { CSSProperties } from "react";
import type { Messages } from "../lib/i18n";

export function EvidenceAssembly({ messages }: { messages: Messages["assembly"] }) {
  const cards = [
    {
      className: "left-0 top-12 z-20 w-[82%] sm:w-[78%] md:w-[68%] animate-float-slow",
      rotation: "-4deg",
      role: "report",
      schema: "euconform.report.v1",
      tone: "from-[#f8f1e7] to-[#efe3d1]",
      lines: messages.cards.report,
    },
    {
      className: "right-0 top-0 z-30 w-[78%] sm:w-[74%] md:w-[62%] animate-float-delay",
      rotation: "5deg",
      role: "aibom",
      schema: "euconform.aibom.v1",
      tone: "from-[#eef4fb] to-[#dfe8f7]",
      lines: messages.cards.aibom,
    },
    {
      className: "left-6 bottom-4 z-10 w-[80%] sm:w-[76%] md:w-[66%] animate-float-fast",
      rotation: "2deg",
      role: "ci",
      schema: "euconform.ci.v1",
      tone: "from-[#eef4e8] to-[#ddebd5]",
      lines: messages.cards.ci,
    },
    {
      className: "right-4 bottom-0 z-40 w-[76%] sm:w-[72%] md:w-[60%] animate-float-reverse",
      rotation: "-3deg",
      role: "bundle",
      schema: "euconform.bundle.v1",
      tone: "from-[#f2eefb] to-[#e3dcf6]",
      lines: messages.cards.bundle,
    },
  ];

  return (
    <div className="relative h-[26rem] rounded-2xl border border-slate-300/70 bg-[#f1ece2]/78 p-3 shadow-[0_32px_100px_rgba(20,29,44,0.1)] backdrop-blur sm:h-[30rem] sm:rounded-[2rem] sm:p-4 md:h-[38rem]">
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/60 sm:rounded-[2rem]" />
      <div className="docs-grid absolute inset-0 rounded-2xl opacity-50 sm:rounded-[2rem]" />
      <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/84 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-500 backdrop-blur sm:left-4 sm:top-4 sm:px-3 sm:text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#17345c] sm:h-2 sm:w-2" />
        {messages.badge}
      </div>
      <div className="absolute inset-x-4 bottom-4 top-12 sm:inset-x-6 sm:bottom-6 sm:top-16 md:inset-x-10 md:bottom-10 md:top-20">
        {cards.map((card) => (
          <article
            key={card.role}
            style={{ "--float-rotation": card.rotation } as CSSProperties}
            className={`absolute rounded-xl border border-white/80 bg-gradient-to-br ${card.tone} p-3.5 shadow-[0_18px_40px_rgba(20,29,44,0.12)] backdrop-blur sm:rounded-[1.6rem] sm:p-5 ${card.className}`}
          >
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.24em] text-slate-500 sm:text-[10px]">
                  {card.role}
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-900 sm:mt-2 sm:text-sm">
                  {card.schema}
                </p>
              </div>
              <div className="rounded-full border border-slate-300/80 bg-white/74 px-2 py-0.5 font-mono text-[9px] text-slate-500 sm:px-2.5 sm:py-1 sm:text-[11px]">
                {messages.verifiedLabel}
              </div>
            </div>
            <div className="mt-3 space-y-1.5 sm:mt-6 sm:space-y-2">
              {card.lines.map((line) => (
                <div
                  key={line}
                  className="flex items-center justify-between gap-3 border-b border-slate-300/60 pb-1.5 text-[11px] text-slate-700 sm:gap-4 sm:pb-2 sm:text-sm"
                >
                  <span className="truncate">{line}</span>
                  <span className="shrink-0 font-mono text-[9px] text-slate-500 sm:text-[11px]">
                    {messages.okLabel}
                  </span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
