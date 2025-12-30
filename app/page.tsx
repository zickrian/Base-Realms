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
  const { isInitialized } = useGameStore();

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  // Show loading state while connecting
  if (isConnecting) {
    return <LoadingState />;
  }

  // Only redirect to home if connected AND data is already initialized
  // If connected but not initialized, LandingContent will handle the fetch and redirect
  if (isConnected && isInitialized) {
    return <HomeRedirect />;
  }

  // Show landing page if not connected OR if connected but data not yet fetched
  // LandingContent will handle the fetch process and redirect when ready
  return <LandingContent />;
}
