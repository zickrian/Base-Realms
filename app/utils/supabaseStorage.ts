/**
 * Helper utility for Supabase Storage URLs
 */

const SUPABASE_STORAGE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`
    : 'https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets';

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