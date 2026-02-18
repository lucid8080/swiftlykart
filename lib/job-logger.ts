/**
 * Structured logging utility for internal job routes.
 * Ensures consistent log format with timestamps and context.
 */

export interface JobLogContext {
  jobName: string;
  date?: string;
  [key: string]: unknown;
}

/**
 * Log the start of a job with a timestamp and context.
 */
export function logJobStart(ctx: JobLogContext): void {
  console.log(
    JSON.stringify({
      level: "info",
      event: "job_start",
      timestamp: new Date().toISOString(),
      ...ctx,
    })
  );
}

/**
 * Log the successful end of a job with a timestamp, duration, and summary.
 */
export function logJobEnd(
  ctx: JobLogContext,
  startTime: number,
  summary?: Record<string, unknown>
): void {
  const durationMs = Date.now() - startTime;
  console.log(
    JSON.stringify({
      level: "info",
      event: "job_end",
      timestamp: new Date().toISOString(),
      durationMs,
      ...ctx,
      ...(summary || {}),
    })
  );
}

/**
 * Log a job error with structured details. Never throws.
 */
export function logJobError(
  ctx: JobLogContext,
  error: unknown,
  startTime?: number
): void {
  const durationMs = startTime ? Date.now() - startTime : undefined;
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const errorStack =
    error instanceof Error ? error.stack : undefined;

  console.error(
    JSON.stringify({
      level: "error",
      event: "job_error",
      timestamp: new Date().toISOString(),
      durationMs,
      error: errorMessage,
      stack: errorStack,
      ...ctx,
    })
  );
}
