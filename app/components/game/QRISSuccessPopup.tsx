/**
 * QRIS Success Popup
 * 
 * Shows success message after successful QRIS payment
 */

'use client';

import React from 'react';
import { Check } from 'lucide-react';
import styles from './QRISSuccessPopup.module.css';

interface QRISSuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
}

export const QRISSuccessPopup: React.FC<QRISSuccessPopupProps> = ({
  isOpen,
  onClose,
  orderId,
  amount,
}) => {
  if (!isOpen) return null;

  const formatAmount = (amt: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amt);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.container} onClick={handleOverlayClick}>
      <div className={`${styles.menuBox} bit16-container`}>
        {/* Success Icon */}
        <div className={styles.iconWrapper}>
          <div className={styles.successIcon}>
            <Check size={64} strokeWidth={4} />
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <h2 className={styles.title}>Payment Success!</h2>
          
          <p className={styles.message}>
            Your QRIS payment has been successfully processed
          </p>

          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Amount:</span>
              <span className={styles.detailValue}>{formatAmount(amount)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Order ID:</span>
              <span className={styles.detailValueSmall}>{orderId}</span>
            </div>
          </div>

          <div className={styles.celebrationEmoji}>🎉</div>

          <button
            className={styles.closeButton}
            onClick={onClose}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
