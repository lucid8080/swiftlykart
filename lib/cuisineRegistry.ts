/**
 * Cuisine Registry System
 * 
 * Data-driven registry for cuisine/country filtering.
 * To add a new cuisine, simply add an entry to CUISINE_REGISTRY.
 * 
 * Structure:
 * - value: normalized identifier (e.g., "indian")
 * - label: display name (e.g., "Indian")
 * - aliases: searchable terms (e.g., ["India", "Indian"])
 * - flags: optional metadata for future use
 */

export interface CuisineDef {
  value: string;
  label: string;
  aliases: string[];
  flags?: {
    country?: boolean;
  };
}

/**
 * Cuisine Registry
 * 
 * Add new cuisines here. The system will automatically:
 * - Search across all aliases and labels
 * - Provide autocomplete suggestions
 * - Normalize user input to cuisine values
 * 
 * Organized by region for easier maintenance.
 */
export const CUISINE_REGISTRY: CuisineDef[] = [
  // South Asia
  {
    value: "indian",
    label: "Indian",
    aliases: ["India", "Indian"],
    flags: { country: true },
  },
  {
    value: "pakistani",
    label: "Pakistani",
    aliases: ["Pakistan", "Pakistani"],
    flags: { country: true },
  },
  {
    value: "bangladeshi",
    label: "Bangladeshi",
    aliases: ["Bangladesh", "Bangladeshi"],
    flags: { country: true },
  },
  {
    value: "sri_lankan",
    label: "Sri Lankan",
    aliases: ["Sri Lanka", "Sri Lankan"],
    flags: { country: true },
  },

  // East Asia
  {
    value: "chinese",
    label: "Chinese",
    aliases: ["China", "Chinese"],
    flags: { country: true },
  },
  {
    value: "japanese",
    label: "Japanese",
    aliases: ["Japan", "Japanese"],
    flags: { country: true },
  },
  {
    value: "korean",
    label: "Korean",
    aliases: ["Korea", "Korean", "South Korea"],
    flags: { country: true },
  },

  // Southeast Asia
  {
    value: "thai",
    label: "Thai",
    aliases: ["Thailand", "Thai"],
    flags: { country: true },
  },
  {
    value: "vietnamese",
    label: "Vietnamese",
    aliases: ["Vietnam", "Vietnamese"],
    flags: { country: true },
  },
  {
    value: "filipino",
    label: "Filipino",
    aliases: ["Philippines", "Filipino", "Philippine"],
    flags: { country: true },
  },

  // Europe
  {
    value: "italian",
    label: "Italian",
    aliases: ["Italy", "Italian"],
    flags: { country: true },
  },
  {
    value: "french",
    label: "French",
    aliases: ["France", "French"],
    flags: { country: true },
  },
  {
    value: "greek",
    label: "Greek",
    aliases: ["Greece", "Greek"],
    flags: { country: true },
  },
  {
    value: "turkish",
    label: "Turkish",
    aliases: ["Turkey", "Turkish"],
    flags: { country: true },
  },

  // Middle East
  {
    value: "lebanese",
    label: "Lebanese",
    aliases: ["Lebanon", "Lebanese", "Middle Eastern"],
    flags: { country: true },
  },

  // Africa
  {
    value: "ethiopian",
    label: "Ethiopian",
    aliases: ["Ethiopia", "Ethiopian"],
    flags: { country: true },
  },
  {
    value: "nigerian",
    label: "Nigerian",
    aliases: ["Nigeria", "Nigerian"],
    flags: { country: true },
  },
  {
    value: "ghanaian",
    label: "Ghanaian",
    aliases: ["Ghana", "Ghanaian"],
    flags: { country: true },
  },

  // Americas
  {
    value: "jamaican",
    label: "Jamaican",
    aliases: ["Jamaica", "Jamaican", "Caribbean"],
    flags: { country: true },
  },
  {
    value: "haitian",
    label: "Haitian",
    aliases: ["Haiti", "Haitian"],
    flags: { country: true },
  },
  {
    value: "mexican",
    label: "Mexican",
    aliases: ["Mexico", "Mexican"],
    flags: { country: true },
  },
  {
    value: "brazilian",
    label: "Brazilian",
    aliases: ["Brazil", "Brazilian"],
    flags: { country: true },
  },
  {
    value: "peruvian",
    label: "Peruvian",
    aliases: ["Peru", "Peruvian"],
    flags: { country: true },
  },
  {
    value: "american",
    label: "American",
    aliases: ["USA", "United States", "American", "US"],
    flags: { country: true },
  },
  {
    value: "canadian",
    label: "Canadian",
    aliases: ["Canada", "Canadian"],
    flags: { country: true },
  },
];

