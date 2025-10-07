import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database-service';
import { getServerWallet } from '@/lib/server-wallet';
import { getMerchantPDA } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';
import { IdempotencyStatus, MerchantCategory } from '@/generated/prisma';
import * as crypto from 'crypto';

export interface RegisterMerchantRequest {
  name: string;
  category: string;
  cashbackRate: number;
  email?: string;
  phone?: string;
  addressLine1: string;
  city: string;
  walletAddress: string;
  txSignature?: string; // For client-initiated registration
  idempotencyKey?: string;
}

export interface RegisterMerchantResponse {
  success: boolean;
  data?: {
    id: string;
    txSignature: string;
    merchantPDA: string;
    qrCodeUrl?: string;
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
 * POST /api/anchor/register-merchant
 * Server-initiated merchant registration
 */
export async function POST(request: NextRequest): Promise<NextResponse<RegisterMerchantResponse>> {
  try {
    const body: RegisterMerchantRequest = await request.json();
    
    // Validate required fields
    if (!body.name || !body.category || !body.walletAddress || !body.addressLine1 || !body.city) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate wallet address
    let merchantWallet: PublicKey;
    try {
      merchantWallet = new PublicKey(body.walletAddress);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address'
      }, { status: 400 });
    }

    const dbService = getDatabaseService();
    
    // Generate idempotency key if not provided
    const idempotencyKey = body.idempotencyKey || crypto.randomUUID();
    
    // Check idempotency
    const existingRecord = await dbService.checkIdempotencyKey(idempotencyKey);
    if (existingRecord) {
      if (existingRecord.status === IdempotencyStatus.COMPLETED) {
        // Get merchant record to include QR code URL
        const existingMerchant = existingRecord.dbRecordId ? 
          await dbService.getMerchant(existingRecord.dbRecordId) : null;
        
        // Use the merchant wallet for PDA calculation (client-initiated)
        const [merchantPDA] = getMerchantPDA(merchantWallet.toString());
        
        return NextResponse.json({
          success: true,
          data: {
            id: existingRecord.dbRecordId!,
            txSignature: existingRecord.txSignature!,
            merchantPDA: merchantPDA.toString(),
            qrCodeUrl: existingMerchant?.qr_code_url || undefined
          }
        });
      } else if (existingRecord.status === IdempotencyStatus.PENDING) {
        return NextResponse.json({
          success: false,
          error: 'Request already in progress'
        }, { status: 409 });
      }
    }

    // Store idempotency key
    await dbService.storeIdempotencyKey(idempotencyKey);

    try {
      // For client-initiated flow, we expect the transaction signature to be provided
      // The frontend should handle the Anchor transaction and send us the signature
      if (!body.txSignature) {
        return NextResponse.json({
          success: false,
          error: 'Transaction signature required for client-initiated registration'
        }, { status: 400 });
      }

      // Wait for confirmation and store in database
      const result = await dbService.registerMerchant({
        txSignature: body.txSignature,
        walletAddress: body.walletAddress,
        name: body.name,
        category: mapCategoryToEnum(body.category),
        cashbackRate: body.cashbackRate,
        email: body.email,
        phone: body.phone,
        addressLine1: body.addressLine1,
        city: body.city,
        idempotencyKey
      });

      // Use the actual merchant wallet for PDA calculation
      const [merchantPDA] = getMerchantPDA(merchantWallet.toString());

      return NextResponse.json({
        success: true,
        data: {
          id: result.id,
          txSignature: body.txSignature,
          merchantPDA: merchantPDA.toString(),
          qrCodeUrl: result.qrCodeUrl
        }
      });

    } catch (error) {
      console.error('Error in register merchant:', error);
      
      // Update idempotency record as failed
      await dbService.completeIdempotencyKey(idempotencyKey, '', '');
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in POST /api/anchor/register-merchant:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
