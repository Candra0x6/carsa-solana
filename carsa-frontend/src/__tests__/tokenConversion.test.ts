/**
 * Test suite for token conversion utilities
 * Ensures perfect alignment with on-chain Anchor smart contract
 */

import {
  tokenToFiat,
  fiatToToken,
  calculateRewardTokens,
  formatTokenDisplay,
  formatCurrency,
  validateConversions,
  validateOnChainParity,
  TOKEN_DECIMALS,
  TOKEN_TO_IDR_RATE,
  BASIS_POINTS_DIVISOR,
  TOKEN_UNIT_MULTIPLIER,
  ValidationTestCase,
} from '../utils/tokenConversion';

describe('Token Conversion Constants', () => {
  test('constants match smart contract values', () => {
    expect(TOKEN_DECIMALS).toBe(9);
    expect(TOKEN_TO_IDR_RATE).toBe(1_000);
    expect(BASIS_POINTS_DIVISOR).toBe(10_000);
    expect(TOKEN_UNIT_MULTIPLIER).toBe(BigInt(1_000_000_000));
  });
});

describe('tokenToFiat', () => {
  test('converts 1 token (10^9 units) to Rp 1,000', () => {
    const idr = tokenToFiat(BigInt(1_000_000_000)); // 1 token in smallest units
    expect(idr).toBe(1000);
  });

  test('converts 1.5 tokens to Rp 1,500', () => {
    const idr = tokenToFiat(BigInt(1_500_000_000)); // 1.5 * 10^9
    expect(idr).toBe(1500);
  });

  test('converts 0.001 token to Rp 1', () => {
    const idr = tokenToFiat(BigInt(1_000_000)); // 0.001 * 10^9
    expect(idr).toBe(1);
  });

  test('converts 10 tokens to Rp 10,000', () => {
    const idr = tokenToFiat(BigInt(10_000_000_000)); // 10 * 10^9
    expect(idr).toBe(10000);
  });

  test('handles zero tokens', () => {
    const idr = tokenToFiat(BigInt(0));
    expect(idr).toBe(0);
  });

  test('handles number input', () => {
    const idr = tokenToFiat(1_000_000_000); // 1 token
    expect(idr).toBe(1000);
  });

  test('handles fractional tokens correctly (truncates)', () => {
    const idr = tokenToFiat(BigInt(1_500_000_001)); // 1.500000001 tokens
    expect(idr).toBe(1500); // Should truncate to 1500
  });
});

describe('fiatToToken', () => {
  test('converts Rp 1,000 to 1 token (10^9 units)', () => {
    const tokenUnits = fiatToToken(1000);
    expect(tokenUnits).toBe(BigInt(1_000_000_000)); // 1 * 10^9
  });

  test('converts Rp 5,000 to 5 tokens', () => {
    const tokenUnits = fiatToToken(5000);
    expect(tokenUnits).toBe(BigInt(5_000_000_000)); // 5 * 10^9
  });

  test('converts Rp 1,500 to 1.5 tokens', () => {
    const tokenUnits = fiatToToken(1500);
    expect(tokenUnits).toBe(BigInt(1_500_000_000)); // 1.5 * 10^9
  });

  test('handles zero fiat', () => {
    const tokenUnits = fiatToToken(0);
    expect(tokenUnits).toBe(BigInt(0));
  });

  test('handles fractional fiat (floors to integer)', () => {
    const tokenUnits = fiatToToken(1500.99);
    expect(tokenUnits).toBe(BigInt(1_500_000_000)); // Should floor to 1500
  });

  test('throws error for negative fiat', () => {
    expect(() => fiatToToken(-100)).toThrow('Fiat value cannot be negative');
  });

  test('handles large amounts', () => {
    const tokenUnits = fiatToToken(1_000_000); // 1 million IDR
    expect(tokenUnits).toBe(BigInt(1_000_000_000_000)); // 1000 tokens
  });
});

