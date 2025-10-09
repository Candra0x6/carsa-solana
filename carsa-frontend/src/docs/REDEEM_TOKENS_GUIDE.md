# Token Redemption Implementation

This document demonstrates how to use the `redeemTokens` function in the Carsa platform to allow users to redeem LOKAL tokens at merchants.

## Overview

The `redeemTokens` function connects to the Solana blockchain using Anchor and calls the `redeem_tokens` instruction from the Carsa program. This allows a connected wallet user to redeem their LOKAL tokens at participating merchants for discounts or payments.

## Implementation

### Function Signature

```typescript
async redeemTokens(params: {
  merchantWalletAddress: string;
  tokenAmount: number;
  fiatValue: number;
  discountRate: number;
  transactionId: Uint8Array;
}): Promise<string>
```

### Parameters

- `merchantWalletAddress`: The wallet address of the merchant where tokens are being redeemed
- `tokenAmount`: Amount of LOKAL tokens to redeem (in smallest units, considering 9 decimals)
- `fiatValue`: The fiat value equivalent in IDR (Indonesian Rupiah)
- `discountRate`: Discount rate in basis points (e.g., 500 = 5%)
- `transactionId`: Unique 32-byte transaction identifier

### Key Features

1. **Automatic Token Account Creation**: If the merchant doesn't have a token account, it will be created automatically (paid by the customer)

2. **Balance Validation**: Checks that the customer has sufficient tokens before attempting redemption

3. **Parameter Validation**: Validates all input parameters including token amounts, discount rates, and fiat values

4. **Transaction Recording**: Creates an on-chain redemption record for tracking and auditing

## Usage Example

### Basic Usage

```typescript
import { ClientAnchorClient } from './lib/client-anchor';
import { getConnection } from './lib/solana';

// Initialize client with connected wallet
const client = new ClientAnchorClient({
  wallet: connectedWallet, // Your wallet adapter
  connection: getConnection(),
});

// Generate unique transaction ID
const transactionId = new Uint8Array(32);
crypto.getRandomValues(transactionId);

// Redeem 100 LOKAL tokens for 50,000 IDR with 5% discount
const signature = await client.redeemTokens({
  merchantWalletAddress: 'MERCHANT_WALLET_ADDRESS_HERE',
  tokenAmount: 100_000_000_000, // 100 LOKAL (with 9 decimals)
  fiatValue: 50_000, // 50,000 IDR
  discountRate: 500, // 5% (500 basis points)
  transactionId,
});

console.log('Redemption successful:', signature);
```

### With Balance Check

```typescript
// Check balance before redemption
const balanceInfo = await client.getFormattedLokalBalance();
console.log(`Current balance: ${balanceInfo.balance} LOKAL`);

const redemptionAmount = 75; // 75 LOKAL tokens
if (balanceInfo.balanceNumber >= redemptionAmount) {
  const signature = await client.redeemTokens({
    merchantWalletAddress: 'MERCHANT_WALLET_ADDRESS_HERE',
    tokenAmount: redemptionAmount * 1_000_000_000, // Convert to smallest units
    fiatValue: 37_500,
    discountRate: 750, // 7.5%
    transactionId: new Uint8Array(32),
  });
} else {
  throw new Error('Insufficient balance for redemption');
}
```

### Creating Instructions for Batch Processing

```typescript
import { createRedeemTokensInstruction } from './lib/client-anchor';

const instruction = await createRedeemTokensInstruction(
  {
    wallet: connectedWallet,
    connection: getConnection(),
  },
  {
    merchantWalletAddress: 'MERCHANT_WALLET_ADDRESS_HERE',
    tokenAmount: 50_000_000_000, // 50 LOKAL
    fiatValue: 25_000, // 25,000 IDR
    discountRate: 300, // 3%
    transactionId: new Uint8Array(32),
  }
);

// Use instruction in a larger transaction
```

## Smart Contract Integration

The function integrates with the Rust smart contract's `redeem_tokens` instruction, which:

1. **Validates** the merchant account is active and authorized
2. **Transfers** tokens from customer to merchant
3. **Records** the redemption transaction on-chain
4. **Updates** merchant statistics (transaction count and volume)
5. **Applies** the specified discount rate

## Error Handling

The function includes comprehensive error handling for:

- **Wallet Connection**: Ensures wallet is connected before proceeding
- **Parameter Validation**: Validates all input parameters
- **Account Existence**: Checks for required accounts and creates them if needed
- **Balance Verification**: Ensures customer has sufficient tokens
- **Transaction Limits**: Enforces maximum redemption amounts (5,000 LOKAL per transaction)
- **Discount Validation**: Ensures discount rates are within valid ranges (0-100%)

## Security Considerations

1. **Transaction IDs**: Always use unique, cryptographically secure transaction IDs
2. **Parameter Validation**: All parameters are validated both client-side and on-chain
3. **Balance Checks**: Multiple balance verification layers prevent overdrafts
4. **Merchant Verification**: Only active, registered merchants can accept redemptions

## Environment Configuration

Ensure the following environment variables are set:

```env
NEXT_PUBLIC_LOKAL_MINT_ADDRESS=YOUR_LOKAL_TOKEN_MINT_ADDRESS
NEXT_PUBLIC_SOLANA_NETWORK=https://api.devnet.solana.com
```

## Integration with Frontend

This implementation is designed to work with React applications using Solana wallet adapters:

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { ClientAnchorClient } from './lib/client-anchor';

function RedeemTokensComponent() {
  const wallet = useWallet();
  
  const handleRedemption = async () => {
    if (!wallet.connected) return;
    
    const client = new ClientAnchorClient({ wallet });
    // ... redemption logic
  };
}
```

## Returns

The function returns a transaction signature (string) upon successful completion, which can be used to:

- Track the transaction on Solana explorers
- Provide confirmation to users
- Store in application databases for record-keeping

This implementation provides a complete, production-ready solution for token redemption in the Carsa loyalty program ecosystem.
