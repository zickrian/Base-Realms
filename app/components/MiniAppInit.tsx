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

    console.log('[MiniAppInit] Component mounted');
    console.log('[MiniAppInit] SDK object:', sdk);
    console.log('[MiniAppInit] SDK.actions:', sdk?.actions);
    
    // Expose SDK globally for inline script fallback
    if (typeof window !== 'undefined') {
      (window as any).miniappSdk = sdk;
      console.log('[MiniAppInit] SDK exposed to window.miniappSdk');
    }

    let mounted = true;

    const initMiniApp = async () => {
      try {
        console.log('[MiniAppInit] Calling ready()...');
        
        // Call ready() to hide splash screen
        await sdk.actions.ready();
        console.log('[MiniAppInit] ✅ Ready SUCCESS');
      } catch (error) {
        console.error('[MiniAppInit] ❌ Ready FAILED:', error);
      }
    };

    initMiniApp();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
