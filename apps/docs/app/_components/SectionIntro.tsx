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
      <h2 className="font-editorial text-4xl leading-none text-slate-950 md:text-5xl">{title}</h2>
      <div className="max-w-2xl text-base leading-7 text-slate-700">{children}</div>
    </div>
  );
}
