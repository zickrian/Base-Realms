const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 * Served at /.well-known/farcaster.json (withValidManifest normalizes to "miniapp" in response).
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
    iconUrl: `${ROOT_URL}/game/icons/pedang.svg`,
    homeUrl: ROOT_URL,
    imageUrl: `${ROOT_URL}/bgmantap.png`,
    buttonTitle: "Play Now",
    splashImageUrl: `${ROOT_URL}/bgmantap.png`,
    splashBackgroundColor: "#000000",
    webhookUrl: `${ROOT_URL}/api/webhook`,
    heroImageUrl: `${ROOT_URL}/bgmantap.png`,
    ogImageUrl: `${ROOT_URL}/bgmantap.png`,
    description:
      "Base Realms is a Web3 pixel-art battle game on the Base network. Players mint or acquire NFT characters, fight AI enemies in turn-based combat, and earn on-chain rewards.",
    subtitle:
      "Mint characters, enter battles, and compete for on-chain rewards on Base.",
    primaryCategory: "games",
    tags: ["base", "nft", "arena", "game", "battle"],
    ogDescription:
      "Mint NFT characters, enter turn-based battles, and compete for on-chain rewards. Play on Base.",
    ogTitle: "Base Realms",
    tagline: "Get Real Rewards!",
  },
} as const;
