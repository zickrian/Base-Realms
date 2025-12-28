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
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const [activeNav, setActiveNav] = useState<"cards" | "arena" | "market">(
    "arena"
  );
  const [isQuestMenuOpen, setIsQuestMenuOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize user session and prefetch data on mount
  useEffect(() => {
    if (isConnected && address) {
      // Parallel fetch: login + prefetch packs and quests
      Promise.all([
        // Login API
        fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ walletAddress: address }),
        }),
        // Prefetch card packs (no auth needed)
        fetch('/api/cards/packs').catch(() => null),
        // Prefetch quests (needs auth)
        fetch('/api/quests', {
          headers: {
            'x-wallet-address': address,
          },
        }).catch(() => null),
      ]).catch(err => {
        console.error('Failed to initialize session or prefetch:', err);
      });
    }
  }, [isConnected, address]);

  // Redirect to landing page if wallet is not connected
  useEffect(() => {
    if (!isConnecting && !isConnected) {
      router.push("/");
    }
  }, [isConnected, isConnecting, router]);

  // Show loading state while checking connection or connecting
  if (isConnecting) {
    return <LoadingState />;
  }

  // Don't render content if not connected (will redirect)
  if (!isConnected) {
    return <LoadingState />;
  }

  const handleBattle = () => {
    console.log("Battle started!");
  };

  const handleStageSelect = () => {
    console.log("Stage select opened!");
  };

  const handleQuestClick = () => {
    setIsQuestMenuOpen(true);
  };

  const handlePackClick = async () => {
    if (!address) return;
    
    // Directly open card reveal modal without database connection
    setIsCardModalOpen(true);
  };

  const handleMint = async () => {
    if (!address || !isConnected) {
      alert("Wallet tidak terhubung");
      return;
    }

    // Check if on Base Mainnet (chainId: 8453)
    if (chainId !== base.id) {
      alert("Pindah ke Base Network");
      return;
    }

    try {
      // Use wagmi writeContract - no need to request accounts, wallet already connected
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "mint",
      });
    } catch (err: any) {
      console.error("Mint error:", err);
      
      // Better error messages
      if (err.code === 4001) {
        alert("Transaksi dibatalkan");
      } else if (err.message?.includes("user rejected")) {
        alert("Transaksi ditolak");
      } else {
        alert("Mint gagal: " + (err.message || "Unknown error"));
      }
    }
  };

  // Show success message when transaction is confirmed
  useEffect(() => {
    if (isSuccess) {
      alert("NFT berhasil di-mint 🎉");
    }
  }, [isSuccess]);

  const renderArenaView = () => (
    <>
      <HeaderBar 
        onSettingsClick={() => setIsSettingsOpen(true)}
      />
      <DailyPacks 
        onQuestClick={handleQuestClick}
        onPackClick={handlePackClick}
      />
      <StageDisplay />
      <BattleSection
        onBattle={handleBattle}
        onStageSelect={handleStageSelect}
        isPvPEnabled={false}
      />
    </>
  );

  const renderCardsView = () => <CardsMenu />;

  return (
    <div className={styles.container}>
      {activeNav === "arena" ? renderArenaView() : null}
      {activeNav === "cards" ? renderCardsView() : null}
      {/* TODO: implement market view */}
      <BottomNav activeItem={activeNav} onNavigate={setActiveNav} />
      <QuestMenu isOpen={isQuestMenuOpen} onClose={() => setIsQuestMenuOpen(false)} />
      <CardRevealModal 
        isOpen={isCardModalOpen} 
        onClose={() => setIsCardModalOpen(false)}
        onMint={handleMint}
        isMinting={isPending || isConfirming}
      />
      <SettingsMenu 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
