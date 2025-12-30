"use client";

import { useEffect, useRef, useCallback } from "react";
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

  // Handle wallet disconnection - reset store
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      reset();
      initRef.current = false;
    }
  }, [isConnected, isConnecting, reset]);

  // Redirect function
  const redirectToHome = useCallback(() => {
    window.location.href = "/home";
  }, []);

  // PRIORITY 1: Redirect immediately if already connected and initialized
  useEffect(() => {
    if (isConnected && address && isInitialized && !isLoading) {
      // Use window.location for guaranteed redirect
      redirectToHome();
    }
  }, [isConnected, address, isInitialized, isLoading, redirectToHome]);

  // PRIORITY 2: Start fetching data when wallet is connected but not initialized
  useEffect(() => {
    if (isConnected && address && !isInitialized && !isLoading && !initRef.current) {
      initRef.current = true;
      
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })
        .then(() => initializeGameData(address))
        .then(() => {
          // Force redirect after data is loaded
          redirectToHome();
        })
        .catch(err => {
          console.error('Login or data fetch failed:', err);
          initRef.current = false;
        });
    }
  }, [isConnected, address, isInitialized, isLoading, initializeGameData, redirectToHome]);

  return <LandingContent />;
}
