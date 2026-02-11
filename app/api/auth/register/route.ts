import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { registerSchema, type ApiResponse } from "@/lib/zod";

export async function POST(request: Request): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { name, email, password, firstName, lastName, phone, address1, address2, city, region, postalCode, country } = validation.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already registered", code: "EMAIL_EXISTS" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Normalize empty strings to null for optional fields
    const normalizeField = (value: string | undefined): string | null => {
      return value && value.trim() !== "" ? value.trim() : null;
    };

    // Set name from firstName+lastName if provided and name not set
    let finalName = name?.trim() || null;
    if (!finalName && firstName && firstName.trim() && lastName && lastName.trim()) {
      finalName = `${firstName.trim()} ${lastName.trim()}`.trim();
    } else if (!finalName && firstName && firstName.trim()) {
      finalName = firstName.trim();
    } else if (!finalName && lastName && lastName.trim()) {
      finalName = lastName.trim();
    }
    
    const user = await prisma.user.create({
      data: {
        name: finalName,
        email,
        password: hashedPassword,
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
    });

    // Create default list for user
    await prisma.list.create({
      data: {
        name: "My Groceries",
        ownerUserId: user.id,
      },
    });

    return NextResponse.json(
      { success: true, data: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
