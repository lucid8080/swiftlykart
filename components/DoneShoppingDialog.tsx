"use client";

import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DoneShoppingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onYes: () => void;
  onNo: () => void;
}

export function DoneShoppingDialog({
  isOpen,
  onClose,
  onYes,
  onNo,
}: DoneShoppingDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="done-shopping-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="done-shopping-title" className="text-lg font-semibold text-foreground">
            Done Shopping?
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-base text-foreground mb-6 text-center">
            Did you find everything you were looking for?
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onYes}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                "bg-primary-500 text-white font-medium",
                "hover:bg-primary-600 active:bg-primary-700",
                "focus-ring transition-colors"
              )}
            >
              <CheckCircle2 className="w-5 h-5" />
              Yes, I found everything
            </button>
            <button
              onClick={onNo}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                "bg-muted text-foreground font-medium",
                "hover:bg-muted/80 active:bg-muted/60",
                "focus-ring transition-colors"
              )}
            >
              No, some items were missing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
