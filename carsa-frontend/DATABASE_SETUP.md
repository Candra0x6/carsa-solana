# Carsa Database Setup - Supabase with Prisma ORM

## Overview

Complete PostgreSQL database schema setup for the Carsa loyalty program using Supabase and Prisma ORM. This provides the foundation for off-chain data storage, analytics, and API routing.

## Database Schema

### Core Tables

1. **Users** - User profiles with custodial wallet information
2. **Merchants** - Merchant profiles and business information  
3. **Transactions** - Complete transaction logs for analytics
4. **UserMerchants** - User-merchant relationships and loyalty data
5. **QRCodes** - QR code management for payments and promotions
6. **SystemConfigs** - Application configuration storage

### Key Features

- **Type Safety**: Full TypeScript integration with Prisma generated types
- **Relationships**: Proper foreign key relationships between entities
- **Indexing**: Optimized queries for transaction history and user lookups
- **Enums**: Strongly typed categories, transaction types, and statuses
- **Flexible Schema**: Supports both custodial and non-custodial wallet scenarios

## Setup Instructions

### 1. Environment Configuration

Update your `.env.local` file with Supabase credentials:

```bash
# Database Configuration (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Supabase Configuration  
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Run Database Migration

```bash
npx prisma db push
```

### 4. Seed Database (Optional)

```bash
npx prisma db seed
```

## API Integration

### Off-Chain Routes

The database supports off-chain API routes that are triggered after Anchor program execution:

- **`POST /api/merchants/register`** - Insert merchant profile after `register_merchant`
- **`POST /api/transactions/log`** - Log transaction after `distribute_reward`/`redeem_reward`  
- **`GET /api/transactions/log`** - Retrieve transaction history with filters
- **`GET /api/merchants/search`** - Search and filter merchants

### Database Utilities

Pre-built utility functions in `/src/lib/prisma.ts`:

```typescript
// User operations
await db.user.findByEmail(email);
await db.user.findByWallet(wallet_address);

// Merchant operations  
await db.merchant.findByWallet(wallet_address);
await db.merchant.search(query);

// Transaction operations
await db.transaction.create(transactionData);
await db.transaction.confirmBlockchain(id, signature);

// QR Code operations
await db.qrCode.create(qrData);
await db.qrCode.findByCode(code);
```

## Data Flow Integration

### 1. Merchant Registration Flow
```
1. Frontend calls Anchor program register_merchant
2. On success, POST /api/merchants/register  
3. Creates merchant profile + generates QR code
4. Returns merchant data for frontend
```

### 2. Transaction Flow
```
1. Frontend calls Anchor program distribute_reward
2. On blockchain confirmation, POST /api/transactions/log
3. Updates user-merchant relationship stats
4. Returns transaction record
```

### 3. Analytics Flow
```
1. Background jobs aggregate transaction data
2. Real-time merchant/user dashboards
3. Export capabilities for business intelligence
```

## TypeScript Types

Complete type definitions in `/src/types/database.ts`:

- **Enums**: `MerchantCategory`, `TransactionType`, `TransactionStatus`, etc.
- **Input Types**: `CreateMerchantInput`, `CreateTransactionInput`, etc.
- **Response Types**: `UserProfile`, `MerchantProfile`, `TransactionRecord`, etc.
- **API Types**: `ApiResponse`, `PaginatedResponse`, etc.

## Security Features

- **Encrypted Storage**: Private keys hashed with bcrypt
- **Session Management**: Integration with NextAuth for user sessions  
- **Input Validation**: Strict validation on all API endpoints
- **Access Control**: User can only access their own transaction data
- **Audit Trail**: Complete transaction history with blockchain signatures

## Performance Optimizations

- **Indexes**: Optimized for common query patterns
- **Pagination**: Built-in pagination for large datasets  
- **Connection Pooling**: Prisma handles connection management
- **Caching**: Ready for Redis integration if needed

## Production Deployment

### Supabase Setup
1. Create new Supabase project
2. Run migrations: `npx prisma db push`
3. Set up Row Level Security (RLS) policies
4. Configure backup schedules

### Environment Variables
- Use Supabase production database URL
- Rotate service role keys regularly
- Enable connection pooling for high traffic

This database setup provides a robust foundation for the Carsa loyalty program with full TypeScript support, proper relationships, and optimized performance for both development and production use.
