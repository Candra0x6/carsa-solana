import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database-service';

export interface GetMerchantByWalletResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
    category: string;
    cashbackRate: number;
    email?: string;
    phone?: string;
    addressLine1: string;
    city: string;
    walletAddress: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    qrCodeUrl?: string;
  };
  error?: string;
}

/**
 * GET /api/merchants/by-wallet/[walletAddress]
 * Get merchant data by wallet address
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { walletAddress: string } }
): Promise<NextResponse<GetMerchantByWalletResponse>> {
  try {
    const { walletAddress } = params;

    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address is required'
      }, { status: 400 });
    }

    const dbService = getDatabaseService();
    
    // Find merchant by wallet address
    const merchant = await dbService.getMerchantByWallet(walletAddress);

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
        addressLine1: merchant.address_line_1,
        city: merchant.city,
        walletAddress: merchant.wallet_address,
        isActive: merchant.is_active,
        createdAt: merchant.created_at.toISOString(),
        updatedAt: merchant.updated_at.toISOString(),
        qrCodeUrl: merchant.qr_code_url || undefined
      }
    });

  } catch (error) {
    console.error('Error in GET /api/merchants/by-wallet:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
