/**
 * Utility functions for handling QR codes in the frontend
 */

export interface MerchantQRData {
  type: 'merchant_payment';
  merchantId: string;
  walletAddress: string;
  name: string;
  cashbackRate: number;
  timestamp: string;
}

/**
 * Parse QR code data from a scanned string
 */
export function parseQRCodeData(qrString: string): MerchantQRData | null {
  try {
    const parsed = JSON.parse(qrString);
    
    // Validate structure
    if (
      parsed.type === 'merchant_payment' &&
      typeof parsed.merchantId === 'string' &&
      typeof parsed.walletAddress === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.cashbackRate === 'number' &&
      typeof parsed.timestamp === 'string'
    ) {
      return parsed as MerchantQRData;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate if a QR code is for merchant payment
 */
export function isMerchantPaymentQR(qrString: string): boolean {
  const parsed = parseQRCodeData(qrString);
  return parsed !== null && parsed.type === 'merchant_payment';
}

/**
 * Format cashback rate for display (e.g., 500 -> "5%")
 */
export function formatCashbackRate(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(1)}%`;
}

/**
 * Get merchant display info from QR data
 */
export function getMerchantDisplayInfo(qrData: MerchantQRData) {
  return {
    name: qrData.name,
    cashback: formatCashbackRate(qrData.cashbackRate),
    walletAddress: qrData.walletAddress,
    merchantId: qrData.merchantId,
    generatedAt: new Date(qrData.timestamp).toLocaleDateString()
  };
}

/**
 * Validate Solana wallet address format
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    // Basic validation - Solana addresses are base58 and typically 32-44 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  } catch {
    return false;
  }
}
