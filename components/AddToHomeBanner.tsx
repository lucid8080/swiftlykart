"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, Share, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa_install_dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function AddToHomeBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return; // Don't show banner if already installed

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return;
      }
    }

    // Handle beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // For iOS, show banner after a delay
    if (ios) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === "accepted") {
        setShowBanner(false);
      }
      
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  const handleCloseIOSModal = useCallback(() => {
    setShowIOSModal(false);
  }, []);

  if (isStandalone || !showBanner) return null;

  return (
    <>
      {/* Banner */}
      <div
        className={cn(
          "fixed bottom-20 left-4 right-4 z-40",
          "lg:bottom-4 lg:left-auto lg:right-4 lg:w-80",
          "bg-card rounded-2xl shadow-xl border border-border",
          "p-4 animate-slide-up"
        )}
        role="banner"
        aria-label="Install app"
      >
        <button
          onClick={handleDismiss}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-lg",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-muted focus-ring"
          )}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              Add to Home Screen
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Install for quick access and offline use
            </p>
            <button
              onClick={handleInstall}
              className={cn(
                "mt-3 px-4 py-2 rounded-lg",
                "bg-primary-500 text-white font-medium text-sm",
                "hover:bg-primary-600 active:scale-95",
                "focus-ring transition-colors-fast"
              )}
            >
              {isIOS ? "Show me how" : "Install"}
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseIOSModal}
            aria-hidden="true"
          />
          <div
            className={cn(
              "relative w-full sm:max-w-md m-4",
              "bg-card rounded-2xl shadow-2xl",
              "p-6 animate-slide-up"
            )}
          >
            <button
              onClick={handleCloseIOSModal}
              className={cn(
                "absolute top-3 right-3 p-1.5 rounded-lg",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted focus-ring"
              )}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h2
              id="ios-install-title"
              className="text-xl font-bold text-foreground mb-4"
            >
              Add to Home Screen
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                    1
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    Tap the Share button
                    <Share className="w-4 h-4 inline ml-1.5 text-muted-foreground" />
                  </p>
                  <p className="text-sm text-muted-foreground">
                    At the bottom of your Safari browser
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                    2
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    Select &quot;Add to Home Screen&quot;
                    <Plus className="w-4 h-4 inline ml-1.5 text-muted-foreground" />
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Scroll down in the share menu if needed
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                    3
                  </span>
                </div>
                <div>
                  <p className="font-medium">Tap &quot;Add&quot;</p>
                  <p className="text-sm text-muted-foreground">
                    The app icon will appear on your home screen
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCloseIOSModal}
              className={cn(
                "w-full mt-6 px-4 py-3 rounded-xl",
                "bg-primary-500 text-white font-medium",
                "hover:bg-primary-600 active:scale-[0.98]",
                "focus-ring transition-colors-fast"
              )}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
