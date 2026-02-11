import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generatePinHashes, isValidPinFormat } from "@/lib/pin";
import { pinSchema, type ApiResponse } from "@/lib/zod";

/**
 * GET /api/account/pin
 * Checks if the authenticated user's list has a PIN set
 */
export async function GET(): Promise<NextResponse<ApiResponse<{ hasPin: boolean }>>> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Get user's list
    const list = await prisma.list.findFirst({
      where: { ownerUserId: session.user.id, isArchived: false },
      select: { pinLookup: true },
    });

    const hasPin = !!list?.pinLookup;

    return NextResponse.json({ success: true, data: { hasPin } });
  } catch (error) {
    console.error("Error checking PIN:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check PIN", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/account/pin
 * Sets or updates the PIN for the authenticated user's list
 */
export async function POST(request: Request): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = pinSchema.safeParse(body);
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

    // Additional format validation
    if (!isValidPinFormat(pin)) {
      return NextResponse.json(
        { success: false, error: "PIN must be 4-8 digits", code: "INVALID_FORMAT" },
        { status: 400 }
      );
    }

    // Get user's list
    let list = await prisma.list.findFirst({
      where: { ownerUserId: session.user.id, isArchived: false },
    });

    if (!list) {
      // Create list if doesn't exist
      list = await prisma.list.create({
        data: {
          name: "My Groceries",
          ownerUserId: session.user.id,
        },
      });
    }

    // Check if PIN is already in use by another list
    const { pinLookup, pinHash } = await generatePinHashes(pin);
    
    const existingList = await prisma.list.findUnique({
      where: { pinLookup },
    });

    if (existingList && existingList.id !== list.id) {
      return NextResponse.json(
        { success: false, error: "This PIN is already in use", code: "PIN_IN_USE" },
        { status: 400 }
      );
    }

    // Update list with PIN hashes
    await prisma.list.update({
      where: { id: list.id },
      data: { pinLookup, pinHash },
    });

    return NextResponse.json({ success: true, data: { success: true } });
  } catch (error) {
    console.error("Error setting PIN:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set PIN", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/account/pin
 * Removes the PIN from the authenticated user's list
 */
export async function DELETE(): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Get user's list
    const list = await prisma.list.findFirst({
      where: { ownerUserId: session.user.id, isArchived: false },
    });

    if (!list) {
      return NextResponse.json(
        { success: false, error: "No list found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Remove PIN
    await prisma.list.update({
      where: { id: list.id },
      data: { pinLookup: null, pinHash: null },
    });

    return NextResponse.json({ success: true, data: { success: true } });
  } catch (error) {
    console.error("Error removing PIN:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove PIN", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
