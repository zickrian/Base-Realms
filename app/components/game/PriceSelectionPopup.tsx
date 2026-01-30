/**
 * Price Selection Popup
 * 
 * Shows available QRIS top-up amount options
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import styles from './PriceSelectionPopup.module.css';

interface PriceSelectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAmount: (amount: number) => void;
}

const TOPUP_OPTIONS = [
  {
    amount: 1000,
    label: 'IDR 1.000',
    description: 'Quick top-up',
  },
];

export const PriceSelectionPopup: React.FC<PriceSelectionPopupProps> = ({
  isOpen,
  onClose,
  onSelectAmount,
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.container} onClick={handleOverlayClick}>
      <div className={`${styles.menuBox} bit16-container`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>QRIS Top-up</div>
          <button 
            className={`${styles.closeButton} bit16-button has-red-background`} 
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.description}>
            Select amount to top-up via QRIS
          </div>

          {/* Options */}
          <div className={styles.optionsGrid}>
            {TOPUP_OPTIONS.map((option) => (
              <button
                key={option.amount}
                className={styles.optionCard}
                onClick={() => onSelectAmount(option.amount)}
              >
                <div className={styles.optionIcon}>
                  <Image 
                    src="/button/image.png" 
                    alt="QRIS" 
                    width={48} 
                    height={48}
                    className={styles.qrisIcon}
                    priority
                  />
                </div>
                <div className={styles.optionLabel}>{option.label}</div>
                <div className={styles.optionDescription}>{option.description}</div>
              </button>
            ))}
          </div>

          <div className={styles.infoBox}>
            <div className={styles.infoIcon}>ℹ️</div>
            <div className={styles.infoText}>
              Scan the generated QRIS code with any e-wallet app to complete your payment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
