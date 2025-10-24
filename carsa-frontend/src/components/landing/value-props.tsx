"use client"

import { FeatureCard } from "./feature-card"

const valueProps = [
  {
    title: "From Points to Productive Assets",
    description: "Unlike static loyalty programs, Lokal tokens earn yield while idle — transforming dead capital into community wealth.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: "Build Trust, Unlock Opportunity",
    description: "Your LocalRank reputation opens doors to exclusive promos, governance votes, and future micro-credit access.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: "Empower MSMEs with Data",
    description: "Merchants gain AI-driven insights on customer retention, smart promo recommendations, and access to community liquidity.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
            Strategic Impact
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Rebuilding local trust and capital, creating capital efficiency, and empowering micro-economies — one city at a time
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
