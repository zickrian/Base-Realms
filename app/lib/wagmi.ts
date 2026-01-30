import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

/**
 * Custom Wagmi configuration for Farcaster MiniApp
 * 
 * CRITICAL: This config uses the Farcaster MiniApp connector which:
 * - Connects to the user's Farcaster wallet (NOT MetaMask)
 * - Uses sdk.wallet.getEthereumProvider() under the hood
 * - Prevents wallet connect loops in embedded contexts
 * 
 * @see https://miniapps.farcaster.xyz/docs/guides/wallets
 */
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // Farcaster MiniApp connector - uses sdk.wallet.getEthereumProvider()
    farcasterMiniApp(),
  ],
  transports: {
    [base.id]: http(),
  },
  // Enable SSR for Next.js
  ssr: true,
});
