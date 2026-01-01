"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  HeaderBar,
  DailyPacks,
  StageDisplay,
  BattleSection,
  BottomNav,
  CardsMenu,
  QuestMenu,
  SwapMenu,
  CardRevealModal,
  SettingsMenu,
} from "../components/game";
import { LoadingState } from "../components/LoadingState";
import { useAmbientSound } from "../hooks/useAmbientSound";
import { useDailyPacks } from "../hooks/useDailyPacks";
import { useGameStore } from "../stores/gameStore";
import { getStorageUrl } from "../utils/supabaseStorage";
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
  const [isSwapMenuOpen, setIsSwapMenuOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMintingInProgress, setIsMintingInProgress] = useState(false);
  const [showAlreadyClaimedPopup, setShowAlreadyClaimedPopup] = useState(false);
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

  const { packCount, claimPack, refetch: refetchDailyPacks } = useDailyPacks();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // This ensures React Hooks rules are followed
  useAmbientSound(isConnected);

  // Prefetch battle route and preload LoadingScreen assets when page is ready
  useEffect(() => {
    if (isConnected && isInitialized && !storeLoading) {
      // Prefetch battle route to avoid delay on first click
      router.prefetch('/battle');
      
      // Preload LoadingScreen assets in background (same as LoadingScreen.tsx)
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

  // Track when user has been fully ready (prevents unnecessary redirects on state flickers)
  useEffect(() => {
    if (isConnected && isInitialized && !storeLoading) {
      hasEverBeenReady.current = true;
    }
  }, [isConnected, isInitialized, storeLoading]);

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
  const handleStageSelect = () => { };
  const handleQuestClick = () => setIsQuestMenuOpen(true);
  const handleSwapClick = () => setIsSwapMenuOpen(true);
  
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

    // Always fetch fresh pack count before checking
    // This ensures we have the latest data after mint
    let freshPackCount = packCount;
    try {
      await refetchDailyPacks();
      // Get fresh pack count after refetch
      // We need to fetch directly to get the latest value
      const response = await fetch('/api/daily-packs', {
        headers: {
          'x-wallet-address': address,
        },
      });
      if (response.ok) {
        const data = await response.json();
        freshPackCount = data.packCount || 0;
      }
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
      <BattleSection onBattle={handleBattle} onStageSelect={handleStageSelect} onSwapClick={handleSwapClick} isSwapEnabled={false} />
    </>
  );

  const renderCardsView = () => <CardsMenu />;

  // NOW conditional returns are safe - all hooks have been called
  // Show loading while connecting, loading store, or not yet initialized
  // BUT if user has ever been ready, don't show loading (prevents flash on state flickers)
  const shouldShowLoading = !hasEverBeenReady.current &&
    (isConnecting || storeLoading || !isInitialized || !isConnected);

  if (shouldShowLoading) {
    return <LoadingState />;
  }

  return (
    <div className={styles.container}>
      {activeNav === "arena" && renderArenaView()}
      {activeNav === "cards" && renderCardsView()}
      <BottomNav activeItem={activeNav} onNavigate={setActiveNav} />
      <QuestMenu isOpen={isQuestMenuOpen} onClose={() => setIsQuestMenuOpen(false)} />
      <SwapMenu isOpen={isSwapMenuOpen} onClose={() => setIsSwapMenuOpen(false)} />
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
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
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
