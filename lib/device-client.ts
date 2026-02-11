"use client";

import { generateUUID } from "./utils";

const DEVICE_COOKIE_NAME = "g_device";
const DEVICE_HEADER_NAME = "x-device-id";
const DEVICE_STORAGE_KEY = "g_device";
const LIST_COOKIE_NAME = "g_list";

/**
 * Client-side: Get device ID from localStorage and cookie
 */
export function getClientDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  
  // Try localStorage first
  const storedId = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (storedId) return storedId;

  // Try to read from cookie
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === DEVICE_COOKIE_NAME && value) {
      // Sync to localStorage
      localStorage.setItem(DEVICE_STORAGE_KEY, value);
      return value;
    }
  }

  return null;
}

/**
 * Client-side: Initialize device ID (create if not exists)
 */
export function initClientDeviceId(): string {
  if (typeof window === "undefined") {
    throw new Error("initClientDeviceId can only be called on client");
  }

  // Check existing
  let deviceId = getClientDeviceId();
  if (deviceId) return deviceId;

  // Generate new
  deviceId = generateUUID();

  // Store in localStorage
  localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);

  // Store in cookie
  document.cookie = `${DEVICE_COOKIE_NAME}=${deviceId}; path=/; max-age=${60 * 60 * 24 * 365 * 2}; samesite=lax`;

  return deviceId;
}

/**
 * Client-side: Get headers for API requests
 */
export function getDeviceHeaders(): Record<string, string> {
  const deviceId = getClientDeviceId();
  if (!deviceId) return {};
  return { [DEVICE_HEADER_NAME]: deviceId };
}

// Export constants for client use
export const DEVICE_CONSTANTS = {
  COOKIE_NAME: DEVICE_COOKIE_NAME,
  HEADER_NAME: DEVICE_HEADER_NAME,
  STORAGE_KEY: DEVICE_STORAGE_KEY,
  LIST_COOKIE_NAME: LIST_COOKIE_NAME,
} as const;
