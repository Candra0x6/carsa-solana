# 🌐 CARSA Frontend - Next.js Web Application

The frontend web application for the CARSA hyperlocal community currency and loyalty program, built with Next.js, TypeScript, and Solana blockchain integration.

## 🚀 Features

### User Interface
- 📱 **Responsive Design**: Mobile-first approach with desktop support
- 🎨 **Modern UI**: Built with Tailwind CSS and Radix UI components
- 🌙 **Theme Support**: Light/dark mode with theme provider
- ⚡ **Performance**: Optimized with Next.js App Router and Turbopack

### Blockchain Integration
- 🔗 **Solana Wallet Adapter**: Support for Phantom, Solflare, and other wallets
- 🪙 **SPL Token Operations**: Token balance display and transfers
- ⚙️ **Anchor Integration**: Direct smart contract interaction
- 🔐 **Secure Transactions**: Client-side transaction signing and verification

### Core Functionality
- 👤 **User Authentication**: NextAuth.js with wallet-based authentication
- 🏪 **Merchant Management**: Registration, dashboard, and settings
- 💰 **Purchase Processing**: Real-time transaction processing with rewards
- 📊 **Transaction History**: Complete audit trail of all operations
- 🎁 **Token Redemption**: Spend Lokal tokens at participating merchants

## 🛠️ Technology Stack

### Frontend Framework
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe development

### Styling & UI
- **Tailwind CSS 4**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Consistent icon library
- **Framer Motion**: Smooth animations and transitions

### Blockchain & Web3
- **@solana/web3.js**: Solana JavaScript SDK
- **@solana/wallet-adapter**: Wallet connection management
- **@coral-xyz/anchor**: Anchor framework client
- **@solana/spl-token**: SPL token utilities

### Backend & Database
- **Prisma**: Type-safe database ORM
- **NextAuth.js**: Authentication system
- **Supabase**: PostgreSQL database
- **bcryptjs**: Password hashing

### Development Tools
- **ESLint**: Code linting and formatting
- **Jest**: Unit testing framework
- **TypeScript**: Static type checking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Yarn or npm
- Solana wallet browser extension (Phantom recommended)

### Installation

1. **Clone and navigate to frontend:**
   ```bash
   cd carsa-frontend
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure your .env.local:**
   ```bash
   # Solana Configuration
   NEXT_PUBLIC_ANCHOR_PROGRAM_ID=your_program_id
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   NEXT_PUBLIC_LOKAL_MINT_ADDRESS=your_mint_address
   
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/carsa_db"
   
   # Authentication
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET=your_secret_key
   
   # Server Operations
   SERVER_WALLET_PRIVATE_KEY=[1,2,3,...]  # Uint8Array format
   ```

5. **Run database migrations:**
   ```bash
   npx prisma db push
   ```

6. **Start development server:**
   ```bash
   yarn dev
   # or
   npm run dev
   ```

7. **Open application:**
   Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── anchor/               # Anchor program interactions  
│   │   ├── auth/                 # Authentication endpoints
│   │   └── sync/                 # Transaction sync endpoints
│   ├── dashboard/                # User dashboard
│   ├── merchant/                 # Merchant pages
│   ├── merchant-registration/    # Merchant onboarding
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   ├── landing/                  # Landing page components
│   ├── AuthForm.tsx              # Authentication forms
│   ├── MerchantDashboard.tsx     # Merchant management
│   ├── PurchaseTransaction.tsx   # Purchase processing
│   ├── RedeemTokensComponent.tsx # Token redemption
│   └── WalletConnection.tsx      # Wallet integration
├── lib/                          # Utility libraries
│   ├── anchor-client.ts          # Anchor program client
│   ├── database-service.ts       # Database operations
│   ├── transaction-service.ts    # Transaction management
│   ├── auth.ts                   # NextAuth configuration
│   └── prisma.ts                 # Database client
├── types/                        # TypeScript type definitions
├── utils/                        # Helper functions
└── generated/                    # Generated types and clients
```

## 🔧 Development Commands

```bash
# Development
yarn dev              # Start development server with Turbopack
yarn build            # Build for production
yarn start            # Start production server
yarn lint             # Run ESLint

# Database
npx prisma db push    # Push schema to database
npx prisma generate   # Generate Prisma client
npx prisma studio     # Open database browser

# Testing
yarn test             # Run unit tests
yarn test:watch       # Run tests in watch mode
```

## 🏗️ Key Components

