# Carsa On-Chain First Architecture

This implementation enforces **on-chain confirmation before database writes** for all operations, supporting both client-initiated and server-initiated transaction flows.

## Architecture Overview

### Core Principle
**Every change must be executed on-chain first**. The system ensures:
1. On-chain transaction is sent and confirmed
2. Only after confirmation, off-chain database is updated
3. Idempotency prevents duplicate operations
4. Audit trails track every operation

### Flow Types

#### A. Client-Initiated (User Wallet Signs)
```
User → Frontend → Anchor Program → Wait for Confirmation → Sync API → Database
```

#### B. Server-Initiated (Server/Relayer Signs)
```
Client → API → Server Signs → Anchor Program → Wait for Confirmation → Database
```

## System Components

### 1. Anchor Program Integration (`lib/anchor-client.ts`)
- Server-side Anchor program interactions
- Secure wallet management with KMS/HSM support
- Transaction confirmation waiting with timeout
- Account state verification

### 2. Database Service (`lib/database-service.ts`)
- **On-chain verification before writes**: All database operations verify transaction confirmation first
- **Idempotency support**: Prevents duplicate operations with unique keys
- **Audit trails**: Stores transaction signatures, slots, and confirmation timestamps
- **Relationship management**: Updates user-merchant relationships atomically

### 3. Transaction Services (`lib/transaction-service.ts`)
- **ClientTransactionService**: Handles user wallet-signed transactions
- **ServerTransactionService**: Handles API-initiated transactions
- Unified interface for both flow types

### 4. API Endpoints

#### Server-Initiated Endpoints
- `POST /api/anchor/register-merchant`: Register merchant via server
- `POST /api/anchor/update-merchant`: Update merchant settings
- `POST /api/anchor/process-purchase`: Process purchase and distribute rewards

#### Client Sync Endpoint
- `POST /api/sync/transaction`: Sync client-initiated transactions after confirmation

## Database Schema

### Key Tables

#### Merchants
```sql
-- Core merchant data with on-chain metadata
CREATE TABLE merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  wallet_address TEXT UNIQUE NOT NULL,
  cashback_rate INTEGER NOT NULL, -- basis points
  tx_signature TEXT, -- registration tx
  slot INTEGER, -- Solana slot
  confirmed_at TIMESTAMP, -- when confirmed
  -- ... other fields
);
```

#### Transactions
```sql
-- All operations tracked with on-chain proof
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  blockchain_signature TEXT UNIQUE, -- Solana tx signature
  transaction_type TEXT NOT NULL, -- REWARD_MINT, REDEMPTION, etc.
  user_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  amount DECIMAL(18,9), -- token amount
  fiat_amount DECIMAL(10,2), -- fiat equivalent
  slot INTEGER, -- Solana slot
  blockchain_confirmed_at TIMESTAMP,
  -- ... other fields
);
```

#### Idempotency Records
```sql
-- Prevents duplicate API calls
CREATE TABLE idempotency_records (
  key TEXT PRIMARY KEY,
  tx_signature TEXT,
  db_record_id TEXT,
  status TEXT, -- PENDING, COMPLETED, FAILED
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

## Usage Examples

### 1. Client-Initiated Merchant Registration

```typescript
import { getTransactionService } from '@/lib/transaction-service';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

const { wallet } = useWallet();
const { connection } = useConnection();

const clientService = getTransactionService('client', {
  wallet: wallet.adapter,
  connection
});

// User signs transaction, then sync to DB
const result = await clientService.executeAndSync(anchorTransaction, {
  transactionType: 'register-merchant',
  name: 'Coffee Shop',
  category: 'FOOD_BEVERAGE',
  cashbackRate: 500,
  addressLine1: '123 Main St',
  city: 'Bandung',
  walletAddress: publicKey.toString()
});
```

### 2. Server-Initiated Purchase Processing

```typescript
import { getTransactionService } from '@/lib/transaction-service';

const serverService = getTransactionService('server');

