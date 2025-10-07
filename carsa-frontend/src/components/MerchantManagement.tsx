'use client';

import React, { useState } from 'react';
import { 
  Merchant,
  UpdateMerchantForm, 
  MerchantUpdateResult, 
  FormErrors, 
  OperationState 
} from '@/types/merchant';
import { updateMerchant, generateIdempotencyKey } from '@/lib/merchant-api';

interface MerchantManagementProps {
  merchant: Merchant;
  onUpdate?: (result: MerchantUpdateResult) => void;
}

export default function MerchantManagement({ merchant, onUpdate }: MerchantManagementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateMerchantForm>({
    merchantId: merchant.id,
    newCashbackRate: merchant.cashbackRate,
    isActive: merchant.isActive,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [operation, setOperation] = useState<OperationState<MerchantUpdateResult>>({
    status: 'idle'
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.newCashbackRate !== undefined && 
        (formData.newCashbackRate < 0 || formData.newCashbackRate > 50)) {
      newErrors.newCashbackRate = 'Cashback rate must be between 0% and 50%';
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
      const result = await updateMerchant(formData, generateIdempotencyKey());

      if (result.success && result.data) {
        setOperation({ 
          status: 'success', 
          data: result.data 
        });
        setIsEditing(false);
        onUpdate?.(result.data);
      } else {
        setOperation({ 
          status: 'error', 
          error: result.error || 'Update failed' 
        });
      }
    } catch (error) {
      setOperation({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      merchantId: merchant.id,
      newCashbackRate: merchant.cashbackRate,
      isActive: merchant.isActive,
    });
    setErrors({});
    setOperation({ status: 'idle' });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{merchant.name}</h2>
          <p className="text-gray-600">{merchant.category}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            merchant.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {merchant.isActive ? 'Active' : 'Inactive'}
          </span>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Merchant Information Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Details</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Cashback Rate</span>
              <p className="text-gray-900">{merchant.cashbackRate}%</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Email</span>
              <p className="text-gray-900">{merchant.email || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Phone</span>
              <p className="text-gray-900">{merchant.phone || 'Not provided'}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Street Address</span>
              <p className="text-gray-900">{merchant.addressLine1}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">City</span>
              <p className="text-gray-900">{merchant.city}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Information */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Blockchain Information</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-500">Wallet Address</span>
            <p className="text-gray-900 font-mono text-sm break-all">{merchant.walletAddress}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Merchant PDA</span>
            <p className="text-purple-600 font-mono text-sm break-all">{merchant.merchantPDA}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Update Merchant Settings</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cashback Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={formData.newCashbackRate || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  newCashbackRate: parseFloat(e.target.value) || 0 
                }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.newCashbackRate ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="5.0"
                disabled={operation.status === 'loading'}
              />
              {errors.newCashbackRate && (
                <p className="mt-1 text-sm text-red-600">{errors.newCashbackRate}</p>
              )}
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    isActive: e.target.checked 
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={operation.status === 'loading'}
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Merchant is active
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Inactive merchants cannot process new purchases
              </p>
            </div>

            {/* Success/Error Messages */}
            {operation.status === 'success' && operation.data && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Update Successful</h3>
                    <div className="mt-1 text-sm text-green-700">
                      <p>Transaction: <span className="font-mono">{operation.data.txSignature}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {operation.status === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Update Failed</h3>
                    <p className="mt-1 text-sm text-red-700">{operation.error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={operation.status === 'loading'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {operation.status === 'loading' ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Updating...
                  </div>
                ) : (
                  'Update Merchant'
                )}
              </button>
              
              <button
                type="button"
                onClick={handleCancel}
                disabled={operation.status === 'loading'}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timestamps */}
      <div className="border-t pt-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
          <div>
            <span className="font-medium">Created:</span> {new Date(merchant.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Updated:</span> {new Date(merchant.updatedAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
