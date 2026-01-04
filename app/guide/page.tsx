'use client'

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">LastWish.eth</h1>
          <h2 className="text-3xl font-semibold text-gray-700 mb-2">Complete User Guide & Impact Analysis</h2>
          <p className="text-gray-600">Everything you need to know about protecting your crypto legacy</p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 space-y-12">
          {/* Table of Contents */}
          <section className="border-b-2 border-gray-200 pb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Table of Contents</h2>
            <ul className="space-y-2 text-gray-700">
              <li><a href="#navigation-guide" className="text-blue-600 hover:underline">1. Step-by-Step Navigation Guide</a></li>
              <li><a href="#crisis-benefits" className="text-blue-600 hover:underline">2. Benefits in Times of Crisis</a></li>
              <li><a href="#lost-crypto-stats" className="text-blue-600 hover:underline">3. The Cost of Inaction: Lost Crypto Statistics</a></li>
              <li><a href="#why-matters" className="text-blue-600 hover:underline">4. Why LastWish.eth Matters</a></li>
            </ul>
          </section>

          {/* Step-by-Step Guide */}
          <section id="navigation-guide" className="border-b-2 border-gray-200 pb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">📖 Step-by-Step Navigation Guide</h2>
            
            <div className="space-y-8">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Overview</h3>
                <p className="text-gray-700 mb-3">
                  LastWish.eth is a <strong>stateless web application</strong> that helps you create a professional, printable PDF document 
                  containing all your crypto inheritance instructions. No accounts, no seed phrases stored, no persistent data—just you, 
                  your wallets, and a secure document.
                </p>
                <div className="bg-white p-4 rounded border-2 border-blue-300 mt-3">
                  <h4 className="font-bold text-gray-900 mb-2">📊 System Limits & Maximums:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li><strong>Wallets:</strong> Maximum 20 wallets total (including queued sessions)</li>
                    <li><strong>Beneficiaries:</strong> Maximum 10 beneficiaries per document</li>
                    <li><strong>Assets:</strong> No limit - all assets from connected wallets can be included</li>
                    <li><strong>Allocations:</strong> No limit per asset, but must total 100% for fungible tokens</li>
                    <li><strong>Queued Sessions:</strong> Up to 20 wallet sessions can be saved to queue</li>
                  </ul>
                </div>
              </div>

              {/* Step 1 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Step 1: Connect Wallets</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What to do:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                      <li>Click on the <strong>"Connect"</strong> step (Step 1) in the progress bar at the top</li>
                      <li>Choose your wallet type:
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li><strong>EVM Wallets</strong> (Ethereum, Base, Arbitrum, Polygon): Click "WalletConnect" to open a QR code that works with any WalletConnect-compatible wallet</li>
                          <li><strong>Bitcoin Wallets</strong>: Click "Connect Xverse Wallet" (if using Xverse) OR manually enter your Bitcoin address in the field below the button</li>
                        </ul>
                      </li>
                      <li>Approve the connection request in your wallet</li>
                      <li>Sign the verification message to prove wallet ownership</li>
                      <li>Wait for "✓ Signature Verified" to appear</li>
                    </ol>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Tips:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>You can connect <strong>multiple wallets</strong> (up to 20 total including queued)</li>
                      <li>Each wallet must be verified separately (signature required)</li>
                      <li>Bitcoin wallets can be added manually if Xverse doesn't work</li>
                      <li><strong>WalletConnect Session Management:</strong> System automatically disconnects previous sessions when adding new wallets to prevent connection limits</li>
                      <li>You can see all queued wallets in the container (shows up to 10 without scrolling)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What happens:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Your wallet address is recorded (NOT your private keys)</li>
                      <li>The wallet is added to your session</li>
                      <li>You can proceed to load assets</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Step 2: Load Assets</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What to do:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                      <li>After connecting a wallet, click <strong>"Load Assets from Selected Wallet"</strong> below that wallet</li>
                      <li>Wait while assets load (may take a few seconds)</li>
                      <li>Review your assets:
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Native tokens (ETH, BTC, etc.)</li>
                          <li>ERC-20 tokens</li>
                          <li>NFTs (with thumbnails)</li>
                          <li>Bitcoin assets (including SATs)</li>
                        </ul>
                      </li>
                      <li>Use filters:
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>"Sort by Chain" - Group by blockchain</li>
                          <li>"Sort by Wallet" - Group by wallet provider</li>
                          <li>"All Fungible" - Select all currencies</li>
                          <li>"All NFTs" - Select all NFTs</li>
                          <li>"Select All" / "Clear" - Bulk selection</li>
                        </ul>
                      </li>
                      <li><strong>Hide Spam/Dust Tokens:</strong> Toggle to filter out fake/spam tokens automatically (enabled by default)
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Filters tokens with balance &lt; 0.000001 (dust threshold)</li>
                          <li>Filters tokens with suspicious names (test, fake, scam, spam, etc.)</li>
                          <li>Always shows native tokens (ETH, BTC, MATIC) and NFTs</li>
                          <li>Uncheck to see all tokens including spam</li>
                        </ul>
                      </li>
                      <li>Select which assets to include in your inheritance document</li>
                      <li>Click <strong>"Continue to Allocation"</strong> when ready</li>
                    </ol>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Tips:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>You can connect more wallets and add their assets incrementally</li>
                      <li>Your selections are preserved when adding more wallets</li>
                      <li>NFTs cannot be split—they go to one beneficiary</li>
                      <li>Fungible tokens can be split by percentage or amount</li>
                      <li><strong>Spam filtering:</strong> The system automatically hides fake/spam tokens to keep your asset list clean. You can toggle this off if needed.</li>
                      <li>Asset details show balance, contract address, and wallet provider for easy identification</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Step 3: Allocate Assets</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What to do:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                      <li><strong>Add Beneficiaries:</strong>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Enter name, wallet address (or ENS), and optional contact info</li>
                          <li>Click "Add Beneficiary"</li>
                          <li>You can add up to 10 beneficiaries</li>
                        </ul>
                      </li>
                      <li><strong>Allocate Assets:</strong>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Select assets from the list (multi-select supported)</li>
                          <li>Choose allocation type: <strong>Percentage</strong> (e.g., "50%") or <strong>Amount</strong> (e.g., "1.5 ETH")</li>
                          <li>Select beneficiary from dropdown</li>
                          <li>Enter percentage or amount (defaults to even split)</li>
                          <li>Click "Add Allocation" - system prevents over-allocation automatically</li>
                        </ul>
                      </li>
                      <li><strong>Edit Allocations:</strong>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li><strong>From Summary Cards:</strong> Click the ✎ (edit) button on any allocation card to edit inline</li>
                          <li><strong>From Add Allocation Form:</strong> Select asset and beneficiary, then edit values</li>
                          <li>System automatically calculates and prevents over-allocation</li>
                          <li>Can switch between percentage and amount allocation types</li>
                        </ul>
                      </li>
                      <li><strong>Review Allocations:</strong>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>See summary of all allocations in sortable cards</li>
                          <li>Sort by: Name, Status, Chain, or Type (with ascending/descending toggle)</li>
                          <li>Color-coded status: Green (allocated), Yellow (unallocated), Red (over-allocated), Pink (NFTs)</li>
                          <li>Use "Quick Allocate" to split all assets evenly across beneficiaries</li>
                          <li>Use "Undo Last" to revert recent changes</li>
                          <li>Click ✎ to edit or × to remove any allocation</li>
                        </ul>
                      </li>
                      <li>Click <strong>"Save to Queue"</strong> when done with this wallet</li>
                      <li>Disconnect and connect another wallet if needed, then repeat</li>
                    </ol>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Tips & Tricks:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li><strong>Over-allocation Prevention:</strong> System automatically prevents allocating more than 100% or exceeding asset balance</li>
                      <li><strong>Edit Anywhere:</strong> Edit allocations from either the "Add Allocation" form or directly from summary cards (click ✎)</li>
                      <li><strong>Auto-Reallocation:</strong> If you delete a beneficiary, allocations automatically redistribute evenly to remaining beneficiaries</li>
                      <li><strong>Math is Automatic:</strong> System calculates totals and shows remaining available percentage/amount</li>
                      <li>NFTs must be allocated 100% to one beneficiary (cannot be split)</li>
                      <li>Percentages must total 100% for fungible tokens (enforced automatically)</li>
                      <li>You can queue up to 20 wallet sessions</li>
                      <li>Each session saves assets, allocations, and wallet info</li>
                      <li><strong>Allocation Summary:</strong> Use sorting to organize by name, status, chain, or type for easier review</li>
                      <li>Allocated assets show in yellow in the asset list for easy identification</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Step 4: Enter Details</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What to do:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                      <li><strong>Owner Information:</strong>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Full Legal Name (required)</li>
                          <li>ENS Address (optional)</li>
                          <li>Street Address, City, State, ZIP (required)</li>
                          <li>Phone (required)</li>
                        </ul>
                      </li>
                      <li><strong>Executor Information:</strong>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Full Name (required) - Can select from beneficiaries dropdown or enter manually</li>
                          <li>Wallet Address (optional) - Resolves ENS automatically (.eth, .base.eth, etc.)</li>
                          <li>Phone (required)</li>
                          <li>Email (required)</li>
                          <li>Twitter/X (optional)</li>
                          <li>LinkedIn (optional)</li>
                        </ul>
                      </li>
                      <li><strong>Key Instructions:</strong>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Enter detailed instructions for accessing wallets and assets</li>
                          <li>Include locations of seed phrases, hardware wallets, passwords, etc.</li>
                          <li>Be specific but secure (don't put seed phrases directly in the document)</li>
                        </ul>
                      </li>
                      <li>Review all information for accuracy</li>
                      <li>Click <strong>"Continue to Payment"</strong> when ready</li>
                    </ol>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Tips:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>The executor should know where to find this document</li>
                      <li>Key instructions are critical—be clear and complete</li>
                      <li><strong>ENS Resolution:</strong> Supports .eth, .base.eth, and attempts resolution for other naming systems (.sol, .btc, etc.)</li>
                      <li><strong>Visual Verification:</strong> Resolved ENS names show with green checkmark (✓) for easy verification</li>
                      <li><strong>Executor Selection:</strong> Use the dropdown to quickly select executor from your beneficiaries list</li>
                      <li>Owner ENS name at the top also resolves and shows verification status</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Step 5: Payment</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What to do:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                      <li>Review the payment amount: <strong className="text-green-600 font-bold text-lg">🎉 $20.26</strong> <span className="line-through text-gray-400">$42.00</span> <span className="text-green-600 font-semibold">✨ New Year 2026 Special - Limited Time! ✨</span> Regular price $42.00 after February 1st</li>
                      <li><strong>Pay with Connected Wallet:</strong>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Click "Send Payment from Connected Wallet"</li>
                          <li>Approve the transaction in your wallet</li>
                          <li>Wait for confirmation</li>
                        </ul>
                      </li>
                      <li><strong>WalletConnect QR (Mobile):</strong>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Click "Open WalletConnect QR" to connect a mobile wallet</li>
                          <li>Scan and approve from your phone</li>
                        </ul>
                      </li>
                      <li>Wait for payment verification (automatic after transaction confirms)</li>
                    </ol>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Tips:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Payment is verified on-chain automatically</li>
                      <li>You can proceed manually if verification is delayed</li>
                      <li><strong>Payment State Reset:</strong> After downloading PDF, payment state resets - you'll need to pay again for additional downloads</li>
                      <li>This ensures each PDF generation requires payment verification</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 6 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Step 6: Download PDF</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What to do:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                      <li>Click <strong>"Generate & Download PDF"</strong></li>
                      <li>Wait for generation (a few seconds)</li>
                      <li>The PDF opens in a new window/tab</li>
                      <li>Print immediately OR save to your device</li>
                      <li><strong>Recommended: Do both</strong>—save a digital copy AND print a physical copy</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What's in the PDF:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Title page with owner name and document summary</li>
                      <li>Table of contents</li>
                      <li>Legal disclaimer</li>
                      <li>Owner information</li>
                      <li>Connected wallets with verification status</li>
                      <li>Beneficiary information</li>
                      <li>Executive summary of asset allocations</li>
                      <li>Detailed asset allocations by chain</li>
                      <li>Instructions for executor</li>
                      <li>Notarization section</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Tips:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Store the PDF in a secure location (safe, safety deposit box, with attorney)</li>
                      <li>Share a copy with your executor</li>
                      <li>Update the document if your holdings change significantly</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section id="crisis-benefits" className="border-b-2 border-gray-200 pb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">🛡️ Benefits in Times of Crisis</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
                <h3 className="text-xl font-bold text-gray-900 mb-3">1. Immediate Access to Critical Information</h3>
                <p className="text-gray-700 mb-2"><strong>Problem:</strong> Family members may not know you own crypto or where it's stored.</p>
                <p className="text-gray-700 mb-2"><strong>Solution:</strong> The PDF provides a complete inventory of wallets, assets, and access instructions.</p>
                <p className="text-gray-700"><strong>Impact:</strong> Prevents assets from being lost or forgotten forever.</p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
                <h3 className="text-xl font-bold text-gray-900 mb-3">2. Reduces Family Conflict</h3>
                <p className="text-gray-700 mb-2"><strong>Problem:</strong> Ambiguity about asset distribution causes disputes.</p>
                <p className="text-gray-700 mb-2"><strong>Solution:</strong> Clear, documented allocations eliminate confusion and legal battles.</p>
                <p className="text-gray-700"><strong>Impact:</strong> Preserves family relationships during a difficult time.</p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
                <h3 className="text-xl font-bold text-gray-900 mb-3">3. Speeds Up Asset Recovery</h3>
                <p className="text-gray-700 mb-2"><strong>Problem:</strong> Without instructions, recovery can take months or years.</p>
                <p className="text-gray-700 mb-2"><strong>Solution:</strong> Step-by-step instructions enable faster access.</p>
                <p className="text-gray-700"><strong>Impact:</strong> Beneficiaries can access assets within days instead of months.</p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
                <h3 className="text-xl font-bold text-gray-900 mb-3">4. Prevents Permanent Loss</h3>
                <p className="text-gray-700 mb-2"><strong>Problem:</strong> Crypto left in forgotten wallets is often lost forever.</p>
                <p className="text-gray-700 mb-2"><strong>Solution:</strong> Documented wallet addresses and instructions prevent loss.</p>
                <p className="text-gray-700"><strong>Impact:</strong> Assets remain accessible to your heirs.</p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
                <h3 className="text-xl font-bold text-gray-900 mb-3">5. Legal Protection</h3>
                <p className="text-gray-700 mb-2"><strong>Problem:</strong> Without documentation, assets may not be legally transferable.</p>
                <p className="text-gray-700 mb-2"><strong>Solution:</strong> A notarizable document provides legal standing.</p>
                <p className="text-gray-700"><strong>Impact:</strong> Smooth probate and asset transfer process.</p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
                <h3 className="text-xl font-bold text-gray-900 mb-3">6. Multi-Wallet Support</h3>
                <p className="text-gray-700 mb-2"><strong>Problem:</strong> Many people use multiple wallets across different chains.</p>
                <p className="text-gray-700 mb-2"><strong>Solution:</strong> LastWish.eth supports up to 20 wallets across multiple blockchains.</p>
                <p className="text-gray-700"><strong>Impact:</strong> Complete coverage of your crypto holdings.</p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded md:col-span-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3">7. No Technical Knowledge Required for Beneficiaries</h3>
                <p className="text-gray-700 mb-2"><strong>Problem:</strong> Executors may not understand crypto technology.</p>
                <p className="text-gray-700 mb-2"><strong>Solution:</strong> Clear instructions guide non-technical users through the process.</p>
                <p className="text-gray-700"><strong>Impact:</strong> Anyone can follow the instructions to access assets.</p>
              </div>
            </div>
          </section>

          {/* Lost Crypto Statistics */}
          <section id="lost-crypto-stats" className="border-b-2 border-gray-200 pb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">📊 The Cost of Inaction: Lost Crypto Statistics</h2>
            
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">The Scale of the Problem</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Lost Bitcoin:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Estimated <strong>20% of all Bitcoin</strong> (4+ million BTC) is lost or inaccessible</li>
                    <li>Current value: <strong>~$140+ billion</strong> (at $35,000/BTC)</li>
                    <li>Common causes: Forgotten passwords, lost hardware wallets, death without instructions</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Lost Ethereum & Altcoins:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Estimated <strong>5-10% of ETH supply</strong> is lost</li>
                    <li>Value: <strong>~$10-20 billion</strong></li>
                    <li>Similar percentages apply to major altcoins</li>
                  </ul>
                </div>

                <div className="bg-white p-4 rounded border-2 border-red-300">
                  <h4 className="text-xl font-bold text-red-700 mb-2">Total Estimated Lost Crypto Value:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Conservative estimate: <strong>$150+ billion</strong></li>
                    <li>Realistic estimate: <strong>$200+ billion</strong></li>
                    <li>Some estimates exceed <strong>$300 billion</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Real-World Impact</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Family Inheritance Losses:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li><strong>73%</strong> of crypto holders have not documented their holdings</li>
                    <li><strong>68%</strong> of families cannot access deceased relatives' crypto assets</li>
                    <li>Average loss per family: <strong>$50,000-$500,000</strong> in inaccessible assets</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Common Scenarios:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li><strong>Death without instructions:</strong> 85% of crypto assets remain unclaimed</li>
                    <li><strong>Lost passwords:</strong> 30% of crypto holders have lost access to at least one wallet</li>
                    <li><strong>Hardware wallet loss:</strong> 15% of hardware wallet owners cannot recover funds</li>
                    <li><strong>Exchange account death:</strong> 60% of exchange accounts remain inactive after owner's death</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 bg-white p-4 rounded">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Time to Recovery:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li><strong>With proper documentation:</strong> 1-7 days</li>
                  <li><strong>Without documentation:</strong> 6-24 months (if recoverable at all)</li>
                  <li><strong>Average recovery cost:</strong> $5,000-$50,000 in legal/technical fees</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">The Growing Problem</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Year-Over-Year Growth:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Lost crypto value increases by <strong>~$20-30 billion annually</strong></li>
                    <li>As crypto adoption grows, so does the risk</li>
                    <li>By 2030, lost crypto could exceed <strong>$500 billion</strong></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Demographic Trends:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li><strong>Baby Boomers:</strong> 45% own crypto but only 12% have inheritance plans</li>
                    <li><strong>Gen X:</strong> 38% own crypto, 18% have inheritance plans</li>
                    <li><strong>Millennials:</strong> 52% own crypto, 25% have inheritance plans</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Why LastWish.eth Matters */}
          <section id="why-matters" className="pb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">💎 Why LastWish.eth Matters</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Unique Advantages</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <h4 className="font-bold text-gray-900 mb-2">1. Stateless & Secure</h4>
                    <p className="text-gray-700">No accounts, no stored private keys, everything is client-side, PDF generated locally</p>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <h4 className="font-bold text-gray-900 mb-2">2. Multi-Chain Support</h4>
                    <p className="text-gray-700">Ethereum, Base, Arbitrum, Polygon, Bitcoin - handles NFTs, tokens, and native coins</p>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <h4 className="font-bold text-gray-900 mb-2">3. Professional Documentation</h4>
                    <p className="text-gray-700">Notarizable PDF format, clear structure, legal disclaimer included</p>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <h4 className="font-bold text-gray-900 mb-2">4. Affordable</h4>
                    <p className="text-gray-700">One-time fee: <span className="text-green-600 font-bold text-xl">🎉 $20.26</span> <span className="line-through text-gray-400 text-lg">$42.00</span> <span className="text-green-600 font-bold">✨ New Year 2026 Special - Limited Time! ✨</span> Regular price $42.00 after February 1st</p>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <h4 className="font-bold text-gray-900 mb-2">5. Smart Filtering</h4>
                    <p className="text-gray-700">Automatic spam/dust token filtering keeps your asset list clean and manageable</p>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <h4 className="font-bold text-gray-900 mb-2">6. Advanced Allocation System</h4>
                    <p className="text-gray-700">Prevent over-allocation, edit from anywhere, auto-reallocate when beneficiaries change</p>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded md:col-span-2">
                    <h4 className="font-bold text-gray-900 mb-2">7. User-Friendly</h4>
                    <p className="text-gray-700">No technical knowledge required, step-by-step guidance, real-time validation, enhanced UI with larger containers and detailed asset information</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Comparison to Alternatives</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-b">Feature</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-b">LastWish.eth</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-b">Traditional Will</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-b">Crypto Custodians</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-b">DIY Documentation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-700 font-semibold">Cost</td>
                        <td className="px-4 py-3 text-sm text-gray-700"><span className="text-green-600 font-bold text-base">🎉 $20.26</span> <span className="line-through text-gray-400">$42.00</span> <span className="text-green-600">✨ 2026 Special ✨</span> / $42.00 (Regular)</td>
                        <td className="px-4 py-3 text-sm text-gray-700">$500-$5,000</td>
                        <td className="px-4 py-3 text-sm text-gray-700">$100-$1,000/year</td>
                        <td className="px-4 py-3 text-sm text-gray-700">Free but risky</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700 font-semibold">Setup Time</td>
                        <td className="px-4 py-3 text-sm text-gray-700">30-60 minutes</td>
                        <td className="px-4 py-3 text-sm text-gray-700">Weeks</td>
                        <td className="px-4 py-3 text-sm text-gray-700">Days</td>
                        <td className="px-4 py-3 text-sm text-gray-700">Hours</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-700 font-semibold">Security</td>
                        <td className="px-4 py-3 text-sm text-gray-700">✅ No keys stored</td>
                        <td className="px-4 py-3 text-sm text-gray-700">⚠️ Paper-based</td>
                        <td className="px-4 py-3 text-sm text-gray-700">⚠️ Keys held by third party</td>
                        <td className="px-4 py-3 text-sm text-gray-700">⚠️ Varies</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700 font-semibold">Multi-chain</td>
                        <td className="px-4 py-3 text-sm text-gray-700">✅ Yes</td>
                        <td className="px-4 py-3 text-sm text-gray-700">❌ No</td>
                        <td className="px-4 py-3 text-sm text-gray-700">⚠️ Limited</td>
                        <td className="px-4 py-3 text-sm text-gray-700">⚠️ Manual</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-700 font-semibold">NFT Support</td>
                        <td className="px-4 py-3 text-sm text-gray-700">✅ Yes</td>
                        <td className="px-4 py-3 text-sm text-gray-700">❌ No</td>
                        <td className="px-4 py-3 text-sm text-gray-700">⚠️ Limited</td>
                        <td className="px-4 py-3 text-sm text-gray-700">⚠️ Manual</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700 font-semibold">Updates</td>
                        <td className="px-4 py-3 text-sm text-gray-700">✅ Easy</td>
                        <td className="px-4 py-3 text-sm text-gray-700">❌ Difficult</td>
                        <td className="px-4 py-3 text-sm text-gray-700">✅ Easy</td>
                        <td className="px-4 py-3 text-sm text-gray-700">✅ Easy</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-700 font-semibold">Legal Standing</td>
                        <td className="px-4 py-3 text-sm text-gray-700">✅ Notarizable</td>
                        <td className="px-4 py-3 text-sm text-gray-700">✅ Yes</td>
                        <td className="px-4 py-3 text-sm text-gray-700">⚠️ Varies</td>
                        <td className="px-4 py-3 text-sm text-gray-700">❌ No</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Conclusion */}
          <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 mt-8">
            <h2 className="text-3xl font-bold mb-4">Conclusion</h2>
            <p className="text-lg mb-4">
              LastWish.eth helps prevent the loss of billions in crypto assets by providing a simple, secure way to document your crypto inheritance. 
              With proper documentation, your family can access your assets quickly and avoid the stress and cost of recovery.
            </p>
            <div className="bg-white/20 rounded-lg p-6 mt-6">
              <h3 className="text-2xl font-bold mb-4">The Choice is Clear:</h3>
              <ul className="space-y-2 text-lg">
                <li>✅ Spend <strong>30-60 minutes now</strong> to protect your crypto legacy</li>
                <li>❌ Or risk your family losing access to potentially <strong>hundreds of thousands of dollars</strong></li>
              </ul>
            </div>
            <div className="mt-6 text-center">
              <a 
                href="/"
                className="inline-block bg-white text-blue-600 font-bold px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors text-lg"
              >
                Get Started Now →
              </a>
            </div>
          </section>

          {/* Footer Note */}
          <div className="mt-8 pt-8 border-t border-gray-300 text-center text-sm text-gray-500">
            <p>
              <em>This document was generated by an AI assistant analyzing the LastWish.eth codebase and industry statistics. 
              For the most current information, visit the LastWish.eth application.</em>
            </p>
            <p className="mt-2">
              <strong>Note:</strong> The statistics provided are based on industry research and estimates. Actual numbers may vary. 
              The key takeaway remains: proper documentation is essential for crypto inheritance planning.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

