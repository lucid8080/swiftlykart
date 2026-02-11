"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { User, LogIn, ScanLine } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onScanClick?: () => void;
}

export function Header({ onScanClick }: HeaderProps) {
  const { data: session, status } = useSession();

  return (
    <header
      className={cn(
        "sticky top-0 z-30",
        "bg-background/80 backdrop-blur-lg",
        "border-b border-border/50",
        "safe-top"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo / App name */}
          <Link href="/" className="flex items-center gap-2 focus-ring rounded-lg">
            <img
              src="/logo/swiftlykart-logo2.png"
              alt="SwiftlyKart"
              className="h-8 w-auto"
            />
            <span className="font-bold text-xl tracking-tight text-foreground">
              SwiftlyKart
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onScanClick && (
              <button
                onClick={onScanClick}
                className={cn(
                  "w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center",
                  "hover:bg-primary-600 active:scale-95",
                  "focus-ring transition-colors-fast",
                  "hidden lg:flex" // Hide on mobile, show on desktop
                )}
                aria-label="Scan barcode"
              >
                <ScanLine className="w-5 h-5" />
              </button>
            )}
            <ThemeToggle />
            
            {status === "loading" ? (
              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
            ) : session?.user ? (
              <Link
                href="/account"
                className={cn(
                  "w-10 h-10 rounded-xl bg-muted flex items-center justify-center",
                  "hover:bg-muted/80 active:scale-95",
                  "focus-ring transition-colors-fast"
                )}
                aria-label="Account settings"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-primary-500" />
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl",
                  "bg-primary-500 text-white font-medium",
                  "hover:bg-primary-600 active:scale-95",
                  "focus-ring transition-colors-fast"
                )}
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
