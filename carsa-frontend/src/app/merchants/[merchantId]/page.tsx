'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PurchaseTransaction from '@/components/PurchaseTransaction';



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


  useEffect(() => {
    if (merchantId) {
      fetchMerchantDetails();
    }
  }, [merchantId, fetchMerchantDetails]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <Card variant="surface" className="p-8">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#7c5aff] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/80">Loading merchant details...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card variant="surface" className="p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Merchant Not Found</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <Button variant="primary" asChild>
            <Link href="/merchants" className="inline-flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Merchants
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
    

      <div className="max-w-6xl pt-20 mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card variant="surface" className="overflow-hidden">
              <div className="px-6 py-8 bg-gradient-to-r from-[#7c5aff]/10 to-[#6c47ff]/10 border-b border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                      <span className="text-3xl">{CATEGORY_ICONS[merchant.category] || '🏪'}</span>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-white mb-3">{merchant.name}</h1>
                      <div className="flex items-center space-x-3">
                        <div className="inline-flex items-center px-3 py-1 rounded-[99px] text-sm font-medium bg-white/10 border border-white/20 text-white/90">
                          {merchant.category.replace('_', ' & ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${merchant.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-sm text-white/70">
                            {merchant.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Cashback Info */}
            <Card variant="surface" className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Cashback Rewards</h2>
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl p-6 border border-green-500/30">
                <div className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent mb-2">
                    {(merchant.cashbackRate / 100).toFixed(1)}%
                  </div>
                  <p className="text-green-300 font-medium">Cashback on Every Purchase</p>
                  <p className="text-sm text-green-400/80 mt-2">
                    Earn Lokal tokens every time you shop at {merchant.name}
                  </p>
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card variant="surface" className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mt-0.5 shrink-0">
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Address</p>
                    <p className="text-sm text-white/70">{merchant.addressLine1}</p>
                    <p className="text-sm text-white/70">{merchant.city}</p>
                  </div>
                </div>

                {merchant.email && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mt-0.5 shrink-0">
                      <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Email</p>
                      <a href={`mailto:${merchant.email}`} className="text-sm text-[#7c5aff] hover:text-[#8f71ff] transition-colors">
                        {merchant.email}
                      </a>
                    </div>
                  </div>
                )}

                {merchant.phone && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mt-0.5 shrink-0">
                      <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Phone</p>
                      <a href={`tel:${merchant.phone}`} className="text-sm text-[#7c5aff] hover:text-[#8f71ff] transition-colors">
                        {merchant.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Blockchain Information */}
            <Card variant="surface" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-[#7c5aff] to-[#6c47ff] flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Blockchain Details</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-white mb-2">Wallet Address</p>
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                    <code className="font-mono text-sm text-white/80 break-all">
                      {merchant.walletAddress}
                    </code>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="font-medium text-white mb-1">Created</p>
                    <p className="text-white/70">{new Date(merchant.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="font-medium text-white mb-1">Last Updated</p>
                    <p className="text-white/70">{new Date(merchant.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </Card>
            {/* Purchase Transaction */}
            <Card variant="surface" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Make a Purchase</h2>
              </div>
              <PurchaseTransaction merchantWalletAddress={merchant.walletAddress} merchantName={merchant.name} />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code Card */}
            {merchant.qrCodeUrl && (
              <Card variant="surface" className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Payment QR Code</h3>
                <div className="text-center">
                  <div 
                    className="inline-block bg-white/5 p-4 rounded-2xl border border-white/20 cursor-pointer hover:border-[#7c5aff]/50 transition-all hover:bg-white/10 backdrop-blur-sm"
                    onClick={() => setQrCodeExpanded(true)}
                  >
                    <Image
                      src={merchant.qrCodeUrl}
                      alt={`${merchant.name} Payment QR Code`}
                      width={qrCodeExpanded ? 300 : 200}
                      height={qrCodeExpanded ? 300 : 200}
                      className="w-48 h-48 object-contain rounded-xl"
                    />
                  </div>
                  <p className="text-sm text-white/70 mt-3">
                    Scan this QR code to make a payment and earn cashback
                  </p>
                  <Button
                    variant="ghost-pill"
                    size="sm"
                    onClick={() => setQrCodeExpanded(true)}
                    className="mt-3"
                  >
                    View Full Size
                  </Button>
                </div>
              </Card>
            )}


            {/* Other Actions */}
            <Card variant="surface" className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="primary" className="w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                  </svg>
                  View Transaction History
                </Button>
                <Button variant="ghost-pill" className="w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share Merchant
                </Button>
              </div>
            </Card>

            {/* Stats Card */}
            <Card variant="surface" className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-sm text-white/70">Member Since</span>
                  <span className="text-sm font-medium text-white">
                    {new Date(merchant.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-sm text-white/70">Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${merchant.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className={`text-sm font-medium ${merchant.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {merchant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-sm text-white/70">Category</span>
                  <span className="text-sm font-medium text-white">
                    {merchant.category.replace('_', ' & ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        
      </div>

      {/* QR Code Modal */}
      {qrCodeExpanded && merchant.qrCodeUrl && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card variant="surface" className="p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white">Payment QR Code</h3>
              <button
                onClick={() => setQrCodeExpanded(false)}
                className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-center">
              <div className="bg-white p-4 rounded-2xl mb-4 mx-auto inline-block">
                <Image
                  src={merchant.qrCodeUrl}
                  alt={`${merchant.name} Payment QR Code`}
                  width={300}
                  height={300}
                  className="w-full max-w-xs mx-auto rounded-xl"
                />
              </div>
              <p className="text-sm text-white/70 mb-4">
                Scan with your wallet app to make a payment
              </p>
              <Button variant="ghost-pill" onClick={() => setQrCodeExpanded(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MerchantDetailPage;
