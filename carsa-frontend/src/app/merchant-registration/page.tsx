"use client"
import React, { useState } from 'react';
import { RegisterMerchantForm } from '@/components/RegisterMerchantForm';

const MerchantRegistrationDemo: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = (data: any) => {
    setResult(data);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Merchant Registration Demo
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Registration Form */}
          <div>
            <RegisterMerchantForm
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </div>

          {/* Results/Status */}
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {result && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">
                  Registration Successful! 🎉
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Merchant ID:</span>
                    <span className="ml-2 font-mono">{result.id}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium">Transaction:</span>
                    <a 
                      href={`https://explorer.solana.com/tx/${result.txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 font-mono text-blue-600 hover:text-blue-800 underline"
                    >
                      {result.txSignature?.slice(0, 12)}...{result.txSignature?.slice(-12)}
                    </a>
                  </div>
                  
                  <div>
                    <span className="font-medium">Merchant PDA:</span>
                    <span className="ml-2 font-mono text-xs break-all">{result.merchantPDA}</span>
                  </div>
                  
                  {result.qrCodeUrl && (
                    <div className="mt-4">
                      <span className="font-medium">QR Code:</span>
                      <div className="mt-2">
                        <img 
                          src={result.qrCodeUrl} 
                          alt="Merchant QR Code" 
                          className="w-32 h-32 border rounded"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          <a href={result.qrCodeUrl} target="_blank" rel="noopener noreferrer" className="underline">
                            View full size
                          </a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Connect your Solana wallet</li>
                <li>Fill in your merchant details</li>
                <li>Click "Register Merchant" to sign the transaction</li>
                <li>Your wallet will be the merchant owner</li>
                <li>A QR code will be generated and stored</li>
                <li>Each wallet can only register one merchant</li>
              </ol>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Note:</h3>
              <p className="text-sm text-yellow-700">
                This is using Solana Devnet. Make sure your wallet is connected to Devnet 
                and has some SOL for transaction fees. You can get devnet SOL from the 
                <a 
                  href="https://faucet.solana.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline ml-1"
                >
                  Solana Faucet
                </a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantRegistrationDemo;
