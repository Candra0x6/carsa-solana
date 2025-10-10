import React, { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import { ClientAnchorClient } from '@/lib/client-anchor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import * as anchor from '@coral-xyz/anchor';

interface RegisterMerchantFormProps {
  onSuccess?: (result: unknown) => void;
  onError?: (error: string) => void;
}

interface MerchantFormData {
  name: string;
  category: string;
  cashbackRate: number;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
}

const MERCHANT_CATEGORIES = [
  'Restaurant',
  'Coffee Shop',
  'Retail',
  'Services',
  'Entertainment',
  'Health & Beauty',
  'Education',
  'Transportation',
  'Accommodation',
  'Other'
];

export const RegisterMerchantForm: React.FC<RegisterMerchantFormProps> = ({
  onSuccess,
  onError
}) => {
  const { wallet, publicKey, connected } = useWallet();
  const { connection } = useConnection();
  
  const [formData, setFormData] = useState<MerchantFormData>({
    name: '',
    category: 'Restaurant',
    cashbackRate: 500, // 5%
    email: '',
    phone: '',
    addressLine1: '',
    city: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [merchantStatus, setMerchantStatus] = useState<{
    exists: boolean;
    pda: string;
  } | null>(null);

  const handleInputChange = useCallback((
    field: keyof MerchantFormData,
    value: string | number
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const checkMerchantStatus = async () => {
    if (!connected || !publicKey || !wallet?.adapter) {
      onError?.('Please connect your wallet first');
      return;
    }

    setChecking(true);
    try {
      const client = new ClientAnchorClient({
        wallet: wallet.adapter as unknown as anchor.Wallet,
        connection
      });

      const [merchantPDA] = client.getMerchantPDA();
      const exists = await client.merchantExists();
      
      setMerchantStatus({
        exists,
        pda: merchantPDA.toString()
      });

      if (exists) {
        onError?.(`Merchant already exists for this wallet.`);
      } else {
        onError?.(`Wallet is available for merchant registration.`);
      }
    } catch (error) {
      console.error('Error checking merchant status:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to check status');
    } finally {
      setChecking(false);
    }
  };

  const handleRegister = async () => {
    if (!connected || !publicKey || !wallet?.adapter) {
      onError?.('Please connect your wallet first');
      return;
    }

    if (!formData.name || !formData.addressLine1 || !formData.city) {
      onError?.('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setTxSignature(null);

    try {
      // 1. Create client and check if merchant already exists
      const client = new ClientAnchorClient({

        wallet: wallet.adapter as unknown as anchor.Wallet,
        connection
      });

      // Get and log the PDA that will be used
      const [merchantPDA] = client.getMerchantPDA();
      console.log('Merchant PDA that will be created:', merchantPDA.toString());
      console.log('Connected wallet:', publicKey.toString());

      // Check if merchant already exists
      const exists = await client.merchantExists();
      if (exists) {
        onError?.(`A merchant account already exists for this wallet (${publicKey.toString().slice(0, 8)}...${publicKey.toString().slice(-8)}). Please use a different wallet or check if you've already registered.`);
        return;
      }

      // 2. Execute the Anchor transaction
      const signature = await client.registerMerchant({
        name: formData.name,
        category: formData.category,
        cashbackRate: formData.cashbackRate
      });

      setTxSignature(signature);

      // 2. Call the backend API to store in database and generate QR code
      const response = await fetch('/api/anchor/register-merchant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          walletAddress: publicKey.toString(),
          txSignature: signature
        })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess?.(result.data);
      } else {
        onError?.(result.error || 'Registration failed');
      }

    } catch (error) {
      console.error('Registration error:', error);
      onError?.(error instanceof Error ? error.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card variant="surface" className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#7c5aff]/20 to-[#6c47ff]/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#7c5aff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Register as Merchant</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            Connect your wallet to register as a merchant in the Carsa loyalty program and start earning from customer transactions.
          </p>
          <WalletMultiButton className="!bg-gradient-to-r !from-[#7c5aff] !to-[#6c47ff] hover:!from-[#6c47ff] hover:!to-[#5c3aef] !border-0 !rounded-2xl !px-8 !py-4 !text-white !font-semibold !shadow-xl !transition-all !duration-300 !w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className=" bg-transparent">
      <div className="w-full mx-auto">
        

        <Card variant="surface" className="p-8">
          <div className="mb-6 p-4 bg-green-500/10 rounded-2xl border border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-green-300 font-medium text-sm">Wallet Connected</p>
                <p className="text-green-200/80 text-sm font-mono">
                  {publicKey?.toString().slice(0, 12)}...{publicKey?.toString().slice(-12)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Business Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <div className="w-6 h-6 bg-[#7c5aff]/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-[#7c5aff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                Business Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                >
                  {MERCHANT_CATEGORIES.map(category => (
                    <option key={category} value={category} className="bg-gray-800 text-white">{category}</option>
                  ))}
                </select>
              </div>

        
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                Contact Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                    placeholder="+62 812 3456 7890"
                  />
                </div>
              </div>
            </div>

            {/* Location Information Section */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <div className="w-6 h-6 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                Business Location
              </h3>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                  placeholder="Jl. Sudirman No. 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                  placeholder="Jakarta"
                />
              </div>
            </div>

            {/* Merchant Status Display */}
            {merchantStatus && (
              <div className="pt-6 border-t border-white/10">
                <div className={`p-4 rounded-2xl border ${merchantStatus.exists 
                  ? 'bg-yellow-500/10 border-yellow-500/20' 
                  : 'bg-green-500/10 border-green-500/20'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      merchantStatus.exists ? 'bg-yellow-500/20' : 'bg-green-500/20'
                    }`}>
                      <svg className={`w-4 h-4 ${merchantStatus.exists ? 'text-yellow-400' : 'text-green-400'}`} 
                           fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {merchantStatus.exists ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        )}
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm mb-1 ${
                        merchantStatus.exists ? 'text-yellow-300' : 'text-green-300'
                      }`}>
                        {merchantStatus.exists ? 'Merchant Already Exists' : 'Ready for Registration'}
                      </p>
                      <p className={`text-xs font-mono break-all ${
                        merchantStatus.exists ? 'text-yellow-200/80' : 'text-green-200/80'
                      }`}>
                        PDA: {merchantStatus.pda}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <Button
                variant="ghost-pill"
                onClick={checkMerchantStatus}
                disabled={checking || loading}
                className="w-full"
              >
                {checking ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Checking Status...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Check Merchant Status
                  </>
                )}
              </Button>

              <Button
                variant="primary"
                onClick={handleRegister}
                disabled={loading || checking}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Registering Merchant...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Register as Merchant
                  </>
                )}
              </Button>
            </div>

            {/* Transaction Success Display */}
            {txSignature && (
              <div className="mt-6 p-4 bg-green-500/10 rounded-2xl border border-green-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-green-300 font-medium text-sm mb-1">Transaction Successful</p>
                    <a 
                      href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-200/80 text-xs font-mono hover:text-green-200 transition-colors break-all"
                    >
                      {txSignature}
                    </a>
                    <p className="text-green-200/60 text-xs mt-1">Click to view on Solana Explorer</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
