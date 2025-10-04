'use client';

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram } from '@solana/web3.js';
import { getTransactionService } from '@/lib/transaction-service';

export default function TransactionDemo() {
  const { wallet, publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  interface TransactionResult {
    type: string;
    success: boolean;
    txSignature?: string;
    dbRecordId?: string;
    data?: Record<string, unknown>;
    error?: string;
    timestamp?: string;
  }

  const [results, setResults] = useState<TransactionResult[]>([]);

  // Server transaction service
  const serverService = getTransactionService('server');

  const addResult = (result: Omit<TransactionResult, 'timestamp'>) => {
    setResults(prev => [...prev, { ...result, timestamp: new Date().toISOString() }]);
  };

  /**
   * Example: Client-initiated merchant registration
   * User's wallet signs the transaction, then we sync to database
   */
  const handleClientRegisterMerchant = async () => {
    if (!connected || !publicKey || !wallet?.adapter) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      // Create client transaction service
      const clientService = getTransactionService('client', {
        wallet: wallet.adapter,
        connection
      });

      // TODO: Replace with actual Anchor instruction
      // For demo, we'll create a simple transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey, // Self-transfer for demo
          lamports: 1000000 // 0.001 SOL
        })
      );

      const result = await clientService.executeAndSync(transaction, {
        transactionType: 'register-merchant',
        name: 'Demo Coffee Shop',
        category: 'FOOD_BEVERAGE',
        cashbackRate: 500, // 5%
        addressLine1: '123 Main St',
        city: 'Bandung',
        walletAddress: publicKey.toString()
      });

      addResult({
        type: 'Client Register Merchant',
        success: result.success,
        txSignature: result.txSignature,
        dbRecordId: result.dbRecordId,
        error: result.error
      });

    } catch (error) {
      addResult({
        type: 'Client Register Merchant',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Example: Server-initiated merchant registration
   * Server signs and sends the transaction, user just provides data
   */
  const handleServerRegisterMerchant = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const result = await serverService.registerMerchant({
        name: 'Demo Bookstore',
        category: 'RETAIL',
        cashbackRate: 300, // 3%
        addressLine1: '456 Book St',
        city: 'Bandung',
        walletAddress: publicKey.toString(),
        email: 'demo@bookstore.com',
        idempotencyKey: `register-${Date.now()}`
      });

      addResult({
        type: 'Server Register Merchant',
        success: result.success,
        data: result.data,
        error: result.error
      });

    } catch (error) {
      addResult({
        type: 'Server Register Merchant',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Example: Server-initiated purchase processing
   * Simulates a merchant processing a customer purchase
   */
  const handleServerProcessPurchase = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const result = await serverService.processPurchase({
        customerWallet: publicKey.toString(),
        merchantId: 'demo-merchant-id', // Would be from merchant selection
        purchaseAmount: 50000, // 50,000 IDR
        idempotencyKey: `purchase-${Date.now()}`
      });

      addResult({
        type: 'Server Process Purchase',
        success: result.success,
        data: result.data,
        error: result.error
      });

    } catch (error) {
      addResult({
        type: 'Server Process Purchase',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Example: Client-initiated token redemption
   * User redeems tokens at a merchant
   */
  const handleClientRedeemTokens = async () => {
    if (!connected || !publicKey || !wallet?.adapter) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const clientService = getTransactionService('client', {
        wallet: wallet.adapter,
        connection
      });

      // TODO: Replace with actual Anchor redemption instruction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 500000 // 0.0005 SOL
        })
      );

      const result = await clientService.executeAndSync(transaction, {
        transactionType: 'redemption',
        userId: 'demo-user-id',
        merchantId: 'demo-merchant-id',
        tokenAmount: 10000, // 10,000 tokens
        fiatValue: 15000, // 15,000 IDR equivalent
        customerWallet: publicKey.toString(),
        merchantWallet: 'demo-merchant-wallet'
      });

      addResult({
        type: 'Client Redeem Tokens',
        success: result.success,
        txSignature: result.txSignature,
        dbRecordId: result.dbRecordId,
        error: result.error
      });

    } catch (error) {
      addResult({
        type: 'Client Redeem Tokens',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Carsa Transaction Demo</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">System Architecture</h2>
        <p className="text-sm text-gray-700 mb-2">
          This demo shows both client-initiated and server-initiated transaction flows:
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li><strong>Client-initiated:</strong> User wallet signs → Anchor program execution → Wait for confirmation → Sync to database</li>
          <li><strong>Server-initiated:</strong> API call → Server signs and sends to Anchor → Wait for confirmation → Write to database</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-3 text-green-700">Client-Initiated Flows</h3>
          <div className="space-y-2">
            <button
              onClick={handleClientRegisterMerchant}
              disabled={loading || !connected}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Register Merchant (Client)
            </button>
            <button
              onClick={handleClientRedeemTokens}
              disabled={loading || !connected}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Redeem Tokens (Client)
            </button>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-3 text-blue-700">Server-Initiated Flows</h3>
          <div className="space-y-2">
            <button
              onClick={handleServerRegisterMerchant}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Register Merchant (Server)
            </button>
            <button
              onClick={handleServerProcessPurchase}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Process Purchase (Server)
            </button>
          </div>
        </div>
      </div>

      {!connected && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 text-sm">
            Connect your wallet to test client-initiated transactions. Server-initiated transactions work without wallet connection.
          </p>
        </div>
      )}

      {loading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-800 text-sm">
            Processing transaction... This includes on-chain confirmation and database sync.
          </p>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Transaction Results</h3>
        {results.length === 0 ? (
          <p className="text-gray-500 text-sm">No transactions yet. Try the buttons above!</p>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{result.type}</span>
                  <span className="text-xs text-gray-500">{result.timestamp}</span>
                </div>
                
                {result.success ? (
                  <div className="text-sm text-gray-600">
                    {result.txSignature && (
                      <p><strong>TX:</strong> {result.txSignature}</p>
                    )}
                    {result.dbRecordId && (
                      <p><strong>DB Record:</strong> {result.dbRecordId}</p>
                    )}
                    {result.data && (
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <p className="text-red-600 text-sm">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
