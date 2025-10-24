import { Merchant } from "@/generated/prisma";
import { getDatabaseService } from "@/lib/database-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/merchants/rank
 * Get all merchants with pagination
 */

export interface MerchantRankResponse {
    success: boolean;
    data?: {
        total: number;
        merchants: Merchant[];
    };
    error?: string;
}
export async function GET(request: NextRequest): Promise<NextResponse<MerchantRankResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const dbService = getDatabaseService();
    
    // Get merchants with pagination
    const { merchants, total } = await dbService.getMerchantRank({
      page,
      limit
    });

    return NextResponse.json({
      success: true,
      data: {
        merchants: merchants,
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
