# 🎨 CARSA Token Metadata Setup Guide

This guide walks you through setting up metadata for the LOKAL token using Metaplex standards.

## 📋 Overview

The LOKAL token is the utility token for the CARSA loyalty program. This setup creates:
- JSON metadata following Metaplex standards
- On-chain metadata account for wallet/explorer display
- Arweave storage for decentralized metadata hosting

## 🚀 Quick Start

### Automatic Setup (Recommended)
The main setup script includes metadata creation:

```bash
# Run the full project setup (includes metadata)
./setup.sh

# Or run metadata setup only
./metadata-manager.sh prepare
./metadata-manager.sh create
```

### Manual Setup

1. **Install Dependencies**
   ```bash
   cd carsa-contracts
   yarn add @metaplex-foundation/js @metaplex-foundation/mpl-token-metadata
   ```

2. **Prepare Metadata Files**
   ```bash
   npx ts-node create-metadata.ts
   ```

3. **Install Metaplex CLI**
   ```bash
   bash <(curl -sSf https://sugar.metaplex.com/install.sh)
   ```

4. **Create On-Chain Metadata**
   ```bash
   ./create-token-metadata.sh
   ```

## 📁 Files Created

| File | Description |
|------|-------------|
| `lokal-token-metadata.json` | Base metadata template |
| `lokal-token-metadata-complete.json` | Complete metadata with addresses |
| `metaplex-config.json` | Metaplex CLI configuration |
| `create-token-metadata.sh` | Automated upload script |
| `lokal-token-summary.json` | Complete setup summary |

## 🛠️ Metadata Manager Script

Use the `metadata-manager.sh` script for all metadata operations:

```bash
# Prepare metadata files
./metadata-manager.sh prepare

# Create on-chain metadata (requires ~0.05 SOL)
./metadata-manager.sh create

# Update existing metadata
./metadata-manager.sh update

# Verify metadata state
./metadata-manager.sh verify

# Show summary
./metadata-manager.sh summary

# Install Metaplex CLI
./metadata-manager.sh install-cli
```

## 🎯 Token Metadata Structure

### Basic Information
- **Name**: Lokal Token
- **Symbol**: LOKAL
- **Decimals**: 9
- **Supply**: Unlimited (mintable by program)

### Extended Attributes
- **Type**: Loyalty Token
- **Use Case**: Merchant Rewards
- **Network**: Solana
- **Program**: CARSA Loyalty

### Utility Features
- Earn rewards from purchases at participating merchants
- Redeem for discounts and products
- Transfer between users
- Merchant loyalty program participation

## 🔧 Manual Metaplex CLI Commands

If you prefer using Metaplex CLI directly:

### Create Metadata
```bash
metaplex create-metadata \
  --keypair ~/.config/solana/id.json \
  --rpc https://api.devnet.solana.com \
  --mint YOUR_MINT_ADDRESS \
  --metadata ./lokal-token-metadata-complete.json \
  --update-authority YOUR_WALLET_ADDRESS
```

### Update Metadata
```bash
metaplex update-metadata \
  --keypair ~/.config/solana/id.json \
  --rpc https://api.devnet.solana.com \
  --mint YOUR_MINT_ADDRESS \
  --metadata ./lokal-token-metadata-complete.json
```

### Verify Metadata
```bash
metaplex show YOUR_MINT_ADDRESS \
  --rpc https://api.devnet.solana.com
```

## 🌐 Network Configuration

### Devnet (Default)
- RPC: `https://api.devnet.solana.com`
- Arweave: `https://devnet.bundlr.network`
- Cost: ~0.05 SOL for metadata creation

### Mainnet
```bash
export SOLANA_NETWORK=mainnet
./metadata-manager.sh create
```

### Local Development
```bash
export SOLANA_NETWORK=localnet
./metadata-manager.sh create
```

## 💰 Cost Breakdown

### Devnet
- Metadata Account: ~0.002 SOL
- Arweave Upload: ~0.02-0.05 SOL
- **Total**: ~0.05 SOL

### Mainnet
- Metadata Account: ~0.002 SOL
- Arweave Upload: ~$0.01-0.05 USD
- **Total**: Varies by Arweave pricing

## 🔍 Verification

After creating metadata, verify it's working:

1. **Check Token Info**
   ```bash
   spl-token display YOUR_MINT_ADDRESS
   ```

2. **View in Solana Explorer**
   - Devnet: `https://explorer.solana.com/address/YOUR_MINT_ADDRESS?cluster=devnet`
   - Mainnet: `https://explorer.solana.com/address/YOUR_MINT_ADDRESS`

3. **Test Wallet Display**
   - Import token in Phantom/Solflare
   - Should show name, symbol, and image

## 🐛 Troubleshooting

### Common Issues

**"Insufficient SOL balance"**
```bash
# Get devnet SOL
solana airdrop 2

# Or use web faucet
# https://faucet.solana.com/
```

**"Metaplex CLI not found"**
```bash
# Reinstall Metaplex CLI
bash <(curl -sSf https://sugar.metaplex.com/install.sh)

# Add to PATH
export PATH="$HOME/.local/share/metaplex:$PATH"
```

**"Metadata account already exists"**
```bash
# Update instead of create
./metadata-manager.sh update
```

**"Network connection issues"**
```bash
# Try different RPC endpoint
export SOLANA_RPC_URL=https://api.devnet.solana.com

# Or use custom RPC
export SOLANA_RPC_URL=https://your-rpc-endpoint.com
```

### Debug Mode

Enable verbose logging:
```bash
# Set debug environment
export DEBUG=1

# Run with verbose output
./metadata-manager.sh create
```

## 📚 Additional Resources

- [Metaplex Documentation](https://docs.metaplex.com/)
- [Token Metadata Standard](https://docs.metaplex.com/programs/token-metadata/)
- [Arweave Storage](https://www.arweave.org/)
- [Solana Token Program](https://spl.solana.com/token)

## 🤝 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your setup with `./metadata-manager.sh verify`
3. Review the generated summary with `./metadata-manager.sh summary`
4. Check Solana Explorer for transaction details

## 📄 License

This metadata setup is part of the CARSA project and follows the same license terms.
