import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const BLOCKED_PREFIXES = ["/api", "/admin", "/t", "/_next"];

const preferencesSchema = z.object({
  nfcLandingMode: z.enum(["home", "list", "custom"]),
  nfcLandingPath: z.string().nullable().optional(),
});

/**
 * GET /api/account/preferences
 * Returns the user's preference record. Creates a default if missing.
 * Auth required.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const pref = await prisma.userPreference.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        nfcLandingMode: "home",
        nfcLandingPath: "/",
      },
      update: {}, // no-op update — just return existing
    });

    return NextResponse.json({
      success: true,
      data: {
        nfcLandingMode: pref.nfcLandingMode,
        nfcLandingPath: pref.nfcLandingPath,
      },
    });
  } catch (error) {
    console.error("[Preferences GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/account/preferences
 * Update user's preference. Auth required.
 *
 * Body: { nfcLandingMode: "home"|"list"|"custom", nfcLandingPath?: string|null }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validation = preferencesSchema.safeParse(body);

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

    const { nfcLandingMode: mode, nfcLandingPath: initialPath } = validation.data;
    const nfcLandingMode = mode;
    let nfcLandingPath = initialPath;

    // Enforce path rules based on mode
    if (nfcLandingMode === "home") {
      nfcLandingPath = "/";
    } else if (nfcLandingMode === "list") {
      nfcLandingPath = "/list";
    } else if (nfcLandingMode === "custom") {
      if (!nfcLandingPath || typeof nfcLandingPath !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Custom mode requires a path",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // Must start with /
      if (!nfcLandingPath.startsWith("/")) {
        return NextResponse.json(
          {
            success: false,
            error: "Path must start with /",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // Must not start with blocked prefixes
      for (const prefix of BLOCKED_PREFIXES) {
        if (nfcLandingPath.startsWith(prefix)) {
          return NextResponse.json(
            {
              success: false,
              error: `Path cannot start with ${prefix}`,
              code: "VALIDATION_ERROR",
            },
            { status: 400 }
          );
        }
      }
    }

    const pref = await prisma.userPreference.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        nfcLandingMode,
        nfcLandingPath: nfcLandingPath ?? null,
      },
      update: {
        nfcLandingMode,
        nfcLandingPath: nfcLandingPath ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        nfcLandingMode: pref.nfcLandingMode,
        nfcLandingPath: pref.nfcLandingPath,
      },
    });
  } catch (error) {
    console.error("[Preferences POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
