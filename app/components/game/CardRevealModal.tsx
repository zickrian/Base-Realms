"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Rarity, getBackCardImage, getFrontCardImage } from "../../lib/blockchain/nftService";
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

type RevealState = "minting" | "card2" | "rotating" | "card1" | "acquired";

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
  const [revealState, setRevealState] = useState<RevealState>("minting");
  const [isRotating, setIsRotating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [isAnimatingToInventory, setIsAnimatingToInventory] = useState(false);

  const handleMint = useCallback(() => {
    if (!cardData || !walletAddress || isPending || isConfirming) return;

    setMintError(null);

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
      onMintError?.(errorMsg);
    }
  }, [cardData, walletAddress, isPending, isConfirming, writeContract, onMintError]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[CardRevealModal] Modal opened, resetting state to minting');
      setRevealState("minting");
      setIsRotating(false);
      setIsFlipped(false);
      setMintError(null);
      setIsAnimatingToInventory(false);
      // Reset wagmi writeContract state to clear any previous errors
      resetWriteContract();
      // Don't auto-start minting - let user click button to start
    }
  }, [isOpen, resetWriteContract]); // Only reset when modal opens/closes

  // Handle successful mint transaction - transition to backcard with animation
  useEffect(() => {
    if (isSuccess && hash && revealState === "minting") {
      // Immediately transition to card2 (backcard) when minting succeeds
      // This will show the backcard with animation
      console.log('[CardRevealModal] Minting successful, transitioning to card2 (backcard)');
      setRevealState("card2");
      
      // Call onMintSuccess in background without blocking UI transition
      // Use setTimeout to ensure state update happens first
      setTimeout(() => {
        try {
          onMintSuccess?.(hash);
        } catch (error) {
          console.error('[CardRevealModal] Error in onMintSuccess callback:', error);
          // Don't show error to user - card reveal should continue
        }
      }, 0);
    }
  }, [isSuccess, hash, onMintSuccess, revealState]);

  // Auto-flip to front card after showing backcard for 1 second (if user doesn't click)
  useEffect(() => {
    if (revealState === "card2" && !isRotating && !isFlipped) {
      const autoFlipTimer = setTimeout(() => {
        console.log('[CardRevealModal] Auto-flipping to front card after 1 second');
        setIsRotating(true);
        setRevealState("rotating");
        
        setTimeout(() => {
          console.log('[CardRevealModal] Auto-flip animation complete, showing front card');
          setRevealState("card1");
        }, 400);
      }, 1000); // Auto-flip after 1 second to show backcard briefly
      
      return () => clearTimeout(autoFlipTimer);
    }
  }, [revealState, isRotating, isFlipped]);

  // Handle write errors - format same as free mint in home/page.tsx
  useEffect(() => {
    // Only handle errors if we're still in minting state and modal is open
    // If already transitioned to card2, ignore errors (transaction might have succeeded)
    if (writeError && revealState === "minting" && isOpen) {
      let errorMessage = "Minting failed. Please try again.";
      const errorMsg = writeError.message || "";
      
      if (errorMsg.includes("user rejected") || errorMsg.includes("User rejected") || 
          errorMsg.includes("User cancelled") || errorMsg.includes("user cancelled") ||
          errorMsg.includes("User denied") || errorMsg.includes("user denied") ||
          errorMsg.includes("rejected") || errorMsg.includes("cancelled")) {
        errorMessage = "Transaction cancelled by user.";
        // Set error state immediately when user cancels
        setMintError(errorMessage);
        onMintError?.(errorMessage);
        // Reset pending states
        setRevealState("minting");
      } else if (errorMsg && !errorMsg.includes("continue in Base Account")) {
        // Ignore "continue in Base Account" errors - these are wallet permission prompts
        // that don't indicate actual failure
        errorMessage = `Minting failed: ${errorMsg}`;
        setMintError(errorMessage);
        onMintError?.(errorMessage);
      }
    }
  }, [writeError, onMintError, revealState, isOpen]);

  // Reset rotation class after animation completes
  useEffect(() => {
    if (revealState === "card1" && isRotating) {
      const timer = setTimeout(() => {
        setIsRotating(false);
        setIsFlipped(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [revealState, isRotating]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent backdrop click from closing modal when clicking on card
    e.stopPropagation();
    
    // Only allow click if showing back card and not already rotating
    if (revealState === "card2" && !isRotating && !isFlipped) {
      console.log('[CardRevealModal] Card clicked, starting flip animation from backcard to front');
      setIsRotating(true);
      setRevealState("rotating");
      
      setTimeout(() => {
        console.log('[CardRevealModal] Flip animation complete, showing front card');
        setRevealState("card1");
      }, 400);
    }
  };

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
    // Don't auto-close after flip
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow closing if not in minting state or if transaction is not pending
    if (e.target === e.currentTarget) {
      if (revealState === "minting" && (isPending || isConfirming)) {
        // Don't close during active minting - user should cancel in wallet
        return;
      }
      handleCloseClick();
    }
  };

  if (!isOpen) return null;

  // Back card is ALWAYS the same for all rarities
  const backCardImage = getBackCardImage();
  // Front card varies by rarity - use common as fallback if no cardData
  const frontCardImage = cardData ? getFrontCardImage(cardData.rarity) : getFrontCardImage('common');

  return (
    <div className={styles.container} onClick={handleBackdropClick}>
      <div className={styles.cardContainer}>
        {/* Minting state - Standard display for processing, success, failed */}
        {revealState === "minting" && (
          <div className={`${styles.mintingContainer} bit16-container`}>
            <button className={`${styles.closeButton} bit16-button has-red-background`} onClick={onClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            {isPending || isConfirming ? (
              <>
                <div className={styles.spinner}></div>
                <h3 className={styles.statusTitle}>Processing</h3>
                <p className={styles.statusMessage}>
                  Transaction is being processed. Please wait for confirmation...
                </p>
              </>
            ) : mintError ? (
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
            ) : (
              <>
                <div className={styles.spinner}></div>
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

        {/* Card reveal states - Show backcard (card2) when minting succeeds */}
        {(revealState === "card2" || revealState === "rotating" || revealState === "card1" || revealState === "acquired") && (
          <>
            <div
              className={`${styles.cardWrapper} ${
                isRotating ? styles.rotating : ""
              } ${isFlipped ? styles.flipped : ""} ${
                isAnimatingToInventory ? styles.animateToInventory : ""
              }`}
              onClick={handleCardClick}
              style={{ cursor: isFlipped ? 'default' : 'pointer' }}
            >
              {/* Card2 - shown first (back of card) */}
              <div
                className={`${styles.card} ${styles.card2} ${
                  revealState === "card2" || revealState === "rotating"
                    ? styles.visible
                    : styles.hidden
                }`}
              >
                <Image
                  src={backCardImage}
                  alt="Card Back"
                  className={styles.cardImage}
                  width={400}
                  height={600}
                  unoptimized
                />
              </div>

              {/* Card1 - shown after rotation (front of card) */}
              <div
                className={`${styles.card} ${styles.card1} ${
                  revealState === "card1" || revealState === "acquired" ? styles.visible : styles.hidden
                }`}
              >
                <Image
                  src={frontCardImage}
                  alt={cardData?.name || "Card"}
                  className={styles.cardImage}
                  width={400}
                  height={600}
                  unoptimized
                />
              </div>
            </div>

            {/* Click hint overlay */}
            {revealState === "card2" && !isRotating && (
              <div className={styles.clickHint}>
                <p>Click to flip</p>
              </div>
            )}
            
            {/* Success message when card is revealed */}
            {revealState === "card1" && !isAnimatingToInventory && !isRotating && (
              <div className={styles.successMessage}>
                <p>Berhasil!</p>
              </div>
            )}
            

          </>
        )}
      </div>
    </div>
  );
}
