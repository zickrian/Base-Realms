"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import {
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
  SwapToast,
} from '@coinbase/onchainkit/swap';
import type { Token } from '@coinbase/onchainkit/token';
import { BASE_CHAIN_ID, IDRX_DECIMALS } from '@/app/lib/blockchain/tokenConfig';
import styles from './SwapMenu.module.css';

interface SwapMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// IDRX token address on Base
const IDRX_TOKEN_ADDRESS = "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22" as const;

// ETH token definition
const ETH_TOKEN: Token = {
  address: '',
  chainId: BASE_CHAIN_ID,
  decimals: 18,
  name: 'Ethereum',
  symbol: 'ETH',
  image: 'https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png',
};

// IDRX token definition
const IDRX_TOKEN: Token = {
  address: IDRX_TOKEN_ADDRESS,
  chainId: BASE_CHAIN_ID,
  decimals: IDRX_DECIMALS, // Using shared constant (2 decimals)
  name: 'IDRX',
  symbol: 'IDRX',
  image: 'https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/IDRX.png',
};

const swappableTokens: Token[] = [ETH_TOKEN, IDRX_TOKEN];

export const SwapMenu = ({ isOpen, onClose }: SwapMenuProps) => {
  const { address, isConnected } = useAccount();
  const [swapKey, setSwapKey] = React.useState(0);
  
  // Fetch balances to ensure they're available for the swap component
  const { data: ethBalanceData, refetch: refetchEthBalance } = useBalance({
    address: address,
    chainId: BASE_CHAIN_ID,
  });

  const { data: idrxBalanceData, refetch: refetchIdrxBalance } = useBalance({
    address: address,
    token: IDRX_TOKEN_ADDRESS,
    chainId: BASE_CHAIN_ID,
  });

  // Refetch balances and force re-render when the swap menu opens
  useEffect(() => {
    if (isOpen && isConnected && address) {
      console.log('[SwapMenu] Refetching balances and forcing re-render...');
      refetchEthBalance();
      refetchIdrxBalance();
      // Force Swap component to remount with fresh balance data
      setSwapKey(prev => prev + 1);
    }
  }, [isOpen, isConnected, address, refetchEthBalance, refetchIdrxBalance]);

  // Log balance data for debugging
  useEffect(() => {
    if (isConnected && address) {
      const ethBalance = ethBalanceData ? parseFloat(formatUnits(ethBalanceData.value, ethBalanceData.decimals)) : 0;
      const idrxBalance = idrxBalanceData ? parseFloat(formatUnits(idrxBalanceData.value, idrxBalanceData.decimals)) : 0;
      
      console.log('[SwapMenu] Balance data:', {
        ethBalance,
        idrxBalance,
        ethBalanceData,
        idrxBalanceData,
      });
    }
  }, [ethBalanceData, idrxBalanceData, isConnected, address]);

  return (
    <div className={styles.container} style={{ display: isOpen ? 'flex' : 'none' }}>
      <div className={`${styles.menuBox} bit16-container`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Swap</div>
          <button className={`${styles.closeButton} bit16-button has-red-background`} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Swap Content */}
        <div className={styles.content}>
          {!isConnected ? (
            <div className={styles.notConnectedMessage}>
              <p>Please connect your wallet to swap tokens</p>
            </div>
          ) : (
            <>
              <div className={styles.swapWrapper}>
                <Swap key={swapKey} experimental={{ useAggregator: true }}>
                  <div className={styles.swapContainer}>
                    <div className={styles.inputWrapper}>
                      <SwapAmountInput
                        label="Sell"
                        swappableTokens={swappableTokens}
                        token={ETH_TOKEN}
                        type="from"
                      />
                    </div>

                    <div className={styles.toggleContainer}>
                      <SwapToggleButton />
                    </div>

                    <div className={styles.inputWrapper}>
                      <SwapAmountInput
                        label="Buy"
                        swappableTokens={swappableTokens}
                        token={IDRX_TOKEN}
                        type="to"
                      />
                    </div>

                    <div className={styles.swapButtonContainer}>
                      <SwapButton />
                    </div>

                    <SwapMessage />
                  </div>
                  <SwapToast />
                </Swap>
              </div>

              <div className={styles.infoSection}>
                <div className={styles.infoTitle}>Info</div>
                <div className={styles.infoText}>
                  Swap ETH to IDRX or vice versa. Powered by Coinbase.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
