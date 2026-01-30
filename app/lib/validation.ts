/**
 * Validation Helper Library
 * 
 * Provides secure input validation functions for API endpoints.
 * All user inputs should be validated before use.
 */

/**
 * Normalizes an Ethereum wallet address to lowercase
 * This ensures consistent address comparison across the application
 * @param address - The wallet address to normalize
 * @returns Normalized lowercase address, or null if invalid
 */
export function normalizeWalletAddress(address: string | null | undefined): string | null {
  if (!address || typeof address !== 'string') return null;
  
  // Validate format first
  if (!isValidEthAddress(address)) {
    console.warn('[Validation] Invalid wallet address format:', address);
    return null;
  }
  
  return address.toLowerCase();
}

/**
 * Validates Ethereum address format
 * @param address - The address to validate
 * @returns true if valid Ethereum address (0x + 40 hex chars)
 */
export function isValidEthAddress(address: unknown): address is string {
  if (typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates UUID v4 format
 * @param id - The UUID to validate
 * @returns true if valid UUID format
 */
export function isValidUUID(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Validates that a value is a positive integer (including 0)
 * @param value - The value to validate
 * @returns true if value is a non-negative integer
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Validates that a value is a positive integer (excluding 0)
 * @param value - The value to validate
 * @returns true if value is a positive integer > 0
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Validates that a string is in a whitelist of allowed values
 * @param value - The value to check
 * @param whitelist - Array of allowed values
 * @returns true if value is in whitelist
 */
export function isInWhitelist<T extends string>(value: unknown, whitelist: readonly T[]): value is T {
  return typeof value === 'string' && whitelist.includes(value as T);
}

/**
 * Validates transaction hash format (0x + 64 hex chars)
 * @param hash - The transaction hash to validate
 * @returns true if valid transaction hash format
 */
export function isValidTxHash(hash: unknown): hash is string {
  if (typeof hash !== 'string') return false;
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validates that a string is not empty and within max length
 * @param value - The string to validate
 * @param maxLength - Maximum allowed length (default 255)
 * @returns true if valid non-empty string within length
 */
export function isValidString(value: unknown, maxLength: number = 255): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

/**
 * Sanitizes error message for production
 * Returns generic message in production, detailed message in development
 * @param error - The error object or message
 * @param genericMessage - Message to show in production
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(
  error: unknown, 
  genericMessage: string = 'An error occurred'
): string {
  if (process.env.NODE_ENV === 'development') {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return genericMessage;
  }
  return genericMessage;
}

/**
 * Safe JSON parse with error handling
 * @param jsonString - The JSON string to parse
 * @returns Parsed object or null if invalid
 */
export function safeJsonParse<T = unknown>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

/**
 * Validates wallet address from request header
 * @param walletAddress - The wallet address from header
 * @returns Object with isValid flag and normalized address
 */
export function validateWalletHeader(walletAddress: string | null): 
  | { isValid: true; address: string; error?: never }
  | { isValid: false; address: null; error: string } 
{
  if (!walletAddress) {
    return { isValid: false, address: null, error: 'Wallet address is required' };
  }
  
  if (!isValidEthAddress(walletAddress)) {
    return { isValid: false, address: null, error: 'Invalid wallet address format' };
  }
  
  return { isValid: true, address: walletAddress.toLowerCase() };
}

/**
 * Development-only logger
 * Only logs in development environment
 */
export const devLog = {
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Errors are always logged but sanitized in production
    if (process.env.NODE_ENV === 'development') {
      console.error(...args);
    } else {
      // In production, log only non-sensitive error info
      console.error('[Error]', new Date().toISOString());
    }
  },
};
