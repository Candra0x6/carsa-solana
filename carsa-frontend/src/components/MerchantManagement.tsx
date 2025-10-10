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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#7c5aff]/20 to-[#6c47ff]/20 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-[#7c5aff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{merchant.name}</h2>
            <p className="text-gray-300 text-lg">{merchant.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-2xl text-sm font-medium border ${
            merchant.isActive 
              ? 'bg-green-500/20 text-green-300 border-green-500/30' 
              : 'bg-red-500/20 text-red-300 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                merchant.isActive ? 'bg-green-400' : 'bg-red-400'
              }`} />
              {merchant.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
          {!isEditing && (
            <Button
              variant="primary"
              onClick={() => setIsEditing(true)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Settings
            </Button>
          )}
        </div>
      </div>

      {/* Merchant Information Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="surface" className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">Business Details</h3>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">Cashback Rate</span>
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">{merchant.cashbackRate}%</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">Email Address</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white">{merchant.email || 'Not provided'}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">Phone Number</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <p className="text-white">{merchant.phone || 'Not provided'}</p>
            </div>
          </div>
        </Card>

        <Card variant="surface" className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">Location Details</h3>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">Street Address</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-white">{merchant.addressLine1}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">City</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z" />
                </svg>
              </div>
              <p className="text-white">{merchant.city}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Blockchain Information */}
            {/* Blockchain Information */}
      <div className="mt-6">
        <Card variant="surface" className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">Blockchain Information</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300">Wallet Address</span>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-white/80 break-all font-mono text-sm bg-black/30 p-3 rounded-lg border border-white/5">
                  {merchant.walletAddress}
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300">Merchant PDA</span>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-white/80 break-all font-mono text-sm bg-black/30 p-3 rounded-lg border border-white/5">
                  {merchant.merchantPDA}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-300">Created Date</span>
                </div>
                <p className="text-white font-semibold">
                  {new Date(merchant.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {new Date(merchant.createdAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm font-medium text-gray-300">Last Updated</span>
                </div>
                <p className="text-white font-semibold">
                  {new Date(merchant.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric'
                  })}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {new Date(merchant.updatedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="mt-6">
          <Card variant="surface" className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Update Merchant Settings</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Cashback Rate (%)
                    </div>
                  </label>
                  <div className="relative">
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
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl 
                               text-white placeholder-gray-400 
                               focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 
                               focus:outline-none transition-all duration-200 ${
                        errors.newCashbackRate ? 'border-red-400/50' : 'border-white/10'
                      }`}
                      placeholder="5.0"
                      disabled={operation.status === 'loading'}
                    />
                    <div className="absolute right-3 top-3 text-gray-400 text-sm">%</div>
                  </div>
                  {errors.newCashbackRate && (
                    <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.newCashbackRate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Business Status
                    </div>
                  </label>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          isActive: e.target.checked 
                        }))}
                        className="sr-only"
                        disabled={operation.status === 'loading'}
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.isActive ? 'bg-green-500' : 'bg-gray-600'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                      <span className="ml-3 text-white font-medium">
                        {formData.isActive ? '🟢 Merchant is Active' : '🔴 Merchant is Inactive'}
                      </span>
                    </label>
                    <p className="mt-2 text-sm text-gray-400">
                      {formData.isActive 
                        ? 'Business can process new purchases and earn cashback' 
                        : 'Inactive merchants cannot process new purchases'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Success/Error Messages */}
              {operation.status === 'success' && operation.data && (
                <Card variant="surface" className="p-4 bg-green-500/10 border-green-400/20">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-green-400 mb-1">Update Successful</h3>
                      <div className="text-sm text-green-300/80">
                        <p className="mb-1">Merchant information updated successfully</p>
                        <p className="font-mono text-xs bg-black/20 p-2 rounded border border-green-400/20">
                          Transaction: {operation.data.txSignature}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {operation.status === 'error' && (
                <Card variant="surface" className="p-4 bg-red-500/10 border-red-400/20">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-red-400 mb-1">Update Failed</h3>
                      <p className="text-sm text-red-300/80">{operation.error}</p>
                    </div>
                  </div>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={operation.status === 'loading'}
                  variant="primary"
                  className="flex-1 sm:flex-none"
                >
                  {operation.status === 'loading' ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Updating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update Merchant
                    </div>
                  )}
                </Button>
                
                <Button
                  type="button"
                  onClick={handleCancel}
                  disabled={operation.status === 'loading'}
                  variant="ghost-pill"
                  className="flex-1 sm:flex-none"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </div>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
