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
import { getGameIconUrl } from '@/app/utils/supabaseStorage';
import styles from './SwapMenu.module.css';

interface SwapMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// IDRX token address on Base
const IDRX_TOKEN_ADDRESS = "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22" as const;

// ETH token definition - Using same icon as HeaderBar
const ETH_TOKEN: Token = {
  address: '',
  chainId: BASE_CHAIN_ID,
  decimals: 18,
  name: 'Ethereum',
  symbol: 'ETH',
  image: getGameIconUrl('ethereum.png'),
};

// IDRX token definition - Using same icon as HeaderBar
const IDRX_TOKEN: Token = {
  address: IDRX_TOKEN_ADDRESS,
  chainId: BASE_CHAIN_ID,
  decimals: IDRX_DECIMALS, // Using shared constant (2 decimals)
  name: 'IDRX',
  symbol: 'IDRX',
  image: getGameIconUrl('IDRX.png'),
};

const swappableTokens: Token[] = [ETH_TOKEN, IDRX_TOKEN];

export const SwapMenu = ({ isOpen, onClose }: SwapMenuProps) => {
  const { address, isConnected } = useAccount();
  const [swapKey, setSwapKey] = React.useState(0);
  const [isSwapping, setIsSwapping] = React.useState(false);
  
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
      console.log('[SwapMenu] Opening swap menu - refetching balances...');
      refetchEthBalance();
      refetchIdrxBalance();
      // Force Swap component to remount with fresh balance data
      setSwapKey(prev => prev + 1);
      setIsSwapping(false);
    }
  }, [isOpen, isConnected, address, refetchEthBalance, refetchIdrxBalance]);

  // Log balance data for debugging
  useEffect(() => {
    if (isConnected && address) {
      const ethBalance = ethBalanceData ? parseFloat(formatUnits(ethBalanceData.value, ethBalanceData.decimals)) : 0;
      const idrxBalance = idrxBalanceData ? parseFloat(formatUnits(idrxBalanceData.value, idrxBalanceData.decimals)) : 0;
      
      console.log('[SwapMenu] Current balances:', {
        ethBalance: ethBalance.toFixed(6),
        idrxBalance: idrxBalance.toFixed(2),
        address,
      });
    }
  }, [ethBalanceData, idrxBalanceData, isConnected, address]);

  // Listen for swap events
  useEffect(() => {
    const handleSwapStart = () => {
      console.log('[SwapMenu] Swap transaction started');
      setIsSwapping(true);
    };

    const handleSwapSuccess = () => {
      console.log('[SwapMenu] Swap transaction successful');
      setIsSwapping(false);
      // Refetch balances after successful swap
      setTimeout(() => {
        refetchEthBalance();
        refetchIdrxBalance();
      }, 2000);
    };

    const handleSwapError = (error: Event) => {
      console.error('[SwapMenu] Swap transaction failed:', error);
      setIsSwapping(false);
    };

    window.addEventListener('swap-start', handleSwapStart);
    window.addEventListener('swap-success', handleSwapSuccess);
    window.addEventListener('swap-error', handleSwapError);

    return () => {
      window.removeEventListener('swap-start', handleSwapStart);
      window.removeEventListener('swap-success', handleSwapSuccess);
      window.removeEventListener('swap-error', handleSwapError);
    };
  }, [refetchEthBalance, refetchIdrxBalance]);

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
              {isSwapping && (
                <div className={styles.swappingIndicator}>
                  <div className={styles.spinner}></div>
                  <p>Processing swap transaction...</p>
                </div>
              )}
              
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
                  Swap ETH to IDRX or vice versa. Powered by Coinbase OnchainKit.
                </div>
                <div className={styles.infoText} style={{ marginTop: '0.5rem', fontSize: '1rem', color: '#8b5a2b' }}>
                  Works in both browser and miniapp environments.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
