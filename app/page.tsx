"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import { LandingContent } from "./components/LandingContent";
import { useGameStore } from "./stores/gameStore";

export default function Home() {
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const { isConnected, isConnecting, address } = useAccount();
  const { isInitialized, isLoading, initializeGameData, reset } = useGameStore();
  const initRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Initialize MiniKit
  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  // Handle wallet disconnection - show logout screen then reset
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      // If was previously connected, show logout animation
      if (wasConnectedRef.current) {
        setIsLoggingOut(true);
        // Show logout message for 1.5 seconds then reset
        setTimeout(() => {
          reset();
          initRef.current = false;
          setIsLoggingOut(false);
        }, 1500);
      } else {
        reset();
        initRef.current = false;
      }
    }
    // Track connection state
    if (isConnected) {
      wasConnectedRef.current = true;
    }
  }, [isConnected, isConnecting, reset]);

  // Redirect function
  const redirectToHome = useCallback(() => {
    window.location.href = "/home";
  }, []);

  // PRIORITY 1: Redirect immediately if already connected and initialized
  useEffect(() => {
    if (isConnected && address && isInitialized && !isLoading) {
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
          redirectToHome();
        })
        .catch(err => {
          console.error('Login or data fetch failed:', err);
          initRef.current = false;
        });
    }
  }, [isConnected, address, isInitialized, isLoading, initializeGameData, redirectToHome]);

  return <LandingContent isLoggingOut={isLoggingOut} />;
}
