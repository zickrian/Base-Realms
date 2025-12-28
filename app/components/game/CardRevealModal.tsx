"use client";

import { useState, useEffect } from "react";
import styles from "./CardRevealModal.module.css";

interface CardRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardReveal?: (cardNumber: 1 | 2) => void;
}

type RevealState = "card2" | "rotating" | "card1";

export function CardRevealModal({ isOpen, onClose, onCardReveal }: CardRevealModalProps) {
  const [revealState, setRevealState] = useState<RevealState>("card2");
  const [isRotating, setIsRotating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRevealState("card2");
      setIsRotating(false);
      setIsFlipped(false);
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
    if (revealState === "card2" && !isRotating) {
      // First click: start rotation animation to card1
      setIsRotating(true);
      setRevealState("rotating");
      
      // Switch to card1 at halfway point (180deg)
      setTimeout(() => {
        setRevealState("card1");
        onCardReveal?.(1);
      }, 400); // Half of 800ms animation duration
    } else if (revealState === "card1" && !isRotating) {
      // Second click: close modal
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
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
        >
          {/* Card2 - shown first */}
          <div
            className={`${styles.card} ${styles.card2} ${
              revealState === "card2" || revealState === "rotating"
                ? styles.visible
                : styles.hidden
            }`}
          >
            <img
              src="/game/icons/card2.png"
              alt="Card 2"
              className={styles.cardImage}
            />
          </div>

          {/* Card1 - shown after rotation */}
          <div
            className={`${styles.card} ${styles.card1} ${
              revealState === "card1" ? styles.visible : styles.hidden
            }`}
          >
            <img
              src="/game/icons/card1.png"
              alt="Card 1"
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
          <div className={styles.clickHint}>
            <p>Click to close</p>
          </div>
        )}
      </div>
    </div>
  );
}

