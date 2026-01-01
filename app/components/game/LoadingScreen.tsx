"use client";

import React, { useState, useEffect, useCallback } from 'react';
import styles from './LoadingScreen.module.css';
import { getStorageUrl, getCharacterImageUrl } from '../../utils/supabaseStorage';

interface LoadingScreenProps {
  onLoadComplete: () => void;
  playerRarity?: string | null;
}

// Default assets to preload
const DEFAULT_ASSETS_TO_PRELOAD = [
  getStorageUrl('battle/gladiator.png'),
  'https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/battle/Pixel%20Monster%20No%20Background.png',
];

// Loading tips
const LOADING_TIPS = [
  'Prepare for battle!',
  'Your dragon awaits...',
  'The arena is ready!',
  'Victory is near!',
];

/**
 * LoadingScreen Component
 * Pixel-style loading screen with asset preloading
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoadComplete, playerRarity }) => {
  const [progress, setProgress] = useState(0);
  const [tip] = useState(() => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);

  // Preload assets
  const preloadAssets = useCallback(async () => {
    // Get character image URL based on rarity
    const playerCharacterImageUrl = playerRarity 
      ? getCharacterImageUrl(playerRarity)
      : getCharacterImageUrl('common'); // Default to common

    // Build assets list with player character image
    const assetsToLoad = [
      ...DEFAULT_ASSETS_TO_PRELOAD,
      playerCharacterImageUrl,
    ];

    const totalAssets = assetsToLoad.length;
    let loadedAssets = 0;

    const loadPromises = assetsToLoad.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          loadedAssets++;
          setProgress(Math.round((loadedAssets / totalAssets) * 100));
          resolve();
        };
        img.onerror = () => {
          // Still count as loaded to prevent blocking
          loadedAssets++;
          setProgress(Math.round((loadedAssets / totalAssets) * 100));
          resolve();
        };
        img.src = url;
      });
    });

    await Promise.all(loadPromises);
  }, [playerRarity]);

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

      {/* Loading tip */}
      <p className={styles.loadingTip}>{tip}</p>
    </div>
  );
};

export default LoadingScreen;
