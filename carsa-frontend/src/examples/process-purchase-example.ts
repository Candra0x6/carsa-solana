/**
 * Example usage of the processPurchase function
 * This demonstrates how to process a purchase transaction and distribute reward tokens
 */

import { PublicKey } from '@solana/web3.js';
import { ClientAnchorClient } from '@/lib/client-anchor';
import * as crypto from 'crypto';

/**
 * Example function showing how to process a purchase (including database recording)
 * Note: This example uses placeholder values. In real usage, obtain wallet from useWallet() hook.
 */
export async function exampleProcessPurchase() {
  // In real usage, you would get this from useWallet() hook:
  // const { wallet, publicKey } = useWallet();
  
  // Mock wallet for example (replace with real wallet in production)
  const mockWallet = {
    publicKey: new PublicKey('11111111111111111111111111111111'), // Replace with real public key
    signTransaction: async (tx: unknown) => tx,
    signAllTransactions: async (txs: unknown[]) => txs,
  };
  
  const config = {
    wallet: mockWallet,
    // connection: optional custom connection
  };

  try {
    // Create the client
    const client = new ClientAnchorClient(config);
    const merchantWalletAddress = 'MERCHANT_WALLET_ADDRESS_HERE'; // Replace with actual merchant wallet

    // First, verify merchant exists on-chain
    const merchantWallet = new PublicKey(merchantWalletAddress);
    const merchantOnChainData = await client.getMerchantDataByWallet(merchantWallet);
    
    if (!merchantOnChainData) {
      throw new Error('Merchant account not found on blockchain');
    }

    // Fetch merchant database data to get the merchant ID
    const merchantApiResponse = await fetch(`/api/merchants/by-wallet/${merchantWalletAddress}`);
    if (!merchantApiResponse.ok) {
      throw new Error('Merchant not found in database');
    }
    
    const merchantApiData = await merchantApiResponse.json();
    if (!merchantApiData.success || !merchantApiData.data) {
      throw new Error('Unable to fetch merchant data from database');
    }

    // Generate a unique transaction ID
    const transactionId = crypto.randomBytes(32);

    // Process purchase parameters
    const purchaseParams = {
      merchantWalletAddress: merchantWalletAddress,
      purchaseAmount: 100000000, // 0.1 SOL in lamports (100,000,000 lamports)
      transactionId: new Uint8Array(transactionId)
    };

    // Execute the purchase transaction on blockchain
    const signature = await client.processPurchase(purchaseParams);

    // Record the transaction in the database
    const apiResponse = await fetch('/api/anchor/process-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerWallet: config.wallet.publicKey.toString(), // Would be from actual wallet
        merchantId: merchantApiData.data.id,
        purchaseAmount: 10000, // Convert to cents (0.1 SOL worth)
        txSignature: signature,
        idempotencyKey: Buffer.from(transactionId).toString('hex')
      }),
    });

    const apiResult = await apiResponse.json();
    
    if (!apiResult.success) {
      throw new Error(`Database recording failed: ${apiResult.error}`);
    }

    console.log('Purchase processed successfully!');
    console.log('Transaction signature:', signature);
    console.log('Tokens awarded:', apiResult.data?.tokensAwarded || 0);
    console.log('Database record ID:', apiResult.data?.transactionId);
    console.log('View on Solana Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    return {
      success: true,
      signature,
      transactionId: Buffer.from(transactionId).toString('hex'),
      tokensAwarded: apiResult.data?.tokensAwarded || 0,
      databaseTransactionId: apiResult.data?.transactionId
    };

  } catch (error) {
    console.error('Purchase processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Example function showing how to update merchant settings
export async function exampleUpdateMerchant() {
  // Note: In real usage, get wallet from useWallet() hook
  const config = {
    wallet: {} as unknown as any, // Your connected wallet (must be merchant owner)
  };

  try {
    const client = new ClientAnchorClient(config);

    // Update merchant settings
    const signature = await client.updateMerchant({
      newCashbackRate: 750, // 7.5% cashback (750 basis points)
      isActive: true
    });

    console.log('Merchant updated successfully!');
    console.log('Transaction signature:', signature);

    return {
      success: true,
      signature
    };

  } catch (error) {
    console.error('Merchant update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Example showing how to check if a merchant exists before processing
export async function exampleCheckMerchant(merchantWalletAddress: string) {
  const config = {
    wallet: {} as any,
  };

  try {
    const client = new ClientAnchorClient(config);
    const merchantWallet = new PublicKey(merchantWalletAddress);
    
    // Check if merchant account exists
    const merchantData = await client.getMerchantDataByWallet(merchantWallet);
    
    if (merchantData) {
      console.log('Merchant found:', {
        publicKey: merchantData.publicKey.toString(),
        walletAddress: merchantData.walletAddress.toString(),
        accountExists: true
      });
      return { exists: true, data: merchantData };
    } else {
      console.log('Merchant not found for wallet:', merchantWalletAddress);
      return { exists: false };
    }

  } catch (error) {
    console.error('Error checking merchant:', error);
    return { 
      exists: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Usage in a React component would look like this:
/*
import { useWallet } from '@solana/wallet-adapter-react';

export function PurchaseComponent() {
  const wallet = useWallet();
  
  const handlePurchase = async () => {
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }

    const client = new ClientAnchorClient({
      wallet: wallet as any
    });

    const transactionId = crypto.randomBytes(32);
    
    try {
      const signature = await client.processPurchase({
        merchantWalletAddress: 'MERCHANT_WALLET_HERE',
        purchaseAmount: 1000000000, // 1 SOL in lamports
        transactionId: new Uint8Array(transactionId)
      });
      
      console.log('Success:', signature);
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  return (
    <button onClick={handlePurchase}>
      Process Purchase
    </button>
  );
}
*/
