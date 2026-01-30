"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { LandingContent } from "../components/LandingContent";
import { useGameStore } from "../stores/gameStore";

/** Detect if running in embedded context (Base Mini App, Farcaster) */
function useIsEmbedded() {
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => {
    setEmbedded(typeof window !== "undefined" && window.self !== window.top);
  }, []);
  return embedded;
}

export default function Login() {
  const router = useRouter();
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const { isConnected, isConnecting, address } = useAccount();
  const { isInitialized, isLoading, initializeGameData, reset, profile, quests, cardPacks, inventory, dailyPackCount, currentStage } = useGameStore();
  const initRef = useRef(false);
  const redirectedRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const addressRef = useRef<string | null>(null);
  const sessionVerifiedRef = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<'connecting' | 'initializing' | 'loading' | 'ready'>('connecting');
  const isEmbedded = useIsEmbedded();

  // Clear wallet state on mount with enhanced embedded context handling
  useEffect(() => {
    console.log('[Login] Initializing - Embedded:', isEmbedded);

    if (typeof window !== 'undefined') {
      // Check if user properly navigated from landing page
      const fromLanding = sessionStorage.getItem('fromLandingPage');

      if (fromLanding) {
        console.log('[Login] Fresh navigation from landing - ready for clean connect');
        sessionStorage.removeItem('fromLandingPage');
      }

      // In embedded contexts, aggressively clear cache to prevent stale state
      if (isEmbedded) {
        console.log('[Login] Embedded context detected - clearing all cached state');
        
        // Clear ALL localStorage (except wallet SDK internal keys)
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('wagmi.') || key.startsWith('game-')) {
            localStorage.removeItem(key);
            console.log(`[Login] Cleared embedded cache: ${key}`);
          }
        });
        
        // Clear session storage completely
        sessionStorage.clear();
        
        // Reset game store to ensure clean state
        reset();
        initRef.current = false;
        sessionVerifiedRef.current = false;
      } else {
        // Standard browser: only clear wagmi keys
        const keysToRemove = [
          'wagmi.recentConnectorId',
          'wagmi.connected',
          'wagmi.wallet',
          'wagmi.store',
          'wagmi.cache',
        ];

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });

        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('wagmi.')) {
            localStorage.removeItem(key);
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Initialize MiniKit once
  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  // Memoized init function with session verification for embedded contexts
  const handleInitialize = useCallback(async (walletAddr: string) => {
    // CRITICAL: Prevent initialization if logout is in progress
    if (isLoggingOut) {
      console.log('[Login] Blocked initialization - logout in progress');
      return;
    }

    // Prevent duplicate initialization
    if (initRef.current) return;
    initRef.current = true;

    // Normalize wallet address to lowercase for consistent comparison
    const normalizedAddress = walletAddr.toLowerCase();
    addressRef.current = normalizedAddress;
    setInitError(null);

    try {
      // In embedded contexts, verify session first to prevent stale cached state
      if (isEmbedded && !sessionVerifiedRef.current) {
        console.log('[Login] Embedded context - verifying session validity');
        
        const verifyRes = await fetch('/api/auth/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: normalizedAddress }),
        });

        if (verifyRes.ok) {
          const { valid, isRecent } = await verifyRes.json();
          
          if (!valid || !isRecent) {
            console.log('[Login] Session invalid or stale - forcing fresh login');
            // Session is stale, force full re-authentication
            sessionVerifiedRef.current = false;
            
            // Clear all cached state
            reset();
            if (typeof window !== 'undefined') {
              sessionStorage.clear();
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('wagmi.') || key.startsWith('game-')) {
                  localStorage.removeItem(key);
                }
              });
            }
          } else {
            console.log('[Login] Session verified as valid');
            sessionVerifiedRef.current = true;
          }
        }
      }

      // Login (creates or updates session)
      console.log('[Login] Calling login endpoint');
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: normalizedAddress }),
      });

      if (!loginRes.ok) {
        const errorData = await loginRes.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(errorData.error || 'Login failed');
      }

      // Mark session as verified after successful login
      sessionVerifiedRef.current = true;

      // Then initialize game data with normalized address
      console.log('[Login] Initializing game data');
      await initializeGameData(normalizedAddress);
      
      console.log('[Login] Initialization complete');
    } catch (err) {
      console.error('Initialization failed:', err);
      setInitError(err instanceof Error ? err.message : 'Failed to initialize');
      initRef.current = false;
      addressRef.current = null;
      sessionVerifiedRef.current = false;
    }
  }, [initializeGameData, isLoggingOut, isEmbedded, reset]);

  // Handle wallet disconnection - minimal cleanup, let wagmi handle it
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      if (wasConnectedRef.current) {
        console.log('[Login] Wallet disconnected - showing logout screen');
        setIsLoggingOut(true);

        // MINIMAL cleanup - only critical keys
        if (typeof window !== 'undefined') {
          localStorage.removeItem('wagmi.recentConnectorId');
          localStorage.removeItem('wagmi.connected');
          sessionStorage.clear();
        }

        // REDUCED timeout from 800ms to 400ms for better mobile UX
        // Prevents race condition with rapid reconnect
        setTimeout(() => {
          reset();
          initRef.current = false;
          redirectedRef.current = false;
          addressRef.current = null;
          setInitError(null);
          setIsLoggingOut(false);
        }, 400); // Reduced from 800ms for faster mobile experience
      } else {
        // Quick cleanup if never connected
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

    // Check if all critical data is loaded (including new preloaded data)
    const allDataReady =
      profile !== null &&
      Array.isArray(quests) &&
      Array.isArray(cardPacks) &&
      Array.isArray(inventory) &&
      dailyPackCount !== undefined &&
      currentStage !== undefined; // Can be null but should be defined

    if (allDataReady) {
      setLoadingStep('ready');
    } else {
      setLoadingStep('loading');
    }
  }, [isConnected, address, isInitialized, isLoading, profile, quests, cardPacks, inventory, dailyPackCount, currentStage]);

  // Redirect when all data is ready - only once
  useEffect(() => {
    if (loadingStep === 'ready' && !redirectedRef.current) {
      redirectedRef.current = true;
      console.log('[Login] All data ready, redirecting to home...');
      console.log('[Login] - Profile:', profile);
      console.log('[Login] - Quests:', quests?.length);
      console.log('[Login] - Card Packs:', cardPacks?.length);
      console.log('[Login] - Inventory:', inventory?.length);
      console.log('[Login] - Daily Packs:', dailyPackCount);
      console.log('[Login] - Current Stage:', currentStage?.name);
      // Small delay to ensure all state is settled
      const timer = setTimeout(() => {
        router.replace("/home");
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loadingStep, profile, quests, cardPacks, inventory, dailyPackCount, currentStage, router]);

  // Start fetching data when wallet is connected but not initialized
  useEffect(() => {
    // CRITICAL: Block initialization if logout is in progress or already redirected
    if (redirectedRef.current || isLoggingOut) {
      return;
    }

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
      // Normalize address before initialization
      const normalizedAddress = address.toLowerCase();
      handleInitialize(normalizedAddress);
    }
  }, [isConnected, address, isInitialized, isLoading, initError, handleInitialize, isLoggingOut]);

  return <LandingContent isLoggingOut={isLoggingOut} initError={initError} loadingStep={loadingStep} />;
}