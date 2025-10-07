'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import PurchaseProcessor from '@/components/PurchaseProcessor';

interface PurchaseResult {
  transactionId: string;
  txSignature: string;
  tokensAwarded: number;
}

interface MerchantDetails {
  id: string;
  name: string;
  category: string;
  cashbackRate: number;
  email?: string;
  phone?: string;
  addressLine1: string;
  city: string;
  walletAddress: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  qrCodeUrl?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'FOOD_BEVERAGE': '🍽️',
  'RETAIL': '🛍️',
  'SERVICES': '⚙️',
  'ENTERTAINMENT': '🎬',
  'HEALTH_BEAUTY': '💄',
  'EDUCATION': '📚',
  'TRANSPORTATION': '🚗',
  'ACCOMMODATION': '🏨',
  'OTHER': '🏪'
};

const CATEGORY_COLORS: Record<string, string> = {
  'FOOD_BEVERAGE': 'bg-orange-100 text-orange-800 border-orange-200',
  'RETAIL': 'bg-purple-100 text-purple-800 border-purple-200',
  'SERVICES': 'bg-blue-100 text-blue-800 border-blue-200',
  'ENTERTAINMENT': 'bg-pink-100 text-pink-800 border-pink-200',
  'HEALTH_BEAUTY': 'bg-green-100 text-green-800 border-green-200',
  'EDUCATION': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'TRANSPORTATION': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'ACCOMMODATION': 'bg-red-100 text-red-800 border-red-200',
  'OTHER': 'bg-gray-100 text-gray-800 border-gray-200'
};

const MerchantDetailPage: React.FC = () => {
  const params = useParams();
  const merchantId = params.merchantId as string;
  
  const [merchant, setMerchant] = useState<MerchantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeExpanded, setQrCodeExpanded] = useState(false);

  const fetchMerchantDetails = useCallback(async () => {
    try {
      setLoading(true);
      // For now, we'll use the merchants API and find by ID
      // In a real app, you might have /api/merchants/[id] endpoint
      const response = await fetch('/api/merchants?limit=100');
      const data = await response.json();
      
      if (data.success && data.data) {
        const foundMerchant = data.data.merchants.find((m: MerchantDetails) => m.id === merchantId);
        if (foundMerchant) {
          setMerchant(foundMerchant);
        } else {
          setError('Merchant not found');
        }
      } else {
        setError('Failed to fetch merchant details');
      }
    } catch {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  const handlePurchaseSuccess = (result : PurchaseResult) => {
    alert(`Purchase successful! Transaction Signature: ${result.txSignature}`);
  };
  useEffect(() => {
    if (merchantId) {
      fetchMerchantDetails();
    }
  }, [merchantId, fetchMerchantDetails]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading merchant details...</p>
        </div>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Merchant Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/merchants"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Merchants
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/merchants"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Merchants
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-gray-900">{merchant.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-8 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-3xl">{CATEGORY_ICONS[merchant.category] || '🏪'}</span>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">{merchant.name}</h1>
                      <div className="mt-2 flex items-center space-x-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                          CATEGORY_COLORS[merchant.category] || 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {merchant.category.replace('_', ' & ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${merchant.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-sm text-gray-600">
                            {merchant.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cashback Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cashback Rewards</h2>
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {(merchant.cashbackRate / 100).toFixed(1)}%
                  </div>
                  <p className="text-green-800 font-medium">Cashback on Every Purchase</p>
                  <p className="text-sm text-green-600 mt-2">
                    Earn Lokal tokens every time you shop at {merchant.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Address</p>
                    <p className="text-sm text-gray-600">{merchant.addressLine1}</p>
                    <p className="text-sm text-gray-600">{merchant.city}</p>
                  </div>
                </div>

                {merchant.email && (
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <a href={`mailto:${merchant.email}`} className="text-sm text-blue-600 hover:text-blue-800">
                        {merchant.email}
                      </a>
                    </div>
                  </div>
                )}

                {merchant.phone && (
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <a href={`tel:${merchant.phone}`} className="text-sm text-blue-600 hover:text-blue-800">
                        {merchant.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Blockchain Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Blockchain Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Wallet Address</p>
                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm break-all">
                    {merchant.walletAddress}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Created</p>
                    <p className="text-gray-600">{new Date(merchant.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Last Updated</p>
                    <p className="text-gray-600">{new Date(merchant.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5">

            <PurchaseProcessor
                merchantWalletAddress={merchant.walletAddress}
                merchantId={merchantId}
                merchantName={merchant.name}
            onSuccess={handlePurchaseSuccess}
          />
        </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code Card */}
            {merchant.qrCodeUrl && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment QR Code</h3>
                <div className="text-center">
                  <div 
                    className="inline-block bg-white p-4 rounded-lg shadow-sm border-2 border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
                    onClick={() => setQrCodeExpanded(true)}
                  >
                    <Image
                      src={merchant.qrCodeUrl}
                      alt={`${merchant.name} Payment QR Code`}
                      width={qrCodeExpanded ? 300 : 200}
                      height={qrCodeExpanded ? 300 : 200}
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    Scan this QR code to make a payment and earn cashback
                  </p>
                  <button
                    onClick={() => setQrCodeExpanded(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Full Size
                  </button>
                </div>
              </div>
            )}


            {/* Other Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                  View Transaction History
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                  Share Merchant
                </button>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Member Since</span>
                  <span className="text-sm font-medium">
                    {new Date(merchant.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`text-sm font-medium ${merchant.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {merchant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Category</span>
                  <span className="text-sm font-medium">
                    {merchant.category.replace('_', ' & ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        
      </div>

      {/* QR Code Modal */}
      {qrCodeExpanded && merchant.qrCodeUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Payment QR Code</h3>
              <button
                onClick={() => setQrCodeExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-center">
              <Image
                src={merchant.qrCodeUrl}
                alt={`${merchant.name} Payment QR Code`}
                width={300}
                height={300}
                className="w-full max-w-xs mx-auto"
              />
              <p className="text-sm text-gray-600 mt-4">
                Scan with your wallet app to make a payment
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantDetailPage;
