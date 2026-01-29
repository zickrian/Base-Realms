/**
 * QRIS Display Popup
 * 
 * Shows the generated QRIS code and polls for payment status
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RefreshCw, Copy, Smartphone } from 'lucide-react';
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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    // handleCancel is defined with useCallback and includes all deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, expiresAt]);

  // Poll for payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!orderId) return;

    // Use ref to check if already checking to prevent race condition
    if (isChecking) return;

    setIsChecking(true);
    try {
      const response = await fetch(`/api/qris/status/${orderId}`);
      
      // Check if response is OK before parsing JSON
      if (!response.ok) {
        console.error('[QRIS] Status check failed:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        // Try to get error message
        const text = await response.text();
        console.error('[QRIS] Response body:', text.substring(0, 200));
        return;
      }
      
      const data = await response.json();

      console.log('[QRIS] Polling status:', {
        success: data.success,
        status: data.payment?.status,
        orderId: orderId
      });

      if (data.success && data.payment.status === 'success') {
        console.log('[QRIS] Payment SUCCESS detected! Triggering success callback...');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        onPaymentSuccess();
      }
    } catch (error) {
      console.error('[QRIS] Failed to check payment status:', error);
      if (error instanceof SyntaxError) {
        console.error('[QRIS] Received non-JSON response (likely HTML error page)');
      }
    } finally {
      setIsChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, onPaymentSuccess]);

  // Auto-poll every 3 seconds
  useEffect(() => {
    if (!isOpen || timeRemaining === 0) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    pollIntervalRef.current = setInterval(checkPaymentStatus, 3000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, timeRemaining, checkPaymentStatus]);

  // Handle cancel/close - mark payment as failed
  const handleCancel = useCallback(async () => {
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
  }, [orderId, isCancelling, onClose]);

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

  if (!isOpen) return null;

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
                  <Smartphone size={48} className={styles.qrisIcon} />
                  <p>Generating QRIS...</p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className={styles.instructions}>
            <div className={styles.instructionItem}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepText}>Buka aplikasi e-wallet</span>
            </div>
            <div className={styles.instructionItem}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepText}>Scan kode QRIS di atas</span>
            </div>
            <div className={styles.instructionItem}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepText}>Selesaikan pembayaran</span>
            </div>
          </div>

          {/* Simulator Instructions */}
          <div className={styles.simulatorBox}>
            <div className={styles.simulatorTitle}>Test Payment (Sandbox)</div>
            <div className={styles.simulatorText}>
              Copy URL ini untuk Midtrans Simulator:
            </div>
            <div className={styles.urlBox} onClick={handleCopyUrl}>
              <div className={styles.urlText}>{qrisUrl}</div>
              <button className={styles.copyIcon} onClick={handleCopyUrl}>
                <Copy size={16} />
                <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className={styles.simulatorLink}>
              <a 
                href="https://simulator.sandbox.midtrans.com/v2/qris/index" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.linkText}
              >
                → Buka Midtrans Simulator
              </a>
            </div>
          </div>

          {/* Status */}
          <div className={styles.statusBox}>
            {isChecking ? (
              <>
                <RefreshCw size={20} className={styles.spinning} />
                <span>Memeriksa status...</span>
              </>
            ) : (
              <>
                <div className={styles.pulsingDot}></div>
                <span>Menunggu pembayaran...</span>
              </>
            )}
          </div>

          {/* Manual Check Button for Sandbox Testing */}
          <button 
            onClick={() => checkPaymentStatus()}
            disabled={isChecking}
            className={styles.checkButton}
          >
            <RefreshCw size={16} className={isChecking ? styles.spinning : ''} />
            {isChecking ? 'Checking...' : 'Check Payment Status'}
          </button>

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
            {isCancelling ? 'Membatalkan...' : 'Batalkan Pembayaran'}
          </button>
        </div>
      </div>
    </div>
  );
};
