/**
 * @deprecated This file is deprecated. Use `@/lib/cuisineRegistry` instead.
 * 
 * This file is kept for backwards compatibility but will be removed in a future version.
 * Please migrate to the new cuisine registry system.
 * 
 * Cuisine normalization and helper functions
 * Handles cuisine aliases and normalization for filtering
 */

export interface CuisineOption {
  label: string;
  value: string;
  aliases: string[];
}

/**
 * Available cuisine options with their aliases
 * Easy to extend with more cuisines in the future
 */
export const CUISINE_OPTIONS: CuisineOption[] = [
  {
    label: "Indian",
    value: "indian",
    aliases: ["india", "indian"],
  },
  {
    label: "Jamaican",
    value: "jamaican",
    aliases: ["jamaica", "jamaican", "caribbean"],
  },
  {
    label: "Mexican",
    value: "mexican",
    aliases: ["mexico", "mexican"],
  },
];

/**
 * Normalizes user input to a cuisine value
 * @param input - User input string (e.g., "India", "indian", "INDIA")
 * @returns Normalized cuisine value (e.g., "indian") or null if no match
 */
export function normalizeCuisine(input: string): string | null {
  if (!input) return null;

  const normalized = input.trim().toLowerCase();

  // Check each cuisine option and its aliases
  for (const option of CUISINE_OPTIONS) {
    if (option.aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return option.value;
    }
  }

  return null;
}

/**
 * Gets the display label for a cuisine value
 * @param value - Normalized cuisine value (e.g., "indian")
 * @returns Display label (e.g., "Indian") or the value itself if not found
 */
export function cuisineLabel(value: string): string {
  const option = CUISINE_OPTIONS.find((opt) => opt.value === value);
  return option?.label || value;
}

/**
 * Gets all possible aliases for a cuisine value
 * @param value - Normalized cuisine value (e.g., "indian")
 * @returns Array of aliases or empty array if not found
 */
export function cuisineAliases(value: string): string[] {
  const option = CUISINE_OPTIONS.find((opt) => opt.value === value);
  return option?.aliases || [];
}
