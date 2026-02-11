"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-background">
      <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          We encountered an unexpected error. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mt-2">
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <button
        onClick={reset}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl font-medium",
          "bg-primary-500 text-white",
          "hover:bg-primary-600 active:scale-95",
          "focus-ring transition-colors-fast"
        )}
      >
        <RefreshCw className="w-5 h-5" />
        Try again
      </button>
    </div>
  );
}
