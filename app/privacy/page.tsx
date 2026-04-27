export const metadata = {
  title: 'Privacy Policy | LastWish',
  description: 'Privacy Policy for LastWishCrypto.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-bright-soft mb-8">Effective date: April 26, 2026</p>

        <div className="space-y-6 text-bright-soft leading-relaxed">
          <p>
            LastWish is designed to minimize data collection.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1) What we collect</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <span className="text-white">Information you enter in the app:</span> The app is
                designed to run client-side and generate your Document locally. We do not
                intentionally collect or store your seed phrases or private keys.
              </li>
              <li>
                <span className="text-white">Basic technical data:</span> Like most websites, our
                hosting provider may log basic request data (for example: IP address, device/browser
                type, and timestamps) for security and reliability.
              </li>
              <li>
                <span className="text-white">Analytics:</span> We may use privacy-respecting
                analytics to understand general usage (for example: pages visited and device type).
                We do not sell personal information.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2) What we do not store</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Seed phrases</li>
              <li>Private keys</li>
              <li>Wallet custody credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3) Payments</h2>
            <p>
              Payments (if any) are processed by a third-party provider. We do not receive or store
              your full payment instrument details. The payment provider may collect information
              under their own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4) Your choices</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>You can stop using the site at any time.</li>
              <li>
                If you print or save your Document, you control where it is stored and who can
                access it.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5) Security</h2>
            <p>
              We use reasonable safeguards appropriate for a non-custodial documentation product, but
              no method of transmission or storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6) Children</h2>
            <p>LastWish is not intended for children under 13.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7) Contact</h2>
            <p>
              Privacy questions: <span className="text-white">support@lastwishcrypto.com</span>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
