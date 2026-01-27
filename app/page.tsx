"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { LandingContent } from "./components/LandingContent";
import { useGameStore } from "./stores/gameStore";

export default function Home() {
  const router = useRouter();
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const { isConnected, isConnecting, address } = useAccount();
  const { isInitialized, isLoading, initializeGameData, reset, profile, quests, cardPacks, inventory } = useGameStore();
  const initRef = useRef(false);
  const redirectedRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const addressRef = useRef<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<'connecting' | 'initializing' | 'loading' | 'ready'>('connecting');

  // Initialize MiniKit once
  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  // Memoized init function to prevent re-creation
  const handleInitialize = useCallback(async (walletAddr: string) => {
    // Prevent duplicate initialization
    if (initRef.current) return;
    initRef.current = true;
    addressRef.current = walletAddr;
    setInitError(null);

    try {
      // Login first
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletAddr }),
      });

      if (!loginRes.ok) {
        throw new Error('Login failed');
      }

      // Then initialize game data
      await initializeGameData(walletAddr);
    } catch (err) {
      console.error('Initialization failed:', err);
      setInitError(err instanceof Error ? err.message : 'Failed to initialize');
      initRef.current = false;
      addressRef.current = null;
    }
  }, [initializeGameData]);

  // Handle wallet disconnection - show logout screen then reset
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      if (wasConnectedRef.current) {
        setIsLoggingOut(true);
        setTimeout(() => {
          reset();
          initRef.current = false;
          redirectedRef.current = false;
          addressRef.current = null;
          setInitError(null);
          setIsLoggingOut(false);
        }, 1500);
      } else {
        reset();
        initRef.current = false;
        redirectedRef.current = false;
        addressRef.current = null;
        setInitError(null);
      }
    }
    if (isConnected) {
      wasConnectedRef.current = true;
    }
  }, [isConnected, isConnecting, reset]);

  // Update loading step based on data status
  useEffect(() => {
    if (!isConnected || !address) {
      setLoadingStep('connecting');
      return;
    }

    if (!isInitialized || isLoading) {
      setLoadingStep('initializing');
      return;
    }

    // Check if all critical data is loaded
    const allDataReady =
      profile !== null &&
      Array.isArray(quests) &&
      Array.isArray(cardPacks) &&
      Array.isArray(inventory);

    if (allDataReady) {
      setLoadingStep('ready');
    } else {
      setLoadingStep('loading');
    }
  }, [isConnected, address, isInitialized, isLoading, profile, quests, cardPacks, inventory]);

  // Redirect when all data is ready - only once
  useEffect(() => {
    if (loadingStep === 'ready' && !redirectedRef.current) {
      redirectedRef.current = true;
      console.log('[Landing] All data ready, redirecting to home...');
      console.log('[Landing] - Profile:', profile);
      console.log('[Landing] - Quests:', quests?.length);
      console.log('[Landing] - Card Packs:', cardPacks?.length);
      console.log('[Landing] - Inventory:', inventory?.length);
      // Small delay to ensure all state is settled
      const timer = setTimeout(() => {
        router.replace("/home");
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loadingStep, profile, quests, cardPacks, inventory, router]);

  // Start fetching data when wallet is connected but not initialized
  useEffect(() => {
    // Only initialize if:
    // 1. Connected with address
    // 2. Not yet initialized
    // 3. Not currently loading
    // 4. Haven't started init yet
    // 5. No error
    if (
      isConnected && 
      address && 
      !isInitialized && 
      !isLoading && 
      !initRef.current && 
      !initError
    ) {
      handleInitialize(address);
    }
  }, [isConnected, address, isInitialized, isLoading, initError, handleInitialize]);

  return <LandingContent isLoggingOut={isLoggingOut} initError={initError} loadingStep={loadingStep} />;
}
