"use client";

import { useMemo, useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import { usePlayerProfile } from "../../hooks/usePlayerProfile";
import styles from "./HeaderBar.module.css";

interface HeaderBarProps {
  onSettingsClick?: () => void;
}

const IDRX_TOKEN_ADDRESS = "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22" as const;
const BASE_CHAIN_ID = 8453; // Base Mainnet

export function HeaderBar({ onSettingsClick }: HeaderBarProps) {
  const { address, isConnected } = useAccount();
  const { profile, loading: profileLoading } = usePlayerProfile();

  // Get ETH balance
  const { data: ethBalanceData } = useBalance({
    address: address,
    chainId: BASE_CHAIN_ID,
  });

  // Get IDRX token balance
  const { data: idrxBalanceData } = useBalance({
    address: address,
    token: IDRX_TOKEN_ADDRESS,
    chainId: BASE_CHAIN_ID,
  });

  const formatIDRX = (value: number) => {
    if (value === 0) return "0.00";
    if (value < 0.01) return value.toFixed(6);
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const idrxBalance = useMemo(() => {
    if (!idrxBalanceData || !isConnected) return 0;
    return parseFloat(formatUnits(idrxBalanceData.value, idrxBalanceData.decimals));
  }, [idrxBalanceData, isConnected]);

  const ethBalance = useMemo(() => {
    if (!ethBalanceData || !isConnected) return 0;
    return parseFloat(formatUnits(ethBalanceData.value, ethBalanceData.decimals));
  }, [ethBalanceData, isConnected]);

  const formatETH = (value: number) => {
    if (value === 0) return "0.000";
    if (value < 0.001) return value.toFixed(6);
    return value.toFixed(3);
  };

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "0x067AAAAAAAB...";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Get level and XP from profile - ensure these come from current_xp in database
  // Explicitly check for profile data and use proper fallbacks
  const level = profile && typeof profile.level === 'number' ? profile.level : 1;
  const currentXP = profile && typeof profile.currentXp === 'number' ? profile.currentXp : 0;
  const maxXP = profile && typeof profile.maxXp === 'number' ? profile.maxXp : 100;
  const xpPercentage = profile && typeof profile.xpPercentage === 'number' ? profile.xpPercentage : 0;

  // Debug logging to verify current_xp is displayed
  useEffect(() => {
    console.log('HeaderBar - Profile state:', { 
      profile, 
      profileLoading,
      currentXP, 
      maxXP, 
      xpPercentage, 
      level,
      'isConnected': isConnected,
      'address': address
    });
  }, [profile, profileLoading, currentXP, maxXP, xpPercentage, level, isConnected, address]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={styles.header}>
        {/* Placeholder to prevent layout shift */}
        <div className={styles.playerStats} style={{ opacity: 0 }}></div>
      </div>
    );
  }

  return (
    <div className={styles.header}>
      {/* Player Stats Group (Left) */}
      <div className={styles.playerStats}>
        {/* Clickable area untuk membuka settings */}
        <div className={styles.clickableArea} onClick={handleSettingsClick}>
          {/* Level Badge */}
          <div className={styles.levelBadge}>
            <img
              src={getGameIconUrl("level-badge.png")}
              alt="Level Badge"
              width={60}
              height={70}
              className={styles.levelBadgeImage}
            />
            <span className={styles.levelNumber}>{level}</span>
          </div>

          {/* Wallet & Progress Bar Section (Right of Badge) */}
          <div className={styles.walletProgressSection}>
            {/* Wallet Address - Text Only */}
            <span className={styles.addressText}>{formatAddress(address)}</span>

            {/* XP Progress Bar - Custom 3D Style */}
            <div className={styles.xpProgressContainer}>
              <div className={styles.progressBarBackground}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${xpPercentage}%` }}
                >
                  <div className={styles.progressBarShine}></div>
                </div>
              </div>
              <div className={styles.xpContent}>
                <span className={styles.xpText}>
                  {profileLoading ? 'Loading...' : `${currentXP} / ${maxXP}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Currency Display (Right) */}
      <div className={styles.currencySection}>
        {/* ETH */}
        <div className={styles.currencyItem}>
          <img
            src={getGameIconUrl("eth.svg")}
            alt="ETH"
            width={20}
            height={20}
          />
          <span className={styles.currencyValue}>{formatETH(ethBalance)}</span>
        </div>
        {/* IDRX */}
        <div className={styles.currencyItem}>
          <img
            src={getGameIconUrl("idrx.svg")}
            alt="IDRX"
            width={20}
            height={20}
          />
          <span className={styles.currencyValue}>{formatIDRX(idrxBalance)}</span>
        </div>
      </div>
    </div>
  );
}
