'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAllTiers, getTierPricing } from '@/lib/pricing'
import Header from './Header'
import Footer from './Footer'

export default function LandingPage() {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tiers = getAllTiers()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 animate-gradient-shift"></div>
      
      {/* Floating gradient orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float-delayed"></div>

      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 md:pt-0">
        <div className="max-w-6xl mx-auto text-center z-10">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-hero mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent px-4 text-glow-white hover-glow">
              Protect Your Crypto Legacy
            </h1>
            <p className="text-section-subtitle text-bright mb-4 px-4">
              Don't let $150+ billion in lost crypto be your family's story
            </p>
            <p className="text-card-body text-bright-soft mb-12 max-w-3xl mx-auto px-4">
              Create professional, notarizable inheritance documents for your crypto assets. 
              No accounts. No seed phrases stored. Just you, your wallets, and peace of mind.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-delayed px-4">
            <Link 
              href="/app"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 text-center border-2 border-purple-400/50 border-glow-hover"
            >
              Get Started Free →
            </Link>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-lg text-white font-semibold text-base sm:text-lg rounded-xl border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all"
            >
              See How It Works
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-bright-soft">
            {[
              { text: 'No Seed Phrases', gradient: 'from-green-500/20 to-emerald-500/20' },
              { text: 'Client-Side Only', gradient: 'from-blue-500/20 to-cyan-500/20' },
              { text: 'Multi-Chain Support', gradient: 'from-purple-500/20 to-pink-500/20' }
            ].map((badge, index) => (
              <div key={index} className={`relative flex items-center gap-2 px-4 py-2 bg-gradient-to-br ${badge.gradient} backdrop-blur-xl rounded-lg border-2 border-white/20 hover:border-green-400/60 transition-all transform hover:scale-110 hover:shadow-lg hover:shadow-green-500/20 overflow-hidden group`}>
                {/* Animated background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${badge.gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-gradient-shift`}></div>
                
                {/* Content */}
                <div className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400 group-hover:scale-125 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="group-hover:text-white transition-colors">{badge.text}</span>
                </div>
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="section-divider max-w-7xl mx-auto"></div>

      {/* Problem/Statistics Section */}
      <section id="problem" className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-section-title mb-4 sm:mb-6 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent text-glow">
              The Cost of Inaction
            </h2>
            <p className="text-section-subtitle text-bright-soft max-w-3xl mx-auto">
              Billions in crypto assets are lost forever because families don't know how to access them
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
            {[
              { value: '$150B+', label: 'Lost Crypto Value', sublabel: 'Conservative estimate', color: 'text-red-400', gradient: 'from-red-500/20 to-orange-500/20' },
              { value: '73%', label: 'Undocumented Holdings', sublabel: 'Of crypto holders', color: 'text-orange-400', gradient: 'from-orange-500/20 to-yellow-500/20' },
              { value: '68%', label: 'Families Can\'t Access', sublabel: 'Deceased relatives\' crypto', color: 'text-yellow-400', gradient: 'from-yellow-500/20 to-pink-500/20' },
              { value: '$50K-$500K', label: 'Average Family Loss', sublabel: 'In inaccessible assets', color: 'text-pink-400', gradient: 'from-pink-500/20 to-red-500/20' }
            ].map((stat, index) => (
              <div key={index} className={`relative bg-gradient-to-br ${stat.gradient} backdrop-blur-xl rounded-2xl p-4 sm:p-6 border-2 border-white/20 hover:border-purple-400/60 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 border-glow-hover overflow-hidden group`}>
                {/* Animated background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-gradient-shift`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className={`text-3xl sm:text-4xl font-bold ${stat.color} mb-2 text-glow group-hover:scale-110 transition-transform duration-300`}>{stat.value}</div>
                  <div className="text-card-body text-bright-soft font-semibold group-hover:text-white transition-colors">{stat.label}</div>
                  <div className="text-gray-400 text-xs mt-2">{stat.sublabel}</div>
                </div>
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              </div>
            ))}
          </div>

          <div className="relative bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border-2 border-red-500/30 border-glow overflow-hidden group hover:shadow-2xl hover:shadow-red-500/20 transition-all">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-shift"></div>
            
            {/* Content */}
            <div className="relative z-10">
              <h3 className="text-card-title text-bright mb-4 group-hover:text-white transition-colors">Real-World Impact</h3>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h4 className="text-card-body font-semibold text-orange-300 mb-3">Time to Recovery</h4>
                  <ul className="space-y-2 text-card-body text-bright-soft">
                    <li className="flex items-center gap-2">
                      <span className="text-green-400 text-xl group-hover:scale-125 transition-transform">✓</span>
                      <span><strong>With documentation:</strong> 1-7 days</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-400 text-xl group-hover:scale-125 transition-transform">✗</span>
                      <span><strong>Without documentation:</strong> 6-24 months (if recoverable)</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-card-body font-semibold text-orange-300 mb-3">Common Scenarios</h4>
                  <ul className="space-y-2 text-card-body text-bright-soft">
                    <li>• 85% of crypto assets remain unclaimed after death</li>
                    <li>• 30% have lost access to at least one wallet</li>
                    <li>• Average recovery cost: $5,000-$50,000</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Shine effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="section-divider max-w-7xl mx-auto"></div>

      {/* Benefits Section */}
      <section id="benefits" className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-section-title mb-4 sm:mb-6 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent text-glow">
              Benefits in Times of Crisis
            </h2>
            <p className="text-section-subtitle text-bright-soft max-w-3xl mx-auto">
              Protect your family and preserve your legacy with proper documentation
            </p>
          </div>

          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                title: 'Immediate Access to Critical Information',
                problem: 'Family members may not know you own crypto or where it\'s stored',
                solution: 'Complete inventory of wallets, assets, and access instructions',
                impact: 'Prevents assets from being lost or forgotten forever',
                icon: '🔍'
              },
              {
                title: 'Reduces Family Conflict',
                problem: 'Ambiguity about asset distribution causes disputes',
                solution: 'Clear, documented allocations eliminate confusion',
                impact: 'Preserves family relationships during difficult times',
                icon: '🤝'
              },
              {
                title: 'Speeds Up Asset Recovery',
                problem: 'Without instructions, recovery can take months or years',
                solution: 'Step-by-step instructions enable faster access',
                impact: 'Beneficiaries can access assets within days instead of months',
                icon: '⚡'
              },
              {
                title: 'Prevents Permanent Loss',
                problem: 'Crypto left in forgotten wallets is often lost forever',
                solution: 'Documented wallet addresses and instructions prevent loss',
                impact: 'Assets remain accessible to your heirs',
                icon: '💎'
              },
              {
                title: 'Legal Protection',
                problem: 'Without documentation, assets may not be legally transferable',
                solution: 'A notarizable document provides legal standing',
                impact: 'Smooth probate and asset transfer process',
                icon: '⚖️'
              },
              {
                title: 'Multi-Wallet Support',
                problem: 'Many people use multiple wallets across different chains',
                solution: 'Supports up to 20 wallets across multiple blockchains',
                impact: 'Complete coverage of your crypto holdings',
                icon: '🔗'
              },
              {
                title: 'No Technical Knowledge Required',
                problem: 'Executors may not understand crypto technology',
                solution: 'Clear instructions guide non-technical users',
                impact: 'Anyone can follow the instructions to access assets',
                icon: '📖',
                fullWidth: true
              }
            ].map((benefit, index) => {
              const gradients = [
                'from-green-500/20 to-emerald-500/20',
                'from-blue-500/20 to-cyan-500/20',
                'from-yellow-500/20 to-orange-500/20',
                'from-purple-500/20 to-pink-500/20',
                'from-indigo-500/20 to-purple-500/20',
                'from-cyan-500/20 to-blue-500/20',
                'from-green-500/20 via-emerald-500/20 to-green-500/20'
              ]
              const gradient = gradients[index % gradients.length]
              
              return (
                <div 
                  key={index}
                  className={`relative bg-gradient-to-br ${gradient} backdrop-blur-xl rounded-2xl p-4 sm:p-6 border-2 border-white/20 hover:border-green-400/60 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20 border-glow-hover overflow-hidden group ${benefit.fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}
                >
                  {/* Animated background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-gradient-shift`}></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-3 sm:mb-4">
                      <div className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300">{benefit.icon}</div>
                      <h3 className="text-card-title text-bright group-hover:text-white transition-colors flex-1">{benefit.title}</h3>
                    </div>
                    <div className="space-y-2 sm:space-y-3 text-card-body">
                      <div>
                        <div className="text-red-400 font-semibold mb-1 text-sm">Problem:</div>
                        <div className="text-bright-soft">{benefit.problem}</div>
                      </div>
                      <div>
                        <div className="text-blue-400 font-semibold mb-1 text-sm">Solution:</div>
                        <div className="text-bright-soft">{benefit.solution}</div>
                      </div>
                      <div>
                        <div className="text-green-400 font-semibold mb-1 text-sm">Impact:</div>
                        <div className="text-bright-soft">{benefit.impact}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="section-divider max-w-7xl mx-auto"></div>

      {/* How It Works Section - Alternating Timeline */}
      <section id="how-it-works" className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-section-title mb-4 sm:mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent text-glow">
              How It Works
            </h2>
            <p className="text-section-subtitle text-bright-soft max-w-3xl mx-auto">
              Simple, secure, and done in minutes
            </p>
          </div>

          <div className="relative max-w-6xl mx-auto">
            {/* Vertical Timeline line - centered */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-purple-500 via-blue-500 to-cyan-500"></div>

            <div className="space-y-12 sm:space-y-16">
              {[
                { step: 1, title: 'Connect Wallets', desc: 'Connect EVM wallets via WalletConnect or Bitcoin wallets. Verify ownership with a signature.', icon: '🔌' },
                { step: 2, title: 'Load Assets', desc: 'Automatically load all your assets: tokens, NFTs, ethscriptions, and Bitcoin across all chains.', icon: '📦' },
                { step: 3, title: 'Select Assets', desc: 'Choose which assets to include in your inheritance document with smart filtering.', icon: '✅' },
                { step: 4, title: 'Allocate Assets', desc: 'Add beneficiaries and allocate assets by percentage or amount with real-time validation.', icon: '👥' },
                { step: 5, title: 'Enter Details', desc: 'Fill in owner and executor information with multi-chain name resolution support.', icon: '📝' },
                { step: 6, title: 'Payment & Download', desc: 'Choose your plan, complete payment, and download your professional PDF document.', icon: '💳' }
              ].map((item, index) => {
                const isEven = index % 2 === 0
                return (
                  <div key={index} className="relative flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    {/* Left side - even steps (0, 2, 4) */}
                    <div className={`w-full md:w-[45%] ${isEven ? 'md:pr-6' : 'md:ml-auto md:pl-6 md:order-2'}`}>
                      {isEven && (
                        <div className="relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border-2 border-white/20 hover:border-blue-400/60 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 border-glow-hover overflow-hidden group">
                          {/* Animated background gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-gradient-shift"></div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                {item.icon}
                              </div>
                              <div>
                                <div className="text-purple-400 font-bold text-xs sm:text-sm mb-1">STEP {item.step}</div>
                                <h3 className="text-card-title text-bright group-hover:text-white transition-colors">{item.title}</h3>
                              </div>
                            </div>
                            <p className="text-card-body text-bright-soft">{item.desc}</p>
                          </div>
                          
                          {/* Shine effect on hover */}
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Timeline dot - centered */}
                    <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full border-4 border-slate-900 flex items-center justify-center z-10 shadow-xl hover:scale-110 transition-transform">
                      <span className="text-white font-bold text-sm">{item.step}</span>
                    </div>
                    
                    {/* Right side - odd steps (1, 3, 5) */}
                    <div className={`w-full md:w-[45%] ${isEven ? 'md:pl-6 md:order-2' : ''}`}>
                      {!isEven && (
                        <div className="relative bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border-2 border-white/20 hover:border-purple-400/60 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 border-glow-hover overflow-hidden group">
                          {/* Animated background gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-gradient-shift"></div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                {item.icon}
                              </div>
                              <div>
                                <div className="text-purple-400 font-bold text-xs sm:text-sm mb-1">STEP {item.step}</div>
                                <h3 className="text-card-title text-bright group-hover:text-white transition-colors">{item.title}</h3>
                              </div>
                            </div>
                            <p className="text-card-body text-bright-soft">{item.desc}</p>
                          </div>
                          
                          {/* Shine effect on hover */}
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="section-divider max-w-7xl mx-auto"></div>

      {/* Features Section - Enhanced */}
      <section id="features" className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-section-title mb-4 sm:mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent text-glow animate-gradient-shift">
              Why LastWish Matters
            </h2>
            <p className="text-section-subtitle text-bright-soft max-w-3xl mx-auto">
              Unique advantages that set us apart
            </p>
          </div>

          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { title: 'Client-Side & Secure', desc: 'No accounts, no stored private keys, everything is client-side, PDF generated locally', icon: '🔒', gradient: 'from-purple-500/20 to-blue-500/20' },
              { title: 'Multi-Chain Support', desc: 'Ethereum, Base, Arbitrum, Polygon, Bitcoin - handles NFTs, tokens, ethscriptions, and native coins', icon: '🌐', gradient: 'from-blue-500/20 to-cyan-500/20' },
              { title: 'Professional Documentation', desc: 'Notarizable PDF format, clear structure, legal disclaimer included', icon: '📄', gradient: 'from-green-500/20 to-emerald-500/20' },
              { title: 'Affordable', desc: 'One-time fee starting at $20.26 (special pricing) or free tier available', icon: '💰', gradient: 'from-yellow-500/20 to-orange-500/20' },
              { title: 'Smart Filtering', desc: 'Automatic spam/dust token filtering keeps your asset list clean and manageable', icon: '🧹', gradient: 'from-pink-500/20 to-rose-500/20' },
              { title: 'Advanced Allocation', desc: 'Prevent over-allocation, edit from anywhere, auto-reallocate when beneficiaries change', icon: '⚖️', gradient: 'from-indigo-500/20 to-purple-500/20' },
              { title: 'Multi-Chain Name Resolution', desc: 'Automatically resolves wallet names from ENS, Solana, Unstoppable Domains, and more', icon: '🏷️', gradient: 'from-cyan-500/20 to-blue-500/20' },
              { title: 'Wallet Naming & Organization', desc: 'Name your wallets for easy identification. Names preserved in queued sessions', icon: '📝', gradient: 'from-purple-500/20 to-pink-500/20' },
              { title: 'Enhanced NFT Support', desc: 'Improved metadata loading with multiple IPFS gateway fallbacks', icon: '🖼️', gradient: 'from-blue-500/20 to-indigo-500/20' },
              { title: 'Modern UI', desc: 'Intuitive button-style filters and sorts replace dropdown menus for better UX', icon: '🎨', gradient: 'from-pink-500/20 to-purple-500/20' },
              { title: 'User-Friendly', desc: 'No technical knowledge required, step-by-step guidance, real-time validation', icon: '👤', fullWidth: true, gradient: 'from-purple-500/20 via-blue-500/20 to-purple-500/20' }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`relative bg-gradient-to-br ${feature.gradient} backdrop-blur-xl rounded-2xl p-5 sm:p-6 border-2 border-white/20 hover:border-purple-400/60 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 border-glow-hover overflow-hidden group ${feature.fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}
              >
                {/* Animated background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-gradient-shift`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-card-title text-bright mb-2 group-hover:text-white transition-colors">{feature.title}</h3>
                      <p className="text-card-body text-bright-soft">{feature.desc}</p>
                    </div>
                  </div>
                </div>
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="section-divider max-w-7xl mx-auto"></div>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-section-title mb-4 sm:mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent text-glow">
              Simple, Transparent Pricing
            </h2>
            <p className="text-section-subtitle text-bright-soft max-w-3xl mx-auto">
              Choose the plan that fits your needs
            </p>
          </div>

          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {tiers.map((tier, index) => {
              const pricing = getTierPricing(tier.tier)
              const isPopular = tier.tier === 'standard'
              
              const tierGradients = {
                free: 'from-green-500/20 to-emerald-500/20',
                standard: 'from-purple-500/20 via-blue-500/20 to-purple-500/20',
                premium: 'from-yellow-500/20 via-orange-500/20 to-pink-500/20'
              }
              const tierGradient = tierGradients[tier.tier as keyof typeof tierGradients] || 'from-purple-500/20 to-blue-500/20'
              
              return (
                <div 
                  key={tier.tier}
                  className={`relative bg-gradient-to-br ${tierGradient} backdrop-blur-xl rounded-2xl p-6 sm:p-8 border-2 transition-all transform hover:scale-105 overflow-hidden group ${
                    isPopular 
                      ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20 md:scale-105 border-glow' 
                      : 'border-white/20 hover:border-purple-400/60 border-glow-hover hover:shadow-2xl hover:shadow-purple-500/20'
                  }`}
                >
                  {/* Animated background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${tierGradient} opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-gradient-shift`}></div>
                  
                  {isPopular && (
                    <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-bold z-20 shadow-lg">
                      Most Popular
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="text-center mb-4 sm:mb-6">
                      <h3 className="text-card-title text-bright mb-3 group-hover:text-white transition-colors">{tier.name}</h3>
                      <div className="mb-4">
                        {tier.price === 0 ? (
                          <div className="text-3xl sm:text-4xl font-bold text-bright group-hover:text-white transition-colors">Free</div>
                        ) : (
                          <div>
                            <div className="text-3xl sm:text-4xl font-bold text-bright group-hover:text-white transition-colors">${tier.price.toFixed(2)}</div>
                            {pricing.isSpecial && (
                              <div className="text-xs sm:text-sm text-gray-400 line-through mt-1">${pricing.regularPrice?.toFixed(2)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-card-body text-bright-soft group-hover:text-white transition-colors">
                          <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/app"
                      className={`block w-full text-center py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base border-2 transform hover:scale-105 ${
                        isPopular
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg border-purple-400/50 border-glow-hover'
                          : 'bg-white/10 text-white hover:bg-white/20 border-white/20 hover:border-white/40'
                      }`}
                    >
                      Get Started
                    </Link>
                  </div>
                  
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="section-divider max-w-7xl mx-auto"></div>

      {/* Comparison Table Section - Improved */}
      <section id="comparison" className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-section-title mb-4 sm:mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent text-glow">
              Compare Your Options
            </h2>
            <p className="text-section-subtitle text-bright-soft max-w-3xl mx-auto">
              See why LastWish is the best choice for crypto inheritance planning
            </p>
          </div>

          <div className="relative bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-xl rounded-2xl border-2 border-white/20 overflow-hidden border-glow hover:shadow-2xl hover:shadow-cyan-500/20 transition-all group">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-gradient-shift"></div>
            
            {/* Content */}
            <div className="relative z-10 overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-white/10 border-b-2 border-white/20">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-card-body font-bold text-bright border-r border-white/10">Feature</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-card-body font-bold text-green-400 border-r border-white/10 bg-green-500/20 group-hover:bg-green-500/30 transition-colors">LastWish</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-card-body font-bold text-bright-soft border-r border-white/10">Traditional Will</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-card-body font-bold text-bright-soft border-r border-white/10">Crypto Custodians</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-card-body font-bold text-bright-soft">DIY Documentation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {[
                    { feature: 'Cost', lastwish: '$20.26-$99', others: ['$500-$5,000', '$100-$1,000/year', 'Free but risky'] },
                    { feature: 'Setup Time', lastwish: '30-60 minutes', others: ['Weeks', 'Days', 'Hours'] },
                    { feature: 'Security', lastwish: '✓ No keys stored', others: ['⚠️ Paper-based', '⚠️ Keys held by third party', '⚠️ Varies'] },
                    { feature: 'Multi-chain', lastwish: '✓ Yes', others: ['✗ No', '⚠️ Limited', '⚠️ Manual'] },
                    { feature: 'NFT Support', lastwish: '✓ Yes', others: ['✗ No', '⚠️ Limited', '⚠️ Manual'] },
                    { feature: 'Ethscriptions', lastwish: '✓ Yes', others: ['✗ No', '✗ No', '✗ No'] },
                    { feature: 'Wallet Naming', lastwish: '✓ Auto-resolve + Manual', others: ['✗ No', '⚠️ Limited', '⚠️ Manual'] },
                    { feature: 'Updates', lastwish: '✓ Easy', others: ['✗ Difficult', '✓ Easy', '✓ Easy'] },
                    { feature: 'Legal Standing', lastwish: '✓ Notarizable', others: ['✓ Yes', '⚠️ Varies', '✗ No'] }
                  ].map((row, index) => (
                    <tr key={index} className="hover:bg-white/10 transition-colors group/row">
                      <td className="px-4 sm:px-6 py-4 text-card-body font-semibold text-bright border-r border-white/10 group-hover/row:text-white transition-colors">{row.feature}</td>
                      <td className="px-4 sm:px-6 py-4 text-card-body text-center text-green-400 font-semibold border-r border-white/10 bg-green-500/20 group-hover/row:bg-green-500/30 group-hover/row:text-green-300 transition-all">{row.lastwish}</td>
                      {row.others.map((other, idx) => (
                        <td key={idx} className={`px-4 sm:px-6 py-4 text-card-body text-center text-bright-soft group-hover/row:text-white transition-colors ${idx < row.others.length - 1 ? 'border-r border-white/10' : ''}`}>{other}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Shine effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="section-divider max-w-7xl mx-auto"></div>

      {/* Final CTA Section */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border-2 border-purple-500/30 border-glow">
            <h2 className="text-section-title text-bright mb-4 sm:mb-6 text-glow-white">
              Ready to Protect Your Legacy?
            </h2>
            <p className="text-section-subtitle text-bright-soft mb-6 sm:mb-8">
              Spend 30-60 minutes now to protect your crypto legacy, or risk your family losing access to potentially hundreds of thousands of dollars.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 text-center border-2 border-purple-400/50 border-glow-hover"
              >
                Get Started Now →
              </Link>
              <button
                onClick={() => scrollToSection('pricing')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-lg text-white font-semibold text-base sm:text-lg rounded-xl border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all"
              >
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Footer - Simplified */}
      <Footer />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-110 z-50 flex items-center justify-center border-2 border-purple-400/50"
          aria-label="Scroll to top"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  )
}

