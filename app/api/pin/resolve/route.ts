import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { 
  generatePinLookup, 
  verifyPin, 
  checkRateLimit, 
  getRateLimitIdentifier,
  getRemainingAttempts,
  getResetTime 
} from "@/lib/pin";
import { getServerDeviceId, setPinListCookie } from "@/lib/device-server";
import { pinResolveSchema, type ApiResponse } from "@/lib/zod";

interface PinResolveResponse {
  listId: string;
  listName: string;
  itemCount: number;
}

/**
 * POST /api/pin/resolve
 * Resolves a PIN to access a list
 */
export async function POST(request: Request): Promise<NextResponse<ApiResponse<PinResolveResponse>>> {
  try {
    const body = await request.json();

    // Validate input
    const validation = pinResolveSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error.errors[0].message, 
          code: "VALIDATION_ERROR" 
        },
        { status: 400 }
      );
    }

    const { pin } = validation.data;

    // Get identifiers for rate limiting
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0] || 
               headerStore.get("x-real-ip") || 
               "unknown";
    const deviceId = await getServerDeviceId();
    const rateLimitId = getRateLimitIdentifier(ip, deviceId);

    // Check rate limit
    if (!checkRateLimit(rateLimitId)) {
      const resetTime = getResetTime(rateLimitId);
      return NextResponse.json(
        { 
          success: false, 
          error: `Too many attempts. Try again in ${resetTime} seconds.`, 
          code: "RATE_LIMITED" 
        },
        { status: 429 }
      );
    }

    // Generate lookup hash
    const pinLookup = generatePinLookup(pin);

    // Find list by lookup hash
    const list = await prisma.list.findUnique({
      where: { pinLookup },
      include: {
        items: {
          where: { active: true },
        },
      },
    });

    if (!list) {
      const remaining = getRemainingAttempts(rateLimitId);
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid PIN. ${remaining} attempts remaining.`, 
          code: "INVALID_PIN" 
        },
        { status: 401 }
      );
    }

    // Verify bcrypt hash
    if (!list.pinHash) {
      return NextResponse.json(
        { success: false, error: "PIN not configured", code: "PIN_NOT_SET" },
        { status: 400 }
      );
    }

    const isValid = await verifyPin(pin, list.pinHash);
    if (!isValid) {
      const remaining = getRemainingAttempts(rateLimitId);
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid PIN. ${remaining} attempts remaining.`, 
          code: "INVALID_PIN" 
        },
        { status: 401 }
      );
    }

    // Set list cookie for session
    await setPinListCookie(list.id);

    return NextResponse.json({
      success: true,
      data: {
        listId: list.id,
        listName: list.name,
        itemCount: list.items.length,
      },
    });
  } catch (error) {
    console.error("Error resolving PIN:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve PIN", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
