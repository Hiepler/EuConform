import type { CSSProperties } from "react";
import type { Messages } from "../lib/i18n";

export function EvidenceAssembly({ messages }: { messages: Messages["assembly"] }) {
  const cards = [
    {
      className: "left-0 top-16 z-20 w-[78%] md:w-[68%] animate-float-slow",
      rotation: "-4deg",
      role: "report",
      schema: "euconform.report.v1",
      tone: "from-[#f8f1e7] to-[#efe3d1]",
      lines: messages.cards.report,
    },
    {
      className: "right-0 top-0 z-30 w-[74%] md:w-[62%] animate-float-delay",
      rotation: "5deg",
      role: "aibom",
      schema: "euconform.aibom.v1",
      tone: "from-[#eef4fb] to-[#dfe8f7]",
      lines: messages.cards.aibom,
    },
    {
      className: "left-10 bottom-6 z-10 w-[76%] md:w-[66%] animate-float-fast",
      rotation: "2deg",
      role: "ci",
      schema: "euconform.ci.v1",
      tone: "from-[#eef4e8] to-[#ddebd5]",
      lines: messages.cards.ci,
    },
    {
      className: "right-6 bottom-0 z-40 w-[72%] md:w-[60%] animate-float-reverse",
      rotation: "-3deg",
      role: "bundle",
      schema: "euconform.bundle.v1",
      tone: "from-[#f2eefb] to-[#e3dcf6]",
      lines: messages.cards.bundle,
    },
  ];

  return (
    <div className="relative h-[30rem] rounded-[2rem] border border-slate-300/70 bg-[#f1ece2]/78 p-4 shadow-[0_32px_100px_rgba(20,29,44,0.1)] backdrop-blur md:h-[38rem]">
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/60" />
      <div className="docs-grid absolute inset-0 rounded-[2rem] opacity-50" />
      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/84 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-500 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-[#17345c]" />
        {messages.badge}
      </div>
      <div className="absolute inset-x-6 bottom-6 top-16 md:inset-x-10 md:bottom-10 md:top-20">
        {cards.map((card) => (
          <article
            key={card.role}
            style={{ "--float-rotation": card.rotation } as CSSProperties}
            className={`absolute rounded-[1.6rem] border border-white/80 bg-gradient-to-br ${card.tone} p-5 shadow-[0_18px_40px_rgba(20,29,44,0.12)] backdrop-blur ${card.className}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  {card.role}
                </p>
                <p className="mt-2 font-mono text-sm text-slate-900">{card.schema}</p>
              </div>
              <div className="rounded-full border border-slate-300/80 bg-white/74 px-2.5 py-1 font-mono text-[11px] text-slate-500">
                {messages.verifiedLabel}
              </div>
            </div>
            <div className="mt-6 space-y-2">
              {card.lines.map((line) => (
                <div
                  key={line}
                  className="flex items-center justify-between gap-4 border-b border-slate-300/60 pb-2 text-sm text-slate-700"
                >
                  <span>{line}</span>
                  <span className="font-mono text-[11px] text-slate-500">{messages.okLabel}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
