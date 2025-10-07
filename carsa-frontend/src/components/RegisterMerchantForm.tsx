import React, { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { ClientAnchorClient } from '@/lib/client-anchor';

interface RegisterMerchantFormProps {
  onSuccess?: (result: any) => void;
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
        wallet: wallet.adapter,
        connection
      });

      const [merchantPDA] = client.getMerchantPDA();
      const exists = await client.merchantExists();
      
      setMerchantStatus({
        exists,
        pda: merchantPDA.toString()
      });

      if (exists) {
        onError?.(`Merchant already exists for this wallet. PDA: ${merchantPDA.toString()}`);
      } else {
        onError?.(`No merchant found for this wallet. PDA that would be created: ${merchantPDA.toString()}`);
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
        wallet: wallet.adapter,
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
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Register as Merchant</h2>
        <p className="text-gray-600 mb-4">
          Connect your wallet to register as a merchant in the Carsa loyalty program.
        </p>
        <WalletMultiButton className="w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Register as Merchant</h2>
      
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800">
          Connected: {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your business name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MERCHANT_CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cashback Rate (%)
          </label>
          <input
            type="number"
            min="0"
            max="50"
            step="0.1"
            value={formData.cashbackRate / 100}
            onChange={(e) => handleInputChange('cashbackRate', parseFloat(e.target.value) * 100)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Current: {(formData.cashbackRate / 100).toFixed(1)}%
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+62..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address *
          </label>
          <input
            type="text"
            value={formData.addressLine1}
            onChange={(e) => handleInputChange('addressLine1', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Street address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="City"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={checkMerchantStatus}
            disabled={checking || loading}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? 'Checking...' : 'Check Merchant Status'}
          </button>

          <button
            onClick={handleRegister}
            disabled={loading || checking}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registering...' : 'Register Merchant'}
          </button>
        </div>

        {txSignature && (
          <div className="mt-4 p-3 bg-green-50 rounded">
            <p className="text-sm text-green-800">
              Transaction: 
              <a 
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs ml-1 underline"
              >
                {txSignature.slice(0, 8)}...{txSignature.slice(-8)}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
