import React from "react";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-center pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-md"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-md"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-32 bg-slate-200 rounded-md"></div>
          <div className="h-9 w-28 bg-slate-200 rounded-md"></div>
        </div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-slate-200 rounded-sm"></div>
              <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
            </div>
            <div className="h-8 w-36 bg-slate-200 rounded-md"></div>
            <div className="h-3 w-40 bg-slate-100 rounded-sm"></div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-80 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="h-5 w-48 bg-slate-200 rounded-md"></div>
          <div className="h-60 bg-slate-50 rounded-lg"></div>
        </div>
        <div className="h-80 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="h-5 w-48 bg-slate-200 rounded-md"></div>
          <div className="h-60 bg-slate-50 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}
