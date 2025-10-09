# ProcessPurchase Method Update Summary

## Changes Made

### 1. Updated IDL and Types
- Copied the latest `carsa.json` IDL from the contracts directory to the frontend
- Copied the latest TypeScript types from `carsa.ts` 
- Updated imports to use local files instead of old import paths

### 2. Updated processPurchase Method
The `processPurchase` method has been updated to match the Anchor contract specification:

**New Parameters:**
```typescript
async processPurchase(params: {
  merchantWalletAddress: string;
  purchaseAmount: number;
  redeemTokenAmount?: number;  // NEW: Optional token redemption amount
  transactionId: Uint8Array;
}): Promise<string>
```

**Key Changes:**
1. **Added `redeemTokenAmount` parameter** - Allows customers to redeem LOKAL tokens as part of payment
2. **Added `merchantTokenAccount`** - Required by the contract for token transfers during redemption
3. **Updated method signature** - Now passes three parameters to the contract:
   - `fiatAmount` (purchase amount in IDR)
   - `redeemTokenAmount` (optional token redemption amount)
   - `transactionId` (unique transaction identifier)

### 3. Account Structure
The method now correctly provides all required accounts:
- `customer` - The customer making the purchase
- `merchantAccount` - The merchant's PDA account
- `mint` - The LOKAL token mint
- `mintAuthority` - The program's mint authority PDA
- `config` - The program's configuration account
- `customerTokenAccount` - Customer's token account (for receiving rewards and source of redemption)
- `merchantTokenAccount` - Merchant's token account (for receiving redeemed tokens)
- `transactionRecord` - PDA to record the transaction
- `tokenProgram` - SPL Token program
- `systemProgram` - System program

### 4. New Methods Added

**processPurchaseWithRedemption():**
```typescript
async processPurchaseWithRedemption(params: {
  merchantWalletAddress: string;
  fiatAmount: number;
  redeemTokenAmount: number;
  transactionId: Uint8Array;
}): Promise<string>
```
Convenience method specifically for purchases that include token redemption.

**createProcessPurchaseWithRedemptionInstruction():**
Utility function to create purchase instructions with redemption for transaction building.

### 5. Updated Utility Functions
- Updated `createProcessPurchaseInstruction()` to support the new parameters
- Removed the old `createRedeemTokensInstruction()` since redemption is now part of processPurchase
- Added proper merchant token account handling

## Contract Integration
The updated client now properly integrates with the Rust contract's `ProcessPurchase` instruction which:
1. Handles both fiat payments and optional token redemption in one transaction
2. Calculates rewards based on total transaction value (fiat + token value)
3. Transfers redeemed tokens from customer to merchant
4. Mints new reward tokens to customer based on cashback rate
5. Records complete transaction details on-chain

## Usage Examples

**Simple purchase (fiat only):**
```typescript
const signature = await client.processPurchase({
  merchantWalletAddress: "merchant_wallet_address",
  purchaseAmount: 100000, // 100,000 IDR
  transactionId: new Uint8Array(32), // unique transaction ID
});
```

**Purchase with token redemption:**
```typescript
const signature = await client.processPurchase({
  merchantWalletAddress: "merchant_wallet_address", 
  purchaseAmount: 50000, // 50,000 IDR in fiat
  redeemTokenAmount: 50000000000, // 50 LOKAL tokens (with 9 decimals)
  transactionId: new Uint8Array(32),
});
```

The contract will automatically:
- Calculate total transaction value (50,000 IDR + token value)
- Transfer 50 LOKAL tokens from customer to merchant
- Calculate and mint reward tokens based on total value
- Record the complete transaction on-chain
