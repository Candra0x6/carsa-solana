'use client';

import React, { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SendTransactionError } from '@solana/web3.js';

import { ClientAnchorClient } from '@/lib/client-anchor';
import * as crypto from 'crypto';

interface PurchaseProcessorProps {
  merchantId: string;
  merchantName?: string;
  merchantWalletAddress?: string;
  onSuccess?: (result: PurchaseResult) => void;
}

interface PurchaseFormData {
  purchaseAmount: number;
}

interface PurchaseResult {
  transactionId: string;
  txSignature: string;
  tokensAwarded: number;
}

interface FormErrors {
  purchaseAmount?: string;
  general?: string;
}

type OperationState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

export default function PurchaseProcessor({ 
  merchantId, 
  merchantName, 
  merchantWalletAddress,
  onSuccess 
}: PurchaseProcessorProps) {
  const { wallet, publicKey, connected } = useWallet();
  const { connection } = useConnection();
  
  const [formData, setFormData] = useState<PurchaseFormData>({
    purchaseAmount: 0,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [operation, setOperation] = useState<OperationState<PurchaseResult>>({
    status: 'idle'
  });
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.purchaseAmount || formData.purchaseAmount <= 0) {
      newErrors.purchaseAmount = 'Purchase amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateUniqueTransactionId = (): Uint8Array => {
    // Create a more unique transaction ID by combining:
    // - Current timestamp (8 bytes)
    // - Random bytes (24 bytes)
    const timestamp = BigInt(Date.now());
    const timestampBuffer = new ArrayBuffer(8);
    const timestampView = new DataView(timestampBuffer);
    timestampView.setBigUint64(0, timestamp, true); // little-endian

    const randomBytes = crypto.randomBytes(24);
    const transactionId = new Uint8Array(32);
    
    // Copy timestamp bytes
    transactionId.set(new Uint8Array(timestampBuffer), 0);
    // Copy random bytes
    transactionId.set(randomBytes, 8);
    
    return transactionId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey || !wallet?.adapter) {
      setErrors({ general: 'Please connect your wallet first' });
      return;
    }

    if (!merchantWalletAddress) {
      setErrors({ general: 'Merchant wallet address is not available' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setOperation({ status: 'loading' });
    setTxSignature(null);
    setErrors({}); // Clear previous errors

    try {
      // 1. Create client and process the purchase on-chain
      if (!publicKey) {
        throw new Error('Wallet public key is not available');
      }
      
      const client = new ClientAnchorClient({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wallet: wallet.adapter as any, // Use wallet directly - it implements the required interface
        connection
      });

      // Generate a unique transaction ID with timestamp + random bytes
      const transactionId = generateUniqueTransactionId();

      // Convert IDR to lamports (simplified conversion - you might want to use an oracle)
      // For demo purposes, let's assume 1 IDR = 1000 lamports
      const purchaseAmountLamports = formData.purchaseAmount * 1000;

      console.log('Processing purchase:', {
        customerWallet: publicKey.toString(),
        merchantWallet: merchantWalletAddress,
        amount: purchaseAmountLamports,
        transactionId: Buffer.from(transactionId).toString('hex')
      });

      // Execute the Anchor transaction with better error handling
      let signature: string;
      try {
        signature = await client.processPurchase({
          merchantWalletAddress: merchantWalletAddress as string,
          purchaseAmount: purchaseAmountLamports,
          transactionId
        });
      } catch (error) {
        console.error('Anchor transaction error:', error);
        
        // Handle SendTransactionError specifically
        if (error instanceof SendTransactionError) {
          try {
            const logs = await error.getLogs(connection);
            console.log('Transaction logs:', logs);
          } catch (logError) {
            console.log('Could not retrieve transaction logs:', logError);
          }
          
          // Check if it's a duplicate transaction error
          if (error.message?.includes('already been processed')) {
            throw new Error('This transaction has already been processed. Please wait a moment before trying again.');
          }
        }
        
        // Re-throw the original error if it's not handled above
        throw error;
      }

      setTxSignature(signature);

      // 2. Call the backend API to record the transaction in database
      const idempotencyKey = new Uint8Array(32);
      crypto.getRandomValues(idempotencyKey);
      
      const response = await fetch('/api/anchor/process-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerWallet: publicKey.toString(),
          merchantId: merchantId,
          purchaseAmount: formData.purchaseAmount,
          txSignature: signature,
          idempotencyKey: Array.from(idempotencyKey)
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        const purchaseResult: PurchaseResult = {
          transactionId: result.data.transactionId,
          txSignature: signature,
          tokensAwarded: result.data.tokensAwarded || 0
        };

        setOperation({ 
          status: 'success', 
          data: purchaseResult 
        });
        
        // Reset form
        setFormData({
          purchaseAmount: 0,
        });
        
        onSuccess?.(purchaseResult);
      } else {
        setOperation({ 
          status: 'error', 
          error: result.error || 'Purchase processing failed' 
        });
      }

    } catch (error) {
      console.error('Purchase processing error:', error);
      
      let errorMessage = 'Transaction failed';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setOperation({ 
        status: 'error', 
        error: errorMessage
      });
    }
  };

  const handleInputChange = useCallback((field: keyof PurchaseFormData, value: string | number) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value 
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const formatTxSignature = (signature: string): string => {
    return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
  };

  const calculateTokens = (amount: number, rate: number = 5): number => {
    return Math.floor((amount * rate) / 100);
  };

  // Wallet connection check
  if (!connected) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Process Purchase {merchantName && `for ${merchantName}`}
        </h3>
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Connect your wallet to process purchases and earn cashback tokens.
          </p>
          <WalletMultiButton className="mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        Process Purchase {merchantName && `for ${merchantName}`}
      </h3>

      {/* Wallet Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800">
          Connected: {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Error */}
        {errors.general && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Purchase Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Amount (IDR) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">Rp</span>
            <input
              type="number"
              min="1"
              step="1"
              value={formData.purchaseAmount || ''}
              onChange={(e) => handleInputChange('purchaseAmount', parseInt(e.target.value) || 0)}
              className={`w-full pl-12 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.purchaseAmount ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="100000"
              disabled={operation.status === 'loading'}
            />
          </div>
          {errors.purchaseAmount && (
            <p className="mt-1 text-sm text-red-600">{errors.purchaseAmount}</p>
          )}
          
          {/* Token Calculation Preview */}
          {formData.purchaseAmount > 0 && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Estimated tokens to award:</span> {calculateTokens(formData.purchaseAmount)} CARSA
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Based on 5% cashback rate (actual rate determined by merchant settings)
              </p>
            </div>
          )}
        </div>

        {/* Transaction Preview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Transaction Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Merchant ID:</span>
              <span className="text-gray-900 font-mono">{merchantId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Purchase Amount:</span>
              <span className="text-gray-900">
                {formData.purchaseAmount ? `Rp ${formData.purchaseAmount.toLocaleString()}` : 'Rp 0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Customer Wallet:</span>
              <span className="text-gray-900 font-mono text-xs">
                {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
              </span>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {operation.status === 'success' && operation.data && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Purchase Processed Successfully!</h3>
                <div className="mt-2 text-sm text-green-700 space-y-1">
                  <p>
                    <span className="font-medium">Transaction ID:</span> 
                    <span className="font-mono ml-1">{operation.data.transactionId}</span>
                  </p>
                  <p>
                    <span className="font-medium">Blockchain Transaction:</span> 
                    <a 
                      href={`https://explorer.solana.com/tx/${operation.data.txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono ml-1 underline hover:text-green-900"
                    >
                      {formatTxSignature(operation.data.txSignature)}
                    </a>
                  </p>
                  <p>
                    <span className="font-medium">Tokens Awarded:</span> 
                    <span className="font-medium ml-1">{operation.data.tokensAwarded} CARSA</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {operation.status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Purchase Processing Failed</h3>
                <p className="mt-1 text-sm text-red-700">{operation.error}</p>
                {operation.error.includes('already been processed') && (
                  <p className="mt-2 text-xs text-red-600">
                    Tip: Wait a few seconds before trying again, or refresh the page to reset the transaction state.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={operation.status === 'loading' || !formData.purchaseAmount}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {operation.status === 'loading' ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </div>
            ) : (
              'Process Purchase'
            )}
          </button>
        </div>
      </form>

      {/* Transaction Info */}
      {txSignature && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            Transaction: 
            <a 
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs ml-1 underline"
            >
              {formatTxSignature(txSignature)}
            </a>
          </p>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">How to process a purchase:</h4>
        <ol className="text-sm text-yellow-700 space-y-1 ml-4 list-decimal">
          <li>Make sure your wallet is connected</li>
          <li>Enter the total purchase amount in Indonesian Rupiah (IDR)</li>
          <li>Click &quot;Process Purchase&quot; to complete the transaction</li>
          <li>You will receive cashback tokens in your connected wallet</li>
        </ol>
      </div>
    </div>
  );
}
