'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import styles from './page.module.css';
import { CharacterCanvas, HeaderBar, SettingsMenu, ShopCardsPopup } from '../components/game';
import { useWalkSound } from '../hooks/useWalkSound';

// ABI for mint function
const MINT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

const MINT_CONTRACT_ADDRESS = "0xabab2d0A3EAF9722E3EE0840D0360c68899cB305" as const;

export default function ShopPage() {
  const router = useRouter();

  const VIEWPORT_WIDTH = 430; // Mobile viewport (matches home)
  const WORLD_WIDTH = 720; // 200 units * 3.6 px/unit = 720px (width of grassshop.svg)
  const SHOP_BUTTON_X = 54; // Left corner position (characterHalfWidth = 54px) - button appears when character is near left side
  const ATM_CENTER_X = 289.5; // ATM center position (250px left + 39.5px half width = 289.5px) - button appears when character is near ATM
  const BOX_CENTER_X = 388; // Box center position (350px left + 38px half width = 388px) - button appears when character is near box
  const CASHIER_CENTER_X = 605; // Cashier center position (560px left + 45px half width = 605px) - button appears when character is near cashier

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

  // Use ref to track character position without triggering re-renders
  const charPosRef = useRef(charPos);
  const targetXRef = useRef(targetX);
  
  // Update refs when state changes
  useEffect(() => {
    charPosRef.current = charPos;
  }, [charPos]);
  
  useEffect(() => {
    targetXRef.current = targetX;
  }, [targetX]);

  // Animation loop for character movement and camera
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      // 1. Move Character
      if (targetXRef.current !== null) {
        setCharPos(prev => {
          const dx = targetXRef.current! - prev.x;

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

      // 2. Move Camera with smooth interpolation
      // Center of view is Viewport/2 = 215.
      // Desired Camera X = CharX - 215.
      // Clamped between 0 and (WorldWidth - ViewportWidth).
      setCameraX(prev => {
        const desiredCamX = charPosRef.current.x - 215;
        const clampedCamX = Math.max(0, Math.min(desiredCamX, WORLD_WIDTH - VIEWPORT_WIDTH));
        
        // Smooth lerp for camera movement (0.15 = smooth follow, higher = faster)
        const lerpFactor = 0.15;
        const smoothCamX = prev + (clampedCamX - prev) * lerpFactor;
        
        return smoothCamX;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // Always run animation loop for smooth camera movement
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []); // Empty dependency array - animation runs continuously

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
  const [isCardsShopOpen, setIsCardsShopOpen] = useState(false);
  
  // Wagmi hooks for minting
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError, reset: resetWriteContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Reset state when user cancels transaction
  useEffect(() => {
    if (writeError) {
      const errorMsg = writeError.message || "";
      // Check if user rejected/cancelled the transaction
      if (errorMsg.includes("user rejected") || errorMsg.includes("User rejected") || 
          errorMsg.includes("User cancelled") || errorMsg.includes("user cancelled") ||
          errorMsg.includes("User denied") || errorMsg.includes("user denied") ||
          errorMsg.includes("rejected") || errorMsg.includes("cancelled")) {
        // Reset the write contract state so button can be clicked again
        resetWriteContract();
      }
    }
  }, [writeError, resetWriteContract]);

  // Reset state when transaction succeeds
  useEffect(() => {
    if (isSuccess) {
      // Transaction completed successfully, reset after a short delay
      setTimeout(() => {
        resetWriteContract();
      }, 2000);
    }
  }, [isSuccess, resetWriteContract]);

  const handleMint = () => {
    if (!isConnected || !address || isPending || isConfirming) return;

    try {
      writeContract({
        address: MINT_CONTRACT_ADDRESS,
        abi: MINT_ABI,
        functionName: 'mint',
      });
    } catch (error) {
      console.error('Minting error:', error);
      // Reset on error so button can be clicked again
      resetWriteContract();
    }
  };

  return (
    <div className={styles.container}>
      <div style={{ position: 'relative', zIndex: 999 }}>
        <HeaderBar onSettingsClick={() => setIsSettingsOpen(true)} />
      </div>

      {/* World Container (scrolling horizontally) */}
      <div
        className={styles.worldContainer}
        style={{ transform: `translate3d(${-cameraX}px, 0, 0)` }}
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

        {/* Box - Left side of ATM */}
        <img
          src="/building/shop/box.svg"
          alt="Box"
          className={styles.box}
        />

        {/* Box Button - Above box, only visible when character is near */}
        {Math.abs(charPos.x - BOX_CENTER_X) < 150 && (
          <button
            className={styles.boxButton}
            onClick={(e) => {
              e.stopPropagation();
              handleMint();
            }}
            disabled={isPending || isConfirming || !isConnected}
          >
            <img src="/building/shop/buttonshop.svg" alt="Mint" />
          </button>
        )}

        {/* ATM - Left side of pots1 */}
        <img
          src="/Assets/atm.svg"
          alt="ATM"
          className={styles.atm}
        />

        {/* ATM Button - Above ATM, only visible when character is near */}
        {Math.abs(charPos.x - ATM_CENTER_X) < 150 && (
          <button
            className={styles.atmButton}
            onClick={(e) => {
              e.stopPropagation();
              router.push('/swap?from=shop');
            }}
          >
            <img src="/building/shop/buttonshop.svg" alt="ATM" />
          </button>
        )}

        {/* Pots1 - Left side of cashier */}
        <img
          src="/decoration/pots1.svg"
          alt="Pots"
          className={styles.pots1}
        />

          {/* Cashier - Right Corner */}
          <img
            src="/building/shop/cashier.svg"
            alt="Cashier"
            className={styles.cashier}
          />

        {/* Cashier Button - Above cashier, only visible when character is near */}
        {Math.abs(charPos.x - CASHIER_CENTER_X) < 150 && (
          <button
            className={styles.cashierButton}
            onClick={(e) => {
              e.stopPropagation();
              setIsCardsShopOpen(true);
            }}
          >
            <img src="/building/shop/buttonshop.svg" alt="Cashier" />
          </button>
        )}

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

      <SettingsMenu isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ShopCardsPopup isOpen={isCardsShopOpen} onClose={() => setIsCardsShopOpen(false)} />
    </div>
  );
}
