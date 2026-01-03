import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { generateMetaTags } from "@/lib/seo";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
