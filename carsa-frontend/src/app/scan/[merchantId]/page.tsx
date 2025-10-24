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



const MerchantDetailPage: React.FC = () => {
  const params = useParams();
  const merchantId = params.merchantId as string;
  
  const [merchant, setMerchant] = useState<MerchantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    </div>
  );
};

export default MerchantDetailPage;
