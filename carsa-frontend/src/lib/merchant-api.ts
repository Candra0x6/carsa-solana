// API client functions for merchant management

import { 
  RegisterMerchantForm, 
  UpdateMerchantForm, 
  ProcessPurchaseForm,
  MerchantRegistrationResult,
  MerchantUpdateResult,
  PurchaseResult,
  ApiResponse 
} from '@/types/merchant';

const API_BASE_URL = '/api/anchor';

/**
 * Register a new merchant
 */
export async function registerMerchant(
  merchantData: RegisterMerchantForm,
  idempotencyKey?: string
): Promise<ApiResponse<MerchantRegistrationResult>> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/anchor/register-merchant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...merchantData,
        idempotencyKey,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return result;
  } catch (error) {
    console.error('Failed to register merchant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Update an existing merchant
 */
export async function updateMerchant(
  updateData: UpdateMerchantForm,
  idempotencyKey?: string
): Promise<ApiResponse<MerchantUpdateResult>> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/anchor/update-merchant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...updateData,
        idempotencyKey,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return result;
  } catch (error) {
    console.error('Failed to update merchant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Process a customer purchase
 */
export async function processPurchase(
  purchaseData: ProcessPurchaseForm,
  idempotencyKey?: string
): Promise<ApiResponse<PurchaseResult>> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/anchor/process-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...purchaseData,
        idempotencyKey,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return result;
  } catch (error) {
    console.error('Failed to process purchase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Generate a unique idempotency key for operations
 */
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate Solana wallet address format
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    // Basic validation - should be base58 and 32-44 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  } catch {
    return false;
  }
}

/**
 * Format transaction signature for display
 */
export function formatTxSignature(signature: string, length: number = 16): string {
  if (signature.length <= length) return signature;
  return `${signature.slice(0, length / 2)}...${signature.slice(-length / 2)}`;
}

/**
 * Format wallet address for display
 */
export function formatWalletAddress(address: string, length: number = 8): string {
  if (address.length <= length) return address;
  return `${address.slice(0, length / 2)}...${address.slice(-length / 2)}`;
}
