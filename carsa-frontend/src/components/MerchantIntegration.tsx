/**
 * Integration example showing how to use both PurchaseTransaction and RedeemTokensComponent
 */

import React from 'react';
import PurchaseTransaction from './PurchaseTransaction';
import { RedeemTokensComponent } from './RedeemTokensComponent';

interface MerchantIntegrationProps {
  merchantWalletAddress: string;
  merchantName?: string;
}

export default function MerchantIntegration({ 
  merchantWalletAddress, 
  merchantName 
}: MerchantIntegrationProps) {
  const handlePurchaseSuccess = (signature: string) => {
    console.log('Purchase completed:', signature);
    // You could show a success message or update state
  };

  const handleRedemptionSuccess = (signature: string) => {
    console.log('Redemption completed:', signature);
    // You could show a success message or update state
  };

  const handleError = (error: Error) => {
    console.error('Transaction error:', error);
    // Handle error display
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          CARSA Loyalty Program
        </h1>
        <p className="text-gray-600">
          {merchantName ? `Shop at ${merchantName}` : 'Merchant Integration'} - Earn and Redeem LOKAL Tokens
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Purchase Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-green-50 p-4 border-b">
            <h2 className="text-xl font-semibold text-green-800">
              💰 Make a Purchase
            </h2>
            <p className="text-green-600 text-sm mt-1">
              Earn LOKAL tokens with every purchase
            </p>
          </div>
          <div className="p-6">
            <PurchaseTransaction
              merchantWalletAddress={merchantWalletAddress}
              merchantName={merchantName}
            />
          </div>
        </div>

        {/* Redemption Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-blue-50 p-4 border-b">
            <h2 className="text-xl font-semibold text-blue-800">
              🎁 Redeem Tokens
            </h2>
            <p className="text-blue-600 text-sm mt-1">
              Use your LOKAL tokens for discounts
            </p>
          </div>
          <div className="p-6">
            <RedeemTokensComponent
              merchantWalletAddress={merchantWalletAddress}
              onRedemptionSuccess={handleRedemptionSuccess}
              onRedemptionError={handleError}
            />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          How CARSA Works
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-green-800 mb-2">💰 Earning Tokens</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Make purchases at participating merchants</li>
              <li>• Earn LOKAL tokens based on cashback rate</li>
              <li>• Tokens are automatically sent to your wallet</li>
              <li>• All transactions are recorded on Solana blockchain</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">🎁 Redeeming Tokens</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Use LOKAL tokens for discounts on future purchases</li>
              <li>• Set your preferred discount rate and fiat value</li>
              <li>• Tokens are transferred from your wallet to merchant</li>
              <li>• Instant redemption with blockchain verification</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Merchant Info */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Merchant Information
        </h3>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Name:</strong> {merchantName || 'N/A'}
          </p>
          <p>
            <strong>Wallet Address:</strong> 
            <code className="ml-2 text-xs bg-gray-100 p-1 rounded">
              {merchantWalletAddress}
            </code>
          </p>
          <p className="text-gray-600">
            This merchant is registered on the CARSA platform and accepts LOKAL tokens for loyalty rewards.
          </p>
        </div>
      </div>
    </div>
  );
}
