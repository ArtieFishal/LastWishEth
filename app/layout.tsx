import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { generateMetaTags } from "@/lib/seo";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const seoData = generateMetaTags({
  title: "LastWish.eth - Crypto Inheritance Instructions",
  description: "Create secure, printable instructions for accessing and distributing your crypto assets. Multi-chain support, beneficiary allocation, and professional PDF generation.",
  url: "https://lastwish.eth",
  type: "website",
});

export const metadata: Metadata = {
  ...seoData,
  keywords: ["crypto inheritance", "bitcoin inheritance", "ethereum inheritance", "crypto will", "blockchain inheritance", "crypto estate planning"],
  authors: [{ name: "LastWish.eth" }],
  creator: "LastWish.eth",
  publisher: "LastWish.eth",
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1",
};

const structuredData = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Structured Data */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* Open Graph Tags */}
        <meta property="og:title" content="LastWish.eth - Crypto Inheritance Instructions" />
        <meta property="og:description" content="Create secure, printable instructions for accessing and distributing your crypto assets. Multi-chain support, beneficiary allocation, and professional PDF generation." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://lastwish.eth" />
        <meta property="og:image" content="https://lastwish.eth/og-image.png" />
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="LastWish.eth - Crypto Inheritance Instructions" />
        <meta name="twitter:description" content="Create secure, printable instructions for accessing and distributing your crypto assets." />
        <meta name="twitter:image" content="https://lastwish.eth/og-image.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
