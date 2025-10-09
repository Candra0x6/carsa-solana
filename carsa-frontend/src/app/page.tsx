'use client';

import { WalletConnection } from '@/components/WalletConnection';
import { TokenBalanceDisplay } from '@/components/TokenBalanceDisplay';
import TransactionDemo from '@/components/TransactionDemo';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Carsa Loyalty Program
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A decentralized loyalty program on Solana enabling cashback rewards, 
            token transfers, and redemptions across participating merchants.
          </p>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">How to Use</h2>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Connect your wallet using the &quot;Connect Wallet&quot; button in the navbar above</li>
              <li>Once connected, click the &quot;💰 LOKAL Balance&quot; button to view your token balance</li>
              <li>Use the features below to interact with the loyalty program</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Token Balance Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                LOKAL Token Balance
              </h2>
              <TokenBalanceDisplay 
                mintAddress={process.env.NEXT_PUBLIC_LOKAL_MINT_ADDRESS || "11111111111111111111111111111112"}
                tokenName="LOKAL"
              />
            </div>

            {/* Wallet Connection Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Wallet Connection
              </h2>
              <WalletConnection />
            </div>
          </div>

          {/* Program Information */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Program Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700">Network</h3>
                  <p className="text-sm text-gray-600 font-mono">
                    {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Program ID</h3>
                  <p className="text-sm text-gray-600 font-mono break-all">
                    {process.env.NEXT_PUBLIC_ANCHOR_PROGRAM_ID || 'Not configured'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700">Features</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Merchant registration</li>
                    <li>• Cashback rewards</li>
                    <li>• Token transfers</li>
                    <li>• Token redemptions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* On-Chain First Transaction Demo */}
          <div className="mt-8">
            <TransactionDemo />
          </div>
        </div>
      </div>
     
    </div>
  );
}
