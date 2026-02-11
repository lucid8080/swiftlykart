"use client";

import { useEffect, useState } from "react";
import { initClientDeviceId, getClientDeviceId } from "@/lib/device-client";

interface UseDeviceReturn {
  deviceId: string | null;
  isInitialized: boolean;
}

export function useDevice(): UseDeviceReturn {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize device ID on mount
    const id = initClientDeviceId();
    setDeviceId(id);
    setIsInitialized(true);
  }, []);

  return { deviceId, isInitialized };
}

/**
 * Hook to get current device ID without initializing
 */
export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    setDeviceId(getClientDeviceId());
  }, []);

  return deviceId;
}
