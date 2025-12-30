"use client";

import { useEffect, useState } from "react";
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
  const [hasStartedFetch, setHasStartedFetch] = useState(false);

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  // Handle wallet disconnection - reset store and stay on landing page
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      // User disconnected wallet, reset all game data
      reset();
      setHasStartedFetch(false);
    }
  }, [isConnected, isConnecting, reset]);

  // Start fetching data when wallet is connected
  useEffect(() => {
    if (isConnected && address && !hasStartedFetch && !isInitialized && !isLoading) {
      setHasStartedFetch(true);
      
      // Call login API then initialize game data
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })
        .then(() => initializeGameData(address))
        .catch(err => {
          console.error('Login or data fetch failed:', err);
          // Reset on error so user can retry
          setHasStartedFetch(false);
        });
    }
  }, [isConnected, address, hasStartedFetch, isInitialized, isLoading, initializeGameData]);

  // Redirect to home ONLY when all data is ready
  useEffect(() => {
    if (isConnected && address && isInitialized && !isLoading && hasStartedFetch) {
      // All data loaded, redirect to home
      router.push("/home");
    }
  }, [isConnected, address, isInitialized, isLoading, hasStartedFetch, router]);

  // Always show LandingContent - it will handle the UI states
  return <LandingContent />;
}
