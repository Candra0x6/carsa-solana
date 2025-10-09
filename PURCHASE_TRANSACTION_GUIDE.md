# 🛒 Purchase Transaction Integration Guide

This guide explains how to process purchases with both blockchain and database recording using the CARSA loyalty program.

## 🎯 Overview

The purchase flow involves two main steps:
1. **Blockchain Transaction** - Process the purchase on Solana and mint reward tokens
2. **Database Recording** - Record transaction details for analytics and tracking

## 📋 Components

### PurchaseTransaction Component

Located at: `src/components/PurchaseTransaction.tsx`

#### Props
```typescript
interface PurchaseTransactionProps {
  merchantWalletAddress: string;  // The merchant's Solana wallet address
  merchantName?: string;          // Optional merchant display name
}
```

#### Features
- ✅ Wallet connection verification
- ✅ Merchant validation (on-chain and database)
- ✅ Purchase amount input and validation
- ✅ Blockchain transaction processing
- ✅ Database transaction recording
- ✅ Real-time status updates
- ✅ Error handling and recovery
- ✅ Transaction explorer links

## 🔄 Purchase Flow

### 1. Prerequisites Check
```typescript
// Component validates:
- Wallet is connected
- Purchase amount is valid (> 0.001 SOL)
- Merchant exists on blockchain
- Merchant exists in database
```

### 2. Blockchain Processing
```typescript
// On-chain operations:
const signature = await client.processPurchase({
  merchantWalletAddress: merchantWalletAddress,
  purchaseAmount: purchaseAmountLamports,
  transactionId: new Uint8Array(transactionId)
});
```

### 3. Database Recording
```typescript
// API call to record transaction:
const apiResponse = await fetch('/api/anchor/process-purchase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerWallet: publicKey.toString(),
    merchantId: merchantApiData.data.id,
    purchaseAmount: Math.floor(parseFloat(purchaseAmount) * 100),
    txSignature: signature,
    idempotencyKey: Buffer.from(transactionId).toString('hex')
  }),
});
```

## 🛠️ Implementation Steps

### Step 1: Import and Setup
```tsx
import PurchaseTransaction from '@/components/PurchaseTransaction';

export default function MerchantPage() {
  const merchantWallet = "YOUR_MERCHANT_WALLET_ADDRESS";
  
  return (
    <PurchaseTransaction 
      merchantWalletAddress={merchantWallet}
      merchantName="Coffee Shop"
    />
  );
}
```

### Step 2: Wallet Provider Setup
Ensure your app is wrapped with Solana wallet providers:
```tsx
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### Step 3: Environment Configuration
Set up environment variables in `.env.local`:
```bash
# Solana Configuration
NEXT_PUBLIC_ANCHOR_PROGRAM_ID=your_program_id
NEXT_PUBLIC_SOLANA_NETWORK=https://api.devnet.solana.com
NEXT_PUBLIC_LOKAL_MINT_ADDRESS=your_token_mint_address

