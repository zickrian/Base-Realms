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
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY EARLY RETURNS
  // This ensures consistent hook order across renders
  
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

  // Play ambient sound only on home page (when connected)
  useAmbientSound(isConnected);

  // Initialize user session and prefetch data on mount
  useEffect(() => {
    if (isConnected && address) {
      // Parallel fetch: login + prefetch packs, quests, and sync NFT inventory
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
        // Prefetch quests (needs auth) - cache will be used by useQuests hook
        fetch('/api/quests', {
          headers: {
            'x-wallet-address': address,
          },
        }).catch(() => null),
        // Sync NFT from blockchain to database and fetch inventory
        // This ensures NFT cards are synced when wallet connects
        fetch('/api/cards/sync-nft', {
          method: 'POST',
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
        message: "Wallet not connected. Please connect your wallet first.",
        type: "error",
        isVisible: true,
      });
      return;
    }

    // Check if on Base Mainnet (chainId: 8453)
    if (chainId !== base.id) {
      setToast({
        message: "Please switch to Base Network to perform minting.",
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
        message: "Transaction is being processed. Please wait for confirmation...",
        type: "info",
        isVisible: true,
      });
    } catch (err: any) {
      let errorMessage = "Minting failed. Please try again.";
      
      if (err.code === 4001) {
        errorMessage = "Transaction cancelled by user.";
      } else if (err.message?.includes("user rejected")) {
        errorMessage = "Transaction rejected by user.";
      } else if (err.message) {
        errorMessage = `Minting failed: ${err.message}`;
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
    if (isSuccess && address && hash) {
      // Record mint transaction to database, update quest progress, and sync NFT
      Promise.all([
        // Record mint transaction to user_purchases
        fetch('/api/cards/record-mint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
          },
          body: JSON.stringify({
            transactionHash: hash,
          }),
        }).catch((err) => {
          console.error('Failed to record mint transaction:', err);
          return null;
        }),
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
        }),
        // Sync NFT from blockchain to database (includes new minted NFT)
        fetch('/api/cards/sync-nft', {
          method: 'POST',
          headers: {
            'x-wallet-address': address,
          },
        }).catch(() => null),
        // Immediately refetch quests for instant UI update
        fetch('/api/quests', {
          headers: {
            'x-wallet-address': address,
          },
        }).catch(() => null),
      ])
      .then(async ([mintRecordResponse, questProgressResponse, ...rest]) => {
        // Trigger custom event for hooks to refetch
        window.dispatchEvent(new CustomEvent('refresh-quests-inventory'));
        
        // Check if mint was recorded successfully
        if (mintRecordResponse && mintRecordResponse.ok) {
          console.log('Mint transaction recorded to database');
        } else {
          console.warn('Failed to record mint transaction to database');
        }
        
        if (questProgressResponse && questProgressResponse.ok) {
          const data = await questProgressResponse.json();
          // Show toast with quest completion and XP reward info
          if (data.questCompleted && data.xpAwarded > 0) {
            setToast({
              message: `NFT minted successfully! Quest 'Open Free Cards' completed and you received ${data.xpAwarded} XP!`,
              type: "success",
              isVisible: true,
              transactionHash: hash, // Use actual transaction hash from minting
            });
          } else {
            // Quest not completed yet or no XP reward
            setToast({
              message: "NFT minted successfully! Quest 'Open Free Cards' progress updated.",
              type: "success",
              isVisible: true,
              transactionHash: hash, // Use actual transaction hash from minting
            });
          }
        } else {
          // Fallback if quest update fails
          setToast({
            message: "NFT minted successfully!",
            type: "success",
            isVisible: true,
            transactionHash: hash, // Use actual transaction hash from minting
          });
        }
      })
      .catch(() => {
        // Trigger refresh even if update fails
        window.dispatchEvent(new CustomEvent('refresh-quests-inventory'));
        // Fallback if quest update fails
        setToast({
          message: "NFT minted successfully!",
          type: "success",
          isVisible: true,
          transactionHash: hash, // Use actual transaction hash from minting
        });
      });
    }
  }, [isSuccess, address, hash]);

  // Test function to view popup (development only)
  const testToast = (type: "success" | "error" | "info" | "warning") => {
    const messages = {
      success: "NFT minted successfully! Quest 'Open Free Cards' completed and you received 25 XP!",
      error: "Minting failed. Please try again.",
      warning: "Please switch to Base Network to perform minting.",
      info: "Transaction is being processed. Please wait for confirmation...",
    };
    
    setToast({
      message: messages[type],
      type: type,
      isVisible: true,
      transactionHash: type === "success" ? "0x1234567890abcdef1234567890abcdef12345678" : undefined,
    });
  };

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
      {/* Test buttons untuk development - hapus di production */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 9998,
          background: 'rgba(0,0,0,0.7)',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ color: 'white', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}>Test Toast:</div>
          <button 
            onClick={() => testToast('success')}
            style={{
              padding: '8px 12px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Success
          </button>
          <button 
            onClick={() => testToast('error')}
            style={{
              padding: '8px 12px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Error
          </button>
          <button 
            onClick={() => testToast('warning')}
            style={{
              padding: '8px 12px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Warning
          </button>
          <button 
            onClick={() => testToast('info')}
            style={{
              padding: '8px 12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Info
          </button>
        </div>
      )}
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
