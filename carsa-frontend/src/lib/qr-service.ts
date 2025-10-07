import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration for QR service');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export interface MerchantQRData {
  merchantId: string;
  walletAddress: string;
  name: string;
  cashbackRate: number;
}

export interface QRGenerationResult {
  success: boolean;
  qrCodeUrl?: string;
  error?: string;
}

/**
 * QR Code Service for generating and storing merchant payment QR codes
 */
export class QRService {
  private bucketName = 'merchant-qr-codes';

  /**
   * Generate a square QR code for a merchant and upload to Supabase Storage
   */
  async generateMerchantQR(merchantData: MerchantQRData): Promise<QRGenerationResult> {
    try {
      // Create QR code data payload
      const qrPayload = {
        type: 'merchant_payment',
        merchantId: merchantData.merchantId,
        walletAddress: merchantData.walletAddress,
        name: merchantData.name,
        cashbackRate: merchantData.cashbackRate,
        timestamp: new Date().toISOString()
      };

      // Generate QR code as buffer
      const qrCodeBuffer = await QRCode.toBuffer(JSON.stringify(qrPayload), {
        type: 'png',
        width: 512, // Square 512x512 pixels
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H' // High error correction for better scanning
      });

      // Upload to Supabase Storage
      const fileName = `merchant-${merchantData.merchantId}-${Date.now()}.png`;
      const { error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, qrCodeBuffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (error) {
        console.error('Error uploading QR code to Supabase:', error);
        return {
          success: false,
          error: `Failed to upload QR code: ${error.message}`
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return {
        success: true,
        qrCodeUrl: urlData.publicUrl
      };

    } catch (error) {
      console.error('Error generating QR code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'QR code generation failed'
      };
    }
  }

  /**
   * Generate QR code as data URL (base64) for testing or immediate display
   */
  async generateMerchantQRDataURL(merchantData: MerchantQRData): Promise<string> {
    const qrPayload = {
      type: 'merchant_payment',
      merchantId: merchantData.merchantId,
      walletAddress: merchantData.walletAddress,
      name: merchantData.name,
      cashbackRate: merchantData.cashbackRate,
      timestamp: new Date().toISOString()
    };

    return await QRCode.toDataURL(JSON.stringify(qrPayload), {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    });
  }

  /**
   * Delete QR code from Supabase Storage
   */
  async deleteQRCode(qrCodeUrl: string): Promise<boolean> {
    try {
      // Extract filename from URL
      const url = new URL(qrCodeUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      if (error) {
        console.error('Error deleting QR code:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error parsing QR code URL for deletion:', error);
      return false;
    }
  }

  /**
   * Ensure the QR codes bucket exists (call during setup)
   */
  async ensureBucketExists(): Promise<boolean> {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return false;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        // Create bucket
        const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: ['image/png'],
          fileSizeLimit: 1048576 // 1MB
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
          return false;
        }

        console.log(`Created QR codes bucket: ${this.bucketName}`);
      }

      return true;
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      return false;
    }
  }
}

// Singleton instance
let qrServiceInstance: QRService | null = null;

export function getQRService(): QRService {
  if (!qrServiceInstance) {
    qrServiceInstance = new QRService();
  }
  return qrServiceInstance;
}

// Utility function to parse QR code data
export function parseQRCodeData(qrData: string): MerchantQRData | null {
  try {
    const parsed = JSON.parse(qrData);
    
    if (parsed.type === 'merchant_payment' && 
        parsed.merchantId && 
        parsed.walletAddress && 
        parsed.name && 
        typeof parsed.cashbackRate === 'number') {
      return {
        merchantId: parsed.merchantId,
        walletAddress: parsed.walletAddress,
        name: parsed.name,
        cashbackRate: parsed.cashbackRate
      };
    }
    
    return null;
  } catch {
    return null;
  }
}
