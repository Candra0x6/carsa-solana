'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useWallet } from '@solana/wallet-adapter-react';
import MerchantManagement from '@/components/MerchantManagement';
import { getMerchantService } from '@/lib/merchant-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Merchant, 
  MerchantUpdateResult,
  OperationState 
} from '@/types/merchant';
import MerchantRegistrationWrap from './MerchantRegistationWrap';
import QRCodeModal from './QRCodeModal';

interface MerchantDashboardProps {
  // In a real app, you might pass merchantId as a prop
  merchantId?: string;
}

type TabType = 'overview' | 'register' | 'manage' | 'purchases';

export default function MerchantDashboard({ }: MerchantDashboardProps) {
  const { data: session, status } = useSession();
  const { publicKey, connected } = useWallet();
  const [currentMerchant, setCurrentMerchant] = useState<Merchant | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loadingState, setLoadingState] = useState<OperationState<Merchant>>({
    status: 'idle'
  });

  // Load actual merchant data from blockchain and database
  useEffect(() => {
    const loadMerchantData = async () => {
      if (status === 'authenticated' && session?.user?.walletAddress) {
        setLoadingState({ status: 'loading' });
        
        try {
          const merchantService = getMerchantService();
          const merchantData = await merchantService.getMerchantByWallet(session.user.walletAddress);
          console.log('Loaded merchant data:', merchantData);
           
      
          if (merchantData) {
            // Convert MerchantData to Merchant type
            const merchant = {
              id: merchantData.id || '',
              name: merchantData.name,
              category: merchantData.category,
              cashbackRate: merchantData.cashbackRate / 100, // Convert from basis points to percentage
              email: merchantData.email,
              phone: merchantData.phone,
              addressLine1: merchantData.addressLine1 || '',
              city: merchantData.city || '',
              walletAddress: merchantData.walletAddress,
              merchantPDA: merchantData.merchantPDA,
              isActive: merchantData.isActive,
              createdAt: merchantData.createdAt || new Date().toISOString(),
              updatedAt: merchantData.updatedAt || new Date().toISOString(),
              qrCodeUrl: merchantData.qrCodeUrl || '',

            };
            
            setCurrentMerchant(merchant);
            setLoadingState({ status: 'success', data: merchant });
            setActiveTab('overview');
          } else {
            // No merchant found, show registration
            setLoadingState({ status: 'success' });
            setActiveTab('register');
          }
        } catch (error) {
          console.error('Error loading merchant data:', error);
          setLoadingState({ 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Failed to load merchant data'
          });
          setActiveTab('register');
        }
      } else if (connected && publicKey && !session?.user) {
        // User connected wallet but not authenticated with session
        setLoadingState({ status: 'success' });
        setActiveTab('register');
      }
    };

    loadMerchantData();
  }, [session, status, connected, publicKey]);

  const handleMerchantUpdate = (result: MerchantUpdateResult) => {
    // In a real app, you'd refetch the merchant data
    console.log('Merchant updated:', result);
    // For demo purposes, we'll just show a success message
  };

  console.log(currentMerchant)
  if (status === 'loading' || loadingState.status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900  flex items-center justify-center">
        <Card variant="surface" className="p-8 text-center">
          <div className="w-16 h-16 border-4 border-[#7c5aff] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-bold text-white mb-2">Loading Dashboard</h2>
          <p className="text-gray-300">Setting up your merchant dashboard...</p>
        </Card>
      </div>
    );
  }

  if (loadingState.status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card variant="surface" className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Error Loading Dashboard</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">{loadingState.error}</p>
          <Button 
            variant="primary"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card variant="surface" className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Authentication Required</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">Please sign in to access your merchant dashboard and manage your business.</p>
          <Button 
            variant="primary"
            onClick={() => window.location.href = '/auth/signin'}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pt-14 ">
      
      {/* Header */}
      <div className="">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Merchant <span className="bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="text-gray-300 text-lg">
                Manage your business on Carsa
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap gap-2 py-4" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z', disabled: !currentMerchant },
              { id: 'manage', name: 'Manage Account', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', disabled: !currentMerchant },
              { id: 'register', name: 'Register Merchant', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', disabled: !!currentMerchant },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id as TabType)}
                disabled={tab.disabled}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] text-white shadow-lg'
                    : tab.disabled
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white border border-white/20 hover:border-white/30'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && currentMerchant && (
          <div className="space-y-8">
            {/* Merchant Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card variant="surface" className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-300">Cashback Rate</p>
                    <p className="text-2xl font-bold text-white">{currentMerchant.cashbackRate}%</p>
                  </div>
                </div>
              </Card>

              <Card variant="surface" className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      currentMerchant.isActive ? 'bg-blue-500/20' : 'bg-red-500/20'
                    }`}>
                      <svg className={`w-6 h-6 ${currentMerchant.isActive ? 'text-blue-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-300">Status</p>
                    <p className={`text-2xl font-bold ${currentMerchant.isActive ? 'text-blue-400' : 'text-red-400'}`}>
                      {currentMerchant.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </Card>

              <Card variant="surface" className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-300">Category</p>
                    <p className="text-2xl font-bold text-white">{currentMerchant.category}</p>
                  </div>
                </div>
              </Card>

              {/* Blockchain Status Card */}
              <Card variant="surface" className="p-6 md:col-span-3">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1a2.995 2.995 0 00-.464-4.743 2.999 2.999 0 014.743.464l.112.128" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-white">Blockchain Status</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Wallet Address</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <span className="font-mono text-sm text-white break-all">
                      {currentMerchant.walletAddress}
                    </span>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Merchant PDA</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2L4.257 9.257a6 6 0 118.486-8.486L17 5" />
                      </svg>
                    </div>
                    <span className="font-mono text-sm text-white break-all">
                      {currentMerchant.merchantPDA}
                    </span>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Database ID</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                    <span className="font-mono text-sm text-white">{currentMerchant.id}</span>
                  </div>
                  
                  {currentMerchant.createdAt && (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300">Created Date</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-sm text-white">{new Date(currentMerchant.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* QR Code Section */}
            <Card variant="surface" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-white">QR Code for Payments</h4>
                </div>
                <QRCodeModal merchant={currentMerchant}>
                  <Button variant="primary" className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View & Download QR Code
                  </Button>
                </QRCodeModal>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Generate and download your merchant QR code for customer payments. You can download it as a PNG image or PDF document with merchant information and instructions.
              </p>
            </Card>
        
          </div>
        )}

        {activeTab === 'register' && !currentMerchant && (
          <MerchantRegistrationWrap />
        )}

        {activeTab === 'manage' && currentMerchant && (
          <div className="w-full mx-auto">
            <Card variant="surface" className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Account Management</h2>
              </div>
              <MerchantManagement 
                merchant={currentMerchant} 
                onUpdate={handleMerchantUpdate} 
              />
            </Card>
          </div>
        )}

      
      </div>
    </div>
  );
}
