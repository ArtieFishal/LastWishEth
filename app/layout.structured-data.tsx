// Structured data for SEO - add to layout.tsx head

export const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LastWish.eth',
  description: 'Create secure, printable instructions for accessing and distributing your crypto assets',
  url: 'https://lastwish.eth',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0.000025',
    priceCurrency: 'ETH',
    availability: 'https://schema.org/InStock',
  },
  featureList: [
    'Multi-chain wallet support',
    'Asset allocation to beneficiaries',
    'Professional PDF generation',
    'ENS name resolution',
    'Bitcoin and EVM chain support',
  ],
}

