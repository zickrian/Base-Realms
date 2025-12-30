"use client";

import { useMemo, useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import { useGameStore } from "../../stores/gameStore";
import styles from "./HeaderBar.module.css";

interface HeaderBarProps {
  onSettingsClick?: () => void;
}

const IDRX_TOKEN_ADDRESS = "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22" as const;
const BASE_CHAIN_ID = 8453;

export function HeaderBar({ onSettingsClick }: HeaderBarProps) {
  const { address, isConnected } = useAccount();
  const { profile, profileLoading } = useGameStore();

  const { data: ethBalanceData } = useBalance({
    address: address,
    chainId: BASE_CHAIN_ID,
  });

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

  const level = profile?.level ?? 1;
  const currentXP = profile?.currentXp ?? 0;
  const maxXP = profile?.maxXp ?? 100;
  const xpPercentage = profile?.xpPercentage ?? 0;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={styles.header}>
        <div className={styles.playerStats} style={{ opacity: 0 }}></div>
      </div>
    );
  }

  return (
    <div className={styles.header}>
      <div className={styles.playerStats}>
        <div className={styles.clickableArea} onClick={onSettingsClick}>
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
          <div className={styles.walletProgressSection}>
            <span className={styles.addressText}>{formatAddress(address)}</span>
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
      <div className={styles.currencySection}>
        <div className={styles.currencyItem}>
          <img src={getGameIconUrl("eth.svg")} alt="ETH" width={20} height={20} />
          <span className={styles.currencyValue}>{formatETH(ethBalance)}</span>
        </div>
        <div className={styles.currencyItem}>
          <img src={getGameIconUrl("idrx.svg")} alt="IDRX" width={20} height={20} />
          <span className={styles.currencyValue}>{formatIDRX(idrxBalance)}</span>
        </div>
      </div>
    </div>
  );
}
