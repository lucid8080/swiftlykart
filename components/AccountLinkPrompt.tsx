"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X, Tag, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { claimIdentity, getAnonVisitorId } from "@/lib/identity-client";

// Make dismiss key user-specific so each user can dismiss separately
const getDismissKey = (userId: string) => `account_link_prompt_dismissed_${userId}`;

export function AccountLinkPrompt() {
  const { data: session, status } = useSession();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [conflictError, setConflictError] = useState(false);
  const [hasAnonVisitorId, setHasAnonVisitorId] = useState(false);

  useEffect(() => {
    // Only show for authenticated users (not admin accounts - they don't need NFC linking)
    if (status !== "authenticated" || !session?.user) return;
    
    // Don't show for admin accounts
    if (session.user.role === "admin") return;

    // Check if dismissed for this specific user
    const dismissKey = getDismissKey(session.user.id);
    const dismissed = localStorage.getItem(dismissKey);
    if (dismissed === "true") return;

    // Check if anonVisitorId exists
    const vid = getAnonVisitorId();
    const hasVid = !!vid;
    setHasAnonVisitorId(hasVid);
    console.log(`[AccountLinkPrompt] anonVisitorId exists: ${hasVid}, vid: ${vid ? vid.slice(0, 8) + '...' : 'null'}`);

    // Show prompt if user is authenticated but we want to ensure linking
    // Check if there might be unclaimed taps by trying to claim
    const checkAndShow = async () => {
      if (vid) {
        // Try to claim - if it succeeds with taps linked, we're good
        // If it fails or no taps, show prompt to tap tag
        try {
          const result = await claimIdentity(vid, "manual");
          if (result?.code === "ALREADY_CLAIMED") {
            // 409 conflict — this device's NFC history belongs to another account
            setConflictError(true);
            setShowPrompt(true);
            return;
          }
          if (result?.success && result.tapEventsLinked && result.tapEventsLinked > 0) {
            // Already linked, don't show prompt
            return;
          }
          // No taps linked yet, show prompt
          setShowPrompt(true);
        } catch {
          // Error claiming, show prompt anyway
          setShowPrompt(true);
        }
      } else {
        // No anonVisitorId yet, show prompt to tap tag
        setShowPrompt(true);
      }
    };

    // Delay showing prompt slightly after page load
    const timer = setTimeout(checkAndShow, 1000);
    return () => clearTimeout(timer);
  }, [status, session]);

  const handleDismiss = () => {
    if (!session?.user?.id) return;
    setShowPrompt(false);
    const dismissKey = getDismissKey(session.user.id);
    localStorage.setItem(dismissKey, "true");
  };

  const handleLinkNow = async () => {
    setIsLinking(true);
    try {
      const vid = getAnonVisitorId();
      if (vid) {
        const result = await claimIdentity(vid, "manual");
        if (result?.code === "ALREADY_CLAIMED") {
          // 409 conflict — stop retrying, show conflict banner
          setConflictError(true);
          return;
        }
        if (result?.success) {
          console.log(`[AccountLinkPrompt] Successfully linked: ${result.tapEventsLinked} taps, list claimed: ${result.myListClaimed}`);
          setLinkSuccess(true);
          setTimeout(() => {
            setShowPrompt(false);
            if (session?.user?.id) {
              const dismissKey = getDismissKey(session.user.id);
              localStorage.setItem(dismissKey, "true");
            }
            // Refresh the page to show updated data
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }, 2000);
        } else {
          // Claim failed - show error and suggest tapping tag
          console.warn(`[AccountLinkPrompt] Claim failed:`, result?.error, result?.code);
          setShowPrompt(true);
        }
      } else {
        console.warn("[AccountLinkPrompt] No anonVisitorId found - user needs to tap tag first");
      }
    } catch (error) {
      console.error("[AccountLinkPrompt] Link error:", error);
    } finally {
      setIsLinking(false);
    }
  };

  if (!showPrompt || status !== "authenticated") return null;

  return (
    <div
      className={cn(
        "fixed left-4 right-4 z-[100]",
        "lg:left-auto lg:right-4 lg:w-96 lg:bottom-4",
        "bottom-24", // Position above MyListDrawer (which is ~72px = 4.5rem, so 96px = 6rem gives us space)
        "bg-card rounded-2xl shadow-xl border border-border",
        "p-4 animate-slide-up",
        "max-h-[calc(90vh-6rem)] overflow-y-auto" // Account for bottom drawer space
      )}
      role="banner"
      aria-label="Link your account"
      style={{ 
        marginBottom: "env(safe-area-inset-bottom, 0)" // Account for mobile safe area
      }}
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

      {conflictError ? (
        <div className="flex items-start gap-3 pr-8">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Already linked to another account</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This device&apos;s NFC history is linked to a different account. If this is unexpected, contact support.
            </p>
          </div>
        </div>
      ) : linkSuccess ? (
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">Account linked!</p>
            <p className="text-sm text-muted-foreground">
              Your past taps and lists are now connected to your account.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 pr-8">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Tag className="w-5 h-5 text-primary-500" />
          </div>
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <p className="font-medium text-foreground mb-1.5">
                Link Your NFC Taps
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {hasAnonVisitorId
                  ? "Link your past taps and shopping lists to your account. If you've tapped tags before, tap your tag again to ensure everything is linked."
                  : "Tap your NFC tag to start linking your taps and shopping lists to your account."}
              </p>
            </div>
            {hasAnonVisitorId ? (
              <button
                onClick={handleLinkNow}
                disabled={isLinking}
                className={cn(
                  "w-full px-4 py-3 rounded-lg font-medium text-sm",
                  "bg-primary-500 text-white",
                  "hover:bg-primary-600 active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "focus-ring transition-colors-fast",
                  "touch-manipulation", // Better touch handling on mobile
                  "shadow-lg", // Make it more visible
                  "relative z-10" // Ensure it's above other elements
                )}
                style={{ minHeight: "48px" }} // Larger touch target for mobile
              >
                {isLinking ? "Linking..." : "Link Now"}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Tap your NFC tag first to generate a visitor ID
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
