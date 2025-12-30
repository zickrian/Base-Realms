"use client";

import { useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import { LandingContent } from "./components/LandingContent";
import { HomeRedirect } from "./components/HomeRedirect";
import { LoadingState } from "./components/LoadingState";
import { useGameStore } from "./stores/gameStore";

export default function Home() {
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const { isConnected, isConnecting } = useAccount();
  const { isInitialized, isLoading } = useGameStore();

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  // Show loading state while connecting wallet
  if (isConnecting) {
    return <LoadingState />;
  }

  // CRITICAL: Only redirect to home if connected AND all data is fully initialized AND not loading
  // This prevents showing home page before data is ready
  if (isConnected && isInitialized && !isLoading) {
    return <HomeRedirect />;
  }

  // Show landing page for all other cases:
  // - Not connected: show connect button
  // - Connected but loading: show loading state with progress
  // - Connected but not initialized: start fetch process
  return <LandingContent />;
}
