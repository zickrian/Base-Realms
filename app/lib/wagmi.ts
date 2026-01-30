import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { coinbaseWallet, injected } from 'wagmi/connectors';

/**
 * Custom Wagmi configuration for BOTH Farcaster MiniApp AND Browser
 * 
 * CONNECTORS:
 * 1. farcasterMiniApp() - For Farcaster/Base App (uses sdk.wallet.getEthereumProvider())
 * 2. coinbaseWallet() - For browser (Coinbase Smart Wallet)
 * 3. injected() - For browser (MetaMask, etc.)
 * 
 * The Farcaster connector will only work in miniapp context.
 * In browser, it will fallback to Coinbase Wallet or injected wallets.
 * 
 * @see https://miniapps.farcaster.xyz/docs/guides/wallets
 * @see https://docs.base.org/onchainkit/latest/configuration/wagmi-viem-integration
 */
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // 1. Farcaster MiniApp connector (only works in miniapp)
    farcasterMiniApp(),
    
    // 2. Coinbase Smart Wallet (for browser)
    coinbaseWallet({
      appName: 'Base Realms',
      preference: 'smartWalletOnly', // Force smart wallet only
      version: '4',
    }),
    
    // 3. Injected wallets (MetaMask, etc. - for browser)
    injected(),
  ],
  transports: {
    [base.id]: http(),
  },
  // Enable SSR for Next.js
  ssr: true,
});
