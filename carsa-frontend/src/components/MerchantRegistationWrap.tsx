"use client"
import React, { useState } from 'react';
import Image from 'next/image';
import { RegisterMerchantForm } from '@/components/RegisterMerchantForm';
import { Card } from '@/components/ui/card';

interface RegistrationResult {
  id: string;
  txSignature: string;
  merchantPDA: string;
  qrCodeUrl?: string;
}

const MerchantRegistrationWrap: React.FC = () => {
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = (data: unknown) => {
    setResult(data as RegistrationResult);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 ">
      <div className="max-w-2xl mx-auto">
  <h1 className="text-pretty text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Register Your Merchant
              </h1>
    {/* Instructions */}
    <div className="space-y-6">
      {/* Main Registration Form - Takes 2 columns */}
        <RegisterMerchantForm
          onSuccess={handleSuccess}
          onError={handleError}
        />

          <Card variant="surface" className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-blue-300 text-lg">How it works</h3>
            </div>
            <ol className="space-y-3">
              {[
                'Connect your Solana wallet',
                'Fill in your merchant details',
                'Click Register Merchant to sign the transaction',
                'Your wallet will be the merchant owner',
                'A QR code will be generated and stored',
                'Each wallet can only register one merchant'
              ].map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-blue-300 text-sm font-semibold">{index + 1}</span>
                  </div>
                  <span className="text-gray-300 text-sm leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card variant="surface" className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-2xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-yellow-300 mb-2">Devnet Environment</h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  This application uses Solana Devnet for testing. Make sure your wallet is connected to Devnet 
                  and has some SOL for transaction fees.
                </p>
                <a 
                  href="https://faucet.solana.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 text-yellow-300 hover:text-yellow-200 text-sm font-medium underline transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Get Devnet SOL from Faucet
                </a>
              </div>
            </div>
          </Card>
    </div>
      </div>
    
    </div>
  );
};

export default MerchantRegistrationWrap;
