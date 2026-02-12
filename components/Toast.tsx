"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, isOpen, onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade-out animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "bg-card border border-border rounded-lg shadow-lg",
        "px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-[90vw]",
        "transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
      role="alert"
    >
      <CheckCircle2 className="w-5 h-5 text-primary-500 flex-shrink-0" />
      <p className="text-sm font-medium text-foreground flex-1">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="p-1 rounded hover:bg-muted transition-colors"
        aria-label="Close toast"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
