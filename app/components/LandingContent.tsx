"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Wallet, ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useAccount } from "wagmi";
import { getGameIconUrl } from "../utils/supabaseStorage";
import { useGameStore } from "../stores/gameStore";
import styles from "./LandingContent.module.css";

export function LandingContent() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Connecting...");
  const { isInitialized, isLoading: storeLoading, initializeGameData } = useGameStore();
  const [hasStartedFetch, setHasStartedFetch] = useState(false);

  // Step 1: Start fetching when wallet is connected
  useEffect(() => {
    if (isConnected && address && !hasStartedFetch && !isInitialized) {
      setIsLoading(true);
      setHasStartedFetch(true);
      setLoadingMessage("Connecting wallet...");
      
      // Step 1: Call login API
      fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      })
      .then(async () => {
        setLoadingMessage("Loading your profile...");
        
        // Small delay to show the message
        await new Promise(resolve => setTimeout(resolve, 300));
        setLoadingMessage("Loading quests and inventory...");
        
        // Step 2: Initialize and fetch ALL game data
        // This will fetch: profile, quests, settings, card packs, inventory
        await initializeGameData(address);
        // initializeGameData will set isInitialized to true when done
        
        setLoadingMessage("Almost ready...");
      })
      .catch(err => {
        console.error('Login or data fetch failed:', err);
        setLoadingMessage("Error loading. Retrying...");
        // Retry once after error
        setTimeout(() => {
          setIsLoading(false);
          setHasStartedFetch(false);
        }, 2000);
      });
    }
  }, [isConnected, address, hasStartedFetch, isInitialized, initializeGameData]);

  // Step 2: Redirect to home ONLY after all data is fetched and initialized
  useEffect(() => {
    // CRITICAL: Only redirect when ALL conditions are met:
    // 1. Wallet is connected
    // 2. Address exists
    // 3. Data is initialized (all fetches completed)
    // 4. Store is not loading anymore
    // 5. Fetch process has started (prevents premature redirect)
    if (isConnected && address && isInitialized && !storeLoading && hasStartedFetch) {
      setLoadingMessage("Ready! Entering game...");
      // All data is now fetched and cached in the store
      // Small delay to show "Ready" message, then redirect
      setTimeout(() => {
        router.push("/home");
      }, 500);
    }
  }, [isConnected, address, isInitialized, storeLoading, hasStartedFetch, router]);

  // Show connected state with loading message
  // This screen shows while we're fetching all game data
  if (isConnected && (isLoading || !isInitialized || storeLoading)) {
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
