"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Image from "next/image"
import { useRouter } from "next/navigation"

export function FinalCTA() {
  const router = useRouter()
  return (
    <section id="demo" className="py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4">
        <Card variant="surface" className="p-8 md:p-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Join us in building{" "}
              <span className="bg-gradient-to-r from-[#7c5aff] to-[#6c47ff] bg-clip-text text-transparent">
                the future of local economies
              </span>
            </h2>
            
            <p className="text-lg text-white/70 mb-8 leading-relaxed">
              Carsa transforms local commerce into a self-sustaining, data-driven, and community-owned economy. 
              From points to productive assets to micro-economies — starting right here in Bandung.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button onClick={() =>router.push("/auth/signin")} variant="primary" size="lg" className="min-w-[200px]">
                Join the Demo
              </Button>
              <Button variant="ghost-pill" size="lg" className="min-w-[200px]">
                Learn More
              </Button>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="flex items-center justify-center gap-8 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  Live on Devnet
                </div>
                <div className="flex items-center gap-2">
    <Image
      src="/solana.png"
      alt="Solana Logo"
      width={16}
      height={16}
      className="inline-block"
    />
                  <span className="text-white/70">Powered by Solana</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  Open Source
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
