/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 * Served at /.well-known/farcaster.json (withValidManifest normalizes to "miniapp" in response).
 * All URLs are exact (https://baserealms.app) — no ROOT_URL template.
 *
 * @see {@link https://docs.base.org/mini-apps/features/manifest}
 */
export const minikitConfig = {
  accountAssociation: {
    header:
      "eyJmaWQiOjEwMjM5NTAsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg3OTJEMjQ3MjI2Y0Y0Y2MxMjk3OERFNkFhQmEzOTQ3OWNCMTk1NDJCIn0",
    payload: "eyJkb21haW4iOiJiYXNlcmVhbG1zLmFwcCJ9",
    signature:
      "Gw9+suh/tw4eXSyd4OvJRYSXa28s1bw8FDvc7IKyUps5Vmx+FoXlwyidyaOE9l9muqwN4wDmpbo8+lVZUxE+thw=",
  },
  baseBuilder: {
    ownerAddress: "",
  },
  miniapp: {
    version: "1",
    name: "Base Realms",
    iconUrl: "https://baserealms.app/BR.png",
    homeUrl: "https://baserealms.app",
    imageUrl: "https://baserealms.app/bgmantap.png",
    buttonTitle: "Play Now",
    splashImageUrl: "https://baserealms.app/bgmantap.png",
    splashBackgroundColor: "#000000",
    webhookUrl: "https://baserealms.app/api/webhook",
    heroImageUrl: "https://baserealms.app/bgmantap.png",
    ogImageUrl: "https://baserealms.app/bgmantap.png",
    description:
      "Base Realms is a Web3 pixel-art battle game on the Base network.",
    subtitle: "RPG Game on Base",
    primaryCategory: "games",
    tags: ["base", "nft", "arena", "game", "battle"],
    ogDescription:
      "Mint NFT characters, enter turn-based battles, and compete for on-chain rewards. Play on Base.",
    ogTitle: "Base Realms",
    tagline: "Get Real Rewards!",
  },
} as const;
