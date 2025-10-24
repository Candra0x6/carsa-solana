'use client';

import React, { useState, useEffect } from 'react';

interface PoolStateInfo {
  totalStaked: number;
  lastYieldUpdate: number;
  totalYieldEarned: number;
  secondsElapsed: number;
  hoursElapsed: number;
  calculatedYield: number;
  needsUpdate: boolean;
}

interface ApiResponse {
  success: boolean;
  poolState?: PoolStateInfo;
  transaction?: string;
  yieldRecorded?: number;
  message?: string;
  error?: string;
}

export default function YieldAdminPanel() {
  const [poolState, setPoolState] = useState<PoolStateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch pool state
  const fetchPoolState = async () => {
    try {
      const response = await fetch('/api/record-yield');
      const data: ApiResponse = await response.json();
      
      if (data.success && data.poolState) {
        setPoolState(data.poolState);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch pool state');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pool state');
    }
  };

  // Trigger yield recording
  const recordYield = async (force: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/record-yield', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey && { 'x-admin-key': adminKey }),
        },
        body: JSON.stringify({ force }),
      });
      
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setLastTransaction(data.transaction || null);
        if (data.poolState) {
          setPoolState(data.poolState);
        }
        // Refresh after 3 seconds to get updated state
        setTimeout(fetchPoolState, 3000);
      } else {
        setError(data.error || data.message || 'Failed to record yield');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record yield');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchPoolState();
    
    if (autoRefresh) {
      const interval = setInterval(fetchPoolState, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Yield Recording Admin</h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={() => fetchPoolState()}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Admin Key Input */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admin Key (optional)
          </label>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter admin key to enable manual recording"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pool State Display */}
      {poolState && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Pool State</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Staked */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Total Staked</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatNumber(poolState.totalStaked)} LOKAL
              </div>
            </div>

            {/* Total Yield Earned */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Total Yield Earned</div>
              <div className="text-2xl font-bold text-green-900">
                {formatNumber(poolState.totalYieldEarned)} LOKAL
              </div>
            </div>

            {/* Last Update */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Last Yield Update</div>
              <div className="text-lg font-semibold text-purple-900">
                {formatDate(poolState.lastYieldUpdate)}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {poolState.hoursElapsed.toFixed(2)} hours ago
              </div>
            </div>

            {/* Calculated Yield */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-yellow-600 font-medium">Calculated Yield</div>
              <div className="text-2xl font-bold text-yellow-900">
                {formatNumber(poolState.calculatedYield)} LOKAL
              </div>
              <div className="text-xs text-yellow-600 mt-1">
                Since last update
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              {poolState.needsUpdate ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Ready for yield update
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-full font-medium">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Waiting for interval
                </span>
              )}
            </div>

            <div className="text-sm text-gray-600">
              {poolState.needsUpdate 
                ? '✅ Can record yield now'
                : `⏳ ${(6 - poolState.hoursElapsed).toFixed(2)} hours remaining`
              }
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        
        <div className="space-y-4">
          {/* Normal Record */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Record Yield</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Record yield if enough time has elapsed (6+ hours)
                </p>
              </div>
              <button
                onClick={() => recordYield(false)}
                disabled={loading || !adminKey || !poolState?.needsUpdate}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Recording...' : '🚀 Record Yield'}
              </button>
            </div>
            {!adminKey && (
              <div className="mt-2 text-xs text-red-600">
                ⚠️ Admin key required
              </div>
            )}
            {adminKey && poolState && !poolState.needsUpdate && (
              <div className="mt-2 text-xs text-yellow-600">
                ⏳ Not enough time elapsed yet
              </div>
            )}
          </div>

          {/* Force Record (Testing) */}
          <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">Force Record (Testing)</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Record yield regardless of time elapsed. Use only for testing!
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Force record yield? This should only be used for testing.')) {
                    recordYield(true);
                  }
                }}
                disabled={loading || !adminKey}
                className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Recording...' : '⚡ Force Record'}
              </button>
            </div>
            {!adminKey && (
              <div className="mt-2 text-xs text-red-600">
                ⚠️ Admin key required
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last Transaction */}
      {lastTransaction && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">✅ Yield Recorded Successfully</h3>
          <div className="text-sm">
            <span className="text-green-700">Transaction: </span>
            <a
              href={`https://explorer.solana.com/tx/${lastTransaction}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-mono"
            >
              {lastTransaction.slice(0, 8)}...{lastTransaction.slice(-8)}
            </a>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Information</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Yield is automatically recorded every 6 hours by the backend service</li>
          <li>• This panel allows manual triggering for testing and monitoring</li>
          <li>• APY: 12% (1200 basis points)</li>
          <li>• Interval: 6 hours</li>
          <li>• Formula: yield = (staked × APY × time) / (seconds_per_year × 10000)</li>
        </ul>
      </div>

      {/* Service Status */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">🔧 Backend Service</h3>
        <p className="text-sm text-gray-600">
          The automated yield recording service should be running on your server.
          To check status:
        </p>
        <div className="mt-2 bg-gray-900 text-gray-100 rounded p-3 font-mono text-xs overflow-x-auto">
          <div>sudo systemctl status yield-recorder</div>
          <div className="text-gray-500"># or</div>
          <div>tail -f carsa-contracts/yield-recorder.log</div>
        </div>
      </div>
    </div>
  );
}
