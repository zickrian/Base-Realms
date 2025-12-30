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
  const redirectRef = useRef(false);

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
      redirectRef.current = false;
    }
  }, [isConnected, isConnecting, reset]);

  // Redirect to home when wallet is connected and data is ready
  useEffect(() => {
    if (isConnected && address && isInitialized && !isLoading && !redirectRef.current) {
      redirectRef.current = true;
      router.replace("/home");
    }
  }, [isConnected, address, isInitialized, isLoading, router]);

  // Start fetching data when wallet is connected but not initialized
  useEffect(() => {
    if (isConnected && address && !isInitialized && !isLoading && !initRef.current) {
      initRef.current = true;
      
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

  return <LandingContent />;
}
