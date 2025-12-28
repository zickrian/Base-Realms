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
      ]).catch(() => {
        // Silently handle initialization errors
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
    // Battle functionality to be implemented
  };

  const handleStageSelect = () => {
    // Stage select functionality to be implemented
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
      setToast({
        message: "Wallet tidak terhubung. Silakan hubungkan wallet Anda terlebih dahulu.",
        type: "error",
        isVisible: true,
      });
      return;
    }

    // Check if on Base Mainnet (chainId: 8453)
    if (chainId !== base.id) {
      setToast({
        message: "Silakan pindah ke Base Network untuk melakukan minting.",
        type: "warning",
        isVisible: true,
      });
      return;
    }

    try {
      // Use wagmi writeContract - no need to request accounts, wallet already connected
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "mint",
      });
      
      setToast({
        message: "Transaksi sedang diproses. Mohon tunggu konfirmasi...",
        type: "info",
        isVisible: true,
      });
    } catch (err: any) {
      let errorMessage = "Mint gagal. Silakan coba lagi.";
      
      if (err.code === 4001) {
        errorMessage = "Transaksi dibatalkan oleh pengguna.";
      } else if (err.message?.includes("user rejected")) {
        errorMessage = "Transaksi ditolak oleh pengguna.";
      } else if (err.message) {
        errorMessage = `Mint gagal: ${err.message}`;
      }
      
      setToast({
        message: errorMessage,
        type: "error",
        isVisible: true,
      });
    }
  };

  // Show success message when transaction is confirmed and update quest progress
  useEffect(() => {
    if (isSuccess && address) {
      // Update quest progress for "open free cards" quest and auto-claim
      fetch('/api/quests/update-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          questType: 'open_packs',
        }),
      })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          // Show toast with quest completion and XP reward info
          if (data.questCompleted && data.xpAwarded > 0) {
            setToast({
              message: `NFT berhasil di-mint! Quest 'Open Free Cards' telah terpenuhi dan Anda mendapat ${data.xpAwarded} XP!`,
              type: "success",
              isVisible: true,
              transactionHash: hash,
            });
          } else {
            // Quest not completed yet or no XP reward
            setToast({
              message: "NFT berhasil di-mint! Quest 'Open Free Cards' progress telah diupdate.",
              type: "success",
              isVisible: true,
              transactionHash: hash,
            });
          }
        } else {
          // Fallback if quest update fails
          setToast({
            message: "NFT berhasil di-mint!",
            type: "success",
            isVisible: true,
            transactionHash: hash,
          });
        }
      })
      .catch(() => {
        // Fallback if quest update fails
        setToast({
          message: "NFT berhasil di-mint!",
          type: "success",
          isVisible: true,
          transactionHash: hash,
        });
      });
    }
  }, [isSuccess, address, hash]);

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
