/**
 * QRIS Display Popup
 * 
 * Shows the generated QRIS code and polls for payment status
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import styles from './QRISDisplayPopup.module.css';

interface QRISDisplayPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  orderId: string;
  qrisUrl: string;
  amount: number;
  expiresAt: string;
}

export const QRISDisplayPopup: React.FC<QRISDisplayPopupProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  orderId,
  qrisUrl,
  amount,
  expiresAt,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Mount tracking
  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Calculate time remaining
  useEffect(() => {
    if (!isOpen) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        handleCancel();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isOpen, expiresAt]);

  // Poll for payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!orderId || isChecking || !isMountedRef.current) return;

    setIsChecking(true);
    try {
      const response = await fetch(`/api/qris/status/${orderId}`);
      const data = await response.json();

      console.log('[QRISDisplay] Payment status check:', data);

      if (!isMountedRef.current) return; // Check again after async operation

      if (data.success && data.payment.status === 'success') {
        console.log('[QRISDisplay] Payment successful! Triggering success callback');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        onPaymentSuccess();
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [orderId, isChecking, onPaymentSuccess]);

  // Auto-poll every 2 seconds with immediate check
  useEffect(() => {
    if (!isOpen || timeRemaining === 0) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Immediate check when popup opens
    checkPaymentStatus();

    // Then poll every 2 seconds
    pollIntervalRef.current = setInterval(checkPaymentStatus, 2000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, timeRemaining, checkPaymentStatus]);

  // Handle cancel/close - mark payment as failed
  const handleCancel = async () => {
    if (isCancelling) return;
    
    setIsCancelling(true);
    
    try {
      // Mark payment as failed in database
      await fetch(`/api/qris/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
        }),
      });
    } catch (error) {
      console.error('Failed to cancel payment:', error);
    } finally {
      setIsCancelling(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      onClose();
    }
  };

  // Handle copy QRIS URL for simulator
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrisUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  if (!isOpen || !mounted) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAmount = (amt: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amt);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't allow closing by clicking overlay - must use cancel button
    e.stopPropagation();
  };

  return (
    <div className={styles.container} onClick={handleOverlayClick}>
      <div className={`${styles.menuBox} bit16-container`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Scan QRIS</div>
          <button 
            className={`${styles.closeButton} bit16-button has-red-background`} 
            onClick={handleCancel}
            disabled={isCancelling}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Timer */}
          <div className={styles.timerBox}>
            <div className={styles.timerLabel}>Sisa Waktu</div>
            <div className={styles.timerValue}>{formatTime(timeRemaining)}</div>
          </div>

          {/* Amount */}
          <div className={styles.amountBox}>
            <div className={styles.amountLabel}>Total Pembayaran</div>
            <div className={styles.amountValue}>{formatAmount(amount)}</div>
          </div>

          {/* QRIS Code */}
          <div className={styles.qrisBox}>
            <div className={styles.qrisCode}>
              {orderId ? (
                <Image
                  src={`/api/qris/qr-image/${orderId}`}
                  alt="QRIS Code"
                  width={240}
                  height={240}
                  className={styles.qrisImage}
                  priority
                  unoptimized
                />
              ) : (
                <div className={styles.qrisPlaceholder}>
                  <div className={styles.qrisIcon}>📱</div>
                  <p>Generating QRIS...</p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className={styles.instructions}>
            <div className={styles.instructionItem}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepText}>Open your e-wallet app</span>
            </div>
            <div className={styles.instructionItem}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepText}>Scan the QRIS code above</span>
            </div>
            <div className={styles.instructionItem}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepText}>Complete the payment</span>
            </div>
          </div>

          {/* Simulator Instructions */}
          <div className={styles.simulatorBox}>
            <div className={styles.simulatorTitle}>💻 Test Payment (Sandbox)</div>
            <div className={styles.simulatorText}>
              Copy this URL for Midtrans Simulator:
            </div>
            <div className={styles.urlBox} onClick={handleCopyUrl}>
              <div className={styles.urlText}>{qrisUrl}</div>
              <div className={styles.copyIcon}>{copySuccess ? '✓ Copied!' : '📋 Copy'}</div>
            </div>
            <div className={styles.simulatorLink}>
              <a 
                href="https://simulator.sandbox.midtrans.com/v2/qris/index" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.linkText}
              >
                → Open Midtrans Simulator
              </a>
            </div>
          </div>

          {/* Status */}
          <div className={styles.statusBox}>
            {isChecking ? (
              <>
                <RefreshCw size={20} className={styles.spinning} />
                <span>Checking status...</span>
              </>
            ) : (
              <>
                <div className={styles.pulsingDot}></div>
                <span>Waiting for payment...</span>
              </>
            )}
          </div>

          {/* Order ID */}
          <div className={styles.orderInfo}>
            Order ID: <span className={styles.orderId}>{orderId}</span>
          </div>

          {/* Cancel Button */}
          <button 
            className={styles.cancelButton}
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};
