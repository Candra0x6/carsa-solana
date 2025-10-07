import { PrismaClient, TransactionStatus, TransactionType, MerchantCategory, IdempotencyStatus } from '../generated/prisma';
import { getServerWallet } from './server-wallet';
import { getQRService } from './qr-service';

export interface OnChainMetadata {
  txSignature: string;
  slot?: number;
  blockTime?: number | null;
  confirmedAt: Date;
}

export interface IdempotencyRecord {
  id: string;
  key: string;
  txSignature: string | null;
  dbRecordId: string | null;
  status: IdempotencyStatus;
  createdAt: Date;
  completedAt: Date | null;
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
    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          key: key,
          status: IdempotencyStatus.PENDING
        }
      });
    } catch (error) {
      // Ignore unique constraint errors (key already exists)
      if (error instanceof Error && 'code' in error && error.code !== 'P2002') {
        throw error;
      }
    }
  }

  /**
   * Update idempotency record with completion data
   */
  async completeIdempotencyKey(
    key: string,
    txSignature: string,
    dbRecordId: string
  ): Promise<void> {
    const status = txSignature ? IdempotencyStatus.COMPLETED : IdempotencyStatus.FAILED;
    await this.prisma.idempotencyRecord.update({
      where: { key },
      data: {
        status,
        tx_signature: txSignature || null,
        db_record_id: dbRecordId || null,
        completed_at: new Date()
      }
    });
  }

  /**
   * Check if idempotency key exists and return its status
   */
  async checkIdempotencyKey(key: string): Promise<IdempotencyRecord | null> {
    const result = await this.prisma.idempotencyRecord.findUnique({
      where: { key }
    });
    
    if (!result) return null;
    
    return {
      id: result.id,
      key: result.key,
      status: result.status,
      txSignature: result.tx_signature,
      dbRecordId: result.db_record_id,
      createdAt: result.created_at,
      completedAt: result.completed_at
    };
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
   * Register merchant with on-chain verification and QR code generation
   */
  async registerMerchant(params: {
    txSignature: string;
    walletAddress: string;
    name: string;
    category: MerchantCategory;
    cashbackRate: number;
    email?: string;
    phone?: string;
    addressLine1: string;
    city: string;
    idempotencyKey?: string;
  }): Promise<{ id: string; txSignature: string; qrCodeUrl?: string }> {
    // Verify on-chain confirmation first
    const onChainData = await this.verifyOnChainConfirmation(params.txSignature);
    if (!onChainData) {
      throw new Error('Transaction not confirmed on-chain');
    }

    // Create merchant record with on-chain metadata (without QR code initially)
    const merchant = await this.prisma.merchant.create({
      data: {
        name: params.name,
        category: params.category,
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

    let qrCodeUrl: string | undefined;

    try {
      // Generate QR code after successful merchant creation
      const qrService = getQRService();
      
      // Ensure storage bucket exists
      await qrService.ensureBucketExists();
      
      const qrResult = await qrService.generateMerchantQR({
        merchantId: merchant.id,
        walletAddress: params.walletAddress,
        name: params.name,
        cashbackRate: params.cashbackRate
      });

      if (qrResult.success && qrResult.qrCodeUrl) {
        qrCodeUrl = qrResult.qrCodeUrl;
        
        // Update merchant record with QR code URL
        await this.prisma.merchant.update({
          where: { id: merchant.id },
          data: { qr_code_url: qrCodeUrl }
        });
      } else {
        console.warn(`Failed to generate QR code for merchant ${merchant.id}: ${qrResult.error}`);
      }
    } catch (error) {
      console.error(`Error generating QR code for merchant ${merchant.id}:`, error);
      // Don't fail the registration if QR generation fails
    }

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
      txSignature: params.txSignature,
      qrCodeUrl
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
   * Get merchant by wallet address
   */
  async getMerchantByWallet(walletAddress: string) {
    return this.prisma.merchant.findUnique({
      where: { wallet_address: walletAddress }
    });
  }

  /**
   * Get all merchants with pagination
   */
  async getAllMerchants(options: {
    page?: number;
    limit?: number;
  } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [merchants, total] = await Promise.all([
      this.prisma.merchant.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          category: true,
          cashback_rate: true,
          wallet_address: true,
          is_active: true,
          created_at: true,
          qr_code_url: true,
        }
      }),
      this.prisma.merchant.count()
    ]);

    return { merchants, total };
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
    passwordHash?: string;
    encryptedPrivateKey?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: userData.email,
        wallet_address: userData.walletAddress,
        wallet_private_key_hash: userData.encryptedPrivateKey || '',
        password_hash: userData.passwordHash || '',
        name: userData.name || `User ${userData.walletAddress.slice(0, 8)}...`
      }
    });
  }

  /**
   * Find user by email
   */
  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * Update user data
   */
  async updateUser(userId: string, updateData: {
    name?: string;
    email?: string;
    password_hash?: string;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData
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

    await this.prisma.idempotencyRecord.deleteMany({
      where: {
        created_at: {
          lt: cutoffTime
        },
        status: {
          in: [IdempotencyStatus.COMPLETED, IdempotencyStatus.FAILED]
        }
      }
    });
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