# Database
DATABASE_URL=your_postgres_url
```

## 📊 API Integration

### Backend API Route
The component calls `/api/anchor/process-purchase` which:

#### Request Format
```typescript
{
  customerWallet: string;      // Customer's wallet address
  merchantId: string;          // Database merchant ID
  purchaseAmount: number;      // Amount in cents/smallest unit
  txSignature: string;         // Blockchain transaction signature
  idempotencyKey?: string;     // Prevents duplicate processing
}
```

#### Response Format
```typescript
{
  success: boolean;
  data?: {
    transactionId: string;     // Database record ID
    txSignature: string;       // Blockchain signature
    tokensAwarded: number;     // LOKAL tokens earned
  };
  error?: string;
}
```

### Database Operations
The API performs:
1. **Idempotency Check** - Prevents duplicate transactions
2. **Merchant Validation** - Verifies merchant exists and is active
3. **User Management** - Creates user record if doesn't exist
4. **Transaction Recording** - Stores purchase details
5. **Token Calculation** - Computes rewards based on cashback rate

## 💰 Token Economics

### Reward Calculation
```typescript
// Cashback rate is stored in basis points (e.g., 500 = 5%)
const cashbackRate = merchant.cashback_rate / 10000;
const tokensAwarded = Math.floor(purchaseAmount * cashbackRate);
```

### Example Scenarios
| Purchase Amount | Cashback Rate | Tokens Earned |
|----------------|---------------|---------------|
| $10 (1000¢)    | 5% (500 bp)   | 50 LOKAL     |
| $25 (2500¢)    | 3% (300 bp)   | 75 LOKAL     |
| $100 (10000¢)  | 10% (1000 bp) | 1000 LOKAL   |

## 🎨 UI Components

### Success State
Shows when purchase completes successfully:
- ✅ Purchase amount confirmation
- 🪙 Tokens awarded display
- 🔗 Blockchain explorer link
- 📝 Database record ID

### Error Handling
Common error scenarios:
- 🔴 Wallet not connected
- 🔴 Invalid purchase amount
- 🔴 Merchant not found
- 🔴 Insufficient SOL balance
- 🔴 Network/RPC errors
- 🔴 Database connection issues

### Loading States
- 🔄 Wallet connection verification
- 🔄 Merchant validation
- 🔄 Blockchain transaction processing
- 🔄 Database recording

## 🧪 Testing

### Manual Testing Checklist
- [ ] Wallet connection works
- [ ] Valid merchant address accepted
- [ ] Invalid merchant address rejected
- [ ] Purchase amount validation
- [ ] Blockchain transaction processes
- [ ] Database records transaction
- [ ] Tokens appear in wallet
- [ ] Explorer link works
- [ ] Error states display correctly
- [ ] Loading states work

### Test Merchants
For testing purposes, ensure you have:
1. A registered merchant account (use RegisterMerchant component)
2. Merchant with sufficient cashback settings
3. Test wallet with sufficient SOL balance

## 🔧 Configuration Options

### Amount Input
- **Minimum**: 0.001 SOL (~$0.02)
- **Format**: SOL decimal input
- **Conversion**: Automatically converts to lamports for blockchain

### Network Support
- **Devnet**: Default for development
- **Mainnet**: Production environment
- **Localnet**: Local validator for testing

### Error Recovery
- **Blockchain Failures**: Shows retry options
- **Database Failures**: Still completes on-chain, manual reconciliation
- **Network Issues**: Automatic retry with exponential backoff

## 🚀 Production Deployment

### Pre-deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Token metadata created
- [ ] Merchant accounts registered
- [ ] Wallet adapter configured for mainnet
- [ ] Error monitoring setup
- [ ] Transaction analytics enabled

### Monitoring
Track these metrics:
- Purchase transaction success rate
- Database recording success rate
- Average transaction time
- Token distribution amounts
- User engagement metrics

## 🆘 Troubleshooting

### Common Issues

**"Merchant not found"**
```bash
# Verify merchant is registered
# Check both blockchain and database
# Ensure wallet address is correct
```

**"Insufficient SOL balance"**
```bash
# Customer needs SOL for transaction fees (~0.001 SOL)
# Merchant needs SOL for account rent
```

**"Database recording failed"**
```bash
# Check database connection
# Verify merchant ID exists
# Check idempotency key uniqueness
```

**"Transaction signature invalid"**
```bash
# Verify network configuration
# Check RPC endpoint connectivity
# Ensure transaction completed on-chain
```

### Debug Mode
Enable detailed logging:
```typescript
// Add to component for debugging
console.log('Merchant data:', merchantData);
console.log('Transaction params:', params);
console.log('API response:', apiResult);
```

## 📚 Related Documentation

- [Merchant Registration](./MERCHANT_REGISTRATION.md)
- [Token Metadata Setup](./TOKEN_METADATA_README.md)
- [Database Schema](./DATABASE_SETUP.md)
- [Anchor Program Guide](./ANCHOR_GUIDE.md)

## 🤝 Support

For issues or questions:
1. Check error messages and logs
2. Verify environment configuration
3. Test with smaller amounts first
4. Check Solana Explorer for transaction status
5. Review database logs for API issues
