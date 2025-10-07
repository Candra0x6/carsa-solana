// Types for merchant management system

export interface Merchant {
  id: string;
  name: string;
  category: string;
  cashbackRate: number;
  email?: string;
  phone?: string;
  addressLine1: string;
  city: string;
  walletAddress: string;
  merchantPDA: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface UpdateMerchantForm {
  merchantId: string;
  newCashbackRate?: number;
  isActive?: boolean;
}

export interface ProcessPurchaseForm {
  merchantId: string;
  purchaseAmount: number;
}

export interface MerchantRegistrationResult {
  id: string;
  txSignature: string;
  merchantPDA: string;
}

export interface MerchantUpdateResult {
  id: string;
  txSignature: string;
}

export interface PurchaseResult {
  transactionId: string;
  txSignature: string;
  tokensAwarded: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form validation types
export interface FormErrors {
  [key: string]: string;
}

// Merchant categories
export const MERCHANT_CATEGORIES = [
  'Restaurant',
  'Retail',
  'Services',
  'Entertainment',
  'Health & Wellness',
  'Travel',
  'Technology',
  'Education',
  'Other'
] as const;

export type MerchantCategory = typeof MERCHANT_CATEGORIES[number];

// Status types for async operations
export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface OperationState<T> {
  status: OperationStatus;
  data?: T;
  error?: string;
}
