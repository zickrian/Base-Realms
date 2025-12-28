"use client";

import { useState, useEffect } from "react";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import styles from "./CardRevealModal.module.css";

interface CardRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardReveal?: (cardNumber: 1 | 2) => void;
  onMint?: () => void | Promise<void>;
  isMinting?: boolean;
}

type RevealState = "card2" | "rotating" | "card1";

export function CardRevealModal({ isOpen, onClose, onCardReveal, onMint, isMinting: externalIsMinting }: CardRevealModalProps) {
  const [revealState, setRevealState] = useState<RevealState>("card2");
  const [isRotating, setIsRotating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [internalIsMinting, setInternalIsMinting] = useState(false);
  
  // Use external isMinting if provided, otherwise use internal state
  const isMinting = externalIsMinting !== undefined ? externalIsMinting : internalIsMinting;

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRevealState("card2");
      setIsRotating(false);
      setIsFlipped(false);
      setInternalIsMinting(false);
    }
  }, [isOpen]);

  // Reset rotation class after animation completes
  useEffect(() => {
    if (revealState === "card1" && isRotating) {
      const timer = setTimeout(() => {
        setIsRotating(false);
        setIsFlipped(true); // Keep the flipped state
      }, 800); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [revealState, isRotating]);

  const handleCardClick = () => {
    // Only allow click if card hasn't been flipped yet
    if (revealState === "card2" && !isRotating && !isFlipped) {
      // First click: start rotation animation to card1
      setIsRotating(true);
      setRevealState("rotating");
      
      // Switch to card1 at halfway point (180deg)
      setTimeout(() => {
        setRevealState("card1");
        onCardReveal?.(1);
      }, 400); // Half of 800ms animation duration
    }
    // After flip, card is no longer clickable
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleMintClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent backdrop click
    if (onMint && !isMinting) {
      try {
        // Only set internal state if external isMinting is not provided
        if (externalIsMinting === undefined) {
          setInternalIsMinting(true);
        }
        await onMint();
      } catch (error) {
        console.error('Mint failed:', error);
      } finally {
        // Only reset internal state if external isMinting is not provided
        if (externalIsMinting === undefined) {
          setInternalIsMinting(false);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.container} onClick={handleBackdropClick}>
      <div className={styles.cardContainer}>
        <div
          className={`${styles.cardWrapper} ${
            isRotating ? styles.rotating : ""
          } ${isFlipped ? styles.flipped : ""}`}
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
              src={getGameIconUrl("backcards.png")}
              alt="Card Back"
              className={styles.cardImage}
            />
          </div>

          {/* Card1 - shown after rotation (front of card) */}
          <div
            className={`${styles.card} ${styles.card1} ${
              revealState === "card1" ? styles.visible : styles.hidden
            }`}
          >
            <img
              src={getGameIconUrl("commoncards.png")}
              alt="Card Front"
              className={styles.cardImage}
            />
          </div>
        </div>

        {/* Click hint overlay - outside cardWrapper so it doesn't rotate */}
        {revealState === "card2" && !isRotating && (
          <div className={styles.clickHint}>
            <p>Click to flip</p>
          </div>
        )}
        {revealState === "card1" && !isRotating && (
          <button 
            className={styles.mintButton}
            onClick={handleMintClick}
            disabled={isMinting}
          >
            {isMinting ? "Minting..." : "Mint"}
          </button>
        )}
      </div>
    </div>
  );
}

