import type { ReactNode } from "react";

export function SectionIntro({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl space-y-3">
      <p className="eyebrow">{label}</p>
      <h2 className="font-editorial text-2xl leading-tight text-slate-950 sm:text-3xl md:text-4xl lg:text-5xl">
        {title}
      </h2>
      <div className="max-w-2xl text-[15px] leading-7 text-slate-700 sm:text-base">{children}</div>
    </div>
  );
}
