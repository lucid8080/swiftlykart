import { cookies, headers } from "next/headers";

const DEVICE_COOKIE_NAME = "g_device";
const DEVICE_HEADER_NAME = "x-device-id";
const LIST_COOKIE_NAME = "g_list";

/**
 * Server-side: Get device ID from cookies or headers
 */
export async function getServerDeviceId(): Promise<string | null> {
  // Try cookie first
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
  if (cookieValue) return cookieValue;

  // Then try header
  const headerStore = await headers();
  const headerValue = headerStore.get(DEVICE_HEADER_NAME);
  if (headerValue) return headerValue;

  return null;
}

/**
 * Server-side: Set device ID cookie
 */
export async function setServerDeviceId(deviceId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE_NAME, deviceId, {
    httpOnly: false, // Allow client access
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 2, // 2 years
    path: "/",
  });
}

/**
 * Server-side: Get list ID from PIN session cookie
 */
export async function getPinListId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(LIST_COOKIE_NAME)?.value ?? null;
}

/**
 * Server-side: Set list ID cookie (for PIN access)
 */
export async function setPinListCookie(listId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LIST_COOKIE_NAME, listId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

/**
 * Server-side: Clear PIN list cookie
 */
export async function clearPinListCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(LIST_COOKIE_NAME);
}
