"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Wallet, ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useAccount } from "wagmi";
import { getGameIconUrl } from "../utils/supabaseStorage";
import { useGameStore } from "../stores/gameStore";
import styles from "./LandingContent.module.css";

export function LandingContent() {
  const { isConnected, isConnecting } = useAccount();
  const { isInitialized, isLoading: storeLoading } = useGameStore();
  const [loadingMessage, setLoadingMessage] = useState("Connecting...");

  // Determine if we should show loading screen
  // Show loading when:
  // 1. Wallet is connecting
  // 2. Wallet connected but data not initialized yet
  // 3. Wallet connected and currently loading data
  const showLoading = isConnecting || (isConnected && (!isInitialized || storeLoading));

  // Update loading message based on state
  useEffect(() => {
    if (isConnecting) {
      setLoadingMessage("Connecting wallet...");
    } else if (isConnected && !isInitialized && !storeLoading) {
      // Connected but init hasn't started yet
      setLoadingMessage("Preparing your adventure...");
    } else if (isConnected && storeLoading) {
      // Currently loading data
      setLoadingMessage("Loading your profile...");
      
      const timer1 = setTimeout(() => {
        setLoadingMessage("Loading quests and inventory...");
      }, 1500);
      
      const timer2 = setTimeout(() => {
        setLoadingMessage("Almost ready...");
      }, 3000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else if (isConnected && isInitialized) {
      // All done, about to redirect
      setLoadingMessage("Ready! Entering game...");
    }
  }, [isConnecting, isConnected, isInitialized, storeLoading]);

  // Show loading state
  if (showLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logoSection}>
            <Image
              src={getGameIconUrl("logos.png")}
              alt="Logo"
              width={500}
              height={500}
              className={styles.logo}
              priority
            />
          </div>
          <div className={styles.welcomeSection}>
            <h1 className={styles.welcomeText}>Welcome Home!</h1>
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

  // Show connect wallet form ONLY when not connected
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <Image
            src={getGameIconUrl("logos.png")}
            alt="Logo"
            width={500}
            height={500}
            className={styles.logo}
            priority
          />
        </div>

        {/* Welcome Message */}
        <div className={styles.welcomeSection}>
          <h1 className={styles.welcomeText}>Welcome to the Game!</h1>
          <p className={styles.subtitle}>Connect your wallet to start playing</p>
        </div>

        {/* Connect Button */}
        <div className={styles.buttonSection}>
          <Wallet>
            <ConnectWallet
              className={styles.connectButton}
              disconnectedLabel="Connect & Play"
            />
          </Wallet>
        </div>

        {/* Alternative Wallet Link */}
        <div className={styles.alternativeSection}>
          <a href="#" className={styles.alternativeLink}>
            use another wallet
          </a>
        </div>

        {/* Wallet Recommendation Section */}
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
