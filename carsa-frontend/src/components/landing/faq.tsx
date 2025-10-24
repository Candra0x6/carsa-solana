"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"

const faqs = [
  {
    question: "What makes Carsa different from traditional loyalty programs?",
    answer: "Carsa transforms static points into productive assets. Your Lokal tokens automatically earn yield while idle, build your LocalRank reputation for exclusive benefits, and empower merchants with AI-driven insights. It's loyalty that lives and grows.",
  },
  {
    question: "How do my tokens earn yield?",
    answer: "Your idle Lokal tokens are automatically staked in the community treasury, which generates yield through DeFi strategies. You earn passive income on your rewards until you spend them — turning dead capital into productive community wealth.",
  },
  {
    question: "What is LocalRank and why does it matter?",
    answer: "LocalRank is your reputation score based on loyalty activity. Higher LocalRank unlocks exclusive promos, governance voting rights on treasury allocation, and future access to micro-credit. It's trust made tangible.",
  },
  {
    question: "Do I need crypto experience to use Carsa?",
    answer: "No! Carsa offers Web2-like simplicity with a custodial wallet — just sign up and start earning. Behind the scenes, you get Web3-grade transparency and ownership. Advanced users can connect external Solana wallets.",
  },
  {
    question: "How do merchants benefit?",
    answer: "Merchants gain AI-driven customer retention insights, smart promo recommendations, instant settlement, and access to community staking pools for liquidity. It's data, loyalty, and capital efficiency in one system.",
  },
  {
    question: "What's the vision for Carsa?",
    answer: "Every city has its own digital currency of trust and loyalty. From 'points' to 'productive assets' to 'micro-economies' — Carsa is rebuilding local capital and connection, one city at a time.",
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-white/70 text-lg">
            Everything you need to know about Carsa and Lokal tokens
          </p>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} variant="surface" className="overflow-hidden">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="text-lg font-medium text-white pr-4">
                  {faq.question}
                </h3>
                <div className={`transform transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <div className="text-white/70 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
