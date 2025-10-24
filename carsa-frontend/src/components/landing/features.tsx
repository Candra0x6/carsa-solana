"use client"

import { FeatureCard } from "./feature-card"

const consumerFeatures = [
  {
    title: "Productive Tokens",
    description: "Your Lokal tokens automatically earn yield while idle — turning rewards into growing assets",
    icon: "🪙",
  },
  {
    title: "LocalRank Reputation",
    description: "Build trust and creditworthiness through your loyalty activity — unlock exclusive benefits",
    icon: "🏆",
  },
  {
    title: "Custodial Simplicity",
    description: "Web2-like user experience with Web3-grade transparency — no crypto knowledge needed",
    icon: "🤗",
  },
]

const merchantFeatures = [
  {
    title: "AI-Driven Insights",
    description: "Get retention analytics and intelligent promo recommendations to grow your business",
    icon: "🤖",
  },
  {
    title: "QR Code Payments",
    description: "Accept Lokal tokens instantly with simple QR scanning — no complex hardware needed",
    icon: "📱",
  },
  {
    title: "Community Liquidity",
    description: "Access to community staking pools and micro-credit opportunities",
    icon: "💧",
  },
]

const blockchainFeatures = [
  {
    title: "Fast & Low-Cost",
    description: "Powered by Solana — transparent, instant, and fraction-of-a-cent transactions",
    icon: "⚡",
  },
  {
    title: "Auto-Staking Yield",
    description: "Tokens automatically earn yield from community treasury until spent",
    icon: "🌱",
  },
  {
    title: "Community-Owned",
    description: "LocalRank holders can vote on treasury allocation and city development",
    icon: "🏛️",
  },
]

export function Features() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            A Living Local Economy
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Transform loyalty points into community-owned assets with capital efficiency and reputation-based micro-economies
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
