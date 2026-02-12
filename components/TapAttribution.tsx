"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { getAnonVisitorId, incrementTagTapCount } from "@/lib/identity-client";

/**
 * Centralized NFC tap attribution handler.
 * Runs in root layout. When srcBatch/srcTag query params are present
 * (from NFC redirect), calls /api/tap/identify to associate the tap
 * with the anonymous visitor, then cleans the URL.
 *
 * Works on ANY landing page (/, /list, or custom paths).
 */
export function TapAttribution() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const identifiedRef = useRef(false);

  const srcBatch = searchParams.get("srcBatch");
  const srcTag = searchParams.get("srcTag");

  useEffect(() => {
    if (!srcBatch || !srcTag) return;
    if (identifiedRef.current) return;
    identifiedRef.current = true;

    const identify = async () => {
      try {
        const anonVisitorId = getAnonVisitorId();
        if (!anonVisitorId) return;

        // Increment tag tap count for PWA prompt threshold
        const newCount = incrementTagTapCount();
        console.log(`[TapAttribution] Tag tap detected. Total taps: ${newCount}`);

        await fetch("/api/tap/identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anonVisitorId,
            srcBatch,
            srcTag,
          }),
        });
      } catch (err) {
        console.error("[TapAttribution] identify failed:", err);
      }

      // Clean srcBatch/srcTag from URL so it doesn't re-fire
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("srcBatch");
        url.searchParams.delete("srcTag");
        window.history.replaceState({}, "", url.pathname + url.search);
      } catch {
        // Ignore — SSR or other environment
      }
    };

    identify();
  }, [srcBatch, srcTag, pathname]);

  return null;
}
