# Merchant Management System - Frontend Integration

A comprehensive frontend integration for merchant management that connects to Anchor smart contract backend APIs. This system supports merchant registration, account management, and purchase processing with on-chain confirmation.

## 🏗️ Architecture Overview

### Backend APIs (Already Implemented)
- `/api/anchor/register-merchant` - Register new merchants on-chain
- `/api/anchor/update-merchant` - Update merchant settings
- `/api/anchor/process-purchase` - Process customer purchases and award tokens

### Frontend Components
- **MerchantRegistration** - New merchant onboarding form
- **MerchantManagement** - Account settings and information management
- **PurchaseProcessor** - Real-time purchase processing interface
- **MerchantDashboard** - Comprehensive dashboard combining all functionality

## 🚀 Features

### 1. Merchant Registration
- **Comprehensive Form Validation**: Business details, contact info, address, and wallet validation
- **Category Selection**: Predefined business categories (Restaurant, Retail, Services, etc.)
- **Cashback Configuration**: Customizable cashback rates (0-50%)
- **Real-time Validation**: Solana address format validation
- **Success Confirmation**: Display transaction signature and merchant PDA

### 2. Account Management
- **Live Status Display**: Active/Inactive merchant status with visual indicators
- **Editable Settings**: Update cashback rates and account status
- **Blockchain Information**: Display wallet address and Program Derived Address (PDA)
- **Transaction History**: Show update transaction signatures
- **Contact Information**: Manage email, phone, and address details

### 3. Purchase Processing
- **Customer Wallet Integration**: Input and validate customer Solana addresses
- **Amount Processing**: Handle Indonesian Rupiah (IDR) purchase amounts
- **Token Calculation**: Real-time preview of cashback tokens to be awarded
- **Transaction Summary**: Clear display of purchase details before processing
- **Success Confirmation**: Show transaction ID, blockchain signature, and tokens awarded

### 4. Dashboard Overview
- **Authentication Guard**: NextAuth integration with wallet-based authentication
- **Quick Stats**: Cashback rate, status, and category at a glance
- **Quick Actions**: Direct access to purchase processing and account management
- **Responsive Design**: Optimized for desktop and mobile devices
- **Real-time Updates**: Live status updates after transactions

## 📋 API Integration

### Type Safety
```typescript
// Comprehensive TypeScript types
export interface RegisterMerchantForm {
  name: string;
  category: string;
  cashbackRate: number;
  email?: string;
  phone?: string;
  addressLine1: string;
  city: string;
  walletAddress: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Error Handling
- **Network Error Recovery**: Automatic retry mechanisms
- **Validation Errors**: Real-time form validation with user-friendly messages
- **API Error Display**: Clear error messages from backend responses
- **Idempotency Protection**: Prevents duplicate transactions

### Request/Response Flow
1. **Form Validation**: Client-side validation before API calls
2. **Idempotency Keys**: Generate unique keys for each operation
3. **Loading States**: Visual feedback during API requests
4. **Success/Error Handling**: Appropriate user feedback for all outcomes
5. **State Management**: Update local state based on API responses

## 🔧 Usage Examples

### Basic Implementation
```typescript
import MerchantDashboard from '@/components/MerchantDashboard';

export default function MerchantPage() {
  return <MerchantDashboard />;
}
```

### Custom Integration
```typescript
import { MerchantRegistration, PurchaseProcessor } from '@/components';

function CustomMerchantFlow() {
  const handleRegistrationSuccess = (result) => {
    console.log('New merchant registered:', result);
  };

  return (
    <MerchantRegistration onSuccess={handleRegistrationSuccess} />
  );
}
```

### API Client Usage
```typescript
import { registerMerchant, processPurchase } from '@/lib/merchant-api';

// Register new merchant
const result = await registerMerchant({
  name: 'My Business',
  category: 'Restaurant',
  cashbackRate: 5,
  addressLine1: 'Business Address',
  city: 'Jakarta',
  walletAddress: 'merchant_wallet_address'
});

