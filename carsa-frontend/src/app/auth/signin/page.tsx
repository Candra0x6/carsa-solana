'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import bs58 from 'bs58';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'custodial' | 'wallet'>('custodial');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const { publicKey, signMessage } = useWallet();

  const handleCustodialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('custodial', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        action: isRegistering ? 'register' : 'login',
        redirect: false
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/merchant');
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletAuth = async () => {
    if (!publicKey || !signMessage) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create message to sign
      const message = `Sign this message to authenticate with Carsa.\n\nWallet: ${publicKey.toString()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);
      
      // Request signature from wallet
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      // Authenticate with backend
      const result = await signIn('wallet', {
        publicKey: publicKey.toString(),
        signature: signatureBase58,
        message: message,
        redirect: false
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Wallet auth error:', err);
      setError('Wallet authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Carsa
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose your authentication method
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-2 px-4 text-center font-medium text-sm ${
              activeTab === 'custodial'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('custodial')}
          >
            🔐 Custodial Wallet
          </button>
          <button
            className={`flex-1 py-2 px-4 text-center font-medium text-sm ${
              activeTab === 'wallet'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('wallet')}
          >
            👛 Your Wallet
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {activeTab === 'custodial' && (
          <form className="mt-8 space-y-6" onSubmit={handleCustodialAuth}>
            <div className="space-y-4">
              {isRegistering && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : (isRegistering ? 'Create Custodial Account' : 'Sign In')}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500 text-sm"
                onClick={() => setIsRegistering(!isRegistering)}
              >
                {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>💡 <strong>Custodial Wallet:</strong> We generate and manage a Solana wallet for you. Easy to use but we hold the keys.</p>
            </div>
          </form>
        )}

        {activeTab === 'wallet' && (
          <div className="mt-8 space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Connect your own Solana wallet to authenticate
              </p>
              
              <div className="mb-4">
                <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
              </div>

              {publicKey && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-600">Connected Wallet:</p>
                    <p className="font-mono text-sm text-gray-900 break-all">
                      {publicKey.toString()}
                    </p>
                  </div>

                  <button
                    onClick={handleWalletAuth}
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Signing Message...' : 'Sign Message to Authenticate'}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>💡 <strong>Your Wallet:</strong> Use your own Solana wallet (Phantom, Solflare, etc.). You control your keys.</p>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-gray-500">
          <p>🔒 Both methods support the same on-chain transactions and features</p>
        </div>
      </div>
    </div>
  );
}
