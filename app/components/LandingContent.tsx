"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import styles from "./LandingContent.module.css";

// Direct Supabase URL for logo
const LOGO_URL = "https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/logos.png";

interface LandingContentProps {
  isLoggingOut?: boolean;
  initError?: string | null;
  loadingStep?: 'connecting' | 'initializing' | 'loading' | 'ready';
}

export function LandingContent({ isLoggingOut = false, initError = null, loadingStep = 'connecting' }: LandingContentProps) {
  const { isConnected, address } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [loadingMessage, setLoadingMessage] = useState("Connecting...");
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // Debug: Log available connectors
  useEffect(() => {
    console.log('[LandingContent] Available connectors:', connectors.map(c => ({ name: c.name, id: c.id })));
  }, [connectors]);

  // Update loading message based on loadingStep
  useEffect(() => {
    if (isLoggingOut) {
      setLoadingMessage("Logging out... See you soon!");
    } else if (initError) {
      setLoadingMessage("Connection failed. Please try again.");
    } else if (loadingStep === 'connecting') {
      setLoadingMessage("Connecting wallet...");
    } else if (loadingStep === 'initializing') {
      setLoadingMessage("Loading your profile...");
    } else if (loadingStep === 'loading') {
      setLoadingMessage("Loading game data...");
    } else if (loadingStep === 'ready') {
      setLoadingMessage("Ready! Entering game...");
    }
  }, [isLoggingOut, initError, loadingStep]);

  // Handle wallet connection
  const handleConnect = (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId);
    if (connector) {
      console.log('[LandingContent] Connecting with:', connector.name);
      connect({ connector });
      setShowWalletOptions(false);
    }
  };

  // Show logout screen
  if (isLoggingOut) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logoSection}>
            <Image
              src={LOGO_URL}
              alt="Logo"
              width={150}
              height={150}
              className={styles.logo}
              priority
              unoptimized
            />
          </div>
          <div className={styles.welcomeSection}>
            <h1 className={styles.welcomeText}>Goodbye!</h1>
            <p className={styles.subtitle}>{loadingMessage}</p>
          </div>
          <div className={styles.loadingDots}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen only when fully connected
  if (isConnected && address) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logoSection}>
            <Image
              src={LOGO_URL}
              alt="Logo"
              width={150}
              height={150}
              className={styles.logo}
              priority
              unoptimized
            />
          </div>
          <div className={styles.welcomeSection}>
            <h1 className={styles.welcomeText}>
              {initError ? "Oops!" : "Welcome Home!"}
            </h1>
            <p className={styles.subtitle}>{loadingMessage}</p>
          </div>
          {initError ? (
            <div className={styles.buttonSection}>
              <button
                className={styles.connectButton}
                onClick={() => disconnect()}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className={styles.loadingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show connect wallet form when disconnected
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoSection}>
          <Image
            src={LOGO_URL}
            alt="Logo"
            width={150}
            height={150}
            className={styles.logo}
            priority
            unoptimized
          />
        </div>

        <div className={styles.welcomeSection}>
          <h1 className={styles.welcomeText}>Welcome to the Game!</h1>
          <p className={styles.subtitle}>Connect your wallet to start playing</p>
        </div>

        <div className={styles.buttonSection}>
          {!showWalletOptions ? (
            <button
              className={styles.connectButton}
              onClick={() => {
                // Try to connect with first available non-Farcaster connector for browser
                const browserConnector = connectors.find(c => 
                  c.id === 'coinbaseWalletSDK' || c.id === 'io.metamask'
                );
                if (browserConnector) {
                  handleConnect(browserConnector.id);
                } else {
                  // Fallback: show all options
                  setShowWalletOptions(true);
                }
              }}
              disabled={isPending}
            >
              {isPending ? 'Connecting...' : 'Connect & Play'}
            </button>
          ) : (
            <div className={styles.walletOptions}>
              {connectors
                .filter(connector => connector.id !== 'farcasterMiniApp') // Hide Farcaster connector in browser
                .map((connector) => (
                  <button
                    key={connector.id}
                    className={styles.walletOption}
                    onClick={() => handleConnect(connector.id)}
                    disabled={isPending}
                  >
                    {connector.name}
                  </button>
                ))}
              <button
                className={styles.walletOptionCancel}
                onClick={() => setShowWalletOptions(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className={styles.alternativeSection}>
          <button
            className={styles.alternativeLink}
            onClick={() => setShowWalletOptions(!showWalletOptions)}
          >
            {showWalletOptions ? 'hide options' : 'use another wallet'}
          </button>
        </div>

        <div className={styles.recommendationSection}>
          <p className={styles.recommendationTitle}>
            ...or don&apos;t have a wallet yet?
          </p>
          <p className={styles.recommendationText}>
            We recommend{" "}
            <a
              href="https://www.coinbase.com/wallet"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.coinbaseLink}
            >
              Coinbase Smart Wallet
            </a>
          </p>
          <p className={styles.benefitsText}>
            Lower transaction costs, convenience, and stronger security
          </p>
        </div>
      </div>
    </div>
  );
}
