"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Wallet, ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useAccount } from "wagmi";
import { getGameIconUrl } from "../utils/supabaseStorage";
import styles from "./LandingContent.module.css";

export function LandingContent() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isConnected && !isRedirecting) {
      setIsRedirecting(true);
      // Wait 1 second then redirect to home
      const timer = setTimeout(() => {
        router.push("/home");
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, isRedirecting, router]);

  // Show connected state with redirect message
  if (isConnected) {
    return (
      <div className={`${styles.container} ${isRedirecting ? styles.fadeOut : ''}`}>
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
            <p className={styles.subtitle}>You are now connected.</p>
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
