import { PrismaClient } from '@prisma/client';
import { 
  MerchantCategory, 
  TransactionType, 
  QRCodeType, 
  EntityType,
  CreateTransactionInput,
  CreateQRCodeInput 
} from '@/types/database';

/**
 * Global Prisma client instance
 * Prevents multiple instances in development due to hot reloading
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Disconnect Prisma client on process termination
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

/**
 * Database utility functions for common operations
 */
export const db = {
  // User operations
  user: {
    /**
     * Find user by email with wallet information
     */
    findByEmail: (email: string) => {
      return prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          wallet_address: true,
          is_active: true,
          is_verified: true,
          created_at: true,
          last_login_at: true,
        },
      });
    },

    /**
     * Find user by wallet address
     */
    findByWallet: (wallet_address: string) => {
      return prisma.user.findUnique({
        where: { wallet_address },
      });
    },

    /**
     * Update user's last login timestamp
     */
    updateLastLogin: (id: string) => {
      return prisma.user.update({
        where: { id },
        data: { last_login_at: new Date() },
      });
    },
  },

  // Merchant operations
  merchant: {
    /**
     * Find merchant by wallet address
     */
    findByWallet: (wallet_address: string) => {
      return prisma.merchant.findUnique({
        where: { wallet_address },
        include: {
          transactions: {
            take: 10,
            orderBy: { created_at: 'desc' },
          },
        },
      });
    },

    /**
     * Get active merchants by category
     */
    findByCategory: (category: MerchantCategory) => {
      return prisma.merchant.findMany({
        where: {
          category,
          is_active: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          address_line_1: true,
          city: true,
          logo_url: true,
          cashback_rate: true,
        },
      });
    },

    /**
     * Search merchants by name or location
     */
    search: (query: string) => {
      return prisma.merchant.findMany({
        where: {
          AND: [
            { is_active: true },
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { city: { contains: query, mode: 'insensitive' } },
              ],
            },
          ],
        },
        take: 20,
      });
    },
  },

  // Transaction operations
  transaction: {
    /**
     * Create new transaction log
     */
    create: (data: CreateTransactionInput) => {
      return prisma.transaction.create({
        data,
      });
    },

    /**
     * Update transaction with blockchain confirmation
     */
    confirmBlockchain: (id: string, signature: string) => {
      return prisma.transaction.update({
        where: { id },
        data: {
          blockchain_signature: signature,
          status: 'CONFIRMED',
          blockchain_confirmed_at: new Date(),
        },
      });
    },

    /**
     * Get user transaction history
     */
    getUserHistory: (user_id: string, limit = 50) => {
      return prisma.transaction.findMany({
        where: { user_id },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              logo_url: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      });
    },

    /**
     * Get merchant transaction history
     */
    getMerchantHistory: (merchant_id: string, limit = 50) => {
      return prisma.transaction.findMany({
        where: { merchant_id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      });
    },
  },

  // QR Code operations
  qrCode: {
    /**
     * Create QR code for entity
     */
    create: (data: CreateQRCodeInput) => {
      return prisma.qRCode.create({
        data,
      });
    },

    /**
     * Find QR code by code value
     */
    findByCode: (code: string) => {
      return prisma.qRCode.findUnique({
        where: { code },
      });
    },

    /**
     * Increment scan count
     */
    incrementScan: (id: string) => {
      return prisma.qRCode.update({
        where: { id },
        data: {
          scan_count: {
            increment: 1,
          },
        },
      });
    },
  },

  // System configuration
  config: {
    /**
     * Get configuration value by key
     */
    get: (key: string) => {
      return prisma.systemConfig.findUnique({
        where: { key },
        select: { value: true },
      });
    },

    /**
     * Set configuration value
     */
    set: (key: string, value: string, description?: string) => {
      return prisma.systemConfig.upsert({
        where: { key },
        update: { value, description },
        create: { key, value, description },
      });
    },
  },
};

export default prisma;
