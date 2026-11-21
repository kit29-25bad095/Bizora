import React from "react";

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Loading Bizora Platform...
        </span>
      </div>
    </div>
  );
}
