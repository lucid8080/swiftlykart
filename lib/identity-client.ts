/**
 * Client-side identity utilities for retroactive attribution
 * Manages anonVisitorId in localStorage and pings server
 */

const ANON_VISITOR_KEY = "anonVisitorId";

/**
 * Get or create anonVisitorId from localStorage
 * Returns null if localStorage is not available
 */
export function getAnonVisitorId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    let vid = localStorage.getItem(ANON_VISITOR_KEY);
    if (!vid) {
      // Generate new UUIDv4
      vid = crypto.randomUUID();
      localStorage.setItem(ANON_VISITOR_KEY, vid);
    }
    return vid;
  } catch (error) {
    // localStorage blocked or unavailable
    console.warn("[Identity] localStorage not available:", error);
    return null;
  }
}

/**
 * Get anonVisitorId without creating one if missing
 * Returns null if not found or localStorage unavailable
 */
export function getAnonVisitorIdOnly(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(ANON_VISITOR_KEY);
  } catch {
    return null;
  }
}

/**
 * Ping the server to ensure Visitor exists and update lastSeenAt
 * This should be called on page load (especially after /t tap redirect)
 * 
 * @param anonVisitorId - Optional, will get from localStorage if not provided
 * @returns Promise with visitor info or null if failed
 */
export async function pingIdentity(
  anonVisitorId?: string | null
): Promise<{ visitorId: string; userId: string | null } | null> {
  const vid = anonVisitorId || getAnonVisitorId();
  if (!vid) {
    return null; // Can't ping without anonVisitorId
  }

  try {
    const response = await fetch("/api/identity/ping", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ anonVisitorId: vid }),
    });

    if (!response.ok) {
      console.warn("[Identity] Ping failed:", response.status);
      return null;
    }

    const data = await response.json();
    if (data.success && data.data) {
      return {
        visitorId: data.data.visitorId,
        userId: data.data.userId || null,
      };
    }

    return null;
  } catch (error) {
    console.warn("[Identity] Ping error:", error);
    return null;
  }
}

/**
 * Claim identity - link all past taps and lists to authenticated user
 * Should be called after successful signup/login
 * 
 * @param anonVisitorId - Optional, will get from localStorage if not provided
 * @param method - The context of the claim: "login", "signup", or "manual"
 * @returns Promise with claim result or null if failed
 */
export async function claimIdentity(
  anonVisitorId?: string | null,
  method: "login" | "signup" | "manual" = "manual"
): Promise<{
  success: boolean;
  visitorId?: string;
  tapEventsLinked?: number;
  myListClaimed?: boolean;
  error?: string;
  code?: string;
} | null> {
  const vid = anonVisitorId || getAnonVisitorIdOnly();
  if (!vid) {
    return {
      success: false,
      error: "No anonVisitorId found",
      code: "NO_VISITOR_ID",
    };
  }

  try {
    const response = await fetch("/api/identity/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ anonVisitorId: vid, method }),
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        visitorId: data.data.visitorId,
        tapEventsLinked: data.data.tapEventsLinked,
        myListClaimed: data.data.myListClaimed,
      };
    } else {
      return {
        success: false,
        error: data.error || "Claim failed",
        code: data.code || "UNKNOWN_ERROR",
      };
    }
  } catch (error) {
    console.error("[Identity] Claim error:", error);
    return {
      success: false,
      error: "Network error",
      code: "NETWORK_ERROR",
    };
  }
}

/**
 * Get headers for API requests that include anonVisitorId
 * Useful for sending anonVisitorId in custom header
 */
export function getIdentityHeaders(): Record<string, string> {
  const vid = getAnonVisitorIdOnly();
  if (!vid) return {};

  return {
    "X-Anon-Visitor-Id": vid,
  };
}
