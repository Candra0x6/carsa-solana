# 🚀 Carsa — The Future of Local Economies

[![Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF?style=for-the-badge&logo=solana)](https://solana.com/)
[![Anchor](https://img.shields.io/badge/Framework-Anchor-512BD4?style=for-the-badge)](https://www.anchor-lang.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

### 🪙 Hyperlocal Community Currency for Small Businesses  
**Carsa** empowers MSMEs (micro, small, and medium enterprises) with a **blockchain-based loyalty and rewards ecosystem** — turning everyday purchases into **productive local capital**.  

## 💡 Overview

**Carsa** bridges the gap between **local commerce** and **Web3 finance**.  
When customers shop locally, they earn **Lokal Tokens** — but instead of sitting idle like traditional points, these tokens:  
- ✅ Earn yield while unspent  
- ✅ Build a **LocalRank** reputation score  
- ✅ Unlock community-driven **micro-credits** for loyal users and merchants  

Carsa transforms loyalty into a **self-sustaining, decentralized local economy**.  


## 🚀 Key Features  

| Feature | Description | Why It’s Powerful |
|----------|--------------|------------------|
| 🛍️ **Lokal Tokens** | Earn tokens for shopping locally | Creates a real sense of community ownership |
| 💰 **Auto-Yield Staking** | Unspent tokens generate yield in a Solana pool | Turns idle rewards into productive assets |
| 🧠 **LocalRank Reputation** | Users earn rank for consistent local activity | Gamifies loyalty and builds decentralized trust |
| 💳 **Micro-Credits (Future)** | Borrow small “Lokal advances” via reputation | Enables community-powered credit |
| 📊 **Merchant Dashboard** | Merchants track spend, redemption, and loyalty ROI | Converts data → insights for MSMEs |

---

## 🧩 Problem & Why It Matters  
Small businesses struggle with:  
- ❌ Low customer retention  
- ❌ Inefficient, siloed loyalty systems  
- ❌ Lack of digital tools for tracking and rewards  

**Carsa fixes this** by providing:  
✅ Transparent, interoperable rewards via blockchain  
✅ Shared ecosystem where multiple merchants benefit  
✅ Productive capital that circulates locally  

---

## 🧠 (Hackathon MVP)  

1. **Earn** Lokal tokens after purchasing from a local store  
2. **Spend** them at any other participating merchant  
3. **Track** earnings & spending via merchant dashboard  
4. **Stake** idle tokens for yield (optional in MVP)  
5. **Monitor** community stats (leaderboard, LocalRank)  

🔗 *All transactions are recorded transparently on Solana.*  

---
## 🏗️ Project Architecture

```
carsa-solana/
├── 📁 carsa-contracts/          # Solana smart contracts (Anchor)
│   ├── programs/carsa/          # Main loyalty program logic
│   ├── tests/                   # Comprehensive test suite
│   └── migrations/              # Deployment scripts
├── 📁 carsa-frontend/          # Next.js web application
│   ├── src/app/                # App router pages
│   ├── src/components/         # React components
│   ├── src/lib/                # Utility functions & Solana integration
│   └── prisma/                 # Database schema
├── 📁 docs/                    # Project documentation
├── 🚀 setup.sh                # One-command project setup
├── 🔄 redeploy.sh             # Quick contract redeployment
├── 🛠️ dev.sh                   # Development environment launcher
└── 🪙 token-manager.sh         # Token management utilities
```

## ⚡ Quick Start

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18+) and **yarn**
- **Rust** and **Cargo**  
- **Solana CLI** (v1.18+)
- **Anchor CLI** (v0.31+)

### One-Command Setup

Deploy the entire project to Solana devnet:

```bash
# Clone the repository
git clone https://github.com/yourusername/carsa-solana.git
cd carsa-solana

# Run complete setup (contracts + frontend)
./setup.sh
```

This will:
1. ✅ Verify all dependencies
2. ⚙️ Configure Solana for devnet
3. 🏗️ Build and deploy smart contracts
4. 🪙 Initialize LOKAL token with metadata
5. 🎨 Set up frontend environment
6. 📁 Copy contract types to frontend

### Start Development

```bash
# Start the frontend development server
./dev.sh

# Or with local validator for testing
./dev.sh --local-validator
```

Visit `http://localhost:3000` to see the application.

## 🔧 Core Smart Contract Functions

### Merchant Operations
```rust
// Register a new merchant with custom cashback rate
register_merchant(name, category, cashback_rate: u16)

// Update merchant settings
update_merchant(cashback_rate: u16, is_active: bool)
```

### Customer Transactions  
```rust
// Process purchase with optional token redemption
process_purchase(
    fiat_amount: u64,                    // Purchase in IDR
    redeem_token_amount: Option<u64>,    // Optional token spending
    transaction_id: [u8; 32]             // Unique transaction ID
)
```

### Token Management
```rust
// Direct token minting (admin only)
mint_tokens(amount: u64, recipient: Pubkey)

// Token transfers between accounts
transfer_tokens(amount: u64, destination: Pubkey)
```

## 💡 How It Works

### Purchase Flow
1. **Customer** visits a participating merchant
2. **Merchant** generates QR code with purchase amount
3. **Customer** scans QR code with CARSA mobile app
4. **Transaction** is processed on Solana blockchain:
   - Optional: Customer redeems existing Lokal tokens
   - Purchase amount + token value is recorded
   - Reward tokens are minted based on total value and merchant's cashback rate
5. **Database** is updated with transaction details for analytics
6. **Both parties** receive instant confirmation

### Reward Calculation
```typescript
// Example: $10 purchase at 5% cashback merchant
const purchaseAmount = 10_000_000_000; // 10 LOKAL tokens (9 decimals)
const cashbackRate = 500; // 5% in basis points
const rewardTokens = (purchaseAmount * cashbackRate) / 10_000;
// Customer earns 0.5 LOKAL tokens as reward
```

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `./setup.sh` | Complete project setup and deployment |
| `./redeploy.sh devnet` | Quick contract redeployment |
| `./dev.sh` | Start development environment |
| `./token-manager.sh info` | Display token information |
| `make test` | Run all tests |
| `make clean` | Clean build artifacts |

## 📊 Technology Stack

### Blockchain Layer
- **Solana**: High-performance blockchain with sub-second finality
- **Anchor**: Rust framework for secure smart contract development
- **SPL Token**: Standard token program for Lokal token implementation

### Frontend Stack
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Solana Wallet Adapter**: Seamless wallet integration

### Backend & Database
- **Next.js API Routes**: RESTful API endpoints
- **Prisma ORM**: Type-safe database operations
- **PostgreSQL**: Relational database for off-chain data
- **NextAuth.js**: Authentication system

### Development Tools
- **Anchor CLI**: Smart contract development and testing
- **Solana CLI**: Blockchain interaction and deployment
- **Jest**: Testing framework for frontend
- **Mocha**: Testing framework for smart contracts

## 🔐 Security Features

- **On-Chain First Architecture**: All operations verified on blockchain before database writes
- **Idempotency Protection**: Prevents duplicate transactions
- **Overflow Protection**: Checked arithmetic operations in smart contracts
- **PDA Security**: Program Derived Addresses prevent unauthorized access
- **Transaction Verification**: Multi-layer validation for all operations

## 🌐 Network Support

### Devnet (Default)
- **RPC**: `https://api.devnet.solana.com`
- **Explorer**: `https://explorer.solana.com/?cluster=devnet`
- **Faucet**: Free SOL via `solana airdrop`

### Localnet (Development)
- **RPC**: `http://localhost:8899`
- **Usage**: `./dev.sh --local-validator`

### Mainnet (Production)
- **RPC**: `https://api.mainnet-beta.solana.com`
- **⚠️ Production use only**: Real SOL required

## 📚 Documentation

- 📖 [Setup Guide](./SETUP_GUIDE.md) - Detailed setup instructions
- 🏗️ [Architecture](./carsa-frontend/ARCHITECTURE.md) - System architecture overview
- 🏪 [Merchant Guide](./carsa-frontend/MERCHANT_README.md) - Merchant integration
- 💰 [Purchase System](./carsa-frontend/PURCHASE_IMPLEMENTATION.md) - Transaction processing
- 🗄️ [Database Setup](./carsa-frontend/DATABASE_SETUP.md) - Database configuration
- 🔧 [API Documentation](./carsa-frontend/docs/off-chain-api.md) - Backend API reference

## 🧪 Testing

### Run Smart Contract Tests
```bash
cd carsa-contracts
anchor test
```

### Run Frontend Tests  
```bash
cd carsa-frontend
npm test
```

### Integration Testing
```bash
# Test complete workflow
npm run test:integration
```

## 🚀 Deployment

### Devnet Deployment
```bash
./setup.sh --network devnet
```

### Mainnet Deployment
```bash
# ⚠️ Use with caution - requires real SOL
./setup.sh --network mainnet
```

## 🧭 Roadmap  

| Stage | Features | Goal |
|--------|-----------|------|
| **MVP (Hackathon)** | Earn & Spend flow, merchant dashboard | Functional demo |
| **V2** | Auto-yield staking | Productive rewards |
| **V3** | LocalRank & micro-credits | Social + financial trust |
| **V4** | Multi-city expansion | Scalable ecosystem |

---

## 👥 Team  

| Role | Name | Focus |
|------|------|--------|
| Founder | Candra | Vision & strategy & Dev |

---
## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.


## 🙏 Acknowledgments

- [Solana Foundation](https://solana.org/) for providing the fast, cost-effective blockchain infrastructure
- [Anchor Framework](https://www.anchor-lang.com/) for secure smart contract development tools
- [Next.js Team](https://nextjs.org/) for the excellent React framework
- [Vercel](https://vercel.com/) for hosting and deployment platform

---

<div align="center">

**Built with ❤️ for local communities worldwide**

[Website](https://carsa.vercel.app/)
</div>
