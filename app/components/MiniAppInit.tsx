"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

/**
 * Component to initialize Farcaster MiniApp and hide splash screen.
 * Must be mounted after providers are ready.
 */
export function MiniAppInit() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    let mounted = true;

    const initMiniApp = async () => {
      try {
        console.log('[MiniApp] Initializing...');
        
        // Small delay to ensure providers are mounted
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mounted) return;
        
        // Call ready() to hide splash screen
        await sdk.actions.ready();
        console.log('[MiniApp] ✅ Ready called - splash hidden');
      } catch (error) {
        console.error('[MiniApp] ❌ Ready failed:', error);
      }
    };

    initMiniApp();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
