'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Merchant, User, UserMerchant } from '@/generated/prisma';
import Image from 'next/image';


const dummyData: Merchant[] = [
  { id: '1', name: 'Gourmet Bites', category: 'FOOD_BEVERAGE', city: 'New York', cashback_rate: 750 },
  { id: '2', name: 'Tech Haven', category: 'RETAIL', city: 'San Francisco', cashback_rate: 650 },
  { id: '3', name: 'Style Studio', category: 'HEALTH_BEAUTY', city: 'Los Angeles', cashback_rate: 600 },
];

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

const MEDAL_COLORS = {
  1: {
    gradient: 'from-yellow-400 via-yellow-300 to-yellow-500',
    border: 'border-yellow-400/50',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.3)]',
    icon: '👑',
    bg: 'from-yellow-500/20 to-yellow-600/20',
  },
  2: {
    gradient: 'from-gray-300 via-gray-200 to-gray-400',
    border: 'border-gray-400/50',
    glow: 'shadow-[0_0_20px_rgba(156,163,175,0.3)]',
    icon: '🥈',
    bg: 'from-gray-500/20 to-gray-600/20',
  },
  3: {
    gradient: 'from-orange-400 via-orange-300 to-orange-500',
    border: 'border-orange-400/50',
    glow: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]',
    icon: '🥉',
    bg: 'from-orange-500/20 to-orange-600/20',
  },
};

const MerchantRankPage: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMerchantRankings();
  }, []);

  const fetchMerchantRankings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/merchants/rank`);
      const data = await response.json();
      console.log(data.data.merchants)
      if (data.success) {
        setMerchants(data.data.merchants);
      } else {
        setError('Failed to fetch merchant rankings');
      }
    } catch {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <Card variant="surface" className="p-8">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#7c5aff] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/80">Loading merchant rankings...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card variant="surface" className="p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <Button variant="primary" onClick={fetchMerchantRankings}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  const topThree = merchants.slice(0, 2);
  const restOfTop10 = merchants.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-black">
      <div className="max-w-7xl pt-20 mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
                 <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Merchants <span className="bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] bg-clip-text text-transparent">Rank</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
            Check out the top merchants in our network and see how they rank!
          </p>
        </div>
        {/* Top 3 Podium */}
      
          <div className="mb-16">
            {/* Podium Container with proper spacing */}
            <div className="relative max-w-6xl mx-auto px-4">
              
              {/* Desktop Podium Layout */}
              <div className=" relative flex flex-col items-center gap-8 ">
                <div className="grid grid-cols-3 sm:gap-[10vw] lg:gap-20 gap-2 -mb-24">

                {/* 2nd Place - Left (Lower) */}
                <div className="mt-24 z-10">
                  {topThree[1] && <TopMerchantCard merchant={topThree[1]} position={2} />}
                </div>

                {/* 1st Place - Center (Highest) */}
                <div className="relative z-10">
                 
                  <TopMerchantCard merchant={topThree[0]} position={1} />
                </div>

                {/* 3rd Place - Right (Lower) */}
                <div className="mt-24 z-10">
                  {topThree[2] && <TopMerchantCard merchant={topThree[2]} position={3} className='sm:ml-5 sm:translate-y-15' />}
                </div>
                </div>

              <Image src="/podium.png" alt="Podium" width={600} height={200} className="w-full max-w-4xl mx-auto opacity-40 " />
               <div
    className="absolute inset-0  bg-gradient-to-t from-black via-transparent to-transparent z-0"
   
  ></div>

              </div>

              {/* Mobile Podium Layout */}
             
            </div>
          </div>
       

        {/* Ranks 4-10 */}
        {restOfTop10.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-white/50">#4-10</span>
              <span>Top Merchants</span>
            </h2>
            <div className="space-y-4">
              {restOfTop10.map((merchant, index) => (
                <RankCard key={merchant.id} merchant={merchant} rank={index + 4} />
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-12 text-center">
          <Button variant="ghost-pill" asChild>
            <Link href="/merchants" className="inline-flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to All Merchants
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

// Top 3 Merchant Card Component
const TopMerchantCard: React.FC<{ merchant: Merchant; position: 1 | 2 | 3; className?: string }> = ({ merchant, position, className }) => {
  const colors = MEDAL_COLORS[position];

  return (
    <Link href={`/merchants/${merchant.id}`}>
      <Card 
        variant="surface" 
        className={`w-[10wh] h-[10wh] md:w-40  md:h-40 ${className}`}
      >
      
        {/* Merchant Info */}
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center backdrop-blur-sm border ">
            <span className="text-3xl">{CATEGORY_ICONS[merchant.category] || '🏪'}</span>
          </div>

          <h3 className="text-xl font-bold text-white mb-2 truncate">{merchant.name}</h3>
      

        
        </div>
      </Card>
    </Link>
  );
};

// Rank 4-10 Card Component
const RankCard: React.FC<{ merchant: Merchant; rank: number }> = ({ merchant, rank }) => {
  return (
    <Link href={`/merchants/${merchant.id}`}>
      <Card 
        variant="surface" 
        className="overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer hover:border-[#7c5aff]/50 border border-transparent"
      >
        <div className="p-6">
          <div className="flex items-center gap-6">
            {/* Rank Number */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7c5aff]/20 to-[#6c47ff]/20 border border-[#7c5aff]/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-[#7c5aff]">#{rank}</span>
              </div>
            </div>

            {/* Merchant Icon */}
            <div className="flex-shrink-0">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <span className="text-2xl">{CATEGORY_ICONS[merchant.category] || '🏪'}</span>
              </div>
            </div>

            {/* Merchant Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white mb-1 truncate">{merchant.name}</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/20 text-white/90">
                  {merchant.category.replace('_', ' & ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <span className="text-sm text-white/60">📍 {merchant.city}</span>
              </div>
            </div>

            {/* Cashback Rate */}
            <div className="flex-shrink-0 text-right">
              <div className="inline-flex flex-col items-end px-4 py-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                <div className="text-xl font-bold text-green-400">
                  {(merchant.cashback_rate / 100).toFixed(1)}%
                </div>
                <div className="text-xs text-green-400/80">Cashback</div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default MerchantRankPage;
