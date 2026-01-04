import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

// Using system fonts directly - more reliable for CI builds
// No external font fetching required

export const metadata: Metadata = {
  title: "LastWish - Crypto Inheritance Instructions",
  description: "Create printable instructions for accessing and distributing your crypto assets",
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
