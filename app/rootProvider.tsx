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
  // Call ready() to hide splash per docs.base.org & miniapps.farcaster.xyz
  useEffect(() => {
    console.log('[DEBUG] RootProvider mounted, calling ready()');
    console.log('[DEBUG] SDK object:', sdk);
    console.log('[DEBUG] SDK actions:', sdk.actions);
    
    sdk.actions.ready()
      .then(() => {
        console.log('[DEBUG] ✅ ready() SUCCESS');
      })
      .catch((error) => {
        console.error('[DEBUG] ❌ ready() FAILED:', error);
      });
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
