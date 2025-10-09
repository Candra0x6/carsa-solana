"use client"

import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"

export function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon?: ReactNode
}) {
  return (
    <Card variant="surface" className="p-5 md:p-6 rounded-2xl">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-[99px] bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
          {icon ?? <span className="text-sm">★</span>}
        </div>
        <div>
          <h3 className="text-white font-medium">{title}</h3>
          <p className="mt-1 text-white/75 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  )
}
