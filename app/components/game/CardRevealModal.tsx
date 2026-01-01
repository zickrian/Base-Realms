"use client";

import { useState, useEffect } from "react";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import { mintNFTCard, type Rarity, getBackCardImage, getFrontCardImage } from "../../lib/blockchain/nftService";
import styles from "./CardRevealModal.module.css";

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
  const [revealState, setRevealState] = useState<RevealState>("minting");
  const [isRotating, setIsRotating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [isAnimatingToInventory, setIsAnimatingToInventory] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRevealState("minting");
      setIsRotating(false);
      setIsFlipped(false);
      setIsMinting(false);
      setMintError(null);
      setIsAnimatingToInventory(false);
      
      // Auto-start minting when modal opens
      if (cardData && walletAddress) {
        handleMint();
      }
    }
  }, [isOpen, cardData?.id]); // Re-mint if cardData changes

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

  const handleMint = async () => {
    if (!cardData || !walletAddress || isMinting) return;

    setIsMinting(true);
    setMintError(null);

    try {
      const result = await mintNFTCard(cardData.contractAddress, walletAddress);
      
      if (result.success && result.transactionHash) {
        // Minting successful - show back card
        setRevealState("card2");
        onMintSuccess?.(result.transactionHash);
      } else {
        // Minting failed - stay in minting state with error
        const errorMsg = result.error || "Failed to mint NFT";
        setMintError(errorMsg);
        onMintError?.(errorMsg);
        // DON'T close modal, let user retry or cancel manually
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unexpected error during minting";
      
      // Check if user rejected/cancelled the transaction
      if (errorMsg.includes('User rejected') || errorMsg.includes('user rejected') || 
          errorMsg.includes('User denied') || errorMsg.includes('user denied')) {
        setMintError("Transaction cancelled. You can retry or close this modal.");
        onMintError?.("Transaction cancelled by user");
      } else {
        setMintError(errorMsg);
        onMintError?.(errorMsg);
      }
      // DON'T close modal, let user decide to retry or cancel
    } finally {
      setIsMinting(false);
    }
  };

  const handleCardClick = () => {
    // Only allow click if showing back card and not already rotating
    if (revealState === "card2" && !isRotating && !isFlipped) {
      setIsRotating(true);
      setRevealState("rotating");
      
      setTimeout(() => {
        setRevealState("card1");
      }, 400);
    }
  };

  const handleCloseClick = () => {
    if (revealState === "card1") {
      // Start animation to inventory
      setIsAnimatingToInventory(true);
      setRevealState("acquired");
      
      // Close modal after animation completes
      setTimeout(() => {
        onClose();
      }, 800); // Match animation duration
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && revealState !== "minting") {
      handleCloseClick();
    }
  };

  if (!isOpen) return null;

  // Back card is ALWAYS the same for all rarities
  const backCardImage = getBackCardImage();
  // Front card varies by rarity
  const frontCardImage = cardData ? getFrontCardImage(cardData.rarity) : getGameIconUrl("commoncards.png");

  return (
    <div className={styles.container} onClick={handleBackdropClick}>
      <div className={styles.cardContainer}>
        {/* Minting state */}
        {revealState === "minting" && (
          <div className={styles.mintingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.mintingText}>
              {isMinting ? "Minting your card..." : mintError ? "Minting Failed" : "Preparing..."}
            </p>
            {mintError && (
              <>
                <p className={styles.errorText}>{mintError}</p>
                <button className={styles.retryButton} onClick={handleMint}>
                  Retry Mint
                </button>
                <button className={styles.cancelButton} onClick={onClose}>
                  Cancel
                </button>
              </>
            )}
          </div>
        )}

        {/* Card reveal states */}
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
                <img
                  src={backCardImage}
                  alt="Card Back"
                  className={styles.cardImage}
                />
              </div>

              {/* Card1 - shown after rotation (front of card) */}
              <div
                className={`${styles.card} ${styles.card1} ${
                  revealState === "card1" || revealState === "acquired" ? styles.visible : styles.hidden
                }`}
              >
                <img
                  src={frontCardImage}
                  alt={cardData?.name || "Card"}
                  className={styles.cardImage}
                />
              </div>
            </div>

            {/* Click hint overlay */}
            {revealState === "card2" && !isRotating && (
              <div className={styles.clickHint}>
                <p>Click to flip</p>
              </div>
            )}
            
            {/* Close button after flip */}
            {revealState === "card1" && !isAnimatingToInventory && (
              <div className={styles.acquiredContainer}>
                <p className={styles.acquiredText}>Card Acquired!</p>
                <button 
                  className={styles.closeButton}
                  onClick={handleCloseClick}
                >
                  Add to Inventory
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
