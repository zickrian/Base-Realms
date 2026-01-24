"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { type Rarity } from "../../lib/blockchain/nftService";
import styles from "./CardRevealModal.module.css";

// ABI for mint function - same as in home/page.tsx
const MINT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

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

type MintingState = "ready" | "processing" | "verifying" | "success" | "error";

/**
 * Error messages mapping for better user experience
 * Maps error types to user-friendly messages with actionable steps
 */
interface ErrorInfo {
  title: string;
  message: string;
  action: string;
  canRetry: boolean;
}

const ERROR_MESSAGES: Record<string, ErrorInfo> = {
  'user rejected': {
    title: "Transaction Cancelled",
    message: "You cancelled the transaction in your wallet.",
    action: "You can try again when ready.",
    canRetry: true,
  },
  'user denied': {
    title: "Transaction Cancelled",
    message: "You cancelled the transaction in your wallet.",
    action: "You can try again when ready.",
    canRetry: true,
  },
  'insufficient funds': {
    title: "Insufficient Balance",
    message: "You don't have enough ETH to cover gas fees.",
    action: "Add more ETH to your wallet and try again.",
    canRetry: false,
  },
  'gas required exceeds allowance': {
    title: "Insufficient Gas",
    message: "Transaction requires more gas than available.",
    action: "Add more ETH to your wallet and try again.",
    canRetry: false,
  },
  'reverted': {
    title: "Transaction Failed",
    message: "The smart contract rejected your transaction.",
    action: "Please contact support if this issue persists.",
    canRetry: true,
  },
  'network': {
    title: "Network Error",
    message: "Unable to connect to the blockchain network.",
    action: "Check your internet connection and try again.",
    canRetry: true,
  },
  'timeout': {
    title: "Transaction Timeout",
    message: "Transaction took too long to confirm.",
    action: "Check blockchain explorer for transaction status.",
    canRetry: false,
  },
};

/**
 * Get error information from error message
 */
function getErrorInfo(error: Error | string): ErrorInfo {
  const errorMsg = (typeof error === 'string' ? error : error.message).toLowerCase();
  
  // Check each known error pattern
  for (const [key, info] of Object.entries(ERROR_MESSAGES)) {
    if (errorMsg.includes(key)) {
      return info;
    }
  }
  
  // Default error for unknown cases
  return {
    title: "Minting Failed",
    message: typeof error === 'string' ? error : error.message || "An unknown error occurred.",
    action: "Please try again or contact support.",
    canRetry: true,
  };
}

// Configuration constants for maintainability
const TRANSACTION_CONFIG = {
  TIMEOUT_MS: 45000, // 45 seconds before manual verification
  POLLING_INTERVAL_MS: 3000, // Check every 3 seconds after timeout
  MAX_MANUAL_RETRIES: 3, // Maximum manual verification attempts
} as const;

