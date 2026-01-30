/**
 * Midtrans Configuration
 * 
 * Centralized configuration for Midtrans payment gateway integration
 */

export const MIDTRANS_CONFIG = {
  merchantId: process.env.MIDTRANS_MERCHANT_ID || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  environment: process.env.MIDTRANS_ENVIRONMENT || 'sandbox',
  isProduction: process.env.MIDTRANS_ENVIRONMENT === 'production',
} as const;

export const MIDTRANS_API_URL = MIDTRANS_CONFIG.isProduction
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';

export const MIDTRANS_SNAP_URL = MIDTRANS_CONFIG.isProduction
  ? 'https://app.midtrans.com'
  : 'https://app.sandbox.midtrans.com';

// Validate configuration
export function validateMidtransConfig(): void {
  const required = ['merchantId', 'clientKey', 'serverKey'];
  const missing = required.filter(key => !MIDTRANS_CONFIG[key as keyof typeof MIDTRANS_CONFIG]);
  
  if (missing.length > 0) {
    throw new Error(`Missing Midtrans configuration: ${missing.join(', ')}`);
  }
}
