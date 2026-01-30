"use client";

import { ReactNode, useEffect } from "react";
import { base } from "wagmi/chains";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { sdk } from "@farcaster/miniapp-sdk";
import { wagmiConfig } from "./lib/wagmi";
import "@coinbase/onchainkit/styles.css";

// Create QueryClient instance
const queryClient = new QueryClient();

export function RootProvider({ children }: { children: ReactNode }) {
  // Farcaster miniapp: call ready() when interface is loaded to hide splash (miniapps.farcaster.xyz/docs/guides/loading)
  // "Don't call ready until your interface has loaded" - wait for fonts & first paint to avoid jitter
  useEffect(() => {
    let cancelled = false;

    const initializeMiniApp = async () => {
      try {
        console.log('[MiniApp] Waiting for interface to load...');
        
        // Wait for fonts to prevent layout shift (critical for avoiding jitter)
        if (document.fonts) {
          await document.fonts.ready;
          console.log('[MiniApp] Fonts loaded');
        }
        
        // Wait for first paint (ensure content is visible)
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (cancelled) return;
        
        // Wait one more frame to ensure no content reflow
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (cancelled) return;
        
        // Interface is ready - call ready() to hide splash and display app
        await sdk.actions.ready();
        console.log('[MiniApp] ✅ Ready called successfully - splash hidden');
      } catch (error) {
        // Log error but don't crash - app should still work in browser
        console.error('[MiniApp] ❌ Failed to call ready():', error);
        console.log('[MiniApp] App will continue (not in Farcaster context or SDK error)');
      }
    };

    initializeMiniApp();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            appearance: {
              mode: "dark",
              theme: "default",
            },
          }}
          miniKit={{
            enabled: true,
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