/**
 * Normalizes user input to a cuisine value
 * 
 * @param input - User input string (e.g., "India", "indian", "INDIA")
 * @returns Normalized cuisine value (e.g., "indian") or null if no match
 * 
 * Matches against:
 * - Exact label (case-insensitive)
 * - Exact alias (case-insensitive)
 */
export function normalizeCuisine(input: string): string | null {
  if (!input) return null;

  const normalized = input.trim().toLowerCase();

  for (const cuisine of CUISINE_REGISTRY) {
    // Check label
    if (cuisine.label.toLowerCase() === normalized) {
      return cuisine.value;
    }
    // Check aliases
    if (cuisine.aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return cuisine.value;
    }
  }

  return null;
}

/**
 * Gets the display label for a cuisine value
 * 
 * @param value - Normalized cuisine value (e.g., "indian")
 * @returns Display label (e.g., "Indian") or the value itself if not found
 */
export function cuisineLabel(value: string): string {
  const cuisine = CUISINE_REGISTRY.find((c) => c.value === value);
  return cuisine?.label || value;
}

/**
 * Gets all possible aliases for a cuisine value
 * 
 * @param value - Normalized cuisine value (e.g., "indian")
 * @returns Array of aliases or empty array if not found
 */
export function cuisineAliases(value: string): string[] {
  const cuisine = CUISINE_REGISTRY.find((c) => c.value === value);
  return cuisine?.aliases || [];
}

/**
 * Search for cuisine suggestions based on user query
 * 
 * Returns up to 8 suggestions in priority order:
 * 1. Exact matches (label or alias)
 * 2. StartsWith matches (label or alias)
 * 3. Includes matches (label or alias)
 * 
 * @param query - User's search query (e.g., "jama")
 * @returns Array of CuisineDef suggestions (max 8)
 */
export function searchCuisineSuggestions(query: string): CuisineDef[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const exactMatches: CuisineDef[] = [];
  const startsWithMatches: CuisineDef[] = [];
  const includesMatches: CuisineDef[] = [];

  for (const cuisine of CUISINE_REGISTRY) {
    // Check label
    const labelLower = cuisine.label.toLowerCase();
    if (labelLower === normalizedQuery) {
      exactMatches.push(cuisine);
      continue;
    }
    if (labelLower.startsWith(normalizedQuery)) {
      startsWithMatches.push(cuisine);
      continue;
    }
    if (labelLower.includes(normalizedQuery)) {
      includesMatches.push(cuisine);
      continue;
    }

    // Check aliases
    for (const alias of cuisine.aliases) {
      const aliasLower = alias.toLowerCase();
      if (aliasLower === normalizedQuery) {
        exactMatches.push(cuisine);
        break;
      }
      if (aliasLower.startsWith(normalizedQuery)) {
        startsWithMatches.push(cuisine);
        break;
      }
      if (aliasLower.includes(normalizedQuery)) {
        includesMatches.push(cuisine);
        break;
      }
    }
  }

  // Combine results in priority order, limit to 8
  const results: CuisineDef[] = [];
  const seen = new Set<string>();

  // Add exact matches first
  for (const cuisine of exactMatches) {
    if (!seen.has(cuisine.value)) {
      results.push(cuisine);
      seen.add(cuisine.value);
      if (results.length >= 8) return results;
    }
  }

  // Add startsWith matches
  for (const cuisine of startsWithMatches) {
    if (!seen.has(cuisine.value)) {
      results.push(cuisine);
      seen.add(cuisine.value);
      if (results.length >= 8) return results;
    }
  }

  // Add includes matches
  for (const cuisine of includesMatches) {
    if (!seen.has(cuisine.value)) {
      results.push(cuisine);
      seen.add(cuisine.value);
      if (results.length >= 8) return results;
    }
  }

  return results;
}
