"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  HeaderBar,
  StageDisplay,
  QuestMenu,
  CardRevealModal,
  SettingsMenu,
  CharacterCanvas,
  HomeDeckMenu,
  LeaderboardMenu,
  SwapMenu,
} from "../components/game";
import { useAmbientSound } from "../hooks/useAmbientSound";
import { useWalkSound } from "../hooks/useWalkSound";
import { useDailyPacks } from "../hooks/useDailyPacks";
import { prefetchLeaderboard } from "../hooks/useLeaderboard";
import { useGameStore } from "../stores/gameStore";
import { getStorageUrl } from "../utils/supabaseStorage";
import { type Rarity, FREE_PACK_CONTRACT_ADDRESS } from "../lib/blockchain/nftService";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const { isConnected, isConnecting, address } = useAccount();
  const [mounted, setMounted] = useState(false);

  const {
    isInitialized,
    isLoading: storeLoading,
    profile,
    quests,
    cardPacks,
    refreshQuests,
    refreshInventory,
    selectCard,
    refreshProfile,
  } = useGameStore();

  // CRITICAL: Ensure all critical data is loaded before rendering home
  const isFullyReady =
    isConnected &&
    isInitialized &&
    !storeLoading &&
    profile !== null &&
    Array.isArray(quests) &&
    Array.isArray(cardPacks);

  // Refs to prevent race conditions and multiple redirects
  const hasEverBeenReady = useRef(
    typeof window !== 'undefined' && sessionStorage.getItem('homeWasReady') === 'true'
  );
  const redirectAttempted = useRef(false);

  const [_activeNav, _setActiveNav] = useState<"cards" | "arena" | "market">("arena");
  const [isQuestMenuOpen, setIsQuestMenuOpen] = useState(false);
  const [isHomeDeckMenuOpen, setIsHomeDeckMenuOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMintingInProgress, setIsMintingInProgress] = useState(false);
  const [showAlreadyClaimedPopup, setShowAlreadyClaimedPopup] = useState(false);
  const [showBattleConfirmPopup, setShowBattleConfirmPopup] = useState(false);
  const [isLeaderboardMenuOpen, setIsLeaderboardMenuOpen] = useState(false);
  const [isSwapMenuOpen, setIsSwapMenuOpen] = useState(false);
  // Skip asset loading screen - preload in background instead
  const [_assetsLoaded] = useState(true);
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // World Constants
  const VIEWPORT_WIDTH = 430; // Mobile viewport
  const WORLD_WIDTH = 2500; // Extended to accommodate all buildings plus extra space to walk past seum
  const ATM_X = 250;
  const LEADERBOARD_X = 400;
  const HOME_X = 680; // Updated: shifted right with spacing after leaderboard
  const QUESTBOARD_X = 1000;
  const SHOP_X = 1380;
  const SEUM_X = 1985;
  const _SHOP_X_OLD = 1010; // Updated: shifted right

  // Character Movement State
  // Migrated from percentage (50%) to pixels (215px) relative to world start
  // y: 179px to match home/shop bottom position exactly
  // Load saved position from sessionStorage if available
  const [charPos, setCharPos] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedX = sessionStorage.getItem('characterPosX');
      if (savedX) {
        return { x: parseFloat(savedX), y: 179 };
      }
    }
    return { x: HOME_X, y: 179 };
  });
  const [cameraX, setCameraX] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedCameraX = sessionStorage.getItem('cameraX');
      if (savedCameraX) {
        return parseFloat(savedCameraX);
      }
    }
    return 0;
  });

  const [targetX, setTargetX] = useState<number | null>(null);
  const [direction, setDirection] = useState<'left' | 'right'>(() => {
    if (typeof window !== 'undefined') {
      const savedDirection = sessionStorage.getItem('characterDirection');
      if (savedDirection === 'left' || savedDirection === 'right') {
        return savedDirection;
      }
    }
    return 'right';
  });
  const [isMoving, setIsMoving] = useState(false);

  // Save character position to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('characterPosX', charPos.x.toString());
      sessionStorage.setItem('cameraX', cameraX.toString());
      sessionStorage.setItem('characterDirection', direction);
    }
  }, [charPos.x, cameraX, direction]);

  // Use ref to track character position without triggering re-renders
  const charPosRef = useRef(charPos);
  const targetXRef = useRef(targetX);
  const isMovingRef = useRef(isMoving);
  
  // Update refs when state changes
  useEffect(() => {
    charPosRef.current = charPos;
  }, [charPos]);
  
  useEffect(() => {
    targetXRef.current = targetX;
  }, [targetX]);
  
  useEffect(() => {
    isMovingRef.current = isMoving;
  }, [isMoving]);

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

          const speed = 3; // Pixel speed (approx equivalent to previous speed)
          const move = Math.sign(dx) * speed;
          const newX = prev.x + move;

          // Boundary check: clamp character position to world bounds
          // Character width is approximately 108px, so we need to account for half width
          const characterHalfWidth = 54; // Half of 108px
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

    return () => cancelAnimationFrame(animationFrameId);
  }, []); // Empty dependency array - animation runs continuously

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

    // Clamp target to world bounds (accounting for character width)
    const characterHalfWidth = 54; // Half of character width (108px)
    const clampedTargetX = Math.max(
      characterHalfWidth,
      Math.min(worldTargetX, WORLD_WIDTH - characterHalfWidth)
    );

    setTargetX(clampedTargetX);
    setDirection(clampedTargetX > charPos.x ? 'right' : 'left');
    setIsMoving(true);
  };
  const { packCount, claimPack, refetch: refetchDailyPacks } = useDailyPacks();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // This ensures React Hooks rules are followed
  useAmbientSound(isConnected);
  useWalkSound(isMoving); // Play walk sound only when character is moving

  // Preload home assets in background (non-blocking)
  useEffect(() => {
    if (typeof window !== 'undefined' && isConnected) {
      const homeAssets = [
        '/Assets/grass.svg',
        '/Assets/atm.svg',
        '/Assets/leaderboard.svg',
        '/Assets/home.svg',
        '/Assets/questboard.svg',
        '/Assets/shop.svg',
        '/Assets/seum.svg',
        '/button/buttongo.svg',
      ];
      
      // Preload in background without blocking
      homeAssets.forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    }
  }, [isConnected]);

  // Combined effect: Prefetch routes, preload assets when ready
  useEffect(() => {
    if (isFullyReady && isConnected) {
      // Prefetch routes to avoid delay on first click
      router.prefetch('/battle');

      // Prefetch leaderboard data
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

      // Check if current selected NFT is used, auto-unselect it
      if (profile?.selectedCardId && profile?.selectedCard?.used) {
        console.warn('[Home] Selected NFT has been used in battle. Auto-unselecting...');
        selectCard(address!, null)
          .then(() => refreshProfile(address!))
          .catch((err) => {
            console.error('[Home] Failed to auto-unselect used NFT:', err);
          });
      }
    }
  }, [isFullyReady, isConnected, router, profile, address, selectCard, refreshProfile]);

  // AUTO-SYNC: Check for pending inventory sync after mint
  // This ensures newly minted NFTs appear in My Deck immediately when returning from shop
  useEffect(() => {
    if (!isConnected || !address || !isInitialized) return;

    const checkPendingSync = async () => {
      try {
        const pendingSyncData = localStorage.getItem('pendingInventorySync');
        if (!pendingSyncData) return;

        const syncInfo = JSON.parse(pendingSyncData);
        
        // Verify this sync is for current wallet
        if (syncInfo.address?.toLowerCase() !== address.toLowerCase()) {
          console.log('[Home] Pending sync is for different wallet, clearing flag');
          localStorage.removeItem('pendingInventorySync');
          return;
        }

        // Check if sync is recent (within last 5 minutes)
        const age = Date.now() - syncInfo.timestamp;
        const MAX_AGE = 5 * 60 * 1000; // 5 minutes
        
        if (age > MAX_AGE) {
          console.log('[Home] Pending sync is too old, clearing flag');
          localStorage.removeItem('pendingInventorySync');
          return;
        }

        console.log('[Home] Found pending inventory sync, refreshing now...');
        console.log('[Home] Transaction:', syncInfo.transactionHash);

        // Clear flag BEFORE refreshing to prevent duplicate refreshes
        localStorage.removeItem('pendingInventorySync');

        // Refresh inventory to show new NFT
        await refreshInventory(address);
        
        // Also refresh quests in case mint completed a quest
        await refreshQuests(address);
        
        console.log('[Home] ✅ Inventory refreshed after mint - new NFT should be visible in My Deck');
        
        // Optional: Show toast notification
        setToast({
          message: "New NFT added to your deck!",
          type: "success",
          isVisible: true,
        });
        
        // Auto-hide toast after 3 seconds
        setTimeout(() => {
          setToast(prev => ({ ...prev, isVisible: false }));
        }, 3000);
      } catch (error) {
        console.error('[Home] Error processing pending sync:', error);
        // Clear flag even on error to prevent infinite loop
        localStorage.removeItem('pendingInventorySync');
      }
    };

    // Run check on mount and when address changes
    checkPendingSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, isFullyReady, refreshInventory, refreshQuests]);

  // Redirect if not connected - IMPROVED with isFullyReady check
  useEffect(() => {
    // Don't redirect while connecting or loading
    if (isConnecting || storeLoading) return;

    // If user was ever ready, don't redirect (prevents flash on navigation)
    if (hasEverBeenReady.current) return;

    // If fully ready and connected, user is good
    if (isFullyReady && isConnected) return;

    // Prevent multiple redirects
    if (redirectAttempted.current) return;

    // Wait for state to settle before redirecting
    const timer = setTimeout(() => {
      if (!isConnected || !isFullyReady) {
        // Only redirect if we haven't been ready before (prevents logout flash)
        if (!hasEverBeenReady.current) {
          redirectAttempted.current = true;
          router.replace("/");
        }
      }
    }, 500); // Increased delay for better stability

    return () => clearTimeout(timer);
  }, [isConnected, isConnecting, isFullyReady, storeLoading, router]);

  // Define handlers BEFORE conditional returns (but after hooks)
  const _handleBattle = () => { };
  const _handleBoardClick = () => {
    setIsLeaderboardMenuOpen(true);
  };
  const _handleQuestClick = () => setIsQuestMenuOpen(true);
  const _handleSwapClick = () => {
    setIsSwapMenuOpen(true);
  };

  const _handlePackClick = async () => {
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
      contractAddress: FREE_PACK_CONTRACT_ADDRESS,
    });
    setIsCardModalOpen(true);
  };

  const renderArenaView = () => (
    <>
      <HeaderBar onSettingsClick={() => setIsSettingsOpen(true)} />
      <StageDisplay />

      {/* World Container for Scrolling Content */}
      <div
        className={styles.worldContainer}
        style={{ transform: `translate3d(${-cameraX}px, 0, 0)` }}
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

        {/* ATM */}
        <img
          src="/Assets/atm.svg"
          alt="ATM"
          className={styles.atm}
        />

        {/* Go Button for ATM - Only visible when character is near ATM */}
        {Math.abs(charPos.x - ATM_X) < 150 && (
          <button
            key="go-btn-atm"
            className={styles.goButtonAtm}
            onClick={(e) => {
              e.stopPropagation();
              setIsSwapMenuOpen(true);
            }}
          >
            <img src="/button/buttongo.svg" alt="Go to Swap" />
          </button>
        )}

        {/* Leaderboard */}
        <img
          src="/Assets/leaderboard.svg"
          alt="Leaderboard"
          className={styles.leaderboard}
        />

        {/* Go Button for Leaderboard - Only visible when character is near Leaderboard */}
        {Math.abs(charPos.x - LEADERBOARD_X) < 150 && (
          <button
            key="go-btn-leaderboard"
            className={styles.goButtonLeaderboard}
            onClick={(e) => {
              e.stopPropagation();
              setIsLeaderboardMenuOpen(true);
            }}
          >
            <img src="/button/buttongo.svg" alt="Go to Leaderboard" />
          </button>
        )}

        {/* Trees Decoration - to the left/front of Home */}
        <img
          src="/Assets/trees.svg"
          alt="Trees"
          className={styles.homeTreesLeft}
        />

        {/* Small Grass Decoration - to the left/front of Home */}
        <img
          src="/decoration/smallgrass.svg"
          alt="Small Grass"
          className={styles.smallGrassLeft}
        />

        {/* Home Building */}
        {/* Positioned at HomeX (215) */}
        <img
          src="/Assets/home.svg"
          alt="Home"
          className={styles.homeBuilding}
        />

        {/* Mediumrock Decoration - to the left of barrel */}
        <img
          src="/decoration/mediumrock.svg"
          alt="Medium Rock"
          className={styles.mediumrock}
        />

        {/* Barrel Decoration - to the right/front of Home */}
        <img
          src="/decoration/barrel.svg"
          alt="Barrel"
          className={styles.barrel}
        />

        {/* Go Button for Home - Only visible when character is near home */}
        {Math.abs(charPos.x - HOME_X) < 150 && (
          <button
            key="go-btn-home"
            className={styles.goButton}
            onClick={(e) => {
              e.stopPropagation();
              setIsHomeDeckMenuOpen(true);
            }}
          >
            <img src="/button/buttongo.svg" alt="Open Deck" />
          </button>
        )}

        {/* Questboard */}
        <img
          src="/Assets/questboard.svg"
          alt="Questboard"
          className={styles.questboard}
        />

        {/* Blueberry Decoration - to the right/front of Questboard */}
        <img
          src="/decoration/blueberry.svg"
          alt="Blueberry"
          className={styles.blueberry}
        />

        {/* Go Button for Questboard - Only visible when character is near Questboard */}
        {Math.abs(charPos.x - QUESTBOARD_X) < 200 && (
          <button
            key="go-btn-questboard"
            className={styles.goButtonQuestboard}
            onClick={(e) => {
              e.stopPropagation();
              setIsQuestMenuOpen(true);
            }}
          >
            <img src="/button/buttongo.svg" alt="Open Quest Menu" />
          </button>
        )}

        {/* Shop Building */}
        <img
          src="/Assets/shop.svg"
          alt="Shop"
          className={styles.shopBuilding}
        />

        {/* Strawberry Decoration - to the right/front of Shop */}
        <img
          src="/decoration/strawberry.svg"
          alt="Strawberry"
          className={styles.strawberry}
        />

        {/* Go Button for Shop - Only visible when character is near Shop */}
        {Math.abs(charPos.x - SHOP_X) < 150 && (
          <button
            key="go-btn-shop"
            className={styles.goButtonShop}
            onClick={(e) => {
              e.stopPropagation();
              router.push('/shop');
            }}
          >
            <img src="/button/buttongo.svg" alt="Go to Shop" />
          </button>
        )}

        {/* Trees */}
        <img
          src="/Assets/trees.svg"
          alt="Trees"
          className={styles.trees}
        />

        {/* Seum */}
        <img
          src="/Assets/seum.svg"
          alt="Seum"
          className={styles.seum}
        />

        {/* Go Button for Seum (Colosseum) - Only visible when character is near Seum */}
        {Math.abs(charPos.x - SEUM_X) < 150 && (
          <button
            key="go-btn-seum"
            className={styles.goButtonSeum}
            onClick={(e) => {
              e.stopPropagation();
              console.log('Battle button clicked');
              setShowBattleConfirmPopup(true);
            }}
          >
            <img src="/button/buttongo.svg" alt="Go to Battle" />
          </button>
        )}

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

  // Redirect if not connected - all data should be ready from landing page
  useEffect(() => {
    if (mounted && !isConnected && !isConnecting) {
      console.log('[Home] Not connected, redirecting to landing...');
      router.replace('/');
    }
  }, [mounted, isConnected, isConnecting, router]);

  // Render a stable tree until client-side hydration completes
  if (!mounted) {
    return <div style={{ width: '100%', height: '100vh', background: '#000' }} />;
  }

  return (
    <div className={styles.container} onClick={handleScreenClick}>
      {renderArenaView()}

      <QuestMenu isOpen={isQuestMenuOpen} onClose={() => setIsQuestMenuOpen(false)} />
      <HomeDeckMenu isOpen={isHomeDeckMenuOpen} onClose={() => setIsHomeDeckMenuOpen(false)} />
      <LeaderboardMenu isOpen={isLeaderboardMenuOpen} onClose={() => setIsLeaderboardMenuOpen(false)} />
      <SwapMenu isOpen={isSwapMenuOpen} onClose={() => setIsSwapMenuOpen(false)} />
      <CardRevealModal
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setRevealCardData(null);
          
          // FIX #1: Only refresh if NOT currently minting
          // If minting succeeded, onMintSuccess already handled refresh
          // If minting failed, we don't want to trigger refresh that might lose data
          if (!isMintingInProgress) {
            console.log('[Home] Modal closed, refreshing data...');
            refetchDailyPacks();
            if (address) {
              refreshInventory(address);
              refreshQuests(address);
            }
          } else {
            console.log('[Home] Modal closed during minting, skipping refresh');
            // Just reset the flag, onMintSuccess/onMintError will handle it
            setIsMintingInProgress(false);
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
              console.log('[Home] Minting succeeded, processing backend operations...');
              
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
                  console.warn('[Home] Failed to record mint:', recordError);
                });

                // Update quest progress for minting NFT (non-blocking)
                fetch('/api/quests/update-progress', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-wallet-address': address,
                  },
                  body: JSON.stringify({ 
                    questType: 'mint_nft',
                    autoClaim: false // User must manually claim quest rewards
                  }),
                }).catch((questError) => {
                  console.warn('[Home] Failed to update mint_nft quest progress:', questError);
                });
              }

              // FIX #2: Remove double sync
              // refreshInventory() already calls sync-nft internally
              // Just wait for blockchain to settle, then refresh
              if (address) {
                try {
                  console.log('[Home] Waiting for blockchain to settle...');
                  // Wait for blockchain state to settle
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  console.log('[Home] Refreshing inventory (includes NFT sync)...');
                  // refreshInventory() will sync NFT from blockchain
                  await Promise.all([
                    refreshInventory(address),
                    refreshQuests(address),
                    refetchDailyPacks(), // Refresh pack count to show 0
                  ]);
                  console.log('[Home] All data refreshed successfully');
                } catch (refreshError) {
                  console.error('[Home] Failed to refresh data after mint:', refreshError);
                  // On error, still try to refresh (refreshInventory preserves old data on failure)
                  await Promise.all([
                    refreshInventory(address),
                    refreshQuests(address),
                    refetchDailyPacks(),
                  ]).catch((retryError) => {
                    console.warn('[Home] Retry refresh also failed:', retryError);
                  });
                }
              }
            } catch (error) {
              console.error('[Home] Failed to claim pack:', error);
              // Don't show error to user - card reveal should continue
              // Just refresh pack count in case of error
              if (address) {
                refetchDailyPacks().catch((refreshError) => {
                  console.warn('[Home] Failed to refresh daily packs:', refreshError);
                });
              }
            } finally {
              setIsMintingInProgress(false);
            }
          })();
        }}
        onMintError={(error) => {
          // FIX #4: Proper error handling
          console.error('[Home] Minting failed:', error);
          setIsMintingInProgress(false);
          // Don't refresh - preserve current data
          // CardRevealModal already shows error to user
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

      {/* Battle Confirmation Popup */}
      {showBattleConfirmPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowBattleConfirmPopup(false)}>
          <div className={`${styles.popupContent} bit16-container`} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.popupCloseButton}
              onClick={() => setShowBattleConfirmPopup(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className={styles.popupTitle}>BATTLE CONFIRMATION</h3>
            <p className={styles.popupDescription}>
              Are you sure you want to battle?
            </p>
            <div className={styles.popupActions}>
              <button
                className={styles.popupCancelButton}
                onClick={() => setShowBattleConfirmPopup(false)}
              >
                NO
              </button>
              <button
                className={styles.popupOkButton}
                onClick={() => {
                  setShowBattleConfirmPopup(false);
                  router.push('/battle');
                }}
              >
                YES, BATTLE!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Show loading screen while data is loading
  if (!mounted || !isFullyReady) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <div className={styles.loadingText}>Loading game data...</div>
          {!isConnected && !isConnecting && (
            <div className={styles.loadingHint}>Please connect your wallet</div>
          )}
        </div>
      </div>
    );
  }

  return renderArenaView();
}
