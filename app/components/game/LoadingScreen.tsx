"use client";

import React, { useState, useEffect, useCallback } from 'react';
import styles from './LoadingScreen.module.css';
import { getStorageUrl } from '../../utils/supabaseStorage';

interface LoadingScreenProps {
  onLoadComplete: () => void;
}

// Assets to preload
const ASSETS_TO_PRELOAD = [
  getStorageUrl('battle/gladiator.png'),
  getStorageUrl('battle/output-onlinegiftools.gif'),
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
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoadComplete }) => {
  const [progress, setProgress] = useState(0);
  const [tip] = useState(() => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);

  // Preload assets
  const preloadAssets = useCallback(async () => {
    const totalAssets = ASSETS_TO_PRELOAD.length;
    let loadedAssets = 0;

    const loadPromises = ASSETS_TO_PRELOAD.map((url) => {
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
  }, []);

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
