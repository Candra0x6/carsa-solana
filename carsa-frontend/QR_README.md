# QR Code System for Merchant Registration

## Overview

The Carsa platform automatically generates square QR codes for merchants after successful registration. These QR codes contain the merchant's payment information encoded as JSON and are stored in Supabase Storage.

## Flow

1. **Merchant Registration**: When a merchant registers successfully on-chain
2. **QR Generation**: Backend automatically generates a 512x512 square QR code
3. **Upload to Storage**: QR code image is uploaded to Supabase Storage
4. **Database Update**: Merchant record is updated with the public QR code URL
5. **Response**: Registration API returns the QR code URL along with other merchant data

## QR Code Data Structure

The QR code contains the following JSON structure:

```json
{
  "type": "merchant_payment",
  "merchantId": "clx1234567890",
  "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "name": "Coffee Shop",
  "cashbackRate": 500,
  "timestamp": "2025-01-06T10:30:00.000Z"
}
```

## API Endpoints

### Merchant Registration
`POST /api/anchor/register-merchant`

**Response includes QR code URL:**
```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "txSignature": "5RcSziPRh8nkrFNi...",
    "merchantPDA": "FoGPNye1EkjTPwTc...",
    "qrCodeUrl": "https://juydkpjoftwerhokawvj.supabase.co/storage/v1/object/public/merchant-qr-codes/merchant-clx1234567890-1704537000000.png"
  }
}
```

### QR Code Generation (Testing)
`POST /api/qr/generate-merchant`

**Request:**
```json
{
  "merchantId": "test-merchant-123",
  "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "name": "Demo Coffee Shop",
  "cashbackRate": 500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "https://supabase.co/storage/...",
    "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhE..."
  }
}
```

## Testing

### 1. QR Test Page
Visit `/qr-test` to test QR code generation with custom merchant data.

### 2. Manual API Testing
```bash
curl -X POST http://localhost:3000/api/qr/generate-merchant \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "test-123",
    "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "name": "Test Merchant",
    "cashbackRate": 500
  }'
```

## Implementation Details

### QR Service (`src/lib/qr-service.ts`)
- **QRService class**: Handles QR code generation and storage
- **generateMerchantQR()**: Creates QR code and uploads to Supabase
- **ensureBucketExists()**: Creates storage bucket if needed
- **deleteQRCode()**: Removes QR code from storage

### Database Integration (`src/lib/database-service.ts`)
- **registerMerchant()**: Updated to include QR generation
- Automatically generates QR after successful merchant creation
- Updates merchant record with `qr_code_url` field
- Graceful error handling - registration succeeds even if QR generation fails

### Utilities (`src/lib/qr-utils.ts`)
- **parseQRCodeData()**: Parse scanned QR code data
- **isMerchantPaymentQR()**: Validate QR code type
- **formatCashbackRate()**: Display formatting for cashback rates
- **getMerchantDisplayInfo()**: Extract display information

## Configuration

### Environment Variables
```env
# Required for QR code storage
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Already configured in .env
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase Storage
- **Bucket**: `merchant-qr-codes`
- **Public**: Yes (for merchant display)
- **File Size Limit**: 1MB
- **Allowed MIME Types**: `image/png`

## Security Considerations

1. **QR Code Data**: Contains merchant ID and wallet address (public information)
2. **Storage**: Public bucket for easy merchant access to QR codes
3. **Validation**: All QR data is validated before processing
4. **Rate Limiting**: Consider implementing rate limits for QR generation API

## Error Handling

1. **QR Generation Failure**: Merchant registration still succeeds
2. **Storage Upload Failure**: Logged but doesn't block registration
3. **Invalid Data**: Validation prevents malformed QR codes
4. **Network Issues**: Graceful fallbacks for storage operations

## Future Enhancements

1. **QR Code Customization**: Add merchant logos or branding
2. **Dynamic QR Codes**: Update QR codes when merchant settings change
3. **Analytics**: Track QR code scans and usage
4. **Batch Generation**: Generate QR codes for multiple merchants
5. **Backup Storage**: Secondary storage for redundancy
