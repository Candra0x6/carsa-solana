# Purchase Transaction and Reward Distribution

This document explains how to use the purchase transaction functionality in the Carsa loyalty program.

## Overview

The purchase transaction system allows customers to make purchases at registered merchants and automatically receive reward tokens based on the merchant's cashback rate.

## Key Functions

### 1. `ClientAnchorClient.processPurchase()`

Processes a purchase transaction and distributes reward tokens to the customer.

**Parameters:**
```typescript
{
  merchantWalletAddress: string;  // The merchant's wallet address
  purchaseAmount: number;         // Purchase amount in lamports
  transactionId: Uint8Array;     // Unique 32-byte transaction ID
}
```

**Returns:** 
- Promise<string> - The transaction signature

**Example:**
```typescript
import { ClientAnchorClient } from '@/lib/client-anchor';
import * as crypto from 'crypto';

const client = new ClientAnchorClient({
  wallet: wallet.adapter, // From useWallet()
  connection
});

const signature = await client.processPurchase({
  merchantWalletAddress: 'MERCHANT_WALLET_ADDRESS',
  purchaseAmount: 1000000000, // 1 SOL in lamports
  transactionId: crypto.randomBytes(32)
});
```

### 2. `ClientAnchorClient.updateMerchant()`

Allows merchants to update their settings.

**Parameters:**
```typescript
{
  newCashbackRate?: number;  // New cashback rate in basis points (0-10000)
  isActive?: boolean;        // Whether merchant is accepting transactions
}
```

**Example:**
```typescript
const signature = await client.updateMerchant({
  newCashbackRate: 750, // 7.5% cashback
  isActive: true
});
```

## How It Works

### Transaction Flow

1. **Customer initiates purchase** at a registered merchant
2. **Merchant account validation** - System checks if merchant is registered and active
3. **Token account creation** - If customer doesn't have a token account, it's created automatically
4. **Reward calculation** - Tokens are calculated based on:
   - Purchase amount × merchant's cashback rate
   - Result is converted to token units (9 decimals)
5. **Token minting** - Reward tokens are minted directly to customer's wallet
6. **Transaction recording** - Purchase details are stored on-chain for transparency

### Cashback Calculation

```
Reward Amount = (Purchase Amount × Cashback Rate) / 10,000 × 10^9
```

Example:
- Purchase: 1 SOL (1,000,000,000 lamports)
- Cashback Rate: 500 basis points (5%)
- Reward: (1,000,000,000 × 500 / 10,000) × 10^9 = 50,000,000,000 reward tokens

## Required Accounts

The `processPurchase` instruction requires these accounts:

1. **Customer** - The buyer's wallet (signer, mutable)
2. **Merchant Account** - The merchant's PDA (mutable)
3. **Mint** - The Lokal token mint (mutable)
4. **Mint Authority** - PDA that can mint tokens
5. **Config** - Global program configuration (mutable)
6. **Customer Token Account** - Where reward tokens are sent (mutable)
7. **Transaction Record** - On-chain record of the purchase
8. **Token Program** - SPL Token program
9. **System Program** - For account creation

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Wallet not connected" | No wallet connected | Connect wallet first |
| "Merchant account not found" | Merchant not registered | Merchant must register first |
| "Invalid purchase amount" | Amount ≤ 0 or too large | Use valid amount (0.001-1000 SOL) |
| "MerchantNotActive" | Merchant disabled | Merchant must activate account |
| "ArithmeticOverflow" | Calculation overflow | Reduce purchase amount |

## Security Features

- **PDA-based accounts** prevent unauthorized access
- **Transaction deduplication** prevents double-spending
- **Overflow protection** in all arithmetic operations
- **Input validation** ensures data integrity
- **Signer verification** ensures only authorized transactions

## Usage in React Components

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { ClientAnchorClient } from '@/lib/client-anchor';

export function PurchaseComponent() {
  const wallet = useWallet();
  const { connection } = useConnection();
  
  const handlePurchase = async (amount: number, merchantWallet: string) => {
    if (!wallet.connected) return;
    
    const client = new ClientAnchorClient({
      wallet: wallet.adapter!,
      connection
    });
    
    try {
      const signature = await client.processPurchase({
        merchantWalletAddress: merchantWallet,
        purchaseAmount: amount * 1_000_000_000, // Convert SOL to lamports
        transactionId: crypto.randomBytes(32)
      });
      
      console.log('Success:', signature);
    } catch (error) {
      console.error('Failed:', error);
    }
  };
  
  return (
    <button onClick={() => handlePurchase(0.1, 'MERCHANT_WALLET')}>
      Buy & Earn Tokens
    </button>
  );
}
```

## Testing

The system can be tested on Solana devnet:

1. **Setup**: Connect wallet, ensure SOL balance for fees
2. **Register merchant**: Use `registerMerchant()` 
3. **Process purchase**: Use `processPurchase()`
4. **Verify tokens**: Check token balance in wallet
5. **View transaction**: Check Solana Explorer

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_ANCHOR_PROGRAM_ID=FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY
NEXT_PUBLIC_LOKAL_MINT_ADDRESS=YOUR_TOKEN_MINT_ADDRESS
NEXT_PUBLIC_SOLANA_NETWORK=https://api.devnet.solana.com
```

## Limitations

- **Devnet only**: Currently configured for Solana devnet
- **Manual mint setup**: Mint address must be configured manually
- **Basic validation**: Minimal input validation (enhance for production)
- **No price oracle**: Uses fixed conversion rates

## Next Steps

1. Add price oracle integration for real-world currency conversion
2. Implement batch processing for multiple purchases
3. Add merchant analytics and reporting
4. Implement token redemption functionality
5. Add comprehensive error recovery mechanisms
