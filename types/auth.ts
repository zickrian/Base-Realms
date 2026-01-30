/**
 * Authentication types for wallet verification
 * Supports both Base App Wallet and Farcaster wallet types
 */

/**
 * Wallet types supported by the application
 * - base_app: Wallet provided by Base App (custody wallet)
 * - farcaster: User's connected Farcaster wallet (non-custody)
 */
export type WalletType = 'base_app' | 'farcaster' | 'unknown';

/**
 * JWT payload structure from Farcaster Quick Auth
 * Extended to include wallet type information
 */
export interface FarcasterJwtPayload {
  /** Farcaster ID */
  sub: string;
  /** Issued at timestamp */
  iat?: number;
  /** Expiration timestamp */
  exp?: number;
  /** Wallet type (custody = Base App, non-custody = Farcaster) */
  type?: 'custody' | string;
  /** Additional custom claims */
  [key: string]: unknown;
}

/**
 * Authentication response with wallet type detection
 */
export interface AuthVerificationResult {
  userFid: string;
  walletType: WalletType;
  /** Raw JWT payload for additional context */
  payload?: FarcasterJwtPayload;
}

/**
 * Detects wallet type from JWT payload
 * Base App uses custody wallets, Farcaster uses non-custody wallets
 */
export function detectWalletType(payload: FarcasterJwtPayload): WalletType {
  // Check if type field exists and indicates custody wallet (Base App)
  if (payload.type === 'custody') {
    return 'base_app';
  }
  
  // If type exists but is not custody, it's likely a Farcaster wallet
  if (payload.type && payload.type !== 'custody') {
    return 'farcaster';
  }
  
  // If no type field, cannot determine wallet type
  return 'unknown';
}
