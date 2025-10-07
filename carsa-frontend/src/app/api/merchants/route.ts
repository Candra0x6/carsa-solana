import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database-service';

export interface GetAllMerchantsResponse {
  success: boolean;
  data?: {
    merchants: Array<{
      id: string;
      name: string;
      category: string;
      cashbackRate: number;
      walletAddress: string;
      isActive: boolean;
      createdAt: string;
      qrCodeUrl?: string;
    }>;
    total: number;
  };
  error?: string;
}

/**
 * GET /api/merchants
 * Get all merchants with pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse<GetAllMerchantsResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const dbService = getDatabaseService();
    
    // Get merchants with pagination
    const { merchants, total } = await dbService.getAllMerchants({
      page,
      limit
    });

    return NextResponse.json({
      success: true,
      data: {
        merchants: merchants.map(merchant => ({
          id: merchant.id,
          name: merchant.name,
          category: merchant.category,
          cashbackRate: merchant.cashback_rate,
          walletAddress: merchant.wallet_address,
          isActive: merchant.is_active,
          createdAt: merchant.created_at.toISOString(),
          qrCodeUrl: merchant.qr_code_url || undefined
        })),
        total
      }
    });

  } catch (error) {
    console.error('Error in GET /api/merchants:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
