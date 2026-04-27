export const metadata = {
  title: 'Terms of Service | LastWish',
  description: 'Terms of Service for LastWishCrypto.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-bright-soft mb-8">
          Effective date: April 26, 2026
        </p>

        <div className="space-y-6 text-bright-soft leading-relaxed">
          <p>
            LastWish ("we", "us") provides a client-side tool that helps you generate a printable
            document containing crypto inheritance instructions ("Document"). By using the site or
            app, you agree to these Terms.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1) What LastWish is (and isn’t)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>LastWish helps you organize information and generate a Document.</li>
              <li>We do not provide legal, tax, or financial advice.</li>
              <li>We are not a custodian, do not hold your funds, and do not store your seed phrases or private keys.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2) Your responsibilities</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>The accuracy and completeness of all information you enter.</li>
              <li>Securing your wallets, devices, backups, and any printed/saved copies of the Document.</li>
              <li>Complying with applicable laws and any obligations to heirs/executors.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3) No warranty</h2>
            <p>
              The site/app and Document are provided “as is” and “as available.” We do not guarantee
              that the Document will be legally sufficient for your situation, accepted by any
              court/notary, or that any party will successfully recover assets using it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4) Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, LastWish will not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any loss of funds, keys,
              access, profits, or data. Our total liability for any claim will not exceed the amount
              you paid us for the applicable purchase (or $0 if you used the free tier).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5) Payments (if applicable)</h2>
            <p>
              If you purchase a paid plan, you agree to pay the displayed price and any applicable
              taxes/fees. All sales are final except where required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6) Third-party services</h2>
            <p>
              Some features rely on third-party providers (for example: wallet connection, RPC/data
              providers, or payment processing). We are not responsible for third-party outages,
              errors, or changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7) Changes</h2>
            <p>
              We may update these Terms from time to time. The “Effective date” will reflect the
              latest version. Continued use means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">8) Contact</h2>
            <p>
              Questions? Email: <span className="text-white">support@lastwishcrypto.com</span>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
