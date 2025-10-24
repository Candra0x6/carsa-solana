import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database-service';
import { PublicKey } from '@solana/web3.js';
import { IdempotencyStatus } from '@/generated/prisma';
import * as crypto from 'crypto';

export interface ProcessPurchaseRequest {
  customerWallet: string;
  merchantId: string;
  purchaseAmount: number; // In fiat (e.g., IDR)
  txSignature: string; // Required for client-initiated flow
  idempotencyKey?: string;
}

export interface ProcessPurchaseResponse {
  success: boolean;
  data?: {
    transactionId: string;
    txSignature: string;
    tokensAwarded: number;
  };
  error?: string;
}

/**
 * POST /api/anchor/process-purchase
 * 
 * Client-initiated purchase processing flow:
 * 1. Frontend handles the Anchor transaction with connected wallet
 * 2. Frontend sends transaction signature to this endpoint
 * 3. Server records the transaction in database and calculates rewards
 * 
 * This matches the pattern used in register-merchant route
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProcessPurchaseResponse>> {
  try {
    const body: ProcessPurchaseRequest = await request.json();
    
    // Validate required fields
    if (!body.customerWallet || !body.merchantId || !body.purchaseAmount || !body.txSignature) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate wallet address
    try {
      new PublicKey(body.customerWallet);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid customer wallet address'
      }, { status: 400 });
    }

    const dbService = getDatabaseService();
    
    // Generate idempotency key if not provided
    const idempotencyKey = body.idempotencyKey || crypto.randomUUID();
    
  
    // Check idempotency
    const existingRecord = await dbService.checkIdempotencyKey(idempotencyKey);
    if (existingRecord) {
      if (existingRecord.status === IdempotencyStatus.COMPLETED) {
        return NextResponse.json({
          success: true,
          data: {
            transactionId: existingRecord.dbRecordId!,
            txSignature: existingRecord.txSignature!,
            tokensAwarded: 0 // Could be calculated from merchant's cashback rate if needed
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
          error: 'Transaction signature required for client-initiated processing'
        }, { status: 400 });
      }

      // Get merchant data to calculate rewards
      const merchant = await dbService.getMerchant(body.merchantId);

      if (!merchant) {
        return NextResponse.json({
          success: false,
          error: 'Merchant not found'
        }, { status: 404 });
      }

      // Calculate token rewards based on cashback rate
      // Assuming 1 IDR = 1 token for simplicity, adjusted by cashback rate
      const cashbackRate = merchant.cashback_rate / 10000; // Convert basis points to decimal
      const tokensAwarded = Math.floor(body.purchaseAmount * cashbackRate);

      // Find or create user record
      let user = await dbService.getUserByWallet(body.customerWallet);

      if (!user) {
        // Create a basic user record for custodial wallet
        user = await dbService.createUser({
          email: `${body.customerWallet}@custodial.carsa.app`,
          walletAddress: body.customerWallet,
          name: `User ${body.customerWallet.slice(0, 8)}...`
        });
      }

      // Record the purchase transaction
      const result = await dbService.recordPurchaseTransaction({
        txSignature: body.txSignature,
        userId: user.id,
        merchantId: body.merchantId,
        purchaseAmount: body.purchaseAmount,
        tokenAmount: tokensAwarded,
        customerWallet: body.customerWallet,
        merchantWallet: merchant.wallet_address,
        idempotencyKey
      });

      // Update idempotency record as completed
      await dbService.completeIdempotencyKey(idempotencyKey, body.txSignature, result.id);
      // Update user reputation based on purchase
      await dbService.updateUserMerchantReputation(body.merchantId);
      
      return NextResponse.json({
        success: true,
        data: {
          transactionId: result.id,
          txSignature: body.txSignature,
          tokensAwarded
        }
      });

    } catch (error) {
      console.error('Error in process purchase:', error);
      
      // Update idempotency record as failed
      await dbService.completeIdempotencyKey(idempotencyKey, '', '');
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in POST /api/anchor/process-purchase:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
