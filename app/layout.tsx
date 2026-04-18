import type { Metadata } from "next";
import "./globals.css";
// Removed aggressive wallet cleanup - now handled properly in /app route only
import ClientProviders from "@/components/ClientProviders";

// Using system fonts directly - more reliable for CI builds
// No external font fetching required

export const metadata: Metadata = {
  metadataBase: new URL("https://lastwishcrypto.com"),
  title: {
    default: "LastWish | Crypto Inheritance Instructions for Families and Executors",
    template: "%s | LastWish",
  },
  description: "Create clear, printable crypto inheritance instructions without storing seed phrases or private keys. Help your family, executor, or attorney understand what exists and how to handle it.",
  keywords: [
    "crypto inheritance",
    "bitcoin inheritance",
    "estate planning for crypto",
    "crypto estate planning",
    "wallet inheritance instructions",
    "executor crypto guide",
    "nft inheritance",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "LastWish | Crypto Inheritance Instructions for Families and Executors",
    description: "A safer way to document wallets, assets, and inheritance instructions without handing custody to a third party.",
    url: "https://lastwishcrypto.com",
    siteName: "LastWish",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LastWish | Crypto Inheritance Instructions",
    description: "Help your family avoid losing access to crypto. No seed phrases stored, no custody taken.",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
