import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

let client: NeynarAPIClient | null = null;

/**
 * Server-side Neynar API client (singleton).
 * Set NEYNAR_API_KEY in .env.local.
 */
export function getNeynarClient(): NeynarAPIClient | null {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!client) {
    const config = new Configuration({ apiKey });
    client = new NeynarAPIClient(config);
  }
  return client;
}
