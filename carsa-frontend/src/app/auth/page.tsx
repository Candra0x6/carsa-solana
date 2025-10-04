'use client';

import { useState } from 'react';
import { AuthForm } from '@/components/AuthForm';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Carsa
          </h1>
          <p className="text-gray-600">
            Your decentralized loyalty program on Solana
          </p>
        </div>
        
        <AuthForm mode={mode} onModeChange={setMode} />
      </div>
    </div>
  );
}
