# 🪙 LOKAL Token Voucher Pool - Non-Custodial Staking System

## Overview

This implementation provides a **non-custodial staking system** for LOKAL tokens that allows users to earn yield on their voucher tokens without giving up custody. The system uses **delegated token authority** to enable automatic staking while maintaining user control.

## 🎯 Key Features

- ✅ **Non-custodial**: Users retain full control of their tokens
- ✅ **Delegated staking**: Backend can stake on behalf of users with approval
- ✅ **Automatic yield**: Tokens earn yield through SOL staking
- ✅ **Easy revocation**: Users can revoke approval at any time
- ✅ **Transparent**: All operations are on-chain and verifiable
- ✅ **Secure**: Limited approval amounts and PDA-based authority

## 📁 Files Added

### Smart Contract (Rust)
1. **`programs/carsa/src/state.rs`** (updated)
   - Added `PoolState` - Main pool state account
   - Added `PoolConfig` - Pool configuration struct
   - Added `UserStakeRecord` - Individual user stake tracking
   - Added PDA seeds constants

2. **`programs/carsa/src/instructions/voucher_pool.rs`** (new)
   - `InitializePool` - Set up a new staking pool
   - `DepositVoucher` - Stake tokens using delegated authority
   - `RecordYield` - Track yield earned from staking
   - `RedeemVoucher` - Unstake and claim rewards
   - `UpdatePoolConfig` - Modify pool settings

3. **`programs/carsa/src/error.rs`** (updated)
   - Added voucher pool-specific error codes

4. **`programs/carsa/src/lib.rs`** (updated)
   - Exposed voucher pool instructions in the program module

5. **`programs/carsa/Cargo.toml`** (updated)
   - Enabled `init-if-needed` feature for Anchor

### Client & Integration (TypeScript/React)
1. **`voucher-pool-client.ts`** (new)
   - Complete TypeScript client with examples
   - Helper functions for PDA derivation
   - Query functions for pool and user data
   - Demo script

2. **`frontend-integration-example.tsx`** (new)
   - React component for frontend integration
   - Approve/Revoke delegation flow
   - User balance and stake display
   - Backend monitoring service example

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Flow                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  1. Earn LOKAL tokens from purchases  │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  2. Approve pool delegate             │
        │     (One-time transaction)            │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  3. Backend monitors approval         │
        │     (Automatic)                       │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  4. Backend executes deposit          │
        │     (Uses delegated authority)        │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  5. Tokens staked in pool vault       │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  6. Backend swaps to SOL & stakes     │
        │     (Optional, off-chain)             │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  7. Yield accrues automatically       │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  8. User can redeem anytime           │
        │     (Get tokens + yield back)         │
        └───────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.18/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node dependencies
yarn install
```

### Build the Program

```bash
cd carsa-contracts
anchor build
```

### Deploy to Devnet

```bash
# Configure for devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 2

# Deploy
anchor deploy
```

## 📖 Usage Guide

### 1. Initialize the Pool (Admin)

```typescript
import { initializePool } from './voucher-pool-client';

const poolConfig = {
  minStakeAmount: new BN(1_000_000), // 0.001 LOKAL
  maxStakePerUser: new BN(1_000_000_000_000), // 1,000 LOKAL
  depositsEnabled: true,
  withdrawalsEnabled: true,
  apyBasisPoints: 1200, // 12% APY
};

await initializePool(
  program,
  poolAuthority,
  poolDelegate.publicKey,
  lokalMint,
  poolConfig
);
```

### 2. Frontend: User Approves Delegation

```typescript
import { createApproveInstruction } from '@solana/spl-token';

// User approves pool delegate to spend tokens
const approveIx = createApproveInstruction(
  userTokenAccount,
  poolDelegatePublicKey,
  userPublicKey,
  amount
);

await wallet.sendTransaction(new Transaction().add(approveIx), connection);
```

### 3. Backend: Monitor and Execute Deposits

```typescript
// Backend monitors for approvals
// When detected, execute deposit using delegated authority

await depositVoucher(
  program,
  poolDelegateKeypair,
  userPublicKey,
  lokalMint,
  amount
);
```

### 4. User: Redeem Stake

```typescript
await redeemVoucher(
  program,
  userKeypair,
  lokalMint,
  amountToRedeem
);
```

### 5. User: Revoke Approval (Anytime)

```typescript
import { createRevokeInstruction } from '@solana/spl-token';

// User revokes approval
const revokeIx = createRevokeInstruction(
  userTokenAccount,
  userPublicKey
);

