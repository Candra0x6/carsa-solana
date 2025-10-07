'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  RegisterMerchantForm, 
  MerchantRegistrationResult, 
  FormErrors, 
  MERCHANT_CATEGORIES, 
  OperationState 
} from '@/types/merchant';
import { registerMerchant, generateIdempotencyKey, isValidSolanaAddress } from '@/lib/merchant-api';

interface MerchantRegistrationProps {
  onSuccess?: (result: MerchantRegistrationResult) => void;
  onCancel?: () => void;
}

export default function MerchantRegistration({ onSuccess, onCancel }: MerchantRegistrationProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState<RegisterMerchantForm>({
    name: '',
    category: 'Restaurant',
    cashbackRate: 5,
    email: '',
    phone: '',
    addressLine1: '',
    city: '',
    walletAddress: session?.user?.walletAddress || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [operation, setOperation] = useState<OperationState<MerchantRegistrationResult>>({
    status: 'idle'
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Business name is required';
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.walletAddress.trim()) {
      newErrors.walletAddress = 'Wallet address is required';
    } else if (!isValidSolanaAddress(formData.walletAddress)) {
      newErrors.walletAddress = 'Invalid Solana wallet address';
    }

    if (formData.cashbackRate < 0 || formData.cashbackRate > 50) {
      newErrors.cashbackRate = 'Cashback rate must be between 0% and 50%';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setOperation({ status: 'loading' });

    try {
      const result = await registerMerchant(formData, generateIdempotencyKey());

      if (result.success && result.data) {
        setOperation({ 
          status: 'success', 
          data: result.data 
        });
        onSuccess?.(result.data);
      } else {
        setOperation({ 
          status: 'error', 
          error: result.error || 'Registration failed' 
        });
      }
    } catch (error) {
      setOperation({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    }
  };

  const handleInputChange = (field: keyof RegisterMerchantForm, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (operation.status === 'success' && operation.data) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Merchant Registration Successful!</h2>
          <p className="text-gray-600 mb-6">Your merchant account has been registered on the blockchain.</p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Merchant ID:</span>
                <span className="text-gray-900 font-mono">{operation.data.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Transaction:</span>
                <span className="text-blue-600 font-mono text-xs">{operation.data.txSignature}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Merchant PDA:</span>
                <span className="text-purple-600 font-mono text-xs">{operation.data.merchantPDA}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Register as Merchant</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your business name"
              disabled={operation.status === 'loading'}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={operation.status === 'loading'}
            >
              {MERCHANT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cashback Rate (%) *
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={formData.cashbackRate}
              onChange={(e) => handleInputChange('cashbackRate', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.cashbackRate ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="5.0"
              disabled={operation.status === 'loading'}
            />
            {errors.cashbackRate && <p className="mt-1 text-sm text-red-600">{errors.cashbackRate}</p>}
            <p className="mt-1 text-xs text-gray-500">Percentage of purchase amount awarded as cashback tokens</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="business@example.com"
              disabled={operation.status === 'loading'}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+62 XXX XXX XXXX"
              disabled={operation.status === 'loading'}
            />
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Address</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address *
            </label>
            <input
              type="text"
              value={formData.addressLine1}
              onChange={(e) => handleInputChange('addressLine1', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.addressLine1 ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your business address"
              disabled={operation.status === 'loading'}
            />
            {errors.addressLine1 && <p className="mt-1 text-sm text-red-600">{errors.addressLine1}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.city ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your city"
              disabled={operation.status === 'loading'}
            />
            {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
          </div>
        </div>

        {/* Wallet Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Blockchain Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address *
            </label>
            <input
              type="text"
              value={formData.walletAddress}
              onChange={(e) => handleInputChange('walletAddress', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
                errors.walletAddress ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your Solana wallet address"
              disabled={operation.status === 'loading'}
            />
            {errors.walletAddress && <p className="mt-1 text-sm text-red-600">{errors.walletAddress}</p>}
            <p className="mt-1 text-xs text-gray-500">This wallet will receive merchant payments and manage your account</p>
          </div>
        </div>

        {/* Error Display */}
        {operation.status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Registration Failed</h3>
                <p className="mt-1 text-sm text-red-700">{operation.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={operation.status === 'loading'}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {operation.status === 'loading' ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Registering...
              </div>
            ) : (
              'Register Merchant'
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={operation.status === 'loading'}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
