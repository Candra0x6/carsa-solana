'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { ClientAnchorClient } from '@/lib/client-anchor';
import Link from 'next/link';
import * as anchor from '@coral-xyz/anchor';

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
    <nav className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Carsa</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
              Home
            </Link>
            <Link href="/merchant" className="text-gray-600 hover:text-gray-900 transition-colors">
              Merchants
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
              Dashboard
            </Link>
          </div>

          {/* Wallet Connection Section */}
          <div className="flex items-center space-x-4">
            {connected && publicKey ? (
              <div className="flex items-center space-x-3">
                {/* LOKAL Balance Button */}
                <button
                  onClick={toggleBalanceDisplay}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-lg border border-purple-200 transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  ) : (
                    <span className="text-sm font-medium">💰</span>
                  )}
                  <span className="text-sm font-medium">
                    {loading ? 'Loading...' : 'LOKAL Balance'}
                  </span>
                </button>

                {/* Wallet Address (abbreviated) */}
                <div className="hidden sm:flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 font-mono">
                    {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                  </span>
                </div>

                {/* Disconnect Button */}
                <WalletDisconnectButton className="!bg-red-100 !text-red-700 hover:!bg-red-200 !border-red-200 !rounded-lg !px-3 !py-2 !text-sm !font-medium !transition-colors !duration-200" />
              </div>
            ) : (
              /* Connect Wallet Button */
              <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !font-semibold !px-4 !py-2 !text-white !transition-colors !duration-200" />
            )}
          </div>
        </div>

        {/* Balance Display Dropdown */}
        {connected && showBalance && (
          <div ref={dropdownRef} className="absolute right-4 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">LOKAL Token Balance</h3>
                <button
                  onClick={() => setShowBalance(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                  <button
                    onClick={refreshBalance}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              ) : balance ? (
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-600 font-medium">Balance</span>
                      <button
                        onClick={refreshBalance}
                        disabled={loading}
                        className="text-purple-600 hover:text-purple-800 text-sm disabled:opacity-50"
                      >
                        🔄
                      </button>
                    </div>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {balance.balance} LOKAL
                    </p>
                    <p className="text-sm text-purple-600 mt-1">
                      {balance.balanceNumber.toLocaleString()} tokens
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Account Status</span>
                      <span className={`font-medium ${balance.exists ? 'text-green-600' : 'text-yellow-600'}`}>
                        {balance.exists ? 'Active' : 'Not Created'}
                      </span>
                    </div>
                    {!balance.exists && (
                      <p className="text-xs text-gray-500 mt-1">
                        Token account will be created when you receive your first LOKAL tokens
                      </p>
                    )}
                  </div>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm">No balance data available</p>
                  <button
                    onClick={refreshBalance}
                    className="mt-2 text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    Load Balance
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
