"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Rarity, getFrontCardImage } from "../../lib/blockchain/nftService";
import styles from "./CardRevealModal.module.css";

// ABI for mint function - same as in home/page.tsx
const MINT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

interface CardRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData?: {
    id: string;
    name: string;
    rarity: Rarity;
    imageUrl: string;
    contractAddress: string;
  };
  walletAddress?: string;
  onMintSuccess?: (transactionHash: string) => void;
  onMintError?: (error: string) => void;
}

type MintingState = "ready" | "processing" | "success" | "error";

export function CardRevealModal({ 
  isOpen, 
  onClose, 
  cardData,
  walletAddress,
  onMintSuccess,
  onMintError 
}: CardRevealModalProps) {
  const { writeContract, data: hash, isPending, error: writeError, reset: resetWriteContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [mintingState, setMintingState] = useState<MintingState>("ready");
  const [mintError, setMintError] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[CardRevealModal] Modal opened, resetting state to ready');
      setMintingState("ready");
      setMintError(null);
      setShowSuccessPopup(false);
      // Reset wagmi writeContract state to clear any previous errors
      resetWriteContract();
    }
  }, [isOpen, resetWriteContract]);

  // Handle successful mint transaction - show success popup
  useEffect(() => {
    if (isSuccess && hash && mintingState === "processing") {
      console.log('[CardRevealModal] Minting successful, showing success popup');
      setMintingState("success");
      
      // Call onMintSuccess in background without blocking UI transition
      setTimeout(() => {
        try {
          onMintSuccess?.(hash);
        } catch (error) {
          console.error('[CardRevealModal] Error in onMintSuccess callback:', error);
        }
      }, 0);
    }
  }, [isSuccess, hash, onMintSuccess, mintingState]);

  // Show success popup after minting state is set to success
  useEffect(() => {
    if (mintingState === "success" && !showSuccessPopup) {
      // Show popup after a short delay for smooth transition
      const timer = setTimeout(() => {
        setShowSuccessPopup(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [mintingState, showSuccessPopup]);

  // Handle write errors - format same as free mint in home/page.tsx
  useEffect(() => {
    // Only handle errors if we're in ready or processing state and modal is open
    if (writeError && (mintingState === "ready" || mintingState === "processing") && isOpen) {
      let errorMessage = "Minting failed. Please try again.";
      const errorMsg = writeError.message || "";
      
      if (errorMsg.includes("user rejected") || errorMsg.includes("User rejected") || 
          errorMsg.includes("User cancelled") || errorMsg.includes("user cancelled") ||
          errorMsg.includes("User denied") || errorMsg.includes("user denied") ||
          errorMsg.includes("rejected") || errorMsg.includes("cancelled")) {
        errorMessage = "Transaction cancelled by user.";
        // Set error state immediately when user cancels
        setMintError(errorMessage);
        setMintingState("error");
        onMintError?.(errorMessage);
      } else if (errorMsg && !errorMsg.includes("continue in Base Account")) {
        // Ignore "continue in Base Account" errors - these are wallet permission prompts
        // that don't indicate actual failure
        errorMessage = `Minting failed: ${errorMsg}`;
        setMintError(errorMessage);
        setMintingState("error");
        onMintError?.(errorMessage);
      }
    }
  }, [writeError, onMintError, mintingState, isOpen]);

  const handleMint = useCallback(() => {
    if (!cardData || !walletAddress || isPending || isConfirming) return;

    setMintError(null);
    setMintingState("processing");

    try {
      // Use wagmi's writeContract which is already integrated with OnchainKit
      // This will automatically use the correct chain (Base) from OnchainKitProvider
      // Mint function doesn't require parameters (same as in home/page.tsx)
      writeContract({
        address: cardData.contractAddress as `0x${string}`,
        abi: MINT_ABI,
        functionName: 'mint',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to start minting";
      console.error('Minting error:', error);
      setMintError(errorMsg);
      setMintingState("error");
      onMintError?.(errorMsg);
    }
  }, [cardData, walletAddress, isPending, isConfirming, writeContract, onMintError]);

  const handleCloseClick = () => {
    // Reset error state when closing
    setMintError(null);
    // Reset wagmi writeContract state to clear any errors for next time
    resetWriteContract();
    
    // If minting is in progress, just close - wallet will handle cancellation
    // Don't try to cancel writeContract as it's already initiated
    if (isPending || isConfirming) {
      // User is closing while transaction is pending
      // The transaction will either succeed or fail, but we'll close the modal
      // Error handling will catch user rejection
      onClose();
      return;
    }
    // Only close when user explicitly clicks close button or backdrop
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow closing if not in processing state or if transaction is not pending
    if (e.target === e.currentTarget) {
      if (mintingState === "processing" && (isPending || isConfirming)) {
        // Don't close during active minting - user should cancel in wallet
        return;
      }
      handleCloseClick();
    }
  };

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    // Close the modal after a short delay for smooth transition
    setTimeout(() => {
      handleCloseClick();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.container} onClick={handleBackdropClick}>
      <div className={styles.cardContainer}>
        {/* Minting State Container */}
        {(mintingState === "ready" || mintingState === "processing" || mintingState === "error") && (
          <div className={`${styles.mintingContainer} bit16-container`}>
            <button className={`${styles.closeButton} bit16-button has-red-background`} onClick={onClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            {/* Processing State */}
            {(mintingState === "processing" && (isPending || isConfirming)) && (
              <>
                <div className={styles.spinner}></div>
                <h3 className={styles.statusTitle}>Processing</h3>
                <p className={styles.statusMessage}>
                  Transaction is being processed. Please wait for confirmation...
                </p>
              </>
            )}

            {/* Error State */}
            {mintingState === "error" && mintError && (
              <>
                <div className={styles.errorIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.statusTitle}>Error</h3>
                <p className={styles.statusMessage}>{mintError}</p>
                <div className={styles.actionButtons}>
                  <button className={`${styles.retryButton} bit16-button has-green-background`} onClick={handleMint} disabled={isPending || isConfirming}>
                    Retry Mint
                  </button>
                  <button className={`${styles.cancelButton} bit16-button has-red-background`} onClick={onClose} style={{ marginTop: '10px' }}>
                    Close
                  </button>
                </div>
              </>
            )}

            {/* Ready State */}
            {mintingState === "ready" && !mintError && (
              <>
                <div className={styles.readyIcon}>
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.statusTitle}>Ready to Mint</h3>
                <p className={styles.statusMessage}>Click the button below to start minting your card</p>
                <div className={styles.actionButtons}>
                  <button 
                    className={`${styles.retryButton} bit16-button has-green-background`} 
                    onClick={handleMint} 
                    disabled={isPending || isConfirming || !cardData || !walletAddress}
                  >
                    {isPending || isConfirming ? 'Minting...' : 'Start Mint'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && cardData && (
          <div className={styles.successPopupOverlay} onClick={handleSuccessPopupClose}>
            <div className={`${styles.successPopupContent} bit16-container`} onClick={(e) => e.stopPropagation()}>
              <button
                className={`${styles.popupCloseButton} bit16-button has-red-background`}
                onClick={handleSuccessPopupClose}
                aria-label="Close"
              >
                ×
              </button>
              <div className={styles.successIcon}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className={styles.successTitle}>Minting Successful!</h3>
              <div className={styles.successCardInfo}>
                <div className={styles.successCardImage}>
                  <Image
                    src={cardData.imageUrl || getFrontCardImage(cardData.rarity)}
                    alt={cardData.name}
                    className={styles.cardPreviewImage}
                    width={100}
                    height={140}
                  />
                </div>
                <div className={styles.successCardDetails}>
                  <p className={styles.successCardName}>{cardData.name}</p>
                  <p className={styles.successCardRarity} style={{ color: getRarityColor(cardData.rarity) }}>
                    {cardData.rarity?.toUpperCase() || 'COMMON'}
                  </p>
                </div>
              </div>
              <p className={styles.successMessage}>
                Card has been added to your inventory!
              </p>
              <div className={styles.successActions}>
                <button className={`${styles.successCloseButton} bit16-button has-green-background`} onClick={handleSuccessPopupClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get rarity color
function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#eab308',
  };
  return colors[rarity] || colors.common;
}
