"use client"

import { FeatureCard } from "./feature-card"

const consumerFeatures = [
  {
    title: "Mobile Wallet",
    description: "Secure Solana wallet integrated into the app with your Lokal token balance",
    icon: "📱",
  },
  {
    title: "QR Scanner",
    description: "Quick and easy QR code scanning to complete transactions with merchants",
    icon: "📷",
  },
  {
    title: "Transaction History",
    description: "Complete history of all your earnings and spendings across merchants",
    icon: "📊",
  },
]

const merchantFeatures = [
  {
    title: "Merchant Dashboard",
    description: "Simple analytics showing sales, tokens issued, and customer loyalty metrics",
    icon: "📈",
  },
  {
    title: "QR Code Generator",
    description: "Generate unique QR codes for your business to accept Lokal token payments",
    icon: "🏪",
  },
  {
    title: "Instant Settlement",
    description: "Blockchain-powered instant settlement with transparent transaction records",
    icon: "⚡",
  },
]

const blockchainFeatures = [
  {
    title: "Solana Devnet",
    description: "Built on Solana blockchain for fast, low-cost transactions and scalability",
    icon: "🔗",
  },
  {
    title: "Anchor Program",
    description: "Smart contracts handle token minting, transfers, and loyalty program logic",
    icon: "⚙️",
  },
  {
    title: "SPL Tokens",
    description: "Lokal tokens are SPL tokens - standardized, secure, and interoperable",
    icon: "🪙",
  },
]

export function Features() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Powerful Features
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Everything you need for a seamless loyalty program experience, powered by blockchain technology
          </p>
        </div>
        
        <div className="space-y-16">
          {/* Consumer Features */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-8 text-center">
              For Customers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {consumerFeatures.map((feature, index) => (
                <FeatureCard
                  key={index}
                  title={feature.title}
                  description={feature.description}
                  icon={<span className="text-lg">{feature.icon}</span>}
                />
              ))}
            </div>
          </div>
          
          {/* Merchant Features */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-8 text-center">
              For Merchants
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {merchantFeatures.map((feature, index) => (
                <FeatureCard
                  key={index}
                  title={feature.title}
                  description={feature.description}
                  icon={<span className="text-lg">{feature.icon}</span>}
                />
              ))}
            </div>
          </div>
          
          {/* Blockchain Features */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-8 text-center">
              Blockchain Technology
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blockchainFeatures.map((feature, index) => (
                <FeatureCard
                  key={index}
                  title={feature.title}
                  description={feature.description}
                  icon={<span className="text-lg">{feature.icon}</span>}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
