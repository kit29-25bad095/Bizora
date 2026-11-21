"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { logger } from "@/lib/logger";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Root error boundary caught unhandled exception", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Application Error</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
          An unexpected operational exception occurred. Sensitive details have been logged safely.
        </p>
        <Button variant="primary" size="md" onClick={() => reset()} className="w-full gap-2">
          <RefreshCcw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    </div>
  );
}
