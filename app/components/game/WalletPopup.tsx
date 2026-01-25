"use client";

import React, { useState, useEffect } from 'react';
import { X, Copy, Share2 } from 'lucide-react';
import Image from 'next/image';
import { getGameIconUrl } from '../../utils/supabaseStorage';
import styles from './WalletPopup.module.css';

interface WalletPopupProps {
  isOpen: boolean;
  onClose: () => void;
  ethBalance: number;
  idrxBalance: number;
  walletAddress: string;
}

const formatBalance = (value: number) => {
  if (value === 0) return "0.000000";
  if (value < 0.000001) return value.toExponential(2);
  return value.toFixed(6);
};

const shortenAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const WalletPopup = ({ 
  isOpen, 
  onClose, 
  ethBalance, 
  idrxBalance, 
  walletAddress 
}: WalletPopupProps) => {
  const [baseName, setBaseName] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Base name when popup opens
  useEffect(() => {
    if (!isOpen || !walletAddress) {
      setBaseName(null);
      setIsLoadingName(true);
      return;
    }

    const fetchBaseName = async () => {
      try {
        setIsLoadingName(true);
        // Use Base's public API endpoint
        const response = await fetch(
          `https://api.basename.app/v1/name/${walletAddress}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.name) {
            setBaseName(data.name);
          } else {
            setBaseName(null);
          }
        } else {
          // No basename found
          setBaseName(null);
        }
      } catch {
        console.log('No Base name found for this address');
        setBaseName(null);
      } finally {
        setIsLoadingName(false);
      }
    };

    fetchBaseName();
  }, [isOpen, walletAddress]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const handleShare = () => {
    // UI only for now
    console.log('Share clicked - UI only');
  };

  const handleTopup = () => {
    // UI only for now
    console.log('Topup QRIS clicked - UI only');
  };

  if (!isOpen || !mounted) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Close popup if clicking on overlay (not on menuBox)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.container} onClick={handleOverlayClick}>
      <div className={`${styles.menuBox} bit16-container`}>
        {/* Header with Close Button */}
        <div className={styles.header}>
          <div className={styles.title}>Wallet</div>
          <button 
            className={`${styles.closeButton} bit16-button has-red-background`} 
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Balance Display */}
          <div className={styles.balanceSection}>
            <div className={styles.balanceItem}>
              <Image 
                src={getGameIconUrl("ethereum.png")} 
                alt="ETH" 
                width={24} 
                height={24}
                priority
              />
              <div className={styles.balanceInfo}>
                <div className={styles.balanceLabel}>ETH</div>
                <div className={styles.balanceValue}>{formatBalance(ethBalance)}</div>
              </div>
            </div>

            <div className={styles.balanceItem}>
              <Image 
                src={getGameIconUrl("IDRX.png")} 
                alt="IDRX" 
                width={24} 
                height={24}
                priority
              />
              <div className={styles.balanceInfo}>
                <div className={styles.balanceLabel}>IDRX</div>
                <div className={styles.balanceValue}>{formatBalance(idrxBalance)}</div>
              </div>
            </div>
          </div>

          {/* Base Name (if available) */}
          {!isLoadingName && baseName && (
            <div className={styles.baseNameSection}>
              <div className={styles.sectionLabel}>Base Name</div>
              <div className={styles.baseName}>{baseName}</div>
            </div>
          )}

          {/* Wallet Address */}
          <div className={styles.addressSection}>
            <div className={styles.sectionLabel}>Address</div>
            <div className={styles.address} title={walletAddress}>
              {shortenAddress(walletAddress)}
            </div>
          </div>

          {/* QRIS Topup Button */}
          <button 
            className={styles.topupButton}
            onClick={handleTopup}
          >
            <Image 
              src="/button/image.png" 
              alt="QRIS" 
              width={32} 
              height={32}
              className={styles.qrisIcon}
              priority
            />
            <span className={styles.topupText}>Topup IDX via QRIS</span>
          </button>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button 
              className={`${styles.actionButton} bit16-button`}
              onClick={handleCopy}
            >
              <Copy size={20} />
              <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
            </button>
            <button 
              className={`${styles.actionButton} bit16-button`}
              onClick={handleShare}
            >
              <Share2 size={20} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
