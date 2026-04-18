'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Problem', id: 'problem' },
  { label: 'Benefits', id: 'benefits' },
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Features', id: 'features' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'FAQ', id: 'faq' },
]

export default function Header() {
  const [scrollY, setScrollY] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isAppPage = pathname === '/app'

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)

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
          <Link href="/" className="flex items-center space-x-2 group" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-purple-500/50">
              <span className="text-white font-bold text-xl">LW</span>
            </div>
            <span className="text-white font-bold text-xl md:text-2xl bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent group-hover:from-purple-200 group-hover:to-blue-200 transition-all">
              LastWish
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-gray-300 hover:text-white transition-colors font-medium text-sm lg:text-base relative group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 group-hover:w-full transition-all duration-300"></span>
              </button>
            ))}

            <Link
              href={isAppPage ? '/' : '/app'}
              className="px-5 lg:px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-purple-500/50 text-sm lg:text-base transform hover:scale-105"
            >
              {isAppPage ? 'Home' : 'Start Plan'}
            </Link>
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-lg hover:bg-white/20 transition-all"
          >
            <div className="flex flex-col justify-center gap-1.5">
              <span className={`block h-0.5 w-5 bg-white transition-all ${mobileMenuOpen ? 'translate-y-2 rotate-45' : ''}`}></span>
              <span className={`block h-0.5 w-5 bg-white transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block h-0.5 w-5 bg-white transition-all ${mobileMenuOpen ? '-translate-y-2 -rotate-45' : ''}`}></span>
            </div>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="flex flex-col p-3">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="w-full text-left px-4 py-3 rounded-xl text-white hover:bg-white/10 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}

                <div className="my-2 h-px bg-white/10"></div>

                <Link
                  href="/guide"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-white hover:bg-white/10 transition-colors"
                >
                  Guide
                </Link>
                <Link
                  href="/for-professionals"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-white hover:bg-white/10 transition-colors"
                >
                  For Professionals
                </Link>
                <Link
                  href="/sample-document"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-white hover:bg-white/10 transition-colors"
                >
                  Use Case Example
                </Link>

                <div className="mt-3 grid grid-cols-1 gap-3 p-1">
                  <Link
                    href={isAppPage ? '/' : '/app'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-center font-semibold text-white"
                  >
                    {isAppPage ? 'Back to Home' : 'Start Your Plan'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
