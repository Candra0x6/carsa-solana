import { NextRequest, NextResponse } from 'next/server';
import { getQRService } from '@/lib/qr-service';

export interface GenerateQRRequest {
  merchantId: string;
  walletAddress: string;
  name: string;
  cashbackRate: number;
}

export interface GenerateQRResponse {
  success: boolean;
  data?: {
    qrCodeUrl: string;
    dataUrl: string; // Base64 for immediate display
  };
  error?: string;
}

/**
 * POST /api/qr/generate-merchant
 * Generate QR code for a merchant (for testing purposes)
 */
export async function POST(request: NextRequest): Promise<NextResponse<GenerateQRResponse>> {
  try {
    const body: GenerateQRRequest = await request.json();
    
    // Validate required fields
    if (!body.merchantId || !body.walletAddress || !body.name || typeof body.cashbackRate !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: merchantId, walletAddress, name, cashbackRate'
      }, { status: 400 });
    }

    const qrService = getQRService();
    
    // Ensure bucket exists
    await qrService.ensureBucketExists();
    
    // Generate QR code and upload to Supabase
    const qrResult = await qrService.generateMerchantQR({
      merchantId: body.merchantId,
      walletAddress: body.walletAddress,
      name: body.name,
      cashbackRate: body.cashbackRate
    });

    if (!qrResult.success) {
      return NextResponse.json({
        success: false,
        error: qrResult.error || 'Failed to generate QR code'
      }, { status: 500 });
    }

    // Also generate data URL for immediate display
    const dataUrl = await qrService.generateMerchantQRDataURL({
      merchantId: body.merchantId,
      walletAddress: body.walletAddress,
      name: body.name,
      cashbackRate: body.cashbackRate
    });

    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: qrResult.qrCodeUrl!,
        dataUrl: dataUrl
      }
    });

  } catch (error) {
    console.error('Error in POST /api/qr/generate-merchant:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * GET /api/qr/generate-merchant
 * Get information about QR code generation
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'QR Code Generation API',
    usage: 'POST with merchantId, walletAddress, name, and cashbackRate',
    example: {
      merchantId: 'merchant-123',
      walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      name: 'Coffee Shop',
      cashbackRate: 500
    }
  });
}
