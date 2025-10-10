"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

export function Header() {
  return (
    <header className="py-4 fixed top-0 left-0 right-0 z-50  shadow-lg">
      <Card variant="surface" className="mx-auto max-w-6xl px-4 rounded-[99px] backdrop-blur-2xl">
        <div className="flex items-center justify-between h-14 px-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#7c5aff] to-[#6c47ff] flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="text-white text-sm font-medium">Carsa</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
           
            <Link href="/merchants" className="px-3 py-1.5 rounded-[99px] text-sm text-white/90 hover:bg-white/10 transition-colors">
              Merchants
            </Link>
          
          </nav>

          <div className="flex items-center gap-2">
                         <WalletMultiButton className="!bg-gradient-to-r !from-[#7c5aff] !to-[#6c47ff] hover:!from-[#6c47ff] hover:!to-[#5c3aef] !border-0 !px-8 !py-4 !text-white !font-semibold !shadow-xl !transition-all !duration-300 !rounded-full" />
           
          </div>
        </div>
      </Card>
    </header>
  )
}
