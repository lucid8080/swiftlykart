import { z } from "zod";

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  // Optional contact info fields
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address1: z.string().trim().max(120).optional().or(z.literal("")),
  address2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  region: z.string().trim().max(40).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().max(3).optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================
// PIN Schemas
// ============================================

export const pinSchema = z.object({
  pin: z
    .string()
    .length(4, "PIN must be exactly 4 digits")
    .regex(/^\d{4}$/, "PIN must contain only numbers"),
});

export const pinResolveSchema = z.object({
  pin: z.string().min(4).max(8),
});

export type PinInput = z.infer<typeof pinSchema>;
export type PinResolveInput = z.infer<typeof pinResolveSchema>;

// ============================================
// Device Schemas
// ============================================

export const deviceIdSchema = z.object({
  deviceId: z.string().uuid("Invalid device ID"),
});

export type DeviceIdInput = z.infer<typeof deviceIdSchema>;

// ============================================
// List Schemas
// ============================================

export const toggleItemSchema = z.object({
  groceryItemId: z.string().uuid("Invalid grocery item ID"),
  productVariantId: z.string().uuid("Invalid product variant ID").optional(),
});

export type ToggleItemInput = z.infer<typeof toggleItemSchema>;

// ============================================
// Grocery Item Schemas
// ============================================

export const groceryItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  categoryId: z.string().uuid("Invalid category ID"),
  icon: z.string().max(10).optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateGroceryItemSchema = groceryItemSchema.partial();

export type GroceryItemInput = z.infer<typeof groceryItemSchema>;
export type UpdateGroceryItemInput = z.infer<typeof updateGroceryItemSchema>;

// ============================================
// Category Schemas
// ============================================

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  sortOrder: z.number().int().optional().default(0),
});

export const updateCategorySchema = categorySchema.partial();

export type CategoryInput = z.infer<typeof categorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface CategoryWithItems {
  id: string;
  name: string;
  sortOrder: number;
  items: {
    id: string;
    name: string;
    icon: string | null;
    sortOrder: number;
  }[];
}

export interface ListWithItems {
  id: string;
  name: string;
  items: {
    id: string;
    groceryItemId: string;
    productVariantId: string | null;
    active: boolean;
    groceryItem: {
      id: string;
      name: string;
      icon: string | null;
      category: {
        id: string;
        name: string;
      };
    };
    productVariant?: {
      id: string;
      name: string;
      imageUrl: string | null;
      price: number | null;
      store: {
        id: string;
        name: string;
      };
    } | null;
  }[];
}

export interface Store {
  id: string;
  name: string;
  logo: string | null;
}

export interface ProductVariant {
  id: string;
  groceryItemId: string;
  storeId: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  store: Store;
}

// ============================================
// Identity Claim Schemas
// ============================================

export const claimSchema = z.object({
  anonVisitorId: z.string().uuid("anonVisitorId must be a valid UUID"),
  method: z.enum(["login", "signup", "manual"]).default("manual"),
});

export type ClaimInput = z.infer<typeof claimSchema>;

// ============================================
// Preferences Schemas
// ============================================

export const preferencesSchema = z.object({
  nfcLandingMode: z.enum(["home", "list", "custom"]),
  nfcLandingPath: z.string().nullable().optional(),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;

// ============================================
// Profile Schemas
// ============================================

export const profileSchema = z.object({
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address1: z.string().trim().max(120).optional().or(z.literal("")),
  address2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  region: z.string().trim().max(40).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().max(3).optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// ============================================
// Variants Batch Types
// ============================================

export interface VariantsBatchItem {
  groceryItemId: string;
  variants: {
    id: string;
    storeId: string;
    price: number | null;
    name: string;
  }[];
}

export interface VariantsBatchResponse {
  items: VariantsBatchItem[];
  stores: { id: string; name: string; logo: string | null }[];
}

// ============================================
// Price Range Types
// ============================================

export interface PriceRange {
  minTotal: number;
  maxTotal: number;
  minStoreId: string | null;
  maxStoreId: string | null;
  minStoreName: string | null;
  maxStoreName: string | null;
  coverageMode: "store_total" | "per_item_fallback";
}

// ============================================
// App Settings Schemas
// ============================================

export const appSettingsSchema = z.object({
  showPriceRange: z.boolean(),
});

export type AppSettingsInput = z.infer<typeof appSettingsSchema>;

export interface AppSettings {
  showPriceRange: boolean;
}

// ============================================
// Validation Helpers
// ============================================

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.errors.map((e) => e.message).join(", ");
  return { success: false, error: errorMessage };
}
