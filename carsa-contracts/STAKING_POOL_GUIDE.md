# Voucher Staking Pool - Setup & Usage Guide

## 🎯 Overview

The non-custodial voucher staking pool is now **fully deployed and functional** on Solana devnet!

- **Program ID**: `FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY`
- **LOKAL Mint**: `5hnUzmpcavbtWJ2LmL9NMefm58gvBRqWsyUtpQd3QHC9`
- **Pool Delegate**: `Hwx6w6vxboAoME2ARayb661yyeT5JShKwxH3Xa489CSR`
- **Pool State PDA**: `CY4nSbSnFWSn3kvksa9G4wzWgS6jd3tfMQLWyti7uibz`

## ✅ What's Working

### Frontend (/carsa-frontend/src/app/test/page.tsx)
- ✅ User wallet connection
- ✅ Display LOKAL token balance
- ✅ Display staked amount (fetched from on-chain data)
- ✅ Approve delegation (allowing auto-staking)
- ✅ Revoke delegation
- ✅ Real-time balance updates

### Backend Scripts (/carsa-contracts/)
- ✅ `initialize-pool.ts` - Initialize the staking pool (ONE TIME SETUP - DONE)
- ✅ `manual-deposit.ts` - Manually deposit tokens for a user
- ✅ `backend-deposit-monitor.ts` - Auto-monitor and deposit approved tokens

## 📝 How It Works

### User Flow:
1. User earns LOKAL tokens from merchant purchases
2. User approves delegation via the frontend (one transaction)
3. Backend service detects the approval
4. Backend automatically calls `deposit_voucher` to stake tokens
5. User's tokens are staked and earning yield (12% APY)
6. User can redeem anytime

### Architecture:
```
┌──────────┐    Approve TX    ┌─────────────┐
│  User    │ ───────────────> │  Frontend   │
│  Wallet  │                  │  (Next.js)  │
└──────────┘                  └─────────────┘
     │                              │
     │                              │ Display Balance
     │                              ↓
     │                        ┌─────────────┐
     │                        │  Solana     │
     │   Delegated Authority  │  Program    │
     └───────────────────────>│  (Anchor)   │
                              └─────────────┘
                                    ↑
                    deposit_voucher │
                                    │
                              ┌─────────────┐
                              │  Backend    │
                              │  Monitor    │
                              └─────────────┘
```

## 🚀 Quick Start

### 1. Run the Frontend
```bash
cd carsa-frontend
npm run dev
```

Visit `/test` page and connect your wallet.

### 2. Run the Backend Monitor (Auto-Staking)
```bash
cd carsa-contracts
ts-node backend-deposit-monitor.ts
```

This will:
- Poll every 10 seconds for new approvals
- Automatically deposit approved tokens
- Log all transactions

### 3. Manual Deposit (Alternative)
If you don't want to run the monitor, manually deposit:

```bash
cd carsa-contracts
ts-node manual-deposit.ts <USER_PUBLIC_KEY>
```

Example:
```bash
ts-node manual-deposit.ts 6ycCaQekY7qwhmcQaRevm16sM5GM7JBszDLLwhTuaCiE
```

## 📊 Pool Configuration

- **Min Stake**: 0.1 LOKAL
- **Max Stake per User**: 1,000,000 LOKAL
- **APY**: 12%
- **Deposits**: Enabled ✅
- **Withdrawals**: Enabled ✅

## 🔧 Scripts Reference

### Initialize Pool (ONE TIME - ALREADY DONE)
```bash
cd carsa-contracts
ts-node initialize-pool.ts
```

### Check Pool State
```bash
solana account CY4nSbSnFWSn3kvksa9G4wzWgS6jd3tfMQLWyti7uibz
```

### Check User Stake
```bash
# First, derive the user stake PDA
# Then check it
solana account <USER_STAKE_PDA>
```

## 💾 Account Structure

### UserStakeRecord
```rust
pub struct UserStakeRecord {
    pub user: Pubkey,              // 32 bytes
    pub staked_amount: u64,        // 8 bytes
    pub total_yield_claimed: u64,  // 8 bytes
    pub staked_at: i64,            // 8 bytes
    pub bump: u8,                  // 1 byte
}
```

Offsets for parsing:
- Discriminator: bytes 0-7
- User: bytes 8-39
- Staked Amount: bytes 40-47 (u64 little-endian)
- Yield Claimed: bytes 48-55
- Staked At: bytes 56-63
- Bump: byte 64

## 🔐 Security

- **Non-custodial**: Users retain full control
- **Limited approval**: Users specify exact amount
- **Revocable**: Can revoke delegation at any time
- **Transparent**: All transactions on-chain

## 🐛 Troubleshooting

### "Simulation failed: no record of a prior credit"
- The pool delegate needs SOL for transaction fees
- Solution: `solana airdrop 2 Hwx6w6vxboAoME2ARayb661yyeT5JShKwxH3Xa489CSR`

### "Pool not initialized"
- Run `ts-node initialize-pool.ts` (already done)

### Tokens not staking after approval
- Make sure the backend monitor is running
- Or manually deposit: `ts-node manual-deposit.ts <USER_PUBKEY>`

### Frontend shows 0 staked but tokens are gone
- Wait 10 seconds for the UI to refresh
- Check on Solana Explorer
- Verify the deposit transaction

## 📈 Monitoring

### Check Delegate Balance
```bash
solana balance Hwx6w6vxboAoME2ARayb661yyeT5JShKwxH3Xa489CSR
```

### View Pool Vault
```bash
spl-token account-info CbmPmKqg6KqN7F9RSYea5aiRSyfP8KTsMHG8EVBVnrwg
```

### View Recent Transactions
```bash
solana transaction-history Hwx6w6vxboAoME2ARayb661yyeT5JShKwxH3Xa489CSR
```

## 🎓 Example Transaction

**User Approval**: [View on Explorer](https://explorer.solana.com/tx/your-tx-here?cluster=devnet)
**Backend Deposit**: [View on Explorer](https://explorer.solana.com/tx/3C9kyDfVi2Nf4bBqKUn7vTFPLpuyv9fRh9ktbEdhkYsBk1YL7Dqre2xsK4cjEvCaV3c7DexEzP8BKwgFvfPNXJq4?cluster=devnet)

## 📞 Support

- Check the Solana Explorer for transaction details
- Review program logs
- Ensure delegate account has sufficient SOL

---

**Status**: ✅ Fully Operational on Devnet
**Last Updated**: October 23, 2025
