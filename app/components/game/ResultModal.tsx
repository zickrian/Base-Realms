"use client";

import React, { useState, useEffect, useCallback } from 'react';
import styles from './ResultModal.module.css';

interface ResultModalProps {
  result: 'victory' | 'defeat';
  onClose: () => void;
  autoCloseDelay?: number;
}

/**
 * ResultModal Component
 * Displays battle result with auto-close countdown
 */
export const ResultModal: React.FC<ResultModalProps> = ({
  result,
  onClose,
  autoCloseDelay = 5000,
}) => {
  const [countdown, setCountdown] = useState(Math.ceil(autoCloseDelay / 1000));

  // Handle close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Auto-close countdown
  useEffect(() => {
    if (countdown <= 0) {
      handleClose();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, handleClose]);

  const isVictory = result === 'victory';

  return (
    <div className={styles.modalOverlay} data-testid="result-modal">
      {/* Confetti for victory */}
      {isVictory && (
        <>
          <div className={styles.confetti} />
          <div className={styles.confetti} />
          <div className={styles.confetti} />
          <div className={styles.confetti} />
          <div className={styles.confetti} />
          <div className={styles.confetti} />
        </>
      )}

      <div className={styles.modalContainer}>
        {/* Stars decoration for victory */}
        {isVictory && (
          <div className={styles.stars}>
            <span className={styles.star}>⭐</span>
            <span className={styles.star}>⭐</span>
            <span className={styles.star}>⭐</span>
          </div>
        )}

        {/* Result text */}
        <h1
          className={`${styles.resultText} ${isVictory ? styles.victory : styles.defeat}`}
          data-testid="result-text"
        >
          {isVictory ? 'Victory!' : 'Defeat'}
        </h1>

        {/* Return button */}
        <button
          className={styles.returnButton}
          onClick={handleClose}
          data-testid="return-button"
        >
          Return to Home
        </button>

        {/* Auto-close countdown */}
        <p className={styles.countdown}>
          Auto return in {countdown}s
        </p>
      </div>
    </div>
  );
};

export default ResultModal;
