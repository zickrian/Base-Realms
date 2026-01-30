/**
 * Helper utility for Supabase Storage URLs
 */

const SUPABASE_STORAGE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`
    : 'https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets';

/**
 * Validate if a URL is valid and accessible
 * @param url - URL to validate
 * @returns True if URL is valid format
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Check if it's a valid URL format
  try {
    new URL(url);
    return true;
  } catch {
    // Not a valid full URL, check if it's a valid path
    return url.length > 0 && !url.includes('null') && !url.includes('undefined');
  }
}

/**
 * Get full Supabase Storage URL for an asset
 * @param path - Path to the asset (e.g., 'game/icons/level-badge.png' or 'logos_demo.png')
 * @returns Full URL to the asset in Supabase Storage
 */
export function getStorageUrl(path: string): string {
  // If path is already a full URL, return it as is (prevent double URL)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${SUPABASE_STORAGE_URL}/${cleanPath}`;
}

/**
 * Get storage URL with validation and fallback
 * @param path - Path to the asset
 * @param fallback - Fallback path if primary fails validation
 * @returns Validated URL or fallback
 */
export function getValidatedStorageUrl(path: string | null | undefined, fallback: string = 'battle/human.png'): string {
  if (!isValidImageUrl(path)) {
    console.warn(`[Storage] Invalid image path "${path}", using fallback: ${fallback}`);
    return getStorageUrl(fallback);
  }
  return getStorageUrl(path as string);
}

/**
 * Get Supabase Storage URL for game icons
 * @param iconName - Name of the icon file (e.g., 'level-badge.png')
 * @returns Full URL to the icon in Supabase Storage
 */
export function getGameIconUrl(iconName: string): string {
  return getStorageUrl(`game/icons/${iconName}`);
}

/**
 * Get Supabase Storage URL for sound files
 * @param soundPath - Path to the sound file (e.g., 'sound/ambient.ogg')
 * @returns Full URL to the sound file in Supabase Storage
 */
export function getSoundUrl(soundPath: string): string {
  // If path already includes 'sound/', use as is
  // Otherwise, assume it's in the sound folder
  const cleanPath = soundPath.startsWith('sound/') 
    ? soundPath 
    : `sound/${soundPath}`;
  return getStorageUrl(cleanPath);
}

/**
 * Get character image URL based on card rarity
 * Used in battle system to display character instead of card
 * @param rarity - Card rarity ('common' | 'rare' | 'epic' | 'legendary' | 'legend')
 * @returns Full URL to the character image in Supabase Storage
 */
export function getCharacterImageUrl(rarity: string): string {
  const characterMap: Record<string, string> = {
    common: 'battle/human.png',
    rare: 'battle/knight.png',
    epic: 'battle/mage.png',
    legendary: 'battle/output-onlinegiftools.gif',
    legend: 'battle/output-onlinegiftools.gif', // Support both 'legend' and 'legendary'
  };

  const characterPath = characterMap[rarity.toLowerCase()] || characterMap.common;
  return getStorageUrl(characterPath);
}