describe('calculateRewardTokens', () => {
  test('calculates 5% cashback for Rp 50,000 purchase = 2.5 tokens', () => {
    const reward = calculateRewardTokens(50000, 500); // 5% = 500 bps
    expect(reward).toBe(BigInt(2_500_000_000)); // 2.5 * 10^9
  });

  test('calculates 10% cashback for Rp 10,000 purchase = 1 token', () => {
    const reward = calculateRewardTokens(10000, 1000); // 10% = 1000 bps
    expect(reward).toBe(BigInt(1_000_000_000)); // 1 * 10^9
  });

  test('calculates 1% cashback for Rp 100,000 purchase = 1 token', () => {
    const reward = calculateRewardTokens(100000, 100); // 1% = 100 bps
    expect(reward).toBe(BigInt(1_000_000_000)); // 1 * 10^9
  });

  test('calculates 0.5% cashback for Rp 200,000 purchase = 1 token', () => {
    const reward = calculateRewardTokens(200000, 50); // 0.5% = 50 bps
    expect(reward).toBe(BigInt(1_000_000_000)); // 1 * 10^9
  });

  test('handles zero cashback rate', () => {
    const reward = calculateRewardTokens(50000, 0);
    expect(reward).toBe(BigInt(0));
  });

  test('handles zero fiat amount', () => {
    const reward = calculateRewardTokens(0, 500);
    expect(reward).toBe(BigInt(0));
  });

  test('handles maximum cashback rate (100%)', () => {
    const reward = calculateRewardTokens(1000, 10000); // 100% = 10000 bps
    expect(reward).toBe(BigInt(1_000_000_000)); // Should get 1 token for Rp 1000
  });

  test('throws error for invalid cashback rate', () => {
    expect(() => calculateRewardTokens(1000, -1)).toThrow('Invalid input parameters');
    expect(() => calculateRewardTokens(1000, 10001)).toThrow('Invalid input parameters');
  });

  test('throws error for negative fiat', () => {
    expect(() => calculateRewardTokens(-1000, 500)).toThrow('Invalid input parameters');
  });

  test('handles fractional results correctly (truncates)', () => {
    // This should result in a fractional token amount
    const reward = calculateRewardTokens(1001, 100); // 1% of 1001 = 10.01 IDR = 0.01001 tokens
    // Expected: (1001 * 100 * 10^9) / 10000 / 1000 = 10,010,000 units = 0.01001 tokens
    expect(reward).toBe(BigInt(10_010_000));
  });
});

describe('Round-trip Conversion Consistency', () => {
  test('tokenToFiat(fiatToToken(x)) equals x for valid token amounts', () => {
    const testAmounts = [1000, 5000, 10000, 50000, 100000];
    
    testAmounts.forEach(amount => {
      const tokens = fiatToToken(amount);
      const backToFiat = tokenToFiat(tokens);
      expect(backToFiat).toBe(amount);
    });
  });

  test('fiatToToken(tokenToFiat(x)) approximately equals x', () => {
    const testTokens = [
      BigInt(1_000_000_000),   // 1 token
      BigInt(5_000_000_000),   // 5 tokens
      BigInt(10_000_000_000),  // 10 tokens
    ];
    
    testTokens.forEach(tokenAmount => {
      const fiat = tokenToFiat(tokenAmount);
      const backToTokens = fiatToToken(fiat);
      expect(backToTokens).toBe(tokenAmount);
    });
  });
});

describe('Format Functions', () => {
  test('formatTokenDisplay shows correct decimal places', () => {
    expect(formatTokenDisplay(BigInt(1_000_000_000))).toBe('1.000'); // 1 token
    expect(formatTokenDisplay(BigInt(1_500_000_000))).toBe('1.500'); // 1.5 tokens
    expect(formatTokenDisplay(BigInt(123_456_789))).toBe('0.123'); // 0.123456789 tokens
  });

  test('formatTokenDisplay with custom decimal places', () => {
    expect(formatTokenDisplay(BigInt(1_500_000_000), 2)).toBe('1.50');
    expect(formatTokenDisplay(BigInt(1_500_000_000), 1)).toBe('1.5');
    expect(formatTokenDisplay(BigInt(1_500_000_000), 0)).toBe('2'); // Rounds up
  });

  test('formatCurrency formats IDR correctly', () => {
    const formatted = formatCurrency(1000);
    expect(formatted).toMatch(/Rp.*1\.000/); // Should contain Rp and 1,000
  });
});