export function CardRevealModal({ 
  isOpen, 
  onClose, 
  cardData,
  walletAddress,
  onMintSuccess,
  onMintError 
}: CardRevealModalProps) {
  const { writeContract, data: hash, isPending, error: writeError, reset: resetWriteContract } = useWriteContract();
  const { 
    isLoading: isConfirming, 
    isSuccess,
    data: receipt // ← CRITICAL: Get receipt to check status
  } = useWaitForTransactionReceipt({ hash });
  
  // State management
  const [mintingState, setMintingState] = useState<MintingState>("ready");
  const [mintError, setMintError] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isManuallyVerifying, setIsManuallyVerifying] = useState(false);
  
  // Refs for cleanup and tracking - track if component is mounted
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalledSuccessCallback = useRef(false);
  const manualRetryCount = useRef(0);
  const isMountedRef = useRef(true);

  /**
   * Cleanup function to clear all timers and intervals
   */
  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (elapsedTimeIntervalRef.current !== null) {
      clearInterval(elapsedTimeIntervalRef.current);
      elapsedTimeIntervalRef.current = null;
    }
  }, []);

  /**
   * Manual transaction verification using viem publicClient
   * Fallback when wagmi's useWaitForTransactionReceipt doesn't detect success
   */
  const verifyTransactionManually = useCallback(async (txHash: string) => {
    // Check if component is still mounted before proceeding
    if (!isMountedRef.current) {
      console.log('[CardRevealModal] Component unmounted, skipping verification');
      return;
    }

    try {
      console.log('[CardRevealModal] Starting manual verification for tx:', txHash);
      
      if (isMountedRef.current) {
        setIsManuallyVerifying(true);
        setMintingState("verifying");
      }

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      // Check again after async operation
      if (!isMountedRef.current) {
        console.log('[CardRevealModal] Component unmounted after verification, skipping state updates');
        return;
      }

      console.log('[CardRevealModal] Transaction receipt:', receipt);

      if (receipt && receipt.status === 'success') {
        console.log('[CardRevealModal] Manual verification: Transaction successful');
        clearAllTimers();
        setMintingState("success");
        setIsManuallyVerifying(false);
        
        // Call success callback only once
        if (!hasCalledSuccessCallback.current && isMountedRef.current) {
          hasCalledSuccessCallback.current = true;
          if (onMintSuccess) {
            onMintSuccess(txHash);
          }
        }
      } else if (receipt && receipt.status === 'reverted') {
        console.log('[CardRevealModal] Manual verification: Transaction reverted');
        clearAllTimers();
        if (isMountedRef.current) {
          setMintingState("error");
          setMintError("Transaction failed on blockchain. Please try again.");
          setIsManuallyVerifying(false);
          if (onMintError) {
            onMintError("Transaction reverted");
          }
        }
      }
    } catch (error) {
      console.error('[CardRevealModal] Manual verification error:', error);
      
      if (!isMountedRef.current) {
        return;
      }

      // Increment retry count
      manualRetryCount.current += 1;
      
      // If we haven't exceeded max retries, try again
      if (manualRetryCount.current < TRANSACTION_CONFIG.MAX_MANUAL_RETRIES) {
        console.log(`[CardRevealModal] Retry ${manualRetryCount.current}/${TRANSACTION_CONFIG.MAX_MANUAL_RETRIES}`);
        setIsManuallyVerifying(false);
        // Continue polling
      } else {
        // Max retries exceeded
        console.error('[CardRestealModal] Max manual verification retries exceeded');
        clearAllTimers();
        if (isMountedRef.current) {
          setMintingState("error");
          setMintError("Unable to verify transaction. Please check your wallet or blockchain explorer.");
          setIsManuallyVerifying(false);
        }
      }
    }
  }, [onMintSuccess, onMintError, clearAllTimers]);

  /**
   * Start manual verification polling after timeout
   */
  const startManualVerification = useCallback((txHash: string) => {
    console.log('[CardRevealModal] Starting manual verification polling');
    manualRetryCount.current = 0;
    
    // Immediate first check
    verifyTransactionManually(txHash);
    
    // Then poll every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      verifyTransactionManually(txHash);
    }, TRANSACTION_CONFIG.POLLING_INTERVAL_MS);
  }, [verifyTransactionManually]);

  /**
   * Reset all state when modal opens/closes
   */
  useEffect(() => {
    if (isOpen) {
      console.log('[CardRevealModal] Modal opened, resetting state to ready');
      isMountedRef.current = true;
      setMintingState("ready");
      setMintError(null);
      setShowSuccessPopup(false);
      setElapsedTime(0);
      setIsManuallyVerifying(false);
      hasCalledSuccessCallback.current = false;
      manualRetryCount.current = 0;
      clearAllTimers();
      resetWriteContract();
    }
    
    return () => {
      if (!isOpen) {
        isMountedRef.current = false;
        clearAllTimers();
      }
    };
  }, [isOpen, resetWriteContract, clearAllTimers]);

  /**
   * Track elapsed time during processing
   */
  useEffect(() => {
    if ((mintingState === "processing" || mintingState === "verifying") && hash) {
      setElapsedTime(0);
      elapsedTimeIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      return () => {
        if (elapsedTimeIntervalRef.current) {
          clearInterval(elapsedTimeIntervalRef.current);
          elapsedTimeIntervalRef.current = null;
        }
      };
    }
  }, [mintingState, hash]);

  /**
   * Setup timeout for manual verification fallback
   */
  useEffect(() => {
    if (mintingState === "processing" && hash && !isSuccess) {
      console.log('[CardRevealModal] Setting up timeout for manual verification');
      
      timeoutRef.current = setTimeout(() => {
        console.log('[CardRevealModal] Timeout reached, starting manual verification');
        startManualVerification(hash);
      }, TRANSACTION_CONFIG.TIMEOUT_MS);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
  }, [mintingState, hash, isSuccess, startManualVerification]);

  /**
   * Handle successful mint transaction from wagmi hook
   * 
   * CRITICAL FIX: Check receipt.status to detect transaction reverts
   * - receipt.status === 'success' → Transaction succeeded
   * - receipt.status === 'reverted' → Transaction failed on blockchain
   * - This prevents false "success" states
   */
  useEffect(() => {
    if (isSuccess && hash && receipt && (mintingState === "processing" || mintingState === "verifying") && isMountedRef.current) {
      // Check transaction status from receipt
      if (receipt.status === 'success') {
        // ✅ Transaction truly succeeded
        console.log('[CardRevealModal] ✅ Transaction confirmed as SUCCESS on blockchain');
        clearAllTimers();
        setMintingState("success");
        
        // Call onMintSuccess callback only once
        if (!hasCalledSuccessCallback.current && isMountedRef.current) {
          hasCalledSuccessCallback.current = true;
          if (onMintSuccess) {
            onMintSuccess(hash);
          }
        }
      } else if (receipt.status === 'reverted') {
        // ❌ Transaction reverted on blockchain
        console.error('[CardRevealModal] ❌ Transaction REVERTED on blockchain');
        clearAllTimers();
        const errorMessage = "Transaction failed on blockchain. The smart contract rejected your transaction.";
        setMintError(errorMessage);
        setMintingState("error");
        
        if (onMintError && !hasCalledSuccessCallback.current) {
          hasCalledSuccessCallback.current = true;
          onMintError(errorMessage);
        }
      }
    }
  }, [isSuccess, hash, receipt, onMintSuccess, onMintError, mintingState, clearAllTimers]);

  /**
   * Show success popup after minting state changes to success
   */
  useEffect(() => {
    if (mintingState === "success" && !showSuccessPopup) {
      // Show popup after a short delay for smooth transition
      const timer = setTimeout(() => {
        setShowSuccessPopup(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [mintingState, showSuccessPopup]);

  /**
   * Handle write errors with proper error messages
   * 
   * IMPROVED: Use error message mapping for better UX
   */
  useEffect(() => {
    // Only handle errors if we're in ready or processing state and modal is open
    if (writeError && (mintingState === "ready" || mintingState === "processing") && isOpen && isMountedRef.current) {
      console.error('[CardRevealModal] Write error detected:', writeError);
      
      const errorInfo = getErrorInfo(writeError);
      const errorMessage = `${errorInfo.message} ${errorInfo.action}`;
      
      setMintError(errorMessage);
      setMintingState("error");
      
      if (onMintError) {
        onMintError(errorMessage);
      }
    }
  }, [writeError, onMintError, mintingState, isOpen]);

  const handleMint = useCallback(() => {
    if (!cardData || !walletAddress || isPending || isConfirming) return;

    setMintError(null);
    setMintingState("processing");

    try {
      // Use wagmi's writeContract which is already integrated with OnchainKit
      // This will automatically use the correct chain (Base) from OnchainKitProvider
      // Mint function doesn't require parameters (same as in home/page.tsx)
      writeContract({
        address: cardData.contractAddress as `0x${string}`,
        abi: MINT_ABI,
        functionName: 'mint',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to start minting";
      console.error('Minting error:', error);
      setMintError(errorMsg);
      setMintingState("error");
      onMintError?.(errorMsg);
    }
  }, [cardData, walletAddress, isPending, isConfirming, writeContract, onMintError]);

  const handleCloseClick = () => {
    clearAllTimers();
    isMountedRef.current = false;
    setMintError(null);
    resetWriteContract();
    
    if (isPending || isConfirming || mintingState === "processing" || mintingState === "verifying") {
      console.log('[CardRevealModal] Closing modal while transaction in progress');
    }
    
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      if ((mintingState === "processing" || mintingState === "verifying") && (isPending || isConfirming)) {
        return;
      }
      handleCloseClick();
    }
  };

  const handleManualCheck = useCallback(() => {
    if (hash && isMountedRef.current) {
      console.log('[CardRevealModal] User initiated manual check');
      manualRetryCount.current = 0;
      verifyTransactionManually(hash);
    }
  }, [hash, verifyTransactionManually]);

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    // Close the modal after a short delay for smooth transition
    setTimeout(() => {
      handleCloseClick();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.container} onClick={handleBackdropClick}>
      <div className={styles.cardContainer}>
        {/* Minting State Container */}
        {(mintingState === "ready" || mintingState === "processing" || mintingState === "verifying" || mintingState === "error") && !showSuccessPopup && (
          <div className={`${styles.mintingContainer} bit16-container`}>
            <button className={`${styles.closeButton} bit16-button has-red-background`} onClick={handleCloseClick} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            {/* Processing State */}
            {mintingState === "processing" && (isPending || isConfirming) && (
              <>
                <div className={styles.spinner}></div>
                <h3 className={styles.statusTitle}>Processing</h3>
                <p className={styles.statusMessage}>
                  Transaction is being processed. Please wait for confirmation...
                </p>
                {elapsedTime > 10 && (
                  <p className={styles.elapsedTime}>
                    Elapsed: {elapsedTime}s
                  </p>
                )}
                {elapsedTime > 30 && hash && (
                  <div className={styles.actionButtons} style={{ marginTop: '16px' }}>
                    <button 
                      className={`${styles.checkButton} bit16-button has-blue-background`}
                      onClick={handleManualCheck}
                      disabled={isManuallyVerifying}
                    >
                      {isManuallyVerifying ? 'Checking...' : 'Check Status'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Verifying State - Manual verification in progress */}
            {mintingState === "verifying" && (
              <>
                <div className={styles.spinner}></div>
                <h3 className={styles.statusTitle}>Verifying Transaction</h3>
                <p className={styles.statusMessage}>
                  Checking transaction status on blockchain...
                </p>
                {elapsedTime > 0 && (
                  <p className={styles.elapsedTime}>
                    Elapsed: {elapsedTime}s
                  </p>
                )}
              </>
            )}

            {/* Error State */}
            {mintingState === "error" && mintError && (
              <>
                <div className={styles.errorIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.statusTitle}>Error</h3>
                <p className={styles.statusMessage}>{mintError}</p>
                <div className={styles.actionButtons}>
                  <button 
                    className={`${styles.retryButton} bit16-button has-green-background`} 
                    onClick={handleMint} 
                    disabled={isPending || isConfirming}
                  >
                    Retry Mint
                  </button>
                  <button 
                    className={`${styles.cancelButton} bit16-button has-red-background`} 
                    onClick={handleCloseClick} 
                    style={{ marginTop: '10px' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {/* Ready State */}
            {mintingState === "ready" && !mintError && (
              <>
                <div className={styles.readyIcon}>
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.statusTitle}>Ready to Mint</h3>
                <p className={styles.statusMessage}>Click the button below to start minting your card</p>
                <div className={styles.actionButtons}>
                  <button 
                    className={`${styles.retryButton} bit16-button has-green-background`} 
                    onClick={handleMint} 
                    disabled={isPending || isConfirming || !cardData || !walletAddress}
                  >
                    {isPending || isConfirming ? 'Minting...' : 'Start Mint'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Success Popup - Now shown inline within same container */}
        {showSuccessPopup && (
          <div className={`${styles.mintingContainer} bit16-container`}>
            <button
              className={`${styles.closeButton} bit16-button has-red-background`}
              onClick={handleSuccessPopupClose}
              aria-label="Close"
            >
              ×
            </button>
            <div className={styles.successIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className={styles.statusTitle}>Minting Successful!</h3>
            <p className={styles.statusMessage}>
              NFT berhasil dimint! Card telah ditambahkan ke inventory Anda.
            </p>
            <div className={styles.actionButtons}>
              <button className={`${styles.successCloseButton} bit16-button has-green-background`} onClick={handleSuccessPopupClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
