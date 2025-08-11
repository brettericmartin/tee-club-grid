/**
 * Convert display name to URL-friendly slug
 * "Brett Martin" -> "brettmartin"
 * "Pro Bags" -> "probags"
 * "John's Clubs" -> "johnsclubs"
 */
export function displayNameToSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ''); // Remove all non-alphanumeric characters
}

/**
 * Convert slug back to search-friendly format for database queries
 * This handles variations in how the display name might be stored
 */
export function slugToSearchPattern(slug: string): string[] {
  // Return multiple possible variations to search for
  const variations = [
    slug, // exact match (if display_name was already slugified)
    slug.replace(/([a-z])([A-Z])/g, '$1 $2'), // Add spaces before capitals
  ];
  
  // Add variation with spaces between words (best guess)
  // "brettmartin" could be "Brett Martin" or "brett martin"
  // This is a simple heuristic - in production you'd want exact slug field
  
  return variations;
}