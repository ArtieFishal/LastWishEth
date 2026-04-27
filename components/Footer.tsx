'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="relative py-8 px-4 sm:px-6 lg:px-8 border-t-2 border-white/20 bg-slate-900/50 backdrop-blur-xl mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">LW</span>
            </div>
            <span className="text-white font-bold text-xl">LastWish</span>
          </div>
          
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link
              href="/guide"
              className="text-bright-soft hover:text-white transition-colors text-sm"
            >
              Guide
            </Link>
            <Link
              href="/for-professionals"
              className="text-bright-soft hover:text-white transition-colors text-sm"
            >
              For Professionals
            </Link>
            <Link
              href="/terms"
              className="text-bright-soft hover:text-white transition-colors text-sm"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-bright-soft hover:text-white transition-colors text-sm"
            >
              Privacy
            </Link>
            <Link
              href="/disclaimer"
              className="text-bright-soft hover:text-white transition-colors text-sm"
            >
              Disclaimer
            </Link>

            <div className="flex items-center gap-2 text-bright-soft text-xs">
              <span className="font-semibold">Donation (optional):</span>
              <span className="font-mono">0x016ae25Ac494B123C40EDb2418d9b1FC2d62279b</span>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-gray-400 text-xs mb-1">
            LastWishCrypto is a backup plan tool. It does not store your keys or execute transactions.
          </p>
          <p className="text-gray-500 text-xs">
            This document is for informational purposes only and does not constitute legal advice. © {new Date().getFullYear()} LastWish. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
