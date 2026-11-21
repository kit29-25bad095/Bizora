import React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateRange = "today" | "7d" | "30d" | "90d";

export interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangeSelector({ value, onChange, className }: DateRangeSelectorProps) {
  const ranges: Array<{ id: DateRange; label: string }> = [
    { id: "today", label: "Today" },
    { id: "7d", label: "Last 7 Days" },
    { id: "30d", label: "Last 30 Days" },
    { id: "90d", label: "Last 90 Days" },
  ];

  return (
    <div className={cn("inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200", className)}>
      <div className="flex items-center px-2 text-slate-400">
        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-1">
        {ranges.map((r) => {
          const isSelected = value === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onChange(r.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer",
                isSelected
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