### WalletConnection
Manages Solana wallet connection and provides wallet context:
```tsx
import { WalletConnection } from '@/components/WalletConnection';

<WalletConnection>
  <YourApp />
</WalletConnection>
```

### PurchaseTransaction
Handles purchase processing with automatic reward distribution:
```tsx
import PurchaseTransaction from '@/components/PurchaseTransaction';

<PurchaseTransaction 
  merchantWalletAddress="merchant_address"
  onSuccess={(signature) => console.log('Purchase completed:', signature)}
/>
```

### MerchantDashboard
Complete merchant management interface:
```tsx
import { MerchantDashboard } from '@/components/MerchantDashboard';

<MerchantDashboard walletAddress="merchant_wallet" />
```

### RedeemTokensComponent
Token redemption interface for customers:
```tsx
import { RedeemTokensComponent } from '@/components/RedeemTokensComponent';

<RedeemTokensComponent 
  merchantWalletAddress="merchant_address"
  onSuccess={(signature) => console.log('Redemption completed:', signature)}
/>
```

## 🔌 API Integration

### Anchor Program APIs
- `POST /api/anchor/register-merchant` - Register new merchant
- `POST /api/anchor/update-merchant` - Update merchant settings  
- `POST /api/anchor/process-purchase` - Process purchase transaction
- `POST /api/anchor/mint-tokens` - Mint tokens (admin only)

### Transaction Sync APIs
- `POST /api/sync/transaction` - Sync client transactions to database

### Authentication APIs
- `POST /api/auth/signin` - User sign in
- `POST /api/auth/signout` - User sign out
- `GET /api/auth/session` - Get current session

## 🔐 Security Features

### On-Chain First Architecture
All operations are verified on the blockchain before database updates:
```typescript
// Transaction flow
1. Execute on-chain transaction
2. Wait for blockchain confirmation  
3. Update database with transaction proof
4. Return success response
```

### Idempotency Protection
Prevents duplicate operations with unique keys:
```typescript
const idempotencyKey = request.headers['idempotency-key'];
const existing = await checkIdempotencyKey(idempotencyKey);
if (existing?.status === 'completed') {
  return existingResult;
}
```

### Input Validation
Strict validation on all inputs using Zod schemas and type checking.

## 📊 Analytics & Monitoring

### Performance Monitoring
- Next.js built-in analytics
- Real User Monitoring (RUM) ready
- Web Vitals tracking

### Error Tracking
- Comprehensive error boundaries
- API error handling and logging
- Transaction failure recovery

### Database Analytics
- Transaction volume tracking
- Merchant performance metrics
- User engagement analytics

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Docker Deployment
```bash
# Build Docker image
docker build -t carsa-frontend .

# Run container
docker run -p 3000:3000 carsa-frontend
```

### Manual Deployment
```bash
# Build application
yarn build

# Start production server
yarn start
```

## 🧪 Testing

### Unit Testing
```bash
# Run all tests
yarn test

# Run specific test file
yarn test PurchaseTransaction.test.tsx

# Run tests in watch mode
yarn test:watch
```

### Integration Testing
```bash
# Test API endpoints
yarn test:api

# Test components with wallet integration
yarn test:integration
```

## 📚 Additional Documentation

- [Architecture Overview](./ARCHITECTURE.md) - System architecture details
- [Merchant Integration](./MERCHANT_README.md) - Merchant-specific features
- [Purchase Implementation](./PURCHASE_IMPLEMENTATION.md) - Transaction processing
- [Database Setup](./DATABASE_SETUP.md) - Database configuration
- [API Documentation](./docs/off-chain-api.md) - Backend API reference

## 🐛 Troubleshooting

### Common Issues

1. **Wallet Connection Issues**
   ```bash
   # Clear browser cache and try again
   # Ensure wallet extension is installed and unlocked
   ```

2. **Transaction Failures**
   ```bash
   # Check Solana network status
   # Verify sufficient SOL balance for gas fees
   # Ensure program is deployed on correct network
   ```

3. **Database Connection Errors**
   ```bash
   # Verify DATABASE_URL in .env.local
   # Run: npx prisma db push
   ```

### Debug Mode
Enable debug logging by setting:
```bash
NODE_ENV=development
DEBUG=carsa:*
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Run tests: `yarn test`
4. Commit changes: `git commit -am 'Add some feature'`
5. Push to branch: `git push origin feature/my-feature`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

For questions or support, please refer to the main [project README](../README.md) or contact the development team.
