'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 pt-14">
      <div className="max-w-md w-full">
        <Card variant="surface" className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#7c5aff] to-[#6c47ff] rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">C</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to Carsa
            </h2>
            <p className="text-white/70">
              Choose your authentication method
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-white/5 rounded-[99px] p-1 mb-6">
            <button
              className={`flex-1 py-3 px-4 text-center font-medium text-sm rounded-[99px] transition-all ${
                activeTab === 'custodial'
                  ? 'bg-gradient-to-b from-[#7c5aff] to-[#6c47ff] text-white shadow-[inset_0px_1px_0px_rgba(255,255,255,0.16)]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              onClick={() => setActiveTab('custodial')}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Custodial
              </span>
            </button>
            <button
              className={`flex-1 py-3 px-4 text-center font-medium text-sm rounded-[99px] transition-all ${
                activeTab === 'wallet'
                  ? 'bg-gradient-to-b from-[#7c5aff] to-[#6c47ff] text-white shadow-[inset_0px_1px_0px_rgba(255,255,255,0.16)]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              onClick={() => setActiveTab('wallet')}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Your Wallet
              </span>
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {activeTab === 'custodial' && (
            <form className="space-y-6" onSubmit={handleCustodialAuth}>
              <div className="space-y-4">
                {isRegistering && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <Button 
                variant="primary" 
                size="lg"
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {isRegistering ? 'Create Custodial Account' : 'Sign In'}
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost-pill"
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="mt-4"
                >
                  {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
                </Button>
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-blue-300 font-medium text-sm mb-1">Custodial Wallet</p>
                    <p className="text-blue-200/80 text-xs leading-relaxed">
                      We generate and manage a Solana wallet for you. Easy to use but we hold the keys.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}

        {activeTab === 'wallet' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Connect Your Solana Wallet</h3>
              <p className="text-gray-300 leading-relaxed">
                Use your existing Solana wallet to sign in securely. You maintain full control of your private keys.
              </p>
            </div>

            <div className="flex justify-center mb-6">
              <WalletMultiButton className="!bg-gradient-to-r !from-[#7c5aff] !to-[#6c47ff] hover:!from-[#6c47ff] hover:!to-[#5c3aef] !border-0 !rounded-2xl !px-8 !py-4 !text-white !font-semibold !shadow-xl !transition-all !duration-300" />
            </div>

            {publicKey && (
              <div className="space-y-6">
                <div className="p-6 bg-green-500/10 rounded-2xl border border-green-500/20">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-green-300 font-semibold text-lg">Wallet Connected</span>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-xs mb-1">Connected Wallet:</p>
                    <p className="text-gray-200 font-mono text-sm break-all">
                      {publicKey.toString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleWalletAuth}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Signing Message...
                    </div>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Sign Message to Authenticate
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-yellow-300 font-medium text-sm mb-1">Your Wallet</p>
                  <p className="text-yellow-200/80 text-xs leading-relaxed">
                    Use your own Solana wallet (Phantom, Solflare, etc.). You control your keys.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        </Card>
        <div className="text-center p-4 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-gray-300 text-sm font-medium">
              Both methods support the same on-chain transactions and features
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
