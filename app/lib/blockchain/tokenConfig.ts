/**
 * Shared Token Configuration
 * 
 * Centralized constants for token addresses and amounts used across the app.
 * This ensures consistency between HeaderBar, BattlePreparation, and other components.
 * 
 * @module tokenConfig
 */

/** IDRX Token Contract Address on Base Network */
export const IDRX_TOKEN_ADDRESS = '0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22' as const;

/** Base Network Chain ID */
export const BASE_CHAIN_ID = 8453 as const;

/** Battle fee amount in IDRX (human-readable) */
export const BATTLE_FEE_IDRX = 5;

/** IDRX Token decimals */
export const IDRX_DECIMALS = 2;

/**
 * Check if balance is sufficient for battle
 * @param balance - Balance in human-readable format (e.g., 100.00)
 * @returns true if balance >= BATTLE_FEE_IDRX
 */
export function hasEnoughIDRXForBattle(balance: number): boolean {
    return balance >= BATTLE_FEE_IDRX;
}

/**
 * Format IDRX balance for display
 * @param value - Balance value
 * @returns Formatted string with 6 decimal places
 */
export function formatIDRXBalance(value: number): string {
    if (value === 0) return '0.00';
    if (value < 0.01) return value.toFixed(6);
    return value.toFixed(2);
}
