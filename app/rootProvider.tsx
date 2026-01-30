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
  // Initialize Farcaster SDK - call ready() to hide splash screen
  useEffect(() => {
    let cancelled = false;

    const initializeSdk = async () => {
      try {
        // Wait for first paint so content is visible before hiding splash
        await new Promise((r) => requestAnimationFrame(() => r(undefined)));
        if (cancelled) return;
        
        // CRITICAL: Call ready() to hide splash screen and display content
        await sdk.actions.ready();
        console.log('[RootProvider] Farcaster SDK ready');
      } catch (error) {
        console.log('[RootProvider] Not in Farcaster context:', error);
        // Safe to ignore if not running inside Farcaster MiniApp
      }
    };

    initializeSdk();
    
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
