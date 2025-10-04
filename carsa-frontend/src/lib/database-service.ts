import { PrismaClient, TransactionStatus, TransactionType, MerchantCategory } from '../generated/prisma';
import { getServerWallet } from './server-wallet';

export interface OnChainMetadata {
  txSignature: string;
  slot?: number;
  blockTime?: number | null;
  confirmedAt: Date;
}

export interface IdempotencyRecord {
  key: string;
  txSignature?: string;
  dbRecordId?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Database service that enforces on-chain confirmation before writes
 */
export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Store idempotency key to prevent duplicate operations
   */
  async storeIdempotencyKey(key: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO idempotency_records (key, status, created_at)
      VALUES (${key}, 'pending', NOW())
      ON CONFLICT (key) DO NOTHING
    `;
  }

  /**
   * Update idempotency record with completion data
   */
  async completeIdempotencyKey(
    key: string,
    txSignature: string,
    dbRecordId: string
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE idempotency_records
      SET tx_signature = ${txSignature},
          db_record_id = ${dbRecordId},
          status = 'completed',
          completed_at = NOW()
      WHERE key = ${key}
    `;
  }

  /**
   * Check if idempotency key exists and return its status
   */
  async checkIdempotencyKey(key: string): Promise<IdempotencyRecord | null> {
    const result = await this.prisma.$queryRaw<IdempotencyRecord[]>`
      SELECT * FROM idempotency_records WHERE key = ${key} LIMIT 1
    `;
    return result[0] || null;
  }

  /**
   * Verify transaction is confirmed on-chain before proceeding
   */
  async verifyOnChainConfirmation(txSignature: string): Promise<OnChainMetadata | null> {
    const serverWallet = getServerWallet();
    const confirmation = await serverWallet.waitForConfirmation(txSignature, 10000);
    
    if (!confirmation.confirmed) {
      return null;
    }

    return {
      txSignature,
      slot: confirmation.slot,
      blockTime: confirmation.blockTime,
      confirmedAt: new Date()
    };
  }

  /**
   * Register merchant with on-chain verification
   */
  async registerMerchant(params: {
    txSignature: string;
    walletAddress: string;
    name: string;
    category: string;
    cashbackRate: number;
    email?: string;
    phone?: string;
    addressLine1: string;
    city: string;
    idempotencyKey?: string;
  }): Promise<{ id: string; txSignature: string }> {
    // Verify on-chain confirmation first
    const onChainData = await this.verifyOnChainConfirmation(params.txSignature);
    if (!onChainData) {
      throw new Error('Transaction not confirmed on-chain');
    }

    // Create merchant record with on-chain metadata
    const merchant = await this.prisma.merchant.create({
      data: {
        name: params.name,
        category: params.category as MerchantCategory,
        email: params.email,
        phone: params.phone,
        address_line_1: params.addressLine1,
        city: params.city,
        wallet_address: params.walletAddress,
        cashback_rate: params.cashbackRate,
        tx_signature: params.txSignature,
        slot: onChainData.slot,
        block_time: onChainData.blockTime,
        confirmed_at: onChainData.confirmedAt
      }
    });

    // Update idempotency record if provided
    if (params.idempotencyKey) {
      await this.completeIdempotencyKey(
        params.idempotencyKey,
        params.txSignature,
        merchant.id
      );
    }

    return {
      id: merchant.id,
      txSignature: params.txSignature
    };
  }

  /**
   * Update merchant with on-chain verification
   */
  async updateMerchant(params: {
    txSignature: string;
    merchantId: string;
    newCashbackRate?: number;
    isActive?: boolean;
    idempotencyKey?: string;
  }): Promise<{ id: string; txSignature: string }> {
    // Verify on-chain confirmation first
    const onChainData = await this.verifyOnChainConfirmation(params.txSignature);
    if (!onChainData) {
      throw new Error('Transaction not confirmed on-chain');
    }

    // Update merchant record
    const updateData: Record<string, unknown> = {
      updated_at: new Date()
    };

    if (params.newCashbackRate !== undefined) {
      updateData.cashback_rate = params.newCashbackRate;
    }

    if (params.isActive !== undefined) {
      updateData.is_active = params.isActive;
    }

    const merchant = await this.prisma.merchant.update({
      where: { id: params.merchantId },
      data: updateData
    });

    // Log the update transaction
    await this.prisma.transaction.create({
      data: {
        blockchain_signature: params.txSignature,
        transaction_type: TransactionType.MERCHANT_UPDATE,
        user_id: '', // System transaction
        merchant_id: params.merchantId,
        amount: 0,
        from_wallet_address: '',
        to_wallet_address: merchant.wallet_address,
        status: TransactionStatus.CONFIRMED,
        blockchain_confirmed_at: onChainData.confirmedAt
      }
    });

    // Update idempotency record if provided
    if (params.idempotencyKey) {
      await this.completeIdempotencyKey(
        params.idempotencyKey,
        params.txSignature,
        merchant.id
      );
    }

    return {
      id: merchant.id,
      txSignature: params.txSignature
    };
  }

