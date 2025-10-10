'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton, BaseWalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ClientAnchorClient } from '@/lib/client-anchor';
import Link from 'next/link';
import * as anchor from '@coral-xyz/anchor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Image from 'next/image';

interface NavbarProps {
  className?: string;
}

export const Navbar: FC<NavbarProps> = ({ className = '' }) => {
  const { publicKey, connected, wallet } = useWallet();
  const [balance, setBalance] = useState<{ balance: string; balanceNumber: number; exists: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {disconnect, connect} = useWallet()
  // Fetch LOKAL token balance when wallet is connected
  const fetchBalance = useCallback(async () => {
    if (!connected || !publicKey || !wallet) {
      setBalance(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = new ClientAnchorClient({ 
        wallet: wallet.adapter as unknown as anchor.Wallet 
      });
      const balanceInfo = await client.getFormattedLokalBalance();
      setBalance(balanceInfo);
    } catch (err) {
      console.error('Error fetching LOKAL balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, wallet]);

  // Fetch balance when wallet connection changes
  useEffect(() => {
    if (connected && wallet) {
      fetchBalance();
    } else {
      setBalance(null);
      setShowBalance(false);
    }
  }, [connected, publicKey, wallet, fetchBalance]);

  const toggleBalanceDisplay = () => {
    if (!showBalance && balance === null && !loading) {
      fetchBalance();
    }
    setShowBalance(!showBalance);
  };

  const refreshBalance = () => {
    fetchBalance();
  };

  // Handle click outside to close balance dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBalance(false);
      }
    };

    if (showBalance) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBalance]);

  return (
    <nav className={` fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 rounded-[99px] backdrop-blur-2xl">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <Image src={"/carsa.png"} alt="Carsa Logo" width={40} height={40} className='rounded-xl' />
              <span className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">Carsa</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link 
              href="/" 
              className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 font-medium"
            >
              Home
            </Link>
            <Link 
              href="/merchants" 
              className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 font-medium"
            >
              Merchants
            </Link>
            <Link 
              href="/scanner" 
              className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 font-medium"
            >
              Scanner
            </Link>
            <Link 
              href="/dashboard" 
              className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 font-medium"
            >
              Dashboard
            </Link>
          </div>

          {/* Wallet Connection Section */}
          <div className="flex items-center gap-3">
            {connected && publicKey ? (
              <div className="flex items-center gap-3">
                {/* LOKAL Balance Button */}
                <button
                  onClick={toggleBalanceDisplay}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all duration-200 disabled:opacity-50 group"
                >
                  {loading ? (
                    <svg className="w-4 h-4 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  ) : (
                    <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3"/>
                      </svg>
                    </div>
                  )}
                  <span className="text-sm font-medium">
                    {loading ? 'Loading...' : 'LOKAL'}
                  </span>
                  <svg className="w-3 h-3 text-white/60 group-hover:text-white/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

            
                                <WalletMultiButton />

              </div>
            ) : (
              /* Connect Wallet Button */
              <div className="flex items-center gap-2">
                <WalletMultiButton />
                
                {/* Hidden wallet button for functionality */}
                <div className="hidden">
                  <WalletMultiButton />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Balance Display Dropdown */}
        {connected && showBalance && (
          <div ref={dropdownRef} className="absolute right-4 top-full mt-2 w-80 z-50">
            <Card variant="surface" className="p-6 shadow-2xl shadow-black/50 border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">LOKAL Balance</h3>
                </div>
                <Button
                  onClick={() => setShowBalance(false)}
                  variant="ghost-pill"
                  className="!p-2 !min-w-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              {error ? (
                <div className="p-4 bg-red-500/10 border border-red-400/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-red-300 text-sm">{error}</p>
                      <Button
                        onClick={refreshBalance}
                        variant="ghost-pill"
                        className="mt-2 !text-red-300 !border-red-400/20 hover:!bg-red-500/20"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              ) : balance ? (
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-300 font-medium">Current Balance</span>
                      <Button
                        onClick={refreshBalance}
                        disabled={loading}
                        variant="ghost-pill"
                        className="!p-2 !min-w-0"
                      >
                        {loading ? (
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </Button>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">
                      {balance.balance} LOKAL
                    </p>
                    <p className="text-sm text-gray-400">
                      {balance.balanceNumber.toLocaleString()} tokens
                    </p>
                  </div>
                  
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">Account Status</span>
                      <span className={`font-medium flex items-center gap-1 ${
                        balance.exists ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          balance.exists ? 'bg-green-400' : 'bg-yellow-400'
                        }`} />
                        {balance.exists ? 'Active' : 'Not Created'}
                      </span>
                    </div>
                    {!balance.exists && (
                      <p className="text-xs text-gray-400 mt-2">
                        Token account will be created when you receive your first LOKAL tokens
                      </p>
                    )}
                  </div>
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <svg className="w-8 h-8 animate-spin text-purple-400 mb-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <p className="text-gray-400 text-sm">Loading balance...</p>
                </div>
              ) : (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-300 text-sm mb-3">No balance data available</p>
                  <Button
                    onClick={refreshBalance}
                    variant="ghost-pill"
                  >
                    Load Balance
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </nav>
  );
};
