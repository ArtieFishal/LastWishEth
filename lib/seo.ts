// SEO utilities for meta tags and structured data

export interface SEOData {
  title: string
  description: string
  url?: string
  image?: string
  type?: string
}

export function generateStructuredData(data: SEOData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: data.title,
    description: data.description,
    url: data.url || 'https://lastwish.eth',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0.000025',
      priceCurrency: 'ETH',
    },
  }
}

export function generateMetaTags(data: SEOData) {
  return {
    title: data.title,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      url: data.url,
      siteName: 'LastWish.eth',
      images: data.image ? [{ url: data.image }] : [],
      locale: 'en_US',
      type: data.type || 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.description,
      images: data.image ? [data.image] : [],
    },
  }
}

