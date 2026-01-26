/**
 * QRIS Top-up Popup Component
 * 
 * Shows when user has insufficient IDRX balance (< 5 IDRX)
 * Displays QRIS code for IDRX top-up
 * 
 * @module QRISTopupPopup
 */

'use client';

import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import styles from './QRISTopupPopup.module.css';

interface QRISTopupPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onTopupComplete: () => void;
  currentBalance: string;
  requiredAmount: string;
}

/**
 * QRIS Top-up popup for insufficient IDRX balance
 */
export const QRISTopupPopup: React.FC<QRISTopupPopupProps> = ({
  isOpen,
  onClose,
  onTopupComplete,
  currentBalance,
  requiredAmount,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    // Give user feedback
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    onTopupComplete();
  };

  const formatIDRX = (value: string) => {
    try {
      // IDRX has 2 decimals
      const num = Number(value) / 100;
      return num.toFixed(2);
    } catch {
      return '0.00';
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className={styles.header}>
          <div className={styles.icon}>💳</div>
          <h2 className={styles.title}>Insufficient IDRX Balance</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.balanceInfo}>
            <div className={styles.balanceRow}>
              <span className={styles.label}>Current Balance:</span>
              <span className={styles.value}>{formatIDRX(currentBalance)} IDRX</span>
            </div>
            <div className={styles.balanceRow}>
              <span className={styles.label}>Required:</span>
              <span className={styles.valueRequired}>{formatIDRX(requiredAmount)} IDRX</span>
            </div>
          </div>

          <div className={styles.qrisSection}>
            <p className={styles.instructions}>
              Scan the QR code below to top up your IDRX balance:
            </p>
            
            {/* QRIS Code Placeholder */}
            <div className={styles.qrisCode}>
              <div className={styles.qrisPlaceholder}>
                <div className={styles.qrisIcon}>📱</div>
                <p className={styles.qrisText}>QRIS Code</p>
                <p className={styles.qrisSubtext}>Scan to top up IDRX</p>
              </div>
            </div>

            <p className={styles.hint}>
              💡 After completing the payment, click &quot;I&apos;ve Topped Up&quot; to refresh your balance.
            </p>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.refreshButton}
              onClick={handleRefreshBalance}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <RefreshCw size={18} className={styles.spinning} />
                  <span>Checking Balance...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  <span>I&apos;ve Topped Up</span>
                </>
              )}
            </button>

            <button
              className={styles.cancelButton}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
