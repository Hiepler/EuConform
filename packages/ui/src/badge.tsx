import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";
import { cn } from "./lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-600 text-white shadow-sm",
        secondary:
          "border-transparent bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
        destructive: "border-transparent bg-red-500 text-white shadow-sm",
        outline: "text-foreground border-slate-200 dark:border-slate-700",
        unacceptable:
          "border-transparent bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/25",
        high: "border-transparent bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25",
        limited:
          "border-transparent bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-900 shadow-lg shadow-yellow-500/25",
        minimal:
          "border-transparent bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25",
        passed:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        failed: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
