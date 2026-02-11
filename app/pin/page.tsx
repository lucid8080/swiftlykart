"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDeviceHeaders } from "@/lib/device-client";

export default function PinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [pin, setPin] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorParam);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Clear error from URL
  useEffect(() => {
    if (errorParam) {
      window.history.replaceState({}, "", "/pin");
    }
  }, [errorParam]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(null);

    // Move to next input
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 3 && newPin.every((d) => d)) {
      handleSubmit(newPin.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    
    if (pasted.length === 4) {
      const newPin = pasted.split("");
      setPin(newPin);
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (pinValue: string) => {
    if (pinValue.length !== 4 || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pin/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDeviceHeaders(),
        },
        body: JSON.stringify({ pin: pinValue }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/");
        }, 500);
      } else {
        setError(data.error || "Invalid PIN");
        setPin(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Failed to verify PIN. Please try again.");
      setPin(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-4">
        <Link
          href="/"
          className={cn(
            "inline-flex items-center gap-2 text-muted-foreground",
            "hover:text-foreground focus-ring rounded-lg p-1 -m-1"
          )}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div
              className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center",
                success
                  ? "bg-accent-100 dark:bg-accent-900"
                  : "bg-primary-100 dark:bg-primary-900"
              )}
            >
              {success ? (
                <CheckCircle className="w-10 h-10 text-accent-500" />
              ) : (
                <KeyRound className="w-10 h-10 text-primary-500" />
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              {success ? "Success!" : "Enter PIN"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {success
                ? "Redirecting to your list..."
                : "Enter your 4-digit PIN to access your grocery list"}
            </p>
          </div>

          {/* PIN Input */}
          {!success && (
            <div className="flex justify-center gap-3">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={isLoading}
                  className={cn(
                    "w-14 h-16 text-center text-2xl font-bold",
                    "bg-muted rounded-xl border-2",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    error && "border-red-500 shake",
                    digit && "bg-card"
                  )}
                  aria-label={`PIN digit ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          )}

          {/* Alternative actions */}
          {!success && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have a PIN?
              </p>
              <Link
                href="/login"
                className={cn(
                  "inline-block px-4 py-2 rounded-lg",
                  "text-primary-500 font-medium",
                  "hover:bg-primary-50 dark:hover:bg-primary-950/30",
                  "focus-ring transition-colors-fast"
                )}
              >
                Sign in to your account
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* NFC hint */}
      <footer className="p-4 text-center">
        <p className="text-xs text-muted-foreground">
          💡 Tip: You can also scan an NFC tag with your PIN
        </p>
      </footer>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
