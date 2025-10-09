/**
 * Example usage of the redeemTokens function
 * This demonstrates how to use the ClientAnchorClient to redeem LOKAL tokens at a merchant
 * 
 * NOTE: This is a demonstration file. In a real application, you would use 
 * actual wallet adapters from @solana/wallet-adapter-react or similar.
 */

import { PublicKey } from '@solana/web3.js';
import { ClientAnchorClient, createRedeemTokensInstruction } from '../lib/client-anchor';

/**
 * Example: Redeem tokens at a merchant
 */
export async function exampleRedeemTokens() {
  // This would be your actual connected wallet
  const mockWallet = {
    publicKey: new PublicKey('11111111111111111111111111111112'), // Customer wallet
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  } as ExampleWallet;

  // Initialize the client
  const client = new ClientAnchorClient({
    wallet: mockWallet,
    connection: getConnection(),
  });

  // Example merchant wallet address (the merchant where tokens are being redeemed)
  const merchantWalletAddress = '22222222222222222222222222222222'; // Replace with actual merchant wallet

  // Generate a unique transaction ID (32 bytes)
  const transactionId = new Uint8Array(32);
  crypto.getRandomValues(transactionId);

  try {
    // Redeem 100 LOKAL tokens (100 * 10^9 = 100000000000 in smallest units)
    const tokenAmount = 100_000_000_000; // 100 tokens with 9 decimals
    
    // Equivalent fiat value in IDR (Indonesian Rupiah)
    const fiatValue = 50_000; // 50,000 IDR
    
    // Discount rate in basis points (500 = 5%)
    const discountRate = 500; // 5% discount
    
    const signature = await client.redeemTokens({
      merchantWalletAddress,
      tokenAmount,
      fiatValue,
      discountRate,
      transactionId,
    });

    console.log('Redemption successful!');
    console.log('Transaction signature:', signature);
    console.log(`Redeemed ${tokenAmount / 1_000_000_000} LOKAL tokens`);
    console.log(`Fiat value: ${fiatValue} IDR`);
    console.log(`Discount applied: ${discountRate / 100}%`);

    return signature;

  } catch (error) {
    console.error('Redemption failed:', error);
    throw error;
  }
}

/**
 * Example: Create redeem tokens instruction for batch processing
 */
export async function exampleCreateRedeemTokensInstruction() {
  const mockWallet = {
    publicKey: new PublicKey('11111111111111111111111111111112'),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  } as ExampleWallet;

  const merchantWalletAddress = '22222222222222222222222222222222';
  const transactionId = new Uint8Array(32);
  crypto.getRandomValues(transactionId);

  try {
    const instruction = await createRedeemTokensInstruction(
      {
        wallet: mockWallet,
        connection: getConnection(),
      },
      {
        merchantWalletAddress,
        tokenAmount: 50_000_000_000, // 50 tokens
        fiatValue: 25_000, // 25,000 IDR
        discountRate: 300, // 3% discount
        transactionId,
      }
    );

    console.log('Redeem tokens instruction created successfully');
    console.log('Instruction:', instruction);

    return instruction;

  } catch (error) {
    console.error('Failed to create redeem tokens instruction:', error);
    throw error;
  }
}

/**
 * Example: Check customer's LOKAL token balance before redemption
 */
export async function exampleCheckBalanceBeforeRedemption() {
  const mockWallet = {
    publicKey: new PublicKey('11111111111111111111111111111112'),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  } as ExampleWallet;

  const client = new ClientAnchorClient({
    wallet: mockWallet,
    connection: getConnection(),
  });

  try {
    // Check formatted balance (human-readable)
    const balanceInfo = await client.getFormattedLokalBalance();
    
    console.log('Customer LOKAL Token Balance:');
    console.log(`- Balance: ${balanceInfo.balance} LOKAL`);
    console.log(`- Numeric value: ${balanceInfo.balanceNumber}`);
    console.log(`- Account exists: ${balanceInfo.exists}`);

    // Check if customer has enough tokens for redemption
    const redemptionAmount = 100; // 100 LOKAL tokens
    
    if (balanceInfo.balanceNumber >= redemptionAmount) {
      console.log(`✅ Customer has sufficient balance for redemption of ${redemptionAmount} LOKAL`);
    } else {
      console.log(`❌ Insufficient balance. Required: ${redemptionAmount}, Available: ${balanceInfo.balanceNumber}`);
    }

    return balanceInfo;

  } catch (error) {
    console.error('Failed to check balance:', error);
    throw error;
  }
}

/**
 * Example: Complete redemption flow with validation
 */
export async function exampleCompleteRedemptionFlow() {
  const mockWallet = {
    publicKey: new PublicKey('11111111111111111111111111111112'),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  } as ExampleWallet;

  const client = new ClientAnchorClient({
    wallet: mockWallet,
    connection: getConnection(),
  });

  const merchantWalletAddress = '22222222222222222222222222222222';
  const redemptionAmountLokal = 75; // 75 LOKAL tokens to redeem
  const redemptionAmountSmallest = redemptionAmountLokal * 1_000_000_000; // Convert to smallest units
  const fiatValue = 37_500; // 37,500 IDR equivalent
  const discountRate = 750; // 7.5% discount

  try {
    console.log('🔍 Step 1: Checking customer balance...');
    const balanceInfo = await client.getFormattedLokalBalance();
    console.log(`Current balance: ${balanceInfo.balance} LOKAL`);

    if (balanceInfo.balanceNumber < redemptionAmountLokal) {
      throw new Error(`Insufficient balance for redemption. Required: ${redemptionAmountLokal}, Available: ${balanceInfo.balanceNumber}`);
    }

    console.log('✅ Step 2: Balance check passed');

    console.log('📝 Step 3: Generating transaction ID...');
    const transactionId = new Uint8Array(32);
    crypto.getRandomValues(transactionId);

    console.log('💰 Step 4: Initiating token redemption...');
    const signature = await client.redeemTokens({
      merchantWalletAddress,
      tokenAmount: redemptionAmountSmallest,
      fiatValue,
      discountRate,
      transactionId,
    });

    console.log('🎉 Redemption completed successfully!');
    console.log(`Transaction signature: ${signature}`);
    console.log(`Tokens redeemed: ${redemptionAmountLokal} LOKAL`);
    console.log(`Fiat value: ${fiatValue} IDR`);
    console.log(`Discount applied: ${discountRate / 100}%`);

    return {
      signature,
      tokenAmount: redemptionAmountLokal,
      fiatValue,
      discountRate,
      transactionId: Array.from(transactionId),
    };

  } catch (error) {
    console.error('❌ Redemption flow failed:', error);
    throw error;
  }
}

// Export all example functions
export default {
  exampleRedeemTokens,
  exampleCreateRedeemTokensInstruction,
  exampleCheckBalanceBeforeRedemption,
  exampleCompleteRedemptionFlow,
};
