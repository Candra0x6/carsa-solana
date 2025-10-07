'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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

const CATEGORY_COLORS: Record<string, string> = {
  'FOOD_BEVERAGE': 'bg-orange-100 text-orange-800',
  'RETAIL': 'bg-purple-100 text-purple-800',
  'SERVICES': 'bg-blue-100 text-blue-800',
  'ENTERTAINMENT': 'bg-pink-100 text-pink-800',
  'HEALTH_BEAUTY': 'bg-green-100 text-green-800',
  'EDUCATION': 'bg-indigo-100 text-indigo-800',
  'TRANSPORTATION': 'bg-yellow-100 text-yellow-800',
  'ACCOMMODATION': 'bg-red-100 text-red-800',
  'OTHER': 'bg-gray-100 text-gray-800'
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
  }, [page]);
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Merchants</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => fetchMerchants()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Search merchants</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search merchants..."
              />
            </div>
          </div>
          <div className="sm:w-48">
            <label htmlFor="category" className="sr-only">Filter by category</label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {Object.keys(CATEGORY_ICONS).map(category => (
                <option key={category} value={category}>
                  {category.replace('_', ' & ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredMerchants.length} of {total} merchants
        </p>
        {(searchTerm || selectedCategory) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Merchants Grid */}
      {filteredMerchants.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No merchants found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory ? 'Try adjusting your search filters.' : 'No merchants available at the moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMerchants.map((merchant) => (
            <MerchantCard key={merchant.id} merchant={merchant} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = page <= 3 ? i + 1 : page - 2 + i;
            if (pageNum > totalPages) return null;
            
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  page === pageNum
                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
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
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200 hover:border-blue-300">
        {/* Header with QR Code */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{CATEGORY_ICONS[merchant.category] || '🏪'}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                CATEGORY_COLORS[merchant.category] || 'bg-gray-100 text-gray-800'
              }`}>
                {merchant.category.replace('_', ' & ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            {merchant.qrCodeUrl && (
              <div className="w-12 h-12 bg-white rounded-lg p-1 shadow-sm">
                <Image
                  src={merchant.qrCodeUrl}
                  alt={`${merchant.name} QR Code`}
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {merchant.name}
          </h3>
          
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Cashback Rate</span>
              <span className="text-sm font-semibold text-green-600">
                {(merchant.cashbackRate / 100).toFixed(1)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Wallet</span>
              <span className="text-xs font-mono text-gray-600">
                {merchant.walletAddress.slice(0, 6)}...{merchant.walletAddress.slice(-6)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Joined {new Date(merchant.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                <span className="text-sm font-medium">View Details</span>
                <svg className="ml-1 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MerchantList;
