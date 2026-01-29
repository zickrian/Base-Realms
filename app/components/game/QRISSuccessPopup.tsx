/**
 * QRIS Success Popup
 * 
 * Shows success message after successful QRIS payment
 */

'use client';

import React from 'react';
import { Check } from 'lucide-react';
import Image from 'next/image';
import { getGameIconUrl } from '../../utils/supabaseStorage';
import { useQRISClaim } from '@/app/hooks/useQRISClaim';
import styles from './QRISSuccessPopup.module.css';

interface QRISSuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
  walletAddress?: string;
}

export const QRISSuccessPopup: React.FC<QRISSuccessPopupProps> = ({
  isOpen,
  onClose,
  orderId,
  amount,
}) => {
  const { claim, isLoadingProof, isPending, isConfirming, isSuccess, error } = useQRISClaim();

  React.useEffect(() => {
    if (isSuccess) {
      alert('Successfully claimed 10 IDRX!');
      onClose();
    }
  }, [isSuccess, onClose]);

  React.useEffect(() => {
    if (error) {
      console.error('[QRIS Success] Claim error:', error);
    }
  }, [error]);

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

          {/* Claim Button */}
          <button
            className={styles.claimButton}
            onClick={claim}
            disabled={isLoadingProof || isPending || isConfirming}
          >
            <Image 
              src={getGameIconUrl("IDRX.png")} 
              alt="IDRX" 
              width={24} 
              height={24}
              priority
            />
            <span className={styles.claimText}>
              {isLoadingProof || isPending || isConfirming 
                ? 'Claiming...' 
                : 'Claim 10 IDRX'}
            </span>
          </button>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={isLoadingProof || isPending || isConfirming}
          >
            {isSuccess ? 'Close' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};
