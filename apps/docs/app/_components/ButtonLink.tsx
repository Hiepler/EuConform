import Link from "next/link";
import type { ReactNode } from "react";

export function ButtonLink({
  href,
  children,
  secondary = false,
  external = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  external?: boolean;
}) {
  const className = secondary
    ? "inline-flex items-center justify-center rounded-full border border-slate-300/80 bg-white/82 px-4 py-2.5 text-[13px] font-medium text-slate-900 transition hover:border-slate-500 hover:bg-white sm:px-5 sm:py-3 sm:text-sm"
    : "inline-flex items-center justify-center rounded-full bg-[#17345c] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#21457c] sm:px-5 sm:py-3 sm:text-sm";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
