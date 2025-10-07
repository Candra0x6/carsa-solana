'use client';

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import * as crypto from 'crypto';

import { ClientAnchorClient } from '@/lib/client-anchor';

interface PurchaseTransactionProps {
  merchantWalletAddress: string;
  merchantName?: string;
}

interface PurchaseResult {
  signature: string;
  transactionId: string;
  purchaseAmount: number;
}

export default function PurchaseTransaction({ 
  merchantWalletAddress, 
  merchantName 
}: PurchaseTransactionProps) {
  const { wallet, publicKey, connected } = useWallet();
  const { connection } = useConnection();
  
  const [purchaseAmount, setPurchaseAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessPurchase = async () => {
    if (!connected || !wallet?.adapter || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      setError('Please enter a valid purchase amount');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Validate merchant wallet address
      let merchantWallet: PublicKey;
      try {
        merchantWallet = new PublicKey(merchantWalletAddress);
      } catch {
        throw new Error('Invalid merchant wallet address');
      }

      // Create client
      const client = new ClientAnchorClient({
        wallet: wallet.adapter as unknown as anchor.Wallet, // The wallet adapter implements the required interface
        connection
      });

      // Check if merchant exists
      const merchantData = await client.getMerchantDataByWallet(merchantWallet);
      if (!merchantData) {
        throw new Error('Merchant account not found. Please ensure the merchant is registered.');
      }

      // Generate unique transaction ID
      const transactionId = crypto.randomBytes(32);
      
      // Convert purchase amount to lamports (assuming input is in SOL)
      const purchaseAmountLamports = Math.floor(parseFloat(purchaseAmount) * 1_000_000_000);

      // Process the purchase
      const signature = await client.processPurchase({
        merchantWalletAddress: merchantWalletAddress,
        purchaseAmount: purchaseAmountLamports,
        transactionId: new Uint8Array(transactionId)
      });

      setResult({
        signature,
        transactionId: Buffer.from(transactionId).toString('hex'),
        purchaseAmount: purchaseAmountLamports
      });

      // Reset form
      setPurchaseAmount('');

    } catch (err) {
      console.error('Purchase processing error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!connected) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Process Purchase</h2>
        <p className="text-gray-600 mb-4">
          Connect your wallet to process purchases and earn reward tokens.
        </p>
        <WalletMultiButton className="w-full" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">
        Process Purchase {merchantName && `- ${merchantName}`}
      </h2>

      {/* Connected Wallet Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Connected:</strong> {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
        </p>
        <p className="text-sm text-blue-600">
          <strong>Merchant:</strong> {merchantWalletAddress.slice(0, 8)}...{merchantWalletAddress.slice(-8)}
        </p>
      </div>

      {/* Purchase Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Purchase Amount (SOL)
        </label>
        <input
          type="number"
          step="0.001"
          min="0.001"
          value={purchaseAmount}
          onChange={(e) => setPurchaseAmount(e.target.value)}
          placeholder="0.1"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isProcessing}
        />
        <p className="text-xs text-gray-500 mt-1">
          Minimum: 0.001 SOL (~$0.02)
        </p>
      </div>

      {/* Process Button */}
      <button
        onClick={handleProcessPurchase}
        disabled={isProcessing || !purchaseAmount}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Processing...
          </div>
        ) : (
          'Process Purchase & Earn Tokens'
        )}
      </button>

      {/* Success Result */}
      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Purchase Successful!</h3>
              <div className="mt-2 text-sm text-green-700 space-y-1">
                <p>
                  <strong>Amount:</strong> {result.purchaseAmount / 1_000_000_000} SOL
                </p>
                <p>
                  <strong>Transaction ID:</strong> 
                  <span className="font-mono text-xs ml-1">
                    {result.transactionId.slice(0, 16)}...
                  </span>
                </p>
                <p>
                  <strong>Blockchain Tx:</strong>
                  <a 
                    href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs ml-1 underline hover:text-green-900"
                  >
                    {result.signature.slice(0, 8)}...{result.signature.slice(-8)}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Transaction Failed</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">How it works:</h4>
        <ol className="text-sm text-gray-700 space-y-1 ml-4 list-decimal">
          <li>Enter the purchase amount in SOL</li>
          <li>Transaction creates a purchase record on-chain</li>
          <li>Reward tokens are minted directly to your wallet</li>
          <li>Cashback rate is determined by merchant settings</li>
        </ol>
      </div>
    </div>
  );
}
