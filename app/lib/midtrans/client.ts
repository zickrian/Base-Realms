/**
 * Midtrans API Client
 * 
 * Handles communication with Midtrans Core API for QRIS payments
 */

import { MIDTRANS_CONFIG, MIDTRANS_API_URL, validateMidtransConfig } from './config';
import crypto from 'crypto';

export interface QRISChargeRequest {
  payment_type: 'qris';
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  qris: {
    acquirer: 'gopay' | 'airpay shopee' | 'linkaja';
  };
}

export interface QRISChargeResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  currency: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status: string;
  actions: Array<{
    name: string;
    method: string;
    url: string;
  }>;
  expiry_time: string;
  acquirer?: string;
  qr_string?: string; // Raw QRIS string for scanning
}

export interface TransactionStatusResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: 'pending' | 'settlement' | 'expire' | 'deny' | 'cancel';
  fraud_status: string;
  expiry_time?: string;
}

export class MidtransClient {
  private readonly serverKey: string;
  private readonly isProduction: boolean;
  private readonly baseUrl: string;

  constructor() {
    validateMidtransConfig();
    this.serverKey = MIDTRANS_CONFIG.serverKey;
    this.isProduction = MIDTRANS_CONFIG.isProduction;
    this.baseUrl = MIDTRANS_API_URL;
  }

  /**
   * Get authorization header for API requests
   */
  private getAuthHeader(): string {
    const encoded = Buffer.from(`${this.serverKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * Create QRIS payment charge
   * 
   * @param orderId - Unique order identifier
   * @param amount - Amount in IDR (integer)
   * @returns QRISChargeResponse with QRIS string
   */
  async createQRISCharge(orderId: string, amount: number): Promise<QRISChargeResponse> {
    const payload: QRISChargeRequest = {
      payment_type: 'qris',
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      qris: {
        acquirer: 'airpay shopee', // Use 'airpay shopee' for Other QRIS (not GoPay)
      },
    };

    const response = await fetch(`${this.baseUrl}/v2/charge`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Midtrans API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data: QRISChargeResponse = await response.json();
    return data;
  }

  /**
   * Get transaction status
   * 
   * @param orderId - Order ID to check
   * @returns Transaction status response
   */
  async getTransactionStatus(orderId: string): Promise<TransactionStatusResponse> {
    const response = await fetch(`${this.baseUrl}/v2/${orderId}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Midtrans status check error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data: TransactionStatusResponse = await response.json();
    return data;
  }

  /**
   * Verify webhook notification signature
   * 
   * @param orderId - Order ID
   * @param statusCode - Status code from notification
   * @param grossAmount - Gross amount from notification
   * @param signatureKey - Signature from notification
   * @returns true if signature is valid
   */
  verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string
  ): boolean {
    const input = `${orderId}${statusCode}${grossAmount}${this.serverKey}`;
    const hash = crypto.createHash('sha512').update(input).digest('hex');
    return hash === signatureKey;
  }
}

export const midtransClient = new MidtransClient();
