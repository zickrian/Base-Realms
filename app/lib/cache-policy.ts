/**
 * Centralized cache policy configuration
 * Provides consistent cache headers across all API routes
 * 
 * @module cache-policy
 */

/**
 * Cache policy types
 */
export type CachePolicy = 
  | 'no-store'           // No caching at all (user-specific data)
  | 'public-short'       // Public cache, 1 min (frequently changing)
  | 'public-medium'      // Public cache, 5 mins (moderate changes)
  | 'public-long';       // Public cache, 10 mins (rarely changes)

/**
 * Cache control header configurations
 */
const CACHE_HEADERS: Record<CachePolicy, string> = {
  // User-specific data - never cache
  'no-store': 'no-store, no-cache, must-revalidate, max-age=0',
  
  // Public data with short TTL (60s cache, 120s stale-while-revalidate)
  'public-short': 'public, s-maxage=60, stale-while-revalidate=120',
  
  // Public data with medium TTL (300s = 5min cache, 600s = 10min stale)
  'public-medium': 'public, s-maxage=300, stale-while-revalidate=600',
  
  // Public data with long TTL (600s = 10min cache, 1200s = 20min stale)
  'public-long': 'public, s-maxage=600, stale-while-revalidate=1200',
};

/**
 * Get cache control header value for a given policy
 * 
 * @param policy - The cache policy to apply
 * @returns Cache-Control header value
 * 
 * @example
 * ```ts
 * // For user-specific data
 * const headers = { 'Cache-Control': getCacheHeader('no-store') };
 * 
 * // For public leaderboard
 * const headers = { 'Cache-Control': getCacheHeader('public-short') };
 * ```
 */
export function getCacheHeader(policy: CachePolicy): string {
  return CACHE_HEADERS[policy];
}

/**
 * Create Headers object with cache control
 * 
 * @param policy - The cache policy to apply
 * @param additionalHeaders - Additional headers to include
 * @returns Headers object with cache control
 * 
 * @example
 * ```ts
 * const headers = createCacheHeaders('no-store', {
 *   'Content-Type': 'application/json'
 * });
 * ```
 */
export function createCacheHeaders(
  policy: CachePolicy,
  additionalHeaders?: Record<string, string>
): HeadersInit {
  return {
    'Cache-Control': getCacheHeader(policy),
    ...additionalHeaders,
  };
}

/**
 * Route-specific cache policies for consistency
 * Maps route patterns to their appropriate cache policy
 */
export const ROUTE_CACHE_POLICIES = {
  // User-specific routes - never cache
  player: 'no-store' as const,
  inventory: 'no-store' as const,
  quests: 'no-store' as const,
  settings: 'no-store' as const,
  dailyPacks: 'no-store' as const,
  battles: 'no-store' as const,
  qris: 'no-store' as const,
  
  // Public routes - cache appropriately
  leaderboard: 'public-short' as const,      // Updates frequently
  cardPacks: 'public-medium' as const,       // Moderate updates
  stages: 'public-long' as const,            // Rarely changes
} as const;
