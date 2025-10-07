# 🚀 CARSA Solana Project Setup Guide

This guide will help you set up the complete CARSA Solana project, including smart contracts, token initialization, and frontend integration.

## 📋 Prerequisites

Before running the setup, ensure you have the following installed:

### Required Tools
- **Node.js** (v18+) and **yarn**
- **Rust** and **Cargo**
- **Solana CLI** (v1.18+)
- **Anchor CLI** (v0.31+)

### Installation Commands

```bash
# Install Node.js and yarn
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g yarn

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"
export PATH="/home/$USER/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor CLI
npm install -g @coral-xyz/anchor-cli
```

## 🎯 Quick Start

### One-Command Setup (Recommended)

Run the main setup script to deploy everything to devnet:

```bash
./setup.sh
```

This will:
1. ✅ Check all dependencies
2. ⚙️ Configure Solana for devnet
3. 🏗️ Build and deploy smart contracts
4. 🪙 Initialize LOKAL token
5. 🎨 Setup frontend environment
6. 📁 Copy contract types to frontend

### Custom Network Setup

You can deploy to different networks:

```bash
# Deploy to devnet (default)
./setup.sh --network devnet

# Deploy to localnet (requires running local validator)
./setup.sh --network localnet

# Deploy to mainnet (use with caution!)
./setup.sh --network mainnet
```

## 🛠️ Development Workflow

### Daily Development

1. **Quick Rebuild & Redeploy** (after contract changes):
```bash
./redeploy.sh devnet
```

2. **Start Development Environment**:
```bash
# Start frontend only (uses devnet)
./dev.sh

# Start local validator + frontend
./dev.sh --local-validator
```

3. **Token Management**:
```bash
# Check token info
./token-manager.sh info

# Check balance
./token-manager.sh balance <wallet_address>

# Mint tokens (requires authority)
./token-manager.sh mint <wallet_address> <amount>
```

## 📂 Project Structure

```
carsa/
├── setup.sh              # Main setup script
├── redeploy.sh           # Quick redeploy script
├── dev.sh                # Development environment
├── token-manager.sh      # Token management utilities
├── carsa-contracts/      # Solana smart contracts
│   ├── programs/carsa/   # Main program source
│   ├── initialize-token.ts # Token initialization
│   └── lokal-token-addresses.json # Generated addresses
└── carsa-frontend/       # Next.js frontend
    ├── src/              # Frontend source code
    ├── .env.local        # Environment variables
    └── package.json      # Dependencies
```

## 🔧 Configuration Files

### Environment Variables

The setup script creates `.env.local` in the frontend with:

```bash
# Solana Configuration
NEXT_PUBLIC_ANCHOR_PROGRAM_ID=<program_id>
NEXT_PUBLIC_SOLANA_NETWORK="https://api.devnet.solana.com"
NEXT_PUBLIC_LOKAL_MINT_ADDRESS=<mint_address>

# Database (configure as needed)
DATABASE_URL="postgresql://username:password@localhost:5432/carsa_db"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=<generated_secret>

# Server Operations
SERVER_WALLET_PRIVATE_KEY=<server_wallet_key>
```

### Contract Addresses

After deployment, addresses are saved in `carsa-contracts/lokal-token-addresses.json`:

```json
{
  "mintAddress": "...",
  "configPda": "...",
  "mintAuthorityPda": "...",
  "programId": "...",
  "updateAuthority": "..."
}
```

## 🚀 Running the Application

### Start Frontend Development Server

```bash
cd carsa-frontend
yarn dev
```

The frontend will be available at `http://localhost:3000`

### Frontend Features

- 🔐 Wallet connection (Phantom, Solflare, etc.)
- 💰 Token balance display
- 🛒 Purchase processing
- 👤 Merchant dashboard
- 📊 Transaction history

## 🧪 Testing

### Run Contract Tests

```bash
cd carsa-contracts
anchor test
```

### Test Token Operations

```bash
# Check your wallet balance
./token-manager.sh balance $(solana address)

# Request devnet SOL airdrop
solana airdrop 2

# Check token supply
./token-manager.sh supply
```

## 🔍 Troubleshooting

### Common Issues

1. **"Anchor not found"**
   ```bash
   npm install -g @coral-xyz/anchor-cli
   ```

2. **"Insufficient funds"**
   ```bash
   solana airdrop 2  # For devnet/testnet
   ```

3. **"Program not deployed"**
   ```bash
   ./redeploy.sh devnet
   ```

4. **"Token not initialized"**
   ```bash
   cd carsa-contracts
   npx ts-node initialize-token.ts
   ```

### Reset Everything

If you need to start fresh:

```bash
# Clean contract artifacts
cd carsa-contracts
rm -rf target/
rm -f lokal-token-addresses.json
rm -f lokal-mint-keypair.json

# Rebuild and redeploy
./setup.sh
```

## 🌐 Network Information

### Devnet (Default)
- **RPC**: `https://api.devnet.solana.com`
- **Explorer**: `https://explorer.solana.com/?cluster=devnet`
- **Faucet**: Built into CLI with `solana airdrop`

### Localnet
- **RPC**: `http://localhost:8899`
- **Start**: `./dev.sh --local-validator`

### Mainnet
- **RPC**: `https://api.mainnet-beta.solana.com`
- **⚠️ Use with real SOL - no airdrops available**

## 📚 Additional Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [SPL Token Program](https://spl.solana.com/token)
- [Next.js Documentation](https://nextjs.org/docs)

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure you have sufficient devnet SOL
4. Check the console logs for detailed error messages

## 📝 Script Reference

| Script | Purpose | Usage |
|--------|---------|--------|
| `setup.sh` | Complete project setup | `./setup.sh [--network devnet]` |
| `redeploy.sh` | Quick contract redeploy | `./redeploy.sh [devnet]` |
| `dev.sh` | Start development environment | `./dev.sh [--local-validator]` |
| `token-manager.sh` | Token operations | `./token-manager.sh <command>` |

---

**Happy Building! 🚀**
