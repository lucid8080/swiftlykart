"use client";

import { useEffect } from "react";
import { initClientDeviceId } from "@/lib/device-client";
import { pingIdentity } from "@/lib/identity-client";

export function DeviceInit() {
  useEffect(() => {
    // Initialize device ID on app load
    initClientDeviceId();

    // Ping identity server to ensure Visitor exists and update lastSeenAt
    // This is especially important after /t tap redirects
    pingIdentity().catch((err) => {
      console.warn("[DeviceInit] Identity ping failed:", err);
      // Don't block app if ping fails
    });
  }, []);

  return null;
}
