/**
 * Open Graph metadata utilities for dynamic previews
 * Provides helpers for generating shareable links with user context
 * 
 * @module og-utils
 */

/**
 * Generate a shareable URL with user context for dynamic OG preview
 * When shared, the link will display user-specific stats in the preview
 * 
 * @param baseUrl - Base URL of the application
 * @param walletAddress - User's wallet address
 * @returns URL with user context that generates dynamic preview
 * 
 * @example
 * ```ts
 * const shareUrl = generateUserShareUrl('https://baserealms.app', '0x123...');
 * // Returns: https://baserealms.app?ref=0x123...
 * // When shared, social platforms will fetch dynamic OG metadata
 * ```
 */
export function generateUserShareUrl(
  baseUrl: string,
  walletAddress: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('ref', walletAddress);
  return url.toString();
}

/**
 * Generate OG metadata fetch URL for a user
 * 
 * @param baseUrl - Base URL of the application
 * @param identifier - User identifier (wallet address or FID)
 * @param type - Type of identifier ('wallet' or 'fid')
 * @returns API endpoint URL for fetching user metadata
 * 
 * @example
 * ```ts
 * const metadataUrl = getOgMetadataUrl('https://baserealms.app', '0x123...', 'wallet');
 * const response = await fetch(metadataUrl);
 * const { title, description, imageUrl } = await response.json();
 * ```
 */
export function getOgMetadataUrl(
  baseUrl: string,
  identifier: string,
  type: 'wallet' | 'fid' = 'wallet'
): string {
  const url = new URL(`${baseUrl}/api/og-metadata`);
  url.searchParams.set(type, identifier);
  return url.toString();
}

/**
 * Extract user reference from URL search params
 * Used to identify which user's preview should be shown
 * 
 * @param searchParams - URL search params
 * @returns User wallet address or null
 * 
 * @example
 * ```ts
 * // In a page component:
 * const searchParams = useSearchParams();
 * const userRef = extractUserReference(searchParams);
 * if (userRef) {
 *   // Fetch and display user-specific content
 * }
 * ```
 */
export function extractUserReference(
  searchParams: URLSearchParams | null
): string | null {
  if (!searchParams) return null;
  return searchParams.get('ref') || searchParams.get('wallet') || null;
}

/**
 * Default OG metadata for the application
 * Used when no user context is provided
 */
export const DEFAULT_OG_METADATA = {
  title: 'Base Realms - Card Battle Game',
  description: 'Play card battles, collect NFTs, and climb the leaderboard on Base',
  imageUrl: '/hero.png',
} as const;
