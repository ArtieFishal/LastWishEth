import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'For Professionals',
  description: 'See how attorneys, advisors, and family offices can use LastWish to create clearer crypto inheritance workflows.',
}

export default function ForProfessionalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 animate-gradient-shift"></div>
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float-delayed"></div>

      <Header />

      <main className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-6xl mx-auto space-y-10">
          <section className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm text-bright-soft mb-6">
              <span>For attorneys, advisors, and family offices</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent leading-tight text-glow-white">
              A clearer bridge between crypto and estate planning
            </h1>
            <p className="text-lg sm:text-xl text-bright-soft max-w-3xl mx-auto mb-8">
              LastWish helps professionals gather wallet context, organize crypto instructions, and produce cleaner handoff documents without taking custody of client assets.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-2xl hover:shadow-purple-500/50 text-center border-2 border-purple-400/50"
              >
                Start with Premium →
              </Link>
              <Link
                href="/guide"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-lg text-white font-semibold rounded-xl border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all text-center"
              >
                Read the workflow guide
              </Link>
            </div>
          </section>

          <section className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Estate attorneys',
                points: [
                  'Help clients document wallets and digital assets more clearly',
                  'Reduce ambiguity for executors and heirs',
                  'Use as a practical companion to formal estate documents',
                ],
              },
              {
                title: 'Advisors and accountants',
                points: [
                  'Give clients a structured crypto inventory process',
                  'Encourage annual updates instead of one-time conversations',
                  'Offer a higher-trust premium service around digital estate readiness',
                ],
              },
              {
                title: 'Family offices',
                points: [
                  'Organize multi-wallet, multi-chain visibility for heirs and executors',
                  'Support internal review before a family emergency happens',
                  'Create a repeatable client-service workflow without custody risk',
                ],
              },
            ].map((card) => (
              <div key={card.title} className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border-2 border-white/20 hover:border-purple-400/60 transition-all">
                <h2 className="text-2xl font-bold text-white mb-4">{card.title}</h2>
                <ul className="space-y-3 text-bright-soft text-sm sm:text-base">
                  {card.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border-2 border-blue-500/30">
              <h2 className="text-2xl font-bold text-white mb-4">Why this can work commercially</h2>
              <ul className="space-y-3 text-bright-soft">
                <li>• The underlying problem is high stakes and time sensitive.</li>
                <li>• Professionals need a practical workflow, not just theory.</li>
                <li>• Families want clarity without giving custody to a third party.</li>
                <li>• This category supports premium review, annual updates, and partner channels.</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border-2 border-purple-500/30">
              <h2 className="text-2xl font-bold text-white mb-4">Suggested professional workflow</h2>
              <ol className="space-y-3 text-bright-soft list-decimal list-inside">
                <li>Collect wallet and asset context with the client.</li>
                <li>Create a structured instruction document in LastWish.</li>
                <li>Review executor language and offline storage steps.</li>
                <li>Pair the document with formal estate planning where needed.</li>
                <li>Refresh annually or after major portfolio changes.</li>
              </ol>
            </div>
          </section>

          <section className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-xl rounded-3xl p-8 sm:p-10 border-2 border-purple-500/30 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Start with the premium workflow now</h2>
            <p className="text-bright-soft max-w-3xl mx-auto mb-6">
              Today, the fastest path is to use the Premium plan and the guide as the first professional workflow. Next steps can include a dedicated partner offer, intake flow, and concierge review service.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app"
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg text-center"
              >
                Open LastWish App
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-all text-center"
              >
                Back to homepage
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
