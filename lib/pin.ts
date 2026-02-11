import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const PIN_PEPPER = process.env.PIN_PEPPER || "default-pepper-change-in-production";
const BCRYPT_ROUNDS = 12;

// Rate limiting store (in-memory, resets on server restart)
// In production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

/**
 * Generate SHA256 lookup hash for PIN
 * This is used to find the list by PIN (cannot search bcrypt hashes)
 */
export function generatePinLookup(pin: string): string {
  return createHash("sha256")
    .update(pin + PIN_PEPPER)
    .digest("hex");
}

/**
 * Generate bcrypt hash for PIN verification
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

/**
 * Verify PIN against bcrypt hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * Generate both hashes for a new PIN
 */
export async function generatePinHashes(pin: string): Promise<{
  pinLookup: string;
  pinHash: string;
}> {
  const [pinLookup, pinHash] = await Promise.all([
    Promise.resolve(generatePinLookup(pin)),
    hashPin(pin),
  ]);
  return { pinLookup, pinHash };
}

/**
 * Check rate limit for PIN attempts
 * Returns true if allowed, false if rate limited
 */
export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up expired records periodically
  if (Math.random() < 0.1) {
    cleanupRateLimitStore();
  }

  if (!record || now > record.resetTime) {
    // New window or expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Get remaining attempts for identifier
 */
export function getRemainingAttempts(identifier: string): number {
  const record = rateLimitStore.get(identifier);
  if (!record || Date.now() > record.resetTime) {
    return RATE_LIMIT_MAX_ATTEMPTS;
  }
  return Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - record.count);
}

/**
 * Get time until rate limit resets (in seconds)
 */
export function getResetTime(identifier: string): number | null {
  const record = rateLimitStore.get(identifier);
  if (!record || Date.now() > record.resetTime) {
    return null;
  }
  return Math.ceil((record.resetTime - Date.now()) / 1000);
}

/**
 * Clean up expired rate limit records
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(
  ip: string | null,
  deviceId: string | null
): string {
  // Prefer device ID for more accurate limiting
  if (deviceId) return `device:${deviceId}`;
  if (ip) return `ip:${ip}`;
  return "unknown";
}

/**
 * Validate PIN format
 */
export function isValidPinFormat(pin: string): boolean {
  // Allow 4-8 digit PINs
  return /^\d{4,8}$/.test(pin);
}

/**
 * Generate a random PIN
 */
export function generateRandomPin(length: number = 4): string {
  const digits = "0123456789";
  let pin = "";
  for (let i = 0; i < length; i++) {
    pin += digits[Math.floor(Math.random() * digits.length)];
  }
  return pin;
}
