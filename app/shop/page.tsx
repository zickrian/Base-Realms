'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { CharacterCanvas, HeaderBar } from '../components/game';
import { useWalkSound } from '../hooks/useWalkSound';

export default function ShopPage() {
  const router = useRouter();
  
  const VIEWPORT_WIDTH = 430; // Mobile viewport (matches home)
  const WORLD_WIDTH = 720; // 200 units * 3.6 px/unit = 720px (width of grassshop.svg)
  const SHOP_BUTTON_X = 54; // Left corner position (characterHalfWidth = 54px) - button appears when character is near left side
  
  // Character Movement State
  // Start character in center
  const [charPos, setCharPos] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedX = sessionStorage.getItem('shopCharacterPosX');
      if (savedX) {
        return { x: parseFloat(savedX), y: 179 };
      }
    }
    return { x: WORLD_WIDTH / 2, y: 179 };
  });

  const [direction, setDirection] = useState<'left' | 'right'>(() => {
    if (typeof window !== 'undefined') {
      const savedDir = sessionStorage.getItem('shopCharacterDirection');
      if (savedDir === 'left' || savedDir === 'right') {
        return savedDir;
      }
    }
    return 'right';
  });

  const [isMoving, setIsMoving] = useState(false);
  const [targetX, setTargetX] = useState<number | null>(null);
  const [cameraX, setCameraX] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedCameraX = sessionStorage.getItem('shopCameraX');
      if (savedCameraX) {
        return parseFloat(savedCameraX);
      }
    }
    return 0;
  });

  const characterHalfWidth = 54; // 108px / 2

  // Save character position to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('shopCharacterPosX', charPos.x.toString());
      sessionStorage.setItem('shopCameraX', cameraX.toString());
      sessionStorage.setItem('shopCharacterDirection', direction);
    }
  }, [charPos.x, cameraX, direction]);

  // Integrate walk sound
  useWalkSound(isMoving);

  // Animation loop for character movement and camera
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      // 1. Move Character
      if (targetX !== null) {
        setCharPos(prev => {
          const dx = targetX - prev.x;

          // Stop if close enough
          if (Math.abs(dx) < 2) { // 2px tolerance
            setIsMoving(false);
            setTargetX(null);
            return prev;
          }

          const speed = 3; // Pixel speed (same as home)
          const move = Math.sign(dx) * speed;
          const newX = prev.x + move;

          // Boundary check: clamp character position to world bounds
          const clampedX = Math.max(characterHalfWidth, Math.min(newX, WORLD_WIDTH - characterHalfWidth));

          // If we hit a boundary, stop movement
          if (clampedX !== newX) {
            setIsMoving(false);
            setTargetX(null);
            return { ...prev, x: clampedX };
          }

          return { ...prev, x: newX };
        });
      }

      // 2. Move Camera
      // Simple camera locking centered on character, but clamped to world bounds
      // Center of view is Viewport/2 = 215.
      // Desired Camera X = CharX - 215.
      // Clamped between 0 and (WorldWidth - ViewportWidth).
      setCameraX(_prev => {
        const desiredCamX = charPos.x - 215;
        const clampedCamX = Math.max(0, Math.min(desiredCamX, WORLD_WIDTH - VIEWPORT_WIDTH));
        // Simple clamp (same as home)
        return clampedCamX;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [targetX, charPos.x, VIEWPORT_WIDTH, WORLD_WIDTH, characterHalfWidth]);

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // Ignore clicks on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    // Get click position (handle both mouse and touch)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickScreenX = clientX - rect.left;

    // Scale factor if real screen != 430
    const scaleFactor = 430 / rect.width;
    const clickLogicalX = clickScreenX * scaleFactor;

    const worldTargetX = clickLogicalX + cameraX;

    // Clamp target to world bounds (accounting for character width)
    const clampedTargetX = Math.max(
      characterHalfWidth,
      Math.min(worldTargetX, WORLD_WIDTH - characterHalfWidth)
    );

    setTargetX(clampedTargetX);
    setDirection(clampedTargetX > charPos.x ? 'right' : 'left');
    setIsMoving(true);
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className={styles.container}>
      <HeaderBar onSettingsClick={() => setIsSettingsOpen(true)} />
      
      {/* World Container (scrolling horizontally) */}
      <div
        className={styles.worldContainer}
        style={{ transform: `translateX(${-cameraX}px)` }}
      >
          {/* Grass Container */}
          <div className={styles.grassContainer}>
            <img
              src="/building/shop/grassshop.svg"
              alt="Grass"
              className={styles.grassImage}
            />
          </div>

          {/* Building Shop */}
          <img
            src="/building/shop/buildingshop.svg"
            alt="Building Shop"
            className={styles.buildingShop}
            style={{
              width: '720px',
              height: '216px',
              position: 'absolute',
              bottom: '179px',
              left: '0',
              imageRendering: 'pixelated',
              zIndex: 15,
            } as React.CSSProperties}
          />

          {/* Character */}
          <div
            className={styles.characterContainer}
            style={{ left: `${charPos.x}px` }}
          >
            <CharacterCanvas direction={direction} isMoving={isMoving} />
          </div>
        </div>

      {/* Shop Button - Only visible when character is near left corner */}
      {Math.abs(charPos.x - SHOP_BUTTON_X) < 150 && (
        <button
          key="shop-btn-exit"
          className={styles.shopButton}
          onClick={(e) => {
            e.stopPropagation();
            router.push('/home');
          }}
        >
          <img src="/building/shop/buttonshop.svg" alt="Back to Home" />
        </button>
      )}

      {/* Click/Touch Handler */}
      <div
        className={styles.clickOverlay}
        onMouseDown={handleScreenClick}
        onTouchStart={handleScreenClick}
      />
    </div>
  );
}
