import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database-service';

export interface GetMerchantByIdResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
    category: string;
    cashbackRate: number;
    email?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    walletAddress: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    qrCodeUrl?: string;
  };
  error?: string;
}

/**
 * GET /api/merchants/[id]
 * Get merchant by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<GetMerchantByIdResponse>> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Merchant ID is required'
      }, { status: 400 });
    }

    const dbService = getDatabaseService();
    
    // Get merchant by ID from database
    const merchant = await dbService.getMerchant(id);

    if (!merchant) {
      return NextResponse.json({
        success: false,
        error: 'Merchant not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: merchant.id,
        name: merchant.name,
        category: merchant.category,
        cashbackRate: merchant.cashback_rate,
        email: merchant.email || undefined,
        phone: merchant.phone || undefined,
        addressLine1: merchant.address_line_1 || undefined,
        city: merchant.city || undefined,
        walletAddress: merchant.wallet_address,
        isActive: merchant.is_active,
        createdAt: merchant.created_at.toISOString(),
        updatedAt: merchant.updated_at.toISOString(),
        qrCodeUrl: merchant.qr_code_url || undefined
      }
    });

  } catch (error) {
    console.error('Error in GET /api/merchants/[id]:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
