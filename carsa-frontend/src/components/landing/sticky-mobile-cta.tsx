"use client"

import { Button } from "@/components/ui/button"

export function StickyMobileCTA() {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <Button 
        variant="primary" 
        size="lg" 
        className="w-full shadow-2xl"
        asChild
      >
        <a href="#demo">Get Started with Carsa</a>
      </Button>
    </div>
  )
}
