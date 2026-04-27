# LastWish - Crypto Inheritance Instructions

A stateless web application that allows users to connect crypto wallets, view holdings across supported chains, allocate assets to beneficiaries, and generate a printable, notarizable document with instructions for accessing and distributing crypto assets.

## Features

- **Multi-chain Support**: Ethereum, Base, Arbitrum, Polygon, ApeChain, Solana, and Bitcoin
- **Wallet Connections**: EVM wallets via WalletConnect, Solana via Solana Wallet Adapter, Bitcoin via Xverse (or paste-in address)
- **Asset Inventory**: Automatically loads and displays all assets across connected wallets
  - Native tokens (ETH, MATIC, APE, SOL, BTC, etc.)
  - ERC-20 tokens
  - NFTs (ERC-721, ERC-1155)
  - **Ethscriptions** (digital artifacts on Ethereum)
  - SPL tokens and Solana NFTs (DAS-aware)
  - Bitcoin balances and ordinals
- **Tiered Plans**: Free / Standard / Premium — beneficiary and wallet caps depend on the selected tier (see [Pricing](#pricing))
- **Asset Allocation**: Allocate assets by percentage or amount with real-time validation
- **Payment Gating**: Tier-aware on-chain payment in **ETH on Ethereum mainnet** is required to unlock PDF generation for paid tiers (Free tier skips payment)
- **PDF Generation**: Client-side PDF generation with all required sections
- **Stateless**: No accounts, no private keys stored, no persistent data

## Setup

### Prerequisites

- Node.js 20+ (Netlify production also pins to Node 20)
- npm or yarn
- Moralis API key (required for EVM asset fetching)
- WalletConnect Project ID (required for wallet connections)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd lastwisheth
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` with your values. See `.env.example` for the full list. At minimum, set the required vars below.

### Environment variables

#### Required (production-critical)

| Variable | Used by | Purpose |
| --- | --- | --- |
| `MORALIS_API_KEY` | `app/api/portfolio/evm/route.ts` | EVM asset discovery (ETH, Base, Arbitrum, Polygon, ApeChain). Without it, the EVM portfolio API returns a clean configuration error. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `lib/wagmi.ts` | Initializes WalletConnect (QR connect flow). Without it, the WalletConnect connector won't load. |

#### Optional (feature-improving / fall back if absent)

| Variable | Used by | Purpose |
| --- | --- | --- |
| `HELIUS_API_KEY` | `app/api/portfolio/solana/route.ts` | Better Solana asset discovery via Helius (DAS + balances). Falls back to public RPC if absent. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` / `SOLANA_RPC_URL` | `app/api/portfolio/solana/route.ts` | Override the Solana RPC URL. Defaults to `https://api.mainnet-beta.solana.com`. |
| `UNSTOPPABLE_API_KEY` | Unstoppable Domains lookups | Optional name resolution. |
| `PAYMENT_RECEIVER_ADDRESS` | `app/api/invoice/create/route.ts`, `app/api/invoice/status/route.ts` | Override the payment recipient. Accepts `0x...` or an ENS name. Defaults to the lastwish.eth resolved address. |

#### Readiness check

Run a non-secret-leaking readiness check that prints which required/optional vars are missing:

```bash
npm run check:env
```

Add `--strict` to also fail on missing optional vars (useful in CI):

```bash
npm run check:env -- --strict
```

### Getting API Keys

- **Moralis API Key**: Sign up at [Moralis](https://moralis.io) and get your API key from the dashboard
- **WalletConnect Project ID**:
  1. Go to [Reown Cloud](https://cloud.reown.com)
  2. Create a new project
  3. Copy your Project ID
- **Helius API Key (optional)**: Sign up at [Helius](https://helius.dev) for upgraded Solana asset discovery

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## User Flow

1. **Connect Wallets**: Connect EVM wallets via WalletConnect, Solana wallets via the Solana Wallet Adapter, and/or a Bitcoin wallet via Xverse (or paste a Bitcoin address).
2. **Review Assets**: View all assets across connected wallets (tokens, NFTs, ethscriptions, SPL tokens, Bitcoin/ordinals).
3. **Allocate Assets**:
   - Add beneficiaries (per-tier cap — Free: 2, Standard: 10, Premium: unlimited)
   - Allocate assets by percentage or amount
   - Real-time validation prevents over-allocation
4. **Enter Details**:
   - Owner name
   - Executor name and wallet address
   - Key access instructions
5. **Payment** (paid tiers only): Pay the tier price **in ETH on Ethereum mainnet**, sent from a connected EVM wallet to the recipient configured by `PAYMENT_RECEIVER_ADDRESS` (defaults to `lastwish.eth`). The Free tier skips this step.
6. **Download PDF**: Generate and download the printable document.

## Pricing

Pricing is defined in [`lib/pricing.ts`](./lib/pricing.ts) and surfaced via `getTierPricing(tier)` / `getPaymentAmountETH(tier)`. Payment verification (`app/api/invoice/status/route.ts`) is tier-aware and checks the expected ETH amount on Ethereum mainnet.

| Tier | Price | Wallets | Beneficiaries | Notes |
| --- | --- | --- | --- | --- |
| Free | $0 | 1 | 2 | No payment step. |
| Standard | $42.00 | 20 | 10 | Charged in ETH at the configured ETH/USD reference. |
| Premium | $99.00 | Unlimited | Unlimited | Includes priority support and 2-year PDF updates. |

The on-chain ETH amount is computed from the current tier and an internal ETH/USD reference; a small tolerance is applied during verification so wallet rounding does not cause false negatives.

## Architecture

- **Frontend**: Next.js 16 with App Router, React, TypeScript
- **Wallet Integration**: wagmi v3, viem
- **PDF Generation**: pdf-lib (client-side)
- **API Routes**: Next.js API routes for portfolio fetching and payment verification
- **Styling**: Tailwind CSS

## Supported Chains

- Ethereum (Mainnet)
- Base
- Arbitrum
- Polygon
- ApeChain
- Solana
- Bitcoin

EVM chains used for asset discovery are defined in [`app/api/portfolio/evm/route.ts`](./app/api/portfolio/evm/route.ts) (`CHAINS`). Solana discovery lives in [`app/api/portfolio/solana/route.ts`](./app/api/portfolio/solana/route.ts) and Bitcoin in [`app/api/portfolio/btc/route.ts`](./app/api/portfolio/btc/route.ts). The on-chain payment is **always** verified on Ethereum mainnet.

## Security

- No private keys or seed phrases collected
- No persistent user data storage
- All operations are client-side
- Payment verification happens on-chain
- PDF generation is client-side only

## Important Notes

- This is a backup plan tool, not an executor or custodian
- The generated document is for informational purposes only
- Consult with legal and financial professionals before relying on these instructions
- Refreshing the page clears all data (by design - stateless)

## Development

### Project Structure

```
lastwisheth/
├── app/
│   ├── api/              # API routes (portfolio, invoice, ENS, ordinal-image, ...)
│   ├── page.tsx          # Landing page (route: /)
│   ├── app/page.tsx      # Stepper application (route: /app)
│   ├── guide/page.tsx    # User guide (route: /guide)
│   ├── layout.tsx        # Root layout
│   └── providers.tsx     # Wagmi + Solana adapter providers
├── components/           # React components (LandingPage, Header, AllocationPanel, ...)
├── lib/                  # Utilities (pricing, wagmi, env.server, portfolio-utils, app/*)
├── types/                # TypeScript type definitions
├── e2e/                  # Playwright tests (smoke + user-flow)
├── __tests__/            # Vitest unit + integration tests
└── public/               # Static assets
```

### Building for Production

```bash
npm run build
npm start
```

## License

[Your License Here]

## Support

For issues or questions, please open an issue on GitHub.
