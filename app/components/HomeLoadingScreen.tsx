"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Swords } from 'lucide-react';
import styles from './HomeLoadingScreen.module.css';
import { getGameIconUrl, getStorageUrl } from '../utils/supabaseStorage';

interface HomeLoadingScreenProps {
  onLoadComplete: () => void;
  minLoadTime?: number; // Minimum time to show loading (ms)
}

// Critical assets that must be loaded before showing home
const CRITICAL_ASSETS = [
  // Header icons
  getGameIconUrl('level-badge.png'),
  getGameIconUrl('ethereum.png'),
  getGameIconUrl('IDRX.png'),

  // Daily packs & quests
  getGameIconUrl('packs.png'),
  getGameIconUrl('quest-button.png'),

  // Stage display
  getGameIconUrl('awan.png'),

  // Battle section
  getGameIconUrl('stage-button.png'),
  getGameIconUrl('swords.png'),

  // Bottom nav
  getGameIconUrl('cards-icon.png'),
  getGameIconUrl('market.png'),

  // Home scene background + tiles
  getStorageUrl('background.png'),
  '/Assets/grass.svg',

  // Home buildings & decorations
  '/Assets/atm.svg',
  '/Assets/leaderboard.svg',
  '/Assets/trees.svg',
  '/Assets/home.svg',
  '/Assets/questboard.svg',
  '/Assets/shop.svg',
  '/Assets/seum.svg',
  '/decoration/smallgrass.svg',
  '/decoration/mediumrock.svg',
  '/decoration/barrel.svg',
  '/decoration/blueberry.svg',
  '/decoration/strawberry.svg',

  // Home action buttons
  '/button/buttongo.svg',

  // Character sprites (home)
  '/avatar/avatar1.svg',
  '/avatar/avatar2.svg',
  '/avatar/avatar3.svg',
  '/avatar/avatar4.svg',
];

// Optional assets to preload in background (don't block loading)
const OPTIONAL_ASSETS = [
  // Shop scene assets (smooth transition to shop)
  '/building/shop/grassshop.svg',
  '/building/shop/buildingshop.svg',
  '/building/shop/box.svg',
  '/building/shop/buttonshop.svg',
  '/building/shop/cashier.svg',
  '/decoration/pots1.svg',
];

export function HomeLoadingScreen({ onLoadComplete, minLoadTime = 800 }: HomeLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isMinTimeElapsed, setIsMinTimeElapsed] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Don't fail on error, just continue
      img.src = src;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const totalAssets = CRITICAL_ASSETS.length;

    // Start minimum time timer
    const minTimeTimer = setTimeout(() => {
      if (isMounted) {
        setIsMinTimeElapsed(true);
      }
    }, minLoadTime);

    // Load critical assets
    const loadAssets = async () => {
      let loaded = 0;

      // Load critical assets with progress tracking
      await Promise.all(
        CRITICAL_ASSETS.map(async (src) => {
          await preloadImage(src);
          loaded++;
          if (isMounted) {
            setLoadedCount(loaded);
            setProgress(Math.round((loaded / totalAssets) * 100));
          }
        })
      );

      if (isMounted) {
        setAllLoaded(true);
      }

      // Preload optional assets in background (don't wait)
      OPTIONAL_ASSETS.forEach((src) => {
        preloadImage(src);
      });
    };

    loadAssets();

    return () => {
      isMounted = false;
      clearTimeout(minTimeTimer);
    };
  }, [preloadImage, minLoadTime]);

  // Complete loading when both conditions are met
  useEffect(() => {
    if (allLoaded && isMinTimeElapsed) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        onLoadComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [allLoaded, isMinTimeElapsed, onLoadComplete]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logoContainer}>
          <Swords size={64} className={styles.logo} />
          <div className={`${styles.title} notranslate`}>LOADING</div>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={`${styles.progressText} notranslate`}>
            {progress}%
          </div>
        </div>

        <div className={`${styles.statusText} notranslate`}>
          {allLoaded ? 'Ready!' : `Loading assets... (${loadedCount}/${CRITICAL_ASSETS.length})`}
        </div>
      </div>
    </div>
  );
}
