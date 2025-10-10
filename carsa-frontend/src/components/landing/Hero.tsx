"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Image from "next/image"

export function Hero() {
  return (
    <section className="pt-10 md:pt-20">
      <div className="mx-auto max-w-6xl px-4">
        <Card variant="surface" className="p-6 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 h-8 rounded-[99px] bg-white/5 border border-white/10 text-xs text-white/80 mb-6">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#7c5aff] to-[#6c47ff]">
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3"/>
                  </svg>
                </span>
                Powered by Solana Blockchain
              </div>
              
              <h1 className="text-pretty text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Earn and spend{" "}
                <span className="bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] bg-clip-text text-transparent">
                  Lokal tokens
                </span>{" "}
                at local shops
              </h1>
              
              <p className="text-lg text-white/80 leading-relaxed mb-8">
                A mobile-first loyalty app that rewards you with Lokal tokens for supporting local merchants. 
                Shop at coffee shops, bookstores, and restaurants - earn tokens everywhere, spend anywhere.
              </p>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button variant="primary" size="lg" asChild>
                  <a href="#demo">Get the Demo</a>
                </Button>
                <Button variant="ghost-pill" size="lg" asChild>
                  <a href="#demo-video">Watch Demo</a>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="relative mx-auto w-80 h-80 lg:w-96 lg:h-96">
                {/* Hero illustration placeholder */}
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#7c5aff]/20 to-[#6c47ff]/20 border border-white/10 flex items-center justify-center">
                  <div className="text-center">
                    <Image src={"/illustration.png"} alt="Hero Illustration" layout="fill" objectFit="cover" className="rounded-2xl"/>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 inline-flex items-center gap-2 h-10 px-3 bg-[#131316] rounded-[99px] border border-white/10 shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.08)]">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs">
                  ✓
                </span>
                <span className="text-white text-sm whitespace-nowrap">Live on Devnet</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
