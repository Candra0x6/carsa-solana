import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database-service';
import { PublicKey } from '@solana/web3.js';
import crypto from 'crypto';

export interface ProcessPurchaseRequest {
  customerWallet: string;
  merchantId: string;
  purchaseAmount: number; // In fiat (e.g., IDR)
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
 * Server-initiated purchase processing and reward distribution
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProcessPurchaseResponse>> {
  try {
    const body: ProcessPurchaseRequest = await request.json();
    
    // Validate required fields
    if (!body.customerWallet || !body.merchantId || !body.purchaseAmount) {
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
      if (existingRecord.status === 'completed') {
        // Parse the existing transaction data
        return NextResponse.json({
          success: true,
          data: {
            transactionId: existingRecord.dbRecordId!,
            txSignature: existingRecord.txSignature!,
            tokensAwarded: 0 // Would need to be stored in idempotency record
          }
        });
      } else if (existingRecord.status === 'pending') {
        return NextResponse.json({
          success: false,
          error: 'Request already in progress'
        }, { status: 409 });
      }
    }

    // Store idempotency key
    await dbService.storeIdempotencyKey(idempotencyKey);

    try {
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

      // TODO: Replace with actual Anchor program call
      const mockTxSignature = `mock_purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In real implementation:
      // const anchorClient = getAnchorClient();
      // const txSignature = await anchorClient.processPurchase({
      //   customerWallet: new PublicKey(body.customerWallet),
      //   merchantWallet: new PublicKey(merchant.wallet_address),
      //   purchaseAmount: new BN(body.purchaseAmount),
      //   transactionId: crypto.randomBytes(32)
      // });

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
        txSignature: mockTxSignature,
        userId: user.id,
        merchantId: body.merchantId,
        purchaseAmount: body.purchaseAmount,
        tokenAmount: tokensAwarded,
        customerWallet: body.customerWallet,
        merchantWallet: merchant.wallet_address,
        idempotencyKey
      });

      return NextResponse.json({
        success: true,
        data: {
          transactionId: result.id,
          txSignature: result.txSignature,
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
