import type { Metadata } from 'next'
import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/Hero"
import { ValueProps } from "@/components/landing/value-props"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Features } from "@/components/landing/features"
import { DemoMerchants } from "@/components/landing/demo-merchants"
import { FAQ } from "@/components/landing/faq"
import { FinalCTA } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"
import { StickyMobileCTA } from "@/components/landing/sticky-mobile-cta"

export const metadata: Metadata = {
  title: 'Carsa - Hyperlocal Community Currency & Loyalty Program | Earn Lokal Tokens',
  description: 'A mobile-first loyalty app that rewards you with Lokal tokens for supporting local merchants. Shop, earn, and spend tokens across participating businesses in your city. Powered by Solana blockchain.',
  keywords: 'loyalty program, blockchain, solana, local merchants, community currency, lokal tokens, cashback, rewards',
  authors: [{ name: 'Carsa Team' }],
  creator: 'Carsa',
  publisher: 'Carsa',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Carsa - Earn and Spend Lokal Tokens at Local Shops',
    description: 'A mobile-first loyalty app that rewards you with Lokal tokens for supporting local merchants. Powered by Solana blockchain.',
    url: 'https://carsa.app',
    siteName: 'Carsa',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Carsa - Hyperlocal Community Currency',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carsa - Earn and Spend Lokal Tokens at Local Shops',
    description: 'A mobile-first loyalty app that rewards you with Lokal tokens for supporting local merchants.',
    images: ['/twitter-image.jpg'],
    creator: '@carsa_app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-verification-code',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Carsa',
  description: 'A mobile-first loyalty app that rewards you with Lokal tokens for supporting local merchants.',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'All',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  creator: {
    '@type': 'Organization',
    name: 'Carsa Team',
  },
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        
        <main className="pb-20 md:pb-0">
          <Hero />
          <ValueProps />
          <HowItWorks />
          <Features />
          <DemoMerchants />
          <FAQ />
          <FinalCTA />
        </main>
        
        <Footer />
        <StickyMobileCTA />
      </div>
    </>
  )
}
