"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { logger } from "@/lib/logger";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Dashboard error boundary caught exception", error);
  }, [error]);

  return (
    <div className="p-8 bg-white rounded-xl border border-rose-200 text-center max-w-lg mx-auto my-12 shadow-xs">
      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">Dashboard Intelligence Error</h3>
      <p className="text-xs text-slate-500 mt-1 mb-5">
        Failed to calculate business metrics. The error has been isolated without compromising session security.
      </p>
      <Button variant="primary" size="sm" onClick={() => reset()} className="gap-2 mx-auto">
        <RefreshCcw className="w-3.5 h-3.5" /> Reload Dashboard
      </Button>
    </div>
  );
}
