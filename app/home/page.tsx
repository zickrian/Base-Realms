"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { base } from "wagmi/chains";
import {
  HeaderBar,
  DailyPacks,
  StageDisplay,
  BattleSection,
  BottomNav,
  CardsMenu,
  QuestMenu,
  CardRevealModal,
  SettingsMenu,
} from "../components/game";
import { LoadingState } from "../components/LoadingState";
import { Toast } from "../components/Toast";
import { useAmbientSound } from "../hooks/useAmbientSound";
import { useGameStore } from "../stores/gameStore";
import styles from "./page.module.css";

const CONTRACT_ADDRESS = "0x2FFb8aA5176c1da165EAB569c3e4089e84EC5816" as const;
const CONTRACT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const { isConnected, isConnecting, address } = useAccount();
  const chainId = useChainId();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
    isVisible: boolean;
    transactionHash?: string;
  }>({
    message: "",
    type: "info",
    isVisible: false,
  });

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // This ensures React Hooks rules are followed
  useAmbientSound(isConnected);

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

  // Handle successful mint
  useEffect(() => {
    if (isSuccess && address && hash) {
      Promise.all([
        fetch('/api/cards/record-mint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
          },
          body: JSON.stringify({ transactionHash: hash }),
        }).catch(() => null),
        fetch('/api/quests/update-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
          },
          body: JSON.stringify({ questType: 'open_packs', autoClaim: false }),
        }),
        fetch('/api/cards/sync-nft', {
          method: 'POST',
          headers: { 'x-wallet-address': address },
        }).catch(() => null),
      ])
        .then(async ([, questRes]) => {
          await Promise.all([
            refreshQuests(address),
            refreshInventory(address),
          ]);

          if (questRes?.ok) {
            const data = await questRes.json();
            if (data.questCompleted) {
              setToast({
                message: "NFT minted successfully! Quest 'Open Free Cards' completed. Go to Quests to claim your reward!",
                type: "success",
                isVisible: true,
                transactionHash: hash,
              });
            } else {
              setToast({
                message: "NFT minted successfully! Quest progress updated.",
                type: "success",
                isVisible: true,
                transactionHash: hash,
              });
            }
          } else {
            setToast({
              message: "NFT minted successfully!",
              type: "success",
              isVisible: true,
              transactionHash: hash,
            });
          }
        })
        .catch(() => {
          setToast({
            message: "NFT minted successfully!",
            type: "success",
            isVisible: true,
            transactionHash: hash,
          });
        });
    }
  }, [isSuccess, address, hash, refreshQuests, refreshInventory]);

  // Define handlers BEFORE conditional returns (but after hooks)
  const handleBattle = () => { };
  const handleStageSelect = () => { };
  const handleQuestClick = () => setIsQuestMenuOpen(true);
  const handlePackClick = () => setIsCardModalOpen(true);

  const handleMint = () => {
    if (!address || !isConnected) {
      setToast({
        message: "Wallet not connected. Please connect your wallet first.",
        type: "error",
        isVisible: true,
      });
      return;
    }

    if (chainId !== base.id) {
      setToast({
        message: "Please switch to Base Network to perform minting.",
        type: "warning",
        isVisible: true,
      });
      return;
    }

    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "mint",
      });

      setToast({
        message: "Transaction is being processed. Please wait for confirmation...",
        type: "info",
        isVisible: true,
      });
    } catch (err: unknown) {
      let errorMessage = "Minting failed. Please try again.";
      if (err instanceof Error) {
        if (err.message?.includes("user rejected")) {
          errorMessage = "Transaction cancelled by user.";
        } else {
          errorMessage = `Minting failed: ${err.message}`;
        }
      }
      setToast({ message: errorMessage, type: "error", isVisible: true });
    }
  };

  const renderArenaView = () => (
    <>
      <HeaderBar onSettingsClick={() => setIsSettingsOpen(true)} />
      <DailyPacks onQuestClick={handleQuestClick} onPackClick={handlePackClick} />
      <StageDisplay />
      <BattleSection onBattle={handleBattle} onStageSelect={handleStageSelect} isPvPEnabled={false} />
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
      <CardRevealModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onMint={handleMint}
        isMinting={isPending || isConfirming}
      />
      <SettingsMenu isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        transactionHash={toast.transactionHash}
        onClose={() => setToast({ ...toast, isVisible: false })}
        duration={toast.type === "success" ? 6000 : 5000}
      />
    </div>
  );
}
