"use client";

import React, { useState, useEffect, useCallback } from 'react';
import styles from './LoadingScreen.module.css';
import { getStorageUrl } from '../../utils/supabaseStorage';
import { useBattleStore } from '../../stores/battleStore';

interface LoadingScreenProps {
  onLoadComplete: () => void;
  playerRarity?: string | null; // Deprecated: kept for backward compatibility
}

// Default assets to preload
const DEFAULT_ASSETS_TO_PRELOAD = [
  getStorageUrl('battle/gladiator.png'),
  '/avatar/goblins.png', // Enemy sprite
];

// Loading tips
const LOADING_TIPS = [
  'Prepare for battle!',
  'Entering the colosseum...',
  'The arena is ready!',
  'Victory is near!',
];

// Max retry attempts for image loading
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

/**
 * LoadingScreen Component
 * Pixel-style loading screen with asset preloading and retry logic
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoadComplete, playerRarity: _playerRarity }) => {
  const [progress, setProgress] = useState(0);
  const [tip] = useState(() => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { playerImageUrl } = useBattleStore();

  /**
   * Load a single image with retry logic
   */
  const loadImageWithRetry = useCallback(async (url: string, attemptNum = 1): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        console.log(`[LoadingScreen] Successfully loaded: ${url}`);
        resolve(true);
      };
      
      img.onerror = async (error) => {
        console.error(`[LoadingScreen] Failed to load (attempt ${attemptNum}/${MAX_RETRY_ATTEMPTS}): ${url}`, error);
        
        if (attemptNum < MAX_RETRY_ATTEMPTS) {
          // Retry after delay
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          const success = await loadImageWithRetry(url, attemptNum + 1);
          resolve(success);
        } else {
          // Max retries reached - check if this is a critical asset
          const isCritical = url.includes('avatar') || url === playerImageUrl;
          if (isCritical) {
            console.error(`[LoadingScreen] CRITICAL: Failed to load essential asset after ${MAX_RETRY_ATTEMPTS} attempts: ${url}`);
          }
          resolve(false); // Failed but don't block
        }
      };
      
      img.src = url;
    });
  }, [playerImageUrl]);

  // Preload assets with retry and error tracking
  const preloadAssets = useCallback(async () => {
    // Build assets list with player character image from battle store
    const assetsToLoad = [...DEFAULT_ASSETS_TO_PRELOAD];

    // Add player image if available (CharForBattle image)
    // Try to recover from cache if not available
    let finalPlayerImageUrl = playerImageUrl;
    if (!finalPlayerImageUrl) {
      try {
        const cached = sessionStorage.getItem('cached_battle_image_url');
        if (cached) {
          console.log('[LoadingScreen] Recovered player image from cache:', cached);
          finalPlayerImageUrl = cached;
        }
      } catch (e) {
        console.warn('[LoadingScreen] Failed to read cached image URL:', e);
      }
    }

    if (finalPlayerImageUrl) {
      assetsToLoad.push(finalPlayerImageUrl);
    }

    console.log('[LoadingScreen] Preloading assets:', assetsToLoad);

    const totalAssets = assetsToLoad.length;
    let loadedAssets = 0;
    const failedAssets: string[] = [];

    // Load all assets with retry logic
    const loadPromises = assetsToLoad.map(async (url) => {
      const success = await loadImageWithRetry(url);
      if (!success) {
        failedAssets.push(url);
      }
      loadedAssets++;
      setProgress(Math.round((loadedAssets / totalAssets) * 100));
    });

    await Promise.all(loadPromises);

    // Check if critical assets failed
    if (failedAssets.length > 0) {
      const criticalFailed = failedAssets.some(url => 
        url.includes('avatar') || url === finalPlayerImageUrl
      );
      
      if (criticalFailed) {
        setLoadError('Some battle assets failed to load. Battle may not display correctly.');
        console.error('[LoadingScreen] Critical assets failed:', failedAssets);
      } else {
        console.warn('[LoadingScreen] Non-critical assets failed:', failedAssets);
      }
    }

    console.log('[LoadingScreen] Asset preloading complete. Failed:', failedAssets.length);
  }, [playerImageUrl, loadImageWithRetry]);

  useEffect(() => {
    let isMounted = true;
    const minDisplayTime = 1500; // Minimum 1.5 seconds display
    const startTime = Date.now();

    const loadAndTransition = async () => {
      await preloadAssets();

      // Ensure minimum display time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      setTimeout(() => {
        if (isMounted) {
          onLoadComplete();
        }
      }, remainingTime);
    };

    loadAndTransition();

    return () => {
      isMounted = false;
    };
  }, [preloadAssets, onLoadComplete]);

  return (
    <div className={styles.loadingContainer} data-testid="loading-screen">
      {/* Pixel decorations */}
      <div className={styles.pixelDecoration} />
      <div className={styles.pixelDecoration} />
      <div className={styles.pixelDecoration} />
      <div className={styles.pixelDecoration} />

      {/* Loading title */}
      <h1 className={styles.loadingTitle}>Battle Arena</h1>

      {/* Loading bar */}
      <div className={styles.loadingBarContainer}>
        <div
          className={styles.loadingBarFill}
          style={{ width: `${progress}%` }}
          data-testid="loading-bar-fill"
        />
      </div>

      {/* Loading percentage */}
      <div className={styles.loadingPercentage}>{progress}%</div>

      {/* Loading dots */}
      <div className={styles.loadingDots}>
        <div className={styles.dot} />
        <div className={styles.dot} />
        <div className={styles.dot} />
      </div>

      {/* Loading tip or error */}
      {loadError ? (
        <p className={styles.loadingError} style={{ color: '#ff6b6b' }}>{loadError}</p>
      ) : (
        <p className={styles.loadingTip}>{tip}</p>
      )}
    </div>
  );
};

export default LoadingScreen;
