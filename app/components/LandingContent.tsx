"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Wallet, ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useAccount } from "wagmi";
import styles from "./LandingContent.module.css";

// Direct Supabase URL for logo
const LOGO_URL = "https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/logos.png";

interface LandingContentProps {
  isLoggingOut?: boolean;
  initError?: string | null;
  loadingStep?: 'connecting' | 'initializing' | 'loading' | 'ready';
}

export function LandingContent({ isLoggingOut = false, initError = null, loadingStep = 'connecting' }: LandingContentProps) {
  const { isConnected, isConnecting, address } = useAccount();
  const [loadingMessage, setLoadingMessage] = useState("Connecting...");

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

  // Show loading screen when connecting or connected
  if (isConnecting || (isConnected && address)) {
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
              <Wallet>
                <ConnectWallet
                  className={styles.connectButton}
                  disconnectedLabel="Try Again"
                />
              </Wallet>
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
          <Wallet>
            <ConnectWallet
              className={styles.connectButton}
              disconnectedLabel="Connect & Play"
            />
          </Wallet>
        </div>

        <div className={styles.alternativeSection}>
          <a href="#" className={styles.alternativeLink}>
            use another wallet
          </a>
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
