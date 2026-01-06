"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  HeaderBar,
  DailyPacks,
  StageDisplay,
  CardsMenu,
  QuestMenu,
  CardRevealModal,
  SettingsMenu,
  CharacterCanvas,
} from "../components/game";
import { HomeLoadingScreen } from "../components/HomeLoadingScreen";
import { LoadingState } from "../components/LoadingState";
import { useAmbientSound } from "../hooks/useAmbientSound";
import { useWalkSound } from "../hooks/useWalkSound";
import { useDailyPacks } from "../hooks/useDailyPacks";
import { useGameStore } from "../stores/gameStore";
import { getStorageUrl } from "../utils/supabaseStorage";
import { prefetchLeaderboard } from "../hooks/useLeaderboard";
import type { Rarity } from "../lib/blockchain/nftService";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const { isConnected, isConnecting, address } = useAccount();

  const {
    isInitialized,
    isLoading: storeLoading,
    refreshQuests,
    refreshInventory,
  } = useGameStore();

  // Refs to prevent race conditions and multiple redirects
  const hasEverBeenReady = useRef(false);
  const redirectAttempted = useRef(false);

  const [activeNav, setActiveNav] = useState<"cards" | "arena" | "market">("arena");
  const [isQuestMenuOpen, setIsQuestMenuOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMintingInProgress, setIsMintingInProgress] = useState(false);
  const [showAlreadyClaimedPopup, setShowAlreadyClaimedPopup] = useState(false);
  // Check if assets were already loaded in this session
  const [assetsLoaded, setAssetsLoaded] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('homeAssetsLoaded') === 'true';
    }
    return false;
  });
  const [revealCardData, setRevealCardData] = useState<{
    id: string;
    name: string;
    rarity: Rarity;
    imageUrl: string;
    contractAddress: string;
  } | null>(null);
  const [_toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
    isVisible: boolean;
    transactionHash?: string;
  }>({
    message: "",
    type: "info",
    isVisible: false,
  });

  // World Constants
  const VIEWPORT_WIDTH = 430; // Mobile viewport
  const WORLD_WIDTH = 860; // 2x screens
  const HOME_X = 215; // Center of screen 1
  const SHOP_X = 545; // Center-ish of screen 2 shift

  // Character Movement State
  // Migrated from percentage (50%) to pixels (215px) relative to world start
  // y: 179px to match home/shop bottom position exactly
  const [charPos, setCharPos] = useState({ x: HOME_X, y: 179 });
  const [cameraX, setCameraX] = useState(0);

  const [targetX, setTargetX] = useState<number | null>(null);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isMoving, setIsMoving] = useState(false);

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

          const speed = 3; // Pixel speed (approx equivalent to previous speed)
          const move = Math.sign(dx) * speed;

          return { ...prev, x: prev.x + move };
        });
      }

      // 2. Move Camera
      // Logic: If character goes past right side of first screen (e.g. > 300px), 
      // camera starts following to reveal right side.
      // Offset = CharX - CenterOffset? 
      // User said: "approaching right... camera shifts"

      // Simple camera locking centered on character, but clamped to world bounds
      // Center of view is Viewport/2 = 215.
      // Desired Camera X = CharX - 215.
      // Clanped between 0 and (WorldWidth - ViewportWidth).

      setCameraX(prev => {
        const desiredCamX = charPos.x - 215;
        const clampedCamX = Math.max(0, Math.min(desiredCamX, WORLD_WIDTH - VIEWPORT_WIDTH));
        // Smooth lerp could be added, but simple clamp is robust
        return clampedCamX;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // Always run loop to update camera even if not moving target (though mostly needed when moving)
    // Optimization: only run if moving or camera needs update? 
    // To be safe for smooth interactions, run if moving or if camera mismatch.
    if (isMoving) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isMoving, targetX, charPos.x]);

  // Handle screen click for movement
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const clickScreenX = e.clientX - rect.left;

    // Convert screen click to world click
    // WorldX = ScreenX + CameraX
    // The previous logic used percentages of container width. 
    // Container width is actual screen width (e.g. might be < 430 on small phones).
    // We need to map the visual click to our logical 430px coordinate system.

    // Scale factor if real screen != 430
    // Assuming design is fixed 430 max width.
    // If rect.width is smaller, we scale? 
    // Let's assume 1:1 for simplicity if rect.width is approx 430.
    // If responsive, we should scale: (clickScreenX / rect.width) * 430

    const scaleFactor = 430 / rect.width;
    const clickLogicalX = clickScreenX * scaleFactor;

    const worldTargetX = clickLogicalX + cameraX;

    setTargetX(worldTargetX);
    setDirection(worldTargetX > charPos.x ? 'right' : 'left');
    setIsMoving(true);
  };
  const { packCount, claimPack, refetch: refetchDailyPacks } = useDailyPacks();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // This ensures React Hooks rules are followed
  useAmbientSound(isConnected);
  useWalkSound(isMoving); // Play walk sound only when character is moving

  // Callback for when assets are loaded
  const handleAssetsLoaded = useCallback(() => {
    setAssetsLoaded(true);
    // Persist to session storage so we don't reload on navigation back
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('homeAssetsLoaded', 'true');
    }
  }, []);

  // Combined effect: Prefetch routes, preload assets, and track ready state
  useEffect(() => {
    if (isConnected && isInitialized && !storeLoading) {
      // Track ready state
      hasEverBeenReady.current = true;

      // Prefetch routes to avoid delay on first click
      router.prefetch('/battle');
      router.prefetch('/leaderboard');
      router.prefetch('/swap');

      // Pre-fetch leaderboard data so it's ready when user clicks
      prefetchLeaderboard();

      // Preload LoadingScreen assets in background
      const loadingAssets = [
        getStorageUrl('battle/gladiator.png'),
        getStorageUrl('battle/output-onlinegiftools.gif'),
      ];

      loadingAssets.forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    }
  }, [isConnected, isInitialized, storeLoading, router]);

  // Redirect if not connected - with better protection against race conditions
  useEffect(() => {
    // Don't redirect while connecting or loading - wait for state to settle
    if (isConnecting || storeLoading) return;

    // If user was ever ready on this page, don't redirect on temporary state flickers
    if (hasEverBeenReady.current && isConnected) return;

    // If already initialized and connected, user is good to go
    if (isInitialized && isConnected) return;

    // Prevent multiple redirect attempts
    if (redirectAttempted.current) return;

    // Longer delay to let wagmi state fully settle before deciding to redirect
    const timer = setTimeout(() => {
      // Triple check after delay - only redirect if truly not ready
      if (!isConnected || !isInitialized) {
        // Only redirect if we haven't been ready before (prevents logout flash)
        if (!hasEverBeenReady.current) {
          redirectAttempted.current = true;
          router.replace("/");
        }
      }
    }, 500); // Increased delay for better stability

    return () => clearTimeout(timer);
  }, [isConnected, isConnecting, isInitialized, storeLoading, router]);

  // Define handlers BEFORE conditional returns (but after hooks)
  const handleBattle = () => { };
  const handleBoardClick = () => {
    // Navigate immediately - route is prefetched
    router.push('/leaderboard');
  };
  const handleQuestClick = () => setIsQuestMenuOpen(true);
  const handleSwapClick = () => {
    // Navigate immediately - route is prefetched
    router.push('/swap');
  };

  const handlePackClick = async () => {
    if (!address || !isConnected) {
      setToast({
        message: "Wallet not connected. Please connect your wallet first.",
        type: "error",
        isVisible: true,
      });
      return;
    }

    // Check if already minting to prevent double minting
    if (isMintingInProgress) {
      setToast({
        message: "Minting already in progress. Please wait...",
        type: "info",
        isVisible: true,
      });
      return;
    }

    // Fetch fresh pack count - refetchDailyPacks returns the updated count
    let freshPackCount = packCount;
    try {
      const result = await refetchDailyPacks();
      // Use returned value directly instead of making another API call
      freshPackCount = typeof result === 'number' ? result : packCount;
    } catch (error) {
      console.warn('Failed to refresh daily packs:', error);
    }

    // Check pack count - jangan buka modal kalau tidak ada pack
    if (freshPackCount <= 0) {
      // Show popup instead of toast for better visibility
      setShowAlreadyClaimedPopup(true);
      return;
    }

    // For daily pack, we'll use common card template
    setRevealCardData({
      id: 'daily-common',
      name: 'Common Card',
      rarity: 'common',
      imageUrl: 'https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/commoncards.png',
      contractAddress: '0x2ffb8aa5176c1da165eab569c3e4089e84ec5816',
    });
    setIsCardModalOpen(true);
  };

  const renderArenaView = () => (
    <>
      <HeaderBar onSettingsClick={() => setIsSettingsOpen(true)} />
      <DailyPacks onQuestClick={handleQuestClick} onPackClick={handlePackClick} />
      <StageDisplay />

      {/* World Container for Scrolling Content */}
      <div
        className={styles.worldContainer}
        style={{ transform: `translateX(${-cameraX}px)` }}
      >
        {/* Grass Background - Tiled/Extended */}
        <div className={styles.grassContainer}>
          <img
            src="/Assets/grass.svg"
            alt="Grass"
            className={styles.grassImage}
          />
          <img
            src="/Assets/grass.svg"
            alt="Grass"
            className={styles.grassImage}
          />
        </div>

        {/* Home Building */}
        {/* Positioned at HomeX (215) */}
        <img
          src="/Assets/home.svg"
          alt="Home"
          className={styles.homeBuilding}
        />

        {/* Shop Building */}
        <img
          src="/Assets/shop.svg"
          alt="Shop"
          className={styles.shopBuilding}
        />

        {/* Character */}
        <div
          className={styles.characterContainer}
          style={{
            left: `${charPos.x}px`,
            bottom: `${charPos.y}px`,
            transform: `translateX(-50%)`
          }}
        >
          <CharacterCanvas isMoving={isMoving} direction={direction} />
        </div>
      </div>
    </>
  );

  // NOW conditional returns are safe - all hooks have been called
  // Show loading while connecting, loading store, or not yet initialized
  // BUT if user has ever been ready, don't show loading (prevents flash on state flickers)
  const shouldShowLoading = !hasEverBeenReady.current &&
    (isConnecting || storeLoading || !isInitialized || !isConnected);

  if (shouldShowLoading) {
    return <LoadingState />;
  }

  // Skip HomeLoadingScreen if user just came from landing page (after "Ready! Entering game...")
  // If user is initialized and connected, they just completed initialization on landing page
  // Skip the asset loading screen to avoid double loading and go straight to home content
  if (!assetsLoaded) {
    // If user is already initialized and connected, they just came from landing page
    // Skip the loading screen and mark assets as loaded immediately
    if (isInitialized && !storeLoading && isConnected) {
      // Mark assets as loaded immediately without showing loading screen
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('homeAssetsLoaded', 'true');
      }
      setAssetsLoaded(true);
    } else {
      // Show asset loading screen for other cases (e.g., refresh, direct navigation)
      return <HomeLoadingScreen onLoadComplete={handleAssetsLoaded} />;
    }
  }

  return (
    <div className={styles.container} onClick={handleScreenClick}>
      {renderArenaView()}

      <QuestMenu isOpen={isQuestMenuOpen} onClose={() => setIsQuestMenuOpen(false)} />
      <CardRevealModal
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setRevealCardData(null);
          setIsMintingInProgress(false);
          // Refresh data after closing
          refetchDailyPacks();
          if (address) {
            refreshInventory(address);
            refreshQuests(address);
          }
        }}
        cardData={revealCardData || undefined}
        walletAddress={address}
        onMintSuccess={async (transactionHash) => {
          // Set minting in progress flag
          setIsMintingInProgress(true);

          // Run backend operations in background without blocking UI
          // Card reveal should continue regardless of backend operations
          (async () => {
            try {
              // Claim pack - this will:
              // 1. Update last_claimed_at to prevent another claim today
              // 2. Update quest progress for 'open_packs'
              // 3. Decrement pack_count
              await claimPack();

              // Record mint transaction (non-blocking)
              if (address) {
                fetch('/api/cards/record-mint', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-wallet-address': address,
                  },
                  body: JSON.stringify({ transactionHash }),
                }).catch((recordError) => {
                  console.warn('Failed to record mint:', recordError);
                });
              }

              // Sync NFT from blockchain (non-blocking)
              if (address) {
                fetch('/api/cards/sync-nft', {
                  method: 'POST',
                  headers: {
                    'x-wallet-address': address,
                  },
                }).then(() => {
                  // Refresh inventory and quests after sync
                  if (address) {
                    Promise.all([
                      refreshInventory(address),
                      refreshQuests(address),
                      refetchDailyPacks(), // Refresh pack count to show 0
                    ]).catch((refreshError) => {
                      console.warn('Failed to refresh data:', refreshError);
                    });
                  }
                }).catch((syncError) => {
                  console.warn('Failed to sync NFT from blockchain:', syncError);
                });
              }
            } catch (error) {
              console.error('Failed to claim pack:', error);
              // Don't show error to user - card reveal should continue
              // Just refresh pack count in case of error
              if (address) {
                refetchDailyPacks().catch((refreshError) => {
                  console.warn('Failed to refresh daily packs:', refreshError);
                });
              }
            } finally {
              setIsMintingInProgress(false);
            }
          })();
        }}
        onMintError={(_error) => {
          setIsMintingInProgress(false);
          // Don't show Toast - CardRevealModal already shows error
        }}
      />
      <SettingsMenu isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Already Claimed Popup */}
      {showAlreadyClaimedPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowAlreadyClaimedPopup(false)}>
          <div className={`${styles.popupContent} bit16-container`} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.popupCloseButton}
              onClick={() => setShowAlreadyClaimedPopup(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className={styles.popupTitle}>PACK SUDAH DI-CLAIM</h3>
            <p className={styles.popupDescription}>
              Free daily pack hanya bisa di-claim <strong>1x sehari</strong>.
            </p>
            <p className={styles.popupDescription}>
              Silakan kembali besok untuk claim pack gratis Anda!
            </p>
            <div className={styles.popupActions}>
              <button
                className={styles.popupOkButton}
                onClick={() => setShowAlreadyClaimedPopup(false)}
              >
                MENGERTI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
