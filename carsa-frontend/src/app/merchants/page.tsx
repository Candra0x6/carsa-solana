import React from 'react';
import MerchantList from '@/components/MerchantList';

const MerchantsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Discover Merchants</h1>
          <p className="mt-2 text-lg text-gray-600">
            Explore participating merchants and earn cashback rewards with Carsa
          </p>
        </div>
        <MerchantList />
      </div>
    </div>
  );
};

export default MerchantsPage;
