/**
 * TypeScript types for Carsa database operations
 * Corresponds to Prisma schema enums and models
 */

// Enum types matching Prisma schema
export enum MerchantCategory {
  FOOD_BEVERAGE = 'FOOD_BEVERAGE',
  RETAIL = 'RETAIL',
  SERVICES = 'SERVICES',
  ENTERTAINMENT = 'ENTERTAINMENT',
  HEALTH_BEAUTY = 'HEALTH_BEAUTY',
  EDUCATION = 'EDUCATION',
  TRANSPORTATION = 'TRANSPORTATION',
  ACCOMMODATION = 'ACCOMMODATION',
  OTHER = 'OTHER',
}

export enum TransactionType {
  REWARD_MINT = 'REWARD_MINT',
  REDEMPTION = 'REDEMPTION',
  TRANSFER = 'TRANSFER',
  CASHBACK = 'CASHBACK',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum QRCodeType {
  MERCHANT_PAYMENT = 'MERCHANT_PAYMENT',
  USER_WALLET = 'USER_WALLET',
  TRANSACTION = 'TRANSACTION',
  PROMOTIONAL = 'PROMOTIONAL',
}

export enum EntityType {
  USER = 'USER',
  MERCHANT = 'MERCHANT',
  TRANSACTION = 'TRANSACTION',
  SYSTEM = 'SYSTEM',
}

// Input types for database operations
export interface CreateUserInput {
  email: string;
  name?: string;
  phone?: string;
  password_hash: string;
  wallet_address: string;
  wallet_private_key_hash: string;
  profile_image_url?: string;
  city?: string;
}

export interface CreateMerchantInput {
  name: string;
  description?: string;
  category: MerchantCategory;
  email?: string;
  phone?: string;
  website?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  wallet_address: string;
  cashback_rate: number;
  logo_url?: string;
  qr_code_url?: string;
  business_registration_number?: string;
}

export interface CreateTransactionInput {
  user_id: string;
  merchant_id: string;
  transaction_type: TransactionType;
  amount: number;
  fiat_amount?: number;
  currency?: string;
  from_wallet_address: string;
  to_wallet_address: string;
  token_mint_address?: string;
  description?: string;
  reference_id?: string;
  blockchain_signature?: string;
}

export interface CreateQRCodeInput {
  code: string;
  qr_type: QRCodeType;
  entity_id: string;
  entity_type: EntityType;
  image_url?: string;
  expires_at?: Date;
}

// Response types for API endpoints
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  wallet_address: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: Date;
  last_login_at?: Date;
}

export interface MerchantProfile {
  id: string;
  name: string;
  description?: string;
  category: MerchantCategory;
  address_line_1: string;
  city: string;
  wallet_address: string;
  cashback_rate: number;
  logo_url?: string;
  qr_code_url?: string;
  is_active: boolean;
}

export interface TransactionRecord {
  id: string;
  transaction_type: TransactionType;
  amount: number;
  fiat_amount?: number;
  status: TransactionStatus;
  blockchain_signature?: string;
  created_at: Date;
  merchant?: {
    id: string;
    name: string;
    logo_url?: string;
  };
  user?: {
    id: string;
    name?: string;
    email: string;
  };
}

// Analytics types
export interface MerchantAnalytics {
  total_transactions: number;
  total_tokens_issued: number;
  total_tokens_redeemed: number;
  unique_customers: number;
  average_transaction_amount: number;
  period_start: Date;
  period_end: Date;
}

export interface UserAnalytics {
  total_earned: number;
  total_spent: number;
  favorite_merchants: Array<{
    merchant_id: string;
    merchant_name: string;
    visit_count: number;
  }>;
  transaction_count: number;
  member_since: Date;
}

// API Request/Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search and filter types
export interface MerchantSearchParams {
  query?: string;
  category?: MerchantCategory;
  city?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  limit?: number;
  offset?: number;
}

export interface TransactionFilterParams {
  user_id?: string;
  merchant_id?: string;
  transaction_type?: TransactionType;
  status?: TransactionStatus;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}
