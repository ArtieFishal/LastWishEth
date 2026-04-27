export const metadata = {
  title: 'Disclaimer | LastWish',
  description: 'Disclaimer for LastWishCrypto.',
}

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Disclaimer</h1>
        <p className="text-sm text-bright-soft mb-8">Effective date: April 26, 2026</p>

        <div className="space-y-6 text-bright-soft leading-relaxed">
          <p>
            LastWish provides a tool for organizing crypto inheritance instructions and generating a
            printable document. It is not legal, tax, or financial advice. You should consult a
            qualified professional for your situation.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Non-custodial</h2>
            <p>
              We do not store or have access to your seed phrases or private keys, and we do not
              control your funds.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">No guarantees</h2>
            <p>
              Crypto recovery depends on many factors (wallet providers, networks, devices, backups,
              laws, and executor competence). We do not guarantee outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Security reminder</h2>
            <p>
              Do not include seed phrases or private keys in the document. Store any printed/saved
              copies securely.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
