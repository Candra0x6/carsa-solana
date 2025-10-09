"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function Header() {
  return (
    <header className="py-4">
      <Card variant="surface" className="mx-auto max-w-6xl px-4 rounded-[99px]">
        <div className="flex items-center justify-between h-14 px-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#7c5aff] to-[#6c47ff] flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="text-white text-sm font-medium">Carsa</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="#features" className="px-3 py-1.5 rounded-[99px] text-sm text-white/90 hover:bg-white/10 transition-colors">
              Features
            </Link>
            <Link href="#merchants" className="px-3 py-1.5 rounded-[99px] text-sm text-white/90 hover:bg-white/10 transition-colors">
              Merchants
            </Link>
            <Link href="#faq" className="px-3 py-1.5 rounded-[99px] text-sm text-white/90 hover:bg-white/10 transition-colors">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" asChild>
              <Link href="#demo">Get Demo</Link>
            </Button>
          </div>
        </div>
      </Card>
    </header>
  )
}
