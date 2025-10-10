'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface MerchantData {
  id: string;
  name: string;
  category: string;
  cashbackRate: number;
  walletAddress: string;
  isActive: boolean;
  createdAt: string;
  qrCodeUrl?: string;
}

interface MerchantListResponse {
  success: boolean;
  data?: {
    merchants: MerchantData[];
    total: number;
  };
  error?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'FOOD_BEVERAGE': '🍽️',
  'RETAIL': '🛍️',
  'SERVICES': '⚙️',
  'ENTERTAINMENT': '🎬',
  'HEALTH_BEAUTY': '💄',
  'EDUCATION': '📚',
  'TRANSPORTATION': '🚗',
  'ACCOMMODATION': '🏨',
  'OTHER': '🏪'
};



const MerchantList: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const limit = 12; // 12 merchants per page for nice grid layout

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/merchants?page=${page}&limit=${limit}`);
      const data: MerchantListResponse = await response.json();

      if (data.success && data.data) {
        setMerchants(data.data.merchants);
        setTotal(data.data.total);
      } else {
        setError(data.error || 'Failed to fetch merchants');
      }
    } catch {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || merchant.category === selectedCategory;
    return matchesSearch && matchesCategory && merchant.isActive;
  });

  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    fetchMerchants();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900  flex justify-center items-center">
        <Card variant="surface" className="p-8 text-center">
          <div className="w-16 h-16 border-4 border-[#7c5aff] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Loading merchants...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (


      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex justify-center items-center p-4">
        <Card variant="surface" className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Error Loading Merchants</h3>
          <p className="text-gray-300 mb-6 leading-relaxed">{error}</p>
          <Button
            variant="primary"
            onClick={() => fetchMerchants()}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pt-14">
      <div className="max-w-6xl mx-auto  px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Discover <span className="bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] bg-clip-text text-transparent">Merchants</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
            Explore our network of verified merchants and earn cashback on every purchase with Solana payments
          </p>
        </div>

        {/* Search and Filter Bar */}
        <Card variant="surface" className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">Search merchants</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
                  placeholder="Search merchants..."
                />
              </div>
            </div>
            <div className="sm:w-56">
              <label htmlFor="category" className="sr-only">Filter by category</label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#7c5aff]/50 focus:border-[#7c5aff]/50 transition-all"
              >
                <option value="">All Categories</option>
                {Object.keys(CATEGORY_ICONS).map(category => (
                  <option key={category} value={category} className="bg-gray-800 text-white">
                    {category.replace('_', ' & ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Results Count */}
        <div className="flex justify-between items-center">
          <p className="text-gray-300">
            Showing <span className="text-white font-semibold">{filteredMerchants.length}</span> of <span className="text-white font-semibold">{total}</span> merchants
          </p>
          {(searchTerm || selectedCategory) && (
            <Button
              variant="ghost-pill"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
              }}
              className="text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </Button>
          )}
        </div>

        {/* Merchants Grid */}
        {filteredMerchants.length === 0 ? (
          <Card variant="surface" className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-700/50 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">No merchants found</h3>
            <p className="text-gray-300 leading-relaxed max-w-md mx-auto">
              {searchTerm || selectedCategory ? 'Try adjusting your search filters to discover more merchants.' : 'No merchants are available at the moment. Check back soon!'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {filteredMerchants.map((merchant) => (
              <MerchantCard key={merchant.id} merchant={merchant} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            <Button
              variant="ghost-pill"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </Button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page <= 3 ? i + 1 : page - 2 + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                      page === pageNum
                        ? 'bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] text-white shadow-lg'
                        : 'bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <Button
              variant="ghost-pill"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2"
            >
              Next
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Individual Merchant Card Component
interface MerchantCardProps {
  merchant: MerchantData;
}

const MerchantCard: React.FC<MerchantCardProps> = ({ merchant }) => {
  return (
    <Link href={`/merchants/${merchant.id}`} className="group">
      <Card variant="surface" className="overflow-hidden hover:shadow-2xl hover:shadow-[#7c5aff]/20 transition-all duration-300 transform group-hover:-translate-y-1 border border-white/10 hover:border-[#7c5aff]/30">
        {/* Header with QR Code */}
        <div className="p-4 bg-gradient-to-r from-[#7c5aff]/10 to-[#6c47ff]/10 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <span className="text-xl">{CATEGORY_ICONS[merchant.category] || '🏪'}</span>
              </div>
              <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-medium text-white">
                {merchant.category.replace('_', ' & ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </span>
            </div>
            {merchant.qrCodeUrl && (
              <div className="w-12 h-12 bg-white/10 rounded-xl p-2 border border-white/20">
                <Image
                  src={merchant.qrCodeUrl}
                  alt={`${merchant.name} QR Code`}
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-bold text-white group-hover:text-[#7c5aff] transition-colors mb-4">
            {merchant.name}
          </h3>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between p-2 bg-white/5 rounded-xl">
              <span className="text-sm text-gray-300 flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Cashback Rate
              </span>
              <span className="text-sm font-bold text-green-400 bg-green-500/20 px-2 py-1 rounded-lg">
                {(merchant.cashbackRate / 100).toFixed(1)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-white/5 rounded-xl">
              <span className="text-sm text-gray-300 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Wallet
              </span>
              <span className="text-xs font-mono text-blue-300 bg-blue-500/20 px-2 py-1 rounded-lg">
                {merchant.walletAddress.slice(0, 6)}...{merchant.walletAddress.slice(-6)}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Joined {new Date(merchant.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center text-[#7c5aff] group-hover:text-[#6c47ff] font-medium">
                <span className="text-sm">View Details</span>
                <svg className="ml-1 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default MerchantList;