// Process customer purchase
const purchase = await processPurchase({
  customerWallet: 'customer_wallet_address',
  merchantId: 'merchant_123',
  purchaseAmount: 100000 // IDR
});
```

## 🎨 UI/UX Features

### Design System
- **Tailwind CSS**: Modern, responsive styling
- **Consistent Colors**: Blue primary, green success, red error themes
- **Typography**: Clear hierarchy with proper font weights
- **Spacing**: Consistent spacing using Tailwind's spacing scale

### User Experience
- **Progressive Disclosure**: Show information as needed
- **Loading States**: Spinners and disabled states during operations
- **Success Animations**: Visual feedback for successful operations
- **Error Recovery**: Clear paths to fix validation errors

### Accessibility
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG compliant color combinations
- **Focus Management**: Clear focus indicators and logical tab order

## 🔒 Security Features

### Input Validation
- **Solana Address Validation**: Base58 format and length checks
- **Amount Validation**: Positive numbers with reasonable limits
- **Email/Phone Validation**: Format validation for contact information
- **XSS Prevention**: Proper input sanitization

### Authentication Integration
- **NextAuth Sessions**: Secure session management
- **Wallet-based Auth**: Both custodial and external wallet support
- **Route Protection**: Authentication guards for merchant functions

## 📱 Responsive Design

### Mobile Optimization
- **Touch-friendly**: Large tap targets for mobile devices
- **Responsive Grid**: Adapts to different screen sizes
- **Mobile Menu**: Collapsible navigation for small screens
- **Form Optimization**: Mobile-friendly form inputs

### Desktop Features
- **Multi-column Layouts**: Efficient use of screen space
- **Keyboard Shortcuts**: Quick navigation options
- **Detailed Information**: More comprehensive data display

## 🔄 Integration with Existing System

### NextAuth Compatibility
- Seamlessly integrates with your existing authentication system
- Supports both custodial and external wallet authentication
- Session management with wallet address tracking

### Database Integration
- Works with your existing Prisma schema
- Handles merchant data synchronization
- Transaction metadata tracking

### Solana Integration
- Compatible with existing Anchor program structure
- Uses your established PDA patterns
- Integrates with server wallet functionality

## 📊 Performance Optimizations

### Client-side Optimizations
- **React Optimizations**: Proper use of hooks and state management
- **Bundle Size**: Minimized dependencies and code splitting
- **Caching**: Local state caching for better UX

### Network Optimizations
- **Request Deduplication**: Prevent duplicate API calls
- **Error Boundaries**: Graceful error handling without crashes
- **Optimistic Updates**: Immediate UI feedback with rollback on errors

## 🧪 Testing Strategy

### Component Testing
```typescript
// Example test structure
describe('MerchantRegistration', () => {
  it('validates required fields', () => {
    // Test form validation
  });
  
  it('submits valid merchant data', () => {
    // Test successful registration flow
  });
});
```

### Integration Testing
- API client testing with mock responses
- End-to-end user flow testing
- Authentication integration testing

## 📈 Future Enhancements

### Planned Features
- **Transaction History**: Detailed purchase and payment history
- **Analytics Dashboard**: Sales metrics and customer insights  
- **Multi-location Support**: Manage multiple business locations
- **QR Code Generation**: Generate QR codes for easy customer payments
- **Notification System**: Real-time notifications for purchases and updates

### Scalability Considerations
- **Pagination**: Handle large datasets efficiently
- **Lazy Loading**: Load components and data as needed
- **Caching Strategy**: Implement efficient data caching
- **Performance Monitoring**: Track and optimize performance metrics

## 🛠️ Development Setup

### Prerequisites
- Next.js 14+ with App Router
- NextAuth.js for authentication
- Tailwind CSS for styling
- TypeScript for type safety

### Installation
```bash
# Install dependencies (already in your project)
npm install

# Run development server
npm run dev
```

### Environment Variables
```bash
# Add to your .env.local
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

This merchant management system provides a complete frontend solution that seamlessly integrates with your existing Anchor smart contract backend, offering merchants a professional and user-friendly interface to manage their business on the Carsa loyalty platform.
