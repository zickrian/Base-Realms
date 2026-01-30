/**
 * Battle Image Utility
 * 
 * Manages battle character images from Supabase Storage (CharForBattle bucket).
 * Maps NFT token_id to transparent character images optimized for battle rendering.
 * 
 * Image Source Split:
 * - Inventory (My Deck): Uses IPFS metadata images (with backgrounds)
 * - Battle (Arena): Uses CharForBattle/{token_id}.png (transparent, optimized)
 */

const SUPABASE_STORAGE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`
    : 'https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets';

/**
 * Get battle character image URL from CharForBattle storage bucket
 * 
 * @param tokenId - NFT token ID (1-1000)
 * @returns Full URL to CharForBattle/{tokenId}.png in Supabase Storage
 * 
 * @example
 * ```ts
 * // User owns "Base Realms #5"
 * const imageUrl = getBattleImageUrl(5);
 * // Returns: https://.../storage/v1/object/public/assets/CharForBattle/5.png
 * ```
 */
export function getBattleImageUrl(tokenId: number | null | undefined): string {
  // Validate token_id
  if (tokenId === null || tokenId === undefined) {
    console.warn('[Battle Image] Invalid token_id:', tokenId);
    // Return fallback placeholder image
    return `${SUPABASE_STORAGE_URL}/game/icons/backcards.png`;
  }

  // Ensure token_id is within valid range
  if (tokenId < 1 || tokenId > 1000) {
    console.warn('[Battle Image] Token ID out of range (1-1000):', tokenId);
    return `${SUPABASE_STORAGE_URL}/game/icons/backcards.png`;
  }

  return `${SUPABASE_STORAGE_URL}/CharForBattle/${tokenId}.png`;
}

/**
 * Type guard to check if a card has a valid token_id for battle
 * 
 * @param card - Card object with optional token_id
 * @returns true if card has valid token_id
 */
export function hasValidTokenId(card: { token_id?: number | null }): card is { token_id: number } {
  return (
    card.token_id !== null && 
    card.token_id !== undefined && 
    card.token_id >= 1 && 
    card.token_id <= 1000
  );
}

/**
 * Preload battle image to avoid loading flicker in arena
 * 
 * @param tokenId - NFT token ID
 * @returns Promise that resolves when image is loaded
 */
export async function preloadBattleImage(tokenId: number): Promise<void> {
  const imageUrl = getBattleImageUrl(tokenId);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      console.error('[Battle Image] Failed to preload:', imageUrl);
      reject(new Error(`Failed to preload battle image for token_id: ${tokenId}`));
    };
    img.src = imageUrl;
  });
}
