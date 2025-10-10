# QR Scanner Integration Documentation

## Overview

The enhanced QRScanner component now provides complete QR code scanning functionality that integrates with the CARSA merchant system and purchase transaction flow.

## Key Features

### 🔍 Real QR Code Scanning
- Uses @zxing/library for robust QR code detection
- Supports various QR code formats and merchant URLs
- Real-time video scanning with visual feedback

### 📱 Modal Purchase Interface
- Automatic merchant data fetching
- Integrated purchase transaction processing
- Error handling and validation

### 🛡️ Robust Error Handling
- Camera permission management
- Invalid QR code format detection
- Merchant validation and status checking

## Components

### QRScanner Component (`src/components/QRScanner.tsx`)

Enhanced scanner with actual QR code detection capability.

**Props:**
```typescript
interface QRScannerProps {
  onScanSuccess: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}
```

**Features:**
- Real-time QR code scanning using @zxing/library
- Camera permission handling
- Visual scanning feedback with animated indicators
- Automatic merchant URL detection

### QRScanModal Component (`src/components/QRScanModal.tsx`)

Modal interface for processing scanned QR codes and handling purchases.

**Props:**
```typescript
interface QRScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedData: string;
}
```

**Features:**
- Automatic merchant data fetching from API
- Manual QR code input fallback
- Integrated purchase transaction interface
- Merchant validation and status display

## Usage Example

```tsx
import QRScanner from '@/components/QRScanner';

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(false);

  const handleScanSuccess = (result: string) => {
    console.log('QR Code scanned:', result);
    // Modal automatically opens with purchase interface
  };

  const handleScanError = (error: string) => {
    console.error('Scan error:', error);
  };

  return (
    <QRScanner
      isActive={isScanning}
      onScanSuccess={handleScanSuccess}
      onError={handleScanError}
    />
  );
}
```

## QR Code URL Formats Supported

The scanner recognizes multiple URL formats:

1. **Full URL**: `https://carsa.app/merchant/{merchantId}`
2. **Domain URL**: `carsa.app/merchant/{merchantId}`
3. **Path only**: `merchant/{merchantId}`
4. **Direct ID**: `{merchantId}`

## Integration Flow

### 1. QR Code Detection
- User activates scanner
- Camera detects QR code
- @zxing/library extracts text content

### 2. Merchant Data Processing
- Extract merchant ID from scanned URL
- Fetch merchant data from `/api/merchants/{id}`
- Validate merchant is active and exists

### 3. Purchase Transaction
- Display merchant information in modal
- Show PurchaseTransaction component
- Process payment and token rewards

### 4. Transaction Recording
- Record purchase on blockchain
- Update database with transaction details
- Display success confirmation with tokens earned

## Error Handling

### Camera Permissions
- Automatic permission request
- Clear error messages for denied permissions
- Fallback to manual input if camera unavailable

### Invalid QR Codes
- Format validation for merchant URLs
- Clear error messages for unsupported formats
- Suggestion to enter merchant ID manually

### Merchant Validation
- Check if merchant exists in database
- Verify merchant is active
- Display detailed error messages

### Network Issues
- Retry mechanisms for API calls
- Offline detection and messaging
- Graceful degradation for poor connectivity

## Dependencies

### Required Packages
- `@zxing/library`: QR code detection
- `@zxing/browser`: Browser-specific QR utilities
- `@radix-ui/react-dialog`: Modal components

### Backend Requirements
- `/api/merchants/{id}` endpoint for merchant data
- PurchaseTransaction component for payment processing
- Database integration for transaction recording

## Browser Support

### Camera Access
- Chrome 53+
- Firefox 36+
- Safari 11+
- Edge 12+

### WebRTC Requirements
- HTTPS required for camera access
- Mobile browsers: iOS 11+, Android Chrome 53+

## Testing

### Manual Testing
1. Test camera permission flow
2. Scan various QR code formats
3. Test merchant data fetching
4. Complete purchase transactions
5. Test error scenarios (invalid codes, inactive merchants)

### Development Tips
- Use HTTPS for local development to access camera
- Test with various QR code generators
- Mock merchant API responses for testing
- Test on mobile devices for camera behavior

## Security Considerations

### Input Validation
- Sanitize scanned QR code content
- Validate merchant ID format
- Prevent XSS attacks from malicious QR codes

### API Security
- Authenticate merchant API requests
- Rate limit QR scanning requests
- Validate merchant data integrity

## Performance Optimization

### Scanning Performance
- Efficient video processing
- Debounce rapid scan attempts
- Memory cleanup for camera streams

### Modal Loading
- Lazy load purchase components
- Cache merchant data temporarily
- Optimize API response sizes

## Future Enhancements

### Planned Features
- Batch QR code scanning
- Offline merchant data caching
- Advanced QR code formats (encrypted, signed)
- Multi-language support for error messages

### Integration Opportunities
- NFC payment integration
- Bluetooth Low Energy scanning
- Augmented reality QR overlay
- Voice-guided scanning for accessibility

## Troubleshooting

### Common Issues
1. **Camera not working**: Check HTTPS, permissions, browser support
2. **QR codes not detected**: Ensure good lighting, steady hand, clean lens
3. **Merchant not found**: Verify QR code format, check network connection
4. **Modal not opening**: Check console for JavaScript errors

### Debug Mode
Enable detailed logging by setting:
```typescript
console.log('QR Scanner Debug Mode Enabled');
```

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify camera permissions in browser settings
3. Test with known working QR codes
4. Check network connectivity for merchant API calls
