'use client'

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
          
          <div className="flex items-center gap-6">
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-bright-soft hover:text-white transition-colors text-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
              </svg>
              Twitter / X
            </a>
            <div className="flex items-center gap-2 text-bright-soft text-xs">
              <span className="font-semibold">Donation:</span>
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

