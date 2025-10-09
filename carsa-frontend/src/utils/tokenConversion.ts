/**
 * Token conversion utilities for Carsa Loyalty Program
 * 
 * Conversion logic aligned with Carsa Anchor smart contract.
 * Do not change constants without updating the on-chain program.
 * 
 * Smart Contract Rules:
 * - Token has 9 decimals (SPL standard)
 * - 1 token = Rp 1,000 IDR
 * - Cashback is defined in basis points (bps), where 10_000 = 100%
 * - All calculations use integer arithmetic to match Solana
 */

// Constants matching the on-chain program
export const TOKEN_DECIMALS = 9;
export const TOKEN_TO_IDR_RATE = 1_000;
export const BASIS_POINTS_DIVISOR = 10_000;
export const TOKEN_UNIT_MULTIPLIER = BigInt(10 ** TOKEN_DECIMALS); // 10^9

/**
 * Convert token amount (in smallest units) to IDR fiat value
 * Matches on-chain formula: token_value_in_idr = (redeemed_tokens / 10^9) * 1_000
 * 
 * @param tokenAmount - Token amount in smallest units (with 9 decimals)
 * @returns IDR fiat value as number
 */
export function tokenToFiat(tokenAmount: bigint | number): number {
  const amount = typeof tokenAmount === 'number' ? BigInt(tokenAmount) : tokenAmount;
  
  // Convert from token units to tokens, then multiply by IDR rate
  // Division by TOKEN_UNIT_MULTIPLIER converts from smallest units to tokens
  // Multiplication by TOKEN_TO_IDR_RATE converts tokens to IDR
  const fiatValue = (amount * BigInt(TOKEN_TO_IDR_RATE)) / TOKEN_UNIT_MULTIPLIER;
  
  return Number(fiatValue);
}

/**
 * Convert IDR fiat value to token amount (in smallest units)
 * Matches on-chain formula: fiat_to_token_units = (fiat_value / 1_000) * 10^9
 * 
 * @param fiatValue - IDR fiat value
 * @returns Token amount in smallest units as BigInt
 */
export function fiatToToken(fiatValue: number): bigint {
  if (fiatValue < 0) {
    throw new Error('Fiat value cannot be negative');
  }
  
  // Convert fiat to tokens, then multiply by unit multiplier
  // Division by TOKEN_TO_IDR_RATE converts IDR to tokens
  // Multiplication by TOKEN_UNIT_MULTIPLIER converts tokens to smallest units
  const tokenAmount = (BigInt(Math.floor(fiatValue)) * TOKEN_UNIT_MULTIPLIER) / BigInt(TOKEN_TO_IDR_RATE);
  
  return tokenAmount;
}

/**
 * Calculate reward tokens for a given fiat value and cashback rate
 * Matches on-chain formula: reward_tokens = ((total_value * cashback_rate) / 10_000 / 1_000) * 10^9
 * 
 * @param fiatValue - Total purchase value in IDR
 * @param cashbackRateBps - Cashback rate in basis points (e.g., 500 = 5%)
 * @returns Reward token amount in smallest units as BigInt
 */
export function calculateRewardTokens(fiatValue: number, cashbackRateBps: number): bigint {
  if (fiatValue < 0 || cashbackRateBps < 0 || cashbackRateBps > BASIS_POINTS_DIVISOR) {
    throw new Error('Invalid input parameters');
  }
  
  // Follow exact on-chain calculation order to avoid rounding differences
  // 1. Multiply fiat by cashback rate (in basis points)
  // 2. Multiply by token unit multiplier (10^9) for precision
  // 3. Divide by basis points divisor (10_000) to convert from bps to decimal
  // 4. Divide by TOKEN_TO_IDR_RATE (1_000) to convert IDR to tokens
  
  const fiatBigInt = BigInt(Math.floor(fiatValue));
  const cashbackBigInt = BigInt(cashbackRateBps);
  
  const rewardCalculation = (fiatBigInt * cashbackBigInt * TOKEN_UNIT_MULTIPLIER) 
    / BigInt(BASIS_POINTS_DIVISOR) 
    / BigInt(TOKEN_TO_IDR_RATE);
  
  return rewardCalculation;
}

/**
 * Format token amount for display (converts from smallest units to human-readable format)
 * 
 * @param amount - Token amount in smallest units
 * @param decimals - Number of decimal places to show (default: 3)
 * @returns Formatted string representation
 */
export function formatTokenDisplay(amount: bigint | number, decimals: number = 3): string {
  const amountBigInt = typeof amount === 'number' ? BigInt(amount) : amount;
  
  // Convert from smallest units to tokens
  const tokens = Number(amountBigInt) / (10 ** TOKEN_DECIMALS);
  
  return tokens.toFixed(decimals);
}

/**
 * Format IDR currency for display
 * 
 * @param amount - IDR amount
 * @returns Formatted IDR string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Validate that conversion functions are working correctly
 * Used for debugging and ensuring on-chain parity
 * 
 * @param testCases - Array of test cases to validate
 * @returns Array of validation results
 */
export interface ValidationTestCase {
  description: string;
  fiatValue?: number;
  tokenAmount?: bigint;
  cashbackRateBps?: number;
  expectedResult: bigint | number;
  tolerance?: number; // Acceptable difference for floating point comparisons
}

export function validateConversions(testCases: ValidationTestCase[]): Array<{
  testCase: ValidationTestCase;
  passed: boolean;
  actualResult: bigint | number;
  error?: string;
}> {
  return testCases.map(testCase => {
    try {
      let actualResult: bigint | number;
      
      if (testCase.description.includes('tokenToFiat')) {
        actualResult = tokenToFiat(testCase.tokenAmount!);
      } else if (testCase.description.includes('fiatToToken')) {
        actualResult = fiatToToken(testCase.fiatValue!);
      } else if (testCase.description.includes('calculateReward')) {
        actualResult = calculateRewardTokens(testCase.fiatValue!, testCase.cashbackRateBps!);
      } else {
        throw new Error('Unknown test case type');
      }
      
      const tolerance = testCase.tolerance || 0;
      let passed: boolean;
      
      if (typeof actualResult === 'bigint' && typeof testCase.expectedResult === 'bigint') {
        const diff = actualResult > testCase.expectedResult 
          ? actualResult - testCase.expectedResult 
          : testCase.expectedResult - actualResult;
        passed = diff <= BigInt(tolerance);
      } else {
        const diff = Math.abs(Number(actualResult) - Number(testCase.expectedResult));
        passed = diff <= tolerance;
      }
      
      return {
        testCase,
        passed,
        actualResult,
      };
    } catch (error) {
      return {
        testCase,
        passed: false,
        actualResult: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

/**
 * Runtime validator for debugging mode
 * Compares frontend calculations with expected on-chain results
 * Warns if difference > 1 smallest unit (10^-9)
 */
export function validateOnChainParity(
  fiatAmount: number,
  cashbackRateBps: number,
  expectedReward?: bigint
): { isValid: boolean; warning?: string; calculatedReward: bigint } {
  const calculatedReward = calculateRewardTokens(fiatAmount, cashbackRateBps);
  
  if (expectedReward === undefined) {
    return { isValid: true, calculatedReward };
  }
  
  const diff = calculatedReward > expectedReward 
    ? calculatedReward - expectedReward 
    : expectedReward - calculatedReward;
  
  const isValid = diff <= BigInt(1); // Allow difference of at most 1 smallest unit
  
  return {
    isValid,
    calculatedReward,
    warning: isValid ? undefined : `Calculation difference detected: ${diff} units. Expected: ${expectedReward}, Calculated: ${calculatedReward}`,
  };
}
