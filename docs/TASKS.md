# Carsa - Hyperlocal Community Currency & Loyalty Program Implementation

A mobile-first loyalty & rewards app powered by blockchain where users earn **Lokal tokens** when shopping at local MSMEs and can spend them across a city-wide coalition of merchants on Solana testnet.

## Completed Tasks

- [x] Initialize Anchor project structure
- [x] Set up basic Rust program template

## Completed Tasks

- [x] Initialize Anchor project structure
- [x] Set up basic Rust program template
- [x] Design and implement Lokal token SPL mint program
- [x] Create reward distribution logic in Anchor program

## In Progress Tasks

- [ ] Set up Next.js frontend application structure

## Future Tasks

### Phase 1: Core Blockchain Infrastructure
- [x] Create reward distribution logic in Anchor program
- [x] Implement token transfer and redemption functions

### Phase 2: Backend API Development
- [ ] Set up Next.js project with API routes @solana/web3.js @project-serum/anchor @solana/spl-token @solana/wallet-adapter-base

@solana/wallet-adapter-react

@solana/wallet-adapter-wallets

@solana/wallet-adapter-react-ui


- [ ] Integrate NextAuth with Custodial Wallet for authentication
- [x] Set up Supabase database with Prisma ORM schema
- [ ] QR code generation for merchants
- [ ] Create user registration and management APIs
- [ ] Create merchant registration and management APIs
- [ ] Implement transaction logging APIs
- [ ] Create custodial wallet management system
- [ ] Implement Off-chain ApiRouter same at  (Supabase/DB with prisma schema) storage for UX & analytics:
    - [ ] Name merchant, alamat, kategori
    - [ ] User email/phone (login)
    - [ ] Transaction logs for dashboard
    - [ ] QR codes picture,
    Add off-chain routes triggered right after Anchor functions are executed:
        register_merchant → insert merchant profile (name, address, category, logo, QR code) into DB
        update_merchant → sync merchant updates into DB
        deactivate_merchant → mark merchant as inactive in DB
        distribute_reward / redeem_reward → insert transaction log (user, merchant, amount, timestamp) into DB

### Phase 3: Frontend Development
- [ ] Create responsive mobile-first UI components
- [ ] Implement user authentication flow
- [ ] Build user dashboard with wallet balance display
- [ ] Create QR code scanner for transactions
- [ ] Build merchant discovery and listing pages
- [ ] Implement token earning flow (purchase simulation)
- [ ] Implement token spending flow (redemption)
- [ ] Create merchant dashboard for analytics

### Phase 4: Integration & Testing
- [ ] Integrate frontend with backend APIs
- [ ] Connect frontend to Anchor program via Web3
- [ ] Implement end-to-end transaction flows
- [ ] Test custodial wallet functionality
- [ ] Add error handling and user feedback
- [ ] Optimize for mobile performance
- [ ] Create demo data for 2-3 merchants

### Phase 5: Deployment & Demo Preparation
- [ ] Deploy Anchor program to Solana Devnet
- [ ] Deploy Next.js app to production
- [ ] Set up production Supabase database
- [ ] Create demo scenario walkthrough
- [ ] Prepare presentation materials
- [ ] Test complete user journey

## Implementation Plan

### Architecture Overview
The Carsa app follows a three-tier architecture:
1. **Blockchain Layer**: Solana + Anchor program for token minting, transfers, and business logic
2. **Backend API**: Next.js API routes with Supabase for user/merchant data and transaction logs
3. **Frontend**: Mobile-first Next.js web app with Solana wallet integration

### Data Flow
1. User makes purchase → QR scan triggers API call
2. Backend validates transaction → calls Anchor program
3. Anchor program mints Lokal tokens to user's custodial wallet
4. Transaction logged in Supabase
5. Frontend updates to show new token balance

### Technical Components Needed

#### Anchor Program Components
- SPL Token mint authority management
- User account initialization and management
- Merchant account registration
- Reward calculation and distribution
- Token redemption and burning logic
- Transaction fee handling

#### Backend Components
- User authentication and session management
- Custodial wallet key generation and storage
- Solana RPC connection and transaction submission
- QR code generation for merchants
- Transaction history and analytics APIs

#### Frontend Components
- Wallet connection and balance display
- QR code scanner component
- Merchant listing and search
- Purchase flow simulation
- Redemption flow interface
- Responsive mobile UI components

### Environment Configuration
- Solana Devnet RPC endpoints
- Supabase connection strings
- NextAuth configuration
- Anchor program deployment keys
- Frontend build and deployment settings

## Relevant Files

### Completed
- `programs/carsa/src/lib.rs` - Enhanced Anchor program with SPL token logic ✅
- `programs/carsa/src/state.rs` - Program state definitions ✅
- `programs/carsa/src/error.rs` - Custom error definitions ✅
- `programs/carsa/src/instructions/` - Instruction handlers directory ✅
- `programs/carsa/src/instructions/mint_tokens.rs` - Token minting logic ✅
- `programs/carsa/src/instructions/rewards.rs` - Reward distribution logic ✅
- `programs/carsa/Cargo.toml` - Enhanced with SPL dependencies ✅
- `Anchor.toml` - Anchor configuration ✅
- `package.json` - Updated with test dependencies ✅
- `tests/carsa.ts` - Comprehensive test suite with reward functionality ✅

### To Be Created/Modified
- `programs/carsa/src/lib.rs` - Enhanced with SPL token logic
- `programs/carsa/src/state.rs` - Program state definitions
- `programs/carsa/src/instructions/` - Instruction handlers directory
- `programs/carsa/src/error.rs` - Custom error definitions
- `tests/carsa.ts` - Enhanced comprehensive tests
- `app/` - Next.js application directory
- `app/package.json` - Frontend dependencies
- `app/pages/` - Next.js pages
- `app/components/` - React components
- `app/lib/` - Utility functions and Solana integration
- `app/styles/` - CSS and styling
- `migrations/deploy.ts` - Enhanced deployment script
- `.env.local` - Environment variables
- `README.md` - Project documentation

### Database Schema (Supabase)
- `users` table - User profiles and custodial wallet info
- `merchants` table - Merchant registration and details
- `transactions` table - Transaction history and logs
- `user_wallets` table - Custodial wallet keypairs (encrypted)

### Key Dependencies to Add
- `@solana/web3.js` - Solana JavaScript SDK
- `@solana/spl-token` - SPL Token utilities
- `next` - Next.js framework
- `@supabase/supabase-js` - Supabase client
- `next-auth` - Authentication
- `react-qr-scanner` - QR code scanning
- `qrcode` - QR code generation
- `tailwindcss` - Styling framework

## Next Steps
1. Start with Phase 1: Enhance the Anchor program with SPL token functionality
2. Set up the Next.js frontend structure
3. Implement backend APIs for user and merchant management
4. Build core UI components for the mobile-first interface
5. Integrate all components and test end-to-end flows

Got it ✅ You want the **same structured style of task prompt** but adapted for **Solana Anchor smart contract (Rust)** instead of Next.js.
Here’s a tailored version for your context:

---