  /**
   * Record purchase transaction with on-chain verification
   */
  async recordPurchaseTransaction(params: {
    txSignature: string;
    userId: string;
    merchantId: string;
    purchaseAmount: number;
    tokenAmount: number;
    customerWallet: string;
    merchantWallet: string;
    idempotencyKey?: string;
  }): Promise<{ id: string; txSignature: string }> {
    // Verify on-chain confirmation first
    const onChainData = await this.verifyOnChainConfirmation(params.txSignature);
    if (!onChainData) {
      throw new Error('Transaction not confirmed on-chain');
    }

    // Create transaction record
    const transaction = await this.prisma.transaction.create({
      data: {
        blockchain_signature: params.txSignature,
        transaction_type: TransactionType.REWARD_MINT,
        user_id: params.userId,
        merchant_id: params.merchantId,
        amount: params.tokenAmount,
        fiat_amount: params.purchaseAmount,
        from_wallet_address: params.merchantWallet,
        to_wallet_address: params.customerWallet,
        status: TransactionStatus.CONFIRMED,
        blockchain_confirmed_at: onChainData.confirmedAt
      }
    });

    // Update user-merchant relationship
    await this.prisma.userMerchant.upsert({
      where: {
        user_id_merchant_id: {
          user_id: params.userId,
          merchant_id: params.merchantId
        }
      },
      create: {
        user_id: params.userId,
        merchant_id: params.merchantId,
        visit_count: 1,
        total_spent: params.purchaseAmount,
        total_earned: params.tokenAmount,
        last_visit_at: new Date()
      },
      update: {
        visit_count: { increment: 1 },
        total_spent: { increment: params.purchaseAmount },
        total_earned: { increment: params.tokenAmount },
        last_visit_at: new Date()
      }
    });

    // Update idempotency record if provided
    if (params.idempotencyKey) {
      await this.completeIdempotencyKey(
        params.idempotencyKey,
        params.txSignature,
        transaction.id
      );
    }

    return {
      id: transaction.id,
      txSignature: params.txSignature
    };
  }

  /**
   * Record token redemption with on-chain verification
   */
  async recordRedemption(params: {
    txSignature: string;
    userId: string;
    merchantId: string;
    tokenAmount: number;
    fiatValue: number;
    customerWallet: string;
    merchantWallet: string;
    idempotencyKey?: string;
  }): Promise<{ id: string; txSignature: string }> {
    // Verify on-chain confirmation first
    const onChainData = await this.verifyOnChainConfirmation(params.txSignature);
    if (!onChainData) {
      throw new Error('Transaction not confirmed on-chain');
    }

    // Create redemption transaction record
    const transaction = await this.prisma.transaction.create({
      data: {
        blockchain_signature: params.txSignature,
        transaction_type: TransactionType.REDEMPTION,
        user_id: params.userId,
        merchant_id: params.merchantId,
        amount: params.tokenAmount,
        fiat_amount: params.fiatValue,
        from_wallet_address: params.customerWallet,
        to_wallet_address: params.merchantWallet,
        status: TransactionStatus.CONFIRMED,
        blockchain_confirmed_at: onChainData.confirmedAt
      }
    });

    // Update user-merchant relationship
    await this.prisma.userMerchant.upsert({
      where: {
        user_id_merchant_id: {
          user_id: params.userId,
          merchant_id: params.merchantId
        }
      },
      create: {
        user_id: params.userId,
        merchant_id: params.merchantId,
        visit_count: 1,
        total_spent: params.fiatValue,
        total_earned: -params.tokenAmount, // Negative because tokens are spent
        last_visit_at: new Date()
      },
      update: {
        visit_count: { increment: 1 },
        total_spent: { increment: params.fiatValue },
        total_earned: { increment: -params.tokenAmount },
        last_visit_at: new Date()
      }
    });

    // Update idempotency record if provided
    if (params.idempotencyKey) {
      await this.completeIdempotencyKey(
        params.idempotencyKey,
        params.txSignature,
        transaction.id
      );
    }

    return {
      id: transaction.id,
      txSignature: params.txSignature
    };
  }

