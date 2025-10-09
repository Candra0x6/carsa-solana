import RedeemTokensComponent from "@/components/RedeemTokensComponent";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <RedeemTokensComponent
            merchantWalletAddress="your-merchant-wallet-address"
            onRedemptionSuccess={(signature) => {
              console.log("Redemption successful:", signature);
            }}
            onRedemptionError={(error) => {
              console.error("Redemption error:", error);
            }}
          />
        </div>
      </div>
    </div>
  );
}