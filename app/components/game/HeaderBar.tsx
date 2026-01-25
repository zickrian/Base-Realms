"use client";

import { useMemo, useState, useEffect, memo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import Image from "next/image";
import { getGameIconUrl } from "../../utils/supabaseStorage";

import styles from "./HeaderBar.module.css";

interface HeaderBarProps {
  onSettingsClick?: () => void;
}

const IDRX_TOKEN_ADDRESS = "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22" as const;
const BASE_CHAIN_ID = 8453;

export const HeaderBar = memo(function HeaderBar({ onSettingsClick }: HeaderBarProps) {
  const { address, isConnected } = useAccount();

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
    if (value === 0) return "0.000000";
    if (value < 0.000001) return value.toExponential(2);
    return value.toFixed(6);
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
    if (value === 0) return "0.000000";
    if (value < 0.000001) return value.toExponential(2);
    return value.toFixed(6);
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={styles.header}>
        <div style={{ width: 48, height: 48 }}></div>
      </div>
    );
  }

  return (
    <div className={styles.header}>
      <button
        className={styles.menuButton}
        onClick={onSettingsClick}
        aria-label="Open Settings"
      >
        {/* SVG Background */}
        <Image
          src="/game/icons/Untitled-1.svg"
          alt="Menu"
          width={48}
          height={48}
          className={styles.menuBg}
        />

        {/* Burger Overlay (Light & Thin to match SVG style) */}
        <span className={styles.burgerOverlay}>
          <span className={styles.burgerLine}></span>
          <span className={styles.burgerLine}></span>
          <span className={styles.burgerLine}></span>
        </span>
      </button>

      <div className={styles.currencySection}>
        <div className={styles.currencyItem}>
          <Image src={getGameIconUrl("ethereum.png")} alt="ETH" width={20} height={20} />
          <span className={styles.currencyValue}>{formatETH(ethBalance)}</span>
        </div>
        <div className={styles.currencyItem}>
          <Image src={getGameIconUrl("IDRX.png")} alt="IDRX" width={20} height={20} />
          <span className={styles.currencyValue}>{formatIDRX(idrxBalance)}</span>
        </div>
        <button
          className={styles.topupButton}
          onClick={() => console.log("Topup QRIS clicked")}
          aria-label="Topup QRIS"
        >
          <Image
            src="/button/image.png"
            alt="QRIS Topup"
            width={48}
            height={48}
            className={styles.topupImage}
          />
        </button>
      </div>
    </div>
  );
});
