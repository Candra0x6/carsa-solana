# 🚀 Quick Start Guide - Voucher Pool

## TL;DR - Get Started in 5 Minutes

### 1. Build the Program
```bash
cd carsa-contracts
anchor build
```

### 2. Deploy to Devnet
```bash
solana config set --url devnet
solana airdrop 2
anchor deploy
```

### 3. Initialize Pool (TypeScript)
```typescript
import * as anchor from "@coral-xyz/anchor";
import { initializePool } from './voucher-pool-client';

const config = {
  minStakeAmount: new anchor.BN(1_000_000),
  maxStakePerUser: new anchor.BN(1_000_000_000_000),
  depositsEnabled: true,
  withdrawalsEnabled: true,
  apyBasisPoints: 1200, // 12% APY
};

await initializePool(
  program,
  poolAuthority,
  poolDelegate.publicKey,
  lokalMintAddress,
  config
);
```

### 4. Frontend Integration
```tsx
// Add the component to your app
import VoucherStakingWidget from './frontend-integration-example';

function App() {
  return <VoucherStakingWidget />;
}
```

## 📦 Files to Use

| File | Purpose |
|------|---------|
| `voucher-pool-client.ts` | TypeScript client library |
| `frontend-integration-example.tsx` | React component |
| `VOUCHER_POOL_README.md` | Full documentation |
| `IMPLEMENTATION_SUMMARY.md` | This summary |

## 🔑 Environment Variables

```bash
# Backend
POOL_DELEGATE_KEYPAIR_PATH=/path/to/delegate.json
RPC_ENDPOINT=https://api.devnet.solana.com

# Frontend
NEXT_PUBLIC_PROGRAM_ID=FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY
NEXT_PUBLIC_LOKAL_MINT=<your_mint_address>
NEXT_PUBLIC_POOL_DELEGATE=<your_delegate_pubkey>
```

## 🎯 Key Functions

### For Users (Frontend)
```typescript
// 1. Approve delegation
const approveIx = createApproveInstruction(
  userTokenAccount,
  poolDelegate,
  userPublicKey,
  amount
);

// 2. Revoke delegation
const revokeIx = createRevokeInstruction(
  userTokenAccount,
  userPublicKey
);

// 3. Redeem stake
await redeemVoucher(program, userKeypair, mint, amount);
```

### For Backend
```typescript
// 1. Deposit (using delegation)
await depositVoucher(
  program,
  delegateKeypair,
  userPublicKey,
  mint,
  amount
);

// 2. Record yield
await recordYield(program, delegateKeypair, solAmount);
```

### For Admin
```typescript
// Update pool config
await updatePoolConfig(program, authorityKeypair, newConfig);
```

## 📊 Query Pool Data

```typescript
// Get pool state
const poolData = await getPoolState(program);
console.log("Total Staked:", poolData.totalVoucherStaked);
console.log("Total Yield:", poolData.totalYieldEarned);

// Get user stake
const userStake = await getUserStakeRecord(program, userPublicKey);
console.log("User Staked:", userStake.stakedAmount);
```

## 🔐 Security Checklist

- ✅ Test on devnet first
- ✅ Secure pool delegate keypair
- ✅ Set reasonable limits
- ✅ Monitor for unusual activity
- ✅ Have emergency plan ready

## 🐛 Common Issues

**"Unauthorized delegate"**
→ Pool delegate doesn't match the one set in pool state

**"Deposits disabled"**
→ Set `depositsEnabled: true` in pool config

**"Exceeds max stake"**
→ User trying to stake more than `maxStakePerUser`

## 📚 Need More Help?

1. Read `VOUCHER_POOL_README.md` for complete guide
2. Check `voucher-pool-client.ts` for examples
3. Review `tests/voucher-pool-workflow.ts` for test cases
4. See `../docs/yield-pool.md` for design details

## 🎉 You're Ready!

The system is:
- ✅ Built and compiled
- ✅ Fully documented
- ✅ Ready to deploy
- ✅ Tested on devnet

Start with the examples and customize for your needs!
