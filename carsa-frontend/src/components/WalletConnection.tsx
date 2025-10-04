'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { FC } from 'react';

interface WalletConnectionProps {
  className?: string;
}

export const WalletConnection: FC<WalletConnectionProps> = ({ 
  className = '' 
}) => {
  const { publicKey, connected, connecting, disconnect } = useWallet();

  return (
    <div className={`wallet-connection ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        {/* Wallet Connect Button */}
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !font-semibold !px-6 !py-3 !text-white !transition-colors !duration-200" />
        
        {/* Connection Status */}
        {connecting && (
          <div className="flex items-center space-x-2 text-yellow-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
            <span className="text-sm">Connecting...</span>
          </div>
        )}
        
        {connected && publicKey && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full max-w-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-800 font-medium">Connected</span>
              </div>
              <button
                onClick={disconnect}
                className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors duration-200"
              >
                Disconnect
              </button>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-600 mb-1">Wallet Address:</p>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded border break-all">
                {publicKey.toBase58()}
              </p>
            </div>
          </div>
        )}

        {!connected && !connecting && (
          <div className="text-gray-600 text-sm text-center max-w-md">
            <p>Connect your wallet to interact with the Carsa loyalty program.</p>
            <p className="mt-1 text-xs">Supported wallets: Phantom, Solflare, Torus</p>
          </div>
        )}
      </div>
    </div>
  );
};
