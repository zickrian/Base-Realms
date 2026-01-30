"use client";

import { useMemo, useState, useEffect, memo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import Image from "next/image";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import { WalletPopup } from "./WalletPopup";
import { IDRX_TOKEN_ADDRESS, BASE_CHAIN_ID, formatIDRXBalance } from "@/app/lib/blockchain/tokenConfig";
import { useAppContext } from "@/app/hooks/useAppContext";

import styles from "./HeaderBar.module.css";

interface HeaderBarProps {
  onSettingsClick?: () => void;
}

export const HeaderBar = memo(function HeaderBar({ onSettingsClick }: HeaderBarProps) {
  const { address, isConnected } = useAccount();
  const [isWalletPopupOpen, setIsWalletPopupOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isInMiniApp: isEmbedded } = useAppContext();

  // Force initial mount detection
  useEffect(() => {
    setMounted(true);
  }, []);

  // Enhanced query options for embedded contexts
  const balanceQuery = useMemo(
    () => {
      if (!isEmbedded) return undefined;
      
      return {
        refetchInterval: 12_000,
        // Force refetch on mount in embedded contexts to prevent stale cache
        refetchOnMount: true,
        // Don't use cached data in embedded contexts
        staleTime: 0,
        gcTime: 0,
      };
    },
    [isEmbedded]
  );

  const { data: ethBalanceData, refetch: refetchEth } = useBalance({
    address: address,
    chainId: BASE_CHAIN_ID,
    query: balanceQuery,
  });

  const { data: idrxBalanceData, refetch: refetchIdrx } = useBalance({
    address: address,
    token: IDRX_TOKEN_ADDRESS,
    chainId: BASE_CHAIN_ID,
    query: balanceQuery,
  });

  // Force refetch on mount in embedded contexts
  useEffect(() => {
    if (mounted && isEmbedded && isConnected && address) {
      console.log('[HeaderBar] Embedded context - forcing balance refetch on mount');
      refetchEth();
      refetchIdrx();
    }
  }, [mounted, isEmbedded, isConnected, address, refetchEth, refetchIdrx]);

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
        <Image
          src="/button/buttonatas.svg"
          alt="Menu"
          width={48}
          height={48}
          className={styles.menuBg}
        />
      </button>

      <div className={styles.currencySection}>
        {/* Two boxes: balancenew.svg per box (3.6px per unit) */}
        <div
          className={styles.currencyItem}
          onClick={() => setIsWalletPopupOpen(true)}
        >
          <div className={styles.balanceBox}>
            <Image src={getGameIconUrl("ethereum.png")} alt="ETH" width={14} height={14} />
            <span className={styles.currencyValue}>{formatETH(ethBalance)}</span>
          </div>
          <div className={styles.balanceBox}>
            <Image src={getGameIconUrl("IDRX.png")} alt="IDRX" width={14} height={14} />
            <span className={styles.currencyValue}>{formatIDRXBalance(idrxBalance)}</span>
          </div>
        </div>
      </div>

      {/* Wallet Popup */}
      {isConnected && address && (
        <WalletPopup
          isOpen={isWalletPopupOpen}
          onClose={() => setIsWalletPopupOpen(false)}
          ethBalance={ethBalance}
          idrxBalance={idrxBalance}
          walletAddress={address}
        />
      )}
    </div>
  );
});
