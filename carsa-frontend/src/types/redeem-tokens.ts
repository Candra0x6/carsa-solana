/**
 * Type definitions and interfaces for token redemption
 */

export interface RedeemTokensParams {
  /** The wallet address of the merchant where tokens are being redeemed */
  merchantWalletAddress: string;
  
  /** Amount of LOKAL tokens to redeem (in smallest units, considering 9 decimals) */
  tokenAmount: number;
  
  /** The fiat value equivalent in IDR (Indonesian Rupiah) */
  fiatValue: number;
  
  /** Discount rate in basis points (e.g., 500 = 5%) */
  discountRate: number;
  
  /** Unique 32-byte transaction identifier */
  transactionId: Uint8Array;
}

export interface RedemptionResult {
  /** Transaction signature returned by Solana */
  signature: string;
  
  /** Amount of tokens redeemed */
  tokenAmount: number;
  
  /** Fiat value of the redemption */
  fiatValue: number;
  
  /** Applied discount rate */
  discountRate: number;
  
  /** Transaction ID used */
  transactionId: number[];
}

/**
 * Utility functions for token redemption
 */
export class TokenRedemptionUtils {
  /**
   * Convert LOKAL tokens to smallest units (considering 9 decimals)
   */
  static tokensToSmallestUnits(tokens: number): number {
    return tokens * 1_000_000_000;
  }

  /**
   * Convert smallest units back to LOKAL tokens
   */
  static smallestUnitsToTokens(smallestUnits: number): number {
    return smallestUnits / 1_000_000_000;
  }

  /**
   * Generate a cryptographically secure transaction ID
   */
  static generateTransactionId(): Uint8Array {
    const transactionId = new Uint8Array(32);
    crypto.getRandomValues(transactionId);
    return transactionId;
  }

  /**
   * Validate discount rate (must be between 0 and 10000 basis points)
   */
  static validateDiscountRate(discountRate: number): boolean {
    return discountRate >= 0 && discountRate <= 10_000;
  }

  /**
   * Convert basis points to percentage
   */
  static basisPointsToPercentage(basisPoints: number): number {
    return basisPoints / 100;
  }

  /**
   * Convert percentage to basis points
   */
  static percentageToBasisPoints(percentage: number): number {
    return Math.round(percentage * 100);
  }

  /**
   * Validate token amount (must be positive and within limits)
   */
  static validateTokenAmount(amount: number): boolean {
    const MAX_REDEMPTION_AMOUNT = 5_000_000_000_000; // 5,000 tokens with 9 decimals
    return amount > 0 && amount <= MAX_REDEMPTION_AMOUNT;
  }

  /**
   * Validate fiat value (must be positive)
   */
  static validateFiatValue(value: number): boolean {
    return value > 0;
  }

  /**
   * Format redemption details for display
   */
  static formatRedemptionDetails(params: RedeemTokensParams) {
    return {
      tokenAmount: this.smallestUnitsToTokens(params.tokenAmount).toFixed(2),
      fiatValue: params.fiatValue.toLocaleString('id-ID'),
      discountPercentage: this.basisPointsToPercentage(params.discountRate).toFixed(2),
      merchantAddress: params.merchantWalletAddress,
    };
  }
}

/**
 * Example redemption scenarios
 */
export const REDEMPTION_EXAMPLES = {
  /** Small purchase redemption (25 LOKAL) */
  smallPurchase: {
    tokenAmount: TokenRedemptionUtils.tokensToSmallestUnits(25),
    fiatValue: 12_500, // 12,500 IDR
    discountRate: 250, // 2.5%
    description: "Small purchase - 25 LOKAL tokens for Rp 12,500 with 2.5% discount"
  },

  /** Medium purchase redemption (100 LOKAL) */
  mediumPurchase: {
    tokenAmount: TokenRedemptionUtils.tokensToSmallestUnits(100),
    fiatValue: 50_000, // 50,000 IDR
    discountRate: 500, // 5%
    description: "Medium purchase - 100 LOKAL tokens for Rp 50,000 with 5% discount"
  },

  /** Large purchase redemption (500 LOKAL) */
  largePurchase: {
    tokenAmount: TokenRedemptionUtils.tokensToSmallestUnits(500),
    fiatValue: 250_000, // 250,000 IDR
    discountRate: 1000, // 10%
    description: "Large purchase - 500 LOKAL tokens for Rp 250,000 with 10% discount"
  },

  /** Maximum single redemption (5000 LOKAL) */
  maxRedemption: {
    tokenAmount: TokenRedemptionUtils.tokensToSmallestUnits(5000),
    fiatValue: 2_500_000, // 2,500,000 IDR
    discountRate: 1500, // 15%
    description: "Maximum redemption - 5000 LOKAL tokens for Rp 2,500,000 with 15% discount"
  }
};

export default TokenRedemptionUtils;
