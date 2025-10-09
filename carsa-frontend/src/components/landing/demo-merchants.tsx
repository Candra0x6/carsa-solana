"use client"

import { Card } from "@/components/ui/card"

const merchants = [
  {
    name: "Kopi Lokal",
    type: "Coffee Shop",
    description: "Premium local coffee with artisanal roasts. Earn 5% back in Lokal tokens on every purchase.",
    logo: "☕",
    testimonial: "Our customers love earning Lokal tokens. It's increased our repeat business by 40%!",
  },
  {
    name: "Kota Bookstore",
    type: "Bookstore",
    description: "Independent bookstore featuring local authors and international titles. Get 3% cashback in tokens.",
    logo: "📚",
    testimonial: "Carsa helps us compete with big chains while supporting our local community.",
  },
  {
    name: "Warung Nusantara",
    type: "Restaurant",
    description: "Authentic Indonesian cuisine made with locally-sourced ingredients. Earn 4% Lokal tokens back.",
    logo: "🍜",
    testimonial: "The QR code system is so simple. Our customers and staff both love it!",
  },
]

export function DemoMerchants() {
  return (
    <section id="merchants" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Demo Merchants
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Experience the Carsa ecosystem with our partner merchants across the city
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
