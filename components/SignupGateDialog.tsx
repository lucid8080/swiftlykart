"use client";

import { X, UserPlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SignupGateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onJustClear: () => void;
}

export function SignupGateDialog({
  isOpen,
  onClose,
  onJustClear,
}: SignupGateDialogProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSignup = () => {
    router.push("/login?next=/");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-gate-title"
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
          <h2 id="signup-gate-title" className="text-lg font-semibold text-foreground">
            Save lists across devices
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
            Create a free account to save past lists and start fresh anytime.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSignup}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                "bg-primary-500 text-white font-medium",
                "hover:bg-primary-600 active:bg-primary-700",
                "focus-ring transition-colors"
              )}
            >
              <UserPlus className="w-5 h-5" />
              Create free account
            </button>
            <button
              onClick={onJustClear}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                "bg-muted text-foreground font-medium",
                "hover:bg-muted/80 active:bg-muted/60",
                "focus-ring transition-colors"
              )}
            >
              <Trash2 className="w-5 h-5" />
              Not now — just clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
