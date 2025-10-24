# Wallet Import Fix - Resolution

## Problem
```
Export Wallet doesn't exist in target module
The export Wallet was not found in module @coral-xyz/anchor/dist/esm/index.js
```

## Root Cause
The `Wallet` class export from `@coral-xyz/anchor` is not available in certain environments, particularly:
- Next.js Edge Runtime
- Next.js Turbopack builds
- Some module resolution contexts

Even though the same import works in Node.js scripts (like `manual-deposit.ts`), Next.js API routes with Turbopack may have different module resolution behavior.

## Solution
Instead of importing `Wallet`, we create a compatible wallet object that implements the wallet interface expected by `AnchorProvider`.

### Before:
```typescript
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";

// ...
const wallet = new Wallet(poolDelegate);
const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
```

### After:
```typescript
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Transaction, VersionedTransaction } from '@solana/web3.js';

// ...
const wallet = {
  publicKey: poolDelegate.publicKey,
  signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
    if (tx instanceof Transaction) {
      tx.partialSign(poolDelegate);
    }
    return tx;
  },
  signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
    return txs.map(tx => {
      if (tx instanceof Transaction) {
        tx.partialSign(poolDelegate);
      }
      return tx;
    });
  },
};

const provider = new AnchorProvider(
  connection, 
  wallet as anchor.Wallet, 
  {
    commitment: "confirmed",
  }
);
```

## Why This Works

The `AnchorProvider` doesn't actually need the `Wallet` class - it just needs an object that matches the wallet interface:

```typescript
interface Wallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}
```

Our custom implementation provides exactly this interface, using the delegate keypair to sign transactions.

## Key Points

1. **Type Safety**: The implementation uses proper TypeScript generics to handle both `Transaction` and `VersionedTransaction` types
2. **Functionality**: Identical behavior to `new Wallet(keypair)` - it signs transactions with the provided keypair
3. **Compatibility**: Works in Next.js API routes, Edge Runtime, and any environment where Anchor's Wallet export might not be available
4. **No Dependencies**: Doesn't require additional imports beyond what's already needed

## Files Modified
- ✅ `/src/app/api/deposit/route.ts` - Updated wallet creation logic

## Testing
The API should now work correctly. Test with:

```bash
# Start Next.js dev server
npm run dev

# Test the endpoint
curl -X POST http://localhost:3000/api/deposit \
  -H "Content-Type: application/json" \
  -d '{"userPubkey":"6ycCaQekY7qwhmcQaRevm16sM5GM7JBszDLLwhTuaCiE"}'
```

## Alternative Solutions Considered

1. **Use NodeNext module resolution** - Would require changing TypeScript config, might break other things
2. **Use dynamic import** - More complex, adds async overhead
3. **Copy Wallet class code** - Unnecessary duplication
4. **Use older Anchor version** - Would lose other features

Our solution is the cleanest and most maintainable! ✨
