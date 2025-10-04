import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database-service';
import { getServerWallet } from '@/lib/server-wallet';
import { getMerchantPDA } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';
import crypto from 'crypto';

export interface RegisterMerchantRequest {
  name: string;
  category: string;
  cashbackRate: number;
  email?: string;
  phone?: string;
  addressLine1: string;
  city: string;
  walletAddress: string;
  idempotencyKey?: string;
}

export interface RegisterMerchantResponse {
  success: boolean;
  data?: {
    id: string;
    txSignature: string;
    merchantPDA: string;
  };
  error?: string;
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
      if (existingRecord.status === 'completed') {
        return NextResponse.json({
          success: true,
          data: {
            id: existingRecord.dbRecordId!,
            txSignature: existingRecord.txSignature!,
            merchantPDA: getMerchantPDA(merchantWallet)[0].toString()
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
      // TODO: Replace with actual Anchor program call
      // For now, we'll simulate the transaction
      const mockTxSignature = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In a real implementation:
      // const anchorClient = getAnchorClient();
      // const txSignature = await anchorClient.registerMerchant({
      //   merchantWallet,
      //   name: body.name,
      //   category: body.category,
      //   cashbackRate: body.cashbackRate
      // });

      // Wait for confirmation and store in database
      const result = await dbService.registerMerchant({
        txSignature: mockTxSignature,
        walletAddress: body.walletAddress,
        name: body.name,
        category: body.category,
        cashbackRate: body.cashbackRate,
        email: body.email,
        phone: body.phone,
        addressLine1: body.addressLine1,
        city: body.city,
        idempotencyKey
      });

      const [merchantPDA] = getMerchantPDA(merchantWallet);

      return NextResponse.json({
        success: true,
        data: {
          id: result.id,
          txSignature: result.txSignature,
          merchantPDA: merchantPDA.toString()
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
