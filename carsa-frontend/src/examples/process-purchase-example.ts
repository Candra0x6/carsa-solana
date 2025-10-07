/**
 * Example usage of the processPurchase function
 * This demonstrates how to process a purchase transaction and distribute reward tokens
 */

import { PublicKey } from '@solana/web3.js';
import { ClientAnchorClient } from '@/lib/client-anchor';
import * as crypto from 'crypto';

// Example function showing how to process a purchase
export async function exampleProcessPurchase() {
  // This would typically be obtained from wallet adapter
  // const wallet = useWallet(); // In a React component
  
  // For example purposes, these would be real values:
  const config = {
    wallet: {} as any, // Your connected wallet from useWallet()
    // connection: optional custom connection
  };

  try {
    // Create the client
    const client = new ClientAnchorClient(config);

    // Generate a unique transaction ID
    const transactionId = crypto.randomBytes(32);

    // Process purchase parameters
    const purchaseParams = {
      merchantWalletAddress: 'MERCHANT_WALLET_ADDRESS_HERE', // Replace with actual merchant wallet
      purchaseAmount: 100000000, // 0.1 SOL in lamports (100,000,000 lamports)
      transactionId: new Uint8Array(transactionId)
    };

    // Execute the purchase transaction
    const signature = await client.processPurchase(purchaseParams);

    console.log('Purchase processed successfully!');
    console.log('Transaction signature:', signature);
    console.log('View on Solana Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    return {
      success: true,
      signature,
      transactionId: Buffer.from(transactionId).toString('hex')
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
  const config = {
    wallet: {} as any, // Your connected wallet (must be merchant owner)
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
