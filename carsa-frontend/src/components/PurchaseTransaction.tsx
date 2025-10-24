'use client';

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import * as crypto from 'crypto';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
      const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/anchor/process-purchase`, {
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
      <Card variant="surface" className="p-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#7c5aff] to-[#6c47ff] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-white/70 mb-6 leading-relaxed">
            Connect your Solana wallet to process purchases and start earning reward tokens.
          </p>
          <div className="wallet-adapter-button-trigger-wrapper">
            <WalletMultiButton className="!bg-gradient-to-b !from-[#7c5aff] !to-[#6c47ff] !rounded-[99px] !text-white !text-sm !font-medium !shadow-[inset_0px_1px_0px_rgba(255,255,255,0.16),0px_1px_2px_rgba(0,0,0,0.20)] hover:!from-[#8f71ff] hover:!to-[#7c5aff] !transition-all !w-full !h-11 !px-6" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c5aff] to-[#6c47ff] flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Process Purchase</h3>
          {merchantName && (
            <p className="text-sm text-white/70">at {merchantName}</p>
          )}
        </div>
      </div>

      {/* Connected Wallet Info */}
      <Card variant="surface" className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Connected Wallet</p>
              <p className="text-sm font-mono text-white">
                {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Merchant</p>
              <p className="text-sm font-mono text-white">
                {merchantWalletAddress.slice(0, 8)}...{merchantWalletAddress.slice(-8)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">LOKAL Balance</p>
              <p className="text-sm font-medium text-white">
                {tokenBalanceLoading ? (
                  <span className="inline-flex items-center">
                    <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin mr-1" />
                    Loading...
                  </span>
                ) : (
                  `${convertTokenToReadableAmount(userTokenBalance, 9)} LOKAL`
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Purchase Amount Input */}
      <Card variant="surface" className="p-4 mb-6">
        <label className="block text-sm font-medium text-white mb-3">
          Purchase Amount (IDR) *
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 font-medium">Rp</span>
          <input
            type="number"
            step="1"
            min="1000"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(e.target.value)}
            placeholder="10,000"
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
            disabled={isProcessing}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          <p className="text-xs text-white/60">
            Minimum purchase: Rp 1,000
          </p>
        </div>
      </Card>

      {/* Redeem Token Amount Input */}
      <Card variant="surface" className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🪙</span>
          <label className="text-sm font-medium text-white">
            Redeem LOKAL Tokens (Optional)
          </label>
        </div>
        <div className="relative">
          <input
            type="number"
            step="0.0001"
            min="0"
            max={userTokenBalance / Math.pow(10, 9)}
            value={redeemTokenAmount}
            onChange={(e) => setRedeemTokenAmount(e.target.value)}
            placeholder="0.0000"
            className="w-full pl-4 pr-16 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            disabled={isProcessing || tokenBalanceLoading || userTokenBalance === 0}
          />
          <button
            type="button"
            onClick={() => setRedeemTokenAmount((userTokenBalance / Math.pow(10, 9)).toString())}
            disabled={isProcessing || tokenBalanceLoading || userTokenBalance === 0}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-[99px] hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-purple-500/30"
          >
            MAX
          </button>
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400"></div>
            <span className="text-xs text-white/60">Use tokens to offset purchase cost</span>
          </div>
          <span className="text-xs text-purple-300">
            Available: {(userTokenBalance / Math.pow(10, 9)).toFixed(4)} LOKAL
          </span>
        </div>
        
        {redeemTokenAmount && parseFloat(redeemTokenAmount) > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl border border-purple-500/20">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-medium text-purple-300">
                  Redeeming: {parseFloat(redeemTokenAmount).toFixed(4)} LOKAL
                </p>
                <p className="text-xs text-purple-400/80">
                  ~Rp {(parseFloat(redeemTokenAmount) * 1000).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="border-t border-purple-500/20 pt-3">
              <p className="text-sm font-medium text-white mb-2">
                Effective Purchase: Rp {Math.max(0, parseFloat(purchaseAmount || '0') - (parseFloat(redeemTokenAmount) * 1000)).toLocaleString()}
              </p>
              <p className="text-xs text-purple-300/80 leading-relaxed">
                You&apos;ll still earn rewards on the remaining amount after redemption
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Process Button */}
      <Button 
        variant="primary" 
        size="lg"
        onClick={handleProcessPurchase}
        disabled={isProcessing || !purchaseAmount}
        className="w-full mb-6"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Processing Transaction...
          </div>
        ) : redeemTokenAmount && parseFloat(redeemTokenAmount) > 0 ? (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Process Purchase ({parseFloat(redeemTokenAmount).toFixed(4)} LOKAL Redeemed)
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Process Purchase & Earn Tokens
          </>
        )}
      </Button>

      {/* Success Result */}
      {result && (
        <Card variant="surface" className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30 shrink-0">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                Purchase Successful!
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs">
                  ✓
                </span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-xs text-white/60 uppercase tracking-wide mb-1">Purchase Amount</p>
                  <p className="text-white font-medium">Rp {result.purchaseAmount.toLocaleString()}</p>
                </div>
                
                {result.tokensAwarded !== undefined && (
                  <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                    <p className="text-xs text-green-300/80 uppercase tracking-wide mb-1">Tokens Awarded</p>
                    <p className="text-green-300 font-medium">{convertTokenToReadableAmount(result.tokensAwarded, 9)} LOKAL</p>
                  </div>
                )}
                
                {result.tokensRedeemed && result.tokensRedeemed > 0 && (
                  <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                    <p className="text-xs text-purple-300/80 uppercase tracking-wide mb-1">Tokens Redeemed</p>
                    <p className="text-purple-300 font-medium">{convertTokenToReadableAmount(result.tokensRedeemed, 9)} LOKAL</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">Transaction ID:</span>
                  <code className="text-xs font-mono bg-black/30 px-2 py-1 rounded text-white/80">
                    {result.transactionId.slice(0, 16)}...
                  </code>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">Blockchain Tx:</span>
                  <a 
                    href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono bg-black/30 px-2 py-1 rounded text-[#7c5aff] hover:text-[#8f71ff] transition-colors underline"
                  >
                    {result.signature.slice(0, 8)}...{result.signature.slice(-8)}
                  </a>
                </div>
                
                {result.databaseTransactionId && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/70">Record ID:</span>
                    <code className="text-xs font-mono bg-black/30 px-2 py-1 rounded text-white/80">
                      {result.databaseTransactionId}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card variant="surface" className="p-4 mb-6 border border-red-500/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-400 mb-2">Transaction Failed</h3>
              <p className="text-sm text-red-300/90 leading-relaxed">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* How It Works */}
      <Card variant="surface" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-white">How it works</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[
            "Enter the purchase amount in IDR",
            "Optionally, use your LOKAL tokens to offset the purchase cost", 
            "Verify merchant exists on blockchain and in database",
            "Process purchase transaction on Solana blockchain",
            "If redeeming tokens, they are burned from your account",
            "Record transaction details in database for tracking",
            "New reward tokens are minted directly to your wallet",
            "Cashback rate is determined by merchant settings"
          ].map((step, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7c5aff] to-[#6c47ff] flex items-center justify-center shrink-0 text-white text-xs font-bold">
                {index + 1}
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl border border-purple-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <span className="text-purple-300 text-lg">🪙</span>
            </div>
            <div>
              <h5 className="text-sm font-medium text-purple-300 mb-2">Token Redemption:</h5>
              <p className="text-xs text-purple-200/90 leading-relaxed">
                You can use your earned LOKAL tokens to reduce purchase costs. The redeemed tokens are 
                burned (permanently removed), but you&apos;ll still earn new reward tokens based on the 
                remaining purchase amount and merchant&apos;s cashback rate.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
