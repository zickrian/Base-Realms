"use client";

import { useMemo } from "react";
import Image from "next/image";
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

  return (
    <div className={styles.header}>
      {/* Level Badge */}
      <div className={styles.levelBadge}>
        <Image 
          src="/game/icons/crown.svg" 
          alt="Crown" 
          width={24} 
          height={24} 
          className={styles.crownIcon}
        />
        <div className={styles.shield}>
          <span className={styles.levelNumber}>{player.level}</span>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className={styles.xpSection}>
        <span className={styles.xpLabel}>PLAYER LEVEL</span>
        <div className={styles.xpBarContainer}>
          <div 
            className={styles.xpBarFill} 
            style={{ width: `${player.xpPercentage}%` }}
          />
        </div>
        <span className={styles.xpPercentage}>{player.xpPercentage}% XP</span>
      </div>

      {/* Currency Display */}
      <div className={styles.currencySection}>
        {/* IDRX - Left */}
        <div className={styles.currencyItem}>
          <Image 
            src="/game/icons/idrx.svg" 
            alt="IDRX" 
            width={20} 
            height={20}
          />
          <span className={styles.currencyValue}>{formatIDRX(idrxBalance)}</span>
        </div>
        {/* ETH - Right */}
        <div className={styles.currencyItem}>
          <Image 
            src="/game/icons/eth.svg" 
            alt="ETH" 
            width={20} 
            height={20}
          />
          <span className={styles.currencyValue}>{formatETH(ethBalance)}</span>
        </div>
      </div>
    </div>
  );
}
