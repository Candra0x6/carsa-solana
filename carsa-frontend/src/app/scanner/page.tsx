'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PurchaseTransaction from '@/components/PurchaseTransaction';
import QrScanner from 'qr-scanner';

interface MerchantInfo {
  id: string;
  name: string;
  walletAddress: string;
  category: string;
  cashbackRate: number;
  isActive: boolean;
  qrCodeUrl?: string;
}

export default function QRScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [isLoadingMerchant, setIsLoadingMerchant] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Use back camera on mobile
        } 
      });
      
      setHasPermission(true);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Initialize QR Scanner
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
            console.log('QR Code detected:', result.data);
            
            // Extract merchant ID from the scanned QR code
            const merchantId = extractMerchantIdFromUrl(result.data);
            if (merchantId) {
              fetchMerchantData(merchantId);
            } else {
              setError('Invalid QR code format. Please scan a valid merchant QR code.');
            }
          },
          {
            preferredCamera: 'environment',
            highlightScanRegion: false,
            highlightCodeOutline: false,
          }
        );

        // Start the QR scanner
        await qrScannerRef.current.start();
      }

    } catch (err) {
      console.error('Camera permission denied:', err);
      setHasPermission(false);
      const errorMessage = 'Camera permission denied. Please allow camera access to scan QR codes.';
      setError(errorMessage);
      setIsScanning(false);
    }
  };

  const extractMerchantIdFromUrl = (url: string): string | null => {
    try {
      // Handle different URL formats
      // https://carsa.app/merchant/{id}
      // carsa.app/merchant/{id}
      // merchant/{id}
      // {id} (direct ID)
      
      const patterns = [
        /https?:\/\/(?:www\.)?carsa\.app\/merchant\/([a-zA-Z0-9-_]+)/,
        /carsa\.app\/merchant\/([a-zA-Z0-9-_]+)/,
        /merchant\/([a-zA-Z0-9-_]+)/,
        /^([a-zA-Z0-9-_]+)$/ // Direct ID
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1];
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting merchant ID:', error);
      return null;
    }
  };

  const fetchMerchantData = async (merchantId: string) => {
    setIsLoadingMerchant(true);
    setError(null);

    try {
      // Fetch merchant data from API
      const response = await fetch(`/api/merchants/${merchantId}`);
      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || `Merchant with ID "${merchantId}" not found`);
      }

      const merchantData = result.data;

      if (!merchantData.isActive) {
        throw new Error('This merchant is currently inactive');
      }

      setMerchantInfo({
        id: merchantData.id,
        name: merchantData.name,
        walletAddress: merchantData.walletAddress,
        category: merchantData.category,
        cashbackRate: merchantData.cashbackRate / 100, // Convert from basis points to percentage
        isActive: merchantData.isActive,
        qrCodeUrl: merchantData.qrCodeUrl
      });

      // Stop scanning after successful scan
      stopScanning();

    } catch (error) {
      console.error('Error fetching merchant data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch merchant data');
    } finally {
      setIsLoadingMerchant(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      setError('Please enter a QR code URL or merchant ID');
      return;
    }

    const merchantId = extractMerchantIdFromUrl(manualInput.trim());
    if (!merchantId) {
      setError('Invalid QR code format. Please enter a valid merchant URL or ID');
      return;
    }

    fetchMerchantData(merchantId);
  };



  const requestPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
      setError(null);
    } catch {
      setHasPermission(false);
      setError('Camera permission denied. Please allow camera access in your browser settings.');
    }
  };

  const resetScanner = () => {
    setMerchantInfo(null);
    setError(null);
    setManualInput('');
    stopScanning(); // Stop any ongoing scanning
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  // If merchant is found, show the purchase transaction interface
  if (merchantInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pt-16 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant="outline" 
                onClick={resetScanner}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Scan Another
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Payment <span className="bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] bg-clip-text text-transparent">Processing</span>
                </h1>
                <p className="text-gray-300">Complete your purchase transaction</p>
              </div>
            </div>

            {/* Merchant Info Card */}
            <Card variant="surface" className="p-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#7c5aff] to-[#6c47ff] rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{merchantInfo.name}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm text-gray-300">{merchantInfo.category}</span>
                    <span className="text-sm font-medium text-green-400">{merchantInfo.cashbackRate}% Cashback</span>
                    <span className="inline-flex items-center gap-1 text-sm text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Active
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-1">Merchant ID</p>
                  <p className="text-sm font-mono text-white">{merchantInfo.id}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Purchase Transaction Component */}
          <PurchaseTransaction 
            merchantWalletAddress={merchantInfo.walletAddress}
            merchantName={merchantInfo.name}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pt-16 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            QR Code <span className="bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] bg-clip-text text-transparent">Scanner</span>
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            Scan a merchant&apos;s QR code to start making a purchase and earn cashback rewards
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Scanner */}
          <div className="space-y-6">
            <Card variant="surface" className="p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                Camera Scanner
              </h2>

              {hasPermission === false ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Camera Permission Required</h3>
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    To scan QR codes, we need access to your camera. Please allow camera permission when prompted.
                  </p>
                  <Button variant="primary" onClick={requestPermission}>
                    Allow Camera Access
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative bg-black rounded-2xl overflow-hidden mb-6">
                    <video
                      ref={videoRef}
                      className="w-full h-[300px] object-cover"
                      playsInline
                      muted
                    />
                    
                    {/* Scanner Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Scanner Frame */}
                      <div className="absolute inset-0 bg-black/50">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-2xl">
                          {/* Corner indicators */}
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#7c5aff] rounded-tl-lg"></div>
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#7c5aff] rounded-tr-lg"></div>
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#7c5aff] rounded-bl-lg"></div>
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#7c5aff] rounded-br-lg"></div>
                          
                          {/* Scanning line animation */}
                          {isScanning && (
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#7c5aff] to-transparent animate-pulse"></div>
                          )}
                        </div>
                      </div>
                      
                      {/* Instructions */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
                        <div className="bg-black/80 rounded-2xl px-4 py-2 backdrop-blur-sm">
                          <p className="text-white text-sm font-medium">
                            {isScanning ? 'Scanning for QR code...' : 'Position QR code within the frame'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="absolute top-4 left-4">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
                        isScanning ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          isScanning ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                        }`}></div>
                        <span className={`text-xs font-medium ${
                          isScanning ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {isScanning ? 'Scanning' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {!isScanning ? (
                      <Button variant="primary" onClick={startScanning} className="flex-1">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Start Scanning
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={stopScanning} className="flex-1">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Stop Scanning
                      </Button>
                    )}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Manual Input & Info */}
          <div className="space-y-6">
            {/* Manual Input */}
            <Card variant="surface" className="p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                Manual Input
              </h2>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Enter QR Code URL or Merchant ID
                  </label>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="https://carsa.app/merchant/123 or just 123"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                    disabled={isLoadingMerchant}
                  />
                </div>
                
                <Button 
                  type="submit"
                  variant="primary" 
                  disabled={!manualInput.trim() || isLoadingMerchant}
                  className="w-full"
                >
                  {isLoadingMerchant ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Loading Merchant...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Process Input
                    </>
                  )}
                </Button>
              </form>
            </Card>


            {/* Info Card */}
            <Card variant="surface" className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How it works
              </h3>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#7c5aff]/20 border border-[#7c5aff]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#7c5aff] text-xs font-bold">1</span>
                  </div>
                  <p>Scan the merchant&apos;s QR code or enter it manually</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#7c5aff]/20 border border-[#7c5aff]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#7c5aff] text-xs font-bold">2</span>
                  </div>
                  <p>We fetch the merchant details from our database</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#7c5aff]/20 border border-[#7c5aff]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#7c5aff] text-xs font-bold">3</span>
                  </div>
                  <p>Complete your purchase and earn cashback tokens</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card variant="surface" className="p-4 mt-6 border border-red-500/30">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-400 mb-2">Scanner Error</h3>
                <p className="text-sm text-red-300/90 leading-relaxed">{error}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
