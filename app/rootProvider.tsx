"use client";
import { ReactNode } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";

export function RootProvider({ children }: { children: ReactNode }) {
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
        autoConnect: false, // CHANGED: Disable auto-connect to prevent wallet popup on landing
        notificationProxyUrl: undefined,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
