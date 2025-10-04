'use client';

import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface TokenBalance {
  wallet: string;
  mint: string;
  associatedTokenAccount: string;
  balance: string;
  decimals: number;
  uiAmount: number | null;
  exists: boolean;
}

interface TokenBalanceDisplayProps {
  mintAddress: string;
  tokenName?: string;
  className?: string;
}

export const TokenBalanceDisplay: FC<TokenBalanceDisplayProps> = ({
  mintAddress,
  tokenName = 'Token',
  className = ''
}) => {
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/token/balance?wallet=${publicKey.toBase58()}&mint=${mintAddress}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setBalance(data.data);
      } else {
        setError(data.error || 'Failed to fetch balance');
      }
    } catch (err) {
      console.error('Error fetching token balance:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadBalance = async () => {
      if (!publicKey || !connected) {
        setBalance(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/token/balance?wallet=${publicKey.toBase58()}&mint=${mintAddress}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setBalance(data.data);
        } else {
          setError(data.error || 'Failed to fetch balance');
        }
      } catch (err) {
        console.error('Error fetching token balance:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadBalance();
  }, [publicKey, connected, mintAddress]);

  if (!connected) {
    return (
      <div className={`token-balance-display ${className}`}>
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">{tokenName} Balance</span>
            <span className="text-gray-500">Not Connected</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Connect your wallet to view balance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`token-balance-display ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-700">{tokenName} Balance</span>
          <button
            onClick={fetchBalance}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 transition-colors duration-200"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading && !balance && (
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            <span className="text-sm">Loading balance...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
            <p className="font-medium">Error loading balance:</p>
            <p>{error}</p>
          </div>
        )}

        {balance && !loading && (
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900">
              {balance.exists && balance.uiAmount !== null 
                ? balance.uiAmount.toLocaleString() 
                : '0'
              }
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <div>
                <span className="font-medium">Raw Balance:</span> {balance.balance}
              </div>
              <div>
                <span className="font-medium">Decimals:</span> {balance.decimals}
              </div>
              <div>
                <span className="font-medium">Account:</span>{' '}
                <span className="font-mono break-all">
                  {balance.associatedTokenAccount}
                </span>
              </div>
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  balance.exists 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {balance.exists ? 'Account Exists' : 'Account Not Created'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
