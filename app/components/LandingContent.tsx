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

  // Update loading message based on state
  useEffect(() => {
    if (isConnecting) {
      setLoadingMessage("Connecting wallet...");
    } else if (isConnected && !isInitialized && storeLoading) {
      setLoadingMessage("Loading your profile...");
      
      // Update message after a delay
      const timer1 = setTimeout(() => {
        setLoadingMessage("Loading quests and inventory...");
      }, 1000);
      
      const timer2 = setTimeout(() => {
        setLoadingMessage("Almost ready...");
      }, 2000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else if (isConnected && isInitialized && !storeLoading) {
      setLoadingMessage("Ready! Entering game...");
    }
  }, [isConnecting, isConnected, isInitialized, storeLoading]);

  // Show loading state when connecting or fetching data
  if (isConnecting || (isConnected && (!isInitialized || storeLoading))) {
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

  // Show connect wallet form (when not connected or after logout)
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
