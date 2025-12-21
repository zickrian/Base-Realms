"use client";

import Image from "next/image";
import styles from "./HeaderBar.module.css";

interface PlayerData {
  level: number;
  xpPercentage: number;
  idrxBalance: number;
  ethBalance: number;
}

interface HeaderBarProps {
  player: PlayerData;
}

export function HeaderBar({ player }: HeaderBarProps) {
  const formatIDRX = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatETH = (value: number) => value.toFixed(3);

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
        <div className={styles.currencyItem}>
          <Image 
            src="/game/icons/idrx.svg" 
            alt="IDRX" 
            width={20} 
            height={20}
          />
          <span className={styles.currencyValue}>{formatIDRX(player.idrxBalance)}</span>
        </div>
        <div className={styles.currencyItem}>
          <Image 
            src="/game/icons/eth.svg" 
            alt="ETH" 
            width={20} 
            height={20}
          />
          <span className={styles.currencyValue}>{formatETH(player.ethBalance)}</span>
        </div>
      </div>
    </div>
  );
}
