'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const [scrollY, setScrollY] = useState(0)
  const pathname = usePathname()
  const isAppPage = pathname === '/app'

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    if (pathname !== '/') {
      window.location.href = `/#${id}`
      return
    }
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrollY > 50 
        ? 'bg-slate-900/95 backdrop-blur-xl border-b border-purple-500/30 shadow-2xl' 
        : 'bg-transparent'
    }`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-purple-500/50">
              <span className="text-white font-bold text-xl">LW</span>
            </div>
            <span className="text-white font-bold text-xl md:text-2xl bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent group-hover:from-purple-200 group-hover:to-blue-200 transition-all">
              LastWish
            </span>
          </Link>
          
          {!isAppPage && (
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <button 
                onClick={() => scrollToSection('problem')}
                className="text-gray-300 hover:text-white transition-colors font-medium text-sm lg:text-base relative group"
              >
                Problem
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => scrollToSection('benefits')}
                className="text-gray-300 hover:text-white transition-colors font-medium text-sm lg:text-base relative group"
              >
                Benefits
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="text-gray-300 hover:text-white transition-colors font-medium text-sm lg:text-base relative group"
              >
                How It Works
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="text-gray-300 hover:text-white transition-colors font-medium text-sm lg:text-base relative group"
              >
                Features
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="text-gray-300 hover:text-white transition-colors font-medium text-sm lg:text-base relative group"
              >
                Pricing
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <Link 
                href="/app"
                className="px-5 lg:px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-purple-500/50 text-sm lg:text-base transform hover:scale-105"
              >
                Get Started
              </Link>
            </div>
          )}

          {isAppPage && (
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/#problem'
                  }
                }}
                className="text-gray-300 hover:text-white transition-colors font-medium text-sm lg:text-base relative group"
              >
                Problem
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/#benefits'
                  }
                }}
                className="text-gray-300 hover:text-white transition-colors font-medium text-sm lg:text-base relative group"
              >
                Benefits
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/#how-it-works'
                  }
                }}
                className="text-gray-300 hover:text-white transition-colors font-medium text-sm lg:text-base relative group"
              >
                How It Works
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/#pricing'
                  }
                }}
                className="text-gray-300 hover:text-white transition-colors font-medium text-sm lg:text-base relative group"
              >
                Pricing
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
              </button>
              <Link 
                href="/"
                className="px-5 lg:px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-purple-500/50 text-sm lg:text-base transform hover:scale-105"
              >
                Home
              </Link>
            </div>
          )}

          <Link 
            href={isAppPage ? "/" : "/app"}
            className="md:hidden px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg text-sm"
          >
            {isAppPage ? "Home" : "Start"}
          </Link>
        </div>
      </nav>
    </header>
  )
}

