import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { profileSchema, type ApiResponse } from "@/lib/zod";

/**
 * GET /api/account/profile
 * Returns the user's profile/contact info. Auth required.
 */
export async function GET(): Promise<NextResponse<ApiResponse>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        address1: true,
        address2: true,
        city: true,
        region: true,
        postalCode: true,
        country: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        address1: user.address1 || "",
        address2: user.address2 || "",
        city: user.city || "",
        region: user.region || "",
        postalCode: user.postalCode || "",
        country: user.country || "",
      },
    });
  } catch (error) {
    console.error("[Profile GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/account/profile
 * Update user's profile/contact info. Auth required.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validation = profileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Normalize empty strings to null
    const normalizeField = (value: string | undefined): string | null => {
      return value && value.trim() !== "" ? value.trim() : null;
    };

    const {
      firstName,
      lastName,
      phone,
      address1,
      address2,
      city,
      region,
      postalCode,
      country,
    } = validation.data;

    // Update user profile
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: normalizeField(firstName),
        lastName: normalizeField(lastName),
        phone: normalizeField(phone),
        address1: normalizeField(address1),
        address2: normalizeField(address2),
        city: normalizeField(city),
        region: normalizeField(region),
        postalCode: normalizeField(postalCode),
        country: normalizeField(country),
      },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        address1: true,
        address2: true,
        city: true,
        region: true,
        postalCode: true,
        country: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        address1: user.address1 || "",
        address2: user.address2 || "",
        city: user.city || "",
        region: user.region || "",
        postalCode: user.postalCode || "",
        country: user.country || "",
      },
    });
  } catch (error) {
    console.error("[Profile PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
