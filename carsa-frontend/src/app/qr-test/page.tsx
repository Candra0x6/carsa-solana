"use client"
import React from 'react';
import Image from 'next/image';

const QRTestPage: React.FC = () => {
  const [qrData, setQrData] = React.useState({
    merchantId: 'test-merchant-123',
    walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    name: 'Demo Coffee Shop',
    cashbackRate: 500
  });
  
  const [result, setResult] = React.useState<{
    qrCodeUrl?: string;
    dataUrl?: string;
    error?: string;
  } | null>(null);
  
  const [loading, setLoading] = React.useState(false);

  const generateQR = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/qr/generate-merchant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(qrData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult({
          qrCodeUrl: data.data.qrCodeUrl,
          dataUrl: data.data.dataUrl
        });
      } else {
        setResult({ error: data.error });
      }
    } catch {
      setResult({ error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            QR Code Generator Test
          </h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Merchant ID
              </label>
              <input
                type="text"
                value={qrData.merchantId}
                onChange={(e) => setQrData(prev => ({ ...prev, merchantId: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Wallet Address
              </label>
              <input
                type="text"
                value={qrData.walletAddress}
                onChange={(e) => setQrData(prev => ({ ...prev, walletAddress: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Merchant Name
              </label>
              <input
                type="text"
                value={qrData.name}
                onChange={(e) => setQrData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cashback Rate (basis points)
              </label>
              <input
                type="number"
                value={qrData.cashbackRate}
                onChange={(e) => setQrData(prev => ({ ...prev, cashbackRate: parseInt(e.target.value) || 0 }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                500 = 5%, 1000 = 10%
              </p>
            </div>
            
            <button
              onClick={generateQR}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate QR Code'}
            </button>
          </div>
          
          {result && (
            <div className="mt-6 p-4 border border-gray-200 rounded-lg">
              {result.error ? (
                <div className="text-red-600">
                  <h3 className="font-medium">Error:</h3>
                  <p className="text-sm">{result.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">QR Code Generated Successfully!</h3>
                  
                  {result.dataUrl && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">QR Code Preview:</p>
                      <Image 
                        src={result.dataUrl} 
                        alt="Generated QR Code" 
                        width={192}
                        height={192}
                        className="mx-auto border"
                      />
                    </div>
                  )}
                  
                  {result.qrCodeUrl && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Supabase Storage URL:</p>
                      <a 
                        href={result.qrCodeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 break-all"
                      >
                        {result.qrCodeUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRTestPage;
