"use client";

import { useEffect, useRef } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { LandingContent } from "./components/LandingContent";
import { useGameStore } from "./stores/gameStore";

export default function Home() {
  const router = useRouter();
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const { isConnected, isConnecting, address } = useAccount();
  const { isInitialized, isLoading, initializeGameData, reset } = useGameStore();
  const initRef = useRef(false);

  // Initialize MiniKit
  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  // Handle wallet disconnection - reset store and stay on landing page
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      reset();
      initRef.current = false;
    }
  }, [isConnected, isConnecting, reset]);

  // Start fetching data when wallet is connected
  useEffect(() => {
    // Only start fetch if:
    // 1. Wallet is connected with address
    // 2. Not already initialized
    // 3. Not currently loading
    // 4. Haven't started init yet (prevent double fetch)
    if (isConnected && address && !isInitialized && !isLoading && !initRef.current) {
      initRef.current = true;
      
      // Call login API then initialize game data
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })
        .then(() => initializeGameData(address))
        .catch(err => {
          console.error('Login or data fetch failed:', err);
          initRef.current = false;
        });
    }
  }, [isConnected, address, isInitialized, isLoading, initializeGameData]);

  // Redirect to home ONLY when fully initialized
  useEffect(() => {
    // Only redirect when:
    // 1. Wallet is connected
    // 2. Data is fully initialized (isInitialized = true)
    // 3. Not currently loading anymore
    if (isConnected && address && isInitialized && !isLoading) {
      router.push("/home");
    }
  }, [isConnected, address, isInitialized, isLoading, router]);

  // Always show LandingContent - it handles all UI states
  return <LandingContent />;
}
