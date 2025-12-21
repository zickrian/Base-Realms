"use client";

import { useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import { LandingContent } from "./components/LandingContent";
import { HomeRedirect } from "./components/HomeRedirect";
import { LoadingState } from "./components/LoadingState";

export default function Home() {
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const { isConnected, isConnecting } = useAccount();

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  // Show loading state while connecting
  if (isConnecting) {
    return <LoadingState />;
  }

  // Redirect to home if connected
  if (isConnected) {
    return <HomeRedirect />;
  }

  // Show landing page if not connected
  return <LandingContent />;
}
