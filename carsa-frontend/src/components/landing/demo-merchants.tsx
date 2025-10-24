"use client"

import { Card } from "@/components/ui/card"

const merchants = [
  {
    name: "Kopi Lokal",
    type: "Coffee Shop",
    description: "Get 10% Lokal cashback on every coffee. Your tokens earn yield while you savor your next cup.",
    logo: "☕",
    testimonial: "Carsa transformed our loyalty program. Customers come back more — and the AI insights help us optimize promos.",
  },
  {
    name: "Kota Bookstore",
    type: "Bookstore",
    description: "Accept Lokal for partial payment and reward frequent readers with LocalRank-exclusive discounts.",
    logo: "📚",
    testimonial: "The data on customer retention is incredible. We finally understand our community better than ever.",
  },
  {
    name: "Warung Nusantara",
    type: "Restaurant",
    description: "Boost slow hours with LocalRank-exclusive promos. Your regulars build reputation while you build revenue.",
    logo: "🍜",
    testimonial: "Simple QR payments plus smart analytics. Carsa is exactly what local businesses needed.",
  },
]

export function DemoMerchants() {
  return (
    <section id="merchants" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            The Carsa Flywheel in Action
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            See how local businesses and customers create a living, data-driven economy together
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {merchants.map((merchant, index) => (
            <Card key={index} variant="surface" className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl">
                  {merchant.logo}
                </div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  {merchant.name}
                </h3>
                <p className="text-sm text-white/60 mb-3">{merchant.type}</p>
                <p className="text-white/70 text-sm leading-relaxed">
                  {merchant.description}
                </p>
              </div>
              
              <div className="pt-4 border-t border-white/10">
                <blockquote className="text-white/80 text-sm italic">
                  &ldquo;{merchant.testimonial}&rdquo;
                </blockquote>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <Card variant="surface" className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-2">3+</div>
              <div className="text-white/70">Partner Merchants</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">500+</div>
              <div className="text-white/70">Transactions</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">10K+</div>
              <div className="text-white/70">Tokens Circulated</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
