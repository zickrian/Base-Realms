"use client";

import { useState, useEffect } from "react";
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
    initializeGameData,
    refreshQuests,
    refreshInventory,
  } = useGameStore();
  
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

  // Initialize game data on mount (only if not already initialized from landing page)
  // Data should already be fetched in LandingContent before redirect, but this is a fallback
  useEffect(() => {
    if (isConnected && address && !isInitialized) {
      // Only fetch if data wasn't already loaded from landing page
      // This prevents duplicate fetches
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })
        .then(() => initializeGameData(address))
        .catch(console.error);
    }
  }, [isConnected, address, isInitialized, initializeGameData]);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnecting && !isConnected) {
      router.push("/");
    }
  }, [isConnected, isConnecting, router]);

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
  const handleBattle = () => {};
  const handleStageSelect = () => {};
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
  if (isConnecting || (isConnected && !isInitialized && storeLoading)) {
    return <LoadingState />;
  }

  if (!isConnected) {
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
