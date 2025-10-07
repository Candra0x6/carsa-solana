'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useWallet } from '@solana/wallet-adapter-react';
import MerchantRegistration from '@/components/MerchantRegistration';
import MerchantManagement from '@/components/MerchantManagement';
import PurchaseProcessor from '@/components/PurchaseProcessor';
import { getMerchantService, MerchantData } from '@/lib/merchant-service';
import { 
  Merchant, 
  MerchantRegistrationResult, 
  MerchantUpdateResult, 
  PurchaseResult,
  OperationState 
} from '@/types/merchant';

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
          
          if (merchantData) {
            // Convert MerchantData to Merchant type
            const merchant: Merchant = {
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

  const handleRegistrationSuccess = async (result: MerchantRegistrationResult) => {
    // Refresh merchant data after successful registration
    try {
      const walletAddress = session?.user?.walletAddress || publicKey?.toString();
      if (!walletAddress) return;
      
      const merchantService = getMerchantService();
      const merchantData = await merchantService.getMerchantByWallet(walletAddress);
      
      if (merchantData) {
        const merchant: Merchant = {
          id: merchantData.id || result.id,
          name: merchantData.name,
          category: merchantData.category,
          cashbackRate: merchantData.cashbackRate / 100,
          email: merchantData.email,
          phone: merchantData.phone,
          addressLine1: merchantData.addressLine1 || '',
          city: merchantData.city || '',
          walletAddress: merchantData.walletAddress,
          merchantPDA: merchantData.merchantPDA,
          isActive: merchantData.isActive,
          createdAt: merchantData.createdAt || new Date().toISOString(),
          updatedAt: merchantData.updatedAt || new Date().toISOString(),
        };
        
        setCurrentMerchant(merchant);
        setActiveTab('overview');
      }
    } catch (error) {
      console.error('Error refreshing merchant data after registration:', error);
      // Still switch to overview even if refresh fails
      setActiveTab('overview');
    }
  };

  const handleMerchantUpdate = (result: MerchantUpdateResult) => {
    // In a real app, you'd refetch the merchant data
    console.log('Merchant updated:', result);
    // For demo purposes, we'll just show a success message
  };

  const handlePurchaseSuccess = (result: PurchaseResult) => {
    // Handle successful purchase processing
    console.log('Purchase processed:', result);
    // In a real app, you might update transaction history or show notifications
  };

  if (status === 'loading' || loadingState.status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading merchant dashboard...</p>
        </div>
      </div>
    );
  }

  if (loadingState.status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{loadingState.error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the merchant dashboard.</p>
          <button 
            onClick={() => window.location.href = '/auth/signin'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
              <p className="text-gray-600">
                {currentMerchant ? `Managing ${currentMerchant.name}` : 'Manage your business on Carsa'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {session?.user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{session.user.email}</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {session.user.walletAddress?.slice(0, 8)}...{session.user.walletAddress?.slice(-8)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', disabled: !currentMerchant },
              { id: 'register', name: 'Register Merchant', disabled: !!currentMerchant },
              { id: 'manage', name: 'Manage Account', disabled: !currentMerchant },
              { id: 'purchases', name: 'Process Purchases', disabled: !currentMerchant },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id as TabType)}
                disabled={tab.disabled}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : tab.disabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && currentMerchant && (
          <div className="space-y-6">
            {/* Merchant Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Cashback Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">{currentMerchant.cashbackRate}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {currentMerchant.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Category</p>
                    <p className="text-2xl font-semibold text-gray-900">{currentMerchant.category}</p>
                  </div>
                </div>
              </div>

              {/* Blockchain Status Card */}
              <div className="bg-white rounded-lg shadow p-6 md:col-span-3">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Blockchain Status</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Wallet Address:</span>
                    <span className="font-mono text-sm">
                      {currentMerchant.walletAddress.slice(0, 8)}...{currentMerchant.walletAddress.slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Merchant PDA:</span>
                    <span className="font-mono text-sm">
                      {currentMerchant.merchantPDA.slice(0, 8)}...{currentMerchant.merchantPDA.slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Database ID:</span>
                    <span className="font-mono text-sm">{currentMerchant.id}</span>
                  </div>
                  {currentMerchant.createdAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Created:</span>
                      <span className="text-sm">{new Date(currentMerchant.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('purchases')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900">Process New Purchase</p>
                    <p className="text-xs text-gray-500">Award cashback tokens to customers</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('manage')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900">Update Account Settings</p>
                    <p className="text-xs text-gray-500">Modify cashback rate and status</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Merchant Details */}
            <MerchantManagement 
              merchant={currentMerchant} 
              onUpdate={handleMerchantUpdate} 
            />
          </div>
        )}

        {activeTab === 'register' && !currentMerchant && (
          <MerchantRegistration 
            onSuccess={handleRegistrationSuccess}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {activeTab === 'manage' && currentMerchant && (
          <MerchantManagement 
            merchant={currentMerchant} 
            onUpdate={handleMerchantUpdate} 
          />
        )}

       
      </div>
    </div>
  );
}
