"use client";

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAccount } from 'wagmi';
import {
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
  SwapToast,
} from '@coinbase/onchainkit/swap';
import type { Token } from '@coinbase/onchainkit/token';
import styles from './page.module.css';

// IDRX token address on Base
const IDRX_TOKEN_ADDRESS = "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22" as const;

// ETH token definition
const ETH_TOKEN: Token = {
  address: '',
  chainId: 8453,
  decimals: 18,
  name: 'Ethereum',
  symbol: 'ETH',
  image: 'https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png',
};

// IDRX token definition
const IDRX_TOKEN: Token = {
  address: IDRX_TOKEN_ADDRESS,
  chainId: 8453,
  decimals: 18,
  name: 'IDRX',
  symbol: 'IDRX',
  image: 'https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/IDRX.png',
};

const swappableTokens: Token[] = [ETH_TOKEN, IDRX_TOKEN];

function SwapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected } = useAccount();

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.replace('/');
    }
  }, [isConnected, router]);

  const handleBack = () => {
    const from = searchParams.get('from');
    if (from === 'shop') {
      router.push('/shop');
    } else {
      router.push('/home');
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.paperCard} bit16-container`}>
        {/* Header with Back Button */}
        <div className={styles.header}>
          <button className={`${styles.backButton} bit16-button has-green-background`} onClick={handleBack}>
            <ArrowLeft size={24} />
          </button>
          <div className={styles.title}>Swap</div>
          <div className={styles.spacer} />
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
                <Swap experimental={{ useAggregator: true }}>
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
}

export default function SwapPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={`${styles.paperCard} bit16-container`}>
          <div className={styles.content}>
            <div className={styles.notConnectedMessage}>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <SwapContent />
    </Suspense>
  );
}