await wallet.sendTransaction(new Transaction().add(revokeIx), connection);
```

## 🔐 Security Considerations

### User Safety
- ✅ **Non-custodial**: Users never transfer ownership
- ✅ **Limited approval**: Only approve what you want to stake
- ✅ **Easy revocation**: One transaction to revoke
- ✅ **Transparent**: All actions are on-chain

### Best Practices
1. **Limit approval amounts**: Only approve what you intend to stake
2. **Revoke after use**: Revoke approval when done staking
3. **Monitor your account**: Check your stake regularly
4. **Use PDAs**: All program authorities are PDAs (no private keys)

### Backend Security
- 🔒 Protect the pool delegate keypair
- 🔒 Validate all user approvals before depositing
- 🔒 Implement rate limiting
- 🔒 Monitor for unusual activity
- 🔒 Use secure key management (AWS KMS, etc.)

## 📊 State Accounts

### PoolState
```rust
pub struct PoolState {
    pub pool_authority: Pubkey,        // Admin
    pub pool_delegate: Pubkey,         // Backend service
    pub vault_ata: Pubkey,             // Token vault
    pub voucher_mint: Pubkey,          // LOKAL mint
    pub config: PoolConfig,            // Configuration
    pub total_voucher_staked: u64,    // Total staked
    pub total_sol_staked: u64,        // Total SOL staked
    pub total_yield_earned: u64,      // Total yield
    pub total_stakers: u64,           // Number of stakers
    pub reward_index: u128,           // Yield distribution index
    // ... timestamps and bump
}
```

### UserStakeRecord
```rust
pub struct UserStakeRecord {
    pub user: Pubkey,                 // User owner
    pub pool: Pubkey,                 // Pool reference
    pub staked_amount: u64,           // Amount staked
    pub user_reward_index: u128,      // Yield snapshot
    pub total_yield_claimed: u64,     // Claimed rewards
    // ... timestamps and bump
}
```

## 🎪 Events

The program emits events for monitoring:

- `PoolInitializedEvent` - When pool is created
- `VoucherDepositedEvent` - When tokens are staked
- `YieldRecordedEvent` - When yield is recorded
- `VoucherRedeemedEvent` - When user unstakes
- `PoolConfigUpdatedEvent` - When config changes

## 🧪 Testing

```bash
# Run all tests
anchor test

# Run specific test file
anchor test tests/voucher-pool.ts
```

### Test Coverage
- ✅ Pool initialization
- ✅ Deposit with delegation
- ✅ Yield recording and distribution
- ✅ Redemption with yield claims
- ✅ Config updates
- ✅ Error cases (unauthorized, insufficient balance, etc.)

## 🔧 Configuration

### Environment Variables
```bash
# Backend service
POOL_DELEGATE_KEYPAIR_PATH=/path/to/pool-delegate.json
POOL_MONITOR_INTERVAL_MS=5000
RPC_ENDPOINT=https://api.devnet.solana.com

# Frontend
NEXT_PUBLIC_PROGRAM_ID=FicaEwstRkE9pwHZPWS34XAjnbH6vc8aZ2Ly4EiksmxY
NEXT_PUBLIC_LOKAL_MINT=<your_mint_address>
NEXT_PUBLIC_POOL_DELEGATE=<your_delegate_address>
NEXT_PUBLIC_CLUSTER=devnet
```

## 📈 Yield Distribution

The system uses a **reward index** mechanism for proportional yield distribution:

```
Yield Per Token = Total Yield / Total Staked
User Claimable Yield = User Stake × (Current Index - User's Snapshot Index)
```

This ensures:
- Fair distribution based on stake size
- Accurate tracking even with deposits/withdrawals
- Gas-efficient (no per-user iteration)

## 🛠️ Admin Operations

### Update Pool Config
```typescript
await updatePoolConfig(program, poolAuthority, {
  minStakeAmount: new BN(2_000_000),
  maxStakePerUser: new BN(2_000_000_000_000),
  depositsEnabled: true,
  withdrawalsEnabled: true,
  apyBasisPoints: 1500, // 15% APY
});
```

### Pause Deposits/Withdrawals
```typescript
// Pause deposits
await updatePoolConfig(program, poolAuthority, {
  ...currentConfig,
  depositsEnabled: false,
});

// Pause withdrawals (emergency only!)
await updatePoolConfig(program, poolAuthority, {
  ...currentConfig,
  withdrawalsEnabled: false,
});
```

## 🐛 Troubleshooting

### Common Issues

**"Unauthorized delegate"**
- Ensure the pool delegate keypair matches the one set during initialization

**"Deposits disabled"**
- Check pool config: `config.depositsEnabled` must be true

**"Exceeds max stake"**
- User is trying to stake more than `config.maxStakePerUser`

**"Invalid amount"**
- Amount must be >= `config.minStakeAmount`

## 📚 Additional Resources

- [Solana Token Program Documentation](https://spl.solana.com/token)
- [Anchor Framework Documentation](https://www.anchor-lang.com/)
- [SPL Stake Pool Program](https://spl.solana.com/stake-pool)
- [yield-pool.md](../docs/yield-pool.md) - Original design document

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📄 License

This project is part of the CARSA loyalty program system.

## 🙋 Support

For questions or issues:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review the test files for examples

---

**Built with ❤️ for the CARSA ecosystem**