  /**
   * Get merchant analytics
   */
  async getMerchantAnalytics(merchantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalTransactions, totalRewards, totalRedemptions, uniqueCustomers] = await Promise.all([
      this.prisma.transaction.count({
        where: {
          merchant_id: merchantId,
          created_at: { gte: startDate },
          status: TransactionStatus.CONFIRMED
        }
      }),
      this.prisma.transaction.aggregate({
        where: {
          merchant_id: merchantId,
          transaction_type: TransactionType.REWARD_MINT,
          created_at: { gte: startDate },
          status: TransactionStatus.CONFIRMED
        },
        _sum: { amount: true }
      }),
      this.prisma.transaction.aggregate({
        where: {
          merchant_id: merchantId,
          transaction_type: TransactionType.REDEMPTION,
          created_at: { gte: startDate },
          status: TransactionStatus.CONFIRMED
        },
        _sum: { amount: true }
      }),
      this.prisma.transaction.groupBy({
        by: ['user_id'],
        where: {
          merchant_id: merchantId,
          created_at: { gte: startDate },
          status: TransactionStatus.CONFIRMED
        }
      })
    ]);

    return {
      totalTransactions,
      totalRewards: totalRewards._sum.amount || 0,
      totalRedemptions: totalRedemptions._sum.amount || 0,
      uniqueCustomers: uniqueCustomers.length
    };
  }

  /**
   * Get merchant by ID
   */
  async getMerchant(merchantId: string) {
    return this.prisma.merchant.findUnique({
      where: { id: merchantId }
    });
  }

  /**
   * Get user by wallet address
   */
  async getUserByWallet(walletAddress: string) {
    return this.prisma.user.findUnique({
      where: { wallet_address: walletAddress }
    });
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    email: string;
    walletAddress: string;
    name?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: userData.email,
        wallet_address: userData.walletAddress,
        wallet_private_key_hash: '', // Would be properly encrypted in production
        password_hash: '', // Not needed for custodial wallets
        name: userData.name || `User ${userData.walletAddress.slice(0, 8)}...`
      }
    });
  }

  /**
   * Check if transaction already exists by signature
   */
  async getTransactionBySignature(signature: string) {
    return this.prisma.transaction.findUnique({
      where: { blockchain_signature: signature }
    });
  }

  /**
   * Create a transfer transaction record
   */
  async createTransferTransaction(params: {
    txSignature: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    fromWallet: string;
    toWallet: string;
    memo?: string;
  }) {
    const onChainData = await this.verifyOnChainConfirmation(params.txSignature);
    if (!onChainData) {
      throw new Error('Transaction not confirmed on-chain');
    }

    return this.prisma.transaction.create({
      data: {
        blockchain_signature: params.txSignature,
        transaction_type: TransactionType.TRANSFER,
        user_id: params.fromUserId,
        merchant_id: '', // No merchant involved in transfers
        amount: params.amount,
        from_wallet_address: params.fromWallet,
        to_wallet_address: params.toWallet,
        description: params.memo,
        status: TransactionStatus.CONFIRMED,
        blockchain_confirmed_at: onChainData.confirmedAt
      }
    });
  }

  /**
   * Cleanup old idempotency records
   */
  async cleanupIdempotencyRecords(olderThanHours: number = 24): Promise<void> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

    await this.prisma.$executeRaw`
      DELETE FROM idempotency_records
      WHERE created_at < ${cutoffTime}
      AND (status = 'completed' OR status = 'failed')
    `;
  }
}

// Singleton instance
let databaseServiceInstance: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!databaseServiceInstance) {
    databaseServiceInstance = new DatabaseService();
  }
  return databaseServiceInstance;
}
