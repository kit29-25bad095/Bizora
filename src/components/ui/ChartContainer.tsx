import React from "react";
import { cn } from "@/lib/utils";

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  accessibleDescription?: string;
  className?: string;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  actions,
  accessibleDescription,
  className,
}: ChartContainerProps) {
  return (
    <div
      className={cn("bg-white border border-slate-200 rounded-xl p-5 shadow-xs", className)}
      role="region"
      aria-label={title}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {accessibleDescription && (
        <span className="sr-only">{accessibleDescription}</span>
      )}

      <div className="pt-4">{children}</div>
    </div>
  );
}