// Server signs and processes transaction
const result = await serverService.processPurchase({
  customerWallet: customerPublicKey,
  merchantId: merchantId,
  purchaseAmount: 50000, // IDR
  idempotencyKey: `purchase-${uniqueId}`
});
```

### 3. API Integration with Idempotency

```bash
# Register merchant with idempotency
curl -X POST /api/anchor/register-merchant \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: register-merchant-123" \
  -d '{
    "name": "Demo Store",
    "category": "RETAIL",
    "cashbackRate": 300,
    "addressLine1": "456 Shop St",
    "city": "Bandung",
    "walletAddress": "ABC123..."
  }'
```

## Security Features

### 1. Server Wallet Security
```typescript
// Production: Use KMS/HSM for private key storage
const serverWallet = getServerWallet({
  // Private key retrieved from secure storage
  privateKey: await kms.getSecretValue('server-wallet-key')
});
```

### 2. Idempotency Protection
```typescript
// Automatic duplicate prevention
const idempotencyKey = request.headers['idempotency-key'] || generateUUID();
const existing = await dbService.checkIdempotencyKey(idempotencyKey);

if (existing?.status === 'completed') {
  return existingResult; // Return cached result
}
```

### 3. Authentication & Authorization
```typescript
// Validate API calls (implement as needed)
const authResult = await validateJWT(request.headers.authorization);
if (!authResult.valid) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Error Handling

### 1. Transaction Failures
```typescript
try {
  const txSignature = await anchorClient.processPurchase(params);
  const confirmed = await anchorClient.waitForConfirmation(txSignature);
  
  if (!confirmed) {
    throw new Error('Transaction failed to confirm');
  }
  
  await dbService.recordPurchase(txSignature, params);
  
} catch (error) {
  // Log error and return appropriate response
  logger.error('Transaction failed', { error, params });
  return { success: false, error: error.message };
}
```

### 2. Partial Failures
```typescript
// Handle case where tx succeeded but DB write failed
if (txSucceeded && !dbWriteSucceeded) {
  // Queue for retry with background reconciler
  await retryQueue.add('sync-transaction', {
    txSignature,
    metadata: params
  });
}
```

## Deployment Considerations

### 1. Environment Variables
```bash
# Server wallet (use KMS in production)
SERVER_WALLET_PRIVATE_KEY=[1,2,3,...]

# Solana network
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Anchor program
NEXT_PUBLIC_ANCHOR_PROGRAM_ID=4rxv5KW47SDCVEQcgc2dDQxcWDyZ965SCTnA7sqF7gqT

# Database
DATABASE_URL=postgresql://...
```

### 2. Monitoring & Alerting
- Transaction confirmation timeouts
- Database sync failures
- Idempotency key collisions
- Rate limiting violations

### 3. Background Jobs
- Cleanup old idempotency records
- Reconcile failed database syncs
- Monitor pending transactions

## Testing

### 1. Unit Tests
```typescript
// Test on-chain confirmation requirement
it('should reject database write without confirmation', async () => {
  const mockTxSignature = 'invalid-tx';
  
  await expect(
    dbService.registerMerchant({ txSignature: mockTxSignature, ... })
  ).rejects.toThrow('Transaction not confirmed on-chain');
});
```

### 2. Integration Tests
```typescript
// Test full client flow
it('should complete client-initiated registration', async () => {
  const transaction = createMockTransaction();
  const result = await clientService.executeAndSync(transaction, metadata);
  
  expect(result.success).toBe(true);
  expect(result.txSignature).toBeDefined();
  expect(result.dbRecordId).toBeDefined();
});
```

### 3. Load Testing
- Concurrent API requests with same idempotency key
- High-volume transaction processing
- Database connection pool limits

## Migration Strategy

### 1. Existing Systems
For systems with existing off-chain data:
1. Create migration scripts to verify on-chain state
2. Reconcile discrepancies
3. Implement dual-write pattern during transition

### 2. Gradual Rollout
1. Deploy with feature flags
2. Start with low-risk operations
3. Monitor error rates and performance
4. Gradually increase traffic

This architecture ensures data integrity, provides audit trails, and supports both user-driven and system-driven transaction flows while maintaining the security and immutability guarantees of the Solana blockchain.
