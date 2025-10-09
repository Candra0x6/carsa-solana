"use client"

import { FeatureCard } from "./feature-card"

const valueProps = [
  {
    title: "Earn at Local Shops",
    description: "Get cashback in Lokal tokens every time you shop at participating local merchants. Support your community and get rewarded.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
  },
  {
    title: "Spend Anywhere",
    description: "Redeem your Lokal tokens across all participating merchants in your city. One loyalty program, endless possibilities.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    title: "Simple for Merchants",
    description: "Easy QR code payments and a simple dashboard to track sales, tokens issued, and customer loyalty metrics.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export function ValueProps() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Why Choose Carsa?
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            A blockchain-powered loyalty program that benefits both customers and local businesses
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {valueProps.map((prop, index) => (
            <FeatureCard
              key={index}
              title={prop.title}
              description={prop.description}
              icon={prop.icon}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
