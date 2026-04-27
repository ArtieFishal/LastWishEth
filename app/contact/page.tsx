import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact LastWishCrypto support.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 animate-gradient-shift"></div>
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float-delayed"></div>

      <Header />

      <main className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <section className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm text-bright-soft mb-6">
            <span>Support</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-10 border-2 border-white/20 shadow-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold mb-5 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
              Contact LastWishCrypto
            </h1>
            <p className="text-lg text-bright-soft mb-8">
              Need help with the app, your sample packet, or a payment question? Send us a note and include any relevant details so we can route it quickly.
            </p>

            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-950/50 border border-white/15 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-bright-soft mb-2">Email</p>
                <a
                  href="mailto:support@lastwishcrypto.com"
                  className="text-xl sm:text-2xl font-semibold text-white hover:text-purple-200 transition-colors break-all"
                >
                  support@lastwishcrypto.com
                </a>
              </div>

              <div className="rounded-2xl bg-slate-950/50 border border-white/15 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-bright-soft mb-2">Response time</p>
                <p className="text-white text-lg">
                  Response time: usually within 1-2 business days.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/guide"
                className="w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-all text-center"
              >
                Read the guide
              </Link>
              <Link
                href="/app"
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg text-center"
              >
                Open LastWish App
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
