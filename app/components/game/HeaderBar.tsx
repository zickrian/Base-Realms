"use client";

import { useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import styles from "./HeaderBar.module.css";

interface PlayerData {
  level: number;
  xpPercentage: number;
}

interface HeaderBarProps {
  player: PlayerData;
}

const IDRX_TOKEN_ADDRESS = "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22" as const;
const BASE_CHAIN_ID = 8453; // Base Mainnet

export function HeaderBar({ player }: HeaderBarProps) {
  const { address, isConnected } = useAccount();

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

  // Mock data - tidak menggunakan backend
  const mockLevel = 67;
  const mockCurrentXP = 8700;
  const mockMaxXP = 9500;
  const xpPercentage = (mockCurrentXP / mockMaxXP) * 100;

  return (
    <div className={styles.header}>
      {/* Player Stats Group (Left) */}
      <div className={styles.playerStats}>
        {/* Level Badge */}
        <div className={styles.levelBadge}>
          <img
            src="/game/icons/level-badge.png"
            alt="Level Badge"
            width={60}
            height={70}
            className={styles.levelBadgeImage}
          />
          <span className={styles.levelNumber}>{mockLevel}</span>
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
              <span className={styles.xpText}>{mockCurrentXP} / {mockMaxXP}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Currency Display (Right) */}
      <div className={styles.currencySection}>
        {/* ETH */}
        <div className={styles.currencyItem}>
          <img
            src="/game/icons/eth.svg"
            alt="ETH"
            width={20}
            height={20}
          />
          <span className={styles.currencyValue}>{formatETH(ethBalance)}</span>
        </div>
        {/* IDRX */}
        <div className={styles.currencyItem}>
          <img
            src="/game/icons/idrx.svg"
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
