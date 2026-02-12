"use client";

import { X, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoundEverythingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  onSaveAndClear: () => void;
}

export function FoundEverythingDialog({
  isOpen,
  onClose,
  onClear,
  onSaveAndClear,
}: FoundEverythingDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="found-everything-title"
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
          <h2 id="found-everything-title" className="text-lg font-semibold text-foreground">
            Nice! Want to clear your list?
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
          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onClear}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                "bg-muted text-foreground font-medium",
                "hover:bg-muted/80 active:bg-muted/60",
                "focus-ring transition-colors"
              )}
            >
              <Trash2 className="w-5 h-5" />
              Clear my list (start fresh)
            </button>
            <button
              onClick={onSaveAndClear}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                "bg-primary-500 text-white font-medium",
                "hover:bg-primary-600 active:bg-primary-700",
                "focus-ring transition-colors"
              )}
            >
              <Save className="w-5 h-5" />
              Save this list for later + start fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
