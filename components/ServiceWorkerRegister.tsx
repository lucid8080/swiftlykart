"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Check for existing registrations first
      navigator.serviceWorker.getRegistrations().then((_registrations) => {
        // Register service worker (will reuse existing if scope matches)
        navigator.serviceWorker
          .register("/sw.js", { updateViaCache: "none" })
          .then((registration) => {
            console.log("SW registered:", registration.scope);
            
            // Delay initial update check to avoid race conditions
            // The browser needs time to fully process the registration
            setTimeout(() => {
              try {
                registration.update().catch((error) => {
                  // Silently handle update errors - they're not critical
                  // This can happen if the service worker file isn't available yet
                  // or if there's a network issue
                  if (error.message && !error.message.includes("Not found")) {
                    console.debug("SW update check failed (non-critical):", error);
                  }
                });
              } catch (error) {
                console.debug("SW update check error (non-critical):", error);
              }
            }, 1000);
            
            // Periodic update checks (every hour)
            setInterval(() => {
              try {
                registration.update().catch((error) => {
                  // Only log if it's not a "Not found" error (which is expected during dev)
                  if (error.message && !error.message.includes("Not found")) {
                    console.debug("SW periodic update check failed:", error);
                  }
                });
              } catch (error) {
                console.debug("SW periodic update check error:", error);
              }
            }, 60 * 60 * 1000);
            
            // Listen for updates
            registration.addEventListener("updatefound", () => {
              console.log("SW update found, new worker installing...");
            });
          })
          .catch((error) => {
            console.error("SW registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
