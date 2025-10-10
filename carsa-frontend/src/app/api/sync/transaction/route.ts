import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database-service';
import { MerchantCategory } from '@/generated/prisma';

export interface SyncTransactionRequest {
  txSignature: string;
  transactionType: 'register-merchant' | 'update-merchant' | 'purchase' | 'redemption' | 'transfer';
  metadata: {
    // For register-merchant
    name?: string;
    category?: string;
    cashbackRate?: number;
    email?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    walletAddress?: string;
    
    // For purchases/redemptions
    userId?: string;
    merchantId?: string;
    customerWallet?: string;
    merchantWallet?: string;
    purchaseAmount?: number;
    tokenAmount?: number;
    fiatValue?: number;
    
    // For transfers
    fromWallet?: string;
    toWallet?: string;
    amount?: number;
    memo?: string;
  };
}

export interface SyncTransactionResponse {
  success: boolean;
  data?: {
    id: string;
    txSignature: string;
  };
  error?: string;
}

/**
 * Map category string to MerchantCategory enum
 */
function mapCategoryToEnum(category: string): MerchantCategory {
  const categoryMap: Record<string, MerchantCategory> = {
    'Food & Beverage': MerchantCategory.FOOD_BEVERAGE,
    'Restaurant': MerchantCategory.FOOD_BEVERAGE,
    'Coffee Shop': MerchantCategory.FOOD_BEVERAGE,
    'Retail': MerchantCategory.RETAIL,
    'Store': MerchantCategory.RETAIL,
    'Shop': MerchantCategory.RETAIL,
    'Services': MerchantCategory.SERVICES,
    'Entertainment': MerchantCategory.ENTERTAINMENT,
    'Health & Beauty': MerchantCategory.HEALTH_BEAUTY,
    'Salon': MerchantCategory.HEALTH_BEAUTY,
    'Spa': MerchantCategory.HEALTH_BEAUTY,
    'Education': MerchantCategory.EDUCATION,
    'Transportation': MerchantCategory.TRANSPORTATION,
    'Accommodation': MerchantCategory.ACCOMMODATION,
    'Hotel': MerchantCategory.ACCOMMODATION,
    'Other': MerchantCategory.OTHER
  };

  // Try exact match first
  if (categoryMap[category]) {
    return categoryMap[category];
  }

  // Try case-insensitive match
  const normalizedCategory = Object.keys(categoryMap).find(
    key => key.toLowerCase() === category.toLowerCase()
  );
  
  if (normalizedCategory) {
    return categoryMap[normalizedCategory];
  }

  // Default to OTHER if no match found
  return MerchantCategory.OTHER;
}

/**
 * POST /api/sync/transaction
 * Sync client-initiated transactions after on-chain confirmation
 */
export async function POST(request: NextRequest): Promise<NextResponse<SyncTransactionResponse>> {
  try {
    const body: SyncTransactionRequest = await request.json();
    
    // Validate required fields
    if (!body.txSignature || !body.transactionType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const dbService = getDatabaseService();

    // Check if transaction already exists
    const existingTransaction = await dbService.getTransactionBySignature(body.txSignature);

    if (existingTransaction) {
      return NextResponse.json({
        success: true,
        data: {
          id: existingTransaction.id,
          txSignature: existingTransaction.blockchain_signature || body.txSignature
        }
      });
    }

    try {
      let result: { id: string; txSignature: string };

      switch (body.transactionType) {
        case 'register-merchant':
          if (!body.metadata.name || !body.metadata.category || !body.metadata.walletAddress || 
              !body.metadata.addressLine1 || !body.metadata.city) {
            throw new Error('Missing required merchant registration data');
          }

          result = await dbService.registerMerchant({
            txSignature: body.txSignature,
            walletAddress: body.metadata.walletAddress,
            name: body.metadata.name,
            category: mapCategoryToEnum(body.metadata.category),
            cashbackRate: body.metadata.cashbackRate || 500, // Default 5%
            email: body.metadata.email,
            phone: body.metadata.phone,
            addressLine1: body.metadata.addressLine1,
            city: body.metadata.city
          });
          break;

        case 'update-merchant':
          if (!body.metadata.merchantId) {
            throw new Error('Missing merchant ID for update');
          }

          result = await dbService.updateMerchant({
            txSignature: body.txSignature,
            merchantId: body.metadata.merchantId,
            newCashbackRate: body.metadata.cashbackRate,
            isActive: true // Derived from transaction existence
          });
          break;

        case 'purchase':
          if (!body.metadata.userId || !body.metadata.merchantId || 
              !body.metadata.purchaseAmount || !body.metadata.tokenAmount ||
              !body.metadata.customerWallet || !body.metadata.merchantWallet) {
            throw new Error('Missing required purchase data');
          }

          result = await dbService.recordPurchaseTransaction({
            txSignature: body.txSignature,
            userId: body.metadata.userId,
            merchantId: body.metadata.merchantId,
            purchaseAmount: body.metadata.purchaseAmount,
            tokenAmount: body.metadata.tokenAmount,
            customerWallet: body.metadata.customerWallet,
            merchantWallet: body.metadata.merchantWallet
          });
          break;

        case 'redemption':
          if (!body.metadata.userId || !body.metadata.merchantId || 
              !body.metadata.tokenAmount || !body.metadata.fiatValue ||
              !body.metadata.customerWallet || !body.metadata.merchantWallet) {
            throw new Error('Missing required redemption data');
          }

          result = await dbService.recordRedemption({
            txSignature: body.txSignature,
            userId: body.metadata.userId,
            merchantId: body.metadata.merchantId,
            tokenAmount: body.metadata.tokenAmount,
            fiatValue: body.metadata.fiatValue,
            customerWallet: body.metadata.customerWallet,
            merchantWallet: body.metadata.merchantWallet
          });
          break;

        case 'transfer':
          // For transfers, we'll create a basic transaction record
          if (!body.metadata.fromWallet || !body.metadata.toWallet || !body.metadata.amount) {
            throw new Error('Missing required transfer data');
          }

          // Find users by wallet addresses
          const fromUser = await dbService.getUserByWallet(body.metadata.fromWallet);
          const toUser = await dbService.getUserByWallet(body.metadata.toWallet);

          if (!fromUser || !toUser) {
            throw new Error('User not found for transfer');
          }

          const transaction = await dbService.createTransferTransaction({
            txSignature: body.txSignature,
            fromUserId: fromUser.id,
            toUserId: toUser.id,
            amount: body.metadata.amount,
            fromWallet: body.metadata.fromWallet,
            toWallet: body.metadata.toWallet,
            memo: body.metadata.memo
          });

          result = {
            id: transaction.id,
            txSignature: body.txSignature
          };
          break;

        default:
          throw new Error(`Unknown transaction type: ${body.transactionType}`);
      }

      return NextResponse.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error syncing transaction:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in POST /api/sync/transaction:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
