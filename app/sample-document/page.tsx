import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Use Case Example',
  description: 'Open a fully filled LastWish example packet and see what the finished document looks like.',
}

const exampleStats = [
  { label: 'Wallets', value: '3', detail: 'Ethereum, Solana, Bitcoin' },
  { label: 'Beneficiaries', value: '5', detail: 'with contact details and wallet destinations' },
  { label: 'Executor', value: '1', detail: 'chosen from the beneficiary list' },
]

const exampleSections = [
  'owner details and executor details',
  'multi-chain wallet inventory',
  'beneficiary assignments and allocation logic',
  'executor-facing recovery notes',
  'printable formatting for offline storage',
]

export default function SampleDocumentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 animate-gradient-shift"></div>
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float-delayed"></div>

      <Header />

      <main className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-6xl mx-auto">
          <section className="text-center max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm text-bright-soft mb-6">
              <span>Real use case example</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent leading-tight text-glow-white">
              Open a fully filled LastWish packet
            </h1>
            <p className="text-lg sm:text-xl text-bright-soft max-w-3xl mx-auto mb-8">
              This is a fictional but complete example, built to show what the finished handoff packet actually looks like when someone uses LastWish for a real family scenario.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-2xl hover:shadow-purple-500/50 text-center border-2 border-purple-400/50"
              >
                Start your plan →
              </Link>
              <Link
                href="/mock/lastwish-mock-complete-packet.pdf"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600/90 text-white font-semibold rounded-xl border-2 border-emerald-400/40 hover:bg-emerald-500 transition-all text-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                View full mock packet
              </Link>
              <Link
                href="/guide"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-lg text-white font-semibold rounded-xl border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all text-center"
              >
                Read the guide
              </Link>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3 mb-10">
            {exampleStats.map((stat) => (
              <div key={stat.label} className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/15 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-bright-soft mb-3">{stat.label}</p>
                <p className="text-4xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-sm text-bright-soft">{stat.detail}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-8 lg:grid-cols-2 items-start">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border-2 border-white/20">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">What this example proves</h2>
              <p className="text-bright-soft mb-6">
                LastWish is meant to create something a family member, executor, or attorney can actually use under pressure, not just a one-off PDF with vague notes.
              </p>
              <ul className="space-y-3 text-bright-soft">
                {exampleSections.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-emerald-300">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-900">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-semibold mb-3">Included in this example</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">A realistic family handoff scenario</h2>
              <div className="space-y-4 text-sm sm:text-base text-slate-700">
                <p>
                  The packet shows a three-wallet household setup across Ethereum, Solana, and Bitcoin, with five beneficiaries and one executor selected from inside the beneficiary group.
                </p>
                <p>
                  It includes allocation logic, executor notes, wallet naming, and a structure that is easier for non-technical family members to follow.
                </p>
                <p>
                  It is fictional, but it reflects the real output shape LastWish is designed to produce.
                </p>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/mock/lastwish-mock-complete-packet.pdf"
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open the example packet
                </Link>
                <Link
                  href="/for-professionals"
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-900 font-semibold rounded-xl hover:bg-slate-200 transition-all text-center"
                >
                  See professional mode
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-12 max-w-5xl mx-auto">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border-2 border-white/20 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">The real goal</h2>
              <p className="text-bright-soft max-w-3xl mx-auto mb-6">
                A calmer, cleaner handoff for families dealing with crypto, without storing private keys inside the product.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/app"
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg text-center"
                >
                  Build your own plan
                </Link>
                <Link
                  href="/guide"
                  className="w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-all text-center"
                >
                  Read how it works
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
