"use client";

import { useMemo, useState, useEffect, memo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import Image from "next/image";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import { WalletPopup } from "./WalletPopup";
import { IDRX_TOKEN_ADDRESS, BASE_CHAIN_ID, formatIDRXBalance } from "@/app/lib/blockchain/tokenConfig";

import styles from "./HeaderBar.module.css";

interface HeaderBarProps {
  onSettingsClick?: () => void;
}

export const HeaderBar = memo(function HeaderBar({ onSettingsClick }: HeaderBarProps) {
  const { address, isConnected, status, connector } = useAccount();
  const [isWalletPopupOpen, setIsWalletPopupOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Detect if in miniapp (iframe)
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;

  // Force initial mount detection
  useEffect(() => {
    setMounted(true);
  }, []);

  // Only fetch balance when fully connected (not connecting)
  const shouldFetchBalance = isConnected && !!address && status === 'connected';

  // Enhanced query options for embedded contexts
  const balanceQuery = useMemo(
    () => {
      if (!isEmbedded) {
        return {
          enabled: shouldFetchBalance,
        };
      }
      
      return {
        enabled: shouldFetchBalance,
        refetchInterval: 12_000, // Poll every 12s in miniapp
        refetchOnMount: true,
        staleTime: 0,
        gcTime: 0,
      };
    },
    [isEmbedded, shouldFetchBalance]
  );

  const { data: ethBalanceData, refetch: refetchEth } = useBalance({
    address,
    chainId: BASE_CHAIN_ID,
    query: balanceQuery,
  });

  const { data: idrxBalanceData, refetch: refetchIdrx } = useBalance({
    address,
    token: IDRX_TOKEN_ADDRESS,
    chainId: BASE_CHAIN_ID,
    query: balanceQuery,
  });

  // Force refetch on mount in embedded contexts - ONLY ONCE
  useEffect(() => {
    if (mounted && isEmbedded && shouldFetchBalance) {
      console.log('[HeaderBar] Miniapp - initial balance fetch', {
        address: address?.slice(0, 6) + '...' + address?.slice(-4),
        connector: connector?.name,
        status,
      });
      refetchEth();
      refetchIdrx();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]); // ONLY run once on mount

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
