import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database-service';
import crypto from 'crypto';

export interface UpdateMerchantRequest {
  merchantId: string;
  newCashbackRate?: number;
  isActive?: boolean;
  idempotencyKey?: string;
}

export interface UpdateMerchantResponse {
  success: boolean;
  data?: {
    id: string;
    txSignature: string;
  };
  error?: string;
}

/**
 * POST /api/anchor/update-merchant
 * Server-initiated merchant update
 */
export async function POST(request: NextRequest): Promise<NextResponse<UpdateMerchantResponse>> {
  try {
    const body: UpdateMerchantRequest = await request.json();
    
    // Validate required fields
    if (!body.merchantId) {
      return NextResponse.json({
        success: false,
        error: 'Missing merchant ID'
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
            txSignature: existingRecord.txSignature!
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
      const mockTxSignature = `mock_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Wait for confirmation and store in database
      const result = await dbService.updateMerchant({
        txSignature: mockTxSignature,
        merchantId: body.merchantId,
        newCashbackRate: body.newCashbackRate,
        isActive: body.isActive,
        idempotencyKey
      });

      return NextResponse.json({
        success: true,
        data: {
          id: result.id,
          txSignature: result.txSignature
        }
      });

    } catch (error) {
      console.error('Error in update merchant:', error);
      
      // Update idempotency record as failed
      await dbService.completeIdempotencyKey(idempotencyKey, '', '');
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in POST /api/anchor/update-merchant:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
