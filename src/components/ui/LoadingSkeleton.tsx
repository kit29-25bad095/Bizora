import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse bg-slate-200/80 rounded-md", className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-24"></div>
      <div className="h-8 bg-slate-200 rounded w-36"></div>
      <div className="h-3 bg-slate-100 rounded w-48"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 animate-pulse">
      <div className="h-8 bg-slate-100 rounded w-full"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-slate-50 rounded w-full"></div>
      ))}
    </div>
  );
}
