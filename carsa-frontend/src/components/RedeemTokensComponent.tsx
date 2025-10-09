/**
 * React component example for token redemption
 * This shows how to integrate the redeemTokens function in a React application
 */
"use client"
import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import * as anchor from '@coral-xyz/anchor';
import { ClientAnchorClient } from '../lib/client-anchor';
import { TokenRedemptionUtils, RedeemTokensParams } from '../types/redeem-tokens';

interface RedeemTokensComponentProps {
  merchantWalletAddress: string;
  onRedemptionSuccess?: (signature: string) => void;
  onRedemptionError?: (error: Error) => void;
}

export const RedeemTokensComponent: React.FC<RedeemTokensComponentProps> = ({
  merchantWalletAddress,
  onRedemptionSuccess,
  onRedemptionError,
}) => {
  const { wallet, publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  
  // Form state
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [fiatValue, setFiatValue] = useState<string>('');
  const [discountPercentage, setDiscountPercentage] = useState<string>('5');

  // Check balance on component mount
  React.useEffect(() => {
    const checkBalance = async () => {
      if (!connected || !publicKey || !wallet?.adapter) return;
      
      try {
        const client = new ClientAnchorClient({ 
          wallet: wallet.adapter as unknown as anchor.Wallet,
          connection 
        });
        const balanceInfo = await client.getFormattedLokalBalance();
        setBalance(balanceInfo.balance);
      } catch (error) {
        console.error('Error checking balance:', error);
      }
    };

    checkBalance();
  }, [connected, publicKey, wallet?.adapter, connection]);

  const handleRedemption = async () => {
    if (!connected || !publicKey || !wallet?.adapter) {
      alert('Please connect your wallet first');
      return;
    }

    // Validate inputs
    const tokenAmountNum = parseFloat(tokenAmount);
    const fiatValueNum = parseFloat(fiatValue);
    const discountPercentageNum = parseFloat(discountPercentage);

    if (!tokenAmountNum || !fiatValueNum || !discountPercentageNum) {
      alert('Please fill in all fields with valid numbers');
      return;
    }

    // Convert to required formats
    const tokenAmountSmallest = TokenRedemptionUtils.tokensToSmallestUnits(tokenAmountNum);
    const discountRateBasisPoints = TokenRedemptionUtils.percentageToBasisPoints(discountPercentageNum);

    // Validate parameters
    if (!TokenRedemptionUtils.validateTokenAmount(tokenAmountSmallest)) {
      alert('Invalid token amount. Must be between 0 and 5,000 LOKAL');
      return;
    }

    if (!TokenRedemptionUtils.validateFiatValue(fiatValueNum)) {
      alert('Invalid fiat value. Must be greater than 0');
      return;
    }

    if (!TokenRedemptionUtils.validateDiscountRate(discountRateBasisPoints)) {
      alert('Invalid discount rate. Must be between 0% and 100%');
      return;
    }

    // Check if user has sufficient balance
    const currentBalance = parseFloat(balance);
    if (tokenAmountNum > currentBalance) {
      alert(`Insufficient balance. You have ${balance} LOKAL, but trying to redeem ${tokenAmountNum} LOKAL`);
      return;
    }

    setIsLoading(true);

    try {
      const client = new ClientAnchorClient({ 
        wallet: wallet.adapter as unknown as anchor.Wallet,
        connection 
      });
      
      const redemptionParams: RedeemTokensParams = {
        merchantWalletAddress,
        tokenAmount: tokenAmountSmallest,
        fiatValue: Math.round(fiatValueNum), // Ensure integer
        discountRate: discountRateBasisPoints,
        transactionId: TokenRedemptionUtils.generateTransactionId(),
      };

      const signature = await client.redeemTokens(redemptionParams);
      
      // Update balance after successful redemption
      const updatedBalanceInfo = await client.getFormattedLokalBalance();
      setBalance(updatedBalanceInfo.balance);

      // Reset form
      setTokenAmount('');
      setFiatValue('');
      setDiscountPercentage('5');

      alert(`Redemption successful! Transaction: ${signature}`);
      onRedemptionSuccess?.(signature);

    } catch (error) {
      console.error('Redemption failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Redemption failed: ${errorMessage}`);
      onRedemptionError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDisplayAmount = () => {
    if (!tokenAmount || !fiatValue) return null;
    
    const params: RedeemTokensParams = {
      merchantWalletAddress,
      tokenAmount: TokenRedemptionUtils.tokensToSmallestUnits(parseFloat(tokenAmount) || 0),
      fiatValue: parseFloat(fiatValue) || 0,
      discountRate: TokenRedemptionUtils.percentageToBasisPoints(parseFloat(discountPercentage) || 0),
      transactionId: new Uint8Array(32),
    };

    return TokenRedemptionUtils.formatRedemptionDetails(params);
  };

  if (!connected) {
    return (
      <div className="p-6 border rounded-lg bg-gray-50">
        <p className="text-gray-600">Please connect your wallet to redeem LOKAL tokens</p>
        <div className="mt-4">
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-xl font-bold mb-4">Redeem LOKAL Tokens</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Current Balance: <span className="font-semibold">{balance} LOKAL</span>
        </p>
        <p className="text-sm text-gray-600">
          Merchant: <span className="font-mono text-xs">{merchantWalletAddress}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Tokens to Redeem (LOKAL)
          </label>
          <input
            type="number"
            value={tokenAmount}
            onChange={(e) => setTokenAmount(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter amount (e.g., 100)"
            min="0"
            max="5000"
            step="0.01"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Fiat Value (IDR)
          </label>
          <input
            type="number"
            value={fiatValue}
            onChange={(e) => setFiatValue(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter value in IDR (e.g., 50000)"
            min="0"
            step="1000"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Discount Percentage (%)
          </label>
          <input
            type="number"
            value={discountPercentage}
            onChange={(e) => setDiscountPercentage(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter discount (e.g., 5)"
            min="0"
            max="100"
            step="0.1"
            disabled={isLoading}
          />
        </div>

        {tokenAmount && fiatValue && (() => {
          const displayAmount = formatDisplayAmount();
          return displayAmount ? (
            <div className="p-3 bg-blue-50 rounded text-sm">
              <p><strong>Redemption Summary:</strong></p>
              <p>Tokens: {displayAmount.tokenAmount} LOKAL</p>
              <p>Value: Rp {displayAmount.fiatValue}</p>
              <p>Discount: {displayAmount.discountPercentage}%</p>
            </div>
          ) : null;
        })()}

        <button
          onClick={handleRedemption}
          disabled={isLoading || !tokenAmount || !fiatValue}
          className={`w-full p-3 rounded font-medium ${
            isLoading || !tokenAmount || !fiatValue
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Processing Redemption...' : 'Redeem Tokens'}
        </button>
      </div>
    </div>
  );
};

export default RedeemTokensComponent;
