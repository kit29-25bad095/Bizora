import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string | number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  icon?: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger" | "brand";
  loading?: boolean;
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant = "default",
  loading = false,
  className,
}: KPICardProps) {
  if (loading) {
    return (
      <div className={cn("bg-white border border-slate-200 rounded-xl p-5 shadow-xs animate-pulse", className)}>
        <div className="flex justify-between items-start mb-3">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
        </div>
        <div className="h-7 bg-slate-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-slate-100 rounded w-40"></div>
      </div>
    );
  }

  const iconColors = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border border-amber-100",
    danger: "bg-rose-50 text-rose-600 border border-rose-100",
    brand: "bg-blue-50 text-blue-600 border border-blue-100",
  };

  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors",
        className
      )}
      role="region"
      aria-label={title}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconColors[variant])}>
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2.5">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center text-xs font-semibold gap-0.5 px-1.5 py-0.5 rounded",
              trend.direction === "up" && "text-emerald-700 bg-emerald-50",
              trend.direction === "down" && "text-rose-700 bg-rose-50",
              trend.direction === "neutral" && "text-slate-600 bg-slate-100"
            )}
          >
            {trend.direction === "up" && <TrendingUp className="w-3 h-3" />}
            {trend.direction === "down" && <TrendingDown className="w-3 h-3" />}
            <span>{trend.value}</span>
          </span>
        )}
      </div>

      {(subtitle || trend?.label) && (
        <p className="text-xs text-slate-500 mt-1.5">
          {trend?.label ? `${trend.label} ` : ""}
          {subtitle}
        </p>
      )}
    </div>
  );
}
