/**
 * Toast-inspired design system styles
 * Use these classes when you need direct styling without components
 */

export const toastStyles = {
  // Surface styles
  surface: "bg-[#131316] rounded-[24px] shadow-[0px_32px_64px_-16px_#0000004c,0px_16px_32px_-8px_#0000004c,0px_8px_16px_-4px_#0000003d,0px_4px_8px_-2px_#0000003d,0px_-8px_16px_-1px_#00000029,0px_2px_4px_-1px_#0000003d,0px_0px_0px_1px_#000000,inset_0px_0px_0px_1px_#ffffff14,inset_0px_1px_0px_#ffffff33] text-white",
  
  // Button styles
  primaryBtn: "h-11 px-6 bg-gradient-to-b from-[#7c5aff] to-[#6c47ff] rounded-[99px] text-white text-sm font-medium shadow-[inset_0px_1px_0px_rgba(255,255,255,0.16),0px_1px_2px_rgba(0,0,0,0.20)] hover:from-[#8f71ff] hover:to-[#7c5aff] active:from-[#6c47ff] active:to-[#5835ff] transition-all",
  ghostBtn: "h-11 px-6 rounded-[99px] text-white/90 text-sm hover:bg-white/10 transition-colors",
  
  // Pill components
  statusPill: "inline-flex items-center gap-3 h-10 px-2 bg-[#131316] rounded-[99px] border border-white/10 shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.08)]",
  badgePill: "inline-flex items-center gap-2 px-3 h-8 rounded-[99px] bg-white/5 border border-white/10 text-xs text-white/80",
  
  // Common elements
  iconCircle: "inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white text-xs",
  miniBtn: "h-7 px-3 inline-flex items-center justify-center rounded-[99px] bg-gradient-to-b from-[#7c5aff] to-[#6c47ff] text-white text-[13px] font-medium",
} as const

/**
 * Component variants for use with Button and Card components
 */
export const toastVariants = {
  button: {
    primary: "primary" as const,
    ghost: "ghost-pill" as const,
  },
  card: {
    surface: "surface" as const,
  },
} as const
