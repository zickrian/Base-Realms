"use client";

import { ReactNode, useEffect } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { sdk } from "@farcaster/miniapp-sdk";
import "@coinbase/onchainkit/styles.css";

export function RootProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    const hideSplash = async () => {
      try {
        // Wait for first paint so content is visible before hiding splash
        await new Promise((r) => requestAnimationFrame(() => r(undefined)));
        if (cancelled) return;
        await sdk.actions.ready();
      } catch {
        // Safe to ignore if not running inside Farcaster MiniApp
      }
    };

    hideSplash();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "dark",
          theme: "default",
        },
        // Wallet configuration removed to prevent popup dialogs
        // Transactions will use native wallet UI instead of modal popups
      }}
      miniKit={{
        enabled: true,
        autoConnect: false, // CRITICAL FIX: Prevent auto-reconnect after logout
        notificationProxyUrl: undefined,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