describe('Validation Functions', () => {
  test('validateConversions works correctly', () => {
    const testCases: ValidationTestCase[] = [
      {
        description: 'tokenToFiat: 1 token = Rp 1,000',
        tokenAmount: BigInt(1_000_000_000),
        expectedResult: 1000,
      },
      {
        description: 'fiatToToken: Rp 5,000 = 5 tokens',
        fiatValue: 5000,
        expectedResult: BigInt(5_000_000_000),
      },
      {
        description: 'calculateReward: 5% of Rp 50,000 = 2.5 tokens',
        fiatValue: 50000,
        cashbackRateBps: 500,
        expectedResult: BigInt(2_500_000_000),
      },
    ];

    const results = validateConversions(testCases);
    
    results.forEach(result => {
      expect(result.passed).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  test('validateOnChainParity detects correct calculations', () => {
    const result = validateOnChainParity(50000, 500, BigInt(2_500_000_000));
    expect(result.isValid).toBe(true);
    expect(result.warning).toBeUndefined();
    expect(result.calculatedReward).toBe(BigInt(2_500_000_000));
  });

  test('validateOnChainParity detects calculation differences', () => {
    const result = validateOnChainParity(50000, 500, BigInt(2_500_000_100)); // Wrong expected
    expect(result.isValid).toBe(false);
    expect(result.warning).toContain('Calculation difference detected');
  });
});

describe('Edge Cases and Error Handling', () => {
  test('handles very large numbers without overflow', () => {
    const largeAmount = 1_000_000_000; // 1 billion IDR
    const tokens = fiatToToken(largeAmount);
    expect(tokens).toBe(BigInt(1_000_000_000_000_000)); // Should not overflow
    
    const backToFiat = tokenToFiat(tokens);
    expect(backToFiat).toBe(largeAmount);
  });

  test('handles very small amounts correctly', () => {
    const smallFiat = 1; // 1 IDR
    const tokens = fiatToToken(smallFiat);
    expect(tokens).toBe(BigInt(1_000_000)); // 0.001 tokens
    
    const backToFiat = tokenToFiat(tokens);
    expect(backToFiat).toBe(smallFiat);
  });

  test('reward calculation matches smart contract precision', () => {
    // Test case that might cause precision issues
    const fiatAmount = 12345;
    const cashbackRate = 123; // 1.23%
    
    // Manual calculation following smart contract logic:
    // reward = (12345 * 123 * 10^9) / 10000 / 1000
    // reward = (1518435 * 10^9) / 10000000
    // reward = 151843500000 units = 151.8435 tokens
    
    const reward = calculateRewardTokens(fiatAmount, cashbackRate);
    const expectedReward = BigInt(151_843_500_000);
    
    expect(reward).toBe(expectedReward);
  });
});

describe('Smart Contract Equivalence Tests', () => {
  test('redeem 1 token equals Rp 1,000', () => {
    const idr = tokenToFiat(BigInt(1_000_000_000)); // 1 * 10^9
    expect(idr).toBe(1000);
  });

  test('redeem 1.5 tokens equals Rp 1,500', () => {
    const idr = tokenToFiat(BigInt(1_500_000_000)); // 1.5 * 10^9
    expect(idr).toBe(1500);
  });

  test('Rp 5,000 fiat equals 5 tokens (in smallest units)', () => {
    const tokenUnits = fiatToToken(5000);
    expect(tokenUnits).toBe(BigInt(5_000_000_000)); // 5 * 10^9
  });

  test('Reward 5% cashback for Rp 50,000 purchase = 2.5 tokens', () => {
    const reward = calculateRewardTokens(50000, 500);
    expect(reward).toBe(BigInt(2_500_000_000)); // 2.5 * 10^9
  });

  test('Complex scenario: Purchase with mixed payment', () => {
    // Scenario: Customer pays Rp 30,000 fiat + redeems 2 tokens (Rp 2,000 value)
    // Total transaction value: Rp 32,000
    // Merchant offers 3% cashback (300 bps)
    // Expected reward: 32,000 * 3% / 1,000 = 0.96 tokens
    
    const fiatAmount = 30000;
    const redeemedTokens = BigInt(2_000_000_000); // 2 tokens in units
    const redeemedValue = tokenToFiat(redeemedTokens); // Should be 2000 IDR
    const totalValue = fiatAmount + redeemedValue; // 32000 IDR
    const cashbackRate = 300; // 3%
    
    expect(redeemedValue).toBe(2000);
    expect(totalValue).toBe(32000);
    
    const reward = calculateRewardTokens(totalValue, cashbackRate);
    const expectedReward = BigInt(960_000_000); // 0.96 tokens
    
    expect(reward).toBe(expectedReward);
  });

  test('Minimum viable transaction', () => {
    // Minimum: Rp 1,000 with 0.01% cashback should give 0.0001 tokens
    const reward = calculateRewardTokens(1000, 1); // 0.01% = 1 bps
    const expectedReward = BigInt(100_000); // 0.0001 * 10^9
    expect(reward).toBe(expectedReward);
  });

  test('Maximum reasonable transaction', () => {
    // Large transaction: Rp 1,000,000 with 10% cashback should give 100 tokens
    const reward = calculateRewardTokens(1_000_000, 1000); // 10% = 1000 bps
    const expectedReward = BigInt(100_000_000_000); // 100 * 10^9
    expect(reward).toBe(expectedReward);
  });
});
