"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"

const faqs = [
  {
    question: "What is Lokal?",
    answer: "Lokal is a community currency built on the Solana blockchain. It's an SPL token that you can earn when shopping at local merchants and spend across participating businesses in your city.",
  },
  {
    question: "Do I need a crypto wallet?",
    answer: "No! Carsa provides a built-in custodial wallet for simplicity. Your Lokal tokens are stored securely in your account. Advanced users can optionally connect external wallets like Phantom or Solflare.",
  },
  {
    question: "Is it live on Solana mainnet?",
    answer: "Currently, Carsa runs on Solana Devnet for our MVP demonstration. We're preparing for mainnet launch as we expand our merchant network and complete security audits.",
  },
  {
    question: "How do I earn Lokal tokens?",
    answer: "Simply shop at participating merchants and scan their QR code with the Carsa app. You'll automatically receive a percentage of your purchase back in Lokal tokens - typically 3-5% depending on the merchant.",
  },
  {
    question: "Where can I spend my tokens?",
    answer: "You can spend Lokal tokens at any participating merchant in the network. Use them for discounts, partial payments, or special offers. The more merchants join, the more places you can spend!",
  },
  {
    question: "Is there a fee for transactions?",
    answer: "Token transactions have minimal fees (fractions of a cent) thanks to Solana's efficiency. There are no fees for earning tokens, and spending fees are covered by the merchant network.",
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
