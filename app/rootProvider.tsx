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
  // SIMPLE: Just call ready() directly in useEffect
  useEffect(() => {
    console.log('[RootProvider] Mounted');
    console.log('[RootProvider] SDK:', sdk);
    
    sdk.actions.ready()
      .then(() => console.log('[RootProvider] ✅ ready() SUCCESS'))
      .catch((err) => console.error('[RootProvider] ❌ ready() FAILED:', err));
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
