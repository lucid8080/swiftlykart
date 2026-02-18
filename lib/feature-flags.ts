/**
 * Feature flags for gating new functionality.
 * All flags default to false (disabled) unless explicitly set to "true" in env.
 */

/**
 * Check if the reporting aggregation system is enabled.
 * Gates: /api/internal/reporting/* endpoints
 */
export function isReportingEnabled(): boolean {
  return process.env.ENABLE_REPORTING === "true";
}

/**
 * Check if the executive view page is enabled.
 * Gates: /admin/executive page
 */
export function isExecutiveViewEnabled(): boolean {
  return process.env.ENABLE_EXECUTIVE_VIEW === "true";
}

/**
 * Validate the internal job secret header.
 * Used by /api/internal/* endpoints to ensure only authorized callers.
 */
export function isValidJobSecret(headerValue: string | null): boolean {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret || !headerValue) return false;
  return headerValue === secret;
}
