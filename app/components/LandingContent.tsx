"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Wallet, ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useAccount } from "wagmi";
import { getGameIconUrl } from "../utils/supabaseStorage";
import { useGameStore } from "../stores/gameStore";
import styles from "./LandingContent.module.css";

interface LandingContentProps {
  isLoggingOut?: boolean;
}

export function LandingContent({ isLoggingOut = false }: LandingContentProps) {
  const { isConnected, isConnecting, address } = useAccount();
  const { isInitialized, isLoading: storeLoading } = useGameStore();
  const [loadingMessage, setLoadingMessage] = useState("Connecting...");

  // Update loading message based on state
  useEffect(() => {
    if (isLoggingOut) {
      setLoadingMessage("Logging out... See you soon!");
    } else if (isConnecting) {
      setLoadingMessage("Connecting wallet...");
    } else if (isConnected && address) {
      if (!isInitialized && !storeLoading) {
        setLoadingMessage("Preparing your adventure...");
      } else if (storeLoading) {
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
      } else if (isInitialized && !storeLoading) {
        setLoadingMessage("Ready! Entering game...");
      }
    }
  }, [isLoggingOut, isConnecting, isConnected, address, isInitialized, storeLoading]);

  // Show logout screen
  if (isLoggingOut) {
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

  // Show connect wallet form when disconnected
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
