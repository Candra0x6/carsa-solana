'use client';

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import * as crypto from 'crypto';

import { ClientAnchorClient } from '@/lib/client-anchor';
import { convertTokenToReadableAmount } from '@/lib/token-convert';

interface PurchaseTransactionProps {
  merchantWalletAddress: string;
  merchantName?: string;
}

interface PurchaseResult {
  signature: string;
  transactionId: string;
  purchaseAmount: number;
  tokensAwarded?: number;
  tokensRedeemed?: number;
  databaseTransactionId?: string;
}

export default function PurchaseTransaction({ 
  merchantWalletAddress, 
  merchantName 
}: PurchaseTransactionProps) {
  const { wallet, publicKey, connected } = useWallet();
  const { connection } = useConnection();
  
  const [purchaseAmount, setPurchaseAmount] = useState<string>('');
  const [redeemTokenAmount, setRedeemTokenAmount] = useState<string>('');
  const [userTokenBalance, setUserTokenBalance] = useState<number>(0);
  const [tokenBalanceLoading, setTokenBalanceLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's LOKAL token balance when wallet connects
  React.useEffect(() => {
    const fetchTokenBalance = async () => {
      if (!connected || !wallet?.adapter || !publicKey) {
        setUserTokenBalance(0);
        return;
      }

      setTokenBalanceLoading(true);
      try {
        const client = new ClientAnchorClient({
          wallet: wallet.adapter as unknown as anchor.Wallet,
          connection
        });

        const balanceInfo = await client.getLokalTokenBalance();
        setUserTokenBalance(balanceInfo.balance);
      } catch (err) {
        console.error('Failed to fetch token balance:', err);
        setUserTokenBalance(0);
      } finally {
        setTokenBalanceLoading(false);
      }
    };

    fetchTokenBalance();
  }, [connected, wallet, publicKey, connection]);

  const handleProcessPurchase = async () => {
    if (!connected || !wallet?.adapter || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      setError('Please enter a valid purchase amount');
      return;
    }

    // Validate redeem token amount if provided
    if (redeemTokenAmount) {
      const redeemAmount = parseFloat(redeemTokenAmount);
      if (redeemAmount <= 0) {
        setError('Redemption token amount must be greater than 0');
        return;
      }
      
      // Check if user has enough tokens to redeem
      const userTokenBalanceReadable = userTokenBalance / Math.pow(10, 9);
      if (redeemAmount > userTokenBalanceReadable) {
        setError(`Insufficient token balance. You have ${userTokenBalanceReadable.toFixed(4)} LOKAL tokens available`);
        return;
      }
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

      // First, check if merchant exists on-chain
      const merchantOnChainData = await client.getMerchantDataByWallet(merchantWallet);
      if (!merchantOnChainData) {
        throw new Error('Merchant account not found on blockchain. Please ensure the merchant is registered.');
      }

      // Then fetch merchant database data to get the merchant ID
      const merchantApiResponse = await fetch(`/api/merchants/by-wallet/${merchantWalletAddress}`);
      if (!merchantApiResponse.ok) {
        throw new Error('Merchant not found in database. Please ensure the merchant is properly registered.');
      }
      
      const merchantApiData = await merchantApiResponse.json();
      if (!merchantApiData.success || !merchantApiData.data) {
        throw new Error('Unable to fetch merchant data from database.');
      }

      // Generate unique transaction ID
      const transactionId = crypto.randomBytes(32);
      
      // Convert purchase amount to lamports (assuming input is in IDR)
      const purchaseAmountLamports = Math.floor(parseFloat(purchaseAmount));
      
      // Convert redeem token amount to smallest token unit if provided
      const redeemTokenAmountLamports = redeemTokenAmount 
        ? Math.floor(parseFloat(redeemTokenAmount) * Math.pow(10, 9)) // Convert to token units with 9 decimals
        : undefined;
      
      console.log('Purchase Amount Lamports:', purchaseAmountLamports);
      console.log('Redeem Token Amount Lamports:', redeemTokenAmountLamports);
      
      // Process the purchase on-chain
      const signature = await client.processPurchase({
        merchantWalletAddress: merchantWalletAddress,
        purchaseAmount: purchaseAmountLamports,
        redeemTokenAmount: redeemTokenAmountLamports,
        transactionId: new Uint8Array(transactionId)
      });

      // Record the transaction in the database
      const apiResponse = await fetch('/api/anchor/process-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerWallet: publicKey.toString(),
          merchantId: merchantApiData.data.id, // Use the merchant ID from the database
          purchaseAmount: Math.floor(parseFloat(purchaseAmount) * 100), // Convert SOL to cents for fiat equivalent
          txSignature: signature,
          idempotencyKey: Buffer.from(transactionId).toString('hex') // Use transaction ID as idempotency key
        }),
      });

      const apiResult = await apiResponse.json();
      
      if (!apiResult.success) {
        throw new Error(`Database recording failed: ${apiResult.error}`);
      }

      setResult({
        signature,
        transactionId: Buffer.from(transactionId).toString('hex'),
        purchaseAmount: purchaseAmountLamports,
        tokensAwarded: apiResult.data?.tokensAwarded || 0,
        tokensRedeemed: redeemTokenAmountLamports || 0,
        databaseTransactionId: apiResult.data?.transactionId
      });

      // Reset form
      setPurchaseAmount('');
      setRedeemTokenAmount('');

      // Refresh token balance after successful transaction
      try {
        const client = new ClientAnchorClient({
          wallet: wallet.adapter as unknown as anchor.Wallet,
          connection
        });
        const balanceInfo = await client.getLokalTokenBalance();
        setUserTokenBalance(balanceInfo.balance);
      } catch (balanceErr) {
        console.error('Failed to refresh token balance:', balanceErr);
      }

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
    <div className="bg-white rounded-lg shadow-lg p-6 w-full mx-auto">
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
        <p className="text-sm text-blue-700">
          <strong>LOKAL Balance:</strong> {
            tokenBalanceLoading ? (
              <span className="inline-flex items-center">
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin mr-1" />
                Loading...
              </span>
            ) : (
              `${convertTokenToReadableAmount(userTokenBalance, 9)} LOKAL`
            )
          }
        </p>
      </div>

      {/* Purchase Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Purchase Amount (IDR) *
        </label>
        <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">Rp</span>

        <input
          type="number"
          step="1"
          min="1000"
          value={purchaseAmount}
          onChange={(e) => setPurchaseAmount(e.target.value)}
          placeholder="10000"
  className={`w-full pl-12 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 `}          disabled={isProcessing}
        />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Minimum: 1000 IDR
        </p>
      </div>

      {/* Redeem Token Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Redeem LOKAL Tokens (Optional)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">🪙</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            max={userTokenBalance / Math.pow(10, 9)}
            value={redeemTokenAmount}
            onChange={(e) => setRedeemTokenAmount(e.target.value)}
            placeholder="0.0000"
            className="w-full pl-12 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            disabled={isProcessing || tokenBalanceLoading || userTokenBalance === 0}
          />
          <button
            type="button"
            onClick={() => setRedeemTokenAmount((userTokenBalance / Math.pow(10, 9)).toString())}
            disabled={isProcessing || tokenBalanceLoading || userTokenBalance === 0}
            className="absolute right-2 top-1.5 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            MAX
          </button>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Use tokens to offset purchase cost</span>
          <span>
            Available: {(userTokenBalance / Math.pow(10, 9)).toFixed(4)} LOKAL
          </span>
        </div>
        {redeemTokenAmount && parseFloat(redeemTokenAmount) > 0 && (
          <div className="mt-2 p-2 bg-purple-50 rounded text-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-purple-800">
                <strong>Redeeming:</strong> {parseFloat(redeemTokenAmount).toFixed(4)} LOKAL
              </span>
              <span className="text-purple-600 text-xs">
                ~Rp {(parseFloat(redeemTokenAmount) * 1000).toLocaleString()}
              </span>
            </div>
            <div className="border-t border-purple-200 pt-1">
              <p className="text-purple-900 font-medium text-xs">
                Effective Purchase: Rp {Math.max(0, parseFloat(purchaseAmount || '0') - (parseFloat(redeemTokenAmount) * 1000)).toLocaleString()}
              </p>
            </div>
            <p className="text-purple-600 text-xs mt-1">
              You&apos;ll still earn rewards on the remaining amount after redemption
            </p>
          </div>
        )}
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
        ) : redeemTokenAmount && parseFloat(redeemTokenAmount) > 0 ? (
          `Process Purchase (${parseFloat(redeemTokenAmount).toFixed(4)} LOKAL Redeemed)`
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
                  <strong>Amount:</strong> {result.purchaseAmount } Rp
                </p>
                {result.tokensAwarded !== undefined && (
                  <p>
                    <strong>Tokens Awarded:</strong> {convertTokenToReadableAmount(result.tokensAwarded, 9)} LOKAL
                  </p>
                )}
                {result.tokensRedeemed && result.tokensRedeemed > 0 && (
                  <p>
                    <strong>Tokens Redeemed:</strong> {convertTokenToReadableAmount(result.tokensRedeemed, 9)} LOKAL
                  </p>
                )}
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
                {result.databaseTransactionId && (
                  <p>
                    <strong>Record ID:</strong>
                    <span className="font-mono text-xs ml-1">
                      {result.databaseTransactionId}
                    </span>
                  </p>
                )}
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
          <li>Enter the purchase amount in IDR</li>
          <li>Optionally, use your LOKAL tokens to offset the purchase cost</li>
          <li>Verify merchant exists on blockchain and in database</li>
          <li>Process purchase transaction on Solana blockchain</li>
          <li>If redeeming tokens, they are burned from your account</li>
          <li>Record transaction details in database for tracking</li>
          <li>New reward tokens are minted directly to your wallet</li>
          <li>Cashback rate is determined by merchant settings</li>
        </ol>
        <div className="mt-3 p-3 bg-purple-50 rounded border-l-4 border-purple-400">
          <h5 className="text-sm font-medium text-purple-900 mb-1">Token Redemption:</h5>
          <p className="text-xs text-purple-800">
            You can use your earned LOKAL tokens to reduce purchase costs. The redeemed tokens are 
            burned (permanently removed), but you&apos;ll still earn new reward tokens based on the 
            remaining purchase amount and merchant&apos;s cashback rate.
          </p>
        </div>
      </div>
    </div>
  );
}